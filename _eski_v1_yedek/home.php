<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/helpers.php';

$profile = business_profile($pdo);
$sql = "SELECT t.id, t.table_no,
               o.id AS order_id,
               COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total,
               COALESCE(SUM(oi.quantity), 0) AS item_count,
               COALESCE(SUM(CASE WHEN oi.item_status='pending' THEN oi.quantity ELSE 0 END),0) AS pending_count
        FROM cafe_tables t
        LEFT JOIN orders o ON o.table_id = t.id AND o.status = 'open'
        LEFT JOIN order_items oi ON oi.order_id = o.id
        WHERE t.is_active = 1
        GROUP BY t.id, t.table_no, o.id
        ORDER BY t.table_no";
$tables = $pdo->query($sql)->fetchAll();
$totalTables = count($tables);
$busyTables = 0;
$openTotal = 0.0;
$pendingOrderItems = 0;
foreach ($tables as $t) {
    if (!empty($t['order_id'])) {
        $busyTables++;
        $openTotal += (float)$t['total'];
        $pendingOrderItems += (int)($t['pending_count'] ?? 0);
    }
}
$creditCount = (int)$pdo->query("SELECT COUNT(*) FROM orders WHERE status='credit'")->fetchColumn();
$creditTotal = (float)$pdo->query("SELECT COALESCE(SUM(x.total),0) FROM (SELECT o.id,SUM(oi.unit_price*oi.quantity) total FROM orders o LEFT JOIN order_items oi ON oi.order_id=o.id WHERE o.status='credit' GROUP BY o.id) x")->fetchColumn();
$activeNotes = (int)$pdo->query("SELECT COUNT(*) FROM notes WHERE status='active'")->fetchColumn();
$todayExpense = active_expense_total($pdo);
$refreshSeconds = live_refresh_seconds($pdo);
$todayFinance = today_finance($pdo);
$csrf = csrf_token();
?>
<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="csrf-token" content="<?= e($csrf) ?>">
    <title><?= e($profile['name']) ?> • Adisyon Sistemi</title>
    <?php if($profile['logo_path']!==''):?><link rel="icon" href="<?= e($profile['logo_path']) ?>"><?php endif;?>
    <link rel="stylesheet" href="assets/style.css?v=10.1">
</head>
<body>
<header class="topbar">
    <div class="container topbar-inner">
        <a class="brand" href="home.php">
            <?php if ($profile['logo_path'] !== ''): ?>
                <span class="brand-mark brand-mark-image"><img src="<?= e($profile['logo_path']) ?>" alt="Logo"></span>
            <?php else: ?>
                <span class="brand-mark"><?= e(business_initials($profile['name'])) ?></span>
            <?php endif; ?>
            <span><?= e($profile['name']) ?><small><?= e($profile['subtitle'] !== '' ? $profile['subtitle'] : 'Adisyon & Masa Yönetimi') ?></small></span>
        </a>
        <div class="nav-actions">
            <a class="btn btn-ghost" href="expenses.php">+ Gider</a>
            <a class="btn btn-ghost" href="notes.php">Notlar <span class="nav-count" id="noteCountNav"><?= $activeNotes ?></span></a>
            <a class="btn btn-credit" href="credits.php">Veresiye <span class="nav-count" id="creditCountNav"><?= $creditCount ?></span></a>
            <a class="btn btn-ghost" href="orders.php">Adisyonlar <span class="nav-count" id="orderPendingNav"><?= $pendingOrderItems ?></span></a>
            <a class="btn btn-primary" href="admin/login.php">Admin</a>
        </div>
    </div>
</header>

<main>
<section class="hero compact-hero">
    <div class="container hero-grid">
        <div class="hero-card">
            <div class="eyebrow"><?= e($profile['subtitle'] !== '' ? $profile['subtitle'] : 'Kafe Operasyonu') ?></div>
            <h1><?= e($profile['name']) ?> adisyon sistemi.</h1>
            <p class="lead">Masaya dokun, doğrudan adisyon ekranından ürünleri hızlıca ekle ve hesabı yönet.</p>
            <div class="hero-actions"><a class="btn btn-primary" href="#masalar">Masalara Git</a></div>
        </div>
        <div class="stats">
            <div class="stat-card"><div class="stat-label">Dolu / aktif masa</div><div class="stat-value" id="busyStat"><?= $busyTables ?> / <?= $totalTables ?></div><div class="stat-note">Canlı masa durumu</div></div>
            <div class="stat-card"><div class="stat-label">Açık adisyon</div><div class="stat-value" id="openTotalStat"><?= money($openTotal) ?></div><div class="stat-note">Henüz kapanmamış hesaplar</div></div>
            <div class="stat-card"><div class="stat-label">Veresiye toplamı</div><div class="stat-value"><?= money($creditTotal) ?></div><div class="stat-note"><?= $creditCount ?> açık veresiye</div></div>
        </div>
    </div>
