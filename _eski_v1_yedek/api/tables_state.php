<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

$rows = $pdo->query("SELECT t.id,t.table_no,o.id order_id,
    COALESCE(SUM(oi.unit_price*oi.quantity),0) total,
    COALESCE(SUM(oi.quantity),0) item_count,
    COALESCE(SUM(CASE WHEN oi.item_status='pending' THEN oi.quantity ELSE 0 END),0) pending_count
    FROM cafe_tables t
    LEFT JOIN orders o ON o.table_id=t.id AND o.status='open'
    LEFT JOIN order_items oi ON oi.order_id=o.id
    WHERE t.is_active=1
    GROUP BY t.id,t.table_no,o.id
    ORDER BY t.table_no")->fetchAll();
$pendingOrderItems = 0;
foreach ($rows as &$row) {
    $row['id'] = (int)$row['id'];
    $row['table_no'] = (int)$row['table_no'];
    $row['order_id'] = $row['order_id'] !== null ? (int)$row['order_id'] : null;
    $row['total'] = (float)$row['total'];
    $row['item_count'] = (int)$row['item_count'];
    $row['pending_count'] = (int)$row['pending_count'];
    $pendingOrderItems += $row['pending_count'];
}
unset($row);
json_response([
    'ok'=>true,
    'tables'=>$rows,
    'menu_revision'=>menu_revision($pdo),
    'credit_count'=>(int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status='credit'")->fetchColumn(),
    'active_notes'=>(int)$pdo->query("SELECT COUNT(*) FROM notes WHERE status='active'")->fetchColumn(),
    'pending_order_items'=>$pendingOrderItems,
]);
