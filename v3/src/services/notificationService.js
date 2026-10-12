// Sistem ve Arka Plan Bildirim Servisi (Service Worker + OS Notification)

export function registerServiceWorker() {
    try {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
    } catch(e) {}
}

export async function requestNotificationPermission() {
    try {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            registerServiceWorker();
            if (Notification.permission === 'default') {
                return await Notification.requestPermission();
            }
            return Notification.permission;
        }
    } catch(e) {}
    return 'denied';
}

export async function showSystemNotification(title, body, tag = null) {
    try {
        if (typeof window === 'undefined' || !('Notification' in window)) return;
        
        if (Notification.permission === 'default') {
            await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') return;

        const options = {
            body: body,
            icon: 'logo.png',
            badge: 'logo.png',
            tag: tag || ('order-' + Date.now()),
            renotify: true,
            vibrate: [250, 100, 250, 100, 250],
            requireInteraction: true,
            silent: false
        };

        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.ready;
                if (reg && reg.showNotification) {
                    return await reg.showNotification(title, options);
                }
            } catch(swErr) {}
        }
        return new Notification(title, options);
    } catch(e) {}
}

let flashTimer = null;
export function flashTabTitle(alertText, originalTitle = (typeof document !== 'undefined' ? document.title : '')) {
    try {
        if (typeof document === 'undefined' || !document.hidden) return;
        if (flashTimer) clearInterval(flashTimer);
        let toggle = false;
        flashTimer = setInterval(() => {
            if (!document.hidden) {
                clearInterval(flashTimer);
                document.title = originalTitle;
                return;
            }
            document.title = toggle ? alertText : originalTitle;
            toggle = !toggle;
        }, 850);

        const stop = () => {
            if (flashTimer) clearInterval(flashTimer);
            document.title = originalTitle;
            window.removeEventListener('focus', stop);
        };
        window.addEventListener('focus', stop);
    } catch(e) {}
}
