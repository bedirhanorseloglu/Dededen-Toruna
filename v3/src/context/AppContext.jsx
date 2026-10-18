import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    db, 
    collection, 
    onSnapshot, 
    query, 
    where, 
    doc, 
    setDoc, 
    addDoc,
    updateDoc, 
    deleteDoc,
    getDocs,
    orderBy,
    limit,
    writeBatch,
    serverTimestamp 
} from '../config/firebase';
import { DEFAULT_TABLES, MENU_PRODUCTS, MENU_CATEGORIES } from '../data/menu';
import { playChimeSound, playKitchenNewOrderSound, playDeliveryAlertSound, speakTurkish, setAudioMuted, isAudioMuted } from '../services/audioService';

const AppContext = createContext(null);

/* ---------------- Tam ekran yardımcıları (Chrome, Samsung Internet, Safari/iPad) ---------------- */
const FS_PREF_KEY = 'adisyon_wants_fullscreen';

function getFullscreenElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function isFullscreenSupported() {
    const el = document.documentElement;
    return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

// Ana ekrana eklenmiş uygulama olarak açıldıysa zaten tarayıcı çubuğu yoktur
function isStandaloneApp() {
    return window.matchMedia?.('(display-mode: fullscreen)').matches ||
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;
}

function wantsFullscreen() {
    return localStorage.getItem(FS_PREF_KEY) !== '0';
}

function setWantsFullscreen(value) {
    localStorage.setItem(FS_PREF_KEY, value ? '1' : '0');
}

function enterFullscreen() {
    const el = document.documentElement;
    try {
        if (el.requestFullscreen) {
            const p = el.requestFullscreen({ navigationUI: 'hide' });
            if (p && p.catch) p.catch(() => {});
        } else if (el.webkitRequestFullscreen) {
            el.webkitRequestFullscreen();
        }
    } catch {
        // Kullanıcı etkileşimi olmadan çağrıldıysa tarayıcı reddeder; bir sonraki dokunuşta tekrar denenir
    }
}

function exitFullscreen() {
    try {
        if (document.exitFullscreen) {
            const p = document.exitFullscreen();
            if (p && p.catch) p.catch(() => {});
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        }
    } catch {}
}

export const DEFAULT_USERS = [
    { id: "mgr-1", name: "Yönetici (Patron)", role: "admin", pin: "197300", phone: "0532 100 20 30" }
];

export function AppProvider({ children }) {
    // Current active user
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const saved = sessionStorage.getItem('adisyon_user');
            return saved ? JSON.parse(saved) : null;
        } catch {
            return null;
        }
    });

    // Navigation state
    const [currentView, setCurrentView] = useState(() => {
        try {
            const saved = sessionStorage.getItem('adisyon_view');
            return saved || 'login';
        } catch {
            return 'login';
        }
    });

    const [selectedTableId, setSelectedTableId] = useState(null);
    const [soundEnabled, setSoundEnabled] = useState(() => !isAudioMuted());
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [toast, setToast] = useState(null);

    // Modern Evrensel Onay Modalı State'i
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        title: 'İşlemi Onaylayın',
        message: '',
        confirmText: 'Evet, Onayla',
        cancelText: 'Vazgeç',
        variant: 'danger',
        onConfirm: null,
        onCancel: null
    });

    // Active orders real-time map: { [table_no]: orderData }
    const [activeOrders, setActiveOrders] = useState({});
    const [loadingOrders, setLoadingOrders] = useState(true);

    // Synchronize user to sessionStorage
    useEffect(() => {
        if (currentUser) {
            sessionStorage.setItem('adisyon_user', JSON.stringify(currentUser));
        } else {
            sessionStorage.removeItem('adisyon_user');
        }
    }, [currentUser]);

    // Synchronize view to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('adisyon_view', currentView);
    }, [currentView]);

    // Listen to Fullscreen changes (standart + webkit)
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!getFullscreenElement() || isStandaloneApp());
        };
        handleFullscreenChange();
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, []);

    // "Yapışkan" tam ekran: Kullanıcı isteyerek tam ekrandan çıkmadığı sürece (wantsFullscreen() !== false)
    // tam ekran düşerse kullanıcı ilk ekrana dokunduğunda otomatik tam ekrana geçer.
    useEffect(() => {
        const reenter = (e) => {
            // Butonlara ve navigasyon kontrollerine dokunulduğunda tetiklenme
            if (e?.target?.closest?.('.header-controls') || e?.target?.closest?.('button')) return;
            if (wantsFullscreen() && !getFullscreenElement() && !isStandaloneApp()) {
                enterFullscreen();
            }
        };
        document.addEventListener('pointerup', reenter, true);
        return () => document.removeEventListener('pointerup', reenter, true);
    }, []);

    // Real-time Firestore Listener for Active Orders
    useEffect(() => {
        const q = query(collection(db, "orders"), where("status", "in", ["open", "active", "cooking", "ready"]));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ordersMap = {};
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                const tableNo = String(data.table_no || data.table_id || '');
                if (tableNo) {
                    ordersMap[tableNo] = { id: docSnap.id, ...data, table_no: Number(tableNo) };
                }
            });
            setActiveOrders(ordersMap);
            setLoadingOrders(false);
        }, (error) => {
            console.error("Orders listener error:", error);
            setLoadingOrders(false);
        });

        return () => unsubscribe();
    }, []);

    // Printer Settings (Centralized in Firestore settings/printer)
    const [printerSettings, setPrinterSettings] = useState({
        ip: '',
        port: '9100',
        mode: 'rawbt', // 'rawbt' (Otomatik Ağ / RawBT) | 'browser' (Tarayıcı Önizleme)
        autoPrintKitchen: true,
        paperWidth: '80mm',
        printerName: 'Xprinter XP-Q805K Mutfak'
    });

    // Real-time Firestore Listener for Centralized Printer Settings
    useEffect(() => {
        const unsubPrinter = onSnapshot(doc(db, "settings", "printer"), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setPrinterSettings(prev => ({ ...prev, ...data }));
            }
        }, (err) => {
            console.warn("Printer settings listener error:", err);
        });
        return () => unsubPrinter();
    }, []);

    // ------------------------------------------------------------------
    // MENÜ YÖNETİMİ (Dinamik Menü & Fiyatlandırma)
    // ------------------------------------------------------------------
    const [menuProducts, setMenuProducts] = useState(MENU_PRODUCTS);

    // Canlı Menü Dinleyicisi (Default katalog ile Firestore belgelerini akıllıca birleştirir)
    useEffect(() => {
        const unsubMenu = onSnapshot(collection(db, "menu_products"), (snap) => {
            const productMap = new Map();
            // 1. Önce standart menüdeki ürünleri varsayılan olarak yükle
            MENU_PRODUCTS.forEach(p => productMap.set(p.id, { ...p }));

            // 2. Firestore'daki kayıtları üzerine birleştir (fiyat güncellemeleri, yeni eklenen ürünler veya silinenler)
            snap.docs.forEach(d => {
                const data = { id: d.id, ...d.data() };
                if (data.deleted === true) {
                    productMap.delete(d.id);
                } else {
                    productMap.set(d.id, data);
                }
            });

            const list = Array.from(productMap.values());
            setMenuProducts(list);
        }, (err) => {
            console.warn("Menu products listener fallback to default menu:", err.message);
            setMenuProducts(MENU_PRODUCTS);
        });
        return () => unsubMenu();
    }, []);

    const saveMenuItem = async (item) => {
        const id = item.id || `p_${Date.now()}`;
        const itemData = {
            ...item,
            id,
            name: item.name.trim(),
            price: Number(item.price) || 0,
            category_id: item.category_id || 'diger',
            active: item.active !== false,
            deleted: false,
            updated_at: new Date().toISOString()
        };

        // 1. İyimser yerel state güncellemesi (Ekranlar ve garsonlar anında yeni fiyatı görür)
        setMenuProducts(prev => {
            const idx = prev.findIndex(p => p.id === id);
            if (idx >= 0) {
                const next = [...prev];
                next[idx] = itemData;
                return next;
            }
            return [itemData, ...prev];
        });

        // 2. Firestore senkronizasyonu
        try {
            await setDoc(doc(db, "menu_products", id), itemData, { merge: true });
        } catch (e) {
            console.warn("Firestore menu save error:", e.message);
        }

        showToast(`"${itemData.name}" güncellendi!`, "success");
        return itemData;
    };

    const toggleMenuItemAvailability = async (id, currentActive) => {
        // 1. İyimser yerel state güncellemesi
        setMenuProducts(prev => prev.map(p => p.id === id ? { ...p, active: !currentActive } : p));

        // 2. Firestore senkronizasyonu
        try {
            const existing = menuProducts.find(p => p.id === id);
            if (existing) {
                await setDoc(doc(db, "menu_products", id), {
                    ...existing,
                    active: !currentActive,
                    updated_at: new Date().toISOString()
                }, { merge: true });
            } else {
                await updateDoc(doc(db, "menu_products", id), {
                    active: !currentActive,
                    updated_at: new Date().toISOString()
                });
            }
        } catch (e) {
            console.warn("Firestore menu toggle error:", e.message);
        }

        showToast(currentActive ? "Ürün 'Tükendi' olarak işaretlendi" : "Ürün tekrar satışa açıldı", "info");
    };

    const deleteMenuItem = async (id, name = '') => {
        // 1. İyimser yerel state silme
        setMenuProducts(prev => prev.filter(p => p.id !== id));

        // 2. Firestore'da silindi (soft delete) olarak işaretle
        try {
            await setDoc(doc(db, "menu_products", id), {
                id,
                deleted: true,
                updated_at: new Date().toISOString()
            }, { merge: true });
        } catch (e) {
            console.warn("Firestore menu delete error:", e.message);
        }

        showToast(name ? `"${name}" menüden silindi` : "Ürün menüden silindi", "info");
    };

    const seedDefaultMenu = async () => {
        try {
            const batch = writeBatch(db);
            MENU_PRODUCTS.forEach(p => {
                const ref = doc(db, "menu_products", p.id);
                batch.set(ref, {
                    ...p,
                    deleted: false,
                    updated_at: new Date().toISOString()
                }, { merge: true });
            });
            await batch.commit();
            showToast("Varsayılan menü veritabanına aktarıldı!", "success");
        } catch (e) {
            console.warn("Seed menu error:", e.message);
            setMenuProducts(MENU_PRODUCTS);
            showToast("Varsayılan menü yüklendi.", "info");
        }
    };

    // ------------------------------------------------------------------
    // GİDERLER & ÖDEMELER MODÜLÜ (Restoran Harcamaları & Kasa Takibi)
    // ------------------------------------------------------------------
    const [expenses, setExpenses] = useState(() => {
        try {
            const saved = localStorage.getItem('adisyon_expenses_backup');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        const qExp = query(
            collection(db, "expenses"),
            orderBy("created_at", "desc"),
            limit(300)
        );
        const unsubExp = onSnapshot(qExp, (snap) => {
            const list = snap.docs.map(d => ({ ...d.data(), id: d.id, docId: d.id }));
            setExpenses(list);
            try { localStorage.setItem('adisyon_expenses_backup', JSON.stringify(list)); } catch (e) {}
        }, (err) => {
            console.warn("Expenses listener error (using localStorage):", err);
            try {
                const saved = localStorage.getItem('adisyon_expenses_backup');
                if (saved) setExpenses(JSON.parse(saved));
            } catch (e) {}
        });
        return () => unsubExp();
    }, []);

    const addExpense = async (data) => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const defaultLocalDate = `${year}-${month}-${day}`;

        const expenseDocRef = doc(collection(db, "expenses"));
        const newExpense = {
            id: expenseDocRef.id,
            docId: expenseDocRef.id,
            title: (data.title || '').trim(),
            amount: Number(data.amount) || 0,
            category: data.category || 'diger',
            payment_method: data.payment_method || 'cash',
            date: data.date || defaultLocalDate,
            notes: (data.notes || '').trim(),
            created_by: currentUser?.name || 'Yönetici',
            created_at: new Date().toISOString()
        };

        try {
            await setDoc(expenseDocRef, newExpense);
        } catch (err) {
            console.warn("Firestore expense add error, saving locally:", err);
            setExpenses(prev => {
                const next = [newExpense, ...prev.filter(x => x.id !== newExpense.id)];
                try { localStorage.setItem('adisyon_expenses_backup', JSON.stringify(next)); } catch (e) {}
                return next;
            });
        }
        showToast("Gider kaydı başarıyla eklendi!", "success");
        return newExpense;
    };

    const deleteExpense = async (id) => {
        try {
            // 1. Doğrudan Firestore document ID ile sil
            await deleteDoc(doc(db, "expenses", id));

            // 2. Eğer id eski verilerden kalan bir 'exp_...' alanıysa sorguyla bul ve sil
            const q = query(collection(db, "expenses"), where("id", "==", id));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                await deleteDoc(d.ref);
            }
        } catch (err) {
            console.warn("Firestore delete error, removing locally:", err);
        }
        setExpenses(prev => {
            const next = prev.filter(e => e.id !== id && e.docId !== id);
            try { localStorage.setItem('adisyon_expenses_backup', JSON.stringify(next)); } catch (e) {}
            return next;
        });
        showToast("Gider kaydı silindi.", "info");
    };

    const updateExpense = async (id, updatedData) => {
        const payload = {
            title: (updatedData.title || '').trim(),
            amount: Number(updatedData.amount) || 0,
            category: updatedData.category || 'diger',
            payment_method: updatedData.payment_method || 'cash',
            date: updatedData.date,
            notes: (updatedData.notes || '').trim(),
            updated_at: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "expenses", id), payload, { merge: true });
            const q = query(collection(db, "expenses"), where("id", "==", id));
            const snap = await getDocs(q);
            for (const d of snap.docs) {
                await setDoc(d.ref, payload, { merge: true });
            }
        } catch (err) {
            console.warn("Firestore expense update error, updating locally:", err);
        }

        setExpenses(prev => {
            const next = prev.map(e => (e.id === id || e.docId === id) ? { ...e, ...payload } : e);
            try { localStorage.setItem('adisyon_expenses_backup', JSON.stringify(next)); } catch (e) {}
            return next;
        });

        showToast("Gider kaydı güncellendi!", "success");
        return { id, ...payload };
    };

    const savePrinterSettings = async (newSettings) => {
        try {
            await setDoc(doc(db, "settings", "printer"), {
                ...printerSettings,
                ...newSettings,
                updated_at: new Date().toISOString()
            }, { merge: true });
            setPrinterSettings(prev => ({ ...prev, ...newSettings }));
            showToast("Yazıcı ayarları kaydedildi! Tüm garson tabletlerine otomatik uygulandı.", "success");
            return true;
        } catch (err) {
            console.error("Save printer settings error:", err);
            showToast("Yazıcı ayarları kaydedilemedi: " + err.message, "danger");
            return false;
        }
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type, id: Date.now() });
        setTimeout(() => setToast(null), 3500);
    };

    const login = (user) => {
        setCurrentUser(user);
        if (user.role === 'admin') setCurrentView('admin');
        else if (user.role === 'kitchen') setCurrentView('kitchen');
        else setCurrentView('waiter');
        showToast(`Hoş geldiniz, ${user.name}!`, 'success');

        // Otomatik tam ekrana geç (Müşteri İsteği: Siteye girildiği an tam ekrana geçsin)
        setWantsFullscreen(true);
        enterFullscreen();
    };

    const logout = () => {
        setCurrentUser(null);
        setSelectedTableId(null);
        setCurrentView('login');
        sessionStorage.removeItem('adisyon_user');
        sessionStorage.removeItem('adisyon_view');
        showToast('Başarıyla çıkış yapıldı.', 'info');
    };

    const navigateTo = (view, tableId = null) => {
        if (tableId) setSelectedTableId(String(tableId));
        setCurrentView(view);
    };

    const toggleFullscreen = async () => {
        const fsEl = getFullscreenElement();
        if (fsEl) {
            setWantsFullscreen(false);
            setIsFullscreen(false);
            try {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if (document.webkitExitFullscreen) {
                    await document.webkitExitFullscreen();
                }
            } catch (err) {
                console.warn("exitFullscreen error:", err);
            }
            showToast('Tam ekrandan çıkıldı', 'info');
            return;
        }

        if (!isFullscreenSupported()) {
            showToast('Bu cihazın tarayıcısı tam ekranı desteklemiyor. Tarayıcı menüsünden "Ana Ekrana Ekle" yapıp uygulamayı oradan açın.', 'warning');
            return;
        }
        setWantsFullscreen(true);
        enterFullscreen();
        setIsFullscreen(true);
        showToast('Tam ekran yapıldı', 'success');
    };

    // Modern Evrensel Onay Modalı Çağırma Fonksiyonu (Promise Döndürür)
    const showConfirm = (optionsOrTitle = {}, maybeMessage, maybeOnConfirm, maybeVariant) => {
        let title = 'İşlemi Onaylayın';
        let message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?';
        let confirmText = 'Evet, Onayla';
        let cancelText = 'Vazgeç';
        let variant = 'danger';
        let legacyCallback = null;

        if (typeof optionsOrTitle === 'object' && optionsOrTitle !== null) {
            title = optionsOrTitle.title || title;
            message = optionsOrTitle.message || message;
            confirmText = optionsOrTitle.confirmText || confirmText;
            cancelText = optionsOrTitle.cancelText || cancelText;
            variant = optionsOrTitle.variant || variant;
        } else if (typeof optionsOrTitle === 'string') {
            title = optionsOrTitle;
            if (typeof maybeMessage === 'string') message = maybeMessage;
            if (typeof maybeOnConfirm === 'function') legacyCallback = maybeOnConfirm;
            if (typeof maybeVariant === 'string') variant = maybeVariant;
        }

        return new Promise((resolve) => {
            setConfirmModal({
                isOpen: true,
                title,
                message,
                confirmText,
                cancelText,
                variant,
                onConfirm: () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    if (legacyCallback) legacyCallback();
                    resolve(true);
                },
                onCancel: () => {
                    setConfirmModal(prev => ({ ...prev, isOpen: false }));
                    resolve(false);
                }
            });
        });
    };

    const toggleSound = () => {
        setSoundEnabled(prev => {
            const next = !prev;
            setAudioMuted(!next);
            showToast(next ? "Sesler açıldı 🔔" : "Sesler kapatıldı 🔕", "info");
            return next;
        });
    };

    // Masayı hem yerelde hem Firestore'da tüm ID varyasyonlarıyla eksiksiz kapat
    const closeTableOrder = async (tableNo, orderDocId = null) => {
        const tStr = String(tableNo);
        const tNum = Number(tableNo);

        // 1. UI'da masayı HEMEN boşa çek (Anında yeşil/boş olur)
        setActiveOrders(prev => {
            const next = { ...prev };
            delete next[tStr];
            return next;
        });

        // 2. Bilinen doğrudan ID'leri sil
        const idsToDelete = new Set();
        if (orderDocId) idsToDelete.add(orderDocId);
        idsToDelete.add(`table_${tStr}`);
        idsToDelete.add(`order_${tStr}`);
        idsToDelete.add(tStr);

        for (const id of idsToDelete) {
            try {
                await deleteDoc(doc(db, "orders", id));
            } catch (e) {}
        }

        // 3. Firestore'da bu masaya ait açık kalan tüm sipariş dökümanlarını (v2 rastgele ID'leri dahil) sil
        try {
            const qOpen = query(
                collection(db, "orders"),
                where("table_no", "in", [tNum, tStr])
            );
            const snap = await getDocs(qOpen);
            for (const d of snap.docs) {
                try {
                    await deleteDoc(doc(db, "orders", d.id));
                } catch (e) {}
            }
        } catch (e) {}

        try {
            const qOpenById = query(
                collection(db, "orders"),
                where("table_id", "in", [tNum, tStr])
            );
            const snap2 = await getDocs(qOpenById);
            for (const d of snap2.docs) {
                try {
                    await deleteDoc(doc(db, "orders", d.id));
                } catch (e) {}
            }
        } catch (e) {}
    };

    return (
        <AppContext.Provider value={{
            currentUser,
            currentView,
            selectedTableId,
            soundEnabled,
            isFullscreen,
            toast,
            activeOrders,
            loadingOrders,
            tables: DEFAULT_TABLES,
            login,
            logout,
            navigateTo,
            toggleFullscreen,
            toggleSound,
            showToast,
            closeTableOrder,
            printerSettings,
            savePrinterSettings,
            confirmModal,
            showConfirm,
            menuProducts,
            categories: MENU_CATEGORIES,
            saveMenuItem,
            toggleMenuItemAvailability,
            deleteMenuItem,
            seedDefaultMenu,
            expenses,
            addExpense,
            updateExpense,
            deleteExpense
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within an AppProvider");
    return context;
}
