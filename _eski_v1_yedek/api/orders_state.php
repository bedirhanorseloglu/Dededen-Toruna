<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

$clientSignature = trim((string)($_GET['signature'] ?? ''));
$signature = orders_board_signature($pdo);
$response = [
    'ok' => true,
    'signature' => $signature,
    'changed' => $clientSignature === '' || !hash_equals($signature, $clientSignature),
];
if ($response['changed']) {
    $orders = orders_board_payload($pdo);
    $response['orders'] = $orders;
    $response['open_count'] = count($orders);
    $response['pending_count'] = array_sum(array_map(fn($o) => (int)$o['pending_count'], $orders));
}
json_response($response);
