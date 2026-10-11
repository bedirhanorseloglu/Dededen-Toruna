<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$orderId = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT);
$name = trim((string)($input['name'] ?? ''));
$price = filter_var(str_replace(',', '.', (string)($input['price'] ?? '')), FILTER_VALIDATE_FLOAT);
$note = trim((string)($input['note'] ?? ''));
if (!$orderId || $name === '' || $price === false || $price < 0 || text_length($name) > 160 || text_length($note) > 500) {
    json_response(['ok'=>false,'message'=>'Özel kalem bilgileri geçersiz.'], 422);
}

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT id FROM orders WHERE id=? AND status='credit' FOR UPDATE");
    $stmt->execute([$orderId]);
    if (!$stmt->fetchColumn()) throw new RuntimeException('Veresiye bulunamadı veya artık kapalı.');

    $stmt = $pdo->prepare("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,note) VALUES(?,NULL,?,?,1,?)");
    $stmt->execute([$orderId, $name, round((float)$price, 2), $note !== '' ? $note : null]);
    $pdo->commit();
    json_response(['ok'=>true,'order'=>order_payload_by_order_id($pdo, (int)$orderId)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Özel kalem eklenemedi.'], 422);
}
