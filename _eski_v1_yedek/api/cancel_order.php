<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
if (!$tableId) json_response(['ok'=>false,'message'=>'Geçersiz masa.'], 422);

try {
    $pdo->beginTransaction();
    lock_active_table($pdo, (int)$tableId);
    $stmt = $pdo->prepare("SELECT id FROM orders WHERE table_id=? AND status='open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$tableId]);
    $orderId = $stmt->fetchColumn();
    if (!$orderId) throw new RuntimeException('İptal edilecek açık adisyon bulunamadı.');

    $stmt = $pdo->prepare("UPDATE orders SET status='cancelled', subtotal=0, discount_type='none', discount_value=0, discount_amount=0, total=0, payment_method=NULL, closed_at=NOW() WHERE id=?");
    $stmt->execute([$orderId]);
    $pdo->commit();

    json_response(['ok'=>true, 'order_id'=>(int)$orderId]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Adisyon iptal edilemedi.'], 422);
}
