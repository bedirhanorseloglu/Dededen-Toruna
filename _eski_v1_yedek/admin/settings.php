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
        if ($action === 'update_tables') {
            $newCount = filter_var($_POST['table_count'] ?? null, FILTER_VALIDATE_INT, ['options'=>['min_range'=>1,'max_range'=>200]]);
            if (!$newCount) throw new RuntimeException('Masa sayısı 1 ile 200 arasında olmalıdır.');

            $currentMax = (int)$pdo->query('SELECT COALESCE(MAX(table_no), 0) FROM cafe_tables WHERE is_active = 1')->fetchColumn();
            if ($newCount < $currentMax) {
                $stmt = $pdo->prepare("SELECT t.table_no FROM cafe_tables t JOIN orders o ON o.table_id=t.id AND o.status='open' WHERE t.table_no > ? GROUP BY t.id ORDER BY t.table_no");
                $stmt->execute([$newCount]);
                $busyToRemove = $stmt->fetchAll(PDO::FETCH_COLUMN);
                if ($busyToRemove) throw new RuntimeException('Azaltılacak masalarda açık adisyon var: Masa ' . implode(', ', $busyToRemove) . '. Önce bu hesapları kapatın.');
            }

            $pdo->beginTransaction();
            set_setting($pdo, 'table_count', (string)$newCount);
            for ($i=1; $i <= $newCount; $i++) {
                $stmt = $pdo->prepare('INSERT INTO cafe_tables (table_no,is_active) VALUES (?,1) ON DUPLICATE KEY UPDATE is_active=1');
                $stmt->execute([$i]);
            }
            $stmt = $pdo->prepare('UPDATE cafe_tables SET is_active=0 WHERE table_no > ?');
            $stmt->execute([$newCount]);
            $pdo->commit();
            bump_menu_revision($pdo);
            $message = "Masa sayısı {$newCount} olarak güncellendi.";
        }

        if ($action === 'update_business') {
            $name = trim((string)($_POST['business_name'] ?? ''));
            $subtitle = trim((string)($_POST['business_subtitle'] ?? ''));
            if ($name === '') throw new RuntimeException('Dükkan adı boş olamaz.');
            if (text_length($name) > 120 || text_length($subtitle) > 220) throw new RuntimeException('Dükkan adı veya alt başlık çok uzun.');
            set_setting($pdo, 'business_name', $name);
            set_setting($pdo, 'business_subtitle', $subtitle);
            $message = 'Dükkan bilgileri güncellendi.';
        }

        if ($action === 'update_admin_password') {
            $currentPassword = (string)($_POST['current_password'] ?? '');
            $newPassword = (string)($_POST['new_password'] ?? '');
            $confirmPassword = (string)($_POST['confirm_password'] ?? '');
            if (strlen($newPassword) < 4 || strlen($newPassword) > 72) throw new RuntimeException('Yeni admin şifresi 4 ile 72 karakter arasında olmalıdır.');
            if ($newPassword !== $confirmPassword) throw new RuntimeException('Yeni admin şifreleri eşleşmiyor.');

            $stmt = $pdo->prepare('SELECT password_hash FROM admins WHERE id = ? LIMIT 1');
            $stmt->execute([(int)$_SESSION['admin_id']]);
            $currentHash = $stmt->fetchColumn();
            if (!$currentHash || !password_verify($currentPassword, (string)$currentHash)) throw new RuntimeException('Mevcut admin şifresi hatalı.');

            $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('UPDATE admins SET password_hash = ? WHERE id = ?');
            $stmt->execute([$newHash, (int)$_SESSION['admin_id']]);
            session_regenerate_id(true);
            $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
            $message = 'Admin şifresi güncellendi.';
        }

        if ($action === 'update_day_end_pin') {
            $newPin = trim((string)($_POST['new_day_end_pin'] ?? ''));
            $confirmPin = trim((string)($_POST['confirm_day_end_pin'] ?? ''));
            if (!preg_match('/^\d{4,12}$/', $newPin)) throw new RuntimeException('Gün sonu şifresi 4 ile 12 haneli ve sadece rakamlardan oluşmalıdır.');
            if ($newPin !== $confirmPin) throw new RuntimeException('Gün sonu şifreleri eşleşmiyor.');
            set_setting($pdo, 'day_end_pin_hash', password_hash($newPin, PASSWORD_DEFAULT));
            rate_limit_clear('day_end_pin');
            $message = 'Gün sonu şifresi güncellendi.';
        }

        if ($action === 'upload_logo') {
            if (empty($_FILES['logo']) || !is_array($_FILES['logo'])) throw new RuntimeException('Logo dosyası seçilmedi.');
            $file = $_FILES['logo'];
            if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) throw new RuntimeException('Logo yüklenemedi. Dosyayı tekrar seçin.');
            if (($file['size'] ?? 0) > 3 * 1024 * 1024) throw new RuntimeException('Logo en fazla 3 MB olabilir.');

            $finfo = new finfo(FILEINFO_MIME_TYPE);
            $mime = $finfo->file($file['tmp_name']);
            $allowed = ['image/png'=>'png','image/jpeg'=>'jpg','image/webp'=>'webp'];
            if (!isset($allowed[$mime])) throw new RuntimeException('Logo PNG, JPG veya WEBP olmalıdır.');

            $uploadDir = __DIR__ . '/../assets/uploads';
            if (!is_dir($uploadDir) && !mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) throw new RuntimeException('Logo klasörü oluşturulamadı.');
            $filename = 'logo_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $allowed[$mime];
            $target = $uploadDir . '/' . $filename;
            if (!move_uploaded_file($file['tmp_name'], $target)) throw new RuntimeException('Logo dosyası kaydedilemedi.');

            $old = get_setting($pdo, 'logo_path', '');
            set_setting($pdo, 'logo_path', 'assets/uploads/' . $filename);
            if ($old !== '' && str_starts_with($old, 'assets/uploads/')) {
                $oldFile = __DIR__ . '/../' . $old;
                if (is_file($oldFile)) @unlink($oldFile);
            }
            $message = 'Logo güncellendi.';
        }

        if ($action === 'remove_logo') {
            $old = get_setting($pdo, 'logo_path', '');
            set_setting($pdo, 'logo_path', '');
            if ($old !== '' && str_starts_with($old, 'assets/uploads/')) {
                $oldFile = __DIR__ . '/../' . $old;
                if (is_file($oldFile)) @unlink($oldFile);
            }
            $message = 'Logo kaldırıldı.';
        }
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        $error = $e->getMessage();
    }

    $profile = business_profile($pdo);
}

