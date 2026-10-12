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
    Clock
} from 'lucide-react';
import TableCardGrid from '../components/TableCardGrid';

export default function AdminView() {
    const { tables, activeOrders, navigateTo, currentUser, showToast, closeTableOrder, printerSettings, savePrinterSettings } = useApp();
    const [currentActiveTab, setCurrentActiveTab] = useState('tables'); // 'tables' | 'analytics' | 'staff' | 'printer'
    const [currentPeriod, setCurrentPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
    const [productSearch, setProductSearch] = useState('');
    const [completedOrders, setCompletedOrders] = useState([]);

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
                { name: 'Hamsiköy Sütlacı (Fırın)', quantity: 2, price: 150, status: 'cooking', notes: 'Bol fındıklı test' },
                { name: 'Rize Demleme Çay', quantity: 3, price: 25, status: 'cooking' }
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
    const [staffExtraInput, setStaffExtraInput] = useState('');
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

    // Real-Time (Canlı) Kapanan Sipariş Dinleyicisi (Farklı cihazlardan kapanan hesaplar anında yansır)
    useEffect(() => {
        // 1. Önce yerel arşivden yükle (anında render, 0 gecikme)
        let archive = [];
        try {
            const raw = localStorage.getItem('cafe_cached_completed_orders');
            if (raw) {
                archive = JSON.parse(raw);
                if (Array.isArray(archive) && archive.length > 0) {
                    setCompletedOrders(archive);
                }
            }
        } catch (e) {
            console.warn("Local archive parse error:", e);
        }

        // 2. Canlı Firestore Dinleyicisi (Son 50 kapanan sipariş gerçek zamanlı dinlenir)
        // Herhangi bir cihazdan masa kapatıldığında buraya anında canlı yansır ve sadece 1 okuma tüketir.
        const qLive = query(
            collection(db, "completed_orders"),
            orderBy("created_at", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(qLive, (snapshot) => {
            const liveDocs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            
            // Canlı gelenleri yerel arşiv ile birleştirip tekilleştir
            const orderMap = new Map();
            liveDocs.forEach(o => orderMap.set(o.id, o));
            archive.forEach(o => {
                if (!orderMap.has(o.id)) orderMap.set(o.id, o);
            });

            const merged = Array.from(orderMap.values()).sort((a, b) => {
                const dateA = new Date(a.created_at || a.payment_collected_at || 0).getTime();
                const dateB = new Date(b.created_at || b.payment_collected_at || 0).getTime();
                return dateB - dateA;
            });

            archive = merged;
            setCompletedOrders(merged);
            try {
                localStorage.setItem('cafe_cached_completed_orders', JSON.stringify(merged.slice(0, 1000)));
            } catch (e) {}
        }, (err) => {
            console.warn("Live completed orders listener error:", err);
        });

        return () => unsubscribe();
    }, []);

    // Listen to Waiters, Kitchen Staff, and Managers from Firestore
    useEffect(() => {
        const unsubWaiters = onSnapshot(collection(db, "waiters"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'waiter' }));
            setWaitersList(list.length > 0 ? list : [
                { id: "wtr-1", name: "Ahmet", role: "waiter", pin: "123456", section: "Salon", total_orders_count: 24, total_revenue: 9480, total_items_sold: 72, last_order_at: new Date().toISOString() },
                { id: "wtr-2", name: "Mehmet", role: "waiter", pin: "654321", section: "Teras", total_orders_count: 18, total_revenue: 7200, total_items_sold: 54, last_order_at: new Date().toISOString() }
            ]);
        }, () => {});

        const unsubKitchen = onSnapshot(collection(db, "kitchen_staff"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'kitchen' }));
            setKitchenList(list.length > 0 ? list : [
                { id: "ktc-1", name: "Fadime Usta", role: "kitchen", pin: "112233", section: "Tatlı & Fırın Şefi", total_orders_prepared: 42, total_items_prepared: 110, avg_prep_time_minutes: 6.8, last_delivery_at: new Date().toISOString() }
            ]);
        }, () => {});

        const unsubManagers = onSnapshot(collection(db, "managers"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'admin' }));
            setManagersList(list.length > 0 ? list : [
                { id: "mgr-1", name: "Yönetici (Patron)", role: "admin", pin: "197300", phone: "0532 100 20 30", last_login_at: new Date().toISOString() }
            ]);
        }, () => {});

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

    // MÜŞTERİ İSTEĞİ: "BU HAFTA GÜN GÜN TABLOSU" (Pzt-Paz)
    const weeklyDayStats = useMemo(() => {
        const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
        const now = new Date();
        const currentDayOfWeek = (now.getDay() + 6) % 7;
        const monday = new Date(now);
        monday.setDate(now.getDate() - currentDayOfWeek);
        monday.setHours(0, 0, 0, 0);

        return dayNames.map((name, idx) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + idx);
            const dateStr = date.toISOString().slice(0, 10);

            const dayOrders = completedOrders.filter(o => (o.created_at || '').startsWith(dateStr));
            const revenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const cash = dayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const card = dayOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const count = dayOrders.length;

            return {
                dayName: name,
                dateStr: `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`,
                revenue,
                cash,
                card,
                count,
                isToday: idx === currentDayOfWeek
            };
        });
    }, [completedOrders]);

    // MÜŞTERİ İSTEĞİ: "BU AY GÜN GÜN TABLOSU" (1..31)
    const monthlyDayStats = useMemo(() => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const todayDate = now.getDate();

        const list = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayOrders = completedOrders.filter(o => (o.created_at || '').startsWith(dateStr));

            const revenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const cash = dayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const card = dayOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const count = dayOrders.length;

            list.push({
                dayNumber: day,
                dateDisplay: `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`,
                revenue,
                cash,
                card,
                count,
                isToday: day === todayDate
            });
        }
        return list;
    }, [completedOrders]);

    // Admin direct checkout from tables tab
    const handleAdminDirectCheckout = async (tableNo, method) => {
        const order = activeOrders[String(tableNo)];
        if (!order) return;

        // 1. Bildirim ve sesi ANINDA ver (0 ms gecikme, tam eş zamanlı)
        playChimeSound();
        showToast(`Masa ${tableNo} hesabı (${formatMoney(order.total)}) kasadan kapatıldı!`, "success");

        try {
            await recordCompletedOrder(order, method);
            await closeTableOrder(tableNo, order.id);
        } catch (e) {
            console.error("Admin checkout error:", e);
            showToast("Tahsilat sırasında hata oluştu.", "danger");
        }
    };

    // Yönetici Adisyon Çekmecesi Sipariş Verisi & İşlemleri
    const drawerOrder = selectedDrawerTable ? activeOrders[String(selectedDrawerTable)] : null;

    // ESC tuşuna basıldığında çekmeceyi kapat
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && selectedDrawerTable !== null) {
                setSelectedDrawerTable(null);
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

    // Çekmeceden müşteri fişi yazdır (masa açık kalır)
    const handlePrintDrawerCustomerBill = () => {
        if (!drawerOrder) return;
        printCustomerReceipt(drawerOrder, "Masa Adisyon Fişi", printerSettings);
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
            section: staffExtraInput.trim(),
            phone: staffPhoneInput.trim() || '—',
            active: true,
            created_at: new Date().toISOString()
        };

        try {
            await addDoc(collection(db, colName), newStaffRecord);
            showToast(`${newStaffRecord.name} sisteme başarıyla eklendi!`, "success");
            setShowStaffModal(false);
            setStaffNameInput('');
            setStaffExtraInput('');
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
        if (!window.confirm(`${name} isimli çalışanı silmek istediğinize emin misiniz?`)) return;
        const colName = role === 'admin' ? 'managers' : (role === 'kitchen' ? 'kitchen_staff' : 'waiters');
        try {
            await deleteDoc(doc(db, colName, id));
            showToast(`${name} sistemden silindi.`, "info");
        } catch (e) {
            console.error("Delete staff error:", e);
            showToast("Silinirken hata oluştu.", "danger");
        }
    };

    // Seed test staff
    const seedTestStaff = async () => {
        showToast("Test personelleri oluşturuluyor...", "info");
        try {
            await setDoc(doc(db, "managers", "mgr-1"), {
                name: "Yönetici (Patron)",
                role: "admin",
                pin: "197300",
                phone: "0532 100 20 30",
                active: true,
                created_at: new Date().toISOString()
            });
            await setDoc(doc(db, "waiters", "wtr-1"), {
                name: "Ahmet",
                role: "waiter",
                pin: "123456",
                section: "Salon",
                total_orders_count: 24,
                total_revenue: 9480,
                total_items_sold: 72,
                active: true,
                last_order_at: new Date().toISOString()
            });
            await setDoc(doc(db, "waiters", "wtr-2"), {
                name: "Mehmet",
                role: "waiter",
                pin: "654321",
                section: "Teras",
                total_orders_count: 18,
                total_revenue: 7200,
                total_items_sold: 54,
                active: true,
                last_order_at: new Date().toISOString()
            });
            showToast("Test personelleri Firestore'a yüklendi!", "success");
        } catch (e) {
            console.error("Seed error:", e);
            showToast("Hata oluştu.", "danger");
        }
    };

    return (
        <div className="admin-page-container">
            {/* Top Bar: Restoran Canlı Takip */}
            <div style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 18px',
                marginBottom: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '13px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></span>
                    <strong style={{ color: 'white', fontSize: '14px' }}>Restoran Canlı Takip:</strong>
                    <span style={{ color: '#f59f00', fontWeight: 700 }}>● {openCount} Açık Masa</span>
                    <span style={{ color: 'var(--text-muted)' }}>|</span>
                    <span style={{ color: '#10b981', fontWeight: 700 }}>○ {freeCount} Boş</span>
                    <span style={{ color: 'var(--text-muted)' }}>|</span>
                    <span style={{ color: 'var(--brand-gold)', fontWeight: 800 }}>Açık Adisyon: {formatMoney(openTotal)}</span>
                </div>
            </div>

            {/* 3 Admin Nav Tabs */}
            <nav className="admin-nav-tabs" style={{ marginBottom: '20px' }}>
                <button 
                    className={`admin-nav-btn ${currentActiveTab === 'tables' ? 'active' : ''}`}
                    onClick={() => setCurrentActiveTab('tables')}
                >
                    <span>🪑</span> Canlı Masalar & Kasa (17)
                </button>
                <button 
                    className={`admin-nav-btn ${currentActiveTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setCurrentActiveTab('analytics')}
                >
                    <span>📊</span> Ciro & Satış Analizi
                </button>
                <button 
                    className={`admin-nav-btn ${currentActiveTab === 'staff' ? 'active' : ''}`}
                    onClick={() => setCurrentActiveTab('staff')}
                >
                    <span>👥</span> Personel & PIN Yönetimi
                </button>
                <button 
                    className={`admin-nav-btn ${currentActiveTab === 'printer' ? 'active' : ''}`}
                    onClick={() => setCurrentActiveTab('printer')}
                >
                    <span>🖨️</span> Yazıcı Ayarları (Mutfak Ağ)
                </button>
            </nav>

            {/* ============================================================== */}
            {/* 1. SEKME: CİRO & SATIŞ ANALİZİ + HAFTALIK & AYLIK TABLOLAR      */}
            {/* ============================================================== */}
            {currentActiveTab === 'analytics' && (
                <div>
                    {/* Period filter */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0 }}>
                                Finansal Performans & Satış Karnesi
                            </h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                Restoran cirosu, lezzet satışları ve gün gün raporlar
                            </p>
                        </div>
                        <div className="filter-pill-group">
                            <button className={`filter-pill-btn ${currentPeriod === 'today' ? 'active' : ''}`} onClick={() => setCurrentPeriod('today')}>Bugün</button>
                            <button className={`filter-pill-btn ${currentPeriod === 'week' ? 'active' : ''}`} onClick={() => setCurrentPeriod('week')}>Bu Hafta</button>
                            <button className={`filter-pill-btn ${currentPeriod === 'month' ? 'active' : ''}`} onClick={() => setCurrentPeriod('month')}>Bu Ay</button>
                            <button className={`filter-pill-btn ${currentPeriod === 'all' ? 'active' : ''}`} onClick={() => setCurrentPeriod('all')}>Tüm Zamanlar</button>
                        </div>
                    </div>

                    {/* 4 Büyük Finans Kartı */}
                    <div className="admin-kpi-grid">
                        <div className="stat-box" style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Toplam Net Ciro</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-gold)', marginTop: '6px' }}>{formatMoney(totalRevenue)}</div>
                            <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>Tahsil edilen tüm siparişler</div>
                        </div>

                        <div className="stat-box" style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tahsilat Dağılımı</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700, marginTop: '8px' }}>
                                <span style={{ color: 'var(--success)' }}>💵 Nakit: <b>{formatMoney(cashTotal)}</b></span>
                                <span style={{ color: '#60a5fa' }}>💳 Kart: <b>{formatMoney(cardTotal)}</b></span>
                            </div>
                            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', marginTop: '10px', overflow: 'hidden', display: 'flex' }}>
                                <div style={{ width: `${cashPct}%`, background: 'var(--success)', height: '100%' }}></div>
                                <div style={{ width: `${cardPct}%`, background: '#3b82f6', height: '100%' }}></div>
                            </div>
                        </div>

                        <div className="stat-box" style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tamamlanan Adisyon</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: 'white', marginTop: '6px' }}>{orderCount}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Kapanan masa hesabı</div>
                        </div>

                        <div className="stat-box" style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Ortalama Masa Sepeti</div>
                            <div style={{ fontSize: '28px', fontWeight: 800, color: 'var(--brand-primary)', marginTop: '6px' }}>{formatMoney(avgOrder)}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Masa başına düşen harcama</div>
                        </div>
                    </div>

                    {/* MÜŞTERİ İSTEĞİ 1: BU HAFTA GÜN GÜN TABLOSU (Pzt - Paz) */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        padding: '20px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-soft)',
                        marginBottom: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <Calendar size={18} className="text-amber-400" />
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0 }}>
                                Bu Hafta Gün Gün Raporu (Pazartesi - Pazar)
                            </h3>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                        <th style={{ padding: '10px 10px' }}>Gün</th>
                                        <th style={{ padding: '10px 10px' }}>Tarih</th>
                                        <th style={{ padding: '10px 10px' }}>Adisyon Sayısı</th>
                                        <th style={{ padding: '10px 10px' }}>Nakit</th>
                                        <th style={{ padding: '10px 10px' }}>Kredi Kartı</th>
                                        <th style={{ padding: '10px 10px', textAlign: 'right' }}>Toplam Ciro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {weeklyDayStats.map((d, i) => (
                                        <tr 
                                            key={i}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: d.isToday ? 'rgba(247, 103, 7, 0.12)' : 'transparent'
                                            }}
                                        >
                                            <td style={{ padding: '12px 10px', fontWeight: 800, color: d.isToday ? 'var(--brand-primary)' : 'white' }}>
                                                {d.dayName} {d.isToday && <span style={{ fontSize: '10px', background: 'var(--brand-primary)', color: 'white', padding: '2px 6px', borderRadius: '3px', marginLeft: '6px' }}>BUGÜN</span>}
                                            </td>
                                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{d.dateStr}</td>
                                            <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{d.count} adisyon</td>
                                            <td style={{ padding: '12px 10px', color: 'var(--success)', fontWeight: 700 }}>{formatMoney(d.cash)}</td>
                                            <td style={{ padding: '12px 10px', color: 'var(--brand-gold)', fontWeight: 700 }}>{formatMoney(d.card)}</td>
                                            <td style={{ padding: '12px 10px', color: 'white', fontWeight: 800, textAlign: 'right' }}>{formatMoney(d.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* MÜŞTERİ İSTEĞİ 2: BU AY GÜN GÜN TABLOSU (1 - 31) */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        padding: '20px',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--border-card)',
                        boxShadow: 'var(--shadow-soft)',
                        marginBottom: '22px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                            <CalendarDays size={18} className="text-amber-400" />
                            <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0 }}>
                                Bu Ay Gün Gün Raporu (1 - 31)
                            </h3>
                        </div>

                        <div style={{ overflowX: 'auto', maxHeight: '360px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)' }}>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                        <th style={{ padding: '10px 10px' }}>Gün</th>
                                        <th style={{ padding: '10px 10px' }}>Tarih</th>
                                        <th style={{ padding: '10px 10px' }}>Adisyon Sayısı</th>
                                        <th style={{ padding: '10px 10px' }}>Nakit</th>
                                        <th style={{ padding: '10px 10px' }}>Kredi Kartı</th>
                                        <th style={{ padding: '10px 10px', textAlign: 'right' }}>Günlük Ciro</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {monthlyDayStats.map((m, i) => (
                                        <tr 
                                            key={i}
                                            style={{
                                                borderBottom: '1px solid var(--border-subtle)',
                                                background: m.isToday ? 'rgba(247, 103, 7, 0.12)' : 'transparent'
                                            }}
                                        >
                                            <td style={{ padding: '10px 10px', fontWeight: 800, color: m.isToday ? 'var(--brand-primary)' : 'white' }}>
                                                Gün {m.dayNumber} {m.isToday && <span style={{ fontSize: '10px', background: 'var(--brand-primary)', color: 'white', padding: '2px 6px', borderRadius: '3px', marginLeft: '6px' }}>BUGÜN</span>}
                                            </td>
                                            <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>{m.dateDisplay}</td>
                                            <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>{m.count > 0 ? `${m.count} adisyon` : '-'}</td>
                                            <td style={{ padding: '10px 10px', color: 'var(--success)', fontWeight: 700 }}>{formatMoney(m.cash)}</td>
                                            <td style={{ padding: '10px 10px', color: 'var(--brand-gold)', fontWeight: 700 }}>{formatMoney(m.card)}</td>
                                            <td style={{ padding: '10px 10px', color: 'white', fontWeight: 800, textAlign: 'right' }}>{formatMoney(m.revenue)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 2-Sütunlu Analiz Tabloları (En Çok Satan Lezzetler + Garson/Mutfak Karnesi) */}
                    <div className="analytics-grid">
                        {/* Sol Sütun: En Çok Satan Lezzetler */}
                        <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                                <div>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>🏆 En Çok Satan Lezzetler</h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Hangi üründen kaç adet satıldı, ciro sağladı?</p>
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="Ürün ara..." 
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    style={{ padding: '6px 12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-sm)', fontSize: '13px' }}
                                />
                            </div>

                            <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                            <th style={{ padding: '10px 6px' }}>#</th>
                                            <th style={{ padding: '10px 8px' }}>Ürün</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'center' }}>Satış</th>
                                            <th style={{ padding: '10px 8px', textAlign: 'right' }}>Ciro</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {productStats.length === 0 ? (
                                            <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Satış kaydı bulunamadı.</td></tr>
                                        ) : (
                                            productStats.map((p, idx) => {
                                                const sharePct = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0;
                                                const rankClass = idx === 0 ? 'top-1' : (idx === 1 ? 'top-2' : (idx === 2 ? 'top-3' : ''));
                                                return (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-card)' }}>
                                                        <td style={{ padding: '10px 6px' }}>
                                                            <span className={`rank-badge ${rankClass}`}>{idx + 1}</span>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                                                            <div>{p.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{sharePct}% Ciro Payı</div>
                                                        </td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: 'var(--brand-primary)' }}>{p.quantity}x</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'white' }}>{formatMoney(p.revenue)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Sağ Sütun: Garson Ciro Karnesi & Mutfak Teslimat */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Garson Ciro Karnesi */}
                            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0' }}>👤 Garson Ciro & Performans Karnesi</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>Hangi garson kaç masaya baktı, ne kadar ciro sağladı?</p>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                                <th style={{ padding: '10px 8px' }}>Garson</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'center' }}>Masa</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Ciro</th>
                                                <th style={{ padding: '10px 8px', textAlign: 'right' }}>Ort. Masa</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {waiterStats.length === 0 ? (
                                                <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Kayıt bulunmuyor.</td></tr>
                                            ) : (
                                                waiterStats.map((w, idx) => (
                                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-card)' }}>
                                                        <td style={{ padding: '10px 8px', fontWeight: 700 }}>👤 {w.name}</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'center', color: 'var(--brand-gold)', fontWeight: 700 }}>{w.orderCount} Masa</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'white' }}>{formatMoney(w.revenue)}</td>
                                                        <td style={{ padding: '10px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>{formatMoney(w.revenue / Math.max(1, w.orderCount))}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mutfak Teslimat Karnesi */}
                            <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                                <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px 0' }}>🍳 Mutfak Operasyon & Teslimat</h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0' }}>Mutfak ekibinin hazırladığı ve teslim ettiği ürün sayısı</p>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>HAZIRLANAN KALEM</div>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--brand-gold)', marginTop: '4px' }}>{totalKitchenItemsCount} Adet</div>
                                    </div>
                                    <div style={{ background: 'var(--bg-surface-elevated)', padding: '14px', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>TAMAMLANAN MASALAR</div>
                                        <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>{orderCount} Masa</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
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

                    {/* Detaylı Açık Hesaplar Tablosu */}
                    <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>🧾 Açık Adisyonlar (Kasa Tahsilatı)</h3>
                            {selectedWaiterFilter !== 'all' && (
                                <button
                                    className="btn-outline"
                                    style={{ fontSize: '11px', padding: '3px 10px' }}
                                    onClick={() => setSelectedWaiterFilter('all')}
                                >
                                    Filtreyi Temizle (Tümünü Göster)
                                </button>
                            )}
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                        <th style={{ padding: '12px 10px' }}>Masa</th>
                                        <th style={{ padding: '12px 10px' }}>Garson</th>
                                        <th style={{ padding: '12px 10px' }}>Durum</th>
                                        <th style={{ padding: '12px 10px' }}>Ürünler</th>
                                        <th style={{ padding: '12px 10px' }}>Tutar</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'right' }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {openOrdersList.filter(o => selectedWaiterFilter === 'all' || o.waiter_name === selectedWaiterFilter).length === 0 ? (
                                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>Şu an açık hesap bulunmuyor.</td></tr>
                                    ) : (
                                        openOrdersList
                                            .filter(o => selectedWaiterFilter === 'all' || o.waiter_name === selectedWaiterFilter)
                                            .map(order => {
                                                const tNo = order.table_no;
                                                const allDelivered = (order.items || []).every(i => i.status === 'delivered');
                                                const itemsSummary = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');

                                                return (
                                                    <tr key={order.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                                                        <td style={{ padding: '12px 10px', fontWeight: 800, fontSize: '16px' }}>Masa {tNo}</td>
                                                        <td style={{ padding: '12px 10px', fontWeight: 700, color: 'var(--brand-gold)' }}>👤 {order.waiter_name || 'Personel'}</td>
                                                        <td style={{ padding: '12px 10px' }}>
                                                            <span className="user-role-tag" style={{ background: allDelivered ? 'var(--success)' : 'var(--danger)' }}>
                                                                {allDelivered ? 'SERVİS EDİLDİ' : 'MUTFAKTA'}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '12px 10px', maxWidth: '280px', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={itemsSummary}>
                                                            {itemsSummary}
                                                        </td>
                                                        <td style={{ padding: '12px 10px', fontWeight: 800, fontSize: '16px', color: 'white' }}>{formatMoney(order.total)}</td>
                                                        <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                                            <button 
                                                                className="btn-outline" 
                                                                style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 700, borderRadius: '6px' }}
                                                                onClick={() => setSelectedDrawerTable(tNo)}
                                                                title="Adisyonu Aç"
                                                            >
                                                                Adisyon ↗
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* 3. SEKME: PERSONEL & PIN YÖNETİMİ (FIRESTORE 3 TABLO CRUD)      */}
            {/* ============================================================== */}
            {currentActiveTab === 'staff' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0 }}>👥 Personel & Görev Yönetimi</h2>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Garsonlar ve Yöneticiler Firestore veritabanında ayrı tablolarda tutulur.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <button className="btn-outline" style={{ padding: '10px 14px', fontSize: '13px', borderColor: 'var(--brand-gold)', color: '#ffd43b' }} onClick={seedTestStaff}>
                                ⚡ Test Personellerini Oluştur
                            </button>
                            <button className="btn-primary" style={{ padding: '10px 18px', fontSize: '13px' }} onClick={() => setShowStaffModal(true)}>
                                + Yeni Personel Ekle
                            </button>
                        </div>
                    </div>

                    {/* 1. TABLO: GARSONLAR (waiters) */}
                    <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)', marginBottom: '22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '22px' }}>📱</span>
                                <div>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0 }}>Garsonlar Tablosu <code style={{ fontSize: '12px', color: 'var(--brand-gold)', background: 'rgba(245,159,0,0.1)', padding: '2px 6px', borderRadius: '4px' }}>firestore/waiters</code></h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Sipariş alan ve masaları servis eden garson kadrosu</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, background: 'var(--bg-surface-elevated)', color: 'var(--brand-gold)', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border-card)' }}>{waitersList.length} Garson</span>
                                <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px', borderColor: 'var(--brand-gold)', color: '#ffd43b' }} onClick={() => { setStaffModalRole('waiter'); setShowStaffModal(true); }}>+ Garson Ekle</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                        <th style={{ padding: '12px 10px' }}>Garson Adı</th>
                                        <th style={{ padding: '12px 10px' }}>Giriş PIN</th>
                                        <th style={{ padding: '12px 10px' }}>Alınan Sipariş</th>
                                        <th style={{ padding: '12px 10px' }}>Toplam Ciro</th>
                                        <th style={{ padding: '12px 10px' }}>Satılan Ürün</th>
                                        <th style={{ padding: '12px 10px' }}>Durum</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'right' }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {waitersList.map(w => (
                                        <tr key={w.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                                            <td style={{ padding: '14px 10px', fontWeight: 700, color: 'white' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                                                    <span>{w.name}</span>
                                                    {w.section && <span style={{ fontSize: '10px', color: 'var(--brand-gold)', background: 'rgba(245,159,0,0.1)', padding: '2px 6px', borderRadius: '3px' }}>{w.section}</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 10px', fontFamily: 'monospace', fontSize: '14px', color: 'var(--brand-gold)', fontWeight: 800 }}>{w.pin || '------'}</td>
                                            <td style={{ padding: '14px 10px', fontWeight: 700, color: 'white' }}>{w.total_orders_count || 0} Adet</td>
                                            <td style={{ padding: '14px 10px', fontWeight: 800, color: '#ffd43b' }}>{formatMoney(w.total_revenue || 0)}</td>
                                            <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>{w.total_items_sold || 0} Kalem</td>
                                            <td style={{ padding: '14px 10px' }}><span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '4px' }}>● Aktif</span></td>
                                            <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                    <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--brand-gold)', borderColor: 'rgba(245,159,0,0.4)' }} onClick={() => { setEditingStaffPin(w); setNewPinInput(''); setShowPinModal(true); }}>🔑 PIN</button>
                                                    <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }} onClick={() => handleDeleteStaff(w.id, 'waiter', w.name)}>Sil</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* 3. TABLO: YÖNETİCİLER (managers) */}
                    <div style={{ background: 'var(--bg-surface)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '22px' }}>👑</span>
                                <div>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0 }}>Yöneticiler Tablosu <code style={{ fontSize: '12px', color: '#ff6b6b', background: 'rgba(255,107,107,0.1)', padding: '2px 6px', borderRadius: '4px' }}>firestore/managers</code></h3>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Tüm restorana, kasaya ve istatistiklere tam yetkili yöneticiler</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 800, background: 'var(--bg-surface-elevated)', color: '#ff6b6b', padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border-card)' }}>{managersList.length} Yönetici</span>
                                <button className="btn-outline" style={{ fontSize: '12px', padding: '6px 12px', borderColor: '#ff6b6b', color: '#ff6b6b' }} onClick={() => { setStaffModalRole('admin'); setShowStaffModal(true); }}>+ Yönetici Ekle</button>
                            </div>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '13px' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                        <th style={{ padding: '12px 10px' }}>Yönetici Adı</th>
                                        <th style={{ padding: '12px 10px' }}>Giriş PIN</th>
                                        <th style={{ padding: '12px 10px' }}>İletişim</th>
                                        <th style={{ padding: '12px 10px' }}>Yetki Seviyesi</th>
                                        <th style={{ padding: '12px 10px' }}>Durum</th>
                                        <th style={{ padding: '12px 10px', textAlign: 'right' }}>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {managersList.map(m => (
                                        <tr key={m.id} style={{ borderBottom: '1px solid var(--border-card)' }}>
                                            <td style={{ padding: '14px 10px', fontWeight: 700, color: 'white' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#ffd43b' }}></span>
                                                    <span>{m.name}</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '14px 10px', fontFamily: 'monospace', fontSize: '14px', color: '#ff6b6b', fontWeight: 800 }}>{m.pin || '------'}</td>
                                            <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>{m.phone || '0532 100 20 30'}</td>
                                            <td style={{ padding: '14px 10px' }}><span style={{ color: 'var(--brand-gold)', fontSize: '11px', fontWeight: 800, background: 'rgba(245,159,0,0.15)', padding: '3px 8px', borderRadius: '4px' }}>👑 Tam Yetki</span></td>
                                            <td style={{ padding: '14px 10px' }}><span style={{ color: 'var(--brand-gold)', fontSize: '12px', fontWeight: 700 }}>● Aktif</span></td>
                                            <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                    <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--brand-gold)', borderColor: 'rgba(245,159,0,0.4)' }} onClick={() => { setEditingStaffPin(m); setNewPinInput(''); setShowPinModal(true); }}>🔑 PIN</button>
                                                    <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)' }} onClick={() => handleDeleteStaff(m.id, 'admin', m.name)}>Sil</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
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
                                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Çalışma Alanı / Bölüm:</label>
                                <input 
                                    type="text" 
                                    value={staffExtraInput} 
                                    onChange={(e) => setStaffExtraInput(e.target.value)}
                                    placeholder="Örn: Teras, Salon, Bahçe" 
                                    style={{ width: '100%', padding: '12px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '14px' }} 
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
                <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                    {/* Üst Bilgi Kartı */}
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.12), rgba(15, 23, 42, 0.6))',
                        border: '1px solid rgba(59, 130, 246, 0.35)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '20px 24px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '50px',
                                height: '50px',
                                borderRadius: '12px',
                                background: 'rgba(37, 99, 235, 0.25)',
                                border: '1px solid #3b82f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '24px'
                            }}>
                                🖨️
                            </div>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 4px 0', color: 'white' }}>
                                    Merkezi Mutfak Yazıcısı Yapılandırması
                                </h2>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
                                    Buraya gireceğiniz IP adresi <strong>tüm garson tablet ve telefonlarına anında aktarılır</strong>. Garsonların hiçbir ayar yapmasına gerek kalmaz!
                                </p>
                            </div>
                        </div>

                        <div style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            background: printerSettings?.ip ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 159, 0, 0.15)',
                            border: `1px solid ${printerSettings?.ip ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 159, 0, 0.4)'}`,
                            fontSize: '12px',
                            fontWeight: 700,
                            color: printerSettings?.ip ? '#10b981' : '#f59f00'
                        }}>
                            {printerSettings?.ip ? `● Aktif IP: ${printerSettings.ip}:${printerSettings.port || '9100'}` : '○ Henüz IP Girilmedi'}
                        </div>
                    </div>

                    {/* Ayar Formu */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        marginBottom: '24px',
                        boxShadow: 'var(--shadow-soft)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>⚙️</span> Bağlantı Parametreleri
                        </h3>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Mutfak Yazıcısı IP Adresi (Modemden Alınan IP):
                                </label>
                                <input 
                                    type="text" 
                                    value={printerIpInput} 
                                    onChange={(e) => setPrinterIpInput(e.target.value)} 
                                    placeholder="Örn: 192.168.1.199" 
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'var(--bg-surface-elevated)',
                                        border: '1px solid var(--border-card)',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#38bdf8',
                                        fontFamily: 'monospace',
                                        fontSize: '16px',
                                        fontWeight: 800
                                    }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    Xprinter XP-Q805K veya benzeri Ethernet termal yazıcınızın IP'si.
                                </span>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                                    Port Numarası (Varsayılan 9100):
                                </label>
                                <input 
                                    type="text" 
                                    value={printerPortInput} 
                                    onChange={(e) => setPrinterPortInput(e.target.value)} 
                                    placeholder="9100" 
                                    style={{
                                        width: '100%',
                                        padding: '12px 14px',
                                        background: 'var(--bg-surface-elevated)',
                                        border: '1px solid var(--border-card)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'white',
                                        fontFamily: 'monospace',
                                        fontSize: '16px',
                                        fontWeight: 700
                                    }}
                                />
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                                    Termal fiş yazıcılarının standart RAW ESC/POS portu 9100'dür.
                                </span>
                            </div>
                        </div>

                        {/* Mod Seçimi */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Yazdırma Modu:
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                                <div 
                                    onClick={() => setPrinterModeInput('rawbt')}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${printerModeInput === 'rawbt' ? '#10b981' : 'var(--border-card)'}`,
                                        background: printerModeInput === 'rawbt' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-surface-elevated)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontWeight: 800, color: printerModeInput === 'rawbt' ? '#10b981' : 'white', fontSize: '14px', marginBottom: '4px' }}>
                                        ⚡ Direkt Baskı – RawBT (Önerilen)
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                                        Önizleme açılmaz. Fiş (logolu) doğrudan yazıcıdan çıkar. Android tabletlerde RawBT uygulaması gerekir.
                                    </div>
                                </div>

                                <div 
                                    onClick={() => setPrinterModeInput('browser')}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: 'var(--radius-md)',
                                        border: `2px solid ${printerModeInput === 'browser' ? '#3b82f6' : 'var(--border-card)'}`,
                                        background: printerModeInput === 'browser' ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface-elevated)',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    <div style={{ fontWeight: 800, color: printerModeInput === 'browser' ? '#3b82f6' : 'white', fontSize: '14px', marginBottom: '4px' }}>
                                        🖥️ Sistem Yazdırma Penceresi
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                                        Her fişte cihazın yazdırma ekranı açılır. Sadece bilgisayardan basılacaksa kullanın.
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Aksiyon Butonları */}
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                            <button 
                                onClick={handleTestPrintTicket} 
                                className="btn-outline" 
                                style={{ padding: '12px 20px', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', color: '#38bdf8', borderColor: '#38bdf8' }}
                            >
                                🧪 Deneme / Test Fişi Bas
                            </button>
                            <button 
                                onClick={handleSavePrinterSettings} 
                                className="btn-primary" 
                                style={{ padding: '12px 24px', fontSize: '14px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
                            >
                                💾 Ayarları Kaydet ve Tüm Cihazlara Uygula
                            </button>
                        </div>
                    </div>

                    {/* Kolay Kurulum Rehberi */}
                    <div style={{
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '24px',
                        boxShadow: 'var(--shadow-soft)'
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '14px', color: 'white' }}>
                            📖 Adım Adım Kurulum Rehberi (Xprinter XP-Q805K)
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', lineHeight: 1.5, color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                                <div><strong>Kablo Bağlantısı:</strong> Yazıcıyı mutfağa koyun, güç kablosunu prize takın ve Ethernet (LAN) kablosunu restoranınızın ana modemine bağlayın.</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                                <div><strong>IP Adresini Öğrenme (Self-Test):</strong> Yazıcı kapalıyken önündeki <code>FEED</code> (Kağıt Besleme) tuşuna basılı tutun ve o basılıyken açma anahtarına basın. 3 saniye sonra bırakın. Yazıcı bir test fişi basacaktır ve üzerinde <code>IP Address: 192.168.1.XXX</code> yazacaktır.</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                                <div><strong>Sisteme Tanımlama:</strong> Yukarıdaki "Mutfak Yazıcısı IP Adresi" kutucuğuna test fişindeki IP'yi yazın ve <strong>"Ayarları Kaydet"</strong> butonuna basın.</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'white', fontWeight: 800, borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</span>
                                <div><strong>Tamamlandı!</strong> Artık hiçbir garsonun tabletinde IP girmesine gerek yoktur. Sipariş verildiğinde fiş otomatik olarak mutfaktaki yazıcıdan çıkacaktır.</div>
                            </div>
                        </div>
                    </div>
                </div>
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
                                    {drawerOrder?.waiter_name || 'Ahmet'}
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
                                    <button 
                                        className="btn-primary" 
                                        style={{ padding: '8px 18px', fontSize: '12px' }}
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

                        {/* Footer & Checkout Buttons (Garson Ekranı ile Birebir Aynı) */}
                        {drawerOrder && (
                            <div className="receipt-footer">
                                <div className="total-summary">
                                    <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Genel Tutar</span>
                                    <span style={{ color: 'var(--brand-gold)', fontSize: '24px', fontWeight: 800 }}>
                                        {formatMoney(drawerOrder.total)}
                                    </span>
                                </div>

                                {/* Sipariş Ekle & Mutfağa Fiş Yazdır Butonları */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                                    <button
                                        onClick={() => {
                                            const tNo = selectedDrawerTable;
                                            setSelectedDrawerTable(null);
                                            navigateTo('table', tNo);
                                        }}
                                        className="btn-outline"
                                        style={{
                                            width: '100%',
                                            padding: '10px',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            color: 'var(--brand-gold)',
                                            borderColor: 'var(--brand-gold)'
                                        }}
                                    >
                                        ➕ Masaya Git & Sipariş Ekle ↗
                                    </button>

                                    <button
                                        onClick={handlePrintDrawerKitchenTicket}
                                        className="btn-primary"
                                        style={{
                                            width: '100%',
                                            padding: '11px',
                                            fontSize: '13px',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <Printer size={15} /> Mutfağa Fiş Gönder
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
        </div>
    );
}
