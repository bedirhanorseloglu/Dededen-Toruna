import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { db, doc, updateDoc } from '../config/firebase';
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
    ChevronRight
} from 'lucide-react';

export default function KitchenView() {
    const { 
        activeOrders, 
        navigateTo, 
        currentUser, 
        soundEnabled, 
        toggleSound, 
        isFullscreen, 
        toggleFullscreen, 
        showToast,
        logout
    } = useApp();

    const [clock, setClock] = useState('');
    const [currentFilter, setCurrentFilter] = useState('all'); // 'all' | 'cooking' | 'ready'
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
        } catch (e) {}
    };

    const prevOrdersRef = useRef({});
    const isFirstLoadRef = useRef(true);

    // Canlı dijital mutfak saati
    useEffect(() => {
        const update = () => {
            const now = new Date();
            setClock(now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    // Tablet ekranının mutfakta açık kalmasını sağlayan Screen Wake Lock API ve ilk dokunuş aktivasyonu
    useEffect(() => {
        let wakeLock = null;
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await navigator.wakeLock.request('screen');
                }
            } catch (err) {}
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
                wakeLock.release().catch(() => {});
            }
        };
    }, []);

    // Yeni gelen siparişleri veya ek siparişleri algılayıp sesli ve kalem kalem anonslu uyarı verme
    useEffect(() => {
        if (isFirstLoadRef.current) {
            prevOrdersRef.current = { ...activeOrders };
            isFirstLoadRef.current = false;
            return;
        }

        Object.entries(activeOrders).forEach(([tableNo, order]) => {
            const prevOrder = prevOrdersRef.current[tableNo];
            // Yalnızca mutfağa iletilmiş (kitchen_sent !== false) olan pişmekte olan ürünleri say:
            const sentCookingItems = (order.items || []).filter(i => i.status === 'cooking' && i.kitchen_sent !== false);
            const prevSentCookingCount = (prevOrder?.items || []).filter(i => i.status === 'cooking' && i.kitchen_sent !== false).length;

            if (sentCookingItems.length > 0 && (!prevOrder || sentCookingItems.length > prevSentCookingCount)) {
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
                    speakAnnouncement(`DİKKAT! MASA ${tableNo} SİPARİŞİ İPTAL EDİLDİ!`, true);
                }
                showToast(`⚠️ Masa ${tableNo} siparişi iptal edildi / güncellendi.`, 'info');
            }
        });

        prevOrdersRef.current = { ...activeOrders };
    }, [activeOrders, soundEnabled, showToast]);

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

    // Tüm açık mutfak siparişleri (Yalnızca mutfağa gönderilmiş ürünler)
    const kitchenOrders = useMemo(() => {
        return Object.values(activeOrders)
            .filter(ord => {
                const items = ord.items || [];
                if (items.length === 0) return false;
                // Ekranda gösterilecekler: En az 1 mutfağa iletilmiş pişiyor olmalı ya da mutfak henüz dismiss edilmemiş hazır masa olmalı
                const hasCooking = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
                const hasAnySent = items.some(i => i.kitchen_sent !== false);
                const isReady = hasAnySent && items.every(i => i.status === 'delivered' || i.kitchen_sent === false) && ord.kitchen_status !== 'dismissed';
                return hasCooking || isReady;
            })
            .sort((a, b) => {
                // Öncelik: Pişenler önce, sonra eskiden yeniye doğru
                const aHasCooking = (a.items || []).some(i => i.status === 'cooking' && i.kitchen_sent !== false);
                const bHasCooking = (b.items || []).some(i => i.status === 'cooking' && i.kitchen_sent !== false);
                if (aHasCooking && !bHasCooking) return -1;
                if (!aHasCooking && bHasCooking) return 1;
                return new Date(a.updated_at || a.created_at || 0) - new Date(b.updated_at || b.created_at || 0);
            });
    }, [activeOrders]);

    // Metrikler
    const { cookingOrdersCount, readyOrdersCount, totalPendingItemsCount } = useMemo(() => {
        let cookingCount = 0;
        let readyCount = 0;
        let pendingItems = 0;

        kitchenOrders.forEach(ord => {
            const items = ord.items || [];
            const hasCooking = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
            if (hasCooking) {
                cookingCount++;
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
            totalPendingItemsCount: pendingItems
        };
    }, [kitchenOrders]);

    // Eğer 'Servise Hazır' filtresindeyken hazır masa kalmadıysa ve pişen yemek varsa otomatik 'Tümü'ne dön:
    useEffect(() => {
        if (currentFilter === 'ready' && readyOrdersCount === 0 && cookingOrdersCount > 0) {
            setCurrentFilter('all');
        }
    }, [currentFilter, readyOrdersCount, cookingOrdersCount]);

    // Filtrelenmiş liste
    const filteredOrders = useMemo(() => {
        return kitchenOrders.filter(ord => {
            const items = ord.items || [];
            const hasCooking = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
            if (currentFilter === 'cooking') return hasCooking;
            if (currentFilter === 'ready') return !hasCooking;
            return true;
        });
    }, [kitchenOrders, currentFilter]);

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

    // Tüm masadaki yemekleri hazırlandı yapma (Garsona bildir)
    const handleDeliverAllOrderItems = async (order) => {
        playKeypadBeep();
        const items = (order.items || []).map(i => ({ ...i, status: 'delivered' }));
        const docId = order.id || `table_${order.table_no}`;
        const nowIso = new Date().toISOString();
        const nowTime = Date.now();

        try {
            await updateDoc(doc(db, "orders", docId), {
                items,
                all_delivered: true,
                kitchen_status: 'completed',
                kitchen_delivered_at: nowIso,
                kitchen_notified_at: nowTime,
                updated_at: nowIso
            });

            playOrderReadySound();
            showToast(`Masa ${order.table_no} tüm ürünleri hazırlandı! Garsona bildirildi.`, 'success');
        } catch (err) {
            console.error("handleDeliverAllOrderItems error:", err);
            showToast("Teslimat onaylanırken hata oluştu.", "danger");
        }
    };

    // Tamamlanmış masayı ekrandan kaldırma
    const handleDismissOrder = async (order) => {
        playKeypadBeep();
        const docId = order.id || `table_${order.table_no}`;
        try {
            await updateDoc(doc(db, "orders", docId), {
                kitchen_status: 'dismissed',
                updated_at: new Date().toISOString()
            });
            showToast(`Masa ${order.table_no} mutfak panosundan kaldırıldı.`, 'info');
        } catch (err) {
            console.error("handleDismissOrder error:", err);
        }
    };

    return (
        <div 
            className="kitchen-page-container" 
            style={{ 
                padding: layoutMode === 'horizontal' ? '8px 12px' : '14px 18px', 
                maxWidth: '100%', 
                margin: '0 auto', 
                height: layoutMode === 'horizontal' ? '100vh' : 'auto',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: layoutMode === 'horizontal' ? 'hidden' : 'auto',
                boxSizing: 'border-box'
            }}
        >
            {/* ============================================================== */}
            {/* 1. ÜST KONTROL & BİLGİ ŞERİDİ (KOMPAKT SLIM KDS HEADER)         */}
            {/* ============================================================== */}
            <div style={{
                background: 'rgba(28, 21, 20, 0.92)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(247, 103, 7, 0.3)',
                borderRadius: '12px',
                padding: '8px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px',
                boxShadow: '0 6px 20px rgba(0, 0, 0, 0.45)',
                flexShrink: 0
            }}>
                {/* Sol: Logo, Başlık ve Canlı İstatistikler */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                        color: 'white',
                        padding: '6px',
                        borderRadius: '9px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(247, 103, 7, 0.4)'
                    }}>
                        <ChefHat size={17} strokeWidth={2.4} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                        <span style={{ fontWeight: 900, fontSize: '15px', color: '#fffaf5', letterSpacing: '-0.02em' }}>
                            Mutfak KDS
                        </span>
                        <span style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#10b981',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                        }}>
                            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981', animation: 'pulse 1.8s infinite' }} />
                            CANLI
                        </span>
                    </div>

                    {/* Canlı Metrik Rozetleri */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
                        <div style={{
                            background: cookingOrdersCount > 0 ? 'rgba(247, 103, 7, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                            border: cookingOrdersCount > 0 ? '1px solid rgba(247, 103, 7, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: cookingOrdersCount > 0 ? '#f76707' : 'var(--text-muted)'
                        }}>
                            <Flame size={13} color={cookingOrdersCount > 0 ? '#f76707' : '#888'} />
                            <span>{cookingOrdersCount} Masa</span>
                        </div>

                        <div style={{
                            background: totalPendingItemsCount > 0 ? 'rgba(245, 159, 0, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                            border: totalPendingItemsCount > 0 ? '1px solid rgba(245, 159, 0, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '8px',
                            padding: '3px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: totalPendingItemsCount > 0 ? '#f59f00' : 'var(--text-muted)'
                        }}>
                            <span>🍽️</span>
                            <span>{totalPendingItemsCount} Kalem</span>
                        </div>
                    </div>
                </div>

                {/* Sağ: Filtre Sekmeleri, Görünüm Modu, Saat ve Kontroller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    
                    {/* Hızlı Filtre Butonları */}
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '9px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <button
                            onClick={() => setCurrentFilter('all')}
                            style={{
                                padding: '4px 9px',
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
                            onClick={() => setCurrentFilter('cooking')}
                            style={{
                                padding: '4px 9px',
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
                        <button
                            onClick={() => setCurrentFilter('ready')}
                            style={{
                                padding: '4px 9px',
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

                    {/* Görünüm Modu: Yatay Şerit (Tablet) vs Izgara */}
                    <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.35)', borderRadius: '9px', padding: '2px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            onClick={() => handleToggleLayoutMode('horizontal')}
                            title="Yatay KDS Şerit Modu (Tablette aşağı kaydırmadan tüm masaları yan yana gösterir)"
                            style={{
                                padding: '4px 8px',
                                borderRadius: '7px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                border: 'none',
                                background: layoutMode === 'horizontal' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: layoutMode === 'horizontal' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <Columns size={12} />
                            <span>Yatay KDS</span>
                        </button>
                        <button
                            onClick={() => handleToggleLayoutMode('grid')}
                            title="Izgara Modu (Kart ızgarası)"
                            style={{
                                padding: '4px 8px',
                                borderRadius: '7px',
                                fontSize: '10.5px',
                                fontWeight: 700,
                                border: 'none',
                                background: layoutMode === 'grid' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: layoutMode === 'grid' ? '#fff' : 'var(--text-secondary, #d1b8af)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                        >
                            <LayoutGrid size={12} />
                            <span>Izgara</span>
                        </button>
                    </div>

                    {/* Canlı Dijital Saat */}
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
                        {clock}
                    </div>

                    {/* Ses Aç / Kapat & Ses Testi */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                            onClick={toggleSound}
                            className="btn-outline"
                            title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
                            style={{
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                borderRadius: '8px',
                                color: soundEnabled ? 'var(--brand-gold)' : 'var(--text-muted)'
                            }}
                        >
                            {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
                            <span>{soundEnabled ? 'Sesli' : 'Sessiz'}</span>
                        </button>

                        {soundEnabled && (
                            <button
                                onClick={() => {
                                    warmUpAudio();
                                    testVoiceAnnouncement();
                                    showToast("🔊 Mutfak ses ve anons testi yapılıyor...", "info");
                                }}
                                className="btn-outline"
                                title="Anons ve Ses Testi Yap"
                                style={{
                                    padding: '5px 8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    borderRadius: '8px',
                                    background: 'rgba(247, 103, 7, 0.08)',
                                    borderColor: 'rgba(247, 103, 7, 0.3)',
                                    color: 'var(--brand-primary)'
                                }}
                            >
                                <Sparkles size={11} />
                                <span>Ses Testi</span>
                            </button>
                        )}
                    </div>

                    {/* Tam Ekran */}
                    <button
                        onClick={toggleFullscreen}
                        className="btn-outline"
                        title="Tam Ekran"
                        style={{
                            padding: '5px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            borderRadius: '8px'
                        }}
                    >
                        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                    </button>

                    {/* Geri Dön / Çıkış */}
                    <button
                        onClick={() => {
                            if (currentUser?.role === 'kitchen') {
                                logout();
                            } else {
                                navigateTo(currentUser?.role === 'admin' ? 'admin' : 'waiter');
                            }
                        }}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', borderRadius: '8px', padding: '5px 9px' }}
                    >
                        <ArrowLeft size={13} />
                        <span>{currentUser?.role === 'kitchen' ? 'Çıkış' : 'Masalar'}</span>
                    </button>
                </div>
            </div>

            {/* ============================================================== */}
            {/* 2. CANLI KDS KARTLARI (YATAY ŞERİT VEYA IZGARA)                */}
            {/* ============================================================== */}
            <div 
                className="kitchen-board" 
                style={layoutMode === 'horizontal' ? {
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '12px',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    paddingBottom: '6px',
                    alignItems: 'stretch'
                } : {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
                    gap: '14px',
                    paddingBottom: '20px'
                }}
            >
                <AnimatePresence mode="popLayout">
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

                            // Gecikme uyarısı: 12 dakikadan uzun süredir pişiyorsa
                            const diffMinutes = Math.floor((Date.now() - new Date(ord.updated_at || ord.created_at || Date.now()).getTime()) / 60000);
                            const isDelayed = cookingItems.length > 0 && diffMinutes >= 12;

                            return (
                                <motion.div
                                    key={ord.id || ord.table_no}
                                    layout
                                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.2 } }}
                                    transition={{ type: 'spring', stiffness: 450, damping: 28 }}
                                    style={layoutMode === 'horizontal' ? {
                                        width: '310px',
                                        minWidth: '290px',
                                        maxWidth: '330px',
                                        height: '100%',
                                        flexShrink: 0,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        background: allDelivered ? 'rgba(16, 185, 129, 0.08)' : 'rgba(28, 21, 20, 0.94)',
                                        border: allDelivered 
                                            ? '1.5px solid rgba(16, 185, 129, 0.5)' 
                                            : (isDelayed ? '1.5px solid #ef4444' : '1px solid rgba(247, 103, 7, 0.35)'),
                                        borderRadius: '14px',
                                        padding: '12px 14px',
                                        gap: '10px',
                                        boxShadow: isDelayed 
                                            ? '0 0 25px rgba(239, 68, 68, 0.3), 0 8px 20px rgba(0, 0, 0, 0.5)' 
                                            : '0 6px 20px rgba(0, 0, 0, 0.45)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxSizing: 'border-box'
                                    } : {
                                        background: allDelivered ? 'rgba(16, 185, 129, 0.08)' : 'rgba(28, 21, 20, 0.94)',
                                        border: allDelivered 
                                            ? '1.5px solid rgba(16, 185, 129, 0.5)' 
                                            : (isDelayed ? '1.5px solid #ef4444' : '1px solid rgba(247, 103, 7, 0.35)'),
                                        borderRadius: '14px',
                                        padding: '14px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        boxShadow: isDelayed 
                                            ? '0 0 25px rgba(239, 68, 68, 0.3), 0 8px 20px rgba(0, 0, 0, 0.5)' 
                                            : '0 6px 20px rgba(0, 0, 0, 0.45)',
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
                                                    letterSpacing: '-0.02em'
                                                }}>
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

                                        {/* Durum & Süre Rozeti & Yan Panel Aç Butonu */}
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {/* Detay Paneli Aç Butonu */}
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedTableNo(ord.table_no)}
                                                    title="Siparişi Yana Genişlet"
                                                    style={{
                                                        padding: '3px 7px',
                                                        borderRadius: '7px',
                                                        fontSize: '10.5px',
                                                        fontWeight: 800,
                                                        color: 'var(--brand-primary, #f76707)',
                                                        background: 'rgba(247, 103, 7, 0.1)',
                                                        border: '1px solid rgba(247, 103, 7, 0.35)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '2px',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <span>Detay</span>
                                                    <ChevronRight size={11} />
                                                </button>

                                                {/* Sesli anons butonu */}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        announceKitchenOrder(ord.table_no, [], isExtraOrder);
                                                        showToast(`🔊 Masa ${ord.table_no} ${isExtraOrder ? 'ek sipariş' : 'yeni sipariş'} uyarısı okundu`, 'info');
                                                    }}
                                                    title={isExtraOrder ? 'Ek Sipariş Uyarısını Oku' : 'Yeni Sipariş Uyarısını Oku'}
                                                    style={{
                                                        padding: '3px 6px',
                                                        borderRadius: '7px',
                                                        fontSize: '11px',
                                                        color: 'var(--brand-gold, #fbbf24)',
                                                        background: 'rgba(251, 191, 36, 0.1)',
                                                        border: '1px solid rgba(251, 191, 36, 0.35)',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <Volume2 size={12} />
                                                </button>
                                            </div>

                                            {allDelivered ? (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: '#10b981',
                                                    background: 'rgba(16, 185, 129, 0.2)',
                                                    border: '1px solid rgba(16, 185, 129, 0.45)',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Check size={11} strokeWidth={3} />
                                                    Hazır
                                                </span>
                                            ) : (
                                                <span style={{
                                                    fontSize: '10px',
                                                    color: isDelayed ? '#ef4444' : '#f59f00',
                                                    background: isDelayed ? 'rgba(239, 68, 68, 0.18)' : 'rgba(245, 159, 0, 0.16)',
                                                    border: isDelayed ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(245, 159, 0, 0.4)',
                                                    padding: '2px 6px',
                                                    borderRadius: '6px',
                                                    fontWeight: 800,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '3px'
                                                }}>
                                                    <Clock size={11} />
                                                    {elapsedText}
                                                    {isDelayed && ' ⚠️'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sipariş Kalemleri Listesi (Normalde de görünür, içi dikey kaydırılabilir) */}
                                    <div style={{ 
                                        flex: 1, 
                                        overflowY: 'auto', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '6px',
                                        paddingRight: '2px'
                                    }}>
                                        {/* 1. Hazırlanan / Pişen Ürünler */}
                                        {cookingItems.map((item) => (
                                            <div
                                                key={`cooking-${item.realIdx}`}
                                                style={{
                                                    background: 'rgba(0, 0, 0, 0.35)',
                                                    border: '1px solid rgba(247, 103, 7, 0.25)',
                                                    padding: '7px 9px',
                                                    borderRadius: '10px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                                                        <span style={{
                                                            background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                            color: 'white',
                                                            fontWeight: 900,
                                                            fontSize: '12px',
                                                            padding: '2px 6px',
                                                            borderRadius: '5px',
                                                            flexShrink: 0
                                                        }}>
                                                            {item.quantity}x
                                                        </span>
                                                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#fffaf5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {item.name}
                                                        </span>
                                                    </div>

                                                    {/* Tek Ürünü Hazırla Butonu */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleItemStatus(ord, item.realIdx)}
                                                        className="btn-outline"
                                                        style={{
                                                            padding: '4px 8px',
                                                            borderRadius: '7px',
                                                            fontSize: '11px',
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
                                        ))}

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
                                                <span style={{ color: 'var(--text-muted, #8d736b)', fontSize: '10px', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {deliveredItems.map(d => `${d.quantity}x ${d.name}`).join(', ')}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Kart Altı Aksiyon Butonları */}
                                    <div style={{ marginTop: 'auto', paddingTop: '6px' }}>
                                        {allDelivered ? (
                                            <motion.button
                                                type="button"
                                                onClick={() => handleDismissOrder(ord)}
                                                whileHover={{ scale: 1.015 }}
                                                whileTap={{ scale: 0.97 }}
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                                }}
                                            >
                                                <CheckCheck size={15} strokeWidth={2.6} />
                                                Garsona Teslim Edildi (Kaldır)
                                            </motion.button>
                                        ) : (
                                            <motion.button
                                                type="button"
                                                onClick={() => handleDeliverAllOrderItems(ord)}
                                                whileHover={{ scale: 1.015 }}
                                                whileTap={{ scale: 0.97 }}
                                                style={{
                                                    width: '100%',
                                                    padding: '9px 12px',
                                                    borderRadius: '10px',
                                                    border: 'none',
                                                    background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                    color: 'white',
                                                    fontWeight: 800,
                                                    fontSize: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '5px',
                                                    cursor: 'pointer',
                                                    boxShadow: '0 4px 14px rgba(247, 103, 7, 0.35)'
                                                }}
                                            >
                                                <Send size={14} strokeWidth={2.4} />
                                                {isExtraOrder ? '✓ Ek Siparişi Tamamla' : '✓ Masayı Tamamla (Bildir)'}
                                            </motion.button>
                                        )}
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
                                        <Send size={15} strokeWidth={2.4} />
                                        <span>Tüm Masayı Hazırla (Garsona Bildir)</span>
                                    </button>
                                )}
                            </div>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
