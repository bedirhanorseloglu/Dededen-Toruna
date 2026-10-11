<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    // Oturum sabitleme ve istemci taraflı çerez erişimine karşı temel sertleştirme.
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('cafe_adisyon_session');
    $isHttps = !empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off';
    session_set_cookie_params([
        'httponly' => true,
        'secure' => $isHttps,
        'samesite' => 'Lax',
        'path' => '/',
    ]);
    session_start();
}

// V9 uygulama kabuğu kendi sayfalarını aynı origin içinde iframe ile açar; yabancı siteler yine engellenir.
header('X-Frame-Options: SAMEORIGIN');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header('Permissions-Policy: geolocation=(), microphone=(), camera=()');

date_default_timezone_set('Europe/Istanbul');

const DB_HOST = '127.0.0.1';
const DB_NAME = 'cafe_adisyon';
const DB_USER = 'root';
const DB_PASS = '';

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
    $pdo->exec("SET time_zone = '+03:00'");

    /*
     * v10.1 şema hotfix'i:
     * Site dosyaları güncellenip upgrade SQL unutulduğunda sayfanın Fatal Error
     * vermemesi için yalnızca eksik v10 kolonlarını otomatik tamamlar.
     * Kontrol aynı PHP oturumu boyunca bir kez yapılır; normal kullanımda ek yük oluşturmaz.
     */
    if (empty($_SESSION['cafe_schema_v10_1_ok'])) {
        $columnExists = static function (PDO $db, string $table, string $column): bool {
            $q = $db->prepare("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?");
            $q->execute([$table, $column]);
            return (int)$q->fetchColumn() > 0;
        };
        $indexExists = static function (PDO $db, string $table, string $index): bool {
            $q = $db->prepare("SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?");
            $q->execute([$table, $index]);
            return (int)$q->fetchColumn() > 0;
        };

        try {
            if (!$columnExists($pdo, 'order_items', 'item_status')) {
                $pdo->exec("ALTER TABLE order_items ADD COLUMN item_status ENUM('pending','delivered') NOT NULL DEFAULT 'pending' AFTER note");
            }
            if (!$columnExists($pdo, 'order_items', 'delivered_at')) {
                $pdo->exec("ALTER TABLE order_items ADD COLUMN delivered_at TIMESTAMP NULL DEFAULT NULL AFTER item_status");
            }
            if (!$indexExists($pdo, 'order_items', 'idx_order_items_status')) {
                $pdo->exec("ALTER TABLE order_items ADD INDEX idx_order_items_status (order_id, item_status, id)");
            }
            if (!$columnExists($pdo, 'day_end_reports', 'deleted_at')) {
                $pdo->exec("ALTER TABLE day_end_reports ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER updated_at");
            }

            $stmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value) VALUES ('app_version','10.1') ON DUPLICATE KEY UPDATE setting_value=VALUES(setting_value)");
            $stmt->execute();
            $_SESSION['cafe_schema_v10_1_ok'] = true;
        } catch (PDOException $schemaError) {
            error_log('Cafe Adisyon v10.1 schema hotfix: ' . $schemaError->getMessage());
            http_response_code(500);
            exit('Veritabanı v10 güncellemesi tamamlanamadı. repair_v10_1.sql dosyasını phpMyAdmin üzerinden bir kez çalıştırın. Mevcut siparişleriniz silinmez.');
        }
    }
} catch (PDOException $e) {
    http_response_code(500);
    exit('Veritabanı bağlantısı kurulamadı. Önce database.sql dosyasını phpMyAdmin üzerinden içe aktarın ve config.php ayarlarını kontrol edin.');
}
