const path = require('path');
const { engine } = require('express-handlebars');
const express = require('express');
const pgp = require('pg-promise')();

const app = express();

// for testing purposes.
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(path.join(__dirname, 'public')));


const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false
}));

// Only protect routes we explicitly wrap with this
function requireLogin(req, res, next) {
  if (!req.session.username) {
    return res.redirect('/login');
  }
  next();
}

// testing purposes, remove later 
console.log("ENV CHECK:", {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  name: process.env.DB_NAME,
  user: process.env.DB_USER
});


const db = pgp({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Compute current streak for a user based on workouts.date_actual
async function computeStreak(username) {
  // Get distinct workout dates for this user, newest first
  const rows = await db.any(
    `SELECT DISTINCT date_actual::date AS d
     FROM workouts
     WHERE username = $1
       AND date_actual IS NOT NULL
     ORDER BY d DESC`,
    [username]
  );

  if (!rows.length) {
    return 0; // no workouts = no streak
  }

  let streak = 1;
  let prev = rows[0].d; // this will be a JS Date

  for (let i = 1; i < rows.length; i++) {
    const current = rows[i].d;
    const diffDays = Math.round((prev - current) / MS_PER_DAY);

    if (diffDays === 1) {
      // exactly one day apart → continue streak
      streak += 1;
      prev = current;
    } else if (diffDays > 1) {
      // gap of 2+ days → streak broken
      break;
    } else {
      // diffDays <= 0 shouldn't really happen with DISTINCT + ORDER BY,
      // but if it does, we just ignore it / break.
      break;
    }
  }

  return streak;
}

// Make streak available to all views for logged-in users
app.use(async (req, res, next) => {
  res.locals.streak = null;

  // Only compute streak if user is logged in
  if (req.session && req.session.username) {
    try {
      const streak = await computeStreak(req.session.username);
      res.locals.streak = streak;
    } catch (err) {
      console.error('Error computing streak:', err);
      res.locals.streak = 0;
    }
  }

  next();
});

// Make username and profile picture available in all views (header)
app.use(async (req, res, next) => {
  if (!req.session.username) {
    res.locals.username = null;
    res.locals.profilePic = null;
    return next();
  }

  res.locals.username = req.session.username;

  try {
    const row = await db.oneOrNone(
      "SELECT profile_pic FROM users WHERE username = $1",
      [req.session.username]
    );
    res.locals.profilePic = row?.profile_pic || null;
  } catch (err) {
    console.error("Profile pic load error:", err);
    res.locals.profilePic = null;
  }

  next();
});



// ---------------------- API: progress ----------------------
app.get('/api/progress', async (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });

  try {
    if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });

    const row = await db.oneOrNone(
      'SELECT highest_completed FROM user_progress WHERE username = $1',
      [req.session.username]
    );

    return res.json({ highest_completed: row ? row.highest_completed : 0 });
  } catch (err) {
    console.error('GET /api/progress error:', err);
    return res.status(500).json({ error: 'Server error fetching progress' });
  }
});

app.post('/api/progress', async (req, res) => {
  try {
    if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });
    const completed = Number(req.body.completed);
    if (isNaN(completed)) return res.status(400).json({ error: 'Invalid value' });

    console.log('Updating progress:', req.session.username, completed);

    await db.none(
      `INSERT INTO user_progress (username, highest_completed)
       VALUES ($1, $2)
       ON CONFLICT (username)
       DO UPDATE SET highest_completed = GREATEST(excluded.highest_completed, user_progress.highest_completed)`,
      [req.session.username, completed]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Progress POST error:', err);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
});

