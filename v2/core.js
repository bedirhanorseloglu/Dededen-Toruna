import {
    db,
    collection,
    doc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    writeBatch
} from "./firebase-config.js";
import { formatMoney, printOrderReceipt } from "./printer.js";
import { MENU_CATEGORIES, MENU_PRODUCTS } from "./menu-data.js";

export function getRoleCollectionName(role) {
    if (role === 'admin' || role === 'manager') return 'managers';
    if (role === 'kitchen') return 'kitchen_staff';
    return 'waiters';
}

export const DEFAULT_CATEGORIES = MENU_CATEGORIES;
export const DEFAULT_PRODUCTS = MENU_PRODUCTS;
export const DEFAULT_TABLES = Array.from({ length: 15 }, (_, i) => ({ id: String(i + 1), table_no: i + 1, active: true }));

export function getActiveUser() {
    try {
        const sessionUser = sessionStorage.getItem('cafe_active_user');
        if (sessionUser) return JSON.parse(sessionUser);
    } catch(e) {}
    try {
        const localUser = localStorage.getItem('cafe_active_user');
        if (localUser) return JSON.parse(localUser);
    } catch(e) {}
    return null;
}

export function setActiveUser(user) {
    if (!user) return;
    try {
        sessionStorage.setItem('cafe_active_user', JSON.stringify(user));
    } catch(e) {}
    try {
        localStorage.setItem('cafe_active_user', JSON.stringify(user));
    } catch(e) {}
}

export function clearActiveUser() {
    try { sessionStorage.removeItem('cafe_active_user'); } catch(e) {}
    try { localStorage.removeItem('cafe_active_user'); } catch(e) {}
    window.location.href = 'index.html';
}

export function checkAuth(requiredRole = null) {
    let user = getActiveUser();

    // 1. Yönetici Paneli Koruması:
    // Eğer doğrudan admin paneline girildiyse ve tarayıcıda eski garson/mutfak oturumu kalmışsa,
    // kullanıcıyı ASLA waiter'a veya mutfağa fırlatma! Yönetici yetkisi ver ve paneli aç.
    if (requiredRole === 'admin') {
        if (!user || user.role !== 'admin') {
            user = { 
                id: "mgr-1", 
                name: "Yönetici (Patron)", 
                role: "admin", 
                pin: "197300", 
                active: true,
                permissions: ["all"]
            };
            setActiveUser(user);
        }
        return user;
    }

    if (!user) {
        window.location.href = 'index.html';
        return null;
    }

    if (requiredRole) {
        // 2. Mutfak Ekranı
        if (requiredRole === 'kitchen' && user.role !== 'kitchen' && user.role !== 'admin') {
            user = { id: "ktc-1", name: "Fadime", role: "kitchen", pin: "112233", active: true };
            setActiveUser(user);
            return user;
        }

        // 3. Garson Ekranı
        if (requiredRole === 'waiter' && user.role !== 'waiter' && user.role !== 'admin') {
            user = { id: "wtr-1", name: "Ahmet", role: "waiter", pin: "123456", active: true };
            setActiveUser(user);
            return user;
        }
    }

    return user;
}

const channel = new BroadcastChannel('cafe_live_orders_channel');

export function broadcastOrderChange(type, data) {
    channel.postMessage({ type, data, timestamp: Date.now() });
}

export function onOrderChange(callback) {
    channel.onmessage = (event) => {
        callback(event.data);
    };
    window.addEventListener('storage', (e) => {
        if (e.key === 'cafe_cached_orders') {
            callback({ type: 'storage_sync', timestamp: Date.now() });
        }
    });
}

let audioCtx = null;
export function initAudio() {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (audioCtx.state === 'suspended') audioCtx.resume();
    } catch(e) {}
}

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

        // Arka planda veya ekran kilitliyken Service Worker üzerinden sistem bildirimi göster
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

// Sekme arka plandayken başlığı yanıp söndürme (Tab title alert)
let flashTitleTimer = null;
export function flashTabTitle(alertText, originalTitle = (typeof document !== 'undefined' ? document.title : '')) {
    try {
        if (typeof document === 'undefined' || !document.hidden) return;
        if (flashTitleTimer) clearInterval(flashTitleTimer);
        let toggle = false;
        flashTitleTimer = setInterval(() => {
            if (!document.hidden) {
                clearInterval(flashTitleTimer);
                document.title = originalTitle;
                return;
            }
            document.title = toggle ? alertText : originalTitle;
            toggle = !toggle;
        }, 850);
        
        const stopFlashing = () => {
            if (flashTitleTimer) clearInterval(flashTitleTimer);
            document.title = originalTitle;
            window.removeEventListener('focus', stopFlashing);
        };
        window.addEventListener('focus', stopFlashing);
    } catch(e) {}
}

if (typeof window !== 'undefined') {
    registerServiceWorker();
    const unlockAudio = () => {
        initAudio();
        requestNotificationPermission();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('click', unlockAudio, { passive: true });
    window.addEventListener('touchstart', unlockAudio, { passive: true });
}

export function playNotificationSound() {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(987.77, now);
        gain1.gain.setValueAtTime(0.5, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.15);
        gain2.gain.setValueAtTime(0.5, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.7);
    } catch (e) { }
}

export function playOrderReadySound() {
    try {
        initAudio();
        const now = audioCtx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do (C5) - Mi (E5) - Sol (G5) - Do (C6)
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const start = now + (idx * 0.11);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.45, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.65);
        });
    } catch (e) { }
}

export function speakAnnouncement(text) {
    try {
        if ('speechSynthesis' in window && text) {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'tr-TR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    } catch (e) { }
}

export function announceNewOrder(tableNo, items = []) {
    try {
        const pendingItems = (items || []).filter(i => i && i.status !== 'delivered');
        if (!pendingItems.length) return; // Teslim edilmiş/tamamlanmış siparişleri ASLA yeni sipariş diye mutfağa okuma!
        const isExtra = (items || []).some(i => i && i.status === 'delivered');
        const summary = pendingItems.slice(0, 4).map(i => `${i.quantity} ${i.name}`).join(', ');
        const text = isExtra ? `Masa ${tableNo} ek sipariş: ${summary}` : `Yeni sipariş: Masa ${tableNo}! ${summary}`;
        speakAnnouncement(text);
    } catch (e) { }
}

export {
    db,
    collection,
    doc,
    getDocs,
    setDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    serverTimestamp,
    formatMoney,
    printOrderReceipt
};


