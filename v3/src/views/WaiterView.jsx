import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../data/menu';
import { recordCompletedOrder } from '../services/analyticsService';
import { printCustomerReceipt, printKitchenOrderTicket } from '../services/printService';
import { playChimeSound, playDeliveryAlertSound } from '../services/audioService';
import { db, doc, deleteDoc, updateDoc, setDoc } from '../config/firebase';
import { 
    Search, 
    X, 
    CheckCircle2, 
    Clock, 
    Printer,
    MoveHorizontal,
    Scissors,
    Minus,
    Plus,
    Trash2,
    MessageSquare,
    Banknote,
    CreditCard,
    Receipt,
    Tag
} from 'lucide-react';
import TableCardGrid from '../components/TableCardGrid';
import DiscountModal from '../components/DiscountModal';

export default function WaiterView() {
    const { tables, activeOrders, navigateTo, currentUser, showToast, closeTableOrder, printerSettings } = useApp();
    const [filter, setFilter] = useState('all'); // 'all' | 'occupied' | 'empty'
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTableForReceipt, setSelectedTableForReceipt] = useState(null);

    // Masa Taşı & Birleştir Modalı
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveSourceTable, setMoveSourceTable] = useState(null);
    const [moveTargetTable, setMoveTargetTable] = useState('');

    // Parçalı Hesap Bölme Modalı
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitTable, setSplitTable] = useState(null);
    const [splitSelections, setSplitSelections] = useState({});
    const [splitPayMethod, setSplitPayMethod] = useState('cash');

    // Not Düzenleme Modalı
    const [noteModalItemIdx, setNoteModalItemIdx] = useState(null);
    const [itemNoteInput, setItemNoteInput] = useState('');

    // İndirim Modalı (Çekmece için)
    const [showDrawerDiscountModal, setShowDrawerDiscountModal] = useState(false);



    // ESC Tuşu ile çekmeceyi ve modalları kapatma
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedTableForReceipt(null);
                setShowMoveModal(false);
                setShowSplitModal(false);
                setNoteModalItemIdx(null);
                setShowDrawerDiscountModal(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const getTableOrder = (tableNo) => {
        return activeOrders[String(tableNo)] || null;
    };

    const filteredTables = tables.filter(t => {
        const order = getTableOrder(t.table_no);
        const isOccupied = !!order;

        if (filter === 'occupied' && !isOccupied) return false;
        if (filter === 'empty' && isOccupied) return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return `masa ${t.table_no}`.includes(q) || String(t.table_no).includes(q);
        }
        return true;
    });

    const occupiedCount = tables.filter(t => !!getTableOrder(t.table_no)).length;
    const emptyCount = tables.length - occupiedCount;
    const totalActiveRevenue = Object.values(activeOrders).reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);

    // Modal Receipt Order
    const receiptOrder = selectedTableForReceipt ? getTableOrder(selectedTableForReceipt) : null;

    // Tek bir ürünün teslim durumunu değiştirme
    const handleToggleDrawerItemStatus = async (itemIndex) => {
        if (!receiptOrder || !receiptOrder.items) return;
        const updatedItems = [...receiptOrder.items];
        const currentStatus = updatedItems[itemIndex].status;
        const nextStatus = currentStatus === 'delivered' ? 'cooking' : 'delivered';
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], status: nextStatus };

        try {
            await updateDoc(doc(db, "orders", `table_${selectedTableForReceipt}`), {
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

    // Tüm hazırlanmakta olan ürünleri teslim edildi yapma
    const handleDeliverAllDrawerItems = async () => {
        if (!receiptOrder || !receiptOrder.items) return;
        const updatedItems = receiptOrder.items.map(i => ({ ...i, status: 'delivered' }));
        try {
            await updateDoc(doc(db, "orders", `table_${selectedTableForReceipt}`), {
                items: updatedItems
            });
            playDeliveryAlertSound();
            showToast("Tüm ürünler teslim edildi olarak işaretlendi!", "success");
        } catch (e) {
            console.error(e);
            showToast("Hata oluştu.", "danger");
        }
    };

    // Adet artırma / azaltma / silme
    const handleUpdateDrawerQuantity = async (index, delta) => {
        if (!receiptOrder || !receiptOrder.items) return;
        const updated = [...receiptOrder.items];
        const currentQty = Number(updated[index].quantity) || 1;
        const newQty = currentQty + delta;

        if (newQty <= 0) {
            updated.splice(index, 1);
        } else {
            updated[index] = { ...updated[index], quantity: newQty };
        }

        if (updated.length === 0) {
            setSelectedTableForReceipt(null);
            showToast(`Masa ${selectedTableForReceipt} tüm ürünler silindiği için kapatıldı.`, "info");
            try {
                await closeTableOrder(selectedTableForReceipt, receiptOrder?.id);
            } catch (e) {
                console.error(e);
            }
            return;
        }

        const newTotal = updated.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
        try {
            await updateDoc(doc(db, "orders", `table_${selectedTableForReceipt}`), {
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

    // Not kaydetme
    const handleSaveDrawerNote = async () => {
        if (noteModalItemIdx === null || !receiptOrder || !receiptOrder.items) return;
        const updated = [...receiptOrder.items];
        if (updated[noteModalItemIdx]) {
            updated[noteModalItemIdx] = { ...updated[noteModalItemIdx], notes: itemNoteInput.trim() };
            const newTotal = updated.reduce((s, i) => s + (Number(i.price) * Number(i.quantity || 1)), 0);
            try {
                await updateDoc(doc(db, "orders", `table_${selectedTableForReceipt}`), {
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

    // Çekmeceden İndirim Uygula / Kaldır Handlers
    const handleApplyDrawerDiscount = async (discAmount, reason) => {
        if (!selectedTableForReceipt || !receiptOrder) return;
        const subtotal = Number(receiptOrder.subtotal || receiptOrder.total || 0);
        const finalD = Math.min(subtotal, Math.max(0, discAmount));
        const finalT = Math.max(0, subtotal - finalD);

        try {
            await updateDoc(doc(db, "orders", `table_${selectedTableForReceipt}`), {
                discount: finalD,
                discount_reason: reason || '',
                total: finalT,
                updated_at: new Date().toISOString()
            });
            showToast(`Masa ${selectedTableForReceipt} için ${formatMoney(finalD)} indirim uygulandı.`, 'success');
        } catch (e) {
            console.error("Discount apply error:", e);
            showToast("İndirim kaydedilirken hata oluştu.", "danger");
        }
    };

    const handleRemoveDrawerDiscount = async () => {
        if (!selectedTableForReceipt || !receiptOrder) return;
        const subtotal = Number(receiptOrder.subtotal || receiptOrder.total || 0);

        try {
            await updateDoc(doc(db, "orders", `table_${selectedTableForReceipt}`), {
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

    // Çekmeceden direkt kasa tahsilatı ve kapatma
    const handleFastCheckout = async (method) => {
        if (!selectedTableForReceipt || !receiptOrder) return;
        const tNo = selectedTableForReceipt;
        const subtotal = Number(receiptOrder.subtotal || receiptOrder.total || 0);
        const discount = Number(receiptOrder.discount || 0);
        const orderToClose = {
            ...receiptOrder,
            subtotal: subtotal,
            discount: discount,
            discount_reason: receiptOrder.discount_reason || (discount > 0 ? 'İndirim/İkram' : ''),
            total: Number(receiptOrder.total !== undefined ? receiptOrder.total : Math.max(0, subtotal - discount))
        };
        const orderDocId = orderToClose.id || orderToClose.firestore_id;

        // 1. Çekmeceyi ANINDA kapat (Kullanıcı sıfırlanma/bekleme görmez, anında pürüzsüz kapanır)
        setSelectedTableForReceipt(null);

        // 2. Bildirim ve ses eş zamanlı (0 ms) olarak anında çalar ve görünür
        playChimeSound();
        showToast(`Masa ${tNo} hesabı (${formatMoney(orderToClose.total)}) başarıyla kapatıldı!`, "success");

        try {
            await recordCompletedOrder(orderToClose, method);
            await closeTableOrder(tNo, orderDocId);
        } catch (e) {
            console.error("Fast checkout error:", e);
            showToast("Ödeme kaydedilirken hata oluştu.", "danger");
        }
    };

    // Çekmeceden müşteri fişi yazdır (masa açık kalır)
    const handlePrintDrawerCustomerBill = () => {
        if (!receiptOrder) return;
        const subtotal = Number(receiptOrder.subtotal || receiptOrder.total || 0);
        const discount = Number(receiptOrder.discount || 0);
        printCustomerReceipt({
            ...receiptOrder,
            subtotal,
            discount,
            discount_reason: receiptOrder.discount_reason || '',
            total: Number(receiptOrder.total !== undefined ? receiptOrder.total : Math.max(0, subtotal - discount))
        }, "Masa Adisyon Fişi", printerSettings);
        showToast(`Masa ${selectedTableForReceipt} adisyon fişi yazdırılıyor.`, "info");
    };

    // Çekmeceden mutfak fişi yazdır (tatlı, içecekler ve teslim edilenler hariç)
    const handlePrintDrawerKitchenTicket = () => {
        if (!receiptOrder) return;
        const res = printKitchenOrderTicket(receiptOrder, printerSettings);
        if (res && res.ok === false) {
            showToast(res.message || 'Mutfak için yeni hazırlanacak ürün yok.', 'warning');
        } else {
            showToast(`Mutfak fişi yazdırılıyor (${res?.count || 1} yeni ürün).`, 'success');
        }
    };

    // Masa Taşıma & Birleştirme
    const handleMoveOrMergeTable = async () => {
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
                const movedPayload = {
                    ...sourceOrder,
                    table_no: targetNo,
                    updated_at: new Date().toISOString()
                };
                await setDoc(targetRef, movedPayload);
                await deleteDoc(sourceRef);
                showToast(`Masa ${sourceNo}, boş Masa ${targetNo}'e taşındı.`, 'success');
            } else {
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
            if (selectedTableForReceipt === sourceNo) {
                setSelectedTableForReceipt(targetNo);
            }
        } catch (e) {
            console.error("Move error:", e);
            showToast('Masa taşınırken hata oluştu.', 'danger');
        }
    };

    // Parçalı / Kısmi Hesap Bölme İşlemi
    const handleSplitPayment = async () => {
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

            const remQty = fullQty - payQty;
            if (remQty > 0) {
                remainingItems.push({ ...item, quantity: remQty });
            }
        });

        if (payingItems.length === 0 || payingSubtotal <= 0) {
            showToast('Lütfen ödenecek en az bir ürün seçiniz.', 'warning');
            return;
        }

        try {
            const partialOrderRecord = {
                ...currentOrder,
                items: payingItems,
                items_count: payingItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                subtotal: payingSubtotal,
                total: payingSubtotal,
                is_partial: true,
                created_at: new Date().toISOString()
            };

            if (remainingItems.length === 0) {
                setShowSplitModal(false);
                setSplitTable(null);
                setSplitSelections({});
                if (selectedTableForReceipt === splitTable) setSelectedTableForReceipt(null);
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

    return (
        <div className="waiter-page-container">

            {/* Ortak ve Canlı Masa Grid Bileşeni */}
            <TableCardGrid
                onSelectTableForReceipt={setSelectedTableForReceipt}
                onOpenTableOrder={(tableNum) => navigateTo('table', tableNum)}
                showControls={true}
            />

            {/* ============================================================== */}
            {/* GARSON CANLI ADİSYON ÇEKMECESİ (YÖNETİCİ PANELİ İLE 1-E-1 AYNI)*/}
            {/* ============================================================== */}
            {selectedTableForReceipt !== null && (
                <>
                    <div 
                        className="admin-receipt-backdrop" 
                        onClick={() => setSelectedTableForReceipt(null)} 
                    />
                    <aside className="admin-receipt-drawer">
                        {/* Mobil için sürükleme/kapatma çizgisi */}
                        <div className="admin-drawer-drag-pill" onClick={() => setSelectedTableForReceipt(null)} />

                        {/* Drawer Başlığı */}
                        <div className="receipt-header" style={{ padding: '16px 20px', flexDirection: 'column', alignItems: 'stretch', gap: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--brand-gold)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                        CANLI ADİSYON
                                    </div>
                                    <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.3px', margin: 0, color: 'white' }}>
                                        Masa {selectedTableForReceipt}
                                    </h2>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <button 
                                        className="btn-outline"
                                        onClick={() => { setMoveSourceTable(selectedTableForReceipt); setMoveTargetTable(''); setShowMoveModal(true); }}
                                        style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <MoveHorizontal size={13} /> Taşı
                                    </button>
                                    <button 
                                        className="btn-outline"
                                        onClick={() => { setSplitTable(selectedTableForReceipt); setSplitSelections({}); setSplitPayMethod('cash'); setShowSplitModal(true); }}
                                        style={{ fontSize: '12px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    >
                                        <Scissors size={13} /> Böl
                                    </button>
                                    <button 
                                        className="admin-drawer-close-btn"
                                        onClick={() => setSelectedTableForReceipt(null)}
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
                                    {receiptOrder?.waiter_name || currentUser?.name || 'Garson'}
                                </div>
                            </div>
                        </div>

                        {/* Drawer İçeriği & Ürün Listesi */}
                        <div className="receipt-items-list" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                            {(!receiptOrder || !receiptOrder.items || receiptOrder.items.length === 0) ? (
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
                                        onClick={() => {
                                            const tNo = selectedTableForReceipt;
                                            setSelectedTableForReceipt(null);
                                            navigateTo('table', tNo);
                                        }}
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
                                                <Clock size={13} /> {receiptOrder.items.filter(i => i.status !== 'delivered').length} Hazırlanıyor
                                            </span>
                                            <span style={{ color: 'var(--text-muted)' }}>•</span>
                                            <span style={{ color: 'var(--success)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <CheckCircle2 size={13} /> {receiptOrder.items.filter(i => i.status === 'delivered').length} Teslim
                                            </span>
                                        </div>
                                        {receiptOrder.items.some(i => i.status !== 'delivered') && (
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
                                    {receiptOrder.items.some(i => i.status !== 'delivered') && (
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
                                                <Clock size={12} /> 🟡 Hazırlanıyor / Mutfakta ({receiptOrder.items.filter(i => i.status !== 'delivered').length})
                                            </div>
                                            {receiptOrder.items.map((item, idx) => {
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

                                                            {/* Teslimat Butonu (Mutfakta / Teslim Edildi) */}
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

                                                            {/* Adet Artır / Azalt / Sil Stepper */}
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
                                    {receiptOrder.items.some(i => i.status === 'delivered') && (
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
                                                <CheckCircle2 size={12} /> 🟢 Teslim Edildi / Masada ({receiptOrder.items.filter(i => i.status === 'delivered').length})
                                            </div>
                                            {receiptOrder.items.map((item, idx) => {
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

                        {/* Footer & Checkout Buttons */}
                        {receiptOrder && (
                            <div className="receipt-footer">
                                {Number(receiptOrder.discount) > 0 ? (
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
                                                {formatMoney(receiptOrder.subtotal || receiptOrder.total)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '12.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700 }}>
                                                🏷️ İndirim / İkram
                                            </span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 800 }}>
                                                    -{formatMoney(receiptOrder.discount)}
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
                                                {formatMoney(receiptOrder.total)}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="total-summary">
                                        <span style={{ fontSize: '15px', color: 'var(--text-secondary)' }}>Genel Tutar</span>
                                        <span style={{ color: 'var(--brand-gold)', fontSize: '24px', fontWeight: 800 }}>
                                            {formatMoney(receiptOrder.total)}
                                        </span>
                                    </div>
                                )}

                                {/* 🏷️ İndirim / İkram Belirle Butonu */}
                                <button
                                    onClick={() => setShowDrawerDiscountModal(true)}
                                    disabled={!receiptOrder.items || receiptOrder.items.length === 0}
                                    style={{
                                        width: '100%',
                                        minHeight: '48px',
                                        padding: '12px 14px',
                                        marginBottom: '10px',
                                        background: Number(receiptOrder.discount) > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.08)',
                                        border: `1px dashed ${Number(receiptOrder.discount) > 0 ? '#10b981' : 'rgba(245, 158, 11, 0.4)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        color: Number(receiptOrder.discount) > 0 ? '#10b981' : 'var(--brand-gold)',
                                        fontSize: '14px',
                                        fontWeight: 700,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        cursor: (!receiptOrder.items || receiptOrder.items.length === 0) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    <Tag size={16} />
                                    {Number(receiptOrder.discount) > 0 ? `İndirimi Düzenle (${formatMoney(receiptOrder.discount)} indirimli)` : 'İndirim / İkram Belirle'}
                                </button>

                                {/* Sipariş Ekle & Mutfağa Fiş Yazdır Butonları */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                                    <button
                                        onClick={() => {
                                            const tNo = selectedTableForReceipt;
                                            setSelectedTableForReceipt(null);
                                            navigateTo('table', tNo);
                                        }}
                                        className="btn-outline"
                                        style={{
                                            width: '100%',
                                            minHeight: '48px',
                                            padding: '12px 14px',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
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
                                            minHeight: '48px',
                                            padding: '12px 14px',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px'
                                        }}
                                    >
                                        <Printer size={17} /> Mutfağa Fiş Gönder
                                    </button>
                                </div>

                                {/* 3 Checkout Butonu (Nakit, Kart, Masa Hesap Fişi) */}
                                <div className="checkout-actions-3col">
                                    <button
                                        onClick={() => handleFastCheckout('cash')}
                                        disabled={!receiptOrder.items || receiptOrder.items.length === 0}
                                        className="btn-checkout-action btn-checkout-cash"
                                    >
                                        <Banknote size={18} />
                                        Nakit Kapat
                                    </button>

                                    <button
                                        onClick={() => handleFastCheckout('card')}
                                        disabled={!receiptOrder.items || receiptOrder.items.length === 0}
                                        className="btn-checkout-action btn-checkout-card"
                                    >
                                        <CreditCard size={18} />
                                        Kart Kapat
                                    </button>

                                    <button
                                        onClick={handlePrintDrawerCustomerBill}
                                        disabled={!receiptOrder.items || receiptOrder.items.length === 0}
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
            {/* MODAL: MASA TAŞI / BİRLEŞTİR                                  */}
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
                                onClick={handleMoveOrMergeTable}
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
            {/* MODAL: PARÇALI / KISMİ HESAP BÖL                               */}
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

                        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '12px' }}>
                            Şu anda ödenecek ürün ve adetleri seçiniz. Kalan ürünler masada açık kalacaktır.
                        </p>

                        {(() => {
                            const currentOrd = activeOrders[String(splitTable)];
                            const items = currentOrd?.items || [];
                            let payingTotal = 0;
                            items.forEach((item, idx) => {
                                const q = Number(splitSelections[idx]) || 0;
                                payingTotal += Number(item.price) * q;
                            });

                            return (
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                    <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '14px', border: '1px solid var(--border-card)', borderRadius: 'var(--radius-sm)', padding: '6px' }}>
                                        {items.map((item, idx) => {
                                            const totalQty = Number(item.quantity) || 1;
                                            const currentSelected = Number(splitSelections[idx]) || 0;

                                            return (
                                                <div 
                                                    key={idx}
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 10px',
                                                        borderBottom: idx === items.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                                        background: currentSelected > 0 ? 'rgba(16, 185, 129, 0.08)' : 'transparent'
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '13px', color: 'white' }}>{item.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatMoney(item.price)} (Mevcut: {totalQty} Adet)</div>
                                                    </div>

                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <button
                                                            onClick={() => setSplitSelections(prev => ({ ...prev, [idx]: Math.max(0, (Number(prev[idx]) || 0) - 1) }))}
                                                            className="btn-outline"
                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            -
                                                        </button>
                                                        <span style={{ fontWeight: 800, fontSize: '13px', color: currentSelected > 0 ? 'var(--success)' : 'white', minWidth: '20px', textAlign: 'center' }}>
                                                            {currentSelected}
                                                        </span>
                                                        <button
                                                            onClick={() => setSplitSelections(prev => ({ ...prev, [idx]: Math.min(totalQty, (Number(prev[idx]) || 0) + 1) }))}
                                                            className="btn-outline"
                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                            +
                                                        </button>
                                                        <button
                                                            onClick={() => setSplitSelections(prev => ({ ...prev, [idx]: totalQty }))}
                                                            className="btn-outline"
                                                            style={{ fontSize: '10px', padding: '2px 5px', color: 'var(--brand-gold)' }}
                                                            title="Tümünü Seç"
                                                        >
                                                            Tümü
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Tahsil Edilecek Tutar */}
                                    <div style={{
                                        padding: '10px 14px',
                                        background: 'var(--bg-surface-elevated)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--border-card)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '14px'
                                    }}>
                                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ödenecek Tutar:</span>
                                        <span style={{ fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{formatMoney(payingTotal)}</span>
                                    </div>

                                    {/* Ödeme Yöntemi Seçimi */}
                                    <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
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
                                            onClick={handleSplitPayment}
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
            {/* MODAL: SİPARİŞ NOTU DÜZENLEME                                  */}
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
                            Ürün: <strong style={{ color: 'white' }}>{receiptOrder?.items?.[noteModalItemIdx]?.name}</strong>
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

            {/* MODAL: DISCOUNT MODAL (DRAWER) */}
            {selectedTableForReceipt && receiptOrder && (
                <DiscountModal
                    isOpen={showDrawerDiscountModal}
                    onClose={() => setShowDrawerDiscountModal(false)}
                    tableNo={selectedTableForReceipt}
                    subtotal={Number(receiptOrder.subtotal || receiptOrder.total || 0)}
                    currentDiscount={Number(receiptOrder.discount || 0)}
                    items={receiptOrder.items || []}
                    onApply={handleApplyDrawerDiscount}
                    onRemove={handleRemoveDrawerDiscount}
                />
            )}
        </div>
    );
}