$tableCount = (int)$pdo->query('SELECT COUNT(*) FROM cafe_tables WHERE is_active=1')->fetchColumn();
$csrf = csrf_token();
$activePage = 'settings';
$pageTitle = 'Ayarlar';
require __DIR__ . '/_top.php';
?>
<section class="admin-heading">
    <div><div class="eyebrow">Sistem Ayarları</div><h1 class="admin-title">İşletme ve masa ayarları</h1><p class="muted">Dükkan ismi, logo ve aktif masa sayısını buradan yönet.</p></div>
</section>
<?php if ($message): ?><div class="alert alert-success"><?= e($message) ?></div><?php endif; ?>
<?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>

<section class="dashboard-grid settings-grid">
    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Marka</div><h2>Dükkan bilgileri</h2></div></div>
        <form method="post" class="form-grid">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="update_business">
            <label>Dükkan adı<input name="business_name" maxlength="120" value="<?= e($profile['name']) ?>" required></label>
            <label>Küçük alt başlık<input name="business_subtitle" maxlength="220" value="<?= e($profile['subtitle']) ?>" placeholder="Geleneksel Lezzetler & Cafe Restoran"></label>
            <button class="btn btn-primary" type="submit">Dükkan Bilgilerini Kaydet</button>
        </form>
    </div>

    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Logo</div><h2>Logo yükle</h2></div></div>
        <div class="logo-preview">
            <?php if ($profile['logo_path'] !== ''): ?><img src="../<?= e($profile['logo_path']) ?>" alt="Mevcut logo"><?php else: ?><div class="logo-placeholder"><?= e(business_initials($profile['name'])) ?></div><?php endif; ?>
        </div>
        <form method="post" enctype="multipart/form-data" class="form-grid">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="upload_logo">
            <label>Logo dosyası<input type="file" name="logo" accept="image/png,image/jpeg,image/webp" required></label>
            <button class="btn btn-primary" type="submit">Logoyu Yükle</button>
        </form>
        <?php if ($profile['logo_path'] !== ''): ?>
            <form method="post" style="margin-top:10px" onsubmit="return confirm('Logo kaldırılsın mı?')">
                <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="remove_logo">
                <button class="btn btn-danger" type="submit">Logoyu Kaldır</button>
            </form>
        <?php endif; ?>
        <p class="muted small-note">PNG, JPG veya WEBP. En fazla 3 MB. Yüklenen logo ana sayfa, masa ekranı ve admin panelinde görünür.</p>
    </div>
