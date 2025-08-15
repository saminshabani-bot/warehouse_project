CREATE DATABASE IF NOT EXISTS warehouse_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE warehouse_db;



-- جدول محصولات
CREATE TABLE products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    min_stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول سفارشات
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    notes TEXT,
    status ENUM('pending', 'shipped', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- جدول تاریخچه موجودی
CREATE TABLE inventory_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    type ENUM('IN', 'OUT') NOT NULL,
    quantity INT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ایجاد ایندکس‌ها برای بهبود عملکرد
CREATE INDEX idx_products_stock ON products(stock);
CREATE INDEX idx_orders_product ON orders(product_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_date ON orders(created_at);
CREATE INDEX idx_inventory_logs_product ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_date ON inventory_logs(created_at);



INSERT INTO products (name, description, price, stock, min_stock) VALUES 
('لپ‌تاپ اپل', 'لپ‌تاپ مک‌بوک پرو 13 اینچی', 45000000, 5, 2 ),
('گوشی سامسونگ', 'گوشی گلکسی S23', 25000000, 10, 3 ),
('کتاب برنامه‌نویسی', 'کتاب آموزش React.js', 150000, 20, 5),
('پیراهن مردانه', 'پیراهن کتان آستین کوتاه', 250000, 50, 10),
('کفش ورزشی', 'کفش نایک برای دویدن', 1200000, 15, 5),
('یخچال سامسونگ', 'یخچال فریزر 400 لیتری', 8500000, 3, 1),
('توپ فوتبال', 'توپ فوتبال حرفه‌ای', 350000, 25, 8),
('هدفون سونی', 'هدفون بی‌سیم با کیفیت بالا', 2800000, 8, 3);

-- درج سفارشات نمونه
INSERT INTO orders (product_id, quantity, total_price, customer_name, customer_phone, notes, status) VALUES 
(1, 1, 45000000, 'علی احمدی', '09123456789', 'تحویل در محل کار', 'shipped'),
(3, 2, 300000, 'فاطمه محمدی', '09187654321', 'کتاب‌های آموزشی', 'pending'),
(5, 1, 1200000, 'محمد رضایی', '09351234567', 'کفش ورزشی', 'cancelled'),
(2, 1, 25000000, 'زهرا کریمی', '09111111111', 'گوشی موبایل', 'shipped');

-- درج تاریخچه موجودی نمونه
INSERT INTO inventory_logs (product_id, type, quantity, description) VALUES 
(1, 'IN', 5, 'افزودن کالای جدید'),
(2, 'IN', 10, 'افزودن کالای جدید'),
(3, 'IN', 20, 'افزودن کالای جدید'),
(4, 'IN', 50, 'افزودن کالای جدید'),
(5, 'IN', 15, 'افزودن کالای جدید'),
(6, 'IN', 3, 'افزودن کالای جدید'),
(7, 'IN', 25, 'افزودن کالای جدید'),
(8, 'IN', 8, 'افزودن کالای جدید'),
(1, 'OUT', 1, 'سفارش مشتری: علی احمدی'),
(3, 'OUT', 2, 'سفارش مشتری: فاطمه محمدی'),
(5, 'OUT', 1, 'سفارش مشتری: محمد رضایی'),
(2, 'OUT', 1, 'سفارش مشتری: زهرا کریمی'),
(5, 'IN', 1, 'لغو سفارش'); 