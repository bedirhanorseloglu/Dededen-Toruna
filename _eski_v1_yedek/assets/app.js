const moneyFormatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

function showToast(message, type = 'success') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = 'toast ' + (type === 'error' ? 'error' : '') + ' show';
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
}

function formatMoney(value) {
    return moneyFormatter.format(Number(value || 0)) + ' ₺';
}

(function setupFullscreenToggle() {
    // V9: Uygulama kabuğu içinde tam ekran kontrolü üst sayfada kalır; iç sayfada ikinci buton oluşturma.
    if (window.self !== window.top) return;
    const host = document.querySelector('.topbar-inner');
    if (!host) return;

    const coarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const compact = window.matchMedia('(max-width: 1100px)').matches;
    if (!coarse && !compact) return;

    const requestFullscreen = element => {
        if (element.requestFullscreen) return element.requestFullscreen();
        if (element.webkitRequestFullscreen) return element.webkitRequestFullscreen();
        return null;
    };
    const exitFullscreen = () => {
        if (document.exitFullscreen) return document.exitFullscreen();
        if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
        return null;
    };
    const currentFullscreen = () => document.fullscreenElement || document.webkitFullscreenElement || null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'fullscreen-toggle';
    btn.setAttribute('aria-label', 'Tam ekranı aç');
    btn.innerHTML = '<span aria-hidden="true">⛶</span><small>Tam ekran</small>';
    host.appendChild(btn);

    const sync = () => {
        const active = !!currentFullscreen();
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-label', active ? 'Tam ekrandan çık' : 'Tam ekranı aç');
        btn.querySelector('small').textContent = active ? 'Çık' : 'Tam ekran';
    };

    btn.addEventListener('click', async () => {
        try {
            if (currentFullscreen()) {
                const result = exitFullscreen();
                if (result && typeof result.then === 'function') await result;
            } else {
                const result = requestFullscreen(document.documentElement);
                if (!result) {
                    showToast('Bu tarayıcı tam ekran modunu desteklemiyor.', 'error');
                    return;
                }
                if (typeof result.then === 'function') await result;
            }
        } catch (e) {
            showToast('Tam ekran modu açılamadı.', 'error');
        }
        sync();
    });

    document.addEventListener('fullscreenchange', sync);
    document.addEventListener('webkitfullscreenchange', sync);
    sync();
})();
