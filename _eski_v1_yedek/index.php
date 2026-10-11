<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/helpers.php';

$profile = business_profile($pdo);
$start = isset($_GET['start']) ? (string)$_GET['start'] : 'home.php';

// Uygulama kabuğunun dışına veya başka origin'e yönlendirme yapılmasını engelle.
$start = str_replace(["\r", "\n", "\0"], '', $start);
if ($start === '' || preg_match('~^(?:[a-z][a-z0-9+.-]*:|//|/)~i', $start) || str_contains($start, '..')) {
    $start = 'home.php';
}
?>
<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
    <meta name="theme-color" content="#0d1117">
    <title><?= e($profile['name']) ?> • Adisyon Sistemi</title>
    <?php if ($profile['logo_path'] !== ''): ?><link rel="icon" href="<?= e($profile['logo_path']) ?>"><?php endif; ?>
    <style>
        *{box-sizing:border-box}
        html,body{width:100%;height:100%;margin:0;background:#0d1117;overflow:hidden}
        body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
        .app-shell{position:fixed;inset:0;background:#0d1117;overflow:hidden}
        .app-shell-frame{display:block;width:100%;height:100%;border:0;background:#0d1117}
        .shell-fullscreen{
            position:fixed;z-index:2147483647;right:max(8px,env(safe-area-inset-right));top:max(10px,env(safe-area-inset-top));
            width:44px;height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.10);background:#131a23;color:#fff;
            display:none;align-items:center;justify-content:center;padding:0;box-shadow:0 8px 22px rgba(0,0,0,.22);
            -webkit-tap-highlight-color:transparent;touch-action:manipulation;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;
            appearance:none;-webkit-appearance:none;cursor:pointer
        }
        .shell-fullscreen span{font-size:21px;line-height:1}
        .shell-fullscreen.is-active{color:#e6c06c;border-color:rgba(230,192,108,.48);background:#18202a}
        .shell-fullscreen:focus,.shell-fullscreen:focus-visible{outline:none;box-shadow:0 8px 22px rgba(0,0,0,.22)}
        @media (max-width:1100px),(hover:none) and (pointer:coarse){.shell-fullscreen{display:flex}}
        @media (display-mode:standalone),(display-mode:fullscreen){.shell-fullscreen{display:none}}
    </style>
</head>
<body>
<div class="app-shell">
    <iframe
        class="app-shell-frame"
        id="appFrame"
        name="cafeAppFrame"
        src="<?= e($start) ?>"
        title="<?= e($profile['name']) ?> Adisyon Sistemi"
        allow="fullscreen"
    ></iframe>
</div>
<button class="shell-fullscreen" id="shellFullscreen" type="button" aria-label="Tam ekranı aç"><span aria-hidden="true">⛶</span></button>
<script>
(() => {
    const btn = document.getElementById('shellFullscreen');
    const frame = document.getElementById('appFrame');
    if (!btn || !frame) return;

    const currentFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const requestFullscreen = () => {
        const el = document.documentElement;
        if (el.requestFullscreen) return el.requestFullscreen();
        if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
        return null;
    };
    const exitFullscreen = () => {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
        return null;
    };
    const sync = () => {
        const active = !!currentFullscreen();
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-label', active ? 'Tam ekrandan çık' : 'Tam ekranı aç');
        btn.querySelector('span').textContent = active ? '×' : '⛶';
    };

    btn.addEventListener('click', async () => {
        try {
            const result = currentFullscreen() ? exitFullscreen() : requestFullscreen();
            if (result && typeof result.then === 'function') await result;
        } catch (_) {
            // Tarayıcı izin vermiyorsa buton normal uygulama görünümünde kalır.
        }
        sync();
    }, {passive:false});

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
})();
</script>
</body>
</html>
