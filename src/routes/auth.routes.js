const express = require('express');
const db = require('../config/db');
const bcrypt = require('bcrypt');

const router = express.Router();
const SALT_ROUNDS = 10;

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?,?,?,?)',
      [name, email, hashedPassword, role],
      (err) => {
        if (err) return res.status(500).json(err);
        res.json({ message: 'User registered' });
      }
    );
  } catch (err) {
    res.status(500).json({ message: 'Hashing failed' });
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE email=?',
    [email],
    async (err, results) => {
      if (err) return res.status(500).json(err);
      if (results.length === 0)
        return res.status(401).json({ message: 'Login failed' });

      const user = results[0];
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch)
        return res.status(401).json({ message: 'Login failed' });

      delete user.password; // penting
      res.json(user);
    }
  );
});

module.exports = router;

