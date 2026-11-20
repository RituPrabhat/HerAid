// Register, login, logout, and "who am I" routes
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');

const router = express.Router();

// POST /api/register : create a new student account
router.post('/register', (req, res) => {
  const { name, email, password, department, year } = req.body;

  if (!name || !email || !password || !department || !year) {
    return res.status(400).json({ error: 'Please fill in all fields.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const yearNum = Number(year);
  if (!Number.isInteger(yearNum) || yearNum < 1 || yearNum > 5) {
    return res.status(400).json({ error: 'Please choose a valid year.' });
  }

  const cleanEmail = email.trim().toLowerCase();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(cleanEmail);
  if (existing) {
    return res.status(409).json({ error: 'This email is already registered.' });
  }

  const hash = bcrypt.hashSync(password, 10); // scramble the password
  const result = db
    .prepare('INSERT INTO users (name, email, password_hash, department, year) VALUES (?, ?, ?, ?, ?)')
    .run(name.trim(), cleanEmail, hash, department.trim(), yearNum);

  req.session.userId = Number(result.lastInsertRowid); // log them in straight away
  res.status(201).json({ message: 'Account created.', name: name.trim() });
});

// POST /api/login : log in an existing student
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please enter email and password.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }

  req.session.userId = user.id;
  res.json({ message: 'Logged in.', name: user.name });
});

// POST /api/logout : log out
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ message: 'Logged out.' });
  });
});

// GET /api/me : who is logged in right now? (pages use this to check)
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  const user = db
    .prepare('SELECT id, name, email, department, year FROM users WHERE id = ?')
    .get(req.session.userId);
  if (!user) {
    return res.status(401).json({ error: 'Not logged in.' });
  }
  res.json(user);
});

module.exports = router;
