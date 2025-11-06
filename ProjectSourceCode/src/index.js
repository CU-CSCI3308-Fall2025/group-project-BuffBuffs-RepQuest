const path = require('path');
const { engine } = require('express-handlebars');
const express = require('express');
const pgp = require('pg-promise')();              

const app = express();

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

app.use(express.urlencoded({ extended: true }));

// ----------------------------------------Routes for every page we create ----------------------------------------
app.get('/', (_, res) => res.redirect('/login'));

// LOGIN (GET)
app.get('/login', (req, res) => {
  res.render('pages/login', { hideFooter: true, message: null });
});

// LOGIN (POST)
app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.oneOrNone(
      'SELECT id, username, password_hash FROM users WHERE username = $1 LIMIT 1',
      [username]
    );

    if (!user || password !== user.password_hash) {
      return res.status(401).render('pages/login', { hideFooter: true, message: 'Invalid credentials' });
    }


    return res.redirect('/home');
  } catch (err) {
    console.error(err);
    return res.status(500).render('pages/login', { hideFooter: true, message: 'There was an error logging in.' });
  }
});

// REGISTER (GET)
app.get('/register', (req, res) => {
  res.render('pages/register', { hideFooter: true, message: null });
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
  res.render('pages/workouts', { title: 'Workouts' });
});

// Achievements page
app.get('/achievements', (req, res) => {
  res.render('pages/achievements', { title: 'Achievements' });
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

