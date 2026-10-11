<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/helpers.php';

$profile = business_profile($pdo);
$orders = orders_board_payload($pdo);
$pendingItems = array_sum(array_map(fn($o) => (int)$o['pending_count'], $orders));
$completedOrders = count(array_filter($orders, fn($o) => !empty($o['all_delivered'])));
$csrf = csrf_token();
$refreshSeconds = live_refresh_seconds($pdo);
?>
<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="csrf-token" content="<?= e($csrf) ?>">
    <title>Adisyonlar • <?= e($profile['name']) ?></title>
    <?php if($profile['logo_path']!==''):?><link rel="icon" href="<?= e($profile['logo_path']) ?>"><?php endif;?>
    <link rel="stylesheet" href="assets/style.css?v=10.1">
</head>
<body class="orders-board-page">
<header class="topbar">
    <div class="container topbar-inner">
        <a class="brand" href="home.php">
            <?php if ($profile['logo_path'] !== ''): ?>
                <span class="brand-mark brand-mark-image"><img src="<?= e($profile['logo_path']) ?>" alt="Logo"></span>
            <?php else: ?>
                <span class="brand-mark"><?= e(business_initials($profile['name'])) ?></span>
            <?php endif; ?>
            <span><?= e($profile['name']) ?><small>Tüm açık siparişler • teslim kontrolü</small></span>
        </a>
        <div class="nav-actions">
            <a class="btn btn-ghost" href="home.php">Masalar</a>
            <a class="btn btn-primary" href="orders.php">Adisyonlar <span class="nav-count" id="boardPendingNav"><?= $pendingItems ?></span></a>
            <a class="btn btn-ghost" href="expenses.php">+ Gider</a>
            <a class="btn" href="admin/login.php">Admin</a>
        </div>
    </div>
</header>

<main class="container board-main">
    <section class="board-head">
        <div>
            <div class="eyebrow">Yoğun Saat Kontrolü</div>
            <h1>Açık adisyonlar</h1>
            <p class="muted">Ürün verildiğinde tek dokunuşla işaretle. Bir masanın tüm ürünleri verildiyse kart yeşile döner.</p>
        </div>
        <div class="board-stats">
            <div><small>Açık masa</small><strong id="boardOpenCount"><?= count($orders) ?></strong></div>
            <div><small>Bekleyen ürün</small><strong id="boardPendingCount"><?= $pendingItems ?></strong></div>
            <div><small>Tamamlanan masa</small><strong id="boardDoneCount"><?= $completedOrders ?></strong></div>
        </div>
    </section>

    <section class="order-board-grid" id="orderBoard"></section>
    <div class="board-empty" id="boardEmpty" <?= $orders ? 'hidden' : '' ?>>
        <strong>Açık adisyon yok</strong>
        <span>Yeni sipariş girildiğinde burada otomatik görünecek.</span>
    </div>
</main>

<script src="assets/app.js?v=10"></script>
<script>
window.ORDER_BOARD_INITIAL = <?= json_encode($orders, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
window.ORDER_BOARD_REFRESH_MS = <?= max(1200, min(5000, (int)$refreshSeconds * 1000)) ?>;
</script>
<script src="assets/orders-board.js?v=10"></script>
</body>
</html>
