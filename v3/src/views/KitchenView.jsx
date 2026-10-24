import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { db, doc, updateDoc, collection, addDoc, setDoc, onSnapshot, query, where, limit } from '../config/firebase';
import {
    playNotificationSound,
    playOrderReadySound,
    playDeliveryAlertSound,
    speakAnnouncement,
    announceKitchenOrder,
    playKeypadBeep,
    warmUpAudio,
    testVoiceAnnouncement
} from '../services/audioService';
import {
    ChefHat,
    ArrowLeft,
    Clock,
    CheckCircle2,
    Volume2,
    VolumeX,
    Maximize2,
    Minimize2,
    Flame,
    Check,
    AlertCircle,
    Sparkles,
    Send,
    CheckCheck,
    MessageSquare,
    Filter,
    LayoutGrid,
    Columns,
    X,
    ChevronRight,
    History,
    RotateCcw,
    LogOut
} from 'lucide-react';

// Tabletlerde kasma ve donmayı önlemek için saniyede 1 çalışan dijital saati izole memo bileşeni yapıyoruz
const KitchenClock = React.memo(function KitchenClock() {
    const [time, setTime] = useState('');
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div style={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 800,
            color: 'var(--brand-gold, #fbbf24)',
            fontSize: '12.5px',
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.25)',
            padding: '4px 8px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
        }}>
            <Clock size={12} />
            {time}
        </div>
    );
});