// ---------------------- API: workouts ----------------------
app.post('/api/workouts', async (req, res) => {
  if (!req.session.username) {
    return res.status(401).json({ error: 'Not logged in' });
  }

  const username = req.session.username;
  const workoutId = Number(req.body.workoutId);   // this is the node's data-id

  if (isNaN(workoutId)) {
    return res.status(400).json({ error: 'Invalid workoutId' });
  }

  try {
    // Decide which muscle groups this workout hits based on its ID.
    const flagsByWorkoutId = {
      1: { push: true, pull: false, legs: false, rest: false }, // Push workout
      2: { push: false, pull: true, legs: false, rest: false }, // Pull workout
      3: { push: false, pull: false, legs: true, rest: false }, // Legs workout
      4: { push: false, pull: false, legs: false, rest: true }, // Rest day
      5: { push: true, pull: false, legs: false, rest: false }, // Push workout
      6: { push: false, pull: true, legs: false, rest: false }, // Pull workout
      7: { push: false, pull: false, legs: true, rest: false }, // Legs workout
      8: { push: false, pull: false, legs: false, rest: true }, // Rest day
    };

    const flags = flagsByWorkoutId[workoutId] || {
      push: false,
      pull: false,
      legs: false,
      rest: false
    };

    // Build MMDDYY as an integer for today
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const dateInt = Number(mm + dd + yy);  // e.g., 031225

    // Insert workout (trigger will also handle FIRST_WORKOUT + workout-count achievements)
    await db.none(
      'SELECT insert_workout($1, $2, $3, $4, $5, $6)',
      [
        username,
        dateInt,
        flags.push || false,
        flags.pull || false,
        flags.legs || false,
        flags.rest || false,
      ]
    );

    // 🔥 NEW: compute streak and award streak achievements
    const streak = await computeStreak(username);

    if (streak >= 3) {
      await db.none('SELECT award($1, $2)', ['THREE_DAY_STREAK', username]);
    }
    if (streak >= 7) {
      await db.none('SELECT award($1, $2)', ['WEEK_STREAK', username]);
    }
    if (streak >= 30) {
      await db.none('SELECT award($1, $2)', ['MONTH_STREAK', username]);
    }
    if (streak >= 365) {
      await db.none('SELECT award($1, $2)', ['YEAR_STREAK', username]);
    }
    if (streak >= 730) {
      await db.none('SELECT award($1, $2)', ['TWO_YEAR_STREAK', username]);
    }
    if (streak >= 1095) {
      await db.none('SELECT award($1, $2)', ['THREE_YEAR_STREAK', username]);
    }
    if (streak >= 1461) {
      await db.none('SELECT award($1, $2)', ['FOUR_YEAR_STREAK', username]);
    }
    if (streak >= 1826) {
      await db.none('SELECT award($1, $2)', ['FIVE_YEAR_STREAK', username]);
    }
    return res.json({ success: true, streak });
  } catch (err) {
    console.error('Error inserting workout:', err);
    return res.status(500).json({ error: 'Failed to record workout' });
  }
});



// ---------------------- View engine & static ----------------------
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
}));
app.set('view engine', 'hbs');

// use the CSS file for styling
app.use(express.static(path.join(__dirname, 'resources')));

// views live at ProjectSourceCode/src/views
app.set('views', path.join(__dirname, 'views'));

app.use('/img', express.static(path.join(__dirname, 'resources/img')));

// ----------------------------------------Routes for every page we create ----------------------------------------

// Make it so the login page is the first page seen
app.get('/', (req, res) => {
  return res.redirect('/login');
});

// LOGIN (GET)
app.get('/login', (req, res) => {
  // If already logged in, you *could* redirect to /home, but it's optional
  if (req.session.username) {
    return res.redirect('/home');
  }

  res.render('pages/login', { hideFooter: true, hideHome: true });
});

// LOGIN (POST)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Handle missing input (added JSON handling for tests)
    if (!username || !password) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(400).json({ message: 'Invalid input' });
      }
      return res.status(400).render('pages/login', {
        hideFooter: true,
        hideHome: true,
        message: 'Invalid input'
      });
    }

    const user = await db.oneOrNone(
      'SELECT username, password_hash FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (!user || password !== user.password_hash) {

      const isJson = req.headers['content-type']?.includes('application/json');

      // Keep JSON behavior the same for tests
      if (isJson) {
        return res.status(400).json({ message: 'Invalid input' });
      }

      // Browser: show different messages
      const message = !user
        ? 'Username does not exist'
        : 'Incorrect password';

      return res.status(401).render('pages/login', {
        hideFooter: true,
        hideHome: true,
        message
      });
    }

    // store username in session
    req.session.username = user.username;

    // JSON request (tests)
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(200).json({ message: 'Login successful' });
    }

    // Browser: go to home
    return res.redirect('/home');
  } catch (err) {
    console.error(err);

    // JSON error response for tests
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ message: 'Server error logging in.' });
    }

    return res.status(500).render('pages/login', {
      hideFooter: true,
      hideHome: true,
      message: 'There was an error logging in.'
    });
  }
});

// REGISTER (GET)
app.get('/register', (req, res) => {
  // If already logged in, can redirect to home if you want
  if (req.session.username) {
    return res.redirect('/home');
  }

  res.render('pages/register', { hideFooter: true, hideHome: true });
});

// REGISTER (POST)
app.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '').trim();

    // Validate input
    if (!username || !password) {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(400).json({ message: 'Invalid input' });
      }
      return res.status(400).render('pages/register', {
        hideFooter: true,
        hideHome: true,
        message: 'Username and password are required.'
      });
    }

    // Insert into DB
    await db.none(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, password]
    );

    // If the request is JSON (Mocha test)
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(200).json({ message: 'User registered successfully' });
    }

    // Otherwise, normal browser redirect to login
    return res.redirect('/login');
  } catch (err) {
    console.error('Register error:', { code: err.code, message: err.message, detail: err.detail });

    // Handle duplicate username
    if (err && err.code === '23505') {
      if (req.headers['content-type']?.includes('application/json')) {
        return res.status(409).json({ message: 'That username is taken. Try another.' });
      }
      return res.status(409).render('pages/register', {
        hideFooter: true,
        hideHome: true,
        message: 'That username is taken. Try another.'
      });
    }

    // Fallback for all other errors
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ message: 'Server error creating the account.' });
    }

    return res.status(500).render('pages/register', {
      hideFooter: true,
      hideHome: true,
      message: 'Server error creating the account.'
    });
  }
});

