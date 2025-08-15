const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT * 
        FROM products p
        WHERE 1 = 1
      `;
    const params = [];

    if (search) {
      query += ' AND p.name LIKE ?';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY p.created_at DESC';

    db.query(query, params, (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'خطا در دریافت کالاها' });
      }
      res.json(results);
    });
  } catch (error) {
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const {id} = req.params;
    let query = `
    SELECT *
    FROM products p
    WHERE p.id = ?
    `;

    db.query(query,[id] , (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'خطا در دریافت کالا' });
      }
      if (results.length == 0) {
        return res.status(404).json({ message: 'کالا یافت نشد' });
      }
      res.json(results);
    });
  } catch {
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const { name, description, price, stock, min_stock } = req.body;
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: 'نام کالا الزامی است' });
    }

    if (isNaN(price) || price < 0) {
      return res.status(400).json({ message: 'قیمت باید عدد مثبت باشد' });
    }

    if (!Number.isInteger(stock) || stock < 0) {
      return res.status(400).json({ message: 'موجودی باید عدد صحیح مثبت باشد' });
    }

    if (!Number.isInteger(min_stock) || min_stock < 0) {
      return res.status(400).json({ message: 'حداقل موجودی باید عدد صحیح مثبت باشد' });
    }

    let query = `INSERT INTO products(name, description, price, stock, min_stock) VALUES 
    (?, ?, ? ,? ,?)`;
    db.query(query, [name, description, price, stock, min_stock], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'کالا اضافه نشد!' });
      }
      res.status(201).json({ message: 'کالا با موفقیت افزوده شد!' });
    });
  } catch {
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { name, description, price, stock, min_stock } = req.body;
    if (name.trim().length == 0) {
      return res.status(400).json({ message: 'اسم باید وارد شود' });
    }
    if (stock < 0) {
      return res.status(400).json({ message: 'موجودی باید مقدار مثبت باشد!' });
    }
    if (min_stock < 0) {
      return res.status(400).json({ message: 'مقدار حداقل موجودی باید مثبت باشد!' });
    }
    if (price < 0) {
      return res.status(400).json({ message: 'مقدار قیمت باید مثبت باشد!' });
    }

    let query = `
    UPDATE products p
    SET p.name = ? , p.description = ? , p.price = ?, p.stock = ? , p.min_stock=?
    WHERE p.id = ?`;

    db.query(query, [name, description, price, stock, min_stock, id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(400).json({ message: 'خطا در بروزرسانی کالا!' });
      }
      res.status(200).json({ message: 'کالا با موفقیت بروزرسانی شد!' });
    });
  } catch {
    res.status(500).json({ message: 'خطا در سرور' });
  }
});

// Delete product
router.delete('/:id', async (req , res) => {
  try{
    const { id } = req.params;
    let query = `
    DELETE FROM products p
    WHERE p.id = ?`;

    db.query(query, [id] , (err, result) => {
      if(err){
        console.error(err);
        return res.status(400).json({message: 'خطا در حذف کالا'});
      }
      res.status(201).json({message: 'کالا با موفقیت حذف شد!'});
    });
  }catch{
    res.status(500).json({message: 'خطا در سرور'});
  }
});

module.exports = router;



