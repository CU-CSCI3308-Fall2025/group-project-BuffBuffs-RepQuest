const path = require('path');
const { engine } = require('express-handlebars');
const express = require('express');

const app = express();

app.engine('hbs', engine({
  extname: '.hbs',                                   
  defaultLayout: 'main',
  layoutsDir:  path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));     

app.use(express.urlencoded({ extended: true }));

// If  file is at /src/views/pages/login.hbs:
app.get('/login', (req, res) => res.render('pages/login'));

// If it's directly /src/views/login.hbs, use:
// app.get('/login', (req, res) => res.render('login'));

app.get('/', (_, res) => res.redirect('/login'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
