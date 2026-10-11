<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';
require_admin();

$profile = business_profile($pdo);
$message = '';
$error = '';
$filter = (string)($_GET['date'] ?? date('Y-m-d'));
if ($filter !== 'all') {
    $dt = DateTime::createFromFormat('Y-m-d', $filter);
    if (!$dt || $dt->format('Y-m-d') !== $filter) $filter = date('Y-m-d');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf($_POST['csrf'] ?? null);
    $action = (string)($_POST['action'] ?? '');
    $returnDate = (string)($_POST['return_date'] ?? date('Y-m-d'));

    try {
        if ($action === 'add_expense' || $action === 'edit_expense') {
            $title = trim((string)($_POST['title'] ?? ''));
            $description = trim((string)($_POST['description'] ?? ''));
            $amount = filter_var(str_replace(',', '.', (string)($_POST['amount'] ?? '')), FILTER_VALIDATE_FLOAT);
            $expenseDate = (string)($_POST['expense_date'] ?? '');
            $dt = DateTime::createFromFormat('Y-m-d', $expenseDate);
            if ($title === '' || $amount === false || $amount <= 0 || !$dt || $dt->format('Y-m-d') !== $expenseDate) {
                throw new RuntimeException('Gider bilgileri geçersiz. Başlık, tarih ve 0’dan büyük tutar girin.');
            }

            if ($action === 'add_expense') {
                $stmt = $pdo->prepare('INSERT INTO expenses (title, description, amount, expense_date) VALUES (?, ?, ?, ?)');
                $stmt->execute([$title, $description !== '' ? $description : null, $amount, $expenseDate]);
                $message = 'Gider kaydedildi.';
            } else {
                $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
                if (!$id) throw new RuntimeException('Geçersiz gider kaydı.');
                $stmt = $pdo->prepare('UPDATE expenses SET title=?, description=?, amount=?, expense_date=? WHERE id=? AND day_end_report_id IS NULL');
                $stmt->execute([$title, $description !== '' ? $description : null, $amount, $expenseDate, $id]);
                if ($stmt->rowCount() === 0) throw new RuntimeException('Gün sonuna alınmış giderler arşiv kaydı olduğu için değiştirilemez.');
                $message = 'Gider güncellendi.';
            }
        }

        if ($action === 'delete_expense') {
            $id = filter_var($_POST['id'] ?? null, FILTER_VALIDATE_INT);
            if (!$id) throw new RuntimeException('Geçersiz gider kaydı.');
            $stmt = $pdo->prepare('DELETE FROM expenses WHERE id=? AND day_end_report_id IS NULL');
            $stmt->execute([$id]);
            if ($stmt->rowCount() === 0) throw new RuntimeException('Gün sonuna alınmış giderler arşiv kaydı olduğu için silinemez.');
            $message = 'Gider silindi.';
        }

        $filter = $returnDate === 'all' ? 'all' : $returnDate;
    } catch (Throwable $e) {
        $error = $e->getMessage();
    }
}

if ($filter === 'all') {
    $expenses = $pdo->query('SELECT * FROM expenses ORDER BY expense_date DESC, id DESC LIMIT 100')->fetchAll();
    $periodTotal = (float)$pdo->query('SELECT COALESCE(SUM(amount),0) FROM expenses')->fetchColumn();
    $periodLabel = 'Tüm kayıtlar';
} else {
    $stmt = $pdo->prepare('SELECT * FROM expenses WHERE expense_date=? ORDER BY id DESC');
    $stmt->execute([$filter]);
    $expenses = $stmt->fetchAll();
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(amount),0) FROM expenses WHERE expense_date=?');
    $stmt->execute([$filter]);
    $periodTotal = (float)$stmt->fetchColumn();
    $periodLabel = date('d.m.Y', strtotime($filter));
}

$todayTotal = active_expense_total($pdo);
$monthTotal = (float)$pdo->query("SELECT COALESCE(SUM(amount),0) FROM expenses WHERE YEAR(expense_date)=YEAR(CURDATE()) AND MONTH(expense_date)=MONTH(CURDATE())")->fetchColumn();
$allTotal = (float)$pdo->query('SELECT COALESCE(SUM(amount),0) FROM expenses')->fetchColumn();
$csrf = csrf_token();
$activePage = 'expenses';
$pageTitle = 'Giderler';
require __DIR__ . '/_top.php';
?>
<section class="admin-heading">
    <div>
        <div class="eyebrow">Gider Yönetimi</div>
        <h1 class="admin-title">Günlük giderler</h1>
        <p class="muted">Başlık, kısa açıklama, tarih ve tutar ile işletme giderlerini kayıt altında tut.</p>
    </div>
