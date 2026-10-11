<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
$productId = filter_var($input['product_id'] ?? null, FILTER_VALIDATE_INT);
$quantity = filter_var($input['quantity'] ?? 1, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>25]]);
if (!$tableId || !$productId || !$quantity) json_response(['ok'=>false,'message'=>'Masa, ürün veya adet bilgisi geçersiz.'], 422);

try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare('SELECT id FROM cafe_tables WHERE id = ? AND is_active = 1 FOR UPDATE');
    $stmt->execute([$tableId]);
    if (!$stmt->fetch()) throw new RuntimeException('Masa bulunamadı.');

    $stmt = $pdo->prepare('SELECT id, name, price FROM products WHERE id = ? AND is_active = 1');
    $stmt->execute([$productId]);
    $product = $stmt->fetch();
    if (!$product) throw new RuntimeException('Ürün bulunamadı veya pasif.');

    $orderId = ensure_open_order($pdo, (int)$tableId);

    // Aynı ürün + aynı fiyat + notsuz ise tek satırda adedi artır.
    // Fiyat sonradan değişmişse eski adisyon satırı kendi fiyatını korur ve yeni fiyat ayrı satır olur.
    $stmt = $pdo->prepare("SELECT id, quantity FROM order_items
        WHERE order_id=? AND product_id=? AND unit_price=? AND (note IS NULL OR note='') AND item_status='pending'
        ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$orderId, $productId, $product['price']]);
    $existing = $stmt->fetch();
    if ($existing) {
        $upd = $pdo->prepare('UPDATE order_items SET quantity = quantity + ? WHERE id = ?');
        $upd->execute([(int)$quantity, $existing['id']]);
    } else {
        $ins = $pdo->prepare("INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, note, item_status, delivered_at) VALUES (?, ?, ?, ?, ?, NULL, 'pending', NULL)");
        $ins->execute([$orderId, $productId, $product['name'], $product['price'], (int)$quantity]);
    }

    $pdo->commit();
    json_response(['ok'=>true, 'order'=>order_payload($pdo, (int)$tableId)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Ürün eklenemedi.'], 422);
}
