<?php
declare(strict_types=1);
require __DIR__ . '/../config.php';
require __DIR__ . '/../helpers.php';

if (is_admin()) redirect('index.php');
$profile = business_profile($pdo);
$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    verify_csrf($_POST['csrf'] ?? null);
    $limit = rate_limit_state('admin_login', 10, 30);
    if (!$limit['allowed']) {
        $error = 'Çok fazla hatalı giriş denemesi yapıldı. ' . max(1, (int)$limit['retry_after']) . ' saniye sonra tekrar deneyin.';
    } else {
        $username = trim((string)($_POST['username'] ?? ''));
        $password = (string)($_POST['password'] ?? '');

        $stmt = $pdo->prepare('SELECT id, username, password_hash FROM admins WHERE username = ? LIMIT 1');
        $stmt->execute([$username]);
        $admin = $stmt->fetch();

        if ($admin && password_verify($password, $admin['password_hash'])) {
            rate_limit_clear('admin_login');
            session_regenerate_id(true);
            $_SESSION['admin_id'] = (int)$admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            redirect('index.php');
        }
        rate_limit_fail('admin_login', 10, 30, 15);
        $error = 'Kullanıcı adı veya şifre hatalı.';
    }
}
?>
<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Admin Girişi • <?= e($profile['name']) ?></title>
    <?php if($profile['logo_path']!==''):?><link rel="icon" href="../<?= e($profile['logo_path']) ?>"><?php endif;?>
    <link rel="stylesheet" href="../assets/style.css?v=10">
</head>
<body>
<div class="login-shell">
    <main class="login-card">
        <?php if ($profile['logo_path'] !== ''): ?><div class="login-logo login-logo-image"><img src="../<?= e($profile['logo_path']) ?>" alt="Logo"></div><?php else: ?><div class="login-logo"><?= e(business_initials($profile['name'])) ?></div><?php endif; ?>
        <div class="eyebrow"><?= e($profile['name']) ?></div>
        <h1>Admin Girişi</h1>
        <p>Finans, giderler, gün sonu, masa düzeni ve menüyü yönetmek için giriş yapın.</p>
        <?php if ($error): ?><div class="alert alert-error"><?= e($error) ?></div><?php endif; ?>
        <form method="post" class="form-grid">
            <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
            <label>Kullanıcı adı<input name="username" value="admin" autocomplete="username" required></label>
            <label>Şifre<input type="password" name="password" autocomplete="current-password" required autofocus></label>
            <button class="btn btn-primary" type="submit" style="min-height:50px">Giriş Yap</button>
            <a class="btn btn-ghost" href="../home.php">← Ana Sayfaya Dön</a>
        </form>
    </main>
</div>
<script src="../assets/app.js?v=10"></script>
</body>
</html>
