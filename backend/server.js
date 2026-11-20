// HerAid server: the "manager" that starts the website
const express = require('express');
const session = require('express-session');
const path = require('path');

require('./db/database'); // makes sure the database and tables exist

const app = express();
const PORT = process.env.PORT || 3000;

// Let the server read JSON sent from the pages
app.use(express.json());

// Remember who is logged in (a cookie keeps the session)
app.use(session({
  secret: process.env.SESSION_SECRET || 'heraid-secret-change-me', // set SESSION_SECRET when deployed
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // stay logged in for 1 day
}));

// Show the website: serve everything inside the frontend folder
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// API routes (the pages talk to these)
app.use('/api', require('./routes/auth'));
app.use('/api/requests', require('./routes/requests'));

app.listen(PORT, () => {
  console.log(`HerAid running at http://localhost:${PORT}`);
});
