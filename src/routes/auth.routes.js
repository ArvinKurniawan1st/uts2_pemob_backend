const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;

  db.query(
    'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
    [name, email, password, role],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: 'User registered' });
    }
  );
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE email=? AND password=?',
    [email, password],
    (err, results) => {
      if (results.length === 0)
        return res.status(401).json({ message: 'Login failed' });

      res.json(results[0]);
    }
  );
});

module.exports = router;
