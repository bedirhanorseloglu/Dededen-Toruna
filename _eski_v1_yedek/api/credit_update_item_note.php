<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$orderId = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT);
$itemId = filter_var($input['item_id'] ?? null, FILTER_VALIDATE_INT);
$note = trim((string)($input['note'] ?? ''));
if (!$orderId || !$itemId || text_length($note) > 500) json_response(['ok'=>false,'message'=>'Not geçersiz.'], 422);

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT id FROM orders WHERE id=? AND status='credit' FOR UPDATE");
    $stmt->execute([$orderId]);
    if (!$stmt->fetchColumn()) throw new RuntimeException('Veresiye bulunamadı veya artık kapalı.');

    $stmt = $pdo->prepare('SELECT id FROM order_items WHERE id=? AND order_id=? FOR UPDATE');
    $stmt->execute([$itemId, $orderId]);
    if (!$stmt->fetchColumn()) throw new RuntimeException('Ürün satırı bulunamadı.');

    $stmt = $pdo->prepare('UPDATE order_items SET note=? WHERE id=? AND order_id=?');
    $stmt->execute([$note !== '' ? $note : null, $itemId, $orderId]);
    $pdo->commit();
    json_response(['ok'=>true,'order'=>order_payload_by_order_id($pdo, (int)$orderId)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Not güncellenemedi.'], 422);
}
