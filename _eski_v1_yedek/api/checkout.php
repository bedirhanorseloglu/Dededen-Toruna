<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$tableId = filter_var($input['table_id'] ?? null, FILTER_VALIDATE_INT);
$discountType = (string)($input['discount_type'] ?? 'none');
$discountValueRaw = str_replace(',', '.', (string)($input['discount_value'] ?? '0'));
$discountValue = filter_var($discountValueRaw, FILTER_VALIDATE_FLOAT);
$paymentMethod = (string)($input['payment_method'] ?? 'cash');

if (!$tableId) json_response(['ok'=>false,'message'=>'Geçersiz masa.'], 422);
if (!in_array($discountType, ['none', 'percent', 'fixed'], true)) json_response(['ok'=>false,'message'=>'Geçersiz indirim tipi.'], 422);
if (!in_array($paymentMethod, ['cash', 'card', 'other'], true)) json_response(['ok'=>false,'message'=>'Geçersiz ödeme yöntemi.'], 422);
if ($discountValue === false || $discountValue < 0) json_response(['ok'=>false,'message'=>'İndirim değeri geçersiz.'], 422);

try {
    $pdo->beginTransaction();
    lock_active_table($pdo, (int)$tableId);
    $stmt = $pdo->prepare("SELECT * FROM orders WHERE table_id = ? AND status = 'open' ORDER BY id DESC LIMIT 1 FOR UPDATE");
    $stmt->execute([$tableId]);
    $order = $stmt->fetch();
    if (!$order) throw new RuntimeException('Açık adisyon bulunamadı.');

    $stmt = $pdo->prepare('SELECT COALESCE(SUM(unit_price * quantity), 0) FROM order_items WHERE order_id = ?');
    $stmt->execute([$order['id']]);
    $subtotal = round((float)$stmt->fetchColumn(), 2);
    if ($subtotal <= 0) throw new RuntimeException('Boş adisyon kapatılamaz.');

    if ($discountType === 'none') {
        $discountValue = 0.0;
        $discountAmount = 0.0;
    } elseif ($discountType === 'percent') {
        if ($discountValue > 100) throw new RuntimeException('Yüzde indirim 100’den büyük olamaz.');
        $discountAmount = round($subtotal * ((float)$discountValue / 100), 2);
    } else {
        if ($discountValue > $subtotal) throw new RuntimeException('Sabit indirim ara toplamdan büyük olamaz.');
        $discountAmount = round((float)$discountValue, 2);
    }

    $total = max(0, round($subtotal - $discountAmount, 2));

    $stmt = $pdo->prepare("UPDATE orders
        SET status='paid', subtotal=?, discount_type=?, discount_value=?, discount_amount=?, total=?, payment_method=?, closed_at=NOW()
        WHERE id=?");
    $stmt->execute([$subtotal, $discountType, $discountValue, $discountAmount, $total, $paymentMethod, $order['id']]);
    $pdo->commit();

    json_response([
        'ok'=>true,
        'order_id'=>(int)$order['id'],
        'subtotal'=>$subtotal,
        'discount_amount'=>$discountAmount,
        'total'=>$total,
        'payment_method'=>$paymentMethod,
    ]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['ok'=>false,'message'=>$e instanceof RuntimeException ? $e->getMessage() : 'Hesap kapatılamadı.'], 422);
}
