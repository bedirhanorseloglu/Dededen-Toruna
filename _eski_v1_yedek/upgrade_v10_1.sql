-- Cafe Adisyon v10.1 güvenli onarım
-- Mevcut hiçbir siparişi/satışı/gideri/veresiyeyi silmez.
USE cafe_adisyon;

-- item_status
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='order_items' AND COLUMN_NAME='item_status') = 0,
    "ALTER TABLE order_items ADD COLUMN item_status ENUM('pending','delivered') NOT NULL DEFAULT 'pending' AFTER note",
    "SELECT 'item_status zaten mevcut'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- delivered_at
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='order_items' AND COLUMN_NAME='delivered_at') = 0,
    "ALTER TABLE order_items ADD COLUMN delivered_at TIMESTAMP NULL DEFAULT NULL AFTER item_status",
    "SELECT 'delivered_at zaten mevcut'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- performans indexi
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='order_items' AND INDEX_NAME='idx_order_items_status') = 0,
    "ALTER TABLE order_items ADD INDEX idx_order_items_status (order_id, item_status, id)",
    "SELECT 'idx_order_items_status zaten mevcut'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- silinen gün sonu raporları için alan
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='day_end_reports' AND COLUMN_NAME='deleted_at') = 0,
    "ALTER TABLE day_end_reports ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at",
    "SELECT 'deleted_at zaten mevcut'"
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

INSERT INTO settings (setting_key, setting_value) VALUES ('app_version','10.1')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
