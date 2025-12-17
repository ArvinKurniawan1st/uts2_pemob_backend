const express = require('express');
const db = require('../config/db');
const router = express.Router();

router.post('/', async (req, res) => {
  const { user_id, items, shipping_cost } = req.body;
  let subtotal = 0;

  for (let item of items) {
    const [product] = await db.promise().query(
      'SELECT price_per_kg FROM products WHERE id=?',
      [item.product_id]
    );
    subtotal += product[0].price_per_kg * item.quantity;
  }

  const total = subtotal + shipping_cost;

  db.query(
    'INSERT INTO orders (user_id, subtotal, shipping_cost, total) VALUES (?,?,?,?)',
    [user_id, subtotal, shipping_cost, total]
  );

  res.json({ subtotal, shipping_cost, total });
});

router.get('/', (req, res) => {
  db.query('SELECT * FROM orders', (err, results) => {
    res.json(results);
  });
});

router.put('/:id/approve', (req, res) => {
  db.query(
    'UPDATE orders SET status="APPROVED" WHERE id=?',
    [req.params.id],
    () => res.json({ message: 'Approved' })
  );
});

module.exports = router;
