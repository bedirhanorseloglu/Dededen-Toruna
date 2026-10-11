<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
$name = trim((string)($input['name'] ?? 'Özel Kalem'));
$price = filter_var(str_replace(',', '.', (string)($input['price'] ?? '')), FILTER_VALIDATE_FLOAT);
$note = trim((string)($input['note'] ?? ''));
if (!$tableId || $name === '' || $price === false || $price < 0) json_response(['ok'=>false,'message'=>'Özel kalem bilgileri geçersiz.'],422);
if (text_length($name) > 160 || text_length($note) > 500) json_response(['ok'=>false,'message'=>'Özel kalem adı veya notu çok uzun.'],422);
try {
    $pdo->beginTransaction();
    $stmt=$pdo->prepare('SELECT id FROM cafe_tables WHERE id=? AND is_active=1 FOR UPDATE');
    $stmt->execute([$tableId]);
    if(!$stmt->fetch()) throw new RuntimeException('Masa bulunamadı.');
    $orderId=ensure_open_order($pdo,(int)$tableId);
    $stmt=$pdo->prepare("INSERT INTO order_items(order_id,product_id,product_name,unit_price,quantity,note,item_status,delivered_at) VALUES(?,NULL,?,?,1,?,'pending',NULL)");
    $stmt->execute([$orderId,$name,round((float)$price,2),$note!==''?$note:null]);
    $pdo->commit();
    json_response(['ok'=>true,'order'=>order_payload($pdo,(int)$tableId)]);
} catch(Throwable $e){
    if($pdo->inTransaction())$pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException?$e->getMessage():'Özel kalem eklenemedi.'],422);
}
