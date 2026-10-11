<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';require __DIR__ . '/../helpers.php';
$rows=credit_orders($pdo);$out=[];foreach($rows as $r){$out[]=['id'=>(int)$r['id'],'name'=>(string)($r['credit_name']?:'İsimsiz Veresiye'),'total'=>(float)$r['current_total']];}json_response(['ok'=>true,'credits'=>$out]);