</section>

<section class="section quick-section">
    <div class="container">
        <div class="quick-ops-grid">
            <a class="quick-op" href="expenses.php"><span class="quick-icon">₺</span><div><strong>Gider Ekle</strong><small>Bugün <?= money($todayExpense) ?> gider girildi</small></div></a>
            <a class="quick-op" href="notes.php"><span class="quick-icon">N</span><div><strong>Not Panosu</strong><small id="notesQuick"><?= $activeNotes ?> aktif not</small></div></a>
            <a class="quick-op" href="credits.php"><span class="quick-icon">V</span><div><strong>Veresiyeler</strong><small id="creditsQuick"><?= $creditCount ?> açık hesap</small></div></a>
            <button class="quick-op quick-op-button" type="button" id="openDayEndBtn"><span class="quick-icon">✓</span><div><strong>Gün Sonu</strong><small id="dayEndQuick">Şifre ile günlük kaydı oluştur</small></div></button>
        </div>
    </div>
</section>

<section class="section" id="masalar">
    <div class="container">
        <div class="section-head">
            <div><div class="eyebrow">Masa Yönetimi</div><h2>Masalar</h2><p>Masaya dokununca doğrudan adisyon ekranı açılır.</p></div>
            <span class="live-pill"><i></i> Canlı güncelleme</span>
        </div>
        <div class="tables-grid" id="tablesGrid">
            <?php foreach ($tables as $table): $busy = !empty($table['order_id']); $served = $busy && (int)($table['pending_count'] ?? 0) === 0; ?>
                <a class="table-card <?= $busy ? 'busy' : '' ?> <?= $served ? 'served' : '' ?>" href="table.php?id=<?= (int)$table['id'] ?>" data-table-id="<?= (int)$table['id'] ?>" data-table-no="<?= (int)$table['table_no'] ?>" data-item-count="<?= (int)$table['item_count'] ?>" data-total="<?= e((string)$table['total']) ?>">
                    <div class="number">Masa <?= (int)$table['table_no'] ?></div>
                    <div class="status"><span class="dot"></span><span class="status-text"><?= $served ? 'Tümü verildi' : ($busy ? 'Adisyon açık' : 'Masa boş') ?></span></div>
                    <div class="table-meta"><span class="item-count"><?= (int)$table['item_count'] ?> ürün</span><strong class="table-total"><?= money((float)$table['total']) ?></strong></div>
                </a>
            <?php endforeach; ?>
        </div>
    </div>
</section>
</main>

<dialog class="app-dialog" id="dayEndDialog">
    <form class="dialog-card day-end-dialog" id="dayEndForm">
        <div class="dialog-head">
            <div><div class="eyebrow">Gün Sonu</div><h3>Bugünün kaydını oluştur</h3></div>
            <button class="dialog-close" type="button" id="closeDayEndBtn" aria-label="Kapat">×</button>
        </div>
        <p class="muted">Admin paneline girmeden gün sonu alabilirsin. İşlem için gün sonu şifresini gir.</p>
        <div class="day-end-warning" id="dayEndWarning">
            <strong>Dikkat: gün sonu masaları sıfırlar.</strong>
            <span><b id="dayEndOpenCount"><?= $busyTables ?></b> açık adisyon (<b id="dayEndOpenTotal"><?= money($openTotal) ?></b>) gün sonuna dahil edilip <b>Diğer</b> ödeme olarak kapatılacak. Bugünkü aktif giderler (<b id="dayEndActiveExpense"><?= money($todayExpense) ?></b>) arşivlenecek ve hızlı gider ekranı 0 ₺'ye dönecek.</span>
        </div>
        <div class="day-end-preview day-end-preview-v8">
            <div><span>Net gelir</span><strong><?= money((float)$todayFinance['net_revenue']) ?></strong></div>
            <div><span>Günlük gider</span><strong><?= money((float)$todayFinance['expense_total']) ?></strong></div>
            <div><span>Net kâr</span><strong><?= money((float)$todayFinance['net_profit']) ?></strong></div>
            <div><span>Açık masa</span><strong id="dayEndOpenCard"><?= $busyTables ?> / <?= money($openTotal) ?></strong></div>
        </div>
        <label>Gün sonu şifresi
            <input type="password" id="dayEndPin" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" autocomplete="off" placeholder="••••" required>
        </label>
        <div class="dialog-actions">
            <button class="btn btn-ghost" type="button" id="cancelDayEndBtn">Vazgeç</button>
            <button class="btn btn-primary" type="submit" id="saveDayEndBtn">Gün Sonunu Kaydet</button>
        </div>
    </form>
</dialog>

<script src="assets/app.js?v=10"></script>

