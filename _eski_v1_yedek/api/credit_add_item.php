<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$orderId = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT);
$productId = filter_var($input['product_id'] ?? null, FILTER_VALIDATE_INT);
if (!$orderId || !$productId) json_response(['ok'=>false,'message'=>'Bilgiler geçersiz.'],422);
try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT id FROM orders WHERE id=? AND status='credit' FOR UPDATE");
    $stmt->execute([$orderId]);
    if (!$stmt->fetch()) throw new RuntimeException('Açık veresiye bulunamadı.');
    $stmt = $pdo->prepare('SELECT id,name,price FROM products WHERE id=? AND is_active=1');
    $stmt->execute([$productId]);
    $p = $stmt->fetch();
    if (!$p) throw new RuntimeException('Ürün bulunamadı.');
    $stmt = $pdo->prepare("SELECT id FROM order_items WHERE order_id=? AND product_id=? AND unit_price=? AND (note IS NULL OR note='') ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$orderId,$productId,$p['price']]);
    $existing = $stmt->fetch();
    if ($existing) {
        $stmt = $pdo->prepare('UPDATE order_items SET quantity=quantity+1 WHERE id=?');
        $stmt->execute([$existing['id']]);
    } else {
        $stmt = $pdo->prepare('INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity) VALUES(?,?,?,?,1)');
        $stmt->execute([$orderId,$productId,$p['name'],$p['price']]);
    }
    $pdo->commit();
    json_response(['ok'=>true,'order'=>order_payload_by_order_id($pdo,(int)$orderId)]);
} catch(Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Ürün eklenemedi.'],422);
}
