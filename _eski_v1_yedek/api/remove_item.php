<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
$itemId = filter_var($input['item_id'] ?? null, FILTER_VALIDATE_INT);
$quantity = filter_var($input['quantity'] ?? 1, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>25]]);
if (!$tableId || !$itemId || !$quantity) json_response(['ok'=>false,'message'=>'Geçersiz istek.'], 422);

try {
    $pdo->beginTransaction();
    lock_active_table($pdo, (int)$tableId);
    $order = current_open_order($pdo, (int)$tableId);
    if (!$order) throw new RuntimeException('Açık adisyon bulunamadı.');

    $stmt = $pdo->prepare('SELECT id, quantity FROM order_items WHERE id = ? AND order_id = ? FOR UPDATE');
    $stmt->execute([$itemId, $order['id']]);
    $item = $stmt->fetch();
    if (!$item) throw new RuntimeException('Ürün satırı bulunamadı.');

    if ((int)$item['quantity'] > (int)$quantity) {
        $stmt = $pdo->prepare('UPDATE order_items SET quantity = quantity - ? WHERE id = ?');
        $stmt->execute([(int)$quantity, $itemId]);
    } else {
        $stmt = $pdo->prepare('DELETE FROM order_items WHERE id = ?');
        $stmt->execute([$itemId]);
    }

    $countStmt=$pdo->prepare('SELECT COUNT(*) FROM order_items WHERE order_id=?');
    $countStmt->execute([$order['id']]);
    if((int)$countStmt->fetchColumn()===0){
        $del=$pdo->prepare("DELETE FROM orders WHERE id=? AND status='open'");
        $del->execute([$order['id']]);
    }

    $pdo->commit();
    json_response(['ok'=>true, 'order'=>order_payload($pdo, (int)$tableId)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Ürün azaltılamadı.'], 422);
}
