const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/', (req, res) => {
  db.query('SELECT * FROM products', (err, results) => {
    res.json(results);
  });
});

module.exports = router;
