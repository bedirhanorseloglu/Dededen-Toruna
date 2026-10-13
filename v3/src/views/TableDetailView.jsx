import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { 
    MENU_CATEGORIES, 
    MENU_PRODUCTS, 
    formatMoney, 
    isInstantDeliveryCategory 
} from '../data/menu';
import { 
    db, 
    doc, 
    setDoc, 
    updateDoc, 
    deleteDoc 
} from '../config/firebase';
import { 
    printKitchenOrderTicket, 
    printCustomerReceipt 
} from '../services/printService';
import { 
    recordCompletedOrder 
} from '../services/analyticsService';
import { 
    playChimeSound, 
    playDeliveryAlertSound 
} from '../services/audioService';
import { spawnFlyingBadge } from '../services/motionService';
import { 
    Plus, 
    Minus, 
    Trash2, 
    Printer, 
    CreditCard, 
    Banknote, 
    MoveHorizontal, 
    Scissors, 
    MessageSquare, 
    CheckCircle2, 
    Clock, 
    Search, 
    X,
    Receipt
} from 'lucide-react';

export default function TableDetailView() {
    const { 
        selectedTableId, 
        activeOrders, 
        currentUser, 
        navigateTo, 
        showToast,
        tables,
        closeTableOrder,
        printerSettings,
        menuProducts
    } = useApp();

    const currentProducts = menuProducts || MENU_PRODUCTS;

    const tableNo = Number(selectedTableId);
    const existingOrder = activeOrders[String(tableNo)] || null;

    const [cartItems, setCartItems] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [menuSearch, setMenuSearch] = useState('');
    
    // Responsive Mobile Bottom Sheet State
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

    // Modals
    const [noteModalItemIdx, setNoteModalItemIdx] = useState(null);
    const [itemNoteInput, setItemNoteInput] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetTableNo, setTargetTableNo] = useState('');
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitSelections, setSplitSelections] = useState({});
    const [splitPayMethod, setSplitPayMethod] = useState('cash');

    // Sync remote order with local cart (Farklı cihazlardan gelen güncellemeleri anında canlı yakalar)
    useEffect(() => {
        if (existingOrder && existingOrder.items) {
            setCartItems(existingOrder.items);
        } else {
            setCartItems([]);
        }
    }, [existingOrder]);



    const orderSubtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
    }, [cartItems]);

    const totalItemCount = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }, [cartItems]);

    // Save to Firestore
    const persistOrder = async (items) => {
        const orderRef = doc(db, "orders", `table_${tableNo}`);
        const total = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);

        if (items.length === 0) {
            await closeTableOrder(tableNo, existingOrder?.id);
            return;
        }

        const payload = {
            table_no: tableNo,
            table_id: tableNo,
            waiter_id: existingOrder?.waiter_id || (currentUser?.role === 'admin' ? (currentUser?.id || 'mgr-1') : (currentUser?.id || 'wtr-1')),
            waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Yönetici (Patron)') : (currentUser?.name || 'Garson')),
            items: items,
            items_count: items.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
            subtotal: total,
            total: total,
            status: "open",
            updated_at: new Date().toISOString()
        };

        if (!existingOrder) {
            payload.created_at = new Date().toISOString();
        }

        await setDoc(orderRef, payload, { merge: true });
    };

    // Add product to cart
    const handleAddToCart = async (product, e) => {
        if (e && e.currentTarget) {
            spawnFlyingBadge(e.currentTarget, '+1');
        }

        const isInstant = isInstantDeliveryCategory(product.category_id, product.name);
        const initialStatus = isInstant ? 'delivered' : 'cooking';

        const updated = [...cartItems];
        const existingIdx = updated.findIndex(i => i.product_id === product.id && i.status === initialStatus && !i.notes);

        if (existingIdx >= 0) {
            updated[existingIdx].quantity = (Number(updated[existingIdx].quantity) || 1) + 1;
        } else {
            updated.push({
                product_id: product.id,
                name: product.name,
                price: Number(product.price),
                category_id: product.category_id,
                quantity: 1,
                status: initialStatus,
                notes: '',
                added_at: new Date().toISOString()
            });
        }

        setCartItems(updated);
        await persistOrder(updated);
    };

    // Update quantity
    const handleUpdateQuantity = async (index, delta) => {
        const updated = [...cartItems];
        const currentQty = Number(updated[index].quantity) || 1;
        const newQty = currentQty + delta;

        if (newQty <= 0) {
            updated.splice(index, 1);
        } else {
            updated[index].quantity = newQty;
        }

        setCartItems(updated);
        await persistOrder(updated);
    };

    // Toggle delivery status
    const handleToggleDeliveryStatus = async (index) => {
        const updated = [...cartItems];
        const nextStatus = updated[index].status === 'delivered' ? 'cooking' : 'delivered';
        updated[index].status = nextStatus;

        setCartItems(updated);
        await persistOrder(updated);

        if (nextStatus === 'delivered') {
            playDeliveryAlertSound();
            showToast(`${updated[index].name} teslim edildi olarak işaretlendi.`, 'success');
        } else {
            showToast(`${updated[index].name} hazırlanıyor durumuna alındı.`, 'info');
        }
    };

    // Tümünü teslim edildi yap
    const handleDeliverAllPending = async () => {
        if (cartItems.length === 0) return;
        const updated = cartItems.map(i => ({ ...i, status: 'delivered' }));
        setCartItems(updated);
        await persistOrder(updated);
        playDeliveryAlertSound();
        showToast("Tüm ürünler teslim edildi olarak işaretlendi!", "success");
    };

    // Save note
    const handleSaveNote = async () => {
        if (noteModalItemIdx === null) return;
        const updated = [...cartItems];
        if (updated[noteModalItemIdx]) {
            updated[noteModalItemIdx].notes = itemNoteInput.trim();
            setCartItems(updated);
            await persistOrder(updated);
            showToast('Sipariş notu kaydedildi.', 'success');
        }
        setNoteModalItemIdx(null);
        setItemNoteInput('');
    };

    // Mutfağa Fiş Yazdır (Tatlı ve İçecekler DAHİL EDİLMEZ!)
    const handlePrintKitchenTicket = () => {
        if (cartItems.length === 0) {
            showToast('Yazdırılacak ürün bulunmuyor.', 'warning');
            return;
        }

        const printableOrder = {
            table_no: tableNo,
            waiter_name: currentUser?.name || 'Garson',
            items: cartItems
        };

        const res = printKitchenOrderTicket(printableOrder, printerSettings);
        if (res && res.ok !== false) {
            showToast(`Mutfak fişi yazdırılıyor (${res.count} yeni ürün).`, 'success');
        } else {
            showToast(res?.message || 'Mutfak için yeni hazırlanacak ürün yok.', 'info');
        }
    };

    // Fiş Yazdır (Masa Açık Kalır)
    const handlePrintCustomerBill = () => {
        if (cartItems.length === 0) {
            showToast('Adisyonda ürün bulunmuyor.', 'warning');
            return;
        }

        const billOrder = {
            table_no: tableNo,
            waiter_name: existingOrder?.waiter_name || currentUser?.name || 'Garson',
            items: cartItems,
            subtotal: orderSubtotal,
            total: orderSubtotal,
            created_at: existingOrder?.created_at || new Date().toISOString()
        };

        printCustomerReceipt(billOrder, "Masa Adisyon Fişi", printerSettings);
        showToast(`Masa ${tableNo} adisyon fişi yazdırıldı.`, 'success');
    };

    // Checkout (Nakit / Kart Kapat)
    const handleCheckout = async (paymentMethod) => {
        if (cartItems.length === 0) {
            showToast('Kapatılacak ürün bulunmuyor.', 'warning');
            return;
        }

        const orderToClose = {
            table_no: tableNo,
            waiter_id: existingOrder?.waiter_id || (currentUser?.role === 'admin' ? (currentUser?.id || 'mgr-1') : (currentUser?.id || 'wtr-1')),
            waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Yönetici (Patron)') : (currentUser?.name || 'Garson')),
            items: cartItems,
            subtotal: orderSubtotal,
            total: orderSubtotal,
            created_at: existingOrder?.created_at || new Date().toISOString()
        };

        const orderDocId = existingOrder?.id;
        const targetView = currentUser?.role === 'admin' ? 'admin' : 'waiter';

        // 1. ANINDA masalar ekranına dön (Sepetin sıfırlanıp ekranda açık kalmasını engeller)
        navigateTo(targetView);

        // 2. Bildirim ve sesi ANINDA ver (0 ms gecikme, tam eş zamanlı)
        playChimeSound();
        showToast(`Masa ${tableNo} hesabı başarıyla kapatıldı!`, 'success');

        try {
            await recordCompletedOrder(orderToClose, paymentMethod);
            await closeTableOrder(tableNo, orderDocId);
        } catch (e) {
            console.error("Checkout error:", e);
            showToast("Ödeme kaydedilirken hata oluştu.", "danger");
        }
    };

    // Table Move & Merge (v1)
    const handleMoveOrMergeTable = async () => {
        const targetNo = Number(targetTableNo);
        if (!targetNo || targetNo === tableNo || targetNo < 1 || targetNo > 17) {
            showToast('Lütfen geçerli bir hedef masa seçiniz.', 'warning');
            return;
        }

        const targetOrder = activeOrders[String(targetNo)];
        const targetRef = doc(db, "orders", `table_${targetNo}`);
        const sourceRef = doc(db, "orders", `table_${tableNo}`);

        try {
            if (!targetOrder) {
                // Boş masaya taşı
                const movedPayload = {
                    ...(existingOrder || {}),
                    table_no: targetNo,
                    items: cartItems,
                    subtotal: orderSubtotal,
                    total: orderSubtotal,
                    updated_at: new Date().toISOString()
                };
                await setDoc(targetRef, movedPayload);
                await deleteDoc(sourceRef);
                showToast(`Masa ${tableNo}, boş Masa ${targetNo}'e taşındı.`, 'success');
            } else {
                // Dolu masayla birleştir
                const mergedItems = [...(targetOrder.items || [])];
                cartItems.forEach(sItem => {
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
                showToast(`Masa ${tableNo}, Masa ${targetNo} ile birleştirildi.`, 'success');
            }

            setShowMoveModal(false);
            if (currentUser?.role === 'admin') navigateTo('admin');
            else navigateTo('waiter');
        } catch (e) {
            console.error("Move error:", e);
            showToast('Masa taşınırken hata oluştu.', 'danger');
        }
    };

    // Parçalı Ödeme (Split Payment)
    const handleSplitPayment = async () => {
        const payingItems = [];
        const remainingItems = [];
        let payingSubtotal = 0;

        cartItems.forEach((item, index) => {
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
            showToast('Lütfen tahsil edilecek ürünleri seçiniz.', 'warning');
            return;
        }

        try {
            const partialOrderRecord = {
                table_no: tableNo,
                waiter_id: existingOrder?.waiter_id || (currentUser?.role === 'admin' ? (currentUser?.id || 'mgr-1') : (currentUser?.id || 'wtr-1')),
                waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Yönetici (Patron)') : (currentUser?.name || 'Garson')),
                items: payingItems,
                subtotal: payingSubtotal,
                total: payingSubtotal,
                is_partial: true,
                created_at: new Date().toISOString()
            };
            await recordCompletedOrder(partialOrderRecord, splitPayMethod);

            if (remainingItems.length === 0) {
                setShowSplitModal(false);
                playChimeSound();
                showToast(`Masa ${tableNo} tüm hesabı tahsil edilerek kapatıldı!`, 'success');
                if (currentUser?.role === 'admin') navigateTo('admin');
                else navigateTo('waiter');

                await recordCompletedOrder(partialOrderRecord, splitPayMethod);
                await closeTableOrder(tableNo, existingOrder?.id);
            } else {
                setShowSplitModal(false);
                setSplitSelections({});
                setCartItems(remainingItems);
                playChimeSound();
                showToast(`${formatMoney(payingSubtotal)} parçalı tahsil edildi. Kalanlar masada açık.`, 'success');

                await recordCompletedOrder(partialOrderRecord, splitPayMethod);
                await persistOrder(remainingItems);
            }
        } catch (e) {
            console.error("Split error:", e);
            showToast('Parçalı ödeme alınırken hata oluştu.', 'danger');
        }
    };

    const filteredProducts = useMemo(() => {
        return currentProducts.filter(product => {
            if (selectedCategory !== 'all' && product.category_id !== selectedCategory) {
                return false;
            }
            if (menuSearch.trim()) {
                const q = menuSearch.toLowerCase();
                return product.name.toLowerCase().includes(q);
            }
            return true;
        });
    }, [currentProducts, selectedCategory, menuSearch]);

    // Kategori bazlı lezzet sayıları (hap badge'ler için)
    const categoryCounts = useMemo(() => {
        const counts = {};
        currentProducts.forEach(p => {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        });
        return counts;
    }, [currentProducts]);

    return (
        <div className="order-screen-layout">
            {/* MOBİL BACKDROP */}
            <div 
                className={`receipt-backdrop ${isMobileCartOpen ? 'active' : ''}`}
                onClick={() => setIsMobileCartOpen(false)}
            />

            {/* LEFT / CENTER: MENU & MODERN STICKY CATEGORIES */}
            <section className="menu-side" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* 1. MODERN & KULLANICI DOSTU KATEGORİ VE ARAMA BARI */}
                <div className="category-bar-modern">
                    {/* Modern Search Wrapper */}
                    <div className="menu-search-wrapper">
                        <Search size={16} className="menu-search-icon" />
                        <input 
                            type="text"
                            className="menu-search-input"
                            placeholder="Menüde lezzet ara (Sütlaç, Menemen, Köfte, Tost)..."
                            value={menuSearch}
                            onChange={(e) => setMenuSearch(e.target.value)}
                        />
                        {menuSearch.trim() && (
                            <div className="search-trailing-actions">
                                <span className="search-count-pill">
                                    {filteredProducts.length} lezzet
                                </span>
                                <button 
                                    type="button" 
                                    className="search-clear-btn" 
                                    onClick={() => setMenuSearch('')}
                                    title="Aramayı Temizle"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Modern 2-Row Category Grid */}
                    <div className="modern-category-grid">
                        <motion.button
                            className={`modern-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedCategory('all');
                                setMenuSearch('');
                            }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="pill-icon">🍽️</span>
                            <span className="pill-title">Tümü</span>
                            <span className="pill-badge">{currentProducts.length}</span>
                        </motion.button>
                        {MENU_CATEGORIES.map(cat => {
                            const count = categoryCounts[cat.id] || 0;
                            return (
                                <motion.button
                                    key={cat.id}
                                    className={`modern-cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setMenuSearch('');
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <span className="pill-icon">{cat.icon}</span>
                                    <span className="pill-title">{cat.name}</span>
                                    {count > 0 && <span className="pill-badge">{count}</span>}
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. PRODUCTS GRID / CATEGORIZED 'TÜMÜ' DISPLAY (Framer Motion Animated) */}
                <div className="menu-products-scroll">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={selectedCategory + (menuSearch || '')}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        >
                            {selectedCategory === 'all' && !menuSearch.trim() ? (
                                MENU_CATEGORIES.map(cat => {
                                    const catProducts = currentProducts.filter(p => p.category_id === cat.id);
                                    if (catProducts.length === 0) return null;

                                    return (
                                        <div key={cat.id} className="menu-category-section">
                                            <div className="menu-category-header">
                                                <span>{cat.icon}</span>
                                                <span>{cat.name}</span>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                                    ({catProducts.length} çeşit)
                                                </span>
                                            </div>
                                            <div className="products-grid" style={{ padding: 0 }}>
                                                {catProducts.map(p => (
                                                    <ProductItemCard 
                                                        key={p.id} 
                                                        product={p} 
                                                        onAdd={(e) => handleAddToCart(p, e)} 
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="products-grid" style={{ padding: 0 }}>
                                    {filteredProducts.map(p => (
                                        <ProductItemCard 
                                            key={p.id} 
                                            product={p} 
                                            onAdd={(e) => handleAddToCart(p, e)} 
                                        />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </section>

            {/* YÜZEN MOBİL SEPET BARI (FLOATING QUICK CART BAR FOR TABLETS/MOBILES) */}
            <div 
                className="mobile-cart-bar" 
                onClick={() => setIsMobileCartOpen(true)}
            >
                <div className="mobile-cart-info">
                    <span className="mobile-cart-badge">{totalItemCount}</span>
                    <div>
                        <div className="mobile-cart-title">Masa {tableNo} Adisyonu</div>
                        <div className="mobile-cart-total">{formatMoney(orderSubtotal)}</div>
                    </div>
                </div>
                <button className="mobile-cart-btn">Adisyonu Aç ↗</button>
            </div>

            {/* RIGHT: ADİSYON SEPETİ & ÖDEME (DESKTOPTA SAĞDA, MOBİLDE SLIDE-UP DRAWER) */}
            <aside 
                className={`receipt-side ${isMobileCartOpen ? 'mobile-open' : ''}`}
            >
                {/* Header */}
                <div className="receipt-header">
                    <div style={{ width: '100%' }}>
                        {/* Drawer Drag Pill on Mobile */}
                        <div 
                            className="drawer-drag-pill" 
                            onClick={() => setIsMobileCartOpen(false)}
                        />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '11px', color: 'var(--brand-gold)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                    CANLI ADİSYON
                                </div>
                                <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0 }}>
                                    Masa {tableNo}
                                </h2>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button 
                                    className="btn-outline"
                                    onClick={() => setShowMoveModal(true)}
                                    style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <MoveHorizontal size={13} /> Taşı
                                </button>
                                <button 
                                    className="btn-outline"
                                    onClick={() => {
                                        setSplitSelections({});
                                        setShowSplitModal(true);
                                    }}
                                    style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <Scissors size={13} /> Böl
                                </button>
                                {/* Mobile Drawer Close Button */}
                                <button 
                                    className="btn-close-receipt-mobile"
                                    onClick={() => setIsMobileCartOpen(false)}
                                    title="Adisyonu Kapat"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Waiter badge */}
                        <div style={{
                            marginTop: '10px',
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
                                {existingOrder?.waiter_name || currentUser?.name || 'Garson'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items List (Teslim Edilen ve Edilmeyen Ürünler Ayrı Gruplandı) */}
                <div className="receipt-items-list">
                    {cartItems.length === 0 ? (
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
                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Soldaki menüden ürün seçerek ekleyebilirsiniz.</div>
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
                                        <Clock size={13} /> {cartItems.filter(i => i.status !== 'delivered').length} Hazırlanıyor
                                    </span>
                                    <span style={{ color: 'var(--text-muted)' }}>•</span>
                                    <span style={{ color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <CheckCircle2 size={13} /> {cartItems.filter(i => i.status === 'delivered').length} Teslim
                                    </span>
                                </div>
                                {cartItems.some(i => i.status !== 'delivered') && (
                                    <button
                                        onClick={handleDeliverAllPending}
                                        className="btn-outline"
                                        style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--success)', borderColor: 'rgba(16,185,129,0.3)', fontWeight: 700 }}
                                        title="Tüm hazırlananları teslim edildi yap"
                                    >
                                        Tümünü Teslim Et ✓
                                    </button>
                                )}
                            </div>

                            {/* 1. GRUP: MUTFAKTA HAZIRLANAN / PİŞEN ÜRÜNLER */}
                            {cartItems.some(i => i.status !== 'delivered') && (
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
                                        <Clock size={12} /> 🟡 Hazırlanıyor / Mutfakta ({cartItems.filter(i => i.status !== 'delivered').length})
                                    </div>
                                    {cartItems.map((item, idx) => {
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
                                                        onClick={() => handleToggleDeliveryStatus(idx)}
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
                                                            onClick={() => handleUpdateQuantity(idx, -1)}
                                                            className="btn-outline"
                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Minus size={13} />
                                                        </button>
                                                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'white', minWidth: '18px', textAlign: 'center' }}>
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(idx, 1)}
                                                            className="btn-outline"
                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Plus size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(idx, -item.quantity)}
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

                            {/* 2. GRUP: MASAYA TESLİM EDİLEN ÜRÜNLER (TATLI, İÇECEK, TESLİM EDİLEN YEMEKLER) */}
                            {cartItems.some(i => i.status === 'delivered') && (
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
                                        <CheckCircle2 size={12} /> 🟢 Teslim Edildi / Masada ({cartItems.filter(i => i.status === 'delivered').length})
                                    </div>
                                    {cartItems.map((item, idx) => {
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
                                                        onClick={() => handleToggleDeliveryStatus(idx)}
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
                                                            onClick={() => handleUpdateQuantity(idx, -1)}
                                                            className="btn-outline"
                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Minus size={13} />
                                                        </button>
                                                        <span style={{ fontWeight: 800, fontSize: '13px', color: 'white', minWidth: '18px', textAlign: 'center' }}>
                                                            {item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(idx, 1)}
                                                            className="btn-outline"
                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            <Plus size={13} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateQuantity(idx, -item.quantity)}
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

                {/* Footer & Checkout Buttons */}
                <div className="receipt-footer">
                    <div className="total-summary">
                        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Genel Tutar</span>
                        <span style={{ color: 'var(--brand-gold)', fontSize: '24px', fontWeight: 800 }}>
                            {formatMoney(orderSubtotal)}
                        </span>
                    </div>

                    {/* Mutfağa Fiş Yazdır (Tatlı ve İçecekler Hariç!) */}
                    <motion.button
                        onClick={handlePrintKitchenTicket}
                        className="btn-primary"
                        whileTap={{ scale: 0.97 }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '14px',
                            fontWeight: 800,
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            marginBottom: '6px'
                        }}
                    >
                        <Printer size={16} /> Mutfağa Fiş Gönder
                    </motion.button>

                    {/* 3 Checkout Buttons Group (Nakit, Kart, Masa Hesap Fişi) */}
                    <div className="checkout-actions-3col">
                        <motion.button
                            onClick={() => handleCheckout('cash')}
                            disabled={cartItems.length === 0}
                            className="btn-checkout-action btn-checkout-cash"
                            whileTap={{ scale: 0.95 }}
                        >
                            <Banknote size={18} />
                            Nakit Kapat
                        </motion.button>

                        <motion.button
                            onClick={() => handleCheckout('card')}
                            disabled={cartItems.length === 0}
                            className="btn-checkout-action btn-checkout-card"
                            whileTap={{ scale: 0.95 }}
                        >
                            <CreditCard size={18} />
                            Kart Kapat
                        </motion.button>

                        <motion.button
                            onClick={handlePrintCustomerBill}
                            disabled={cartItems.length === 0}
                            className="btn-checkout-action btn-checkout-print"
                            title="Müşteri Hesap Fişini Yazdır (Masa Açık Kalır)"
                            whileTap={{ scale: 0.95 }}
                        >
                            <Receipt size={18} />
                            Masa Hesap Fişi
                        </motion.button>
                    </div>
                </div>
            </aside>

            {/* MODAL 1: NOTE MODAL */}
            {noteModalItemIdx !== null && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1 }}>
                    <div className="modal-content open" style={{ transform: 'scale(1)', opacity: 1 }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', marginBottom: '8px' }}>
                            Sipariş Notu Ekle
                        </h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
                            {cartItems[noteModalItemIdx]?.name} için mutfak / servis notu:
                        </p>
                        <textarea
                            rows={3}
                            value={itemNoteInput}
                            onChange={(e) => setItemNoteInput(e.target.value)}
                            placeholder="Örn: Az pişmiş, Buzsuz, Acısız..."
                            style={{
                                width: '100%',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-active)',
                                color: 'white',
                                padding: '12px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '14px',
                                outline: 'none',
                                resize: 'none'
                            }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                            <button onClick={() => setNoteModalItemIdx(null)} className="btn-outline">
                                Vazgeç
                            </button>
                            <button onClick={handleSaveNote} className="btn-primary" style={{ padding: '8px 20px' }}>
                                Kaydet
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: TABLE MOVE & MERGE (v1) */}
            {showMoveModal && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1 }}>
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
                            Masa <strong>{tableNo}</strong> siparişlerini aktarmak istediğiniz hedef masayı seçin:
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(62px, 1fr))', gap: '8px', marginBottom: '18px' }}>
                            {tables.map(t => {
                                const isSelf = t.table_no === tableNo;
                                const isOccupied = !!activeOrders[String(t.table_no)];
                                const isSelected = targetTableNo === String(t.table_no);

                                return (
                                    <button
                                        key={t.id}
                                        disabled={isSelf}
                                        onClick={() => setTargetTableNo(String(t.table_no))}
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

                        {targetTableNo && (
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: activeOrders[targetTableNo] ? 'rgba(245, 159, 0, 0.12)' : 'var(--success-soft)',
                                border: activeOrders[targetTableNo] ? '1px solid rgba(245, 159, 0, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
                                color: activeOrders[targetTableNo] ? 'var(--brand-gold)' : 'var(--success)',
                                fontSize: '12px',
                                fontWeight: 700,
                                marginBottom: '16px'
                            }}>
                                {activeOrders[targetTableNo] ? (
                                    <span>⚠️ Hedef Masa {targetTableNo} DOLU! Siparişler <strong>BİRLEŞTİRİLECEKTİR</strong>.</span>
                                ) : (
                                    <span>✓ Hedef Masa {targetTableNo} BOŞ. Adisyon doğrudan <strong>TAŞINACAKTIR</strong>.</span>
                                )}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setShowMoveModal(false)} className="btn-outline" style={{ flex: 1 }}>
                                Vazgeç
                            </button>
                            <button 
                                onClick={handleMoveOrMergeTable}
                                disabled={!targetTableNo}
                                className="btn-primary" 
                                style={{ flex: 2, padding: '10px' }}
                            >
                                Onayla ve Aktar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: SPLIT PAYMENT */}
            {showSplitModal && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1 }}>
                    <div className="modal-content open modal-responsive-card" style={{ maxWidth: '440px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Scissors size={18} className="text-emerald-400" />
                                Parçalı / Kısmi Ödeme
                            </h3>
                            <button onClick={() => setShowSplitModal(false)} className="btn-logout" style={{ width: '28px', height: '28px' }}>
                                <X size={15} />
                            </button>
                        </div>

                        <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '12px' }}>
                            Aşağıdan şu an tahsil edilecek ürün adetlerini seçin:
                        </p>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                            {cartItems.map((item, idx) => {
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
                                            <span style={{ fontWeight: 800, minWidth: '18px', textAlign: 'center', color: selQty > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
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

                        {/* Pay method */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                            <button
                                onClick={() => setSplitPayMethod('cash')}
                                className="btn-outline"
                                style={{
                                    padding: '9px',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    background: splitPayMethod === 'cash' ? '#10b981' : 'transparent',
                                    borderColor: splitPayMethod === 'cash' ? '#10b981' : 'var(--border-card)',
                                    color: splitPayMethod === 'cash' ? '#fff' : 'var(--text-secondary)'
                                }}
                            >
                                💵 Nakit
                            </button>
                            <button
                                onClick={() => setSplitPayMethod('card')}
                                className="btn-outline"
                                style={{
                                    padding: '9px',
                                    fontWeight: 800,
                                    fontSize: '13px',
                                    background: splitPayMethod === 'card' ? 'var(--brand-primary)' : 'transparent',
                                    borderColor: splitPayMethod === 'card' ? 'var(--brand-primary)' : 'var(--border-card)',
                                    color: splitPayMethod === 'card' ? '#fff' : 'var(--text-secondary)'
                                }}
                            >
                                💳 Kredi Kartı
                            </button>
                        </div>

                        <button
                            onClick={handleSplitPayment}
                            className="btn-primary"
                            style={{ padding: '12px', fontSize: '14px', fontWeight: 800 }}
                        >
                            Seçilenleri Tahsil Et
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Product Card
function ProductItemCard({ product, onAdd }) {
    const isInstant = isInstantDeliveryCategory(product.category_id, product.name);
    const isOutOfStock = product.active === false;

    return (
        <motion.div 
            className={`product-item-card ${isOutOfStock ? 'is-out-of-stock' : ''}`} 
            onClick={isOutOfStock ? undefined : onAdd} 
            style={{ 
                position: 'relative',
                opacity: isOutOfStock ? 0.45 : 1,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer'
            }}
            whileHover={isOutOfStock ? {} : { y: -3, transition: { duration: 0.12 } }}
            whileTap={isOutOfStock ? {} : { scale: 0.96 }}
        >
            <div className="product-info">
                <div className="product-name" style={{ textDecoration: isOutOfStock ? 'line-through' : 'none' }}>
                    {product.name}
                </div>
                {isOutOfStock ? (
                    <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 800 }}>
                        ⛔ TÜKENDİ
                    </span>
                ) : isInstant ? (
                    <span style={{ fontSize: '10px', color: 'var(--success)', fontWeight: 700 }}>
                        ⚡ Tezgahtan Verilir
                    </span>
                ) : null}
            </div>
            <div className="product-price">{formatMoney(product.price)}</div>
        </motion.div>
    );
}
