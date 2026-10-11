<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

$tableId = filter_input(INPUT_GET, 'table_id', FILTER_VALIDATE_INT);
$clientRevision = filter_input(INPUT_GET, 'revision', FILTER_VALIDATE_INT) ?: 0;
$clientSignature = trim((string)($_GET['signature'] ?? ''));
if (!$tableId) json_response(['ok' => false, 'message' => 'Masa geçersiz.'], 422);

$revision = menu_revision($pdo);
if ($clientRevision > 0 && $revision !== $clientRevision) {
    json_response([
        'ok' => true,
        'menu_revision' => $revision,
        'menu_changed' => true,
    ]);
}

// Düşük güçlü telefon/tabletlerde gereksiz veri ve DOM yenilemeyi azaltmak için
// önce küçük bir adisyon imzası hesaplanır; değişiklik yoksa tüm satırlar gönderilmez.
$stmt = $pdo->prepare("SELECT o.id AS order_id,
    COALESCE(SUM(CRC32(CONCAT_WS('|',
        oi.id,
        COALESCE(oi.product_id,0),
        oi.product_name,
        oi.unit_price,
        oi.quantity,
        COALESCE(oi.note,'')
    ))),0) AS item_hash,
    COALESCE(SUM(oi.quantity),0) AS item_count,
    COUNT(oi.id) AS line_count
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id=o.id
    WHERE o.table_id=? AND o.status='open'
    GROUP BY o.id
    ORDER BY o.id DESC LIMIT 1");
$stmt->execute([(int)$tableId]);
$row = $stmt->fetch();
$signature = $row
    ? implode(':', [(int)$row['order_id'], (string)$row['item_hash'], (int)$row['item_count'], (int)$row['line_count']])
    : 'empty';

$response = [
    'ok' => true,
    'menu_revision' => $revision,
    'menu_changed' => false,
    'order_signature' => $signature,
];

if ($clientSignature === '' || !hash_equals($signature, $clientSignature)) {
    $response['order'] = order_payload($pdo, (int)$tableId);
}

json_response($response);