export default function KitchenView() {
    const {
        activeOrders,
        loadingOrders,
        navigateTo,
        currentUser,
        soundEnabled,
        toggleSound,
        isFullscreen,
        toggleFullscreen,
        showToast,
        logout
    } = useApp();

    const [currentFilter, setCurrentFilter] = useState('all'); // 'all' | 'cooking' | 'ready' | 'urgent'
    const [selectedBatchItem, setSelectedBatchItem] = useState(null); // string | null (Toplu Pişirme Özeti seçili filtre)
    const [selectedTableNo, setSelectedTableNo] = useState(null);
    const [layoutMode, setLayoutMode] = useState(() => {
        try {
            return localStorage.getItem('kds_layout_mode') || 'horizontal';
        } catch (e) {
            return 'horizontal';
        }
    });

    const handleToggleLayoutMode = (mode) => {
        setLayoutMode(mode);
        try {
            localStorage.setItem('kds_layout_mode', mode);
        } catch (e) { }
    };

    const prevOrdersRef = useRef({});
    const isFirstLoadRef = useRef(true);
    const mountTimeRef = useRef(Date.now());

    // Günlük tamamlanan sipariş geçmişi paneli state'i
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [kitchenHistory, setKitchenHistory] = useState([]);

    // Bugün tamamlanan mutfak siparişlerini gerçek zamanlı dinle
    useEffect(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        try {
            const q = query(
                collection(db, "kitchen_history"),
                where("date_str", "==", todayStr),
                limit(60)
            );
            const unsub = onSnapshot(q, (snap) => {
                const list = [];
                snap.forEach(d => list.push({ id: d.id, ...d.data() }));
                list.sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
                setKitchenHistory(list);
            }, (err) => {
                console.warn("kitchen_history listener error:", err);
            });
            return () => unsub();
        } catch (e) {
            console.error("kitchen_history setup error:", e);
        }
    }, []);

    // Tablet ekranının mutfakta açık kalmasını sağlayan Screen Wake Lock API ve ilk dokunuş aktivasyonu
    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) { }
        };
        requestWakeLock();

        const handleVisibility = () => {
            if (wakeLock !== null && document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);

        // Tablette arka plan ses kısıtlamasını aşmak için ilk dokunuşta ses motorunu ısıt
        const handleFirstTouch = () => {
            warmUpAudio();
        };
        window.addEventListener('touchstart', handleFirstTouch, { once: true, passive: true });
        window.addEventListener('click', handleFirstTouch, { once: true });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('touchstart', handleFirstTouch);
            window.removeEventListener('click', handleFirstTouch);
            if (wakeLock) {
                wakeLock.release().catch(() => { });
            }
        };
    }, []);

    // Yeni gelen siparişleri veya ek siparişleri algılayıp sesli ve kalem kalem anonslu uyarı verme
    // (Sayfa yenilendiğinde veya ilk açılışta eski mevcut siparişleri asla yeni sipariş gibi okumaz)
    useEffect(() => {
        // 1. Firestore ilk yüklemesi tamamlanana kadar bekle
        if (loadingOrders) {
            return;
        }

        // 2. İlk yüklemede veya sayfa yenilendiğinde mevcut açık masaları referansa al, bildirim/anons çalma
        if (isFirstLoadRef.current) {
            prevOrdersRef.current = { ...activeOrders };
            isFirstLoadRef.current = false;
            return;
        }

        const now = Date.now();
        // Sayfa açılışından sonraki ilk 2.5 saniyede gelebilecek gecikmeli ilk paketleri güvenlik olarak filtrele
        const isGracePeriod = (now - mountTimeRef.current) < 2500;
        if (isGracePeriod) {
            prevOrdersRef.current = { ...activeOrders };
            return;
        }

        Object.entries(activeOrders).forEach(([tableNo, order]) => {
            const prevOrder = prevOrdersRef.current[tableNo];
            // Yalnızca mutfağa iletilmiş (kitchen_sent !== false) olan pişmekte olan ürünleri say:
            const sentCookingItems = (order.items || []).filter(i => i.status === 'cooking' && i.kitchen_sent !== false);
            const prevSentCookingCount = (prevOrder?.items || []).filter(i => i.status === 'cooking' && i.kitchen_sent !== false).length;

            // Yeni gelen siparişin gerçekten son 45 saniye içinde mi oluşturulduğunu/güncellendiğini doğrula
            const orderTime = new Date(order.updated_at || order.created_at || 0).getTime();
            const isFreshOrder = (now - orderTime) < 45000;

            if (sentCookingItems.length > 0 && (!prevOrder || sentCookingItems.length > prevSentCookingCount)) {
                // Eğer masa referansta yoktu ama sipariş eski bir zamandan kalmaysa (yenileme/gecikme) anons etme
                if (!prevOrder && !isFreshOrder) {
                    return;
                }

                // Yeni sipariş geldiğinde ekranı otomatik 'Tümü'ne al ki aşçı anında görsün
                setCurrentFilter('all');

                const prevHadSentItems = (prevOrder?.items || []).some(i => i.kitchen_sent !== false);
                const isExtra = !!prevOrder && prevHadSentItems;

                if (soundEnabled) {
                    announceKitchenOrder(tableNo, [], isExtra);
                }
                showToast(`🔔 Masa ${tableNo} için ${isExtra ? 'ek' : 'yeni'} mutfak siparişi geldi!`, 'warning');
            } else if (prevSentCookingCount > 0 && sentCookingItems.length < prevSentCookingCount) {
                // Daha önce mutfağa gönderilmiş pişmekte olan ürün silindiyse / iptal edildiyse:
                if (soundEnabled) {
                    speakAnnouncement(`Dikkat! Masa ${tableNo} siparişi iptal edildi. ... Tekrar ediyorum: Masa ${tableNo} siparişi iptal edildi!`, true);
                }
                showToast(`⚠️ Masa ${tableNo} siparişi iptal edildi / güncellendi.`, 'info');
            }
        });

        prevOrdersRef.current = { ...activeOrders };
    }, [activeOrders, loadingOrders, soundEnabled, showToast]);

    // Format elapsed time
    const formatElapsedTime = (isoString) => {
        if (!isoString) return 'Yeni sipariş';
        const diffMs = Date.now() - new Date(isoString).getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Yeni sipariş';
        if (diffMins < 60) return `${diffMins} dk önce`;
        const diffHours = Math.floor(diffMins / 60);
        return `${diffHours} sa ${diffMins % 60} dk`;
    };

    // Tüm açık mutfak siparişleri (Yalnızca mutfağa gönderilmiş ve henüz dismiss edilmemiş olanlar)
    // Aciliyet & Bekleme Süresi Sıralaması (Otomatik Öncelik): En uzun süredir bekleyen sipariş daima en başta yer alır
    const kitchenOrders = useMemo(() => {
        const now = Date.now();
        return Object.values(activeOrders)
            .filter(ord => {
                const items = ord.items || [];
                if (items.length === 0) return false;
                const hasCooking = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
                // Tek tıkla tamamlanıp kaldırılan masalar ('dismissed') mutfak canlı panosunda görünmez,
                // ANCAK: Masada şu an pişmekte olan bir sipariş varsa kesinlikle mutfakta görünmelidir:
                if (ord.kitchen_status === 'dismissed' && !hasCooking) return false;
                const hasAnySent = items.some(i => i.kitchen_sent !== false);
                return hasCooking || hasAnySent;
            })
            .sort((a, b) => {
                const aItems = a.items || [];
                const bItems = b.items || [];
                const aHasCooking = aItems.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
                const bHasCooking = bItems.some(i => i.status === 'cooking' && i.kitchen_sent !== false);

                // 1. Pişmekte olan siparişler daima servise hazır bekleyenlerin önündedir
                if (aHasCooking && !bHasCooking) return -1;
                if (!aHasCooking && bHasCooking) return 1;

                // 2. Pişen siparişler arasında bekleme süresine göre katı öncelik:
                // En eski sipariş zaman damgası (en uzun bekleyen) en başta çıkar!
                const aTime = new Date(a.updated_at || a.created_at || now).getTime();
                const bTime = new Date(b.updated_at || b.created_at || now).getTime();
                return aTime - bTime;
            });
    }, [activeOrders]);

    // Toplu Pişirme / Üretim Özeti:
    // Tüm aktif masalarda şu an pişmekte olan tüm yemekleri toplar (örn: 6x Kuymak, 4x Sahanda Yumurta)
    const batchCookingSummary = useMemo(() => {
        const summaryMap = {};

        kitchenOrders.forEach(ord => {
            const items = ord.items || [];
            items.forEach(i => {
                if (i.status === 'cooking' && i.kitchen_sent !== false) {
                    const name = (i.name || '').trim();
                    if (!name) return;
                    const qty = Number(i.quantity) || 1;
                    if (!summaryMap[name]) {
                        summaryMap[name] = {
                            name,
                            totalQty: 0,
                            tables: new Set()
                        };
                    }
                    summaryMap[name].totalQty += qty;
                    summaryMap[name].tables.add(ord.table_no);
                }
            });
        });

        return Object.values(summaryMap)
            .map(item => ({
                ...item,
                tables: Array.from(item.tables).sort((a, b) => Number(a) - Number(b))
            }))
            .sort((a, b) => b.totalQty - a.totalQty);
    }, [kitchenOrders]);

    // Metrikler & Aciliyet Sayıları
    const { cookingOrdersCount, readyOrdersCount, urgentOrdersCount, totalPendingItemsCount } = useMemo(() => {
        let cookingCount = 0;
        let readyCount = 0;
        let urgentCount = 0;
        let pendingItems = 0;
        const now = Date.now();

        kitchenOrders.forEach(ord => {
            const items = ord.items || [];
            const hasCooking = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
            if (hasCooking) {
                cookingCount++;
                const diffMinutes = Math.floor((now - new Date(ord.updated_at || ord.created_at || now).getTime()) / 60000);
                if (diffMinutes >= 15) {
                    urgentCount++;
                }
                items.forEach(i => {
                    if (i.status === 'cooking' && i.kitchen_sent !== false) {
                        pendingItems += (Number(i.quantity) || 1);
                    }
                });
            } else {
                readyCount++;
            }
        });

        return {
            cookingOrdersCount: cookingCount,
            readyOrdersCount: readyCount,
            urgentOrdersCount: urgentCount,
            totalPendingItemsCount: pendingItems
        };
    }, [kitchenOrders]);

    // Eğer filtrelerde aktif masa kalmadıysa otomatik 'Tümü'ne dön:
    useEffect(() => {
        if (currentFilter === 'ready' && readyOrdersCount === 0 && cookingOrdersCount > 0) {
            setCurrentFilter('all');
        }
        if (currentFilter === 'urgent' && urgentOrdersCount === 0 && cookingOrdersCount > 0) {
            setCurrentFilter('all');
        }
    }, [currentFilter, readyOrdersCount, cookingOrdersCount, urgentOrdersCount]);

    // Filtrelenmiş liste
    const filteredOrders = useMemo(() => {
        const now = Date.now();
        return kitchenOrders.filter(ord => {
            const items = ord.items || [];
            const hasCooking = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
            const diffMinutes = Math.floor((now - new Date(ord.updated_at || ord.created_at || now).getTime()) / 60000);

            if (currentFilter === 'cooking' && !hasCooking) return false;
            if (currentFilter === 'ready' && hasCooking) return false;
            if (currentFilter === 'urgent' && (!hasCooking || diffMinutes < 15)) return false;

            // Toplu Pişirme / Ürün filtresi: Aşçı bir yemeğe tıkladıysa sadece o yemeğin piştiği masaları göster
            if (selectedBatchItem) {
                const hasBatchItem = items.some(i =>
                    (i.name || '').trim().toLowerCase() === selectedBatchItem.trim().toLowerCase() &&
                    i.status === 'cooking' &&
                    i.kitchen_sent !== false
                );
                if (!hasBatchItem) return false;
            }

            return true;
        });
    }, [kitchenOrders, currentFilter, selectedBatchItem]);

    // Sağdan açılan detay paneli için seçilen canlı masa
    const selectedOrder = useMemo(() => {
        if (!selectedTableNo) return null;
        return activeOrders[selectedTableNo] || kitchenOrders.find(o => String(o.table_no) === String(selectedTableNo)) || null;
    }, [selectedTableNo, activeOrders, kitchenOrders]);

    // Tek bir ürünün teslim / hazır durumunu değiştirme
    const handleToggleItemStatus = async (order, realIdx) => {
        playKeypadBeep();
        const items = [...(order.items || [])];
        if (!items[realIdx]) return;

        const currentStatus = items[realIdx].status;
        const nextStatus = currentStatus === 'delivered' ? 'cooking' : 'delivered';
        items[realIdx] = { ...items[realIdx], status: nextStatus };

        const allDelivered = items.every(i => i.status === 'delivered');
        const docId = order.id || `table_${order.table_no}`;
        const nowIso = new Date().toISOString();

        try {
            await updateDoc(doc(db, "orders", docId), {
                items,
                all_delivered: allDelivered,
                kitchen_status: allDelivered ? 'completed' : 'pending',
                kitchen_notified_at: allDelivered ? Date.now() : null,
                updated_at: nowIso
            });

            if (nextStatus === 'delivered') {
                playDeliveryAlertSound();
                showToast(`✓ ${items[realIdx].name} hazırlandı!`, 'success');
            } else {
                showToast(`${items[realIdx].name} hazırlanıyor durumuna geri alındı.`, 'info');
            }
        } catch (err) {
            console.error("handleToggleItemStatus error:", err);
            showToast("Ürün durumu güncellenirken hata oluştu.", "danger");
        }
    };

    // Birleşik günlük mutfak geçmişi (Firestore + aktif dismissed masalar)
    const combinedHistory = useMemo(() => {
        const map = new Map();
        kitchenHistory.forEach(item => {
            const key = item.order_doc_id || item.id;
            map.set(key, item);
        });
        Object.values(activeOrders).forEach(ord => {
            if (ord.kitchen_status === 'dismissed' && ord.kitchen_delivered_at) {
                const docId = ord.id || `table_${ord.table_no}`;
                if (!map.has(docId)) {
                    map.set(docId, {
                        id: `active_${docId}`,
                        table_no: Number(ord.table_no),
                        waiter_name: ord.waiter_name || 'Personel',
                        items: (ord.items || []).filter(i => i.kitchen_sent !== false),
                        completed_at: ord.kitchen_delivered_at,
                        completed_time_str: new Date(ord.kitchen_delivered_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                        date_str: new Date(ord.kitchen_delivered_at).toISOString().split('T')[0],
                        order_doc_id: docId
                    });
                }
            }
        });
        return Array.from(map.values()).sort((a, b) => new Date(b.completed_at || 0) - new Date(a.completed_at || 0));
    }, [kitchenHistory, activeOrders]);

    // TEK TIKLA MASAYI TAMAMLAMA (Garsona anında bildirim gider ve ekrandan kalkar)
    const handleDeliverAllOrderItems = async (order) => {
        playKeypadBeep();
        const items = (order.items || []).map(i => ({ ...i, status: 'delivered' }));
        const docId = order.id || `table_${order.table_no}`;
        const nowIso = new Date().toISOString();
        const nowTime = Date.now();

        try {
            // 1. Masayı Firestore'da 'delivered' ve 'dismissed' yap (TEK TIKLA EKRANDAN KALKAR)
            await updateDoc(doc(db, "orders", docId), {
                items,
                all_delivered: true,
                kitchen_status: 'dismissed',
                kitchen_delivered_at: nowIso,
                kitchen_notified_at: nowTime,
                kitchen_completed_by: currentUser?.name || 'Mutfak',
                updated_at: nowIso
            });

            // 2. Günlük geçmişe kaydet
            try {
                await addDoc(collection(db, "kitchen_history"), {
                    table_no: Number(order.table_no),
                    waiter_name: order.waiter_name || 'Personel',
                    items: items.filter(i => i.kitchen_sent !== false),
                    completed_at: nowIso,
                    completed_time_str: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
                    date_str: nowIso.split('T')[0],
                    order_doc_id: docId
                });
            } catch (e) {
                console.error("kitchen_history addDoc error:", e);
            }

            playOrderReadySound();
            showToast(`✓ Masa ${order.table_no} hazırlandı ve garsona bildirildi!`, 'success');
        } catch (err) {
            console.error("handleDeliverAllOrderItems error:", err);
            showToast("Teslimat onaylanırken hata oluştu.", "danger");
        }
    };

    // Yanlışlıkla butona basıldıysa siparişi tekrar mutfak panosuna geri alma
    const handleRestoreOrder = async (historyItem) => {
        playKeypadBeep();
        const docId = historyItem.order_doc_id || `table_${historyItem.table_no}`;
        const nowIso = new Date().toISOString();
        try {
            const currentActive = activeOrders[String(historyItem.table_no)];
            if (currentActive) {
                const revertedItems = (currentActive.items || []).map(i => ({
                    ...i,
                    status: i.kitchen_sent !== false ? 'cooking' : i.status
                }));
                await updateDoc(doc(db, "orders", docId), {
                    items: revertedItems,
                    all_delivered: false,
                    kitchen_status: 'pending',
                    kitchen_notified_at: null,
                    updated_at: nowIso
                });
            } else {
                await setDoc(doc(db, "orders", docId), {
                    table_no: Number(historyItem.table_no),
                    waiter_name: historyItem.waiter_name || 'Personel',
                    items: (historyItem.items || []).map(i => ({ ...i, status: 'cooking' })),
                    all_delivered: false,
                    status: 'open',
                    kitchen_status: 'pending',
                    created_at: historyItem.completed_at || nowIso,
                    updated_at: nowIso
                }, { merge: true });
            }
            showToast(`↺ Masa ${historyItem.table_no} tekrar mutfak panosuna geri alındı!`, 'info');
        } catch (err) {
            console.error("handleRestoreOrder error:", err);
            showToast("Sipariş geri alınamadı.", "danger");
        }
    };

    return (
        <div
            className="kitchen-page-container"
            style={{
                padding: '6px 10px',
                maxWidth: '100%',
                margin: '0 auto',
                height: '100vh',
                maxHeight: '100dvh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxSizing: 'border-box'
            }}
        >
            {/* ============================================================== */}
            {/* 1. ÜST KONTROL & BİLGİ ŞERİDİ (KOMPAKT SLIM KDS HEADER)         */}
            {/* ============================================================== */}
            <div style={{
                background: 'rgba(28, 21, 20, 0.94)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(247, 103, 7, 0.3)',
                borderRadius: '12px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '6px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.45)',
                flexShrink: 0
            }}>
                {/* Sol: Logo, Başlık ve Canlı İstatistik */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                        color: 'white',
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 2px 8px rgba(247, 103, 7, 0.4)'
                    }}>
                        <ChefHat size={16} strokeWidth={2.4} />
                    </div>

                    <span style={{ fontWeight: 900, fontSize: '15px', color: '#fffaf5', letterSpacing: '-0.02em', whiteSpace: 'nowrap' }}>
                        MUTFAK
                    </span>

                    {/* Canlı Metrik Hapı (Kompakt Tek Rozet) */}
                    <div style={{
                        background: cookingOrdersCount > 0 ? 'rgba(247, 103, 7, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                        border: cookingOrdersCount > 0 ? '1px solid rgba(247, 103, 7, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '999px',
                        padding: '3px 9px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        color: cookingOrdersCount > 0 ? '#fb923c' : 'var(--text-muted, #94a3b8)',
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                    }}>
                        <Flame size={12} color={cookingOrdersCount > 0 ? '#f97316' : '#888'} />
                        <span><strong>{cookingOrdersCount}</strong> Masa</span>
                        <span style={{ opacity: 0.4 }}>•</span>
                        <span><strong>{totalPendingItemsCount}</strong> Kalem</span>
                    </div>
                </div>

                {/* Sağ: Filtre Sekmeleri, Görünüm Modu, Saat ve Kontroller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>

                    {/* Hızlı Filtre Butonları */}
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '9px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <button
                            type="button"
                            onClick={() => setCurrentFilter('all')}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                background: currentFilter === 'all' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: currentFilter === 'all' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer'
                            }}
                        >
                            Tümü ({kitchenOrders.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentFilter('cooking')}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                background: currentFilter === 'cooking' ? 'linear-gradient(135deg, #f59f00 0%, #d97706 100%)' : 'transparent',
                                color: currentFilter === 'cooking' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer'
                            }}
                        >
                            🟡 Pişen ({cookingOrdersCount})
                        </button>
                        {urgentOrdersCount > 0 && (
                            <button
                                type="button"
                                onClick={() => setCurrentFilter('urgent')}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '7px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    border: 'none',
                                    background: currentFilter === 'urgent' ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' : 'rgba(239, 68, 68, 0.16)',
                                    color: currentFilter === 'urgent' ? '#ffffff' : '#ef4444',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                }}
                            >
                                <span>🚨 Acil ({urgentOrdersCount})</span>
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setCurrentFilter('ready')}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '7px',
                                fontSize: '11px',
                                fontWeight: 700,
                                border: 'none',
                                background: currentFilter === 'ready' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'transparent',
                                color: currentFilter === 'ready' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer'
                            }}
                        >
                            🟢 Hazır ({readyOrdersCount})
                        </button>
                    </div>

                    {/* Görünüm Modu: Kompakt İkon Segmenti */}
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '8px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            type="button"
                            onClick={() => handleToggleLayoutMode('horizontal')}
                            title="Yatay KDS Şerit Modu"
                            style={{
                                padding: '4px 7px',
                                borderRadius: '6px',
                                border: 'none',
                                background: layoutMode === 'horizontal' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: layoutMode === 'horizontal' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Columns size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleToggleLayoutMode('grid')}
                            title="Izgara Modu"
                            style={{
                                padding: '4px 7px',
                                borderRadius: '6px',
                                border: 'none',
                                background: layoutMode === 'grid' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: layoutMode === 'grid' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <LayoutGrid size={13} />
                        </button>
                    </div>

                    {/* Canlı Dijital Saat */}
                    <KitchenClock />

                    {/* Ses Aç / Kapat İkon Butonu */}
                    <button
                        type="button"
                        onClick={toggleSound}
                        className="btn-outline"
                        title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
                        style={{
                            padding: '5px 7px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '8px',
                            color: soundEnabled ? 'var(--brand-gold, #fbbf24)' : 'var(--text-muted, #94a3b8)',
                            background: soundEnabled ? 'rgba(251, 191, 36, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                            border: soundEnabled ? '1px solid rgba(251, 191, 36, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                            cursor: 'pointer'
                        }}
                    >
                        {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                    </button>

                    {/* Günlük Sipariş Geçmişi Butonu */}
                    <button
                        type="button"
                        onClick={() => setShowHistoryDrawer(true)}
                        className="btn-outline"
                        title="Bugün tamamlanan sipariş geçmişi"
                        style={{
                            padding: '5px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 800,
                            borderRadius: '8px',
                            color: '#fffaf5',
                            background: showHistoryDrawer ? 'rgba(247, 103, 7, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                            borderColor: 'rgba(247, 103, 7, 0.4)',
                            cursor: 'pointer'
                        }}
                    >
                        <History size={13} color="var(--brand-primary, #f76707)" />
                        <span>Geçmiş</span>
                        {combinedHistory.length > 0 && (
                            <span style={{
                                background: 'var(--brand-primary, #f76707)',
                                color: 'white',
                                borderRadius: '10px',
                                padding: '1px 5px',
                                fontSize: '9.5px',
                                fontWeight: 900
                            }}>
                                {combinedHistory.length}
                            </span>
                        )}
                    </button>

                    {/* Tam Ekran */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        className="btn-outline"
                        title="Tam Ekran"
                        style={{
                            padding: '5px 7px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '8px',
                            cursor: 'pointer'
                        }}
                    >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    {/* Çıkış Yap Butonu */}
                    <button
                        type="button"
                        onClick={logout}
                        className="btn-outline"
                        title="Oturumu Kapat ve Çıkış Yap"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            borderRadius: '8px',
                            padding: '5px 9px',
                            cursor: 'pointer',
                            color: '#ef4444',
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            background: 'rgba(239, 68, 68, 0.1)'
                        }}
                    >
                        <LogOut size={13} />
                        <span>Çıkış</span>
                    </button>
                </div>
            </div>

            {/* ============================================================== */}
            {/* 1.5. TOPLU PİŞİRME / ÜRETİM ÖZETİ ŞERİDİ (17 MASA OPTİMİZASYONU) */}
            {/* ============================================================== */}
            {batchCookingSummary.length > 0 && (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 12px',
                    marginBottom: '10px',
                    background: 'rgba(28, 21, 20, 0.88)',
                    border: '1px solid rgba(247, 103, 7, 0.3)',
                    borderRadius: '10px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                    overflowX: 'auto',
                    whiteSpace: 'nowrap',
                    WebkitOverflowScrolling: 'touch',
                    flexShrink: 0
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        fontSize: '11px',
                        fontWeight: 900,
                        color: 'var(--brand-primary, #f76707)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        flexShrink: 0,
                        paddingRight: '8px',
                        borderRight: '1px solid rgba(247, 103, 7, 0.3)'
                    }}>
                        <Flame size={14} color="#f76707" />
                        <span>Toplu Pişirme ({totalPendingItemsCount}):</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, overflowX: 'auto' }}>
                        {batchCookingSummary.map((item) => {
                            const isSelected = selectedBatchItem === item.name;
                            return (
                                <button
                                    key={item.name}
                                    type="button"
                                    onClick={() => setSelectedBatchItem(isSelected ? null : item.name)}
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '4px 9px',
                                        borderRadius: '8px',
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: isSelected
                                            ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)'
                                            : 'rgba(247, 103, 7, 0.12)',
                                        border: isSelected
                                            ? '1.5px solid #ff922b'
                                            : '1px solid rgba(247, 103, 7, 0.3)',
                                        color: isSelected ? '#ffffff' : '#fffaf5',
                                        boxShadow: isSelected ? '0 0 10px rgba(247, 103, 7, 0.5)' : 'none',
                                        transition: 'all 0.15s ease',
                                        flexShrink: 0
                                    }}
                                    title={`${item.totalQty} adet sipariş var. Masalar: ${item.tables.map(t => 'M' + t).join(', ')}`}
                                >
                                    <span style={{
                                        background: isSelected ? 'rgba(0,0,0,0.25)' : 'rgba(247, 103, 7, 0.28)',
                                        padding: '1px 5px',
                                        borderRadius: '5px',
                                        fontWeight: 900,
                                        color: isSelected ? '#ffffff' : '#ff922b',
                                        fontSize: '11px'
                                    }}>
                                        {item.totalQty}x
                                    </span>
                                    <span>{item.name}</span>
                                    <span style={{
                                        fontSize: '9.5px',
                                        opacity: isSelected ? 0.95 : 0.65,
                                        marginLeft: '1px'
                                    }}>
                                        ({item.tables.length} masa)
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {selectedBatchItem && (
                        <button
                            type="button"
                            onClick={() => setSelectedBatchItem(null)}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(239, 68, 68, 0.2)',
                                border: '1px solid rgba(239, 68, 68, 0.45)',
                                color: '#ef4444',
                                fontSize: '10.5px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            <X size={12} />
                            <span>Filtreyi Temizle</span>
                        </button>
                    )}
                </div>
            )}

            {/* ============================================================== */}
            {/* 2. CANLI KDS KARTLARI (YATAY ŞERİT VEYA IZGARA)                */}
            {/* ============================================================== */}
            <div
                className="kitchen-board"
                style={layoutMode === 'horizontal' ? {
                    flex: 1,
                    minHeight: 0,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px 12px',
                    alignContent: 'flex-start',
                    alignItems: 'flex-start',
                    overflowX: 'hidden',
                    overflowY: 'auto',
                    paddingBottom: '14px'
                } : {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '12px',
                    paddingBottom: '20px',
                    overflowY: 'auto'
                }}
            >
                <AnimatePresence>
                    {filteredOrders.length === 0 ? (
                        <motion.div
                            key="empty-state"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                gridColumn: '1 / -1',
                                width: '100%',
                                textAlign: 'center',
                                padding: '60px 20px',
                                background: 'rgba(28, 21, 20, 0.65)',
                                border: '1px dashed rgba(247, 103, 7, 0.25)',
                                borderRadius: 'var(--radius-lg, 18px)'
                            }}
                        >
                            <div style={{
                                width: '60px',
                                height: '60px',
                                borderRadius: '50%',
                                background: 'rgba(247, 103, 7, 0.1)',
                                border: '1px solid rgba(247, 103, 7, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 14px auto',
                                color: 'var(--brand-primary)'
                            }}>
                                <ChefHat size={32} strokeWidth={2.2} />
                            </div>
                            <div style={{ fontWeight: 800, fontSize: '18px', color: '#fffaf5' }}>
                                {currentFilter === 'ready'
                                    ? 'Servise hazır bekleyen masa bulunmuyor'
                                    : (currentFilter === 'cooking' ? 'Tüm siparişler hazırlandı! Mutfak tertemiz 👨‍🍳✨' : 'Mutfakta Bekleyen Yemek Yok')}
                            </div>
                            <div style={{ fontSize: '12.5px', color: 'var(--text-muted, #8d736b)', marginTop: '4px' }}>
                                {kitchenOrders.length > 0 ? (
                                    <span>Hazırlanmakta olan <strong>{cookingOrdersCount} aktif masa</strong> bulunuyor.</span>
                                ) : (
                                    <span>Garson masadan yeni sıcak yemek veya tatlı siparişi aldığında kart anında burada sesli olarak belirecektir.</span>
                                )}
                            </div>

                            {kitchenOrders.length > 0 && currentFilter !== 'all' && (
                                <button
                                    type="button"
                                    onClick={() => setCurrentFilter('all')}
                                    className="btn-outline"
                                    style={{
                                        marginTop: '14px',
                                        padding: '8px 18px',
                                        borderRadius: '10px',
                                        fontWeight: 800,
                                        fontSize: '12px',
                                        color: '#fff',
                                        background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 14px rgba(247, 103, 7, 0.4)'
                                    }}
                                >
                                    Tüm Siparişleri Göster ({kitchenOrders.length} Masa)
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        filteredOrders.map(ord => {
                            const allItems = ord.items || [];
                            const cookingItems = allItems
                                .map((item, idx) => ({ ...item, realIdx: idx }))
                                .filter(i => i.status === 'cooking' && i.kitchen_sent !== false);
                            const deliveredItems = allItems.filter(i => i.status === 'delivered');
                            const allDelivered = cookingItems.length === 0 && deliveredItems.length > 0;
                            const isExtraOrder = deliveredItems.length > 0 && cookingItems.length > 0;
                            const elapsedText = formatElapsedTime(ord.updated_at || ord.created_at);

                            // 3 Kademeli Bekleme & Aciliyet Seviyesi:
                            // 🔴 Kritik / Gecikmiş (15 dk ve üzeri): Kırmızı acil çerçeve & kırmızı parıltı
                            // 🟡 Uyarı / Pişiyor (8 - 14 dk): Amber / turuncu çerçeve & kum saati rozeti
                            // 🟢 Yeni / Normal (0 - 7 dk): Yumuşak zümrüt yeşili çerçeve & taze sipariş rozeti
                            const orderTime = new Date(ord.updated_at || ord.created_at || Date.now()).getTime();
                            const diffMinutes = Math.max(0, Math.floor((Date.now() - orderTime) / 60000));
                            const isCritical = cookingItems.length > 0 && diffMinutes >= 15;
                            const isWarning = cookingItems.length > 0 && diffMinutes >= 8 && diffMinutes < 15;
                            const isNormal = cookingItems.length > 0 && diffMinutes < 8;

                            let cardBorder = '1px solid rgba(247, 103, 7, 0.35)';
                            let cardShadow = '0 4px 16px rgba(0, 0, 0, 0.45)';
                            let cardBg = 'rgba(28, 21, 20, 0.94)';

                            if (allDelivered) {
                                cardBorder = '1.5px solid rgba(16, 185, 129, 0.55)';
                                cardShadow = '0 4px 16px rgba(0, 0, 0, 0.45)';
                                cardBg = 'rgba(16, 185, 129, 0.08)';
                            } else if (isCritical) {
                                cardBorder = '2px solid #ef4444';
                                cardShadow = '0 0 20px rgba(239, 68, 68, 0.35), 0 6px 18px rgba(0, 0, 0, 0.6)';
                                cardBg = 'rgba(38, 16, 16, 0.95)';
                            } else if (isWarning) {
                                cardBorder = '1.5px solid #f59f00';
                                cardShadow = '0 0 12px rgba(245, 159, 0, 0.22), 0 4px 16px rgba(0, 0, 0, 0.5)';
                                cardBg = 'rgba(32, 23, 16, 0.95)';
                            } else if (isNormal) {
                                cardBorder = '1.5px solid rgba(16, 185, 129, 0.45)';
                                cardShadow = '0 4px 16px rgba(0, 0, 0, 0.45)';
                                cardBg = 'rgba(24, 25, 23, 0.95)';
                            }

                            return (
                                <motion.div
                                    key={ord.id || ord.table_no}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.12 }}
                                    style={layoutMode === 'horizontal' ? {
                                        width: 'fit-content',
                                        minWidth: '240px',
                                        maxWidth: '380px',
                                        height: 'fit-content',
                                        flex: '0 0 auto',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        background: cardBg,
                                        border: cardBorder,
                                        borderRadius: '12px',
                                        padding: '8px 11px',
                                        gap: '5px',
                                        boxShadow: cardShadow,
                                        position: 'relative',
                                        boxSizing: 'border-box',
                                        willChange: 'opacity'
                                    } : {
                                        background: cardBg,
                                        border: cardBorder,
                                        borderRadius: '12px',
                                        padding: '11px 12px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px',
                                        boxShadow: cardShadow,
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                >
                                    {/* Kart Üst Başlığı (Dokunulduğunda Yana Detay Açar) */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                        <div
                                            onClick={() => setSelectedTableNo(ord.table_no)}
                                            style={{ cursor: 'pointer', flex: 1 }}
                                            title="Detayları Yana Açmak İçin Tıklayın"
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{
                                                    fontWeight: 900,
                                                    fontSize: '18px',
                                                    color: '#fffaf5',
                                                    letterSpacing: '-0.02em',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    {isCritical && <span title="15+ dakika acil sipariş">🚨</span>}
                                                    Masa {ord.table_no}
                                                </span>

                                                {isExtraOrder && (
                                                    <span style={{
                                                        background: 'rgba(245, 159, 0, 0.2)',
                                                        border: '1px solid rgba(245, 159, 0, 0.6)',
                                                        color: '#f59f00',
                                                        fontSize: '9.5px',
                                                        fontWeight: 900,
                                                        padding: '1px 5px',
                                                        borderRadius: '5px'
                                                    }}>
                                                        🆕 EK
                                                    </span>
                                                )}
                                            </div>

                                            <div style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)', marginTop: '2px' }}>
                                                Garson: <strong style={{ color: '#fffaf5' }}>{ord.waiter_name || 'Personel'}</strong>
                                            </div>
                                        </div>

                                        {/* Sağ: Süre Rozeti (Gereksiz ses ve detay butonları temizlendi, sadeleştirildi) */}
                                        <div>
                                            {allDelivered ? (
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#10b981',
                                                    background: 'rgba(16, 185, 129, 0.16)',
                                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                                    padding: '3px 8px',
                                                    borderRadius: '7px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Check size={12} strokeWidth={3} />
                                                    Hazır
                                                </span>
                                            ) : isCritical ? (
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#ffffff',
                                                    background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                                    border: '1px solid #ef4444',
                                                    padding: '3px 8px',
                                                    borderRadius: '7px',
                                                    fontWeight: 900,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)'
                                                }}>
                                                    <AlertCircle size={12} strokeWidth={2.5} />
                                                    ACİL {diffMinutes} dk
                                                </span>
                                            ) : isWarning ? (
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#f59f00',
                                                    background: 'rgba(245, 159, 0, 0.16)',
                                                    border: '1px solid rgba(245, 159, 0, 0.4)',
                                                    padding: '3px 8px',
                                                    borderRadius: '7px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Clock size={12} />
                                                    {diffMinutes} dk
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: '11px',
                                                    color: '#10b981',
                                                    background: 'rgba(16, 185, 129, 0.14)',
                                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                                    padding: '3px 8px',
                                                    borderRadius: '7px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}>
                                                    <Clock size={12} />
                                                    {diffMinutes < 1 ? 'Yeni' : `${diffMinutes} dk`}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sipariş Kalemleri Listesi (Sipariş uzunluğuna göre doğal uzar, kart içi kaydırma olmaz) */}
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '5px'
                                    }}>
                                        {/* 1. Hazırlanan / Pişen Ürünler */}
                                        {cookingItems.map((item) => {
                                            const isMatchingBatchItem = selectedBatchItem && (item.name || '').trim().toLowerCase() === selectedBatchItem.trim().toLowerCase();
                                            return (
                                                <div
                                                    key={`cooking-${item.realIdx}`}
                                                    style={{
                                                        background: isMatchingBatchItem ? 'rgba(247, 103, 7, 0.22)' : 'rgba(0, 0, 0, 0.35)',
                                                        border: isMatchingBatchItem ? '1.5px solid #f76707' : '1px solid rgba(247, 103, 7, 0.25)',
                                                        padding: '5px 7px',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: '3px',
                                                        boxShadow: isMatchingBatchItem ? '0 0 10px rgba(247, 103, 7, 0.35)' : 'none',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                                                            <span style={{
                                                                background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                                color: 'white',
                                                                fontWeight: 900,
                                                                fontSize: '11.5px',
                                                                padding: '2px 5px',
                                                                borderRadius: '5px',
                                                                flexShrink: 0
                                                            }}>
                                                                {item.quantity}x
                                                            </span>
                                                            <span style={{ fontWeight: 800, fontSize: '12.5px', color: '#fffaf5', whiteSpace: 'nowrap' }}>
                                                                {item.name}
                                                            </span>
                                                        </div>

                                                    {/* Tek Ürünü Hazırla Butonu */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleItemStatus(ord, item.realIdx)}
                                                        className="btn-outline"
                                                        style={{
                                                            padding: '3px 7px',
                                                            borderRadius: '6px',
                                                            fontSize: '10.5px',
                                                            fontWeight: 800,
                                                            color: '#10b981',
                                                            borderColor: 'rgba(16, 185, 129, 0.4)',
                                                            background: 'rgba(16, 185, 129, 0.1)',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        <Check size={12} strokeWidth={3} />
                                                        Hazır
                                                    </button>
                                                </div>

                                                {/* Özel Sipariş Notu (Chef Dikkat Rozeti) */}
                                                {(item.notes || item.note) && (
                                                    <div style={{
                                                        background: 'rgba(245, 159, 0, 0.14)',
                                                        border: '1px solid rgba(245, 159, 0, 0.4)',
                                                        borderRadius: '5px',
                                                        padding: '3px 6px',
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: '#fbbf24',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        <span>📝 Not:</span>
                                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes || item.note}</span>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                        {/* 2. Eğer masada önceden teslim edilmiş veya hazır ürünler varsa */}
                                        {deliveredItems.length > 0 && (
                                            <div style={{
                                                marginTop: '2px',
                                                padding: '5px 8px',
                                                background: 'rgba(16, 185, 129, 0.06)',
                                                border: '1px dashed rgba(16, 185, 129, 0.25)',
                                                borderRadius: '7px',
                                                fontSize: '10.5px',
                                                color: '#10b981',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span>✓ Hazır: {deliveredItems.length} kalem</span>
                                                <span style={{ color: 'var(--text-muted, #8d736b)', fontSize: '9.5px', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {deliveredItems.map(d => `${d.quantity}x ${d.name}`).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Kart Altı Aksiyon Butonu - TEK TIKLA MASAYI TAMAMLA */}
                                    <div style={{ marginTop: '4px', paddingTop: '2px', flexShrink: 0 }}>
                                        <button
                                            type="button"
                                            onClick={() => handleDeliverAllOrderItems(ord)}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                color: 'white',
                                                fontWeight: 800,
                                                fontSize: '12px',
                                                letterSpacing: '-0.01em',
                                                whiteSpace: 'nowrap',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                cursor: 'pointer',
                                                boxShadow: '0 2px 10px rgba(247, 103, 7, 0.35)',
                                                touchAction: 'manipulation'
                                            }}
                                        >
                                            <CheckCheck size={15} strokeWidth={2.4} />
                                            <span>{isExtraOrder ? 'Ek Siparişi Tamamla' : 'Masayı Tamamla'}</span>
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })
                    )}
                </AnimatePresence>
            </div>

            {/* ============================================================== */}
            {/* 3. SAĞDAN AÇILAN MASA DETAY PANELİ (SLIDE-OUT SIDE DRAWER)    */}
            {/* ============================================================== */}
            <AnimatePresence>
                {selectedOrder && (
                    <>
                        {/* Karartma Katmanı (Backdrop) */}
                        <motion.div
                            key="drawer-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTableNo(null)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.65)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                zIndex: 998
                            }}
                        />

                        {/* Yana Açılan Detay Paneli */}
                        <motion.aside
                            key="drawer-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: 'min(460px, 92vw)',
                                background: 'linear-gradient(180deg, #221a18 0%, #171110 100%)',
                                borderLeft: '2px solid rgba(247, 103, 7, 0.45)',
                                boxShadow: '-12px 0 45px rgba(0, 0, 0, 0.85)',
                                zIndex: 999,
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '18px',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Panel Üst Başlığı */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '22px', color: '#fffaf5', letterSpacing: '-0.02em' }}>
                                            Masa {selectedOrder.table_no}
                                        </h3>
                                        {selectedOrder.items?.some(i => i.status === 'delivered') && selectedOrder.items?.some(i => i.status === 'cooking' && i.kitchen_sent !== false) && (
                                            <span style={{
                                                background: 'rgba(245, 159, 0, 0.2)',
                                                border: '1px solid rgba(245, 159, 0, 0.6)',
                                                color: '#f59f00',
                                                fontSize: '10px',
                                                fontWeight: 900,
                                                padding: '2px 7px',
                                                borderRadius: '6px'
                                            }}>
                                                🆕 EK SİPARİŞ
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', marginTop: '3px' }}>
                                        Garson: <strong style={{ color: '#fffaf5' }}>{selectedOrder.waiter_name || 'Personel'}</strong> • {formatElapsedTime(selectedOrder.updated_at || selectedOrder.created_at)}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setSelectedTableNo(null)}
                                    className="btn-outline"
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '9px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Panel İçeriği (Geniş Ürün Listesi) */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 2px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Pişirilen Yemekler ({selectedOrder.items?.filter(i => i.status === 'cooking' && i.kitchen_sent !== false).length || 0})
                                </div>

                                {selectedOrder.items?.map((item, idx) => ({ ...item, realIdx: idx }))
                                    .filter(i => i.status === 'cooking' && i.kitchen_sent !== false)
                                    .map((item) => (
                                        <div
                                            key={`drawer-cook-${item.realIdx}`}
                                            onClick={() => handleToggleItemStatus(selectedOrder, item.realIdx)}
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.45)',
                                                border: '1px solid rgba(247, 103, 7, 0.3)',
                                                borderRadius: '12px',
                                                padding: '12px 14px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <span style={{
                                                        background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                        color: 'white',
                                                        fontWeight: 900,
                                                        fontSize: '14px',
                                                        padding: '3px 8px',
                                                        borderRadius: '6px'
                                                    }}>
                                                        {item.quantity}x
                                                    </span>
                                                    <span style={{ fontWeight: 800, fontSize: '15px', color: '#fffaf5' }}>
                                                        {item.name}
                                                    </span>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggleItemStatus(selectedOrder, item.realIdx);
                                                    }}
                                                    style={{
                                                        padding: '5px 10px',
                                                        borderRadius: '8px',
                                                        fontSize: '11.5px',
                                                        fontWeight: 800,
                                                        color: '#10b981',
                                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                                        background: 'rgba(16, 185, 129, 0.12)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                >
                                                    <Check size={13} strokeWidth={3} />
                                                    Hazırla
                                                </button>
                                            </div>

                                            {(item.notes || item.note) && (
                                                <div style={{
                                                    background: 'rgba(245, 159, 0, 0.16)',
                                                    border: '1px solid rgba(245, 159, 0, 0.45)',
                                                    borderRadius: '6px',
                                                    padding: '5px 8px',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    color: '#fbbf24',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px'
                                                }}>
                                                    <span>📝 Not:</span>
                                                    <span>{item.notes || item.note}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                {/* Önceden Teslim Edilen / Hazır Kalemler */}
                                {selectedOrder.items?.some(i => i.status === 'delivered') && (
                                    <div style={{ marginTop: '10px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                                            Hazırlanmış / Teslim Edilen Kalemler
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                            {selectedOrder.items
                                                .map((item, idx) => ({ ...item, realIdx: idx }))
                                                .filter(i => i.status === 'delivered')
                                                .map((item) => (
                                                    <div
                                                        key={`drawer-del-${item.realIdx}`}
                                                        style={{
                                                            background: 'rgba(16, 185, 129, 0.08)',
                                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                                            borderRadius: '8px',
                                                            padding: '8px 12px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            opacity: 0.85
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                            <span style={{ color: '#10b981', fontWeight: 800, fontSize: '12px' }}>✓ {item.quantity}x</span>
                                                            <span style={{ color: '#d1b8af', textDecoration: 'line-through', fontSize: '13px' }}>{item.name}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleItemStatus(selectedOrder, item.realIdx)}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: '#8d736b',
                                                                fontSize: '11px',
                                                                cursor: 'pointer',
                                                                textDecoration: 'underline'
                                                            }}
                                                        >
                                                            Geri Al
                                                        </button>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Panel Alt Aksiyon Butonları */}
                            <div style={{ paddingTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const hasDelivered = selectedOrder.items?.some(i => i.status === 'delivered');
                                            const hasCooking = selectedOrder.items?.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
                                            announceKitchenOrder(selectedOrder.table_no, [], hasDelivered && hasCooking);
                                            showToast(`🔊 Masa ${selectedOrder.table_no} uyarısı okundu`, 'info');
                                        }}
                                        className="btn-outline"
                                        style={{
                                            flex: 1,
                                            padding: '9px',
                                            borderRadius: '10px',
                                            fontWeight: 800,
                                            fontSize: '12px',
                                            color: 'var(--brand-gold)',
                                            borderColor: 'rgba(251, 191, 36, 0.35)',
                                            background: 'rgba(251, 191, 36, 0.1)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <Volume2 size={14} />
                                        <span>Seslendir</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSelectedTableNo(null)}
                                        className="btn-outline"
                                        style={{
                                            padding: '9px 14px',
                                            borderRadius: '10px',
                                            fontWeight: 700,
                                            fontSize: '12px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Kapat
                                    </button>
                                </div>

                                {selectedOrder.items?.every(i => i.status === 'delivered') ? (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleDismissOrder(selectedOrder);
                                            setSelectedTableNo(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '11px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                            color: 'white',
                                            fontWeight: 900,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                        }}
                                    >
                                        <CheckCheck size={16} strokeWidth={2.6} />
                                        <span>Garsona Teslim Edildi (Kaldır)</span>
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            handleDeliverAllOrderItems(selectedOrder);
                                            setSelectedTableNo(null);
                                        }}
                                        style={{
                                            width: '100%',
                                            padding: '11px',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                            color: 'white',
                                            fontWeight: 900,
                                            fontSize: '13px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 14px rgba(247, 103, 7, 0.35)'
                                        }}
                                    >
                                        <CheckCheck size={16} strokeWidth={2.4} />
                                        <span>Tüm Masayı Tamamla</span>
                                    </button>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            {/* ============================================================== */}
            {/* 4. SAĞDAN AÇILAN GÜNLÜK MUTFAK GEÇMİŞİ (HISTORY DRAWER)        */}
            {/* ============================================================== */}
            <AnimatePresence>
                {showHistoryDrawer && (
                    <>
                        {/* Karartma Katmanı */}
                        <motion.div
                            key="history-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowHistoryDrawer(false)}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.65)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)',
                                zIndex: 998
                            }}
                        />

                        {/* Yana Açılan Geçmiş Paneli */}
                        <motion.aside
                            key="history-panel"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                            style={{
                                position: 'fixed',
                                top: 0,
                                right: 0,
                                bottom: 0,
                                width: 'min(480px, 94vw)',
                                background: 'linear-gradient(180deg, #221a18 0%, #171110 100%)',
                                borderLeft: '2px solid rgba(247, 103, 7, 0.45)',
                                boxShadow: '-12px 0 45px rgba(0, 0, 0, 0.85)',
                                zIndex: 999,
                                display: 'flex',
                                flexDirection: 'column',
                                padding: '16px',
                                boxSizing: 'border-box'
                            }}
                        >
                            {/* Panel Üst Başlığı */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{
                                        background: 'rgba(247, 103, 7, 0.15)',
                                        color: 'var(--brand-primary, #f76707)',
                                        padding: '6px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <History size={18} strokeWidth={2.4} />
                                    </div>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 900, fontSize: '18px', color: '#fffaf5' }}>
                                            Günlük Sipariş Geçmişi
                                        </h3>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted, #8d736b)' }}>
                                            Bugün tamamlanan {combinedHistory.length} masa
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowHistoryDrawer(false)}
                                    className="btn-outline"
                                    style={{
                                        padding: '5px',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'var(--text-muted)'
                                    }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Liste */}
                            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {combinedHistory.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
                                        <CheckCircle2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#fffaf5' }}>Henüz Tamamlanan Masa Yok</div>
                                        <div style={{ fontSize: '12px', marginTop: '4px' }}>Mutfaktan tamamlanan siparişler burada listelenecektir.</div>
                                    </div>
                                ) : (
                                    combinedHistory.map((item, idx) => (
                                        <div
                                            key={item.id || idx}
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.35)',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                borderRadius: '10px',
                                                padding: '10px 12px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '6px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontWeight: 900, fontSize: '15px', color: '#fffaf5' }}>
                                                        Masa {item.table_no}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                                        • Garson: <strong style={{ color: '#fffaf5' }}>{item.waiter_name}</strong>
                                                    </span>
                                                </div>

                                                <span style={{
                                                    fontSize: '11px',
                                                    color: 'var(--brand-gold, #fbbf24)',
                                                    background: 'rgba(251, 191, 36, 0.1)',
                                                    border: '1px solid rgba(251, 191, 36, 0.25)',
                                                    padding: '2px 6px',
                                                    borderRadius: '5px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Clock size={11} />
                                                    {item.completed_time_str || formatElapsedTime(item.completed_at)}
                                                </span>
                                            </div>

                                            {/* Kalemler */}
                                            <div style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '4px',
                                                marginTop: '2px'
                                            }}>
                                                {(item.items || []).map((it, iIdx) => (
                                                    <span
                                                        key={iIdx}
                                                        style={{
                                                            background: 'rgba(16, 185, 129, 0.12)',
                                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                                            color: '#34d399',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            padding: '2px 6px',
                                                            borderRadius: '5px'
                                                        }}
                                                    >
                                                        {it.quantity}x {it.name}
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Yanlışlıkla Tıklandı - Panoya Geri Al Butonu */}
                                            <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestoreOrder(item)}
                                                    className="btn-outline"
                                                    style={{
                                                        padding: '4px 8px',
                                                        borderRadius: '6px',
                                                        fontSize: '10.5px',
                                                        fontWeight: 800,
                                                        color: 'var(--brand-gold, #fbbf24)',
                                                        background: 'rgba(251, 191, 36, 0.08)',
                                                        borderColor: 'rgba(251, 191, 36, 0.35)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    title="Yanlışlıkla tıklandıysa siparişi tekrar mutfak panosuna geri gönder"
                                                >
                                                    <RotateCcw size={12} />
                                                    <span>Panoya Geri Al (Yanlışlıkla Tıklandı)</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
