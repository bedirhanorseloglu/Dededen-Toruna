<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

require_post();
verify_csrf($_SERVER['HTTP_X_CSRF_TOKEN'] ?? null);
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$pin = trim((string)($input['pin'] ?? ''));

$limit = rate_limit_state('day_end_pin', 10, 60);
if (!$limit['allowed']) {
    json_response([
        'ok' => false,
        'message' => 'Çok fazla hatalı gün sonu şifresi girildi. ' . max(1, (int)$limit['retry_after']) . ' saniye sonra tekrar deneyin.'
    ], 429);
}

if (!verify_day_end_pin($pdo, $pin)) {
    rate_limit_fail('day_end_pin', 10, 60, 15);
    json_response(['ok' => false, 'message' => 'Gün sonu şifresi hatalı.'], 403);
}

try {
    $finance = save_today_day_end($pdo);
    rate_limit_clear('day_end_pin');
    json_response([
        'ok' => true,
        'message' => 'Gün sonu başarıyla tamamlandı.',
        'report' => [
            'date' => date('d.m.Y'),
            'bills' => (int)$finance['bills'],
            'net_revenue' => (float)$finance['net_revenue'],
            'expense_total' => (float)$finance['expense_total'],
            'net_profit' => (float)$finance['net_profit'],
            'closed_open_orders' => (int)($finance['closed_open_orders'] ?? 0),
            'closed_open_total' => (float)($finance['closed_open_total'] ?? 0),
            'archived_expenses' => (int)($finance['archived_expenses'] ?? 0),
            'active_expense_total' => (float)($finance['active_expense_total'] ?? 0),
        ],
    ]);
} catch (Throwable $e) {
    json_response(['ok' => false, 'message' => 'Gün sonu kaydedilemedi. Lütfen tekrar deneyin.'], 500);
}