</section>

<section class="dashboard-grid settings-grid security-settings-grid">
    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Güvenlik</div><h2>Admin şifresi</h2></div></div>
        <form method="post" class="form-grid" autocomplete="off">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="update_admin_password">
            <label>Mevcut admin şifresi<input type="password" name="current_password" autocomplete="current-password" required></label>
            <label>Yeni admin şifresi<input type="password" name="new_password" minlength="4" maxlength="72" autocomplete="new-password" required></label>
            <label>Yeni şifre tekrar<input type="password" name="confirm_password" minlength="4" maxlength="72" autocomplete="new-password" required></label>
            <button class="btn btn-primary" type="submit">Admin Şifresini Değiştir</button>
        </form>
        <p class="muted small-note">Admin şifresi veritabanında düz metin olarak değil güvenli parola özeti olarak saklanır.</p>
    </div>

    <div class="panel">
        <div class="panel-title"><div><div class="eyebrow">Hızlı Gün Sonu</div><h2>Gün sonu şifresi</h2></div></div>
        <form method="post" class="form-grid" autocomplete="off">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="update_day_end_pin">
            <label>Yeni gün sonu şifresi<input type="password" name="new_day_end_pin" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" autocomplete="new-password" required></label>
            <label>Şifre tekrar<input type="password" name="confirm_day_end_pin" inputmode="numeric" pattern="[0-9]*" minlength="4" maxlength="12" autocomplete="new-password" required></label>
            <button class="btn btn-primary" type="submit">Gün Sonu Şifresini Değiştir</button>
        </form>
        <p class="muted small-note">İlk kurulum gün sonu şifresi <strong>0000</strong>. Ana ekrandaki Gün Sonu butonunda kullanılır.</p>
    </div>
</section>

<section class="panel">
    <div class="panel-title"><div><div class="eyebrow">Masa Düzeni</div><h2>Aktif masa sayısı</h2></div><span class="badge gold"><?= $tableCount ?> masa</span></div>
    <form method="post" class="settings-table-form">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>"><input type="hidden" name="action" value="update_tables">
        <label>Masa sayısı<input type="number" name="table_count" min="1" max="200" value="<?= $tableCount ?>" required></label>
        <button class="btn btn-primary" type="submit">Masa Sayısını Güncelle</button>
    </form>
    <p class="muted small-note">Masa sayısı azaltılırken kaldırılacak masalarda açık adisyon varsa sistem işlemi durdurur.</p>
</section>
<?php require __DIR__ . '/_bottom.php'; ?>
