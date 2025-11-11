const path = require('path');
const { engine } = require('express-handlebars');
const express = require('express');
const pgp = require('pg-promise')();              

const app = express();

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

    const user = await db.oneOrNone(
      'SELECT username, password_hash FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (!user || password !== user.password_hash) {
      return res.status(401).render('pages/login', { hideFooter: true, message: 'Invalid credentials' });
    }

    req.session.username = user.username;

    return res.redirect('/home');
  } catch (err) {
    console.error(err);
    return res.status(500).render('pages/login', { hideFooter: true, message: 'There was an error logging in.' });
  }
});

// REGISTER (GET)
app.get('/register', (req, res) => {
  res.render('pages/register', { hideFooter: true, hideHome: true });
});

// REGISTER (POST)
app.post('/register', async (req, res) => {
  try {
    const username = String(req.body.username || '').trim();
    const password = String(req.body.password || '').trim();

    if (!username || !password) {
      return res.status(400).render('pages/register', {
        hideFooter: true,
        message: 'Username and password are required.'
      });
    }

    await db.none(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, password]
    );

    return res.redirect('/login');
  } catch (err) {
    console.error('Register error:', { code: err.code, message: err.message, detail: err.detail });
    if (err && err.code === '23505') {
      return res.status(409).render('pages/register', { hideFooter: true, message: 'That username is taken. Try another.' });
    }
    return res.status(500).render('pages/register', { hideFooter: true, message: 'Server error creating the account.' });
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
app.get('/profile', (req, res) => {
  res.render('pages/profile', { title: 'Profile' });
});

// //Log out page for when we actually want to implement it
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`The server is running on http://localhost:${PORT}`));
// module.exports = app.listen(PORT, '0.0.0.0', () => console.log(`The server is running on http://localhost:${PORT}`));


