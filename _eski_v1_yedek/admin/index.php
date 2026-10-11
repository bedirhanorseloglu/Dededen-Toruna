<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_admin();

$profile = business_profile($pdo);
$message = '';
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf($_POST['csrf'] ?? null);
    $action = (string)($_POST['action'] ?? '');

    try {
        if ($action === 'save_day_end') {
            $result = save_today_day_end($pdo);
            $message = 'Gün sonu tamamlandı. ' . (int)($result['closed_open_orders'] ?? 0) . ' açık masa kapatıldı, aktif gider ekranı ve son kapanan hesap listesi sıfırlandı.';
        } elseif ($action === 'delete_day_end') {
            $reportId = filter_var($_POST['report_id'] ?? null, FILTER_VALIDATE_INT);
            if (!$reportId) throw new RuntimeException('Gün sonu kaydı geçersiz.');
            $stmt = $pdo->prepare('UPDATE day_end_reports SET deleted_at=NOW() WHERE id=? AND deleted_at IS NULL');
            $stmt->execute([$reportId]);
            if ($stmt->rowCount() < 1) throw new RuntimeException('Gün sonu kaydı bulunamadı veya daha önce silinmiş.');
            $message = 'Gün sonu kaydı arşiv görünümünden silindi. Satış ve gider hareketleri korunur.';
        }
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

$today = today_finance($pdo);
$openStats = $pdo->query("SELECT COUNT(DISTINCT o.id) AS open_orders, COALESCE(SUM(oi.unit_price * oi.quantity),0) AS open_total
    FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.status='open'")->fetch();

$dayEndTotals = $pdo->query("SELECT COUNT(*) AS day_count,
    COALESCE(SUM(gross_revenue),0) gross_revenue,
    COALESCE(SUM(discount_total),0) discount_total,
    COALESCE(SUM(net_revenue),0) net_revenue,
    COALESCE(SUM(expense_total),0) expense_total,
    COALESCE(SUM(net_profit),0) net_profit
    FROM day_end_reports WHERE deleted_at IS NULL")->fetch();

$dayEnds = $pdo->query("SELECT * FROM day_end_reports WHERE deleted_at IS NULL ORDER BY report_date DESC LIMIT 31")->fetchAll();
$lastDayEndBoundary = (string)$pdo->query("SELECT COALESCE(MAX(updated_at),'1970-01-01 00:00:00') FROM day_end_reports WHERE deleted_at IS NULL")->fetchColumn();
$recentStmt = $pdo->prepare("SELECT o.id,t.table_no,o.subtotal,o.discount_amount,o.total,o.payment_method,o.closed_at
    FROM orders o JOIN cafe_tables t ON t.id=o.table_id
    WHERE o.status='paid' AND o.closed_at > ? ORDER BY o.closed_at DESC LIMIT 12");
$recentStmt->execute([$lastDayEndBoundary]);
$recentOrders = $recentStmt->fetchAll();
$creditStats = $pdo->query("SELECT COUNT(*) credit_count, COALESCE(SUM(x.total),0) credit_total FROM (SELECT o.id,SUM(oi.unit_price*oi.quantity) total FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.status='credit' GROUP BY o.id) x")->fetch();
$topProducts = $pdo->query("SELECT oi.product_name, SUM(oi.quantity) qty
    FROM order_items oi JOIN orders o ON o.id=oi.order_id
    WHERE o.status='paid' AND DATE(o.closed_at)=CURDATE()
    GROUP BY oi.product_name ORDER BY qty DESC, oi.product_name ASC LIMIT 8")->fetchAll();

$csrf = csrf_token();
$activePage = 'dashboard';
$pageTitle = 'Dashboard';
require __DIR__ . '/_top.php';
?>
<section class="admin-heading">
    <div>
        <div class="eyebrow">Finans & Operasyon</div>
        <h1 class="admin-title">Bugünün özeti</h1>
        <p class="muted"><?= e(date('d.m.Y')) ?> tarihindeki kapanmış adisyonlar ve girilmiş giderler üzerinden hesaplanır.</p>
    </div>
    <form method="post" onsubmit="return confirm('Gün sonu açık adisyonları Diğer ödeme olarak kapatacak ve aktif gider ekranını sıfırlayacak. Devam edilsin mi?')">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="action" value="save_day_end">
        <button class="btn btn-primary btn-lg" type="submit">Gün Sonu Kaydet</button>
    </form>
</section>

<?php if ($message): ?><div class="alert alert-success"><?= e($message) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

<section class="finance-grid">
    <article class="finance-card"><span>Brüt satış</span><strong><?= money($today['gross_revenue']) ?></strong><small><?= $today['bills'] ?> kapanan hesap</small></article>
    <article class="finance-card"><span>İndirim</span><strong class="warning-text">− <?= money($today['discount_total']) ?></strong><small>Hesap kapanış indirimleri</small></article>
    <article class="finance-card"><span>Net gelir</span><strong><?= money($today['net_revenue']) ?></strong><small>Nakit + kart + diğer</small></article>
    <article class="finance-card"><span>Gider</span><strong class="danger-text">− <?= money($today['expense_total']) ?></strong><small>Bugün girilen giderler</small></article>
    <article class="finance-card highlight"><span>Net kâr</span><strong><?= money($today['net_profit']) ?></strong><small>Net gelir − gider</small></article>
</section>

<section class="dashboard-grid">
    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Kasa Dağılımı</div><h2>Ödeme yöntemleri</h2></div></div>
        <div class="mini-stat-list">
            <div><span>Nakit</span><strong><?= money($today['cash_total']) ?></strong></div>
            <div><span>Kart</span><strong><?= money($today['card_total']) ?></strong></div>
            <div><span>Diğer</span><strong><?= money($today['other_total']) ?></strong></div>
            <div><span>Açık adisyon</span><strong><?= (int)$openStats['open_orders'] ?> / <?= money((float)$openStats['open_total']) ?></strong></div>
            <div><span>İptal edilen</span><strong><?= $today['cancelled'] ?> hesap</strong></div>
            <div><span>Açık veresiye</span><strong><?= (int)($creditStats['credit_count'] ?? 0) ?> / <?= money((float)($creditStats['credit_total'] ?? 0)) ?></strong></div>
        </div>
    </div>

    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Bugün</div><h2>En çok satılanlar</h2></div><a class="btn btn-sm" href="product_stats.php">Tüm Ürün Analizi</a></div>
        <?php if (!$topProducts): ?><p class="muted">Bugün henüz kapanan satış bulunmuyor.</p><?php endif; ?>
        <div class="rank-list">
            <?php foreach ($topProducts as $i => $item): ?>
                <div><span class="rank-no"><?= $i + 1 ?></span><span><?= e($item['product_name']) ?></span><strong><?= (int)$item['qty'] ?> adet</strong></div>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="panel">
    <div class="panel-title">
        <div><div class="eyebrow">Gün Sonu Arşivi</div><h2>Toplam işletme özeti</h2></div>
        <span class="badge gold"><?= (int)$dayEndTotals['day_count'] ?> kayıtlı gün</span>
    </div>
    <div class="finance-grid compact">
        <article class="finance-card"><span>Toplam net gelir</span><strong><?= money((float)$dayEndTotals['net_revenue']) ?></strong></article>
        <article class="finance-card"><span>Toplam indirim</span><strong><?= money((float)$dayEndTotals['discount_total']) ?></strong></article>
        <article class="finance-card"><span>Toplam gider</span><strong><?= money((float)$dayEndTotals['expense_total']) ?></strong></article>
        <article class="finance-card highlight"><span>Toplam net kâr</span><strong><?= money((float)$dayEndTotals['net_profit']) ?></strong></article>
    </div>
    <p class="muted small-note">Bu toplamlar “Gün Sonu Kaydet” ile oluşturulan günlük kayıtların toplamıdır. Aynı gün tekrar kaydedersen o günün kaydı güncellenir, çift kayıt oluşmaz.</p>

    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Tarih</th><th>Hesap</th><th>Brüt</th><th>İndirim</th><th>Net Gelir</th><th>Gider</th><th>Net Kâr</th><th>Nakit</th><th>Kart</th><th></th></tr></thead>
            <tbody>
            <?php if (!$dayEnds): ?><tr><td colspan="10" class="muted">Henüz gün sonu kaydı yok.</td></tr><?php endif; ?>
            <?php foreach ($dayEnds as $row): ?>
                <tr>
                    <td><strong><?= e(date('d.m.Y', strtotime($row['report_date']))) ?></strong></td>
                    <td><?= (int)$row['order_count'] ?></td>
                    <td><?= money((float)$row['gross_revenue']) ?></td>
                    <td><?= money((float)$row['discount_total']) ?></td>
                    <td><?= money((float)$row['net_revenue']) ?></td>
                    <td><?= money((float)$row['expense_total']) ?></td>
                    <td><strong><?= money((float)$row['net_profit']) ?></strong></td>
                    <td><?= money((float)$row['cash_total']) ?></td>
                    <td><?= money((float)$row['card_total']) ?></td>
                    <td class="day-end-delete-cell">
                        <form method="post" onsubmit="return confirm('<?= e(date('d.m.Y', strtotime($row['report_date']))) ?> gün sonu kaydı silinsin mi? Satış ve gider hareketleri silinmez.')">
                            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                            <input type="hidden" name="action" value="delete_day_end">
                            <input type="hidden" name="report_id" value="<?= (int)$row['id'] ?>">
                            <button class="btn btn-sm btn-danger" type="submit">Sil</button>
                        </form>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</section>

<section class="panel">
    <div class="panel-title"><div><div class="eyebrow">Bu Gün Sonundan Sonra</div><h2>Son kapanan hesaplar</h2></div></div>
    <div class="table-wrap">
        <table class="data-table">
            <thead><tr><th>Adisyon</th><th>Masa</th><th>Brüt</th><th>İndirim</th><th>Ödenen</th><th>Ödeme</th><th>Kapanış</th></tr></thead>
            <tbody>
            <?php if (!$recentOrders): ?><tr><td colspan="7" class="muted">Henüz kapanan hesap yok.</td></tr><?php endif; ?>
            <?php foreach ($recentOrders as $order):
                $paymentLabel = ['cash'=>'Nakit','card'=>'Kart','other'=>'Diğer'][$order['payment_method'] ?? 'other'] ?? 'Diğer';
            ?>
                <tr>
                    <td>#<?= (int)$order['id'] ?></td>
                    <td>Masa <?= (int)$order['table_no'] ?></td>
                    <td><?= money((float)$order['subtotal']) ?></td>
                    <td><?= money((float)$order['discount_amount']) ?></td>
                    <td><strong><?= money((float)$order['total']) ?></strong></td>
                    <td><span class="badge"><?= e($paymentLabel) ?></span></td>
                    <td><?= e(date('d.m.Y H:i', strtotime($order['closed_at']))) ?></td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</section>
<?php require __DIR__ . '/_bottom.php'; ?>
