import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
    db, 
    collection, 
    onSnapshot, 
    query, 
    where, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc,
    getDocs,
    serverTimestamp 
} from '../config/firebase';
import { DEFAULT_TABLES } from '../data/menu';
import { playChimeSound, playKitchenNewOrderSound, playDeliveryAlertSound, speakTurkish } from '../services/audioService';

const AppContext = createContext(null);

export const DEFAULT_USERS = [
    { id: "mgr-1", name: "Yönetici (Patron)", role: "admin", pin: "197300", phone: "0532 100 20 30" },
    { id: "wtr-1", name: "Ahmet", role: "waiter", pin: "123456", phone: "0541 222 33 44" },
    { id: "wtr-2", name: "Mehmet", role: "waiter", pin: "654321", phone: "0541 333 44 55" },
    { id: "ktc-1", name: "Usta (Mutfak)", role: "kitchen", pin: "112233", phone: "0530 111 22 33" }
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
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [toast, setToast] = useState(null);

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

    // Listen to Fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
        try {
            if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
                document.documentElement.requestFullscreen().catch(() => {});
            }
        } catch {
            // Tarayıcı güvenlik kısıtlaması fallback
        }
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
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.warn("Fullscreen toggle error:", err);
        }
    };

    const toggleSound = () => {
        setSoundEnabled(prev => !prev);
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
            closeTableOrder
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
