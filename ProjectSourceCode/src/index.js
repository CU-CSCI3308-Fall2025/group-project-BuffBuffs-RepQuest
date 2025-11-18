const path = require('path');
const { engine } = require('express-handlebars');
const express = require('express');
const pgp = require('pg-promise')();              

const app = express();

// for testing purposes.
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const session = require('express-session');

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false
}));


const db = pgp({
  host: process.env.DB_HOST,                      
  port: Number(process.env.DB_PORT || 5432),
  database: process.env.DB_NAME,                  
  user: process.env.DB_USER,                      
  password: process.env.DB_PASSWORD               
});

app.get('/api/progress', async (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });
  
  try {
    const row = await db.oneOrNone(
      'SELECT highest_completed FROM user_progress WHERE username = $1',
      [req.session.username]
    );
    return res.json({ highest_completed: row ? row.highest_completed : 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to load progress' });
  }
});

app.post('/api/progress', async (req, res) => {
  if (!req.session.username) return res.status(401).json({ error: 'Not logged in' });

  const completed = Number(req.body.completed);
  if (isNaN(completed)) return res.status(400).json({ error: 'Invalid value' });

  try {
    await db.none(
      `INSERT INTO user_progress (username, highest_completed)
       VALUES ($1, $2)
       ON CONFLICT (username)
       DO UPDATE SET highest_completed = GREATEST(excluded.highest_completed, user_progress.highest_completed)`,
      [req.session.username, completed]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Record a completed workout in the workouts table
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
    // You can tweak this however you want.
    const flags = {
      1: { back: true, chest: false, arms: false, legs: false, glutes: false, abs: false, cardio: false },
      2: { back: false, chest: true, arms: true,  legs: false, glutes: false, abs: false, cardio: false },
      3: { back: false, chest: false, arms: false, legs: false, glutes: false, abs: false, cardio: true  },
      4: { back: false, chest: false, arms: false, legs: true,  glutes: true,  abs: true,  cardio: false },
      5: { back: false, chest: false, arms: false, legs: true,  glutes: false, abs: false, cardio: false },
      6: { back: true,  chest: true,  arms: true,  legs: false, glutes: false, abs: false, cardio: false },
      7: { back: false, chest: false, arms: false, legs: false, glutes: false, abs: true,  cardio: true  }
    }[workoutId] || { back: false, chest: false, arms: false, legs: false, glutes: false, abs: false, cardio: false };

    // Build MMDDYY as an integer for today
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const yy = String(now.getFullYear()).slice(-2);
    const dateInt = Number(mm + dd + yy);  // e.g., 031225

    // Use your SQL helper function insert_workout(...) so the trigger fills date_actual
    await db.none(
      'SELECT insert_workout($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [
        username,
        dateInt,
        flags.back   || false,
        flags.chest  || false,
        flags.arms   || false,
        flags.legs   || false,
        flags.glutes || false,
        flags.abs    || false,
        flags.cardio || false
      ]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error('Error inserting workout:', err);
    return res.status(500).json({ error: 'Failed to record workout' });
  }
});


app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir:  path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
}));
app.set('view engine', 'hbs');

// use the CSS file for styling

app.use(express.static(path.join(__dirname, 'resources')));


// views live at ProjectSourceCode/src/views

app.set('views', path.join(__dirname, 'views'));

app.use('/img', express.static(path.join(__dirname, 'resources/img')));

app.use(express.urlencoded({ extended: true }));

// ----------------------------------------Routes for every page we create ----------------------------------------
app.get('/', (_, res) => res.redirect('/login')); //Make it so the login page is the first page seen

// LOGIN (GET)
app.get('/login', (req, res) => {
  res.render('pages/login', { hideFooter: true, hideHome: true });
});


// LOGIN (POST)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Handle missing input (added JSON handling for tests)
    if (!username || !password) {
      if (req.headers['content-type']?.includes('application/json')) {

        res.render('pages/login', { hideFooter: true, hideHome: true });
        return res.status(400).json({ message: 'Invalid input' });
      }
      return res.status(400).render('pages/login', { hideFooter: true, message: 'Invalid input' });
    }

    const user = await db.oneOrNone(
      'SELECT username, password_hash FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (!user || password !== user.password_hash) {

      if (req.headers['content-type']?.includes('application/json')) {
        // Added for Mocha: send 400 JSON instead of 401 HTML
        return res.status(400).json({ message: 'Invalid input' });
      }
      return res.status(401).render('pages/login', { hideFooter: true, message: 'Invalid credentials' });
      
    }

    req.session.username = user.username;

    // Added for Mocha: return JSON success for JSON requests instead of redirect
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(200).json({ message: 'Login successful' });
    }

    return res.redirect('/home');
  } catch (err) {
    console.error(err);

    // Added JSON error response for tests
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ message: 'Server error logging in.' });
    }

    return res.status(500).render('pages/login', { hideFooter: true, message: 'There was an error logging in.' });
  }
});


// REGISTER (GET)
app.get('/register', (req, res) => {
  res.render('pages/register', { hideFooter: true, hideHome: true });
});

// REGISTER (POST)

// // for testing purposes.
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

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
        message: 'That username is taken. Try another.'
      });
    }

    // Fallback for all other errors
    if (req.headers['content-type']?.includes('application/json')) {
      return res.status(500).json({ message: 'Server error creating the account.' });
    }

    return res.status(500).render('pages/register', {
      hideFooter: true,
      message: 'Server error creating the account.'
    });
  }
});



// Home page 
app.get('/home', (req, res) => {
  res.render('pages/home', { title: 'Home' });
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
    ]
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
              a.description,
              a.icon_path,
              a.sort_order,
              (ua.earned_at IS NOT NULL) AS earned,
              to_char(ua.earned_at, 'YYYY-MM-DD HH24:MI') AS earned_at
       FROM achievements a
       LEFT JOIN user_achievements ua
         ON ua.achievement_id = a.id
        AND ua.username = $1
       ORDER BY a.sort_order, a.id`,
      [username]
    );

    return res.render('pages/achievements', {
      title: 'Achievements',
      username,
      achievements
    });
  } catch (err) {
    console.error('Achievements error:', err);
    return next(err);
  }
});


// Calendar page
app.get('/calendar', (req, res) => {
  res.render('pages/calendar', { title: 'Calendar' });
});

// Profile page
app.get('/profile', async (req, res) => {
  const loggedInUser = req.session.username;

  if (!loggedInUser) {
    return res.redirect('/login');
  }

  try {
    const user = await db.oneOrNone(
      `SELECT username, name
       FROM users
       WHERE username = $1`,
      [loggedInUser]
    );

    if (!user) {
      return res.status(404).send("User not found.");
    }

    res.render('pages/profile', {  
      username: user.username,
      name: user.name
    });

  } catch (err) {
    console.error('Profile page error:', err);
    res.status(500).send("Server error loading profile.");
  }
});



// //Log out page for when we actually want to implement it
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

app.get('/welcome', (req, res) => {
  res.json({status: 'success', message: 'Welcome!'});
});



const PORT = process.env.PORT || 3000;
// app.listen(PORT, '0.0.0.0', () => console.log(`The server is running on http://localhost:${PORT}`));
module.exports = app.listen(PORT, '0.0.0.0', () => console.log(`The server is running on http://localhost:${PORT}`));
