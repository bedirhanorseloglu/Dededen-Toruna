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

    // İki masa satırını her zaman aynı sırada kilitleyerek eşzamanlı işlemlerde deadlock riskini azalt.
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
    if (!$src) throw new RuntimeException('Taşınacak açık adisyon yok.');

    $stmt = $pdo->prepare("SELECT id FROM orders WHERE table_id=? AND status='open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$target]);
    if ($stmt->fetch()) throw new RuntimeException('Hedef masa dolu. Dolu masalar için Birleştir kullanın.');

    $stmt = $pdo->prepare('UPDATE orders SET table_id=? WHERE id=? AND status=\'open\'');
    $stmt->execute([$target,$src['id']]);
    if ($stmt->rowCount() !== 1) throw new RuntimeException('Adisyon başka bir işlem tarafından değiştirildi. Tekrar deneyin.');

    $pdo->commit();
    json_response(['ok'=>true,'target_table_id'=>(int)$target,'target_table_no'=>(int)$lockedTables[(int)$target]['table_no']]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Masa taşınamadı.'],422);
}
