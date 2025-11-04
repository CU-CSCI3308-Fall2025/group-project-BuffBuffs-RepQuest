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

app.get('/login', (req, res) => res.render('pages/login'));

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await db.oneOrNone(
      'SELECT id, username, password_hash FROM users WHERE username = $1 LIMIT 1',
      [username]
    );
    if (!user) return res.status(401).send('Invalid credentials');

    // plaintext compare (since seeds/register store plaintext right now)
    const ok = (password === user.password_hash);
    if (!ok) return res.status(401).send('Invalid credentials');

    res.send('Logged in!');
  } catch (err) {
    console.error(err);
    res.status(500).send('There was an error logging in');
  }
});

// Register
app.get('/register', (req, res) => res.render('pages/register'));

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    await db.none(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2)',
      [username, password]
    );

    res.redirect('/login');
  } catch (err) {
    
    console.error(err);
    res.status(500).send('There was an error creating the account');
  }
});

// Home page (where we have path)
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));