</section>

<?php if ($message): ?><div class="alert alert-success"><?= e($message) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

<section class="finance-grid compact">
    <article class="finance-card"><span>Bugünkü gider</span><strong><?= money($todayTotal) ?></strong></article>
    <article class="finance-card"><span>Bu ay</span><strong><?= money($monthTotal) ?></strong></article>
    <article class="finance-card"><span>Tüm zamanlar</span><strong><?= money($allTotal) ?></strong></article>
    <article class="finance-card highlight"><span><?= e($periodLabel) ?></span><strong><?= money($periodTotal) ?></strong></article>
</section>

<section class="dashboard-grid expenses-layout">
    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Yeni Kayıt</div><h2>Gider ekle</h2></div></div>
        <form method="post" class="form-grid">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="action" value="add_expense">
            <input type="hidden" name="return_date" value="<?= e($filter) ?>">
            <label>Başlık<input name="title" maxlength="160" placeholder="Örn. Sebze alışverişi" required></label>
            <label>Küçük bilgi<textarea name="description" maxlength="500" rows="3" placeholder="Örn. Günlük mutfak alışverişi"></textarea></label>
            <div class="form-row">
                <label>Tutar (₺)<input type="number" name="amount" min="0.01" step="0.01" required></label>
                <label>Tarih<input type="date" name="expense_date" value="<?= e(date('Y-m-d')) ?>" required></label>
            </div>
            <button class="btn btn-primary" type="submit">Gideri Kaydet</button>
        </form>
    </div>

    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Filtre</div><h2>Gün seç</h2></div></div>
        <form method="get" class="form-grid">
            <label>Tarih<input type="date" name="date" value="<?= $filter === 'all' ? e(date('Y-m-d')) : e($filter) ?>"></label>
            <button class="btn" type="submit">Bu Günü Göster</button>
            <a class="btn btn-ghost" href="expenses.php?date=all">Son 100 Gideri Göster</a>
        </form>
    </div>
</section>

<section class="panel">
    <div class="panel-title"><div><div class="eyebrow">Kayıtlar</div><h2><?= e($periodLabel) ?> giderleri</h2></div><span class="badge gold"><?= count($expenses) ?> kayıt</span></div>
    <div class="table-wrap">
        <table class="data-table expense-table">
            <thead><tr><th>Başlık</th><th>Bilgi</th><th>Tarih</th><th>Tutar</th><th style="text-align:right">İşlem</th></tr></thead>
            <tbody>
            <?php if (!$expenses): ?><tr><td colspan="5" class="muted">Bu aralıkta gider kaydı bulunmuyor.</td></tr><?php endif; ?>
            <?php foreach ($expenses as $expense): ?>
                <tr>
                    <td colspan="5">
                        <?php if (!empty($expense['day_end_report_id'])): ?>
                            <div class="expense-edit-grid expense-archived-row">
                                <label>Başlık<input value="<?= e($expense['title']) ?>" disabled></label>
                                <label>Bilgi<input value="<?= e((string)($expense['description'] ?? '')) ?>" disabled></label>
                                <label>Tarih<input type="date" value="<?= e($expense['expense_date']) ?>" disabled></label>
                                <label>Tutar<input value="<?= money((float)$expense['amount']) ?>" disabled></label>
                                <div class="inline-actions"><span class="badge success">Gün sonu arşivinde</span></div>
                            </div>
                        <?php else: ?>
                            <form method="post" class="expense-edit-grid">
                                <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
                                <input type="hidden" name="id" value="<?= (int)$expense['id'] ?>">
                                <input type="hidden" name="return_date" value="<?= e($filter) ?>">
                                <label>Başlık<input name="title" value="<?= e($expense['title']) ?>" required></label>
                                <label>Bilgi<input name="description" value="<?= e((string)($expense['description'] ?? '')) ?>"></label>
                                <label>Tarih<input type="date" name="expense_date" value="<?= e($expense['expense_date']) ?>" required></label>
                                <label>Tutar<input type="number" name="amount" min="0.01" step="0.01" value="<?= e((string)$expense['amount']) ?>" required></label>
                                <div class="inline-actions">
                                    <button class="btn btn-sm" name="action" value="edit_expense">Kaydet</button>
                                    <button class="btn btn-sm btn-danger" name="action" value="delete_expense" onclick="return confirm('Bu gider silinsin mi?')">Sil</button>
                                </div>
                            </form>
                        <?php endif; ?>
                    </td>
                </tr>
            <?php endforeach; ?>
            </tbody>
        </table>
    </div>
</section>
<?php require __DIR__ . '/_bottom.php'; ?>