// Home page (must be logged in so /api/progress has a username)
app.get('/home', async (req, res) => {
  if (!req.session.username) return res.redirect('/login');

  let highestCompleted = 0;
  try {
    const row = await db.oneOrNone(
      'SELECT highest_completed FROM user_progress WHERE username = $1',
      [req.session.username]
    );
    highestCompleted = row ? row.highest_completed : 0;
  } catch (err) {
    console.error('Error loading user progress:', err);
  }

  // Base nodes for a single set
  const baseNodes = [
    { id: 1, offset: -10 },
    { id: 2, offset: 10 },
    { id: 3, offset: -10 },
    { id: 4, offset: 10 },
    { id: 5, offset: -10 },
    { id: 6, offset: 10 },
    { id: 7, offset: -10 },
    { id: 8, offset: 10 }
  ];

  // Compute how many full cycles user completed
  const cyclesCompleted = Math.floor(highestCompleted / baseNodes.length);

  // Build all cycles to render
  const sets = [];
  for (let cycle = 0; cycle <= cyclesCompleted; cycle++) {
    const cycleNodes = baseNodes.map(n => ({
      id: n.id + cycle * baseNodes.length,
      offset: n.offset,
      cycleNumber: cycle
    }));
    sets.push(cycleNodes);
  }

  res.render('pages/home', {
    sets,
    highestCompleted,
    username: res.locals.username,
    profilePic: res.locals.profilePic
  });
});


// Workouts page
app.get('/workouts', (req, res) => {
  res.render('pages/workouts', {
    title: 'Workouts',
    pushWorkouts: [
      { name: 'Bench Press', sets: 4, reps: '8–10' },
      { name: 'Overhead Press', sets: 3, reps: '10' },
      { name: 'Triceps Dips', sets: 3, reps: '12' }
    ],
    pullWorkouts: [
      { name: 'Pull-Ups', sets: 4, reps: '8–10' },
      { name: 'Barbell Rows', sets: 3, reps: '10' },
      { name: 'Bicep Curls', sets: 3, reps: '12' }
    ],
    legWorkouts: [
      { name: 'Squats', sets: 4, reps: '8' },
      { name: 'Lunges', sets: 3, reps: '10 each leg' },
      { name: 'Calf Raises', sets: 3, reps: '15' }
    ],
    username: res.locals.username,
    profilePic: res.locals.profilePic
  });
});

// Achievements page
app.get('/achievements', async (req, res, next) => {
  try {
    // use session username if logged in; fall back to ?u=user1 for quick testing
    const username = req.session?.username || req.query.u || 'user1';

    const { rows: achievements } = await db.result(
      `SELECT a.id,
          a.code,
          a.title,
          a.icon_path,
          a.sort_order,
          (ua.earned_at IS NOT NULL) AS earned,
          to_char(
            (ua.earned_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Denver',
            'YYYY-MM-DD HH24:MI'
          ) AS earned_at
     FROM achievements a
     LEFT JOIN user_achievements ua
       ON ua.achievement_id = a.id
      AND ua.username = $1
     ORDER BY earned DESC, a.sort_order, a.id`,
      [username]
    );


    return res.render('pages/achievements', {
      title: 'Achievements',
      achievements,
      username: res.locals.username,
      profilePic: res.locals.profilePic
    });

  } catch (err) {
    console.error('Achievements error:', err);
    return next(err);
  }
});




// Calendar page
app.get('/calendar', (req, res) => {
  res.render('pages/calendar', {
    title: 'Calendar',
    username: res.locals.username,
    profilePic: res.locals.profilePic
  });

});

// Profile page
app.get('/profile', async (req, res) => {
  const username = req.session.username;

  if (!username) return res.redirect('/login');

  try {
    const user = await db.one(
      "SELECT username, profile_pic FROM users WHERE username = $1",
      [username]
    );

    res.render('pages/profile', {
      username: user.username,
      profilePic: user.profile_pic || null
    });

  } catch (err) {
    console.error("Profile load error:", err);
    res.status(500).send("Server error loading profile.");
  }
});

// profile picture
app.post('/profile/pic', async (req, res) => {
  const username = req.session.username;
  if (!username) return res.redirect('/login');

  try {
    const { imageData } = req.body;

    if (!imageData) {
      return res.status(400).send("No image received.");
    }

    await db.none(
      "UPDATE users SET profile_pic = $1 WHERE username = $2",
      [imageData, username]
    );

    // Update session + locals immediately
    req.session.profilePic = imageData;
    res.locals.profilePic = imageData;

    res.redirect('/profile');

  } catch (err) {
    console.error("Profile pic update error:", err);
    res.status(500).send("Error updating profile picture.");
  }
});


// Log out
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

const PORT = process.env.PORT || 3000;
// app.listen(PORT, '0.0.0.0', () => console.log(`The server is running on http://localhost:${PORT}`));
module.exports = app.listen(PORT, '0.0.0.0', () => console.log(`The server is running on http://localhost:${PORT}`));