<script>
const refreshMs = <?= (int)$refreshSeconds * 1000 ?>;
const csrf = document.querySelector('meta[name="csrf-token"]').content;
let syncBusy = false;
let currentBusyCount = <?= (int)$busyTables ?>;
let currentOpenTotal = <?= json_encode((float)$openTotal) ?>;
function setMoney(el, v) { el.textContent = formatMoney(Number(v || 0)); }
async function syncTables() {
    if (syncBusy || document.hidden) return;
    syncBusy = true;
    try {
        const r = await fetch('api/tables_state.php', {cache: 'no-store'});
        const d = await r.json();
        if (!d.ok) return;
        const existing = [...document.querySelectorAll('[data-table-id]')];
        if (existing.length !== d.tables.length) { location.reload(); return; }
        let busy = 0, openTotal = 0;
        for (const row of d.tables) {
            const card = document.querySelector(`[data-table-id="${row.id}"]`);
            if (!card) { location.reload(); return; }
            const isBusy = !!row.order_id;
            const isServed = isBusy && Number(row.pending_count || 0) === 0;
            card.classList.toggle('busy', isBusy);
            card.classList.toggle('served', isServed);
            card.querySelector('.status-text').textContent = isServed ? 'Tümü verildi' : (isBusy ? 'Adisyon açık' : 'Masa boş');
            card.querySelector('.item-count').textContent = `${row.item_count} ürün`;
            setMoney(card.querySelector('.table-total'), row.total);
            card.dataset.itemCount = String(row.item_count);
            card.dataset.total = String(row.total);
            if (isBusy) { busy++; openTotal += row.total; }
        }
        currentBusyCount = busy;
        currentOpenTotal = openTotal;
        document.getElementById('busyStat').textContent = `${busy} / ${d.tables.length}`;
        setMoney(document.getElementById('openTotalStat'), openTotal);
        document.getElementById('dayEndOpenCount').textContent = String(busy);
        document.getElementById('dayEndOpenTotal').textContent = formatMoney(openTotal);
        document.getElementById('dayEndOpenCard').textContent = `${busy} / ${formatMoney(openTotal)}`;
        document.getElementById('creditCountNav').textContent = d.credit_count;
        document.getElementById('noteCountNav').textContent = d.active_notes;
        document.getElementById('creditsQuick').textContent = `${d.credit_count} açık hesap`;
        document.getElementById('notesQuick').textContent = `${d.active_notes} aktif not`;
        if (document.getElementById('orderPendingNav') && d.pending_order_items !== undefined) document.getElementById('orderPendingNav').textContent = String(d.pending_order_items);
    } catch (e) {
        // Geçici ağ hatasında ekranı bozma; sonraki senkronizasyon tekrar dener.
    } finally { syncBusy = false; }
}
const dayEndDialog = document.getElementById('dayEndDialog');
const dayEndPin = document.getElementById('dayEndPin');
document.getElementById('openDayEndBtn').addEventListener('click', () => {
    if (!dayEndDialog.open) dayEndDialog.showModal();
    setTimeout(() => dayEndPin.focus(), 30);
});
function closeDayEnd() {
    if (dayEndDialog.open) dayEndDialog.close();
    dayEndPin.value = '';
}
document.getElementById('closeDayEndBtn').addEventListener('click', closeDayEnd);
document.getElementById('cancelDayEndBtn').addEventListener('click', closeDayEnd);
document.getElementById('dayEndForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pin = dayEndPin.value.trim();
    if (!/^\d{4,12}$/.test(pin)) return showToast('Gün sonu şifresi 4-12 haneli rakamlardan oluşmalıdır.', 'error');
    if (currentBusyCount > 0) {
        const ok = confirm(`${currentBusyCount} açık adisyon (${formatMoney(currentOpenTotal)}) gün sonuna dahil edilip Diğer ödeme olarak kapatılacak. Masalar boşalacak. Devam edilsin mi?`);
        if (!ok) return;
    }
    const btn = document.getElementById('saveDayEndBtn');
    btn.disabled = true;
    try {
        const r = await fetch('api/day_end.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json','X-CSRF-Token':csrf},
            body: JSON.stringify({pin})
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d.message || 'Gün sonu kaydedilemedi.');
        document.getElementById('dayEndQuick').textContent = `${d.report.date} • Net kâr ${formatMoney(d.report.net_profit)}`;
        closeDayEnd();
        const closedText = d.report.closed_open_orders > 0 ? ` • ${d.report.closed_open_orders} masa kapandı` : '';
        showToast(`Gün sonu tamamlandı${closedText}. Gider ekranı sıfırlandı.`);
        setTimeout(() => location.reload(), 650);
    } catch (err) {
        showToast(err.message || 'Gün sonu kaydedilemedi.', 'error');
        dayEndPin.select();
    } finally {
        btn.disabled = false;
    }
});

setInterval(syncTables, Math.max(3000, refreshMs));
</script>
</body>
</html>
