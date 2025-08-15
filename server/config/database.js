const mysql = require('mysql2');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'warehouse_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Convert pool to use promises
const promisePool = pool.promise();

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error('خطا در اتصال به دیتابیس:', err.message);
    return;
  }
  console.log(' اتصال به دیتابیس موفقیت‌آمیز');
  connection.release();
});

module.exports = pool;
module.exports.promise = promisePool; 