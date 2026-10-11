<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$itemId = filter_var($input['item_id'] ?? null, FILTER_VALIDATE_INT);
$status = (string)($input['status'] ?? '');
if (!$itemId || !in_array($status, ['pending','delivered'], true)) {
    json_response(['ok'=>false,'message'=>'Ürün veya teslim durumu geçersiz.'], 422);
}

try {
    // Diğer masa işlemleriyle aynı kilit sırasını kullan: önce masa, sonra adisyon kalemi.
    $lookup = $pdo->prepare("SELECT o.table_id
        FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE oi.id=? AND o.status='open' LIMIT 1");
    $lookup->execute([$itemId]);
    $tableId = (int)$lookup->fetchColumn();
    if (!$tableId) throw new RuntimeException('Açık adisyonda bu ürün bulunamadı.');

    $pdo->beginTransaction();
    lock_active_table($pdo, $tableId);
    $stmt = $pdo->prepare("SELECT oi.id, oi.order_id
        FROM order_items oi JOIN orders o ON o.id=oi.order_id
        WHERE oi.id=? AND o.table_id=? AND o.status='open'
        FOR UPDATE");
    $stmt->execute([$itemId, $tableId]);
    $item = $stmt->fetch();
    if (!$item) throw new RuntimeException('Ürün başka bir işlem tarafından değiştirildi.');

    $update = $pdo->prepare("UPDATE order_items
        SET item_status=?, delivered_at=" . ($status === 'delivered' ? 'NOW()' : 'NULL') . "
        WHERE id=? AND order_id=?");
    $update->execute([$status, $itemId, (int)$item['order_id']]);
    $pdo->commit();

    json_response(['ok'=>true,'item_id'=>(int)$itemId,'status'=>$status]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Teslim durumu güncellenemedi.'], 422);
}
