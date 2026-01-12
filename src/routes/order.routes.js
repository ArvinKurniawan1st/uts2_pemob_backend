const express = require('express');
const db = require('../config/db');
const router = express.Router();

/**
 * =====================================================
 * POST /orders
 * Membuat order + order_items (SNAPSHOT)
 * =====================================================
 */
router.post('/', async (req, res) => {
  const { user_id, items, shipping_cost } = req.body;

  if (!user_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Data tidak valid' });
  }

  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();

    let totalItem = 0;
    const productSnapshots = [];

    // Ambil snapshot produk + hitung total
    for (const item of items) {
      const [products] = await conn.query(
        'SELECT name, price_per_kg FROM products WHERE id = ?',
        [item.product_id]
      );

      if (products.length === 0) {
        throw new Error('Produk tidak ditemukan');
      }

      const product = products[0];
      const subTotal = product.price_per_kg * item.quantity;

      totalItem += subTotal;

      productSnapshots.push({
        product_id: item.product_id,
        product_name: product.name,
        price: product.price_per_kg,
        quantity: item.quantity,
        sub_total: subTotal
      });
    }

    const total = totalItem + shipping_cost;

    // Insert order
    const [orderResult] = await conn.query(
      `
      INSERT INTO orders (user_id, shipping_cost, total)
      VALUES (?,?,?)
      `,
      [user_id, shipping_cost, total]
    );

    const orderId = orderResult.insertId;

    // Insert order_items (SNAPSHOT)
    for (const item of productSnapshots) {
      await conn.query(
        `
        INSERT INTO order_items
        (order_id, product_id, product_name, price, quantity, sub_total)
        VALUES (?,?,?,?,?,?)
        `,
        [
          orderId,
          item.product_id,
          item.product_name,
          item.price,
          item.quantity,
          item.sub_total
        ]
      );
    }

    await conn.commit();

    res.json({
      order_id: orderId,
      total,
      shipping_cost,
      status: 'PENDING'
    });

  } catch (err) {
    await conn.rollback();
    console.error('ORDER ERROR:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});


/**
 * =====================================================
 * GET /orders/user/:userId
 * ORDER HISTORY (USER-BASED)
 * =====================================================
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `
      SELECT
        id,
        total,
        shipping_cost,
        status,
        created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
      `,
      [req.params.userId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


/**
 * =====================================================
 * GET /orders/:orderId/items
 * DETAIL ORDER (SNAPSHOT)
 * =====================================================
 */
router.get('/:orderId/items', async (req, res) => {
  try {
    const [rows] = await db.promise().query(
      `
      SELECT
        product_name,
        price,
        quantity,
        sub_total
      FROM order_items
      WHERE order_id = ?
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
  const orderId = req.params.id;
  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();

    // Ambil item order
    const [items] = await conn.query(
      `
      SELECT product_id, quantity
      FROM order_items
      WHERE order_id = ?
      `,
      [orderId]
    );

    if (items.length === 0) {
      throw new Error('Order item tidak ditemukan');
    }

    // Cek stok SEMUA produk
    for (const item of items) {
      const [[product]] = await conn.query(
        'SELECT stock FROM products WHERE id = ? FOR UPDATE',
        [item.product_id]
      );

      if (!product || product.stock < item.quantity) {
        // AUTO REJECT
        await conn.query(
          'UPDATE orders SET status = "REJECTED" WHERE id = ?',
          [orderId]
        );

        await conn.commit();

        return res.status(400).json({
          error: 'Stok tidak mencukupi, order otomatis ditolak'
        });
      }
    }

    // Jika semua stok cukup → kurangi stok
    for (const item of items) {
      await conn.query(
        'UPDATE products SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Update status
    await conn.query(
      'UPDATE orders SET status = "APPROVED" WHERE id = ?',
      [orderId]
    );

    await conn.commit();

    res.json({ message: 'Order approved & stok diperbarui' });

  } catch (err) {
    await conn.rollback();
    console.error('APPROVE ERROR:', err);
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
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
