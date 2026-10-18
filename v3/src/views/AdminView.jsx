import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    UserPlus,
    Calendar,
    CalendarDays,
    Search,
    Plus,
    Key,
    KeyRound,
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
    Check,
    Clock,
    Tag,
    Zap,
    Smartphone,
    User,
    Phone,
    LayoutGrid,
    Layers,
    ArrowUpRight,
    Utensils,
    Flame,
    Sunset
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
import MoveTableModal from '../components/MoveTableModal';
import SplitPaymentModal from '../components/SplitPaymentModal';
import LiveOrderDrawer from '../components/LiveOrderDrawer';
import { checkAndExecuteDailyClosing } from '../services/autoClosingService';

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

    // 23:59 Otomatik Gün Sonu Özeti Kaydedici (Eğer alınmamışsa otomatik arşivle)
    useEffect(() => {
        checkAndExecuteDailyClosing({ completedOrders, expenses, showToast });
        const intervalId = setInterval(() => {
            checkAndExecuteDailyClosing({ completedOrders, expenses, showToast });
        }, 30000);
        return () => clearInterval(intervalId);
    }, [completedOrders, expenses, showToast]);

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
                    deleteDoc(doc(db, "waiters", d.id)).catch(() => { });
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
                { id: "mgr-1", name: "Yönetici", role: "admin", pin: "197300", phone: "", last_login_at: new Date().toISOString() }
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
            waiter_name: order.waiter_name || currentUser?.name || 'Yönetici'
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
            const rawName = o.waiter_name || 'Personel';
            const wName = rawName.replace(/\s*\(patron\)\s*/gi, '').trim() || 'Yönetici';
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
        let totalSubtotal = 0;

        currentOrder.items.forEach((item, index) => {
            const payQty = Number(splitSelections[index]) || 0;
            const fullQty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;

            totalSubtotal += price * fullQty;

            if (payQty > 0) {
                payingItems.push({ ...item, quantity: payQty });
                payingSubtotal += price * payQty;
            }

            const remainQty = fullQty - payQty;
            if (remainQty > 0) {
                remainingItems.push({ ...item, quantity: remainQty });
            }
        });

        if (payingItems.length === 0 || payingSubtotal <= 0) {
            showToast('Lütfen ödenecek ürünleri seçiniz.', 'warning');
            return;
        }

        const currentDiscount = Number(currentOrder.discount) || 0;
        let payingDiscount = 0;
        if (currentDiscount > 0 && totalSubtotal > 0 && payingSubtotal > 0) {
            if (remainingItems.length === 0) {
                payingDiscount = currentDiscount;
            } else {
                payingDiscount = Math.round(currentDiscount * (payingSubtotal / totalSubtotal) * 100) / 100;
            }
        }
        const payingTotal = Math.max(0, payingSubtotal - payingDiscount);
        const remainingDiscount = Math.max(0, currentDiscount - payingDiscount);

        try {
            const partialOrderRecord = {
                table_no: splitTable,
                waiter_id: currentOrder.waiter_id || currentUser?.id || 'mgr-1',
                waiter_name: currentOrder.waiter_name || currentUser?.name || 'Yönetici',
                items: payingItems,
                items_count: payingItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                subtotal: payingSubtotal,
                discount: payingDiscount,
                discount_reason: currentOrder.discount_reason || '',
                total: payingTotal,
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

                await closeTableOrder(splitTable, currentOrder?.id);
            } else {
                setShowSplitModal(false);
                setSplitSelections({});
                playChimeSound();
                showToast(`${formatMoney(payingTotal)} parçalı tahsil edildi. Kalan tutar masada açık.`, 'success');

                const newSubtotal = remainingItems.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
                const finalRemainingDiscount = Math.min(newSubtotal, remainingDiscount);
                const newTotal = Math.max(0, newSubtotal - finalRemainingDiscount);
                await updateDoc(doc(db, "orders", `table_${splitTable}`), {
                    items: remainingItems,
                    items_count: remainingItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                    subtotal: newSubtotal,
                    discount: finalRemainingDiscount,
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
            {/* 21st.dev & Motion Modern Glassmorphic Admin Nav Tabs */}
            <header className="admin-nav-header">
                <nav className="admin-nav-tabs">
                    {[
                        { id: 'tables', icon: LayoutGrid, fullLabel: 'Canlı Masalar & Kasa', shortLabel: 'Masalar', badge: tables.length },
                        { id: 'analytics', icon: TrendingUp, fullLabel: 'Ciro & Satış Analizi', shortLabel: 'Satış Analizi' },
                        { id: 'expenses', icon: Receipt, fullLabel: 'Giderler & Harcama', shortLabel: 'Giderler' },
                        { id: 'menu', icon: Utensils, fullLabel: 'Menü Yönetimi', shortLabel: 'Menü' },
                        { id: 'staff', icon: Users, fullLabel: 'Personel & PIN', shortLabel: 'Personel' },
                        { id: 'printer', icon: Printer, fullLabel: 'Kasa Yazıcısı', shortLabel: 'Yazıcı' }
                    ].map(tab => {
                        const isActive = currentActiveTab === tab.id;
                        const IconComp = tab.icon;
                        return (
                            <motion.button
                                key={tab.id}
                                whileTap={{ scale: 0.96 }}
                                className={`admin-nav-btn ${isActive ? 'active' : ''}`}
                                onClick={() => setCurrentActiveTab(tab.id)}
                                title={tab.fullLabel}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="admin-active-tab-indicator"
                                        className="admin-nav-active-pill"
                                        transition={{ type: 'spring', stiffness: 440, damping: 32 }}
                                    />
                                )}
                                <span className="tab-icon-wrapper">
                                    <IconComp size={15} strokeWidth={isActive ? 2.4 : 2} />
                                </span>
                                <span className="tab-label-text tab-label-full">{tab.fullLabel}</span>
                                <span className="tab-label-text tab-label-short">{tab.shortLabel}</span>
                                {tab.badge !== undefined && (
                                    <span className={`tab-badge-pill ${isActive ? 'active' : ''}`}>
                                        {tab.badge}
                                    </span>
                                )}
                            </motion.button>
                        );
                    })}
                </nav>

                <div className="admin-nav-actions">
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.96 }}
                        className="btn-daily-closing"
                        onClick={() => setShowDailyClosingModal(true)}
                        title="Gün Sonu Hesap Özeti (Z-Raporu)"
                    >
                        <span className="closing-btn-glow" />
                        <Sunset size={16} strokeWidth={2.4} className="closing-btn-icon" />
                        <span className="tab-label-full">Gün Sonu Özeti (Z-Raporu)</span>
                        <span className="tab-label-short">Gün Sonu (Z-Raporu)</span>
                    </motion.button>
                </div>
            </header>

            {/* ============================================================== */}
            {/* ANİMASYONLU SEKME İÇERİK DEĞİŞİMİ                              */}
            {/* ============================================================== */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentActiveTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%' }}
                >
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* TOP HEADER & BENTO STATS WIDGET */}
                            <div style={{
                                background: 'rgba(28, 21, 20, 0.75)',
                                padding: '20px 24px',
                                borderRadius: '20px',
                                border: '1px solid rgba(245, 159, 0, 0.16)',
                                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                                backdropFilter: 'blur(20px)',
                                WebkitBackdropFilter: 'blur(20px)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '16px'
                            }}>
                                {/* Title & Icon */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '46px',
                                        height: '46px',
                                        borderRadius: '14px',
                                        background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.2), rgba(247, 103, 7, 0.1))',
                                        border: '1px solid rgba(245, 159, 0, 0.35)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--brand-gold, #f59f00)',
                                        boxShadow: '0 4px 18px rgba(245, 159, 0, 0.2)'
                                    }}>
                                        <LayoutGrid size={24} />
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.4px' }}>
                                                Canlı Masa & Kasa Yönetimi
                                            </h2>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #d1b8af)', margin: '4px 0 0 0' }}>
                                            Masaların anlık doluluk durumu, ilgilenen garsonlar ve kasadan tek tıkla tahsilat
                                        </p>
                                    </div>
                                </div>

                                {/* Quick Bento Stats Capsules */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Occupancy Rate Capsule */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(30, 41, 59, 0.6) 100%)',
                                        border: '1px solid rgba(96, 165, 250, 0.28)',
                                        borderRadius: '14px',
                                        padding: '8px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(12px)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '9px',
                                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(37, 99, 235, 0.2) 100%)',
                                            border: '1px solid rgba(96, 165, 250, 0.4)',
                                            color: '#93c5fd',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.25)'
                                        }}>
                                            <Users size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10.5px', color: '#cbd5e1', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Doluluk Oranı
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                {openCount} / {tables.length} Masa <span style={{ fontSize: '11.5px', color: '#60a5fa', fontWeight: 800 }}>({Math.round((openCount / (tables.length || 1)) * 100)}%)</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Open Orders Count Capsule */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.12) 0%, rgba(45, 28, 22, 0.6) 100%)',
                                        border: '1px solid rgba(245, 159, 0, 0.3)',
                                        borderRadius: '14px',
                                        padding: '8px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                        backdropFilter: 'blur(12px)'
                                    }}>
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '9px',
                                            background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.3) 0%, rgba(217, 72, 15, 0.2) 100%)',
                                            border: '1px solid rgba(245, 159, 0, 0.45)',
                                            color: '#fbbf24',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(245, 159, 0, 0.25)'
                                        }}>
                                            <Receipt size={16} />
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '10.5px', color: '#fde68a', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                                Açık Adisyon
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                {openOrdersList.length} Masa Aktif
                                            </div>
                                        </div>
                                    </div>

                                    {/* Total Active Balance Capsule */}
                                    <div style={{
                                        background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.14), rgba(247, 103, 7, 0.08))',
                                        border: '1px solid rgba(245, 159, 0, 0.35)',
                                        borderRadius: '14px',
                                        padding: '8px 16px',
                                        boxShadow: '0 4px 18px rgba(245, 159, 0, 0.15)'
                                    }}>
                                        <div style={{ fontSize: '10.5px', color: 'var(--brand-gold, #f59f00)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            Açık Masalar Toplamı
                                        </div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#fffaf5', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                            {formatMoney(openTotal)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CANLI GARSON & MASA TAKİP BARI (SLIDING MOTION PILLS) */}
                            <div style={{
                                background: 'rgba(28, 21, 20, 0.72)',
                                padding: '12px 18px',
                                borderRadius: '16px',
                                border: '1px solid rgba(245, 159, 0, 0.14)',
                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--brand-gold, #f59f00)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Users size={15} /> Garson Takibi:
                                    </span>

                                    {/* All Tables Button */}
                                    <button
                                        type="button"
                                        onClick={() => setSelectedWaiterFilter('all')}
                                        style={{
                                            position: 'relative',
                                            padding: '6px 14px',
                                            fontSize: '12px',
                                            fontWeight: selectedWaiterFilter === 'all' ? 800 : 600,
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'transparent',
                                            color: selectedWaiterFilter === 'all' ? '#1c1514' : 'var(--text-secondary, #d1b8af)',
                                            cursor: 'pointer',
                                            zIndex: 1,
                                            transition: 'color 0.18s ease',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                                        }}
                                    >
                                        {selectedWaiterFilter === 'all' && (
                                            <motion.div
                                                layoutId="activeLiveWaiterPill"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'linear-gradient(135deg, #f59f00, #f76707)',
                                                    borderRadius: '10px',
                                                    zIndex: -1,
                                                    boxShadow: '0 2px 10px rgba(245, 159, 0, 0.4)'
                                                }}
                                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                            />
                                        )}
                                        Tüm Masalar ({tables.length})
                                    </button>

                                    {/* Each Waiter Pill */}
                                    {liveWaiterStats.map(w => {
                                        const isSelected = selectedWaiterFilter === w.name;
                                        const initials = w.name.slice(0, 2).toLocaleUpperCase('tr-TR');
                                        return (
                                            <button
                                                key={w.name}
                                                type="button"
                                                onClick={() => setSelectedWaiterFilter(isSelected ? 'all' : w.name)}
                                                title={`Aktif Masaları: ${w.tableNos.map(n => `Masa ${n}`).join(', ')}`}
                                                style={{
                                                    position: 'relative',
                                                    padding: '5px 12px 5px 8px',
                                                    fontSize: '12px',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    borderRadius: '10px',
                                                    border: isSelected ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: isSelected ? 'transparent' : 'rgba(0, 0, 0, 0.35)',
                                                    color: isSelected ? '#1c1514' : '#ffffff',
                                                    cursor: 'pointer',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '7px',
                                                    zIndex: 1,
                                                    transition: 'color 0.18s ease',
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                }}
                                            >
                                                {isSelected && (
                                                    <motion.div
                                                        layoutId="activeLiveWaiterPill"
                                                        style={{
                                                            position: 'absolute',
                                                            inset: 0,
                                                            background: 'linear-gradient(135deg, #f59f00, #f76707)',
                                                            borderRadius: '10px',
                                                            zIndex: -1,
                                                            boxShadow: '0 2px 10px rgba(245, 159, 0, 0.4)'
                                                        }}
                                                        transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                                    />
                                                )}
                                                {/* Monogram avatar */}
                                                <span style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '50%',
                                                    background: isSelected ? 'rgba(0,0,0,0.2)' : 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(16,185,129,0.3))',
                                                    color: isSelected ? '#1c1514' : '#93c5fd',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '9.5px',
                                                    fontWeight: 900
                                                }}>
                                                    {initials}
                                                </span>
                                                <span>{w.name}</span>
                                                <span style={{
                                                    background: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(245, 159, 0, 0.15)',
                                                    color: isSelected ? '#ffffff' : '#f59f00',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 800
                                                }}>
                                                    {w.tableNos.length} Masa • {formatMoney(w.totalBalance)}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59f00' }} />
                                    {selectedWaiterFilter !== 'all' ? `${selectedWaiterFilter} masaları gösteriliyor` : `Toplam ${openOrdersList.length} açık adisyon`}
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

                    {/* MODAL: YENİ PERSONEL İŞE AL MODALI (21st.dev & Framer Motion Luxury Standard) */}
                    {showStaffModal && typeof document !== 'undefined' && createPortal(
                        <AnimatePresence>
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    width: '100vw',
                                    height: '100vh',
                                    zIndex: 999999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px 16px',
                                    backgroundColor: 'rgba(8, 6, 5, 0.85)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    overflowY: 'auto'
                                }}
                                onClick={() => setShowStaffModal(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        maxWidth: '520px',
                                        width: '100%',
                                        margin: 'auto',
                                        padding: '24px 28px',
                                        background: 'linear-gradient(180deg, #1c1514 0%, #140e0d 100%)',
                                        border: '1px solid rgba(245, 159, 0, 0.25)',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.25)',
                                        borderRadius: '24px',
                                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(247, 103, 7, 0.08)',
                                        position: 'relative'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '12px',
                                                background: 'rgba(247, 103, 7, 0.15)',
                                                border: '1px solid rgba(247, 103, 7, 0.35)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#f76707',
                                                boxShadow: '0 0 16px rgba(247, 103, 7, 0.2)'
                                            }}>
                                                <UserPlus size={20} />
                                            </div>
                                            <div>
                                                <h3 style={{
                                                    fontSize: '18px',
                                                    fontWeight: 800,
                                                    color: '#fffaf5',
                                                    margin: 0,
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                    letterSpacing: '-0.02em'
                                                }}>
                                                    Yeni Personel Ekle
                                                </h3>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary, #d1b8af)' }}>
                                                    Kadroya yeni garson veya yönetici kaydı oluşturun
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowStaffModal(false)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                width: '32px',
                                                height: '32px',
                                                borderRadius: '10px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Rol Seçici: Modern Segmented Kartlar */}
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                                                Görevi / Yetki Rolü
                                            </label>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setStaffModalRole('waiter')}
                                                    style={{
                                                        padding: '12px 14px',
                                                        borderRadius: '14px',
                                                        border: staffModalRole === 'waiter'
                                                            ? '1.5px solid #f76707'
                                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                                        background: staffModalRole === 'waiter'
                                                            ? 'linear-gradient(135deg, rgba(247, 103, 7, 0.22) 0%, rgba(217, 72, 15, 0.1) 100%)'
                                                            : 'rgba(255, 255, 255, 0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.18s ease'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '10px',
                                                        background: staffModalRole === 'waiter' ? 'rgba(247, 103, 7, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                        color: staffModalRole === 'waiter' ? '#f76707' : 'rgba(255, 255, 255, 0.5)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <Smartphone size={17} />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 800, color: staffModalRole === 'waiter' ? '#fffaf5' : 'rgba(255, 255, 255, 0.8)' }}>
                                                            Garson
                                                        </div>
                                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #d1b8af)', marginTop: '1px' }}>
                                                            Sipariş & Servis
                                                        </div>
                                                    </div>
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => setStaffModalRole('admin')}
                                                    style={{
                                                        padding: '12px 14px',
                                                        borderRadius: '14px',
                                                        border: staffModalRole === 'admin'
                                                            ? '1.5px solid #f59f00'
                                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                                        background: staffModalRole === 'admin'
                                                            ? 'linear-gradient(135deg, rgba(245, 159, 0, 0.22) 0%, rgba(217, 119, 6, 0.1) 100%)'
                                                            : 'rgba(255, 255, 255, 0.03)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'all 0.18s ease'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '34px',
                                                        height: '34px',
                                                        borderRadius: '10px',
                                                        background: staffModalRole === 'admin' ? 'rgba(245, 159, 0, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                        color: staffModalRole === 'admin' ? '#f59f00' : 'rgba(255, 255, 255, 0.5)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        <ShieldCheck size={17} />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 800, color: staffModalRole === 'admin' ? '#fffaf5' : 'rgba(255, 255, 255, 0.8)' }}>
                                                            Yönetici
                                                        </div>
                                                        <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #d1b8af)', marginTop: '1px' }}>
                                                            Kasa & Tam Yetki
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Ad Soyad */}
                                        <div>
                                            <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                                                <User size={12} color="#f76707" />
                                                <span>Ad Soyad</span>
                                            </label>
                                            <input
                                                type="text"
                                                value={staffNameInput}
                                                onChange={(e) => setStaffNameInput(e.target.value)}
                                                placeholder="Örn: Burak Kaya"
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '12px 14px',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: '#fffaf5',
                                                    borderRadius: '12px',
                                                    fontSize: '14px',
                                                    outline: 'none',
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                }}
                                            />
                                        </div>

                                        {/* İki Kolon: Telefon & İşe Giriş Tarihi */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px' }}>
                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                                                    <Phone size={12} color="#f76707" />
                                                    <span>Telefon (İsteğe Bağlı)</span>
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={staffPhoneInput}
                                                    onChange={(e) => setStaffPhoneInput(e.target.value)}
                                                    placeholder="Örn: 0542 000 00 00"
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box',
                                                        padding: '12px 14px',
                                                        background: 'rgba(255, 255, 255, 0.04)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        color: '#fffaf5',
                                                        borderRadius: '12px',
                                                        fontSize: '14px',
                                                        outline: 'none',
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                    }}
                                                />
                                            </div>

                                            <div>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                                                    <Calendar size={12} color="#f59f00" />
                                                    <span>İşe Giriş Tarihi</span>
                                                </label>
                                                <ModernDatePicker
                                                    value={staffHireDateInput}
                                                    onChange={setStaffHireDateInput}
                                                    placeholder="Tarih Seçiniz"
                                                />
                                            </div>
                                        </div>

                                        {/* 6 Haneli Giriş PIN'i (Lüks Kapsül) */}
                                        <div style={{
                                            padding: '14px 16px',
                                            background: 'rgba(245, 159, 0, 0.04)',
                                            border: '1px solid rgba(245, 159, 0, 0.18)',
                                            borderRadius: '16px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <label style={{ fontSize: '11px', fontWeight: 800, color: '#f59f00', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                    <KeyRound size={13} color="#f59f00" />
                                                    <span>6 Haneli Terminal PIN'i</span>
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setStaffPinInput(String(Math.floor(100000 + Math.random() * 900000)))}
                                                    style={{
                                                        padding: '4px 10px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: '#f59f00',
                                                        background: 'rgba(245, 159, 0, 0.12)',
                                                        border: '1px solid rgba(245, 159, 0, 0.3)',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '5px'
                                                    }}
                                                >
                                                    <Dices size={12} />
                                                    <span>Rastgele Üret</span>
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                value={staffPinInput}
                                                onChange={(e) => setStaffPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="••••••"
                                                style={{
                                                    width: '100%',
                                                    boxSizing: 'border-box',
                                                    padding: '12px 14px',
                                                    background: 'rgba(0, 0, 0, 0.35)',
                                                    border: '1px solid rgba(245, 159, 0, 0.3)',
                                                    color: '#f59f00',
                                                    fontWeight: 800,
                                                    fontSize: '20px',
                                                    borderRadius: '12px',
                                                    letterSpacing: '8px',
                                                    textAlign: 'center',
                                                    outline: 'none',
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                }}
                                            />
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted, #8d736b)', marginTop: '6px', textAlign: 'center' }}>
                                                Personel bu 6 haneli şifreyle masalara ve panele giriş yapacaktır.
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alt Aksiyon Butonları */}
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowStaffModal(false)}
                                            style={{
                                                padding: '10px 18px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '12px',
                                                color: 'var(--text-secondary, #d1b8af)',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Vazgeç
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSaveNewStaff}
                                            style={{
                                                padding: '10px 24px',
                                                background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                border: 'none',
                                                borderRadius: '12px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '7px',
                                                boxShadow: '0 4px 18px rgba(247, 103, 7, 0.4)'
                                            }}
                                        >
                                            <Check size={16} />
                                            <span>Personeli Kaydet</span>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </div>
                        </AnimatePresence>,
                        document.body
                    )}

                    {/* MODAL: PIN DEĞİŞTİRME (21st.dev & Framer Motion Luxury Standard) */}
                    {showPinModal && editingStaffPin && typeof document !== 'undefined' && createPortal(
                        <AnimatePresence>
                            <div
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    width: '100vw',
                                    height: '100vh',
                                    zIndex: 999999,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '20px 16px',
                                    backgroundColor: 'rgba(8, 6, 5, 0.85)',
                                    backdropFilter: 'blur(16px)',
                                    WebkitBackdropFilter: 'blur(16px)',
                                    overflowY: 'auto'
                                }}
                                onClick={() => setShowPinModal(false)}
                            >
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                    style={{
                                        maxWidth: '420px',
                                        width: '100%',
                                        margin: 'auto',
                                        padding: '24px',
                                        background: 'linear-gradient(180deg, #1c1514 0%, #140e0d 100%)',
                                        border: '1px solid rgba(245, 159, 0, 0.25)',
                                        borderTop: '1px solid rgba(255, 255, 255, 0.25)',
                                        borderRadius: '24px',
                                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 40px rgba(247, 103, 7, 0.08)',
                                        position: 'relative'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '11px',
                                                background: 'rgba(245, 159, 0, 0.15)',
                                                border: '1px solid rgba(245, 159, 0, 0.35)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#f59f00'
                                            }}>
                                                <KeyRound size={18} />
                                            </div>
                                            <div>
                                                <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#fffaf5', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    PIN Güncelle
                                                </h3>
                                                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-secondary, #d1b8af)' }}>
                                                    {editingStaffPin.name} için yeni şifre belirleyin
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowPinModal(false)}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'rgba(255, 255, 255, 0.7)',
                                                width: '30px',
                                                height: '30px',
                                                borderRadius: '9px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>

                                    <div style={{
                                        padding: '14px 16px',
                                        background: 'rgba(245, 159, 0, 0.04)',
                                        border: '1px solid rgba(245, 159, 0, 0.18)',
                                        borderRadius: '16px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <label style={{ fontSize: '11px', fontWeight: 800, color: '#f59f00', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                Yeni 6 Haneli PIN:
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setNewPinInput(String(Math.floor(100000 + Math.random() * 900000)))}
                                                style={{
                                                    padding: '3px 8px',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: '#f59f00',
                                                    background: 'rgba(245, 159, 0, 0.12)',
                                                    border: '1px solid rgba(245, 159, 0, 0.3)',
                                                    borderRadius: '7px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <Dices size={11} />
                                                <span>Üret</span>
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={newPinInput}
                                            onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            placeholder="••••••"
                                            style={{
                                                width: '100%',
                                                boxSizing: 'border-box',
                                                padding: '12px 14px',
                                                background: 'rgba(0, 0, 0, 0.35)',
                                                border: '1px solid rgba(245, 159, 0, 0.3)',
                                                color: '#f59f00',
                                                fontWeight: 800,
                                                fontSize: '20px',
                                                borderRadius: '12px',
                                                letterSpacing: '8px',
                                                textAlign: 'center',
                                                outline: 'none',
                                                fontFamily: "'Plus Jakarta Sans', sans-serif"
                                            }}
                                        />
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setShowPinModal(false)}
                                            style={{
                                                padding: '9px 16px',
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                borderRadius: '10px',
                                                color: 'var(--text-secondary, #d1b8af)',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Vazgeç
                                        </motion.button>
                                        <motion.button
                                            type="button"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleSavePin}
                                            style={{
                                                padding: '9px 20px',
                                                background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                border: 'none',
                                                borderRadius: '10px',
                                                color: '#ffffff',
                                                fontSize: '13px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 4px 16px rgba(247, 103, 7, 0.35)'
                                            }}
                                        >
                                            <Check size={15} />
                                            <span>Şifreyi Güncelle</span>
                                        </motion.button>
                                    </div>
                                </motion.div>
                            </div>
                        </AnimatePresence>,
                        document.body
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
                </motion.div>
            </AnimatePresence>

            {/* ============================================================== */}
            {/* YÖNETİCİ CANLI ADİSYON ÇEKMECESİ (ORTAK MODÜL - REFERANS 1)   */}
            {/* ============================================================== */}
            <LiveOrderDrawer
                isOpen={selectedDrawerTable !== null}
                mode="drawer"
                tableNo={selectedDrawerTable}
                order={drawerOrder}
                currentUser={currentUser}
                isTableDetail={false}
                onClose={() => setSelectedDrawerTable(null)}
                onMove={() => {
                    setMoveSourceTable(selectedDrawerTable);
                    setMoveTargetTable('');
                    setShowMoveModal(true);
                }}
                onSplit={() => {
                    setSplitTable(selectedDrawerTable);
                    setSplitSelections({});
                    setSplitPayMethod('cash');
                    setShowSplitModal(true);
                }}
                onToggleItemStatus={handleToggleDrawerItemStatus}
                onDeliverAll={handleDeliverAllDrawerItems}
                onUpdateQuantity={handleUpdateDrawerQuantity}
                onAddNote={(idx) => {
                    setNoteModalItemIdx(idx);
                    setItemNoteInput(drawerOrder?.items?.[idx]?.notes || '');
                }}
                onNavigateToTable={(tNo) => {
                    setSelectedDrawerTable(null);
                    navigateTo('table', tNo);
                }}
                onQuickAmount={() => setShowQuickAmountModal(true)}
                onOpenDiscount={() => setShowDrawerDiscountModal(true)}
                onRemoveDiscount={handleRemoveDrawerDiscount}
                onPrintKitchen={handlePrintDrawerKitchenTicket}
                onPrintCustomerBill={handlePrintDrawerCustomerBill}
                onCheckout={handleDrawerCheckout}
            />

            {/* ============================================================== */}
            {/* MODAL: MASA TAŞI / BİRLEŞTİR (YÖNETİCİ MODALI)                 */}
            {/* ============================================================== */}
            <MoveTableModal
                isOpen={showMoveModal}
                sourceTable={moveSourceTable}
                selectedTargetTable={moveTargetTable}
                onSelectTargetTable={setMoveTargetTable}
                onConfirm={handleAdminMoveOrMergeTable}
                onClose={() => {
                    setShowMoveModal(false);
                    setMoveTargetTable('');
                }}
                tables={tables}
                activeOrders={activeOrders}
            />

            {/* ============================================================== */}
            {/* MODAL: PARÇALI / KISMİ HESAP BÖL (YÖNETİCİ MODALI)             */}
            {/* ============================================================== */}
            <SplitPaymentModal
                isOpen={showSplitModal && !!splitTable && !!activeOrders[String(splitTable)]}
                tableNo={splitTable}
                order={activeOrders[String(splitTable)]}
                splitSelections={splitSelections}
                setSplitSelections={setSplitSelections}
                splitPayMethod={splitPayMethod}
                setSplitPayMethod={setSplitPayMethod}
                onConfirm={handleAdminSplitPayment}
                onClose={() => {
                    setShowSplitModal(false);
                    setSplitSelections({});
                }}
            />

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
