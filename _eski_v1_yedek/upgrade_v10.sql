-- Cafe Adisyon v10 güvenli yükseltme
-- Mevcut sipariş/satış/gider/veresiye kayıtlarını SİLMEZ.
-- v9 (ve daha eski) kurulumun üzerine uygulanabilir.
USE cafe_adisyon;

-- Açık adisyonlarda sade "Verildi" takibi.
ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS item_status ENUM('pending','delivered') NOT NULL DEFAULT 'pending' AFTER note,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP NULL DEFAULT NULL AFTER item_status;

-- Gün sonu kayıtlarını satış/gider hareketlerini silmeden arşivden kaldırabilmek için.
ALTER TABLE day_end_reports
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at;

INSERT INTO settings (setting_key, setting_value) VALUES ('app_version','10')
ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value);
