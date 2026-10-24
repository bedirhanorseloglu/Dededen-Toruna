import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../data/menu';
import { recordCompletedOrder } from '../services/analyticsService';
import { printCustomerReceipt, printKitchenOrderTicket } from '../services/printService';
import { playChimeSound, playDeliveryAlertSound, playNotificationSound } from '../services/audioService';
import { db, doc, deleteDoc, updateDoc, setDoc } from '../config/firebase';
import { 
    Search, 
    X, 
    CheckCircle2, 
    Check,
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
    Tag,
    Zap,
    Flame,
    ArrowUpRight,
    Utensils
} from 'lucide-react';
import TableCardGrid from '../components/TableCardGrid';
import DiscountModal from '../components/DiscountModal';
import QuickAmountModal from '../components/QuickAmountModal';
import MoveTableModal from '../components/MoveTableModal';
import SplitPaymentModal from '../components/SplitPaymentModal';
import LiveOrderDrawer from '../components/LiveOrderDrawer';

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

    // ⚡ Hızlı Tutar ile Kapat Modalı (Kurtarıcı Emniyet Sübabı)
    const [showQuickAmountModal, setShowQuickAmountModal] = useState(false);

    // ESC Tuşu ile çekmeceyi ve modalları kapatma
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setSelectedTableForReceipt(null);
                setShowMoveModal(false);
                setShowSplitModal(false);
                setNoteModalItemIdx(null);
                setShowDrawerDiscountModal(false);
                setShowQuickAmountModal(false);
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

    // ⚡ Hızlı Tutar ile Kapat (Serbest Hesap / Kurtarıcı Emniyet Sübabı)
    const handleQuickAmountCheckout = async ({ amount, paymentMethod, note, shouldPrint }) => {
        if (!selectedTableForReceipt) return;
        const tNo = selectedTableForReceipt;
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        const currentOrder = activeOrders[String(tNo)] || null;
        const orderDocId = currentOrder?.id || currentOrder?.firestore_id || null;

        const orderToClose = {
            ...(currentOrder || {}),
            table_no: Number(tNo),
            waiter_id: currentOrder?.waiter_id || currentUser?.id || 'w-1',
            waiter_name: currentOrder?.waiter_name || currentUser?.name || 'Kasa / Garson',
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
        setSelectedTableForReceipt(null);

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
        showToast(`Masa ${tNo} hızlı tutarla (${formatMoney(numAmount)}) başarıyla kapatıldı!`, "success");

        // 4. Firestore kaydı ve masayı temizleme
        try {
            await recordCompletedOrder(orderToClose, paymentMethod);
            await closeTableOrder(tNo, orderDocId);
        } catch (e) {
            console.error("Quick amount checkout error:", e);
            showToast("Hızlı hesap kapatılırken hata oluştu.", "danger");
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

    // Çekmeceden bekleyen sıcak mutfak ürünlerini mutfağa gönder
    const handleSendDrawerToKitchen = async () => {
        if (!receiptOrder || !selectedTableForReceipt) return;
        const items = receiptOrder.items || [];
        const unsent = items.filter(i => i.status === 'cooking' && i.kitchen_sent === false);
        if (unsent.length === 0) {
            showToast('Mutfağa iletilecek yeni sipariş bulunmuyor.', 'info');
            return;
        }

        const now = new Date().toISOString();
        const updated = items.map(item => {
            if (item.status === 'cooking' && item.kitchen_sent === false) {
                return {
                    ...item,
                    kitchen_sent: true,
                    kitchen_sent_at: now
                };
            }
            return item;
        });

        const docId = receiptOrder.id || `table_${selectedTableForReceipt}`;
        try {
            await updateDoc(doc(db, "orders", docId), {
                items: updated,
                kitchen_status: 'pending',
                all_delivered: false,
                updated_at: now
            });
            printKitchenOrderTicket({
                table_no: selectedTableForReceipt,
                waiter_name: receiptOrder?.waiter_name || currentUser?.name || 'Garson',
                items: updated
            }, printerSettings);
            playNotificationSound();
            showToast(`🍳 ${unsent.length} yeni ürün mutfağa iletildi!`, 'success');
            // Otomatik masalar ekranına dön (çekmeceyi kapat)
            setSelectedTableForReceipt(null);
        } catch (e) {
            console.error("Mutfak iletim hatası:", e);
            showToast('Mutfağa iletilirken hata oluştu.', 'danger');
        }
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

            const remQty = fullQty - payQty;
            if (remQty > 0) {
                remainingItems.push({ ...item, quantity: remQty });
            }
        });

        if (payingItems.length === 0 || payingSubtotal <= 0) {
            showToast('Lütfen ödenecek en az bir ürün seçiniz.', 'warning');
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
                ...currentOrder,
                items: payingItems,
                items_count: payingItems.reduce((s, i) => s + (Number(i.quantity) || 1), 0),
                subtotal: payingSubtotal,
                discount: payingDiscount,
                discount_reason: currentOrder.discount_reason || '',
                total: payingTotal,
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
                showToast(`${formatMoney(payingTotal)} parçalı tahsil edildi. Kalan tutar masada açık.`, 'success');

                await recordCompletedOrder(partialOrderRecord, splitPayMethod);
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


    return (
        <div className="waiter-page-container">

            {/* Ortak ve Canlı Masa Grid Bileşeni */}
            <TableCardGrid
                onSelectTableForReceipt={setSelectedTableForReceipt}
                onOpenTableOrder={(tableNum) => navigateTo('table', tableNum)}
                showControls={true}
            />

            {/* ============================================================== */}
            {/* CANLI ADİSYON ÇEKMECESİ (ORTAK MODÜL - REFERANS 1)            */}
            {/* ============================================================== */}
            <LiveOrderDrawer
                isOpen={selectedTableForReceipt !== null}
                mode="drawer"
                tableNo={selectedTableForReceipt}
                order={receiptOrder}
                currentUser={currentUser}
                isTableDetail={false}
                unsentKitchenCount={(receiptOrder?.items || []).filter(i => i.status === 'cooking' && i.kitchen_sent === false).length}
                onSendToKitchen={handleSendDrawerToKitchen}
                onClose={() => setSelectedTableForReceipt(null)}
                onMove={() => {
                    setMoveSourceTable(selectedTableForReceipt);
                    setMoveTargetTable('');
                    setShowMoveModal(true);
                }}
                onSplit={() => {
                    setSplitTable(selectedTableForReceipt);
                    setSplitSelections({});
                    setSplitPayMethod('cash');
                    setShowSplitModal(true);
                }}
                onToggleItemStatus={handleToggleDrawerItemStatus}
                onDeliverAll={handleDeliverAllDrawerItems}
                onUpdateQuantity={handleUpdateDrawerQuantity}
                onAddNote={(idx) => {
                    setNoteModalItemIdx(idx);
                    setItemNoteInput(receiptOrder?.items?.[idx]?.notes || '');
                }}
                onNavigateToTable={(tNo) => {
                    setSelectedTableForReceipt(null);
                    navigateTo('table', tNo);
                }}
                onQuickAmount={() => setShowQuickAmountModal(true)}
                onOpenDiscount={() => setShowDrawerDiscountModal(true)}
                onRemoveDiscount={handleRemoveDrawerDiscount}
                onPrintKitchen={handlePrintDrawerKitchenTicket}
                onPrintCustomerBill={handlePrintDrawerCustomerBill}
                onCheckout={handleFastCheckout}
            />

            {/* ============================================================== */}
            {/* MODAL: MASA TAŞI / BİRLEŞTİR                                  */}
            {/* ============================================================== */}
            <MoveTableModal
                isOpen={showMoveModal}
                sourceTable={moveSourceTable}
                selectedTargetTable={moveTargetTable}
                onSelectTargetTable={setMoveTargetTable}
                onConfirm={handleMoveOrMergeTable}
                onClose={() => {
                    setShowMoveModal(false);
                    setMoveTargetTable('');
                }}
                tables={tables}
                activeOrders={activeOrders}
            />

            {/* ============================================================== */}
            {/* MODAL: PARÇALI / KISMİ HESAP BÖL                               */}
            {/* ============================================================== */}
            <SplitPaymentModal
                isOpen={showSplitModal && !!splitTable && !!activeOrders[String(splitTable)]}
                tableNo={splitTable}
                order={activeOrders[String(splitTable)]}
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

            {/* ============================================================== */}
            {/* MODAL: SİPARİŞ NOTU DÜZENLEME                                  */}
            {/* ============================================================== */}
            {noteModalItemIdx !== null && (
                <div className="modal-overlay open" style={{ display: 'flex', opacity: 1, zIndex: 999999 }}>
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

            {/* MODAL: ⚡ HIZLI TUTAR İLE KAPATMA (KURTARICI EMNİYET SÜBABI) */}
            {selectedTableForReceipt && (
                <QuickAmountModal
                    isOpen={showQuickAmountModal}
                    onClose={() => setShowQuickAmountModal(false)}
                    tableNo={selectedTableForReceipt}
                    existingOrder={receiptOrder}
                    currentUser={currentUser}
                    onConfirm={handleQuickAmountCheckout}
                    printerSettings={printerSettings}
                />
            )}
        </div>
    );
}
