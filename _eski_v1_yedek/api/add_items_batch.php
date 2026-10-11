<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
$rawItems = $input['items'] ?? [];
if (!$tableId || !is_array($rawItems) || !$rawItems) {
    json_response(['ok'=>false,'message'=>'Masa veya ürün bilgisi geçersiz.'], 422);
}

$items = [];
$totalQty = 0;
foreach (array_slice($rawItems, 0, 40) as $row) {
    if (!is_array($row)) continue;
    $productId = filter_var($row['product_id'] ?? null, FILTER_VALIDATE_INT);
    $qty = filter_var($row['quantity'] ?? 1, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>25]]);
    if (!$productId || !$qty) continue;
    $items[(int)$productId] = min(25, ($items[(int)$productId] ?? 0) + (int)$qty);
    $totalQty += (int)$qty;
}
if (!$items || $totalQty > 100) {
    json_response(['ok'=>false,'message'=>'Ürün adedi geçersiz.'], 422);
}

try {
    $pdo->beginTransaction();
    lock_active_table($pdo, (int)$tableId);

    $ids = array_keys($items);
    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $pdo->prepare("SELECT id,name,price FROM products WHERE is_active=1 AND id IN ($placeholders)");
    $stmt->execute($ids);
    $products = [];
    foreach ($stmt->fetchAll() as $product) $products[(int)$product['id']] = $product;
    if (count($products) !== count($ids)) throw new RuntimeException('Ürünlerden biri bulunamadı veya pasif.');

    $orderId = ensure_open_order($pdo, (int)$tableId);

    $existingStmt = $pdo->prepare("SELECT id,product_id,unit_price,quantity FROM order_items
        WHERE order_id=? AND product_id IN ($placeholders) AND (note IS NULL OR note='') AND item_status='pending'
        ORDER BY id DESC FOR UPDATE");
    $existingStmt->execute(array_merge([$orderId], $ids));
    $existing = [];
    foreach ($existingStmt->fetchAll() as $row) {
        $pid = (int)$row['product_id'];
        $priceKey = number_format((float)$row['unit_price'], 2, '.', '');
        $key = $pid . '|' . $priceKey;
        if (!isset($existing[$key])) $existing[$key] = (int)$row['id'];
    }

    $update = $pdo->prepare('UPDATE order_items SET quantity=quantity+? WHERE id=?');
    $insert = $pdo->prepare("INSERT INTO order_items
        (order_id,product_id,product_name,unit_price,quantity,note,item_status,delivered_at)
        VALUES (?,?,?,?,?,NULL,'pending',NULL)");

    foreach ($items as $productId => $qty) {
        $product = $products[$productId];
        $priceKey = number_format((float)$product['price'], 2, '.', '');
        $key = $productId . '|' . $priceKey;
        if (isset($existing[$key])) {
            $update->execute([(int)$qty, $existing[$key]]);
        } else {
            $insert->execute([$orderId, $productId, $product['name'], $product['price'], (int)$qty]);
        }
    }

    $pdo->commit();
    json_response(['ok'=>true,'order'=>order_payload($pdo, (int)$tableId)]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Ürünler eklenemedi.'], 422);
}
