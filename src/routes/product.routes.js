const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.get('/', (req, res) => {
  db.query('SELECT * FROM products ORDER BY id DESC', (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

router.post('/', (req, res) => {
  const { name, price_per_kg, stock } = req.body;
  if (!name || !price_per_kg || !stock ) {
    return res.status(400).json({ error: 'Nama, harga, dan stok harus diisi' });
  }

  const sql = 'INSERT INTO products (name, price_per_kg, stock) VALUES (?, ?, ?)';
  db.query(sql, [name, price_per_kg, stock], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: 'Product created', id: result.insertId });
  });
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, price_per_kg, stock } = req.body;

  const sql = 'UPDATE products SET name = ?, price_per_kg = ?, stock = ? WHERE id = ?';
  db.query(sql, [name, price_per_kg, stock, id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Product updated' });
  });
});

router.delete('/:id', (req, res) => {
  const { id } = req.params;
  
  const sql = 'DELETE FROM products WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Product deleted' });
  });
});

module.exports = router;