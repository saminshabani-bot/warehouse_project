const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Get all orders with optional filters
router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `SELECT o.*, p.name as product_name, p.price as product_price
                FROM orders o
                LEFT JOIN products p ON o.product_id = p.id
                WHERE 1=1`;
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (search) {
      query += ' AND (id LIKE ? OR customer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    db.query(query, params, (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: 'خطا در بارگیری سفارشات' });
      }
      res.json(results);
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'خطا در دریافت سفارشات' });
  }
});

// Get single order with items
router.get('/:id', async (res, req) => {
  try {
    const { id } = req.body;
    let query = `select * 
                  from orders o
                  where o.id = ?`;

    db.query(query, [id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'خطا در بارگیری سفارش' });
      }
      if (result.length == 0) {
        return res.status(404).json({ meassage: 'سفارش یافت نشد.' });
      }
      res.json(result);

    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'خطا در سرور' });
  }
});


// Create new order
router.post('/', (req, res) => {
  const { product_id, quantity,total_price,customer_name, customer_phone, notes, status } = req.body;

  if (!product_id || product_id < 1) return res.status(400).json({ message: 'شناسه کالا باید معتبر باشد!' });
  if (!quantity || quantity < 1) return res.status(400).json({ message: 'تعداد سفارش حداقل باید 1 باشد!' });
  if (!total_price || total_price < 0) return res.status(400).json({ message: 'قیمت کل باید معتبر باشد!' });
  if (!customer_name) return res.status(400).json({ message: 'نام مشتری باید وارد شود!' });

  const querySelect = `SELECT name, stock FROM products WHERE id = ?`;
  db.query(querySelect, [product_id], (err, result) => {
    if (err || result.length === 0) return res.status(404).json({ message: 'کالا یافت نشد!' });

    const queryInsert = `INSERT INTO orders (product_id, quantity, total_price, customer_name, customer_phone, notes, status)
                         VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(queryInsert, [product_id, quantity, total_price, customer_name, customer_phone, notes, status], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'افزودن سفارش با خطا مواجه شد!' });
      }
      res.json({ message: 'سفارش با موفقیت افزوده شد!' });
    });
  });
});

// Update order status
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'shipped' || status !== 'cancelled' || status !== 'pending') {
      return res.status(400).json({ message: 'وضعیت نامعتبر است!' });
    }

    db.query('SELECT product_id, quantity, status as current_status FROM orders WHERE id = ?', [id], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'خطا در دریافت اطلاعات سفارش' });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'سفارش یافت نشد' });
      }

      const order = results[0];

      if (status === 'cancelled' && order.current_status !== 'cancelled') {
        db.query('UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?',
          [order.quantity, order.product_id], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: 'خطا در بازگرداندن موجودی' });
            }
          });
      } else if ((status === 'shipped' || status === 'pending') && order.current_status === 'cancelled') {
        db.query('UPDATE products SET stock = stock - ?, updated_at = NOW() WHERE id = ?',
          [order.quantity, order.product_id], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: 'خطا در کاهش موجودی' });
            }
          });
      }
      db.query('UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?', [status, id], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'خطا در بروزرسانی وضعیت سفارش' });
        }
        res.json({ message: 'وضعیت سفارش با موفقیت بروزرسانی شد' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'خطا در سرور' });
  }
});


//delete order
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    db.query('SELECT product_id, quantity, status FROM orders WHERE id = ?', [id], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'خطا در دریافت اطلاعات سفارش' });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'سفارش یافت نشد' });
      }

      const order = results[0];

      if (order.status !== 'cancelled') {
        db.query('UPDATE products SET stock = stock + ?, updated_at = NOW() WHERE id = ?',
          [order.quantity, order.product_id], (err) => {
            if (err) {
              console.error(err);
              return res.status(500).json({ message: 'خطا در بازگرداندن موجودی' });
            }
          });
      }
      db.query('DELETE FROM orders WHERE id = ?', [id], (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'خطا در حذف سفارش' });
        }
        res.json({ message: 'سفارش با موفقیت حذف شد' });
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

module.exports = router;