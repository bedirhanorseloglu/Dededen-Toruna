import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { formatMoney, MENU_PRODUCTS } from '../data/menu';
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
    orderBy,
    limit
} from '../config/firebase';
import { recordCompletedOrder } from '../services/analyticsService';
import { printCustomerReceipt, printKitchenOrderTicket } from '../services/printService';
import { playChimeSound, playDeliveryAlertSound } from '../services/audioService';
import {
    TrendingUp,
    CreditCard,
    Banknote,
    Receipt,
    Users,
    Calendar,
    CalendarDays,
    Search,
    Plus,
    Key,
    Trash2,
    X,
    ChefHat,
    ShieldCheck,
    Dices,
    Printer,
    MoveHorizontal,
    Scissors,
    Minus,
    MessageSquare,
    CheckCircle2,
    Clock,
    Tag,
    Zap
} from 'lucide-react';
import TableCardGrid from '../components/TableCardGrid';
import DiscountModal from '../components/DiscountModal';
import QuickAmountModal from '../components/QuickAmountModal';
import AdminAnalyticsDashboard from '../components/AdminAnalyticsDashboard';
import AdminStaffManagement from '../components/AdminStaffManagement';
import AdminPrinterSettings from '../components/AdminPrinterSettings';
import AdminMenuManagement from '../components/AdminMenuManagement';
import AdminExpenses from '../components/AdminExpenses';
import DailyClosingModal from '../components/DailyClosingModal';
import ModernDatePicker from '../components/ModernDatePicker';

