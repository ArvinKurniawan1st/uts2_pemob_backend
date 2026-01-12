const express = require('express');
const db = require('../config/db');
const router = express.Router();

/**
 * =====================================================
 * POST /orders
 * Membuat order + order_items
 * =====================================================
 */
router.post('/', async (req, res) => {
  const { user_id, items, shipping_cost } = req.body;

  if (!user_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Data tidak valid' });
  }

  try {
    let totalItem = 0;

    // hitung total
    for (const item of items) {
      const [products] = await db.promise().query(
        'SELECT price_per_kg FROM products WHERE id = ?',
        [item.product_id]
      );

      if (products.length === 0) {
        throw new Error('Produk tidak ditemukan');
      }

      totalItem += products[0].price_per_kg * item.quantity;
    }

    const total = totalItem + shipping_cost;

    // insert order
    const [orderResult] = await db.promise().query(
      'INSERT INTO orders (user_id, shipping_cost, total) VALUES (?,?,?)',
      [user_id, shipping_cost, total]
    );

    const orderId = orderResult.insertId;

    // insert items
    for (const item of items) {
      const [products] = await db.promise().query(
        'SELECT price_per_kg FROM products WHERE id = ?',
        [item.product_id]
      );

      const subTotal = products[0].price_per_kg * item.quantity;

      await db.promise().query(
        `INSERT INTO order_items
         (order_id, product_id, quantity, sub_total)
         VALUES (?,?,?,?)`,
        [orderId, item.product_id, item.quantity, subTotal]
      );
    }

    res.json({ order_id: orderId, shipping_cost, total });

  } catch (err) {
    console.error('ORDER ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});


/**
 * =====================================================
 * GET /orders
 * Ambil semua order
 * =====================================================
 */
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      'SELECT * FROM orders ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * =====================================================
 * GET /orders/:orderId/items
 * Ambil item per order
 * =====================================================
 */
router.get('/:orderId/items', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `
      SELECT
        oi.id,
        p.name AS product_name,
        oi.quantity,
        oi.sub_total
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      `,
      [req.params.orderId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * =====================================================
 * PUT /orders/:id/approve
 * =====================================================
 */
router.put('/:id/approve', async (req, res) => {
  try {
    await db.promise().query(
      'UPDATE orders SET status = "APPROVED" WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Order approved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * =====================================================
 * PUT /orders/:id/reject
 * =====================================================
 */
router.put('/:id/reject', async (req, res) => {
  try {
    await db.promise().query(
      'UPDATE orders SET status = "REJECTED" WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Order rejected' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
