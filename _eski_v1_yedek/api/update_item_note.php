<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
$itemId = filter_var($input['item_id'] ?? null, FILTER_VALIDATE_INT);
$note = trim((string)($input['note'] ?? ''));
if (!$tableId || !$itemId || text_length($note) > 500) json_response(['ok'=>false,'message'=>'Not bilgisi geçersiz.'], 422);

try {
    $pdo->beginTransaction();
    lock_active_table($pdo, (int)$tableId);
    $order = current_open_order($pdo, (int)$tableId);
    if (!$order) throw new RuntimeException('Açık adisyon bulunamadı.');

    $check = $pdo->prepare('SELECT id FROM order_items WHERE id=? AND order_id=? FOR UPDATE');
    $check->execute([$itemId, $order['id']]);
    if (!$check->fetchColumn()) throw new RuntimeException('Ürün satırı bulunamadı.');

    $stmt = $pdo->prepare('UPDATE order_items SET note=? WHERE id=? AND order_id=?');
    $stmt->execute([$note !== '' ? $note : null, $itemId, $order['id']]);
    $pdo->commit();
    json_response(['ok'=>true,'order'=>order_payload($pdo, (int)$tableId)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Not kaydedilemedi.'], 422);
}
