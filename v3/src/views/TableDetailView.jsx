import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    playDeliveryAlertSound,
    playNotificationSound
} from '../services/audioService';
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
    Receipt,
    Tag,
    Zap,
    User,
    LayoutGrid,
    ChevronDown,
    Check,
    ChefHat
} from 'lucide-react';
import DiscountModal from '../components/DiscountModal';
import QuickAmountModal from '../components/QuickAmountModal';
import MoveTableModal from '../components/MoveTableModal';
import SplitPaymentModal from '../components/SplitPaymentModal';
import LiveOrderDrawer from '../components/LiveOrderDrawer';

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

    // Kategori Seçim Modalı & Görünüm Modu (Yana kaydırmasız hızlı sipariş)
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [categoryViewMode, setCategoryViewMode] = useState('grid');

    // Modals
    const [noteModalItemIdx, setNoteModalItemIdx] = useState(null);
    const [itemNoteInput, setItemNoteInput] = useState('');
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [targetTableNo, setTargetTableNo] = useState('');
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitSelections, setSplitSelections] = useState({});
    const [splitPayMethod, setSplitPayMethod] = useState('cash');
    const [showDiscountModal, setShowDiscountModal] = useState(false);
    const [showQuickAmountModal, setShowQuickAmountModal] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [discountReason, setDiscountReason] = useState('');

    // Sync remote order with local cart (Farklı cihazlardan gelen güncellemeleri anında canlı yakalar)
    useEffect(() => {
        if (existingOrder && existingOrder.items) {
            setCartItems(existingOrder.items);
            setDiscount(Number(existingOrder.discount) || 0);
            setDiscountReason(existingOrder.discount_reason || '');
        } else {
            setCartItems([]);
            setDiscount(0);
            setDiscountReason('');
        }
    }, [existingOrder]);

    const orderSubtotal = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
    }, [cartItems]);

    const finalDiscount = useMemo(() => {
        return Math.min(orderSubtotal, Math.max(0, Number(discount) || 0));
    }, [orderSubtotal, discount]);

    const finalTotal = useMemo(() => {
        return Math.max(0, orderSubtotal - finalDiscount);
    }, [orderSubtotal, finalDiscount]);

    const totalItemCount = useMemo(() => {
        return cartItems.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }, [cartItems]);

    // Sepetteki henüz mutfağa iletilmemiş sıcak yemek sayısı
    const unsentKitchenItemsCount = useMemo(() => {
        return cartItems
            .filter(i => i.status === 'cooking' && i.kitchen_sent === false)
            .reduce((sum, i) => sum + (Number(i.quantity) || 1), 0);
    }, [cartItems]);

    // Save to Firestore
    const persistOrder = useCallback(async (items, customDiscount = discount, customReason = discountReason, kitchenStatusOverride = null) => {
        const orderRef = doc(db, "orders", `table_${tableNo}`);
        const subtotal = items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity || 1)), 0);
        const dAmount = Math.min(subtotal, Math.max(0, Number(customDiscount) || 0));
        const total = Math.max(0, subtotal - dAmount);

        if (items.length === 0) {
            await closeTableOrder(tableNo, existingOrder?.id);
            return;
        }

        const hasCookingSent = items.some(i => i.status === 'cooking' && i.kitchen_sent !== false);
        const resolvedKitchenStatus = kitchenStatusOverride
            ? kitchenStatusOverride
            : (hasCookingSent ? 'pending' : (existingOrder?.kitchen_status || 'pending'));

        const payload = {
            table_no: tableNo,
            table_id: tableNo,
            waiter_id: existingOrder?.waiter_id || (currentUser?.role === 'admin' ? (currentUser?.id || 'mgr-1') : (currentUser?.id || 'wtr-1')),
            waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Yönetici') : (currentUser?.name || 'Garson')),
            items: items,
            items_count: items.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
            subtotal: subtotal,
            discount: dAmount,
            discount_reason: customReason || '',
            total: total,
            status: "open",
            kitchen_status: resolvedKitchenStatus,
            all_delivered: !hasCookingSent && items.length > 0 && items.every(i => i.status === 'delivered'),
            updated_at: new Date().toISOString()
        };

        if (!existingOrder) {
            payload.created_at = new Date().toISOString();
        }

        await setDoc(orderRef, payload, { merge: true });
    }, [tableNo, existingOrder, currentUser, discount, discountReason, closeTableOrder]);

    // Add product to cart (Anında tepki & sıfır kasma)
    const handleAddToCart = useCallback((product) => {
        const isInstant = isInstantDeliveryCategory(product.category_id, product.name);
        const initialStatus = isInstant ? 'delivered' : 'cooking';
        // İçecek ve tatlılar anında tezgahtan teslimdir (kitchen_sent: true).
        // Sıcak mutfak ürünleri ise garson 'Mutfağa Gönder' butonuna basana kadar taslaktır (kitchen_sent: false).
        const initialKitchenSent = isInstant ? true : false;

        setCartItems(prev => {
            const updated = [...prev];
            const existingIdx = updated.findIndex(i => 
                i.product_id === product.id && 
                i.status === initialStatus && 
                !i.notes &&
                (isInstant ? true : i.kitchen_sent === false)
            );

            if (existingIdx >= 0) {
                updated[existingIdx] = {
                    ...updated[existingIdx],
                    quantity: (Number(updated[existingIdx].quantity) || 1) + 1
                };
            } else {
                updated.push({
                    product_id: product.id,
                    name: product.name,
                    price: Number(product.price),
                    category_id: product.category_id,
                    quantity: 1,
                    status: initialStatus,
                    kitchen_sent: initialKitchenSent,
                    notes: '',
                    added_at: new Date().toISOString()
                });
            }

            persistOrder(updated);
            return updated;
        });
    }, [persistOrder]);

    // Mutfağa Gönder (Garson onaylayınca bekleyen sıcak yemekler mutfağa iletilir)
    const handleSendToKitchen = useCallback(async () => {
        const unsentItems = cartItems.filter(i => i.status === 'cooking' && i.kitchen_sent === false);
        if (unsentItems.length === 0) {
            showToast('Mutfağa iletilecek yeni sipariş bulunmuyor.', 'info');
            return;
        }

        const now = new Date().toISOString();
        const updated = cartItems.map(item => {
            if (item.status === 'cooking' && item.kitchen_sent === false) {
                return {
                    ...item,
                    kitchen_sent: true,
                    kitchen_sent_at: now
                };
            }
            return item;
        });

        setCartItems(updated);
        await persistOrder(updated, discount, discountReason, 'pending');

        // Mutfak Fişi Yazdır (eğer mutfak fişi açıksa)
        try {
            printKitchenOrderTicket({
                table_no: tableNo,
                waiter_name: existingOrder?.waiter_name || currentUser?.name || 'Garson',
                items: updated
            }, printerSettings);
        } catch (e) {}

        playNotificationSound();
        showToast(`🍳 Masa ${tableNo} için ${unsentItems.length} ürün mutfağa gönderildi!`, 'success');
    }, [cartItems, persistOrder, tableNo, existingOrder, currentUser, printerSettings, showToast]);

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

    // İndirim Uygula / Kaldır Handlers
    const handleApplyDiscount = async (discAmount, reason) => {
        setDiscount(discAmount);
        setDiscountReason(reason);
        await persistOrder(cartItems, discAmount, reason);
        showToast(`Masa ${tableNo} için ${formatMoney(discAmount)} indirim uygulandı.`, 'success');
    };

    const handleRemoveDiscount = async () => {
        setDiscount(0);
        setDiscountReason('');
        await persistOrder(cartItems, 0, '');
        showToast(`İndirim kaldırıldı.`, 'info');
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
            discount: finalDiscount,
            discount_reason: discountReason,
            total: finalTotal,
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
            waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Yönetici') : (currentUser?.name || 'Garson')),
            items: cartItems,
            subtotal: orderSubtotal,
            discount: finalDiscount,
            discount_reason: discountReason || (finalDiscount > 0 ? 'İndirim/İkram' : ''),
            total: finalTotal,
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

    // ⚡ Hızlı Tutar ile Kapat (Serbest Hesap / Kurtarıcı Emniyet Sübabı)
    const handleQuickAmountCheckout = async ({ amount, paymentMethod, note, shouldPrint }) => {
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        const orderDocId = existingOrder?.id;
        const targetView = currentUser?.role === 'admin' ? 'admin' : 'waiter';

        const orderToClose = {
            ...(existingOrder || {}),
            table_no: tableNo,
            waiter_id: existingOrder?.waiter_id || (currentUser?.role === 'admin' ? (currentUser?.id || 'mgr-1') : (currentUser?.id || 'wtr-1')),
            waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Kasa / Yönetici') : (currentUser?.name || 'Garson')),
            items: cartItems.length > 0 ? cartItems : [
                {
                    name: note || 'Hızlı Hesap (Öğle Yoğunluğu)',
                    price: numAmount,
                    quantity: 1,
                    status: 'delivered'
                }
            ],
            items_count: cartItems.length > 0 ? totalItemCount : 1,
            subtotal: numAmount,
            discount: 0,
            discount_reason: '',
            total: numAmount,
            note: note || 'Hızlı Hesap',
            payment_method: paymentMethod, // 'cash' | 'card'
            is_quick_amount: true,
            closed_at: new Date().toISOString()
        };

        // 1. Modalı kapat ve anında masalar ekranına dön
        setShowQuickAmountModal(false);
        navigateTo(targetView);

        // 2. Fiş yazdırma
        if (shouldPrint) {
            try {
                printCustomerReceipt(orderToClose, "Hızlı Hesap Fişi", printerSettings);
            } catch (err) {
                console.error("Print receipt error:", err);
            }
        }

        // 3. Bildirim ve ses
        playChimeSound();
        showToast(`Masa ${tableNo} hızlı tutarla (${formatMoney(numAmount)}) kapatıldı!`, 'success');

        // 4. Firestore kaydı ve masayı temizleme
        try {
            await recordCompletedOrder(orderToClose, paymentMethod);
            await closeTableOrder(tableNo, orderDocId);
        } catch (e) {
            console.error("Quick amount checkout error:", e);
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
        let totalSubtotal = 0;

        cartItems.forEach((item, index) => {
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

        if (payingItems.length === 0) {
            showToast('Lütfen tahsil edilecek ürünleri seçiniz.', 'warning');
            return;
        }

        const currentDiscount = Number(discount) || 0;
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
                table_no: tableNo,
                waiter_id: existingOrder?.waiter_id || (currentUser?.role === 'admin' ? (currentUser?.id || 'mgr-1') : (currentUser?.id || 'wtr-1')),
                waiter_name: existingOrder?.waiter_name || (currentUser?.role === 'admin' ? (currentUser?.name || 'Yönetici') : (currentUser?.name || 'Garson')),
                items: payingItems,
                subtotal: payingSubtotal,
                discount: payingDiscount,
                discount_reason: discountReason || '',
                total: payingTotal,
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

                await closeTableOrder(tableNo, existingOrder?.id);
            } else {
                setShowSplitModal(false);
                setSplitSelections({});
                setCartItems(remainingItems);
                setDiscount(remainingDiscount);
                playChimeSound();
                showToast(`${formatMoney(payingTotal)} parçalı tahsil edildi. Kalanlar masada açık.`, 'success');

                await persistOrder(remainingItems, remainingDiscount, discountReason);
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

    // Sepetteki ürün adetleri haritası (21st.dev / Motion rozeti için)
    const cartItemCounts = useMemo(() => {
        const counts = {};
        cartItems.forEach(item => {
            if (item.product_id) {
                counts[item.product_id] = (counts[item.product_id] || 0) + (Number(item.quantity) || 1);
            }
        });
        return counts;
    }, [cartItems]);

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
            {/* LEFT / CENTER: MENU & MODERN STICKY CATEGORIES */}
            <section className="menu-side" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>


                {/* 1. 21ST.DEV & MOTION KULLANICI DOSTU KATEGORİ VE ARAMA BARI */}
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
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') setMenuSearch('');
                            }}
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

                    {/* Mobilde Yana Kaydırmayı Önleyen Hızlı Kategori Seçim Barı */}
                    <div className="category-quick-nav-bar">
                        {/* Kategori Seç Butonu (Tıklayınca tüm kategoriler 3 sütunlu ferah panelde açılır) */}
                        <button
                            type="button"
                            className="category-sheet-trigger-btn"
                            onClick={() => setShowCategoryModal(true)}
                            title="Tüm Kategorileri Gör ve Seç"
                        >
                            <span className="cat-trigger-icon">
                                {selectedCategory === 'all' ? '🍽️' : (MENU_CATEGORIES.find(c => c.id === selectedCategory)?.icon || '📂')}
                            </span>
                            <span className="cat-trigger-text">
                                {selectedCategory === 'all' ? 'Tüm Kategoriler' : MENU_CATEGORIES.find(c => c.id === selectedCategory)?.name}
                            </span>
                            <span className="cat-trigger-badge">
                                {selectedCategory === 'all' ? currentProducts.length : (categoryCounts[selectedCategory] || 0)}
                            </span>
                            <ChevronDown size={14} className="cat-trigger-arrow" />
                        </button>

                        {/* Hızlı Tümü Kısayolu */}
                        <button
                            type="button"
                            className={`category-quick-all-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedCategory('all');
                                setMenuSearch('');
                            }}
                        >
                            <span>🍽️ Tümü</span>
                            <span className="cat-quick-badge">{currentProducts.length}</span>
                        </button>

                        {/* Izgara / Kompakt Görünüm Değiştirici */}
                        <button
                            type="button"
                            className={`category-view-toggle-btn ${categoryViewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setCategoryViewMode(prev => prev === 'grid' ? 'bar' : 'grid')}
                            title={categoryViewMode === 'grid' ? "Kategorileri Gizle / Kompakt Çubuk" : "Tüm Kategorileri Izgara Yap"}
                        >
                            <LayoutGrid size={13} />
                            <span>{categoryViewMode === 'grid' ? 'Izgara' : 'Kompakt'}</span>
                        </button>
                    </div>

                    {/* Modern Category Grid: Ekranda 4 sütunlu (mobilde 3 sütunlu) ferah yerleşim - ASLA yana kaydırılmaz! */}
                    <div className={`modern-category-grid ${categoryViewMode === 'grid' ? 'grid-expanded' : 'grid-compact'}`}>
                        <button
                            type="button"
                            className={`modern-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => {
                                setSelectedCategory('all');
                                setMenuSearch('');
                            }}
                        >
                            <div className="pill-icon-wrap">
                                <span>🍽️</span>
                            </div>
                            <span className="pill-title">Tümü</span>
                            <span className="pill-badge">{currentProducts.length}</span>
                        </button>
                        {MENU_CATEGORIES.map(cat => {
                            const count = categoryCounts[cat.id] || 0;
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    className={`modern-cat-pill ${isSelected ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedCategory(cat.id);
                                        setMenuSearch('');
                                    }}
                                >
                                    <div className="pill-icon-wrap">
                                        <span>{cat.icon}</span>
                                    </div>
                                    <span className="pill-title">{cat.name}</span>
                                    {count > 0 && <span className="pill-badge">{count}</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* 2. PRODUCTS GRID / CATEGORIZED 'TÜMÜ' DISPLAY (Snappy Animated Cascade) */}
                <div className="menu-products-scroll">
                    {selectedCategory === 'all' && !menuSearch.trim() ? (
                        <div key="all_categories">
                            {MENU_CATEGORIES.map(cat => {
                                const catProducts = currentProducts.filter(p => p.category_id === cat.id);
                                if (catProducts.length === 0) return null;

                                return (
                                    <div key={cat.id} className="menu-category-section">
                                        <div className="modern-category-section-header">
                                            <div className="modern-cat-icon-badge">
                                                {cat.icon}
                                            </div>
                                            <div className="modern-cat-header-title-box">
                                                <span className="modern-cat-section-title">{cat.name}</span>
                                                <span className="modern-cat-section-count">
                                                    {catProducts.length} lezzet
                                                </span>
                                            </div>
                                            <div className="modern-cat-header-line" />
                                        </div>
                                        <div className="products-grid" style={{ padding: 0 }}>
                                            {catProducts.map(p => (
                                                <ProductItemCard 
                                                    key={p.id} 
                                                    product={p} 
                                                    inCartCount={cartItemCounts[p.id] || 0}
                                                    onAdd={handleAddToCart} 
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <>
                            {filteredProducts.length === 0 ? (
                                <div className="empty-menu-search">
                                    <div className="empty-search-icon">🔍</div>
                                    <div className="empty-search-title">"{menuSearch}" ile lezzet bulunamadı</div>
                                    <p className="empty-search-desc">Lütfen arama kelimenizi kontrol edin veya filtreyi sıfırlayın.</p>
                                    <button 
                                        type="button" 
                                        className="empty-search-clear-btn"
                                        onClick={() => setMenuSearch('')}
                                    >
                                        Aramayı Temizle
                                    </button>
                                </div>
                            ) : (
                                <div 
                                    className="products-grid" 
                                    style={{ padding: 0 }}
                                >
                                    {filteredProducts.map(p => (
                                        <ProductItemCard 
                                            key={p.id} 
                                            product={p} 
                                            inCartCount={cartItemCounts[p.id] || 0}
                                            onAdd={handleAddToCart} 
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            {/* YÜZEN MOBİL SEPET BARI (FLOATING QUICK CART BAR FOR TABLETS/MOBILES) */}
            <div className="mobile-cart-bar">
                <div 
                    className="mobile-cart-info" 
                    onClick={() => setIsMobileCartOpen(true)}
                    style={{ flex: 1, cursor: 'pointer' }}
                >
                    <span className="mobile-cart-badge">{totalItemCount}</span>
                    <div>
                        <div className="mobile-cart-title">Masa {tableNo} Adisyonu</div>
                        <div className="mobile-cart-total">{formatMoney(orderSubtotal)}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {unsentKitchenItemsCount > 0 && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleSendToKitchen();
                            }}
                            className="mobile-cart-btn"
                            style={{
                                background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)',
                                color: '#ffffff',
                                border: '1px solid rgba(255, 255, 255, 0.35)',
                                boxShadow: '0 4px 14px rgba(234, 88, 12, 0.45)',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                        >
                            <ChefHat size={15} />
                            <span>Mutfağa Gönder ({unsentKitchenItemsCount})</span>
                        </button>
                    )}
                    <button 
                        type="button"
                        className="mobile-cart-btn"
                        onClick={() => setIsMobileCartOpen(true)}
                    >
                        Adisyonu Aç ↗
                    </button>
                </div>
            </div>

            {/* RIGHT: ADİSYON SEPETİ & ÖDEME (ORTAK MODÜL - REFERANS 1) */}
            <LiveOrderDrawer
                isOpen={isMobileCartOpen}
                mode="sidebar"
                tableNo={tableNo}
                order={{
                    items: cartItems,
                    subtotal: orderSubtotal,
                    discount: finalDiscount,
                    total: finalTotal,
                    waiter_name: existingOrder?.waiter_name || currentUser?.name
                }}
                currentUser={currentUser}
                isTableDetail={true}
                unsentKitchenCount={unsentKitchenItemsCount}
                onSendToKitchen={handleSendToKitchen}
                onClose={() => setIsMobileCartOpen(false)}
                onMove={() => setShowMoveModal(true)}
                onSplit={() => {
                    setSplitSelections({});
                    setShowSplitModal(true);
                }}
                onToggleItemStatus={handleToggleDeliveryStatus}
                onDeliverAll={handleDeliverAllPending}
                onUpdateQuantity={handleUpdateQuantity}
                onAddNote={(idx) => {
                    setNoteModalItemIdx(idx);
                    setItemNoteInput(cartItems[idx]?.notes || '');
                }}
                onNavigateToTable={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setIsMobileCartOpen(false);
                }}
                onQuickAmount={() => setShowQuickAmountModal(true)}
                onOpenDiscount={() => setShowDiscountModal(true)}
                onRemoveDiscount={handleRemoveDiscount}
                onPrintKitchen={handlePrintKitchenTicket}
                onPrintCustomerBill={handlePrintCustomerBill}
                onCheckout={handleCheckout}
            />

            {/* KATEGORİ SEÇİM MODALI / SAYFASI (Yana kaydırmasız 1-tıkla kategori seçici) */}
            {showCategoryModal && (
                <div 
                    className="modal-overlay open" 
                    style={{ display: 'flex', opacity: 1, zIndex: 2500 }}
                    onClick={() => setShowCategoryModal(false)}
                >
                    <div 
                        className="category-sheet-modal"
                        onClick={(e) => e.stopPropagation()}
                    >
                            <div className="category-sheet-header">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div className="cat-sheet-icon-circle">
                                        <LayoutGrid size={18} />
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                                            Kategori Seçin
                                        </h3>
                                        <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.55)', margin: 0 }}>
                                            Kaydırmadan tek dokunuşla seçin
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    className="search-clear-btn"
                                    onClick={() => setShowCategoryModal(false)}
                                    title="Kapat"
                                    style={{ width: '32px', height: '32px' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <div className="category-sheet-grid">
                                {/* Tümü Seçeneği */}
                                <button
                                    type="button"
                                    className={`category-sheet-card ${selectedCategory === 'all' ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedCategory('all');
                                        setMenuSearch('');
                                        setShowCategoryModal(false);
                                    }}
                                >
                                    <span className="cat-sheet-icon">🍽️</span>
                                    <span className="cat-sheet-title">Tümü</span>
                                    <span className="cat-sheet-count">{currentProducts.length} Lezzet</span>
                                    {selectedCategory === 'all' && (
                                        <Check size={16} className="cat-sheet-check" />
                                    )}
                                </button>

                                {MENU_CATEGORIES.map(cat => {
                                    const count = categoryCounts[cat.id] || 0;
                                    const isSelected = selectedCategory === cat.id;
                                    return (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            className={`category-sheet-card ${isSelected ? 'active' : ''}`}
                                            onClick={() => {
                                                setSelectedCategory(cat.id);
                                                setMenuSearch('');
                                                setShowCategoryModal(false);
                                            }}
                                        >
                                            <span className="cat-sheet-icon">{cat.icon}</span>
                                            <span className="cat-sheet-title">{cat.name}</span>
                                            <span className="cat-sheet-count">{count} Ürün</span>
                                            {isSelected && (
                                                <Check size={16} className="cat-sheet-check" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                    </div>
                </div>
            )}

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
            <MoveTableModal
                isOpen={showMoveModal}
                sourceTable={tableNo}
                selectedTargetTable={targetTableNo}
                onSelectTargetTable={setTargetTableNo}
                onConfirm={handleMoveOrMergeTable}
                onClose={() => {
                    setShowMoveModal(false);
                    setTargetTableNo('');
                }}
                tables={tables}
                activeOrders={activeOrders}
            />

            {/* MODAL 3: SPLIT PAYMENT */}
            <SplitPaymentModal
                isOpen={showSplitModal}
                tableNo={tableNo}
                order={{
                    ...(existingOrder || {}),
                    items: cartItems,
                    subtotal: orderSubtotal,
                    discount: finalDiscount,
                    discount_reason: discountReason,
                    total: finalTotal
                }}
                splitSelections={splitSelections}
                setSplitSelections={setSplitSelections}
                splitPayMethod={splitPayMethod}
                setSplitPayMethod={setSplitPayMethod}
                onConfirm={handleSplitPayment}
                onClose={() => {
                    setShowSplitModal(false);
                    setSplitSelections({});
                }}
            />

            {/* MODAL 4: DISCOUNT MODAL */}
            <DiscountModal
                isOpen={showDiscountModal}
                onClose={() => setShowDiscountModal(false)}
                tableNo={tableNo}
                subtotal={orderSubtotal}
                currentDiscount={discount}
                items={cartItems}
                onApply={handleApplyDiscount}
                onRemove={handleRemoveDiscount}
            />

            {/* MODAL 5: ⚡ HIZLI TUTAR İLE KAPATMA (KURTARICI EMNİYET SÜBABI) */}
            <QuickAmountModal
                isOpen={showQuickAmountModal}
                onClose={() => setShowQuickAmountModal(false)}
                tableNo={tableNo}
                existingOrder={existingOrder}
                currentUser={currentUser}
                onConfirm={handleQuickAmountCheckout}
                printerSettings={printerSettings}
            />
        </div>
    );
}

// Ultra-performant Memoized Product Card (4GB Tablet & Low-end CPU/GPU Optimized, Zero Animation Lag)
const ProductItemCard = React.memo(function ProductItemCard({ product, onAdd, inCartCount = 0 }) {
    const isInstant = isInstantDeliveryCategory(product.category_id, product.name);
    const isOutOfStock = product.active === false;

    return (
        <div 
            className={`modern-product-card ${isOutOfStock ? 'is-out-of-stock' : ''} ${inCartCount > 0 ? 'has-in-cart' : ''}`} 
            onClick={isOutOfStock ? undefined : () => onAdd(product)} 
            style={{ 
                opacity: isOutOfStock ? 0.42 : 1,
                cursor: isOutOfStock ? 'not-allowed' : 'pointer'
            }}
        >
            <div className="modern-product-info">
                <div className="modern-product-name-row">
                    <div 
                        className="modern-product-name" 
                        style={{ textDecoration: isOutOfStock ? 'line-through' : 'none' }}
                        title={product.name}
                    >
                        {product.name}
                    </div>
                    {inCartCount > 0 && (
                        <span 
                            className="modern-incart-badge"
                            title={`${inCartCount} adet adisyonda ekli`}
                        >
                            <span className="incart-pulse-dot" />
                            {inCartCount}
                        </span>
                    )}
                </div>

                <div className="modern-product-badges">
                    {isOutOfStock ? (
                        <span className="stock-badge out">
                            ⛔ TÜKENDİ
                        </span>
                    ) : isInstant ? (
                        <span className="stock-badge instant" title="Doğrudan tezgahtan teslim edilir">
                            ⚡ Tezgahtan
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="modern-product-footer">
                <div className="modern-price-wrap">
                    <span className="modern-product-price">{formatMoney(product.price)}</span>
                </div>
                {!isOutOfStock && (
                    <div 
                        className={`modern-add-circle ${inCartCount > 0 ? 'in-cart' : ''}`} 
                        title="Adisyona Ekle (+1)"
                    >
                        <Plus size={15} strokeWidth={2.6} />
                    </div>
                )}
            </div>
        </div>
    );
});
