<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_post();verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN']??null);
$input=json_decode(file_get_contents('php://input'),true)?:[];
$tableId=filter_var($input['table_id']??null,FILTER_VALIDATE_INT);
$targetCreditId=filter_var($input['target_credit_id']??null,FILTER_VALIDATE_INT) ?: null;
$name=trim((string)($input['credit_name']??''));
$note=trim((string)($input['credit_note']??''));
if(!$tableId) json_response(['ok'=>false,'message'=>'Masa geçersiz.'],422);
if($targetCreditId===null && $name==='') json_response(['ok'=>false,'message'=>'Veresiye için kişi/ad yazın.'],422);
if(text_length($name)>160||text_length($note)>500)json_response(['ok'=>false,'message'=>'Veresiye bilgisi çok uzun.'],422);
try{
 $pdo->beginTransaction();
 lock_active_table($pdo,(int)$tableId);
 $stmt=$pdo->prepare("SELECT * FROM orders WHERE table_id=? AND status='open' ORDER BY id DESC LIMIT 1 FOR UPDATE");$stmt->execute([$tableId]);$src=$stmt->fetch();if(!$src)throw new RuntimeException('Açık adisyon bulunamadı.');
 if(order_subtotal($pdo,(int)$src['id'])<=0)throw new RuntimeException('Boş adisyon veresiye yazılamaz.');
 if($targetCreditId){
   $stmt=$pdo->prepare("SELECT * FROM orders WHERE id=? AND status='credit' FOR UPDATE");$stmt->execute([$targetCreditId]);$target=$stmt->fetch();if(!$target)throw new RuntimeException('Seçilen veresiye kaydı bulunamadı.');
   $stmt=$pdo->prepare('UPDATE order_items SET order_id=? WHERE order_id=?');$stmt->execute([$targetCreditId,$src['id']]);
   if($note!==''){$stmt=$pdo->prepare("UPDATE orders SET credit_note=CONCAT_WS(' • ',NULLIF(credit_note,''),?) WHERE id=?");$stmt->execute([$note,$targetCreditId]);}
   $stmt=$pdo->prepare("UPDATE orders SET status='merged',merged_into_order_id=?,closed_at=NOW() WHERE id=?");$stmt->execute([$targetCreditId,$src['id']]);
   $creditId=(int)$targetCreditId;
 }else{
   $stmt=$pdo->prepare("UPDATE orders SET status='credit',credit_name=?,credit_note=?,credit_created_at=NOW(),closed_at=NULL,payment_method=NULL WHERE id=?");
   $stmt->execute([$name,$note!==''?$note:null,$src['id']]);$creditId=(int)$src['id'];
 }
 $pdo->commit();
 json_response(['ok'=>true,'credit_id'=>$creditId]);
}catch(Throwable $e){if($pdo->inTransaction())$pdo->rollBack();json_response(['ok'=>false,'message'=>$e instanceof RuntimeException?$e->getMessage():'Veresiye kaydedilemedi.'],422);}
