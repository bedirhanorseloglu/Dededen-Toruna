<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$orderId = filter_var($input['order_id'] ?? null, FILTER_VALIDATE_INT);
$name = trim((string)($input['credit_name'] ?? ''));
$note = trim((string)($input['credit_note'] ?? ''));
if (!$orderId || $name === '' || text_length($name) > 160 || text_length($note) > 500) json_response(['ok'=>false,'message'=>'Bilgiler geçersiz.'], 422);

try {
    $pdo->beginTransaction();
    $stmt = $pdo->prepare("SELECT id FROM orders WHERE id=? AND status='credit' FOR UPDATE");
    $stmt->execute([$orderId]);
    if (!$stmt->fetchColumn()) throw new RuntimeException('Veresiye bulunamadı veya artık kapalı.');

    $stmt = $pdo->prepare("UPDATE orders SET credit_name=?,credit_note=? WHERE id=? AND status='credit'");
    $stmt->execute([$name, $note !== '' ? $note : null, $orderId]);
    $pdo->commit();
    json_response(['ok'=>true]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Veresiye bilgileri güncellenemedi.'], 422);
}
