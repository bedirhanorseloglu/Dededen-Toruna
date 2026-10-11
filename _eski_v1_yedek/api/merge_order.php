<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$source = filter_var($input['source_table_id'] ?? null, FILTER_VALIDATE_INT);
$target = filter_var($input['target_table_id'] ?? null, FILTER_VALIDATE_INT);
if (!$source || !$target || $source === $target) json_response(['ok'=>false,'message'=>'Hedef masa geçersiz.'],422);

try {
    $pdo->beginTransaction();

    $ids = [(int)$source, (int)$target];
    sort($ids, SORT_NUMERIC);
    $stmt = $pdo->prepare('SELECT id,table_no,is_active FROM cafe_tables WHERE id IN (?,?) ORDER BY id FOR UPDATE');
    $stmt->execute($ids);
    $lockedTables = [];
    foreach ($stmt->fetchAll() as $row) $lockedTables[(int)$row['id']] = $row;
    if (!isset($lockedTables[(int)$source]) || !(int)$lockedTables[(int)$source]['is_active']) throw new RuntimeException('Kaynak masa bulunamadı.');
    if (!isset($lockedTables[(int)$target]) || !(int)$lockedTables[(int)$target]['is_active']) throw new RuntimeException('Hedef masa bulunamadı.');

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE table_id=? AND status='open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$source]);
    $src = $stmt->fetch();
    if (!$src) throw new RuntimeException('Birleştirilecek açık adisyon yok.');

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE table_id=? AND status='open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$target]);
    $dst = $stmt->fetch();

    if (!$dst) {
        $stmt = $pdo->prepare("UPDATE orders SET table_id=? WHERE id=? AND status='open'");
        $stmt->execute([$target,$src['id']]);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('Adisyon başka bir işlem tarafından değiştirildi. Tekrar deneyin.');
        $targetOrderId = (int)$src['id'];
    } else {
        $targetOrderId = (int)$dst['id'];
        $stmt = $pdo->prepare('UPDATE order_items SET order_id=? WHERE order_id=?');
        $stmt->execute([$targetOrderId,$src['id']]);
        $stmt = $pdo->prepare("UPDATE orders SET status='merged', merged_into_order_id=?, closed_at=NOW() WHERE id=? AND status='open'");
        $stmt->execute([$targetOrderId,$src['id']]);
        if ($stmt->rowCount() !== 1) throw new RuntimeException('Adisyon başka bir işlem tarafından değiştirildi. Tekrar deneyin.');
    }

    $pdo->commit();
    json_response([
        'ok'=>true,
        'target_table_id'=>(int)$target,
        'target_table_no'=>(int)$lockedTables[(int)$target]['table_no'],
        'order'=>order_payload($pdo,(int)$target),
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Masalar birleştirilemedi.'],422);
}