export default function AdminView() {
    const {
        tables,
        activeOrders,
        navigateTo,
        currentUser,
        showToast,
        showConfirm,
        closeTableOrder,
        printerSettings,
        savePrinterSettings,
        menuProducts,
        categories,
        saveMenuItem,
        toggleMenuItemAvailability,
        deleteMenuItem,
        seedDefaultMenu,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense
    } = useApp();
    const [currentActiveTab, setCurrentActiveTab] = useState('tables'); // 'tables' | 'analytics' | 'menu' | 'expenses' | 'staff' | 'printer'
    const [currentPeriod, setCurrentPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
    const [productSearch, setProductSearch] = useState('');
    const [completedOrders, setCompletedOrders] = useState([]);
    const [showDailyClosingModal, setShowDailyClosingModal] = useState(false);

    // Seçilen dönemin anlık cirosu (Giderler ve Net Kâr hesabı için)
    const currentPeriodRevenue = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return completedOrders.filter(o => {
            const t = new Date(o.created_at || o.closed_at || 0).getTime();
            if (currentPeriod === 'today') return t >= startOfToday;
            if (currentPeriod === 'week') return t >= startOfWeek;
            if (currentPeriod === 'month') return t >= startOfMonth;
            return true;
        }).reduce((s, o) => s + (Number(o.total) || 0), 0);
    }, [completedOrders, currentPeriod]);

    // Merkezi Yazıcı Ayarları Form State
    const [printerIpInput, setPrinterIpInput] = useState(printerSettings?.ip || '');
    const [printerPortInput, setPrinterPortInput] = useState(printerSettings?.port || '9100');
    const [printerModeInput, setPrinterModeInput] = useState(printerSettings?.mode || 'rawbt');
    const [printerAutoInput, setPrinterAutoInput] = useState(printerSettings?.autoPrintKitchen !== false);

    useEffect(() => {
        if (printerSettings) {
            setPrinterIpInput(printerSettings.ip || '');
            setPrinterPortInput(printerSettings.port || '9100');
            setPrinterModeInput(printerSettings.mode || 'rawbt');
            setPrinterAutoInput(printerSettings.autoPrintKitchen !== false);
        }
    }, [printerSettings]);

    const handleSavePrinterSettings = async () => {
        await savePrinterSettings({
            ip: printerIpInput.trim(),
            port: printerPortInput.trim() || '9100',
            mode: printerModeInput,
            autoPrintKitchen: printerAutoInput
        });
    };

    const handleTestPrintTicket = () => {
        const testOrder = {
            table_no: 1,
            waiter_name: currentUser?.name || 'Yönetici (Deneme)',
            items: [
                { name: 'Köfte Porsiyon', quantity: 2, price: 500, status: 'cooking', notes: 'Bol acılı test' },
                { name: 'Kaşarlı Gözleme', quantity: 1, price: 200, status: 'cooking' }
            ]
        };
        printKitchenOrderTicket(testOrder, {
            ip: printerIpInput,
            port: printerPortInput,
            mode: printerModeInput
        });
        showToast("Test mutfak fişi basılıyor...", "info");
    };

    // Staff Lists from Firestore
    const [waitersList, setWaitersList] = useState([]);
    const [kitchenList, setKitchenList] = useState([]);
    const [managersList, setManagersList] = useState([]);

    // Modals
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [staffModalRole, setStaffModalRole] = useState('waiter');
    const [staffNameInput, setStaffNameInput] = useState('');
    const [staffHireDateInput, setStaffHireDateInput] = useState('');
    const [staffPhoneInput, setStaffPhoneInput] = useState('');
    const [staffPinInput, setStaffPinInput] = useState('');

    const [showPinModal, setShowPinModal] = useState(false);
    const [editingStaffPin, setEditingStaffPin] = useState(null); // { id, role, name }
    const [newPinInput, setNewPinInput] = useState('');
    const [selectedDrawerTable, setSelectedDrawerTable] = useState(null); // Açık adisyon çekmecesi (desktop: sağdan, mobil: alttan)

    // Masa Taşı & Birleştir Modalı
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveSourceTable, setMoveSourceTable] = useState(null);
    const [moveTargetTable, setMoveTargetTable] = useState('');

    // Parçalı / Kısmi Hesap Bölme Modalı
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitTable, setSplitTable] = useState(null);
    const [splitSelections, setSplitSelections] = useState({});
    const [splitPayMethod, setSplitPayMethod] = useState('cash');

    // Canlı Masalar Sekmesinde Garson Takip Filtresi
    const [selectedWaiterFilter, setSelectedWaiterFilter] = useState('all');

    // Sipariş Notu Düzenleme Modalı
    const [noteModalItemIdx, setNoteModalItemIdx] = useState(null);
    const [itemNoteInput, setItemNoteInput] = useState('');

    // İndirim Modalı (Çekmece için)
    const [showDrawerDiscountModal, setShowDrawerDiscountModal] = useState(false);

    // ⚡ Hızlı Tutar ile Kapat Modalı (Kurtarıcı Emniyet Sübabı)
    const [showQuickAmountModal, setShowQuickAmountModal] = useState(false);

    // Real-Time (Canlı) Kapanan Sipariş Dinleyicisi (Farklı cihazlardan kapanan hesaplar anında yansır)
    useEffect(() => {
        // Eski test önbelleğini otomatik sıfırla (Canlı restoran lansmanı)
        try {
            if (localStorage.getItem('cafe_clean_launch_2026') !== 'true') {
                localStorage.removeItem('cafe_cached_completed_orders');
                localStorage.setItem('cafe_clean_launch_2026', 'true');
            }
        } catch (e) { }

        // 1. Önce yerel arşivden yükle (varsa)
        try {
            const raw = localStorage.getItem('cafe_cached_completed_orders');
            if (raw) {
                const archive = JSON.parse(raw);
                if (Array.isArray(archive) && archive.length > 0) {
                    setCompletedOrders(archive);
                } else {
                    setCompletedOrders([]);
                }
            } else {
                setCompletedOrders([]);
            }
        } catch (e) {
            console.warn("Local archive parse error:", e);
        }

        // 2. Canlı Firestore Dinleyicisi
        const qLive = query(
            collection(db, "completed_orders"),
            orderBy("created_at", "desc"),
            limit(1000)
        );

        const unsubscribe = onSnapshot(qLive, (snapshot) => {
            if (snapshot.empty) {
                // Veritabanı boşsa önbelleği de sıfırla
                setCompletedOrders([]);
                try {
                    localStorage.removeItem('cafe_cached_completed_orders');
                } catch (e) { }
                return;
            }

            const liveDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompletedOrders(liveDocs);
            try {
                localStorage.setItem('cafe_cached_completed_orders', JSON.stringify(liveDocs.slice(0, 1000)));
            } catch (e) { }
        }, (err) => {
            console.warn("Live completed orders listener error:", err);
        });

        return () => unsubscribe();
    }, []);

    // Listen to Waiters, Kitchen Staff, and Managers from Firestore
    useEffect(() => {
        const unsubWaiters = onSnapshot(collection(db, "waiters"), snap => {
            const validList = [];
            snap.docs.forEach(d => {
                const data = d.data();
                const docId = String(d.id || '').trim();
                const waiterName = String(data.name || '').trim();

                // Hayalet/Geçersiz Garson Tespiti:
                // id 'undefined', 'null', 'mgr-' olan veya ismi boş/'undefined' olanlar temizlenir
                if (
                    docId === 'undefined' || 
                    docId === 'null' || 
                    docId === '' || 
                    docId.startsWith('mgr') || 
                    docId.startsWith('admin') ||
                    !waiterName || 
                    waiterName.toLowerCase() === 'undefined' || 
                    waiterName.toLowerCase() === 'null'
                ) {
                    deleteDoc(doc(db, "waiters", d.id)).catch(() => {});
                    return;
                }

                validList.push({ id: d.id, ...data, role: 'waiter' });
            });
            setWaitersList(validList);
        }, () => { });

        const unsubKitchen = onSnapshot(collection(db, "kitchen_staff"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'kitchen' }));
            setKitchenList(list);
        }, () => { });

        const unsubManagers = onSnapshot(collection(db, "managers"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'admin' }));
            setManagersList(list.length > 0 ? list : [
                { id: "mgr-1", name: "Yönetici (Patron)", role: "admin", pin: "197300", phone: "0532 100 20 30", last_login_at: new Date().toISOString() }
            ]);
        }, () => { });

        return () => {
            unsubWaiters();
            unsubKitchen();
            unsubManagers();
        };
    }, []);

    // Filter completed orders by period
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return completedOrders.filter(o => {
            const t = new Date(o.created_at || o.closed_at || 0).getTime();
            if (currentPeriod === 'today') return t >= startOfToday;
            if (currentPeriod === 'week') return t >= startOfWeek;
            if (currentPeriod === 'month') return t >= startOfMonth;
            return true;
        });
    }, [completedOrders, currentPeriod]);

    // Financial Metrics
    const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cashTotal = filteredOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cardTotal = filteredOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;
    const cashPct = totalRevenue > 0 ? (cashTotal / totalRevenue) * 100 : 50;
    const cardPct = totalRevenue > 0 ? (cardTotal / totalRevenue) * 100 : 50;

    // Product Sales Breakdown
    const productStats = useMemo(() => {
        const map = {};
        filteredOrders.forEach(o => {
            (o.items || []).forEach(item => {
                const name = item.name || "Bilinmeyen Ürün";
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                if (!map[name]) map[name] = { name, quantity: 0, revenue: 0 };
                map[name].quantity += qty;
                map[name].revenue += qty * price;
            });
        });
        const list = Object.values(map).sort((a, b) => b.revenue - a.revenue);
        if (productSearch.trim()) {
            const q = productSearch.toLocaleLowerCase('tr-TR');
            return list.filter(p => p.name.toLocaleLowerCase('tr-TR').includes(q));
        }
        return list;
    }, [filteredOrders, productSearch]);

    // Waiter Performance Breakdown
    const waiterStats = useMemo(() => {
        const map = {};
        filteredOrders.forEach(o => {
            const wName = o.waiter_name || "Garson";
            const tot = Number(o.total) || 0;
            if (!map[wName]) map[wName] = { name: wName, orderCount: 0, revenue: 0 };
            map[wName].orderCount += 1;
            map[wName].revenue += tot;
        });
        return Object.values(map).sort((a, b) => b.revenue - a.revenue);
    }, [filteredOrders]);

    // Kitchen Preparation Stats
    const totalKitchenItemsCount = filteredOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);

    // Active Live Tables
    const openOrdersList = Object.values(activeOrders);
    const openTotal = openOrdersList.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const openCount = openOrdersList.length;
    const freeCount = Math.max(0, tables.length - openCount);

    // MÜŞTERİ İSTEĞİ: "BU HAFTA GÜN GÜN TABLOSU" (Pzt-Paz - Ciro, Gider ve Net Kâr)
    const weeklyDayStats = useMemo(() => {
        const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const now = new Date();
        const currentDayOfWeek = (now.getDay() + 6) % 7; // 0 = Pazartesi, 1 = Salı, ...
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - currentDayOfWeek, 12, 0, 0);

        return dayNames.map((name, idx) => {
            const date = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + idx, 12, 0, 0);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const localDateStr = `${year}-${month}-${day}`;
            const displayDateStr = `${day}.${month}`;

            const dayOrders = completedOrders.filter(o => {
                const oDate = (o.created_at || o.closed_at || '').slice(0, 10);
                return oDate === localDateStr;
            });
            const revenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const cash = dayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const card = dayOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const count = dayOrders.length;

            const dayExpenses = (expenses || []).filter(e => {
                const eDate = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
                return eDate === localDateStr;
            });
            const expense = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            const netProfit = revenue - expense;

            return {
                dayName: name,
                dateStr: displayDateStr,
                fullDateStr: localDateStr,
                revenue,
                cash,
                card,
                count,
                expense,
                netProfit,
                isToday: idx === currentDayOfWeek
            };
        });
    }, [completedOrders, expenses]);

    // MÜŞTERİ İSTEĞİ: "BU AY GÜN GÜN TABLOSU" (1..31 - Ciro, Gider ve Net Kâr)
    const monthlyDayStats = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayDate = now.getDate();

        const list = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOrders = completedOrders.filter(o => {
                const oDate = (o.created_at || o.closed_at || '').slice(0, 10);
                return oDate === dateStr;
            });

            const revenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const cash = dayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const card = dayOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const count = dayOrders.length;

            const dayExpenses = (expenses || []).filter(e => {
                const eDate = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
                return eDate === dateStr;
            });
            const expense = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            const netProfit = revenue - expense;

            list.push({
                dayNumber: day,
                dateDisplay: `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`,
                fullDateStr: dateStr,
                revenue,
                cash,
                card,
                count,
                expense,
                netProfit,
                isToday: day === todayDate
            });
        }
        return list;
    }, [completedOrders, expenses]);

    // Admin direct checkout from tables tab
    const handleAdminDirectCheckout = async (tableNo, method) => {
        const order = activeOrders[String(tableNo)];
        if (!order) return;

        const subtotal = Number(order.subtotal || order.total || 0);
        const discount = Number(order.discount || 0);
        const total = Number(order.total !== undefined ? order.total : Math.max(0, subtotal - discount));

        const orderToClose = {
            ...order,
            subtotal,
            discount,
            discount_reason: order.discount_reason || (discount > 0 ? 'İndirim/İkram' : ''),
            total,
            waiter_id: order.waiter_id || currentUser?.id || 'mgr-1',
            waiter_name: order.waiter_name || currentUser?.name || 'Yönetici (Patron)'
        };

        // 1. Bildirim ve sesi ANINDA ver (0 ms gecikme, tam eş zamanlı)
        playChimeSound();
        showToast(`Masa ${tableNo} hesabı (${formatMoney(orderToClose.total)}) kasadan kapatıldı!`, "success");

        try {
            await recordCompletedOrder(orderToClose, method);
            await closeTableOrder(tableNo, order.id);
        } catch (e) {
            console.error("Admin checkout error:", e);
            showToast("Tahsilat sırasında hata oluştu.", "danger");
        }
    };

    // Çekmeceden İndirim Uygula / Kaldır Handlers
    const handleApplyDrawerDiscount = async (discAmount, reason) => {
        if (!selectedDrawerTable || !drawerOrder) return;
        const subtotal = Number(drawerOrder.subtotal || drawerOrder.total || 0);
        const finalD = Math.min(subtotal, Math.max(0, discAmount));
        const finalT = Math.max(0, subtotal - finalD);

        try {
            await updateDoc(doc(db, "orders", `table_${selectedDrawerTable}`), {
                discount: finalD,
                discount_reason: reason || '',
                total: finalT,
                updated_at: new Date().toISOString()
            });
            showToast(`Masa ${selectedDrawerTable} için ${formatMoney(finalD)} indirim uygulandı.`, 'success');
        } catch (e) {
            console.error("Discount apply error:", e);
            showToast("İndirim kaydedilirken hata oluştu.", "danger");
        }
    };

    const handleRemoveDrawerDiscount = async () => {
        if (!selectedDrawerTable || !drawerOrder) return;
        const subtotal = Number(drawerOrder.subtotal || drawerOrder.total || 0);

        try {
            await updateDoc(doc(db, "orders", `table_${selectedDrawerTable}`), {
                discount: 0,
                discount_reason: '',
                total: subtotal,
                updated_at: new Date().toISOString()
            });
            showToast(`İndirim kaldırıldı.`, 'info');
        } catch (e) {
            console.error("Discount remove error:", e);
        }
    };

    // Yönetici Adisyon Çekmecesi Sipariş Verisi & İşlemleri
    const drawerOrder = selectedDrawerTable ? activeOrders[String(selectedDrawerTable)] : null;

    // ESC tuşuna basıldığında çekmeceyi kapat
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedDrawerTable !== null) {
                setSelectedDrawerTable(null);
                setShowQuickAmountModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedDrawerTable]);

    // Çekmeceden tek tek ürün teslimat durumu değiştirme
    const handleToggleDrawerItemStatus = async (itemIndex) => {
        if (!drawerOrder || !drawerOrder.items) return;
        const updatedItems = [...drawerOrder.items];
        const currentStatus = updatedItems[itemIndex].status;
        const nextStatus = currentStatus === 'delivered' ? 'cooking' : 'delivered';
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: nextStatus };

        try {
            await updateDoc(doc(db, "orders", `table_${selectedDrawerTable}`), {
                items: updatedItems
            });
            if (nextStatus === 'delivered') {
                playDeliveryAlertSound();
                showToast(`${updatedItems[itemIndex].name} teslim edildi olarak işaretlendi.`, "success");
            } else {
                showToast(`${updatedItems[itemIndex].name} mutfakta hazırlanıyor durumuna alındı.`, "info");
            }
        } catch (e) {
            console.error(e);
            showToast("Durum güncellenirken hata oluştu.", "danger");
        }
    };

    // Çekmeceden tüm hazırlanmakta olan ürünleri tek tıkla teslim edildi yapma
    const handleDeliverAllDrawerItems = async () => {
        if (!drawerOrder || !drawerOrder.items) return;
        const updatedItems = drawerOrder.items.map(i => ({ ...i, status: 'delivered' }));
        try {
            await updateDoc(doc(db, "orders", `table_${selectedDrawerTable}`), {
                items: updatedItems
            });
            playDeliveryAlertSound();
            showToast("Tüm ürünler teslim edildi olarak işaretlendi!", "success");
        } catch (e) {
            console.error(e);
            showToast("Hata oluştu.", "danger");
        }
    };

    // Çekmeceden ürün adet artırma / azaltma / silme
    const handleUpdateDrawerQuantity = async (index, delta) => {
        if (!drawerOrder || !drawerOrder.items) return;
        const updated = [...drawerOrder.items];
        const currentQty = Number(updated[index].quantity) || 1;
        const newQty = currentQty + delta;

        if (newQty <= 0) {
            updated.splice(index, 1);
        } else {
            updated[index] = { ...updated[index], quantity: newQty };
        }

        if (updated.length === 0) {
            setSelectedDrawerTable(null);
            showToast(`Masa ${selectedDrawerTable} tüm ürünler silindiği için kapatıldı.`, "info");
            try {
                await closeTableOrder(selectedDrawerTable, drawerOrder?.id);
            } catch (e) {
                console.error(e);
            }
            return;
        }

        const newTotal = updated.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
        try {
            await updateDoc(doc(db, "orders", `table_${selectedDrawerTable}`), {
                items: updated,
                items_count: updated.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                subtotal: newTotal,
                total: newTotal,
                updated_at: new Date().toISOString()
            });
        } catch (e) {
            console.error("Update qty error:", e);
            showToast("Adet güncellenirken hata oluştu.", "danger");
        }
    };

    // Çekmeceden sipariş notu kaydetme
    const handleSaveDrawerNote = async () => {
        if (noteModalItemIdx === null || !drawerOrder || !drawerOrder.items) return;
        const updated = [...drawerOrder.items];
        if (updated[noteModalItemIdx]) {
            updated[noteModalItemIdx] = { ...updated[noteModalItemIdx], notes: itemNoteInput.trim() };
            const newTotal = updated.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
            try {
                await updateDoc(doc(db, "orders", `table_${selectedDrawerTable}`), {
                    items: updated,
                    subtotal: newTotal,
                    total: newTotal,
                    updated_at: new Date().toISOString()
                });
                showToast('Sipariş notu güncellendi.', 'success');
            } catch (e) {
                console.error(e);
                showToast('Not kaydedilirken hata oluştu.', 'danger');
            }
        }
        setNoteModalItemIdx(null);
        setItemNoteInput('');
    };

    // Çekmeceden direkt kasa tahsilatı ve kapatma
    const handleDrawerCheckout = async (method) => {
        if (!selectedDrawerTable) return;
        const tNo = selectedDrawerTable;
        setSelectedDrawerTable(null);
        await handleAdminDirectCheckout(tNo, method);
    };

    // ⚡ Hızlı Tutar ile Kapat (Kurtarıcı Emniyet Sübabı - Admin/Kasa)
    const handleQuickAmountCheckout = async ({ amount, paymentMethod, note, shouldPrint }) => {
        if (!selectedDrawerTable) return;
        const tNo = selectedDrawerTable;
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        const currentOrder = activeOrders[String(tNo)] || null;
        const orderDocId = currentOrder?.id || currentOrder?.firestore_id || null;

        const orderToClose = {
            ...(currentOrder || {}),
            table_no: Number(tNo),
            waiter_id: currentOrder?.waiter_id || currentUser?.id || 'mgr-1',
            waiter_name: currentOrder?.waiter_name || currentUser?.name || 'Kasa / Yönetici',
            items: (currentOrder?.items && currentOrder.items.length > 0)
                ? currentOrder.items
                : [
                    {
                        name: note || 'Hızlı Hesap (Öğle Yoğunluğu)',
                        price: numAmount,
                        quantity: 1,
                        status: 'delivered'
                    }
                ],
            items_count: currentOrder?.items_count || 1,
            subtotal: numAmount,
            discount: 0,
            discount_reason: '',
            total: numAmount,
            note: note || 'Hızlı Hesap',
            payment_method: paymentMethod, // 'cash' | 'card'
            is_quick_amount: true,
            closed_at: new Date().toISOString()
        };

        // 1. Çekmeceyi ve modalı ANINDA kapat
        setShowQuickAmountModal(false);
        setSelectedDrawerTable(null);

        // 2. Fiş yazdırma
        if (shouldPrint) {
            try {
                printCustomerReceipt(orderToClose, "Hızlı Hesap Fişi", printerSettings);
            } catch (err) {
                console.error("Quick amount print error:", err);
            }
        }

        // 3. Bildirim ve ses
        playChimeSound();
        showToast(`Masa ${tNo} hızlı tutarla (${formatMoney(numAmount)}) kasadan kapatıldı!`, "success");

        // 4. Firestore kaydı ve masayı temizleme
        try {
            await recordCompletedOrder(orderToClose, paymentMethod);
            await closeTableOrder(tNo, orderDocId);
        } catch (e) {
            console.error("Admin quick amount error:", e);
            showToast("Hızlı hesap kapatılırken hata oluştu.", "danger");
        }
    };

    // Çekmeceden müşteri fişi yazdır (masa açık kalır)
    const handlePrintDrawerCustomerBill = () => {
        if (!drawerOrder) return;
        const subtotal = Number(drawerOrder.subtotal || drawerOrder.total || 0);
        const discount = Number(drawerOrder.discount || 0);
        printCustomerReceipt({
            ...drawerOrder,
            subtotal,
            discount,
            discount_reason: drawerOrder.discount_reason || '',
            total: Number(drawerOrder.total !== undefined ? drawerOrder.total : Math.max(0, subtotal - discount))
        }, "Masa Adisyon Fişi", printerSettings);
        showToast(`Masa ${selectedDrawerTable} adisyon fişi yazdırılıyor.`, "info");
    };

    // Çekmeceden mutfak fişi yazdır (tatlı, içecekler ve teslim edilenler hariç)
    const handlePrintDrawerKitchenTicket = () => {
        if (!drawerOrder) return;
        const res = printKitchenOrderTicket(drawerOrder, printerSettings);
        if (res && res.ok === false) {
            showToast(res.message || 'Mutfak için yeni hazırlanacak ürün yok.', 'warning');
        } else {
            showToast(`Mutfak fişi yazdırılıyor (${res?.count || 1} yeni ürün).`, 'success');
        }
    };

    // Canlı masalardaki garsonların takip verisi (Aktif Masalar & Ciro)
    const liveWaiterStats = useMemo(() => {
        const map = {};
        Object.values(activeOrders).forEach(o => {
            const wName = o.waiter_name || 'Personel';
            if (!map[wName]) {
                map[wName] = { name: wName, tableNos: [], totalBalance: 0 };
            }
            map[wName].tableNos.push(o.table_no);
            map[wName].totalBalance += (Number(o.total) || 0);
        });
        return Object.values(map);
    }, [activeOrders]);

    // Yönetici Masa Taşıma & Birleştirme İşlemi
    const handleAdminMoveOrMergeTable = async () => {
        const sourceNo = Number(moveSourceTable);
        const targetNo = Number(moveTargetTable);
        if (!sourceNo || !targetNo || sourceNo === targetNo || targetNo < 1 || targetNo > 17) {
            showToast('Lütfen geçerli bir hedef masa seçiniz.', 'warning');
            return;
        }

        const sourceOrder = activeOrders[String(sourceNo)];
        if (!sourceOrder) return;
        const targetOrder = activeOrders[String(targetNo)];
        const targetRef = doc(db, "orders", `table_${targetNo}`);
        const sourceRef = doc(db, "orders", `table_${sourceNo}`);

        try {
            if (!targetOrder) {
                // Boş masaya taşı
                const movedPayload = {
                    ...sourceOrder,
                    table_no: targetNo,
                    updated_at: new Date().toISOString()
                };
                await setDoc(targetRef, movedPayload);
                await deleteDoc(sourceRef);
                showToast(`Masa ${sourceNo}, boş Masa ${targetNo}'e taşındı.`, 'success');
            } else {
                // Dolu masayla birleştir
                const mergedItems = [...(targetOrder.items || [])];
                (sourceOrder.items || []).forEach(sItem => {
                    const match = mergedItems.find(m => m.product_id === sItem.product_id && m.status === sItem.status && !m.notes);
                    if (match) {
                        match.quantity = (Number(match.quantity) || 1) + (Number(sItem.quantity) || 1);
                    } else {
                        mergedItems.push({ ...sItem });
                    }
                });

                const newTotal = mergedItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
                await updateDoc(targetRef, {
                    items: mergedItems,
                    items_count: mergedItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                    subtotal: newTotal,
                    total: newTotal,
                    updated_at: new Date().toISOString()
                });
                await deleteDoc(sourceRef);
                showToast(`Masa ${sourceNo}, Masa ${targetNo} ile birleştirildi.`, 'success');
            }

            setShowMoveModal(false);
            setMoveSourceTable(null);
            setMoveTargetTable('');
            if (selectedDrawerTable === sourceNo) {
                setSelectedDrawerTable(targetNo);
            }
        } catch (e) {
            console.error("Move error:", e);
            showToast('Masa taşınırken hata oluştu.', 'danger');
        }
    };

    // Yönetici Parçalı / Kısmi Hesap Bölme İşlemi
    const handleAdminSplitPayment = async () => {
        if (!splitTable) return;
        const currentOrder = activeOrders[String(splitTable)];
        if (!currentOrder || !currentOrder.items) return;

        const payingItems = [];
        const remainingItems = [];
        let payingSubtotal = 0;

        currentOrder.items.forEach((item, index) => {
            const payQty = Number(splitSelections[index]) || 0;
            const fullQty = Number(item.quantity) || 1;

            if (payQty > 0) {
                payingItems.push({ ...item, quantity: payQty });
                payingSubtotal += Number(item.price) * payQty;
            }

            const remainQty = fullQty - payQty;
            if (remainQty > 0) {
                remainingItems.push({ ...item, quantity: remainQty });
            }
        });

        if (payingItems.length === 0) {
            showToast('Lütfen ödenecek ürünleri seçiniz.', 'warning');
            return;
        }

        try {
            const partialOrderRecord = {
                table_no: splitTable,
                waiter_id: currentOrder.waiter_id || currentUser?.id || 'mgr-1',
                waiter_name: currentOrder.waiter_name || currentUser?.name || 'Yönetici',
                items: payingItems,
                subtotal: payingSubtotal,
                total: payingSubtotal,
                is_partial: true,
                created_at: new Date().toISOString()
            };
            await recordCompletedOrder(partialOrderRecord, splitPayMethod);

            if (remainingItems.length === 0) {
                setShowSplitModal(false);
                setSplitTable(null);
                setSplitSelections({});
                if (selectedDrawerTable === splitTable) setSelectedDrawerTable(null);
                playChimeSound();
                showToast(`Masa ${splitTable} hesabı tamamen tahsil edilerek kapatıldı!`, 'success');

                await recordCompletedOrder(partialOrderRecord, splitPayMethod);
                await closeTableOrder(splitTable, currentOrder?.id);
            } else {
                setShowSplitModal(false);
                setSplitSelections({});
                playChimeSound();
                showToast(`${formatMoney(payingSubtotal)} parçalı tahsil edildi. Kalan tutar masada açık.`, 'success');

                await recordCompletedOrder(partialOrderRecord, splitPayMethod);
                const newTotal = remainingItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
                await updateDoc(doc(db, "orders", `table_${splitTable}`), {
                    items: remainingItems,
                    items_count: remainingItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                    subtotal: newTotal,
                    total: newTotal,
                    updated_at: new Date().toISOString()
                });
            }
        } catch (e) {
            console.error("Split payment error:", e);
            showToast('Parçalı ödeme alınırken hata oluştu.', 'danger');
        }
    };

    // Save New Staff to Firestore
    const handleSaveNewStaff = async () => {
        if (!staffNameInput.trim()) {
            showToast("Lütfen personel adını giriniz.", "warning");
            return;
        }
        if (!staffPinInput.trim() || staffPinInput.length !== 6) {
            showToast("PIN kodu 6 haneli olmalıdır.", "warning");
            return;
        }

        const colName = staffModalRole === 'admin' ? 'managers' : (staffModalRole === 'kitchen' ? 'kitchen_staff' : 'waiters');
        const newStaffRecord = {
            name: staffNameInput.trim(),
            role: staffModalRole,
            pin: staffPinInput.trim(),
            hire_date: staffHireDateInput.trim() || null,
            phone: staffPhoneInput.trim() || '—',
            active: true,
            created_at: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, colName), newStaffRecord);
            showToast(`${newStaffRecord.name} sisteme başarıyla eklendi!`, "success");
            setShowStaffModal(false);
            setStaffNameInput('');
            setStaffHireDateInput('');
            setStaffPhoneInput('');
            setStaffPinInput('');
        } catch (e) {
            console.error("Add staff error:", e);
            showToast("Personel eklenirken hata oluştu.", "danger");
        }
    };

    // Update Staff PIN
    const handleSavePin = async () => {
        if (!editingStaffPin || !newPinInput.trim() || newPinInput.length !== 6) {
            showToast("PIN kodu 6 haneli olmalıdır.", "warning");
            return;
        }

        const colName = editingStaffPin.role === 'admin' ? 'managers' : (editingStaffPin.role === 'kitchen' ? 'kitchen_staff' : 'waiters');
        try {
            await updateDoc(doc(db, colName, editingStaffPin.id), {
                pin: newPinInput.trim()
            });
            showToast(`${editingStaffPin.name} için yeni PIN kaydedildi!`, "success");
            setShowPinModal(false);
            setEditingStaffPin(null);
            setNewPinInput('');
        } catch (e) {
            console.error("Update pin error:", e);
            showToast("PIN güncellenirken hata oluştu.", "danger");
        }
    };

    // Delete Staff
    const handleDeleteStaff = async (id, role, name) => {
        const ok = await showConfirm({
            title: 'Personel Kaydını Sil',
            message: `"${name}" isimli çalışanı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            confirmText: 'Evet, Sil',
            cancelText: 'Vazgeç',
            variant: 'danger'
        });
        if (!ok) return;

        const colName = role === 'admin' ? 'managers' : (role === 'kitchen' ? 'kitchen_staff' : 'waiters');
        try {
            await deleteDoc(doc(db, colName, id));
            showToast(`${name} sistemden silindi.`, "info");
        } catch (e) {
            console.error("Delete staff error:", e);
            showToast("Silinirken hata oluştu.", "danger");
        }
    };



    // İstatistikleri Sıfırlama (Müşteri Talebi: 3 Kademeli Güvenlik Onayı - Modern & Profesyonel)
    const handleResetAnalytics = async () => {
        // 1. Onay
        const confirm1 = await showConfirm({
            title: "Satış & Ciro Geçmişini Sıfırla",
            message: "Restoranın tamamlanan adisyon kayıtları ve ciro geçmişinin tamamı sıfırlanacaktır. Silmek istediğinize emin misiniz?",
            confirmText: "Devam Et (Adım 1/3)",
            cancelText: "Vazgeç",
            variant: "warning"
        });
        if (!confirm1) return;

        // 2. Onay
        const confirm2 = await showConfirm({
            title: "Rapor & Grafik Kayıtları Temizlensin mi?",
            message: "Tüm kapatılan hesaplar, ürün satış karnesi ve garson analizleri temizlenecektir. Bu işlem geri alınamaz.",
            confirmText: "Onaylıyorum (Adım 2/3)",
            cancelText: "Vazgeç",
            variant: "danger"
        });
        if (!confirm2) return;

        // 3. Onay
        const confirm3 = await showConfirm({
            title: "Sistemdeki Ciro Bilgileri Silinsin Mi?",
            message: "Son güvenlik onayı: Satış arşivi silinecektir.",
            confirmText: "Evet, Sistemi Sıfırla (Adım 3/3)",
            cancelText: "İptal Et",
            variant: "danger"
        });
        if (!confirm3) return;

        try {
            showToast("Satış verileri sıfırlanıyor...", "info");
            const snap = await getDocs(collection(db, "completed_orders"));
            for (const d of snap.docs) {
                await deleteDoc(doc(db, "completed_orders", d.id));
            }
            try {
                localStorage.removeItem('cafe_cached_completed_orders');
            } catch (e) { }
            setCompletedOrders([]);
            showToast("Tüm ciro ve satış istatistikleri başarıyla sıfırlandı!", "success");
        } catch (e) {
            console.error("Reset error:", e);
            showToast("Sıfırlama sırasında hata oluştu.", "danger");
        }
    };

    return (
        <div className="admin-page-container">
            {/* Admin Nav Header & Tabs (Tablet dikey/yatay ve mobilde tam sığan ultra-responsive yapı) */}
            <header className="admin-nav-header">
                <nav className="admin-nav-tabs">
                    <button
                        className={`admin-nav-btn ${currentActiveTab === 'tables' ? 'active' : ''}`}
                        onClick={() => setCurrentActiveTab('tables')}
                        title="Canlı Masalar & Kasa (17)"
                    >
                        <span className="tab-icon">🪑</span>
                        <span className="tab-label-full">Canlı Masalar & Kasa (17)</span>
                        <span className="tab-label-short">Masalar (17)</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${currentActiveTab === 'analytics' ? 'active' : ''}`}
                        onClick={() => setCurrentActiveTab('analytics')}
                        title="Ciro & Satış Analizi"
                    >
                        <span className="tab-icon">📊</span>
                        <span className="tab-label-full">Ciro & Satış Analizi</span>
                        <span className="tab-label-short">Satış Analizi</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${currentActiveTab === 'expenses' ? 'active' : ''}`}
                        onClick={() => setCurrentActiveTab('expenses')}
                        title="Giderler & Harcama"
                    >
                        <span className="tab-icon">💸</span>
                        <span className="tab-label-full">Giderler & Harcama</span>
                        <span className="tab-label-short">Giderler</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${currentActiveTab === 'menu' ? 'active' : ''}`}
                        onClick={() => setCurrentActiveTab('menu')}
                        title="Menü Yönetimi"
                    >
                        <span className="tab-icon">🍔</span>
                        <span className="tab-label-full">Menü Yönetimi</span>
                        <span className="tab-label-short">Menü</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${currentActiveTab === 'staff' ? 'active' : ''}`}
                        onClick={() => setCurrentActiveTab('staff')}
                        title="Personel & PIN"
                    >
                        <span className="tab-icon">👥</span>
                        <span className="tab-label-full">Personel & PIN</span>
                        <span className="tab-label-short">Personel</span>
                    </button>
                    <button
                        className={`admin-nav-btn ${currentActiveTab === 'printer' ? 'active' : ''}`}
                        onClick={() => setCurrentActiveTab('printer')}
                        title="Kasa Yazıcısı"
                    >
                        <span className="tab-icon">🖨️</span>
                        <span className="tab-label-full">Kasa Yazıcısı</span>
                        <span className="tab-label-short">Yazıcı</span>
                    </button>
                </nav>

                <div className="admin-nav-actions">
                    <button
                        className="btn-daily-closing"
                        onClick={() => setShowDailyClosingModal(true)}
                        title="Gün Sonu Hesap Özeti (Z-Raporu)"
                    >
                        <span className="tab-icon">🌅</span>
                        <span className="tab-label-full">Gün Sonu Özeti (Z-Raporu)</span>
                        <span className="tab-label-short">Gün Sonu (Z-Raporu)</span>
                    </button>
                </div>
            </header>

            {/* ============================================================== */}
            {/* MENÜ YÖNETİMİ SEKMESİ                                          */}
            {/* ============================================================== */}
            {currentActiveTab === 'menu' && (
                <AdminMenuManagement
                    menuProducts={menuProducts}
                    categories={categories}
                    saveMenuItem={saveMenuItem}
                    toggleMenuItemAvailability={toggleMenuItemAvailability}
                    deleteMenuItem={deleteMenuItem}
                    seedDefaultMenu={seedDefaultMenu}
                    showConfirm={showConfirm}
                    showToast={showToast}
                />
            )}

            {/* ============================================================== */}
            {/* GİDERLER & ÖDEMELER SEKMESİ                                    */}
            {/* ============================================================== */}
            {currentActiveTab === 'expenses' && (
                <AdminExpenses
                    expenses={expenses}
                    addExpense={addExpense}
                    updateExpense={updateExpense}
                    deleteExpense={deleteExpense}
                    completedOrders={completedOrders}
                    totalRevenue={currentPeriodRevenue}
                    currentPeriod={currentPeriod}
                    setCurrentPeriod={setCurrentPeriod}
                    showConfirm={showConfirm}
                    showToast={showToast}
                />
            )}

            {/* ============================================================== */}
            {/* 1. SEKME: CİRO & SATIŞ ANALİZİ + HAFTALIK & AYLIK TABLOLAR      */}
            {/* ============================================================== */}
            {currentActiveTab === 'analytics' && (
                <AdminAnalyticsDashboard
                    completedOrders={completedOrders}
                    expenses={expenses}
                    addExpense={addExpense}
                    updateExpense={updateExpense}
                    deleteExpense={deleteExpense}
                    onNavigateToExpenses={() => setCurrentActiveTab('expenses')}
                    currentPeriod={currentPeriod}
                    setCurrentPeriod={setCurrentPeriod}
                    weeklyDayStats={weeklyDayStats}
                    monthlyDayStats={monthlyDayStats}
                    productStats={productStats}
                    waiterStats={waiterStats}
                    productSearch={productSearch}
                    setProductSearch={setProductSearch}
                    handleResetAnalytics={handleResetAnalytics}
                />
            )}

            {/* ============================================================== */}
            {/* 2. SEKME: CANLI MASALAR & KASA (KASADAN ÖDEME ALMA VE YÖNETİM) */}
            {/* ============================================================== */}
            {currentActiveTab === 'tables' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>🪑 Canlı Masa & Kasa Yönetimi</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Masaların canlı durumu, ilgilenen garsonlar ve kasadan ödeme alma</p>
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--brand-gold)', fontWeight: 700, background: 'var(--bg-surface)', padding: '8px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
                            Açık Masalar Toplamı: <strong style={{ color: 'white', fontSize: '16px' }}>{formatMoney(openTotal)}</strong>
                        </div>
                    </div>

                    {/* CANLI GARSON TAKİP VE FİLTRELEME BARI */}
                    <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', marginBottom: '18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--brand-gold)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Users size={16} /> Garson Takibi:
                            </span>
                            <button
                                className={`btn-outline ${selectedWaiterFilter === 'all' ? 'active' : ''}`}
                                style={{
                                    padding: '5px 12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    borderRadius: '999px',
                                    background: selectedWaiterFilter === 'all' ? 'var(--brand-primary)' : 'transparent',
                                    borderColor: selectedWaiterFilter === 'all' ? 'var(--brand-primary)' : 'var(--border-card)',
                                    color: selectedWaiterFilter === 'all' ? '#fff' : 'var(--text-secondary)'
                                }}
                                onClick={() => setSelectedWaiterFilter('all')}
                            >
                                Tüm Masalar ({tables.length})
                            </button>
                            {liveWaiterStats.map(w => (
                                <button
                                    key={w.name}
                                    className={`btn-outline ${selectedWaiterFilter === w.name ? 'active' : ''}`}
                                    style={{
                                        padding: '5px 12px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        borderRadius: '999px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: selectedWaiterFilter === w.name ? 'var(--brand-primary)' : 'rgba(255,255,255,0.04)',
                                        borderColor: selectedWaiterFilter === w.name ? 'var(--brand-primary)' : 'var(--border-card)',
                                        color: selectedWaiterFilter === w.name ? '#fff' : 'var(--text-primary)'
                                    }}
                                    onClick={() => setSelectedWaiterFilter(selectedWaiterFilter === w.name ? 'all' : w.name)}
                                    title={`Aktif Masaları: ${w.tableNos.map(n => `Masa ${n}`).join(', ')}`}
                                >
                                    <span>👤 {w.name}</span>
                                    <span style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 800, color: selectedWaiterFilter === w.name ? '#fff' : 'var(--brand-gold)' }}>
                                        {w.tableNos.length} Masa • {formatMoney(w.totalBalance)}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            {selectedWaiterFilter !== 'all' ? `👤 ${selectedWaiterFilter} masaları gösteriliyor` : `Toplam ${openOrdersList.length} açık adisyon`}
                        </div>
                    </div>

                    {/* Paylaşılan Ortak Masa Grid Bileşeni (Garson Ekranı ile 1-e-1 Birebir Aynı) */}
                    <div style={{ marginBottom: '24px' }}>
                        <TableCardGrid
                            onSelectTableForReceipt={(tableNum) => setSelectedDrawerTable(tableNum)}
                            onOpenTableOrder={(tableNum) => navigateTo('table', tableNum)}
                            selectedWaiterFilter={selectedWaiterFilter}
                            showControls={false}
                        />
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 3. SEKME: PERSONEL & PIN YÖNETİMİ (FIRESTORE 3 TABLO CRUD)      */}
            {/* ============================================================== */}
            {currentActiveTab === 'staff' && (
                <AdminStaffManagement
                    waitersList={waitersList}
                    kitchenList={kitchenList}
                    managersList={managersList}
                    completedOrders={completedOrders}
                    setStaffModalRole={setStaffModalRole}
                    setShowStaffModal={setShowStaffModal}
                    setEditingStaffPin={setEditingStaffPin}
                    setNewPinInput={setNewPinInput}
                    setShowPinModal={setShowPinModal}
                    handleDeleteStaff={handleDeleteStaff}
                    showConfirm={showConfirm}
                    showToast={showToast}
                />
            )}

            {/* MODAL: YENİ PERSONEL İŞE AL MODALI */}
            {showStaffModal && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1 }}>
                    <div className="modal-content open modal-responsive-card" style={{ maxWidth: '480px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span>💼</span> Yeni Personel İşe Al
                            </h3>
                            <button onClick={() => setShowStaffModal(false)} className="btn-logout" style={{ width: '28px', height: '28px' }}>
                                <X size={15} />
                            </button>
                        </div>

                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            Personelin rolünü ve sisteme giriş yapacağı <strong>6 haneli şifreyi (PIN)</strong> belirleyiniz.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Ad Soyad:</label>
                                <input
                                    type="text"
                                    value={staffNameInput}
                                    onChange={(e) => setStaffNameInput(e.target.value)}
                                    placeholder="Örn: Burak Kaya"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Görevi / Rolü:</label>
                                <select
                                    value={staffModalRole}
                                    onChange={(e) => setStaffModalRole(e.target.value)}
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '14px' }}
                                >
                                    <option value="waiter">📱 Garson (Sipariş & Masa Servisi)</option>
                                    <option value="admin">👑 Yönetici (Kasa & Tam Denetim)</option>
                                </select>
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>İşe Giriş Tarihi (İsteğe Bağlı):</label>
                                <ModernDatePicker
                                    value={staffHireDateInput}
                                    onChange={setStaffHireDateInput}
                                    placeholder="Tarih Seçiniz"
                                />
                            </div>

                            <div>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Telefon (İsteğe Bağlı):</label>
                                <input
                                    type="tel"
                                    value={staffPhoneInput}
                                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                                    placeholder="Örn: 0542 000 00 00"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px' }}
                                />
                            </div>

                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>6 Haneli Giriş PIN'i:</label>
                                    <button
                                        type="button"
                                        onClick={() => setStaffPinInput(String(Math.floor(100000 + Math.random() * 900000)))}
                                        className="btn-outline"
                                        style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--brand-gold)', borderColor: 'var(--brand-gold)' }}
                                    >
                                        🎲 Rastgele PIN
                                    </button>
                                </div>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={staffPinInput}
                                    onChange={(e) => setStaffPinInput(e.target.value)}
                                    placeholder="6 Haneli PIN (örn: 543210)"
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: '#ffd43b', fontWeight: 800, fontSize: '16px', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', letterSpacing: '4px' }}
                                />
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                            <button onClick={() => setShowStaffModal(false)} className="btn-outline">Vazgeç</button>
                            <button onClick={handleSaveNewStaff} className="btn-primary" style={{ padding: '10px 22px' }}>✓ İşe Al & Kaydet</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: PIN DEĞİŞTİRME */}
            {showPinModal && editingStaffPin && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1 }}>
                    <div className="modal-content open modal-responsive-card" style={{ maxWidth: '400px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '6px' }}>🔑 PIN Güncelle</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                            {editingStaffPin.name} için yeni 6 haneli giriş şifresi belirleyin.
                        </p>

                        <div style={{ marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Yeni 6 Haneli PIN:</label>
                                <button
                                    type="button"
                                    onClick={() => setNewPinInput(String(Math.floor(100000 + Math.random() * 900000)))}
                                    className="btn-outline"
                                    style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--brand-gold)', borderColor: 'var(--brand-gold)' }}
                                >
                                    🎲 Üret
                                </button>
                            </div>
                            <input
                                type="text"
                                maxLength={6}
                                value={newPinInput}
                                onChange={(e) => setNewPinInput(e.target.value)}
                                placeholder="Yeni PIN"
                                style={{ width: '100%', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: '#ffd43b', fontWeight: 800, fontSize: '16px', borderRadius: 'var(--radius-md)', fontFamily: 'monospace', letterSpacing: '4px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button onClick={() => setShowPinModal(false)} className="btn-outline">Vazgeç</button>
                            <button onClick={handleSavePin} className="btn-primary" style={{ padding: '8px 20px' }}>Şifreyi Güncelle</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 4. SEKME: YAZICI AYARLARI (MERKEZİ MUTFAK & KASA AĞ ENTEGRASYONU) */}
            {/* ============================================================== */}
            {currentActiveTab === 'printer' && (
                <AdminPrinterSettings
                    printerSettings={printerSettings}
                    savePrinterSettings={savePrinterSettings}
                    handleTestPrintTicket={handleTestPrintTicket}
                    showToast={showToast}
                />
            )}

            {/* ============================================================== */}
            {/* YÖNETİCİ CANLI ADİSYON ÇEKMECESİ (GARSON PANELİ İLE 1-E-1 AYNI)*/}
            {/* ============================================================== */}
            {selectedDrawerTable !== null && (
                <>
                    <div
                        className="admin-receipt-backdrop"
                        onClick={() => setSelectedDrawerTable(null)}
                    />
                    <aside className="admin-receipt-drawer">
                        {/* Mobil için sürükleme/kapatma çizgisi */}
                        <div className="admin-drawer-drag-pill" onClick={() => setSelectedDrawerTable(null)} />

                        {/* Drawer Başlığı (Garson Ekranı ile Birebir Aynı) */}
                        <div className="receipt-header" style={{ padding: '16px 20px', flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--brand-gold)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                        CANLI ADİSYON
                                    </div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0, color: 'white' }}>
                                        Masa {selectedDrawerTable}
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button
                                        className="btn-outline"
                                        onClick={() => { setMoveSourceTable(selectedDrawerTable); setMoveTargetTable(''); setShowMoveModal(true); }}
                                        style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <MoveHorizontal size={13} /> Taşı
                                    </button>
                                    <button
                                        className="btn-outline"
                                        onClick={() => { setSplitTable(selectedDrawerTable); setSplitSelections({}); setSplitPayMethod('cash'); setShowSplitModal(true); }}
                                        style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Scissors size={13} /> Böl
                                    </button>
                                    <button
                                        className="admin-drawer-close-btn"
                                        onClick={() => setSelectedDrawerTable(null)}
                                        title="Adisyonu Kapat (ESC)"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Sorumlu Garson Rozeti */}
                            <div style={{
                                padding: '8px 12px',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-card)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between'
                            }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700 }}>
                                    👤 Sorumlu Garson:
                                </div>
                                <div style={{
                                    fontSize: '13px',
                                    fontWeight: 800,
                                    color: '#ffd43b',
                                    background: 'rgba(245, 159, 0, 0.12)',
                                    padding: '3px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(245, 159, 0, 0.3)'
                                }}>
                                    {drawerOrder?.waiter_name || '—'}
                                </div>
                            </div>
                        </div>

                        {/* Drawer İçeriği & Ürün Listesi */}
                        <div className="receipt-items-list" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                            {(!drawerOrder || !drawerOrder.items || drawerOrder.items.length === 0) ? (
                                <div style={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--text-muted)',
                                    textAlign: 'center',
                                    padding: '24px'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🍽️</div>
                                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-secondary)' }}>Adisyon Henüz Boş</div>
                                    <div style={{ fontSize: '12px', marginTop: '4px', marginBottom: '16px' }}>Bu masada henüz aktif sipariş bulunmuyor.</div>

                                    {/* ⚡ KURTARICI EMNİYET SÜBABI: BOŞ MASADAN ANINDA HIZLI ÖDEME AL */}
                                    <button
                                        onClick={() => setShowQuickAmountModal(true)}
                                        className="btn-quick-amount-drawer hero"
                                        style={{ marginBottom: '12px', width: '100%', maxWidth: '320px' }}
                                    >
                                        <Zap size={18} /> Hızlı Ödeme Al
                                    </button>

                                    <button
                                        className="btn-outline"
                                        style={{ padding: '10px 18px', fontSize: '13px', width: '100%', maxWidth: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                                        onClick={() => navigateTo('table', selectedDrawerTable)}
                                    >
                                        Masaya Git ve Sipariş Aç ↗
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Teslim Durumu Özeti & Hızlı Toplu Teslim */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px 12px',
                                        background: 'rgba(0,0,0,0.35)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-card)',
                                        marginBottom: '10px',
                                        gap: '8px',
                                        flexWrap: 'wrap'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                            <span style={{ color: 'var(--warning)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Clock size={13} /> {drawerOrder.items.filter(i => i.status !== 'delivered').length} Hazırlanıyor
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                                            <span style={{ color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle2 size={13} /> {drawerOrder.items.filter(i => i.status === 'delivered').length} Teslim
                                            </span>
                                        </div>
                                        {drawerOrder.items.some(i => i.status !== 'delivered') && (
                                            <button
                                                onClick={handleDeliverAllDrawerItems}
                                                className="btn-outline"
                                                style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.3)', fontWeight: 700 }}
                                                title="Tüm hazırlananları teslim edildi yap"
                                            >
                                                Tümünü Teslim Et ✓
                                            </button>
                                        )}
                                    </div>

                                    {/* 1. GRUP: MUTFAKTA HAZIRLANAN / PİŞEN ÜRÜNLER */}
                                    {drawerOrder.items.some(i => i.status !== 'delivered') && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: 'var(--warning)',
                                                letterSpacing: '0.4px',
                                                textTransform: 'uppercase',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                marginBottom: '6px',
                                                paddingLeft: '2px'
                                            }}>
                                                <Clock size={12} /> 🟡 Hazırlanıyor / Mutfakta ({drawerOrder.items.filter(i => i.status !== 'delivered').length})
                                            </div>
                                            {drawerOrder.items.map((item, idx) => {
                                                if (item.status === 'delivered') return null;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="receipt-item-row pending"
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px',
                                                            padding: '10px 12px',
                                                            background: 'rgba(245, 158, 11, 0.05)',
                                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            marginBottom: '6px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 800, fontSize: '14px', color: 'white' }}>
                                                                    {item.name}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: 'var(--brand-gold)', fontWeight: 700, marginTop: '2px' }}>
                                                                    {formatMoney(Number(item.price) * Number(item.quantity || 1))}
                                                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>
                                                                        ({formatMoney(item.price)} x {item.quantity})
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => handleToggleDrawerItemStatus(idx)}
                                                                className="delivery-status-btn pending"
                                                                title="Teslim Edildi Olarak İşaretle"
                                                            >
                                                                <Clock size={13} /> Hazırlanıyor
                                                            </button>
                                                        </div>

                                                        {item.notes && (
                                                            <div style={{
                                                                fontSize: '11px',
                                                                color: 'var(--brand-gold)',
                                                                background: 'rgba(245, 159, 0, 0.1)',
                                                                padding: '3px 8px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                📝 {item.notes}
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setNoteModalItemIdx(idx);
                                                                    setItemNoteInput(item.notes || '');
                                                                }}
                                                                className="btn-outline"
                                                                style={{
                                                                    fontSize: '11px',
                                                                    padding: '2px 8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    color: item.notes ? 'var(--brand-gold)' : 'var(--text-muted)'
                                                                }}
                                                            >
                                                                <MessageSquare size={12} /> {item.notes ? 'Not Düzenle' : '+ Not'}
                                                            </button>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <button
                                                                    onClick={() => handleUpdateDrawerQuantity(idx, -1)}
                                                                    className="btn-outline"
                                                                    style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Minus size={13} />
                                                                </button>
                                                                <span style={{ fontWeight: 800, fontSize: '13px', color: 'white', minWidth: '18px', textAlign: 'center' }}>
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleUpdateDrawerQuantity(idx, 1)}
                                                                    className="btn-outline"
                                                                    style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateDrawerQuantity(idx, -item.quantity)}
                                                                    className="btn-outline"
                                                                    style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* 2. GRUP: MASAYA TESLİM EDİLEN ÜRÜNLER */}
                                    {drawerOrder.items.some(i => i.status === 'delivered') && (
                                        <div>
                                            <div style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: 'var(--success)',
                                                letterSpacing: '0.4px',
                                                textTransform: 'uppercase',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                marginBottom: '6px',
                                                paddingLeft: '2px'
                                            }}>
                                                <CheckCircle2 size={12} /> 🟢 Teslim Edildi / Masada ({drawerOrder.items.filter(i => i.status === 'delivered').length})
                                            </div>
                                            {drawerOrder.items.map((item, idx) => {
                                                if (item.status !== 'delivered') return null;
                                                return (
                                                    <div
                                                        key={idx}
                                                        className="receipt-item-row delivered"
                                                        style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            gap: '6px',
                                                            padding: '10px 12px',
                                                            background: 'rgba(16, 185, 129, 0.05)',
                                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                                            borderRadius: 'var(--radius-sm)',
                                                            marginBottom: '6px'
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                            <div>
                                                                <div style={{ fontWeight: 800, fontSize: '14px', color: 'white' }}>
                                                                    {item.name}
                                                                </div>
                                                                <div style={{ fontSize: '12px', color: 'var(--brand-gold)', fontWeight: 700, marginTop: '2px' }}>
                                                                    {formatMoney(Number(item.price) * Number(item.quantity || 1))}
                                                                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, marginLeft: '6px' }}>
                                                                        ({formatMoney(item.price)} x {item.quantity})
                                                                    </span>
                                                                </div>
                                                            </div>

                                                            <button
                                                                onClick={() => handleToggleDrawerItemStatus(idx)}
                                                                className="delivery-status-btn delivered"
                                                                title="Geri Al (Hazırlanıyor Yap)"
                                                            >
                                                                <CheckCircle2 size={13} /> ✓ Teslim
                                                            </button>
                                                        </div>

                                                        {item.notes && (
                                                            <div style={{
                                                                fontSize: '11px',
                                                                color: 'var(--brand-gold)',
                                                                background: 'rgba(245, 159, 0, 0.1)',
                                                                padding: '3px 8px',
                                                                borderRadius: '4px'
                                                            }}>
                                                                📝 {item.notes}
                                                            </div>
                                                        )}

                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                                            <button
                                                                onClick={() => {
                                                                    setNoteModalItemIdx(idx);
                                                                    setItemNoteInput(item.notes || '');
                                                                }}
                                                                className="btn-outline"
                                                                style={{
                                                                    fontSize: '11px',
                                                                    padding: '2px 8px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    color: item.notes ? 'var(--brand-gold)' : 'var(--text-muted)'
                                                                }}
                                                            >
                                                                <MessageSquare size={12} /> {item.notes ? 'Not Düzenle' : '+ Not'}
                                                            </button>

                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <button
                                                                    onClick={() => handleUpdateDrawerQuantity(idx, -1)}
                                                                    className="btn-outline"
                                                                    style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Minus size={13} />
                                                                </button>
                                                                <span style={{ fontWeight: 800, fontSize: '13px', color: 'white', minWidth: '18px', textAlign: 'center' }}>
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleUpdateDrawerQuantity(idx, 1)}
                                                                    className="btn-outline"
                                                                    style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateDrawerQuantity(idx, -item.quantity)}
                                                                    className="btn-outline"
                                                                    style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Footer & Checkout Buttons (Yalnızca adisyonda ürün varsa gösterilir) */}
                        {drawerOrder && drawerOrder.items && drawerOrder.items.length > 0 && (
                            <div className="receipt-footer">
                                {Number(drawerOrder.discount) > 0 ? (
                                    <div style={{
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(16, 185, 129, 0.35)',
                                        borderRadius: '12px',
                                        padding: '10px 12px',
                                        marginBottom: '10px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ara Toplam</span>
                                            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 700, textDecoration: 'line-through' }}>
                                                {formatMoney(drawerOrder.subtotal || drawerOrder.total)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '12.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                                🏷️ İndirim / İkram
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 800 }}>
                                                    -{formatMoney(drawerOrder.discount)}
                                                </span>
                                                <button
                                                    onClick={handleRemoveDrawerDiscount}
                                                    title="İndirimi Kaldır"
                                                    style={{
                                                        background: 'rgba(239, 68, 68, 0.15)',
                                                        border: '1px solid rgba(239, 68, 68, 0.3)',
                                                        color: '#ef4444',
                                                        borderRadius: '4px',
                                                        padding: '1px 5px',
                                                        fontSize: '11px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '6px 0' }} />
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 800, color: 'white' }}>Ödenecek Tutar</span>
                                            <span style={{ color: 'var(--brand-gold)', fontSize: '24px', fontWeight: 900 }}>
                                                {formatMoney(drawerOrder.total)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="total-summary">
                                        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Genel Tutar</span>
                                        <span style={{ color: 'var(--brand-gold)', fontSize: '24px', fontWeight: 800 }}>
                                            {formatMoney(drawerOrder.total)}
                                        </span>
                                    </div>
                                )}

                                {/* Satır 1: Masaya Git & Mutfağa Fiş Gönder (2 Kolon) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                    <button
                                        onClick={() => {
                                            const tNo = selectedDrawerTable;
                                            setSelectedDrawerTable(null);
                                            navigateTo('table', tNo);
                                        }}
                                        className="btn-outline"
                                        style={{
                                            minHeight: '44px',
                                            padding: '8px 10px',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            color: 'var(--brand-gold)',
                                            borderColor: 'rgba(245, 158, 11, 0.4)'
                                        }}
                                    >
                                        ➕ Sipariş Ekle ↗
                                    </button>

                                    <button
                                        onClick={handlePrintDrawerKitchenTicket}
                                        className="btn-primary"
                                        style={{
                                            minHeight: '44px',
                                            padding: '8px 10px',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Printer size={16} /> Mutfak Fişi
                                    </button>
                                </div>

                                {/* Satır 2: İndirim (Ürün varsa Hızlı Ödeme Al gerekmez, sadece indirim gösterilir) */}
                                <div style={{ marginBottom: '10px' }}>
                                    <button
                                        onClick={() => setShowDrawerDiscountModal(true)}
                                        style={{
                                            width: '100%',
                                            minHeight: '44px',
                                            padding: '8px 12px',
                                            background: Number(drawerOrder.discount) > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                                            border: `1px dashed ${Number(drawerOrder.discount) > 0 ? '#10b981' : 'rgba(245, 158, 11, 0.4)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            color: Number(drawerOrder.discount) > 0 ? '#10b981' : 'var(--brand-gold)',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Tag size={15} />
                                        {Number(drawerOrder.discount) > 0 ? `İndirim (${formatMoney(drawerOrder.discount)})` : 'İndirim / İkram'}
                                    </button>
                                </div>

                                {/* 3 Checkout Butonu (Nakit, Kart, Masa Hesap Fişi) */}
                                <div className="checkout-actions-3col">
                                    <button
                                        onClick={() => handleDrawerCheckout('cash')}
                                        disabled={!drawerOrder.items || drawerOrder.items.length === 0}
                                        className="btn-checkout-action btn-checkout-cash"
                                    >
                                        <Banknote size={18} />
                                        Nakit Kapat
                                    </button>

                                    <button
                                        onClick={() => handleDrawerCheckout('card')}
                                        disabled={!drawerOrder.items || drawerOrder.items.length === 0}
                                        className="btn-checkout-action btn-checkout-card"
                                    >
                                        <CreditCard size={18} />
                                        Kart Kapat
                                    </button>

                                    <button
                                        onClick={handlePrintDrawerCustomerBill}
                                        disabled={!drawerOrder.items || drawerOrder.items.length === 0}
                                        className="btn-checkout-action btn-checkout-print"
                                        title="Müşteri Hesap Fişini Yazdır (Hesap Açık Kalır)"
                                    >
                                        <Receipt size={18} />
                                        Masa Hesap Fişi
                                    </button>
                                </div>
                            </div>
                        )}
                    </aside>
                </>
            )}

            {/* ============================================================== */}
            {/* MODAL: MASA TAŞI / BİRLEŞTİR (YÖNETİCİ MODALI)                 */}
            {/* ============================================================== */}
            {showMoveModal && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1, zIndex: 1700 }}>
                    <div className="modal-content open modal-responsive-card" style={{ maxWidth: '440px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MoveHorizontal size={18} className="text-amber-400" />
                                Masa Taşı / Birleştir
                            </h3>
                            <button onClick={() => setShowMoveModal(false)} className="btn-logout" style={{ width: '28px', height: '28px' }}>
                                <X size={15} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                            Masa <strong>{moveSourceTable}</strong> siparişlerini aktarmak istediğiniz hedef masayı seçin:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: '8px', marginBottom: '18px' }}>
                            {tables.map(t => {
                                const isSelf = t.table_no === Number(moveSourceTable);
                                const isOccupied = !!activeOrders[String(t.table_no)];
                                const isSelected = moveTargetTable === String(t.table_no);

                                return (
                                    <button
                                        key={t.id}
                                        disabled={isSelf}
                                        onClick={() => setMoveTargetTable(String(t.table_no))}
                                        className="btn-outline"
                                        style={{
                                            padding: '10px 0',
                                            fontWeight: 800,
                                            fontSize: '13px',
                                            background: isSelected ? 'var(--brand-primary)' : (isOccupied ? 'rgba(245, 159, 0, 0.15)' : 'var(--bg-surface)'),
                                            color: isSelf ? 'var(--text-muted)' : (isSelected ? '#fff' : (isOccupied ? 'var(--brand-gold)' : 'var(--text-primary)')),
                                            borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-card)',
                                            cursor: isSelf ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        M{t.table_no}
                                    </button>
                                );
                            })}
                        </div>

                        {moveTargetTable && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: activeOrders[moveTargetTable] ? 'rgba(245, 159, 0, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                border: activeOrders[moveTargetTable] ? '1px solid rgba(245, 159, 0, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                color: activeOrders[moveTargetTable] ? 'var(--brand-gold)' : 'var(--success)',
                                fontSize: '12px',
                                fontWeight: 700,
                                marginBottom: '16px'
                            }}>
                                {activeOrders[moveTargetTable] ? (
                                    <span>⚠️ Hedef Masa {moveTargetTable} DOLU! Siparişler <strong>BİRLEŞTİRİLECEKTİR</strong>.</span>
                                ) : (
                                    <span>✓ Hedef Masa {moveTargetTable} BOŞ. Adisyon doğrudan <strong>TAŞINACAKTIR</strong>.</span>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowMoveModal(false)} className="btn-outline" style={{ flex: 1 }}>
                                Vazgeç
                            </button>
                            <button
                                onClick={handleAdminMoveOrMergeTable}
                                disabled={!moveTargetTable}
                                className="btn-primary"
                                style={{ flex: 2, padding: '10px' }}
                            >
                                Onayla ve Aktar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL: PARÇALI / KISMİ HESAP BÖL (YÖNETİCİ MODALI)             */}
            {/* ============================================================== */}
            {showSplitModal && splitTable && activeOrders[String(splitTable)] && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1, zIndex: 1700 }}>
                    <div className="modal-content open modal-responsive-card" style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Scissors size={18} className="text-emerald-400" />
                                Masa {splitTable} • Parçalı / Kısmi Ödeme
                            </h3>
                            <button onClick={() => setShowSplitModal(false)} className="btn-logout" style={{ width: '28px', height: '28px' }}>
                                <X size={15} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                            Aşağıdan şu an tahsil edilecek ürün adetlerini seçin:
                        </p>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '300px' }}>
                            {(activeOrders[String(splitTable)].items || []).map((item, idx) => {
                                const selQty = Number(splitSelections[idx]) || 0;
                                const maxQty = Number(item.quantity) || 1;

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            background: 'var(--bg-surface)',
                                            padding: '8px 12px',
                                            borderRadius: 'var(--radius-sm)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            border: '1px solid var(--border-card)'
                                        }}
                                    >
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'white' }}>{item.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--brand-gold)' }}>{formatMoney(item.price)} (Mevcut: {maxQty})</div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                onClick={() => setSplitSelections(prev => ({ ...prev, [idx]: Math.max(0, (Number(prev[idx]) || 0) - 1) }))}
                                                className="btn-outline"
                                                style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                -
                                            </button>
                                            <span style={{ width: '22px', textAlign: 'center', fontWeight: 800, color: selQty > 0 ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                                                {selQty}
                                            </span>
                                            <button
                                                onClick={() => setSplitSelections(prev => ({ ...prev, [idx]: Math.min(maxQty, (Number(prev[idx]) || 0) + 1) }))}
                                                className="btn-outline"
                                                style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                +
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Seçilen Toplam Tutar ve Ödeme Yöntemi */}
                        {(() => {
                            const payingTotal = (activeOrders[String(splitTable)].items || []).reduce((sum, item, idx) => {
                                const q = Number(splitSelections[idx]) || 0;
                                return sum + (Number(item.price) * q);
                            }, 0);

                            return (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: '12px', border: '1px solid var(--border-card)' }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Tahsil Edilecek Tutar:</span>
                                        <span style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold)' }}>{formatMoney(payingTotal)}</span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                        <button
                                            onClick={() => setSplitPayMethod('cash')}
                                            className="btn-outline"
                                            style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '12px', background: splitPayMethod === 'cash' ? '#10b981' : 'transparent', color: splitPayMethod === 'cash' ? '#fff' : 'var(--text-secondary)', borderColor: splitPayMethod === 'cash' ? '#10b981' : 'var(--border-card)' }}
                                        >
                                            💵 Nakit
                                        </button>
                                        <button
                                            onClick={() => setSplitPayMethod('card')}
                                            className="btn-outline"
                                            style={{ flex: 1, padding: '8px', fontWeight: 700, fontSize: '12px', background: splitPayMethod === 'card' ? 'var(--brand-primary)' : 'transparent', color: splitPayMethod === 'card' ? '#fff' : 'var(--text-secondary)', borderColor: splitPayMethod === 'card' ? 'var(--brand-primary)' : 'var(--border-card)' }}
                                        >
                                            💳 Kart
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', gap: '10px' }}>
                                        <button onClick={() => setShowSplitModal(false)} className="btn-outline" style={{ flex: 1 }}>
                                            Vazgeç
                                        </button>
                                        <button
                                            onClick={handleAdminSplitPayment}
                                            disabled={payingTotal <= 0}
                                            className="btn-primary"
                                            style={{ flex: 2, padding: '10px', background: splitPayMethod === 'cash' ? '#10b981' : 'var(--brand-primary)' }}
                                        >
                                            {formatMoney(payingTotal)} Tahsil Et
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* MODAL: SİPARİŞ NOTU DÜZENLEME (YÖNETİCİ MODALI)                */}
            {/* ============================================================== */}
            {noteModalItemIdx !== null && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1, zIndex: 1750 }}>
                    <div className="modal-content open modal-responsive-card" style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageSquare size={18} className="text-amber-400" />
                                Sipariş Notu
                            </h3>
                            <button onClick={() => setNoteModalItemIdx(null)} className="btn-logout" style={{ width: '28px', height: '28px' }}>
                                <X size={15} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                            Ürün: <strong style={{ color: 'white' }}>{drawerOrder?.items?.[noteModalItemIdx]?.name}</strong>
                        </p>

                        <textarea
                            value={itemNoteInput}
                            onChange={(e) => setItemNoteInput(e.target.value)}
                            placeholder="Örn: Az şekerli, sosu ayrı olsun, fındığı bol..."
                            rows={3}
                            style={{
                                width: '100%',
                                padding: '10px',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-card)',
                                color: 'white',
                                fontSize: '13px',
                                resize: 'none',
                                marginBottom: '16px',
                                outline: 'none'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setNoteModalItemIdx(null)} className="btn-outline" style={{ flex: 1 }}>
                                Vazgeç
                            </button>
                            <button onClick={handleSaveDrawerNote} className="btn-primary" style={{ flex: 2 }}>
                                Notu Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GÜN SONU HESAP ÖZETİ (Z-RAPORU) MODALI */}
            <DailyClosingModal
                isOpen={showDailyClosingModal}
                onClose={() => setShowDailyClosingModal(false)}
                completedOrders={completedOrders}
                expenses={expenses}
                printerSettings={printerSettings}
                showToast={showToast}
            />

            {/* MODAL: DISCOUNT MODAL (ADMIN DRAWER) */}
            {selectedDrawerTable && drawerOrder && (
                <DiscountModal
                    isOpen={showDrawerDiscountModal}
                    onClose={() => setShowDrawerDiscountModal(false)}
                    tableNo={selectedDrawerTable}
                    subtotal={Number(drawerOrder.subtotal || drawerOrder.total || 0)}
                    currentDiscount={Number(drawerOrder.discount || 0)}
                    items={drawerOrder.items || []}
                    onApply={handleApplyDrawerDiscount}
                    onRemove={handleRemoveDrawerDiscount}
                />
            )}

            {/* MODAL: ⚡ HIZLI TUTAR İLE KAPATMA (KURTARICI EMNİYET SÜBABI) */}
            {selectedDrawerTable && (
                <QuickAmountModal
                    isOpen={showQuickAmountModal}
                    onClose={() => setShowQuickAmountModal(false)}
                    tableNo={selectedDrawerTable}
                    existingOrder={drawerOrder}
                    currentUser={currentUser}
                    onConfirm={handleQuickAmountCheckout}
                    printerSettings={printerSettings}
                />
            )}
        </div>
    );
}
