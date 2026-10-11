-- Dededen Toruna - Cafe Adisyon Sistemi v10 (yoğun saat hızlı sipariş + adisyon teslim takibi)
-- Varsayılan admin kullanıcı adı: admin
-- Varsayılan admin şifresi: 1973
-- Şifre düz metin değil, password_hash() çıktısı olarak saklanır.

CREATE DATABASE IF NOT EXISTS cafe_adisyon
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_turkish_ci;

USE cafe_adisyon;

CREATE TABLE IF NOT EXISTS admins (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value VARCHAR(500) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS cafe_tables (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_no INT UNSIGNED NOT NULL UNIQUE,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id INT UNSIGNED NOT NULL,
    name VARCHAR(160) NOT NULL,
    description TEXT NULL,
    price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_products_category (category_id),
    INDEX idx_products_active (is_active),
    INDEX idx_products_price (category_id, price, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_id INT UNSIGNED NOT NULL,
    merged_into_order_id BIGINT UNSIGNED NULL,
    status ENUM('open','paid','cancelled','credit','merged') NOT NULL DEFAULT 'open',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_type ENUM('none','percent','fixed') NOT NULL DEFAULT 'none',
    discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    payment_method ENUM('cash','card','other') NULL DEFAULT NULL,
    credit_name VARCHAR(160) NULL,
    credit_note VARCHAR(500) NULL,
    credit_created_at TIMESTAMP NULL DEFAULT NULL,
    credit_paid_at TIMESTAMP NULL DEFAULT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES cafe_tables(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    INDEX idx_orders_table_status (table_id, status),
    INDEX idx_orders_closed (closed_at),
    INDEX idx_orders_payment (payment_method),
    INDEX idx_orders_credit (status, credit_created_at),
    INDEX idx_orders_status_closed (status, closed_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NULL,
    product_name VARCHAR(160) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    quantity INT UNSIGNED NOT NULL DEFAULT 1,
    note VARCHAR(500) NULL,
    item_status ENUM('pending','delivered') NOT NULL DEFAULT 'pending',
    delivered_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_status (order_id, item_status, id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    description VARCHAR(500) NULL,
    amount DECIMAL(10,2) NOT NULL,
    expense_date DATE NOT NULL,
    day_end_report_id BIGINT UNSIGNED NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_expense_date (expense_date),
    INDEX idx_expense_day_end (day_end_report_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(1000) NULL,
    status ENUM('active','done') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    done_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_notes_status_created (status, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS day_end_reports (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    report_date DATE NOT NULL UNIQUE,
    order_count INT UNSIGNED NOT NULL DEFAULT 0,
    gross_revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_revenue DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    expense_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    net_profit DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    cash_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    card_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    other_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_day_end_date (report_date),
    INDEX idx_day_end_deleted (deleted_at, report_date)
) ENGINE=InnoDB;

INSERT INTO admins (username, password_hash)
VALUES ('admin', '$2y$12$8WZvsUtn3nhTjF5r5qK2eel7exp2CEy3n64JtRGEKlTR/BimG5Rx6')
ON DUPLICATE KEY UPDATE username = VALUES(username);

INSERT INTO settings (setting_key, setting_value) VALUES
('table_count', '10'),
('business_name', 'Dededen Toruna'),
('business_subtitle', 'Geleneksel Lezzetler & Cafe Restoran'),
('logo_path', ''),
('menu_revision', '1'),
('live_refresh_seconds', '2'),
('day_end_pin_hash', '$2y$12$5cBxx5baWORb64HsJGKOYOYgNowVwofOI8IOR6XAL1mUOyFmv5.y.'),
('app_version', '10')
ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value);

INSERT IGNORE INTO cafe_tables (table_no) VALUES
(1),(2),(3),(4),(5),(6),(7),(8),(9),(10);

INSERT INTO categories (id, name, sort_order) VALUES
(1, 'Kahvaltılar', 10),
(2, 'Tost Çeşitleri', 20),
(3, 'Gözleme Çeşitleri', 30),
(4, 'Hamburgerler', 40),
(5, 'Et Yemekleri', 50),
(6, 'Tavuk Yemekleri', 60),
(7, 'Makarnalar', 70),
(8, 'Salatalar & Günün Menüsü', 80),
(9, 'Tatlılar', 90),
(10, 'Sıcak & Soğuk İçecekler', 100)
ON DUPLICATE KEY UPDATE name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO products (category_id, name, description, price, is_active) VALUES
-- Kahvaltılar
(1, 'Serpme Kahvaltı (2 Kişilik)', NULL, 1200.00, 1),
(1, 'Kahvaltı Tabağı', NULL, 450.00, 1),
(1, 'Kuymak', NULL, 300.00, 1),
(1, 'Peynirli Omlet', NULL, 250.00, 1),
(1, 'Sucuklu Yumurta', NULL, 250.00, 1),
(1, 'Menemen', NULL, 250.00, 1),
(1, 'Kaygana', NULL, 200.00, 1),
(1, 'Sahanda Yumurta', NULL, 200.00, 1),
(1, 'Omlet', NULL, 200.00, 1),
(1, 'Cips', NULL, 200.00, 1),
(1, 'Sigara Böreği', NULL, 200.00, 1),
-- Tost Çeşitleri
(2, 'Tost Burger', 'Kaşar, Sucuk, Cips, Turşu, Ketçap, Mayonez', 270.00, 1),
(2, 'Karışık Tost', 'Kaşar, Sucuk', 260.00, 1),
(2, 'Sucuklu Tost', 'Sucuk', 260.00, 1),
(2, 'Kaşarlı Tost', 'Kaşar Peyniri', 250.00, 1),
(2, 'Akdeniz Tost', 'Beyaz Peynir, Domates, Turşu, Ketçap, Mayonez', 250.00, 1),
-- Gözleme Çeşitleri
(3, 'Karışık Gözleme', 'Sucuk, Kaşar Peyniri', 340.00, 1),
(3, 'Peynirli Gözleme', NULL, 320.00, 1),
(3, 'Patatesli Gözleme', NULL, 320.00, 1),
-- Hamburgerler
(4, 'Cheese Burger', 'El yapımı köfte, Marul, Turşu, Domates, Cheddar, Cips', 320.00, 1),
(4, 'Hamburger', 'El yapımı köfte, Marul, Turşu, Domates, Cips', 300.00, 1),
(4, 'Chicken Burger', 'Tavuk Köfte, Marul, Domates, Turşu, Cips', 275.00, 1),
-- Et Yemekleri
(5, 'Saç Kavurma', NULL, 550.00, 1),
(5, 'Et Sote', NULL, 550.00, 1),
(5, 'Et Wrap', NULL, 550.00, 1),
(5, 'Köfte', NULL, 500.00, 1),
-- Tavuk Yemekleri
(6, 'K. Mantar Soslu Şinitzel', NULL, 420.00, 1),
(6, 'Tavuk Wrap', NULL, 420.00, 1),
(6, 'Köri Soslu Tavuk', NULL, 420.00, 1),
(6, 'Tavuk Sote', NULL, 400.00, 1),
(6, 'Mantarlı Tavuk Sote', NULL, 400.00, 1),
(6, 'Tavuk Izgara', NULL, 400.00, 1),
(6, 'Şinitzel', NULL, 400.00, 1),
(6, 'Soya Soslu Piliç', NULL, 400.00, 1),
-- Makarnalar
(7, 'Fettucine Bolognese', 'Domates Sosu, Kıyma, Maydanoz', 380.00, 1),
(7, 'Fettucine Alfredo', 'Krema, Mantar, Tavuk, Mozarella', 360.00, 1),
(7, 'Fettucine Napoletana', 'Domates Sosu, Mantar, Mısır, Maydanoz', 350.00, 1),
-- Salatalar & Günün Menüsü
(8, 'Sezar Salata', 'Marul, Tavuk, Mısır, Kıtır Ekmek, Sos', 360.00, 1),
(8, 'Ton Balıklı Salata', 'Marul, Yeşillik, Mısır, Ton Balığı', 360.00, 1),
(8, 'Akdeniz Salata', NULL, 320.00, 1),
(8, 'Mevsim Salata', NULL, 250.00, 1),
(8, 'Günün Menüsü', NULL, 300.00, 1),
(8, 'Günün Çorbası', NULL, 100.00, 1),
-- Tatlılar
(9, 'Atom Sütlaç', NULL, 290.00, 1),
(9, 'Kadayıf + Dondurma', NULL, 250.00, 1),
(9, 'Kadayıf + Sütlaç', NULL, 220.00, 1),
(9, 'Kadayıf', NULL, 200.00, 1),
(9, 'Dondurmalı Sütlaç', NULL, 170.00, 1),
(9, 'Meyveli Sütlaç', NULL, 170.00, 1),
(9, 'Ballı Sütlaç', NULL, 170.00, 1),
(9, 'Sütlaç', NULL, 120.00, 1),
(9, 'Dondurma (Top)', NULL, 50.00, 1),
-- Sıcak & Soğuk İçecekler
(10, 'Semaver Çay', NULL, 300.00, 1),
(10, 'Nescafe', NULL, 150.00, 1),
(10, 'Bitki Çayı', NULL, 150.00, 1),
(10, 'Salep', NULL, 150.00, 1),
(10, 'Sıcak Çikolata', NULL, 150.00, 1),
(10, 'Türk Kahvesi', NULL, 100.00, 1),
(10, 'Cola', NULL, 80.00, 1),
(10, 'Fanta', NULL, 80.00, 1),
(10, 'Meyve Suyu', NULL, 80.00, 1),
(10, 'Soda', NULL, 60.00, 1),
(10, 'Ayran', NULL, 60.00, 1),
(10, 'Fincan Çay', NULL, 50.00, 1),
(10, 'Çay', NULL, 30.00, 1),
(10, 'Su', NULL, 25.00, 1);

