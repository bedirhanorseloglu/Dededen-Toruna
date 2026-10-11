<?php
declare(strict_types=1);

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function money(float $value): string
{
    return number_format($value, 2, ',', '.') . ' ₺';
}

function csrf_token(): string
{
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf(?string $token): void
{
    if (!$token || empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
        http_response_code(419);
        exit('Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar deneyin.');
    }
}

function is_admin(): bool
{
    return !empty($_SESSION['admin_id']);
}

function require_admin(): void
{
    if (!is_admin()) {
        header('Location: login.php');
        exit;
    }
}

function redirect(string $url): never
{
    header('Location: ' . $url);
    exit;
}

function json_response(array $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function require_post(): void
{
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        json_response(['ok' => false, 'message' => 'Geçersiz istek.'], 405);
    }
}



function rate_limit_state(string $key, int $maxAttempts = 5, int $windowSeconds = 60): array
{
    $now = time();
    $_SESSION['rate_limits'] ??= [];
    $row = $_SESSION['rate_limits'][$key] ?? ['attempts' => 0, 'started_at' => $now, 'blocked_until' => 0];

    if (($row['blocked_until'] ?? 0) > $now) {
        return ['allowed' => false, 'retry_after' => (int)$row['blocked_until'] - $now];
    }

    if (($row['started_at'] ?? 0) + $windowSeconds <= $now) {
        $row = ['attempts' => 0, 'started_at' => $now, 'blocked_until' => 0];
        $_SESSION['rate_limits'][$key] = $row;
    }

    return ['allowed' => true, 'retry_after' => 0];
}

function rate_limit_fail(string $key, int $maxAttempts = 5, int $windowSeconds = 60, int $blockSeconds = 60): void
{
    $now = time();
    $_SESSION['rate_limits'] ??= [];
    $row = $_SESSION['rate_limits'][$key] ?? ['attempts' => 0, 'started_at' => $now, 'blocked_until' => 0];

    if (($row['started_at'] ?? 0) + $windowSeconds <= $now) {
        $row = ['attempts' => 0, 'started_at' => $now, 'blocked_until' => 0];
    }

    $row['attempts'] = (int)($row['attempts'] ?? 0) + 1;
    if ($row['attempts'] >= $maxAttempts) {
        $row['blocked_until'] = $now + $blockSeconds;
        $row['attempts'] = 0;
        $row['started_at'] = $now;
    }
    $_SESSION['rate_limits'][$key] = $row;
}

function rate_limit_clear(string $key): void
{
    if (isset($_SESSION['rate_limits'][$key])) unset($_SESSION['rate_limits'][$key]);
}

function day_end_pin_hash(PDO $pdo): string
{
    // upgrade_v6.sql uygulanmamış eski kurulumlarda da varsayılan 0000 çalışabilsin.
    return get_setting($pdo, 'day_end_pin_hash', '$2y$12$5cBxx5baWORb64HsJGKOYOYgNowVwofOI8IOR6XAL1mUOyFmv5.y.');
}

function verify_day_end_pin(PDO $pdo, string $pin): bool
{
    if (!preg_match('/^\\d{4,12}$/', $pin)) return false;
    return password_verify($pin, day_end_pin_hash($pdo));
}

function active_expense_total(PDO $pdo): float
{
    return (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date=CURDATE() AND day_end_report_id IS NULL")->fetchColumn();
}

function save_today_day_end(PDO $pdo): array
{
    $startedHere = !$pdo->inTransaction();
    if ($startedHere) $pdo->beginTransaction();

    try {
        // Ürün ekleme/masa taşıma gibi işlemlerle gün sonunun aynı anda çakışmaması için
        // aktif masaları çok kısa süreli kilitle.
        $pdo->query("SELECT id FROM cafe_tables WHERE is_active=1 ORDER BY id FOR UPDATE")->fetchAll();

        // Gün sonunda masada kalan açık adisyonları, mevcut tutarlarıyla "Diğer" ödeme
        // olarak kapat. Böylece masalar sıfırlanır ve tutarlar gün sonu gelirine dahil olur.
        $open = $pdo->query("SELECT COUNT(DISTINCT o.id) AS cnt,
            COALESCE(SUM(oi.unit_price * oi.quantity),0) AS total
            FROM orders o
            LEFT JOIN order_items oi ON oi.order_id=o.id
            WHERE o.status='open'")->fetch();
        $closedOpenOrders = (int)($open['cnt'] ?? 0);
        $closedOpenTotal = (float)($open['total'] ?? 0);

        // Boş kalmış açık adisyonlar gelir oluşturmasın.
        $pdo->exec("UPDATE orders o
            LEFT JOIN (SELECT order_id, COUNT(*) item_rows FROM order_items GROUP BY order_id) x ON x.order_id=o.id
            SET o.status='cancelled', o.closed_at=NOW()
            WHERE o.status='open' AND COALESCE(x.item_rows,0)=0");

        $pdo->exec("UPDATE orders o
            JOIN (
                SELECT order_id, ROUND(SUM(unit_price * quantity),2) subtotal
                FROM order_items GROUP BY order_id
            ) x ON x.order_id=o.id
            SET o.status='paid',
                o.subtotal=x.subtotal,
                o.discount_type='none',
                o.discount_value=0,
                o.discount_amount=0,
                o.total=x.subtotal,
                o.payment_method='other',
                o.closed_at=NOW()
            WHERE o.status='open'");

        // Finans hesabı arşivlenmiş giderleri de içerir; böylece aynı gün ikinci kez
        // gün sonu alınırsa önceki giderler rapordan kaybolmaz.
        $finance = today_finance($pdo);
        $stmt = $pdo->prepare("INSERT INTO day_end_reports
            (report_date, order_count, gross_revenue, discount_total, net_revenue, expense_total, net_profit, cash_total, card_total, other_total)
            VALUES (CURDATE(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                order_count=VALUES(order_count),
                gross_revenue=VALUES(gross_revenue),
                discount_total=VALUES(discount_total),
                net_revenue=VALUES(net_revenue),
                expense_total=VALUES(expense_total),
                net_profit=VALUES(net_profit),
                cash_total=VALUES(cash_total),
                card_total=VALUES(card_total),
                other_total=VALUES(other_total),
                deleted_at=NULL,
                updated_at=CURRENT_TIMESTAMP");
        $stmt->execute([
            $finance['bills'], $finance['gross_revenue'], $finance['discount_total'], $finance['net_revenue'],
            $finance['expense_total'], $finance['net_profit'], $finance['cash_total'], $finance['card_total'], $finance['other_total']
        ]);

        $reportIdStmt = $pdo->query("SELECT id FROM day_end_reports WHERE report_date=CURDATE() LIMIT 1");
        $reportId = (int)$reportIdStmt->fetchColumn();
        $archivedExpenses = 0;
        if ($reportId > 0) {
            $archive = $pdo->prepare("UPDATE expenses SET day_end_report_id=? WHERE expense_date=CURDATE() AND day_end_report_id IS NULL");
            $archive->execute([$reportId]);
            $archivedExpenses = $archive->rowCount();
        }

        if ($startedHere) $pdo->commit();
        $finance['closed_open_orders'] = $closedOpenOrders;
        $finance['closed_open_total'] = $closedOpenTotal;
        $finance['archived_expenses'] = $archivedExpenses;
        $finance['active_expense_total'] = 0.0;
        return $finance;
    } catch (Throwable $e) {
        if ($startedHere && $pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function all_settings(PDO $pdo): array
{
    $rows = $pdo->query('SELECT setting_key, setting_value FROM settings')->fetchAll();
    $settings = [];
    foreach ($rows as $row) {
        $settings[$row['setting_key']] = $row['setting_value'];
    }
    return $settings;
}

function get_setting(PDO $pdo, string $key, string $default = ''): string
{
    $stmt = $pdo->prepare('SELECT setting_value FROM settings WHERE setting_key = ? LIMIT 1');
    $stmt->execute([$key]);
    $value = $stmt->fetchColumn();
    return $value === false ? $default : (string)$value;
}

function set_setting(PDO $pdo, string $key, string $value): void
{
    $stmt = $pdo->prepare('INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)');
    $stmt->execute([$key, $value]);
}

function menu_revision(PDO $pdo): int
{
    return max(1, (int)get_setting($pdo, 'menu_revision', '1'));
}

function bump_menu_revision(PDO $pdo): int
{
    $next = menu_revision($pdo) + 1;
    set_setting($pdo, 'menu_revision', (string)$next);
    return $next;
}

function live_refresh_seconds(PDO $pdo): int
{
    $seconds = (int)get_setting($pdo, 'live_refresh_seconds', '2');
    return min(15, max(1, $seconds));
}

function business_profile(PDO $pdo): array
{
    $settings = all_settings($pdo);
    return [
        'name' => trim((string)($settings['business_name'] ?? 'Dededen Toruna')) ?: 'Dededen Toruna',
        'subtitle' => trim((string)($settings['business_subtitle'] ?? 'Geleneksel Lezzetler & Cafe Restoran')),
        'logo_path' => trim((string)($settings['logo_path'] ?? '')),
    ];
}

function text_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function business_initials(string $name): string
{
    $words = preg_split('/\s+/u', trim($name)) ?: [];
    $letters = '';
    foreach (array_slice($words, 0, 2) as $word) {
        if ($word === '') continue;
        if (function_exists('mb_substr') && function_exists('mb_strtoupper')) {
            $letters .= mb_strtoupper(mb_substr($word, 0, 1, 'UTF-8'), 'UTF-8');
        } elseif (preg_match('/^./u', $word, $match)) {
            $letters .= strtoupper($match[0]);
        }
    }
    return $letters !== '' ? $letters : 'DT';
}

function lock_active_table(PDO $pdo, int $tableId): void
{
    $stmt = $pdo->prepare('SELECT id FROM cafe_tables WHERE id = ? AND is_active = 1 FOR UPDATE');
    $stmt->execute([$tableId]);
    if (!$stmt->fetchColumn()) throw new RuntimeException('Masa bulunamadı veya aktif değil.');
}

function current_open_order(PDO $pdo, int $tableId): ?array
{
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE table_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1");
    $stmt->execute([$tableId]);
    return $stmt->fetch() ?: null;
}

function get_order(PDO $pdo, int $orderId): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
    $stmt->execute([$orderId]);
    return $stmt->fetch() ?: null;
}

function ensure_open_order(PDO $pdo, int $tableId): int
{
    $order = current_open_order($pdo, $tableId);
    if ($order) return (int)$order['id'];

    $stmt = $pdo->prepare("INSERT INTO orders (table_id, status) VALUES (?, 'open')");
    $stmt->execute([$tableId]);
    return (int)$pdo->lastInsertId();
}

function order_subtotal(PDO $pdo, int $orderId): float
{
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(unit_price * quantity), 0) FROM order_items WHERE order_id = ?');
    $stmt->execute([$orderId]);
    return round((float)$stmt->fetchColumn(), 2);
}

function order_items_payload(PDO $pdo, int $orderId): array
{
    $stmt = $pdo->prepare("SELECT id, product_id, product_name, unit_price, quantity, note, item_status, delivered_at,
        (unit_price * quantity) AS line_total
        FROM order_items WHERE order_id = ? ORDER BY id ASC");
    $stmt->execute([$orderId]);
    $items = $stmt->fetchAll();
    foreach ($items as &$item) {
        $item['id'] = (int)$item['id'];
        $item['product_id'] = $item['product_id'] !== null ? (int)$item['product_id'] : null;
        $item['unit_price'] = (float)$item['unit_price'];
        $item['quantity'] = (int)$item['quantity'];
        $item['line_total'] = (float)$item['line_total'];
        $item['note'] = (string)($item['note'] ?? '');
        $item['item_status'] = (string)($item['item_status'] ?? 'pending');
        $item['delivered_at'] = $item['delivered_at'] ?? null;
    }
    unset($item);
    return $items;
}

function order_payload_by_order_id(PDO $pdo, int $orderId): array
{
    $order = get_order($pdo, $orderId);
    if (!$order) {
        return ['order_id' => null, 'items' => [], 'subtotal' => 0.0, 'total' => 0.0, 'item_count' => 0, 'status' => null];
    }

    $items = order_items_payload($pdo, $orderId);
    $subtotal = 0.0;
    $count = 0;
    foreach ($items as $item) {
        $subtotal += (float)$item['line_total'];
        $count += (int)$item['quantity'];
    }

    return [
        'order_id' => (int)$order['id'],
        'table_id' => (int)$order['table_id'],
        'status' => (string)$order['status'],
        'credit_name' => (string)($order['credit_name'] ?? ''),
        'credit_note' => (string)($order['credit_note'] ?? ''),
        'items' => $items,
        'subtotal' => round($subtotal, 2),
        'total' => round($subtotal, 2),
        'item_count' => $count,
    ];
}

function order_payload(PDO $pdo, int $tableId): array
{
    $order = current_open_order($pdo, $tableId);
    if (!$order) {
        return ['order_id' => null, 'items' => [], 'subtotal' => 0.0, 'total' => 0.0, 'item_count' => 0, 'status' => null];
    }
    return order_payload_by_order_id($pdo, (int)$order['id']);
}

function active_products(PDO $pdo): array
{
    // Menüde ürünler kategori içinde otomatik olarak pahalıdan uyguna sıralanır.
    return $pdo->query("SELECT p.id,p.name,p.description,p.price,p.category_id,c.name AS category_name,c.sort_order AS category_sort
        FROM products p JOIN categories c ON c.id=p.category_id
        WHERE p.is_active=1
        ORDER BY c.sort_order,c.name,p.price DESC,p.name ASC")->fetchAll();
}

function active_categories(PDO $pdo): array
{
    return $pdo->query('SELECT id, name, sort_order FROM categories ORDER BY sort_order, name')->fetchAll();
}

function pending_open_order_count(PDO $pdo): int
{
    return (int)$pdo->query("SELECT COUNT(DISTINCT o.id)
        FROM orders o
        JOIN order_items oi ON oi.order_id=o.id
        WHERE o.status='open' AND oi.item_status='pending'")->fetchColumn();
}

function orders_board_payload(PDO $pdo): array
{
    $rows = $pdo->query("SELECT o.id AS order_id, o.table_id, o.opened_at, t.table_no,
        oi.id AS item_id, oi.product_id, oi.product_name, oi.unit_price, oi.quantity, oi.note,
        oi.item_status, oi.delivered_at, oi.created_at AS item_created_at
        FROM orders o
        JOIN cafe_tables t ON t.id=o.table_id
        JOIN order_items oi ON oi.order_id=o.id
        WHERE o.status='open'
        ORDER BY o.opened_at ASC, t.table_no ASC, oi.id ASC")->fetchAll();

    $orders = [];
    foreach ($rows as $row) {
        $orderId = (int)$row['order_id'];
        if (!isset($orders[$orderId])) {
            $orders[$orderId] = [
                'order_id' => $orderId,
                'table_id' => (int)$row['table_id'],
                'table_no' => (int)$row['table_no'],
                'opened_at' => (string)$row['opened_at'],
                'item_count' => 0,
                'pending_count' => 0,
                'total' => 0.0,
                'all_delivered' => true,
                'items' => [],
            ];
        }
        $qty = (int)$row['quantity'];
        $status = (string)$row['item_status'];
        $orders[$orderId]['item_count'] += $qty;
        $orders[$orderId]['total'] += (float)$row['unit_price'] * $qty;
        if ($status !== 'delivered') {
            $orders[$orderId]['pending_count'] += $qty;
            $orders[$orderId]['all_delivered'] = false;
        }
        $orders[$orderId]['items'][] = [
            'id' => (int)$row['item_id'],
            'product_id' => $row['product_id'] !== null ? (int)$row['product_id'] : null,
            'name' => (string)$row['product_name'],
            'unit_price' => (float)$row['unit_price'],
            'quantity' => $qty,
            'note' => (string)($row['note'] ?? ''),
            'status' => $status,
            'delivered_at' => $row['delivered_at'] ?? null,
            'created_at' => (string)$row['item_created_at'],
        ];
    }

    $result = array_values($orders);
    foreach ($result as &$order) {
        // Aynı ürün + fiyat + not + durum satırlarını yalnızca ekranda birleştir.
        // Böylece biri verildi, diğeri bekliyor durumunda ayrı kalır; ikisi de verilince
        // tek satır olarak görünür. Veritabanındaki gerçek sipariş satırları korunur.
        $grouped = [];
        foreach ($order['items'] as $item) {
            $key = implode('|', [
                (string)($item['product_id'] ?? 'custom'),
                number_format((float)$item['unit_price'], 2, '.', ''),
                (string)$item['name'],
                (string)$item['note'],
                (string)$item['status'],
            ]);
            if (!isset($grouped[$key])) {
                $grouped[$key] = $item;
            } else {
                $grouped[$key]['quantity'] += $item['quantity'];
                // Toggle yalnızca bekleyen satırlar için anlamlıdır; birden fazla gerçek
                // satır birleştiğinde ilk satırın id'sini kullanmak yerine çoklu id tut.
                if (!isset($grouped[$key]['ids'])) $grouped[$key]['ids'] = [$grouped[$key]['id']];
                $grouped[$key]['ids'][] = $item['id'];
            }
        }
        $order['items'] = array_values($grouped);
        $order['total'] = round((float)$order['total'], 2);
        $order['age_text'] = relative_time_tr($order['opened_at']);
    }
    unset($order);
    return $result;
}

function orders_board_signature(PDO $pdo): string
{
    $row = $pdo->query("SELECT
        COUNT(*) AS line_count,
        COALESCE(SUM(CRC32(CONCAT_WS('|',o.id,o.table_id,oi.id,oi.order_id,oi.quantity,oi.item_status,COALESCE(oi.note,'')))),0) AS item_hash,
        COALESCE(MAX(UNIX_TIMESTAMP(oi.delivered_at)),0) AS delivered_max,
        COALESCE(MAX(oi.id),0) AS max_item_id
        FROM orders o
        JOIN order_items oi ON oi.order_id=o.id
        WHERE o.status='open'")->fetch();
    return implode(':', [(int)$row['line_count'], (string)$row['item_hash'], (int)$row['delivered_max'], (int)$row['max_item_id']]);
}

function relative_time_tr(string $dateTime): string
{
    $ts = strtotime($dateTime);
    if (!$ts) return '';
    $diff = max(0, time() - $ts);
    if ($diff < 60) return 'az önce';
    if ($diff < 3600) return floor($diff / 60) . ' dk önce';
    if ($diff < 86400) return floor($diff / 3600) . ' saat önce';
    $days = floor($diff / 86400);
    if ($days < 30) return $days . ' gün önce';
    if ($days < 365) return floor($days / 30) . ' ay önce';
    return floor($days / 365) . ' yıl önce';
}

function credit_orders(PDO $pdo): array
{
    return $pdo->query("SELECT o.*, t.table_no,
        COALESCE(x.current_total,0) AS current_total,
        COALESCE(x.item_count,0) AS item_count
        FROM orders o
        JOIN cafe_tables t ON t.id=o.table_id
        LEFT JOIN (
            SELECT order_id, SUM(unit_price * quantity) AS current_total, SUM(quantity) AS item_count
            FROM order_items GROUP BY order_id
        ) x ON x.order_id=o.id
        WHERE o.status='credit'
        ORDER BY COALESCE(o.credit_created_at,o.opened_at) ASC")->fetchAll();
}

function today_finance(PDO $pdo): array
{
    $sales = $pdo->query("SELECT
        COUNT(*) AS bills,
        COALESCE(SUM(subtotal),0) AS gross_revenue,
        COALESCE(SUM(discount_amount),0) AS discount_total,
        COALESCE(SUM(total),0) AS net_revenue,
        COALESCE(SUM(CASE WHEN payment_method='cash' THEN total ELSE 0 END),0) AS cash_total,
        COALESCE(SUM(CASE WHEN payment_method='card' THEN total ELSE 0 END),0) AS card_total,
        COALESCE(SUM(CASE WHEN payment_method='other' OR payment_method IS NULL THEN total ELSE 0 END),0) AS other_total
        FROM orders
        WHERE status='paid' AND DATE(closed_at)=CURDATE()")->fetch();

    $expenseTotal = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date=CURDATE()")->fetchColumn();
    $cancelled = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status='cancelled' AND DATE(closed_at)=CURDATE()")->fetchColumn();

    $sales['bills'] = (int)$sales['bills'];
    $sales['gross_revenue'] = (float)$sales['gross_revenue'];
    $sales['discount_total'] = (float)$sales['discount_total'];
    $sales['net_revenue'] = (float)$sales['net_revenue'];
    $sales['cash_total'] = (float)$sales['cash_total'];
    $sales['card_total'] = (float)$sales['card_total'];
    $sales['other_total'] = (float)$sales['other_total'];
    $sales['expense_total'] = $expenseTotal;
    $sales['net_profit'] = $sales['net_revenue'] - $expenseTotal;
    $sales['cancelled'] = $cancelled;
    return $sales;
}
