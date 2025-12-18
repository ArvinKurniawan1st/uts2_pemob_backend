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

    if (product.length === 0) {
      return res.status(400).json({ error: 'Produk tidak ditemukan' });
    }

    subtotal += product[0].price_per_kg * item.quantity;
  }

  const total = subtotal + shipping_cost;

  const [orderResult] = await db.promise().query(
    'INSERT INTO orders (user_id, subtotal, shipping_cost, total) VALUES (?,?,?,?)',
    [user_id, subtotal, shipping_cost, total]
  );

  const order_id = orderResult.insertId;

  for (let item of items) {
    const [product] = await db.promise().query(
      'SELECT price_per_kg FROM products WHERE id=?',
      [item.product_id]
    );

    await db.promise().query(
      `INSERT INTO order_items (order_id, product_id, quantity, price)
       VALUES (?,?,?,?)`,
      [
        order_id,
        item.product_id,
        item.quantity,
        product[0].price_per_kg
      ]
    );
  }

  // ❗ RESPONSE TIDAK DIUBAH
  res.json({ subtotal, shipping_cost, total });
});


router.get('/', (req, res) => {
  db.query('SELECT * FROM orders', (err, results) => {
    res.json(results);
  });
});

router.get('/:orderId/items', (req, res) => {
  const { orderId } = req.params;

  const sql = `
    SELECT 
      oi.id,
      oi.product_id,
      p.name AS product_name,
      oi.quantity,
      oi.price
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `;

  db.query(sql, [orderId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
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
