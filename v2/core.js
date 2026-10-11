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
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

if (typeof window !== 'undefined') {
    const unlockAudio = () => {
        initAudio();
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
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'tr-TR';
            utterance.rate = 1.05;
            utterance.pitch = 1.05;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    } catch (e) { }
}

export function announceNewOrder(tableNo, items = []) {
    try {
        const pendingItems = items.filter(i => i.status !== 'delivered');
        const targetList = pendingItems.length > 0 ? pendingItems : items;
        const isExtra = items.some(i => i.status === 'delivered');
        const summary = targetList.slice(0, 4).map(i => `${i.quantity} ${i.name}`).join(', ');
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
