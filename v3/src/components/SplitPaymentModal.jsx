import React, { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scissors,
    X,
    Utensils,
    Plus,
    Minus,
    Banknote,
    CreditCard,
    CheckCircle2,
    RotateCcw,
    Check,
    Receipt,
    Tag
} from 'lucide-react';
import { formatMoney } from '../data/menu';

export default function SplitPaymentModal({
    isOpen,
    tableNo,
    order,
    splitSelections = {},
    setSplitSelections,
    splitPayMethod = 'cash',
    setSplitPayMethod,
    onConfirm,
    onClose
}) {
    // ESC key close
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const items = order?.items || [];
    const rawDiscount = Number(order?.discount) || 0;
    const discountReason = order?.discount_reason || '';

    // Calculate total order amount, discount, paying amount & remaining balance
    const { 
        orderSubtotal,
        orderDiscount,
        orderNetTotal,
        payingSubtotal,
        payingDiscount,
        payingTotal,
        remainingSubtotal,
        remainingDiscount,
        remainingTotal,
        payingItemCount,
        totalItemCount,
        isAllSelected
    } = useMemo(() => {
        let pSubtotal = 0;
        let oSubtotal = 0;
        let pCount = 0;
        let tCount = 0;

        items.forEach((item, idx) => {
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            const selQty = Number(splitSelections[idx]) || 0;

            oSubtotal += price * qty;
            tCount += qty;

            pSubtotal += price * selQty;
            pCount += selQty;
        });

        const oDiscount = Math.min(oSubtotal, Math.max(0, rawDiscount));
        const oNetTotal = Math.max(0, oSubtotal - oDiscount);

        const allSel = tCount > 0 && pCount === tCount;

        let pDiscount = 0;
        if (oDiscount > 0 && oSubtotal > 0 && pSubtotal > 0) {
            if (allSel) {
                pDiscount = oDiscount;
            } else {
                const ratio = pSubtotal / oSubtotal;
                pDiscount = Math.round(oDiscount * ratio * 100) / 100;
            }
        }

        const pTotal = Math.max(0, pSubtotal - pDiscount);
        const remSubtotal = Math.max(0, oSubtotal - pSubtotal);
        const remDiscount = Math.max(0, oDiscount - pDiscount);
        const remTotal = Math.max(0, remSubtotal - remDiscount);

        return {
            orderSubtotal: oSubtotal,
            orderDiscount: oDiscount,
            orderNetTotal: oNetTotal,
            payingSubtotal: pSubtotal,
            payingDiscount: pDiscount,
            payingTotal: pTotal,
            remainingSubtotal: remSubtotal,
            remainingDiscount: remDiscount,
            remainingTotal: remTotal,
            payingItemCount: pCount,
            totalItemCount: tCount,
            isAllSelected: allSel
        };
    }, [items, splitSelections, rawDiscount]);

    const handleSelectAll = () => {
        const newSel = {};
        items.forEach((item, idx) => {
            newSel[idx] = Number(item.quantity) || 1;
        });
        setSplitSelections(newSel);
    };

    const handleResetAll = () => {
        setSplitSelections({});
    };

    const handleStep = (idx, delta, maxQty) => {
        setSplitSelections(prev => {
            const current = Number(prev[idx]) || 0;
            const next = Math.max(0, Math.min(maxQty, current + delta));
            if (next === 0) {
                const copy = { ...prev };
                delete copy[idx];
                return copy;
            }
            return { ...prev, [idx]: next };
        });
    };

    const handleToggleItemAll = (idx, maxQty) => {
        setSplitSelections(prev => {
            const current = Number(prev[idx]) || 0;
            if (current === maxQty) {
                const copy = { ...prev };
                delete copy[idx];
                return copy;
            }
            return { ...prev, [idx]: maxQty };
        });
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div
                className="split-payment-overlay"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box'
                }}
            >
                {/* 21st Frosted Backdrop */}
                <motion.div
                    className="split-payment-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(17, 13, 12, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)'
                    }}
                />

                {/* 21st / Linear Glass Dialog */}
                <motion.div
                    className="split-payment-dialog"
                    initial={{ opacity: 0, scale: 0.94, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.94, y: 16 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '470px',
                        background: 'linear-gradient(165deg, rgba(32, 24, 22, 0.98) 0%, rgba(18, 14, 13, 0.99) 100%)',
                        border: '1px solid rgba(245, 159, 0, 0.16)',
                        borderRadius: '24px',
                        padding: '22px',
                        boxShadow: '0 32px 72px -16px rgba(0, 0, 0, 0.8), 0 0 35px rgba(247, 103, 7, 0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxSizing: 'border-box',
                        maxHeight: '92vh',
                        maxHeight: '92dvh'
                    }}
                >
                    {/* Top Ambient Glow Line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '12%',
                            right: '12%',
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.75), transparent)',
                            opacity: 0.9
                        }}
                    />

                    {/* Header: Badge, Title & Close Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '3px 10px',
                                    borderRadius: '999px',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.28)',
                                    color: '#fbbf24',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                    marginBottom: '6px'
                                }}
                            >
                                <Scissors size={12} />
                                <span>PARÇALI / KISMİ ÖDEME</span>
                            </div>
                            <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
                                Masa {tableNo} • Hesap Bölme
                            </h2>
                            {orderDiscount > 0 && (
                                <div style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    padding: '3px 9px',
                                    borderRadius: '8px',
                                    background: 'rgba(239, 68, 68, 0.16)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#f87171',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    marginTop: '4px'
                                }}>
                                    <Tag size={11} />
                                    <span>{formatMoney(orderDiscount)} İndirim Uygulandı {discountReason ? `(${discountReason})` : ''}</span>
                                </div>
                            )}
                            <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '12px', margin: '4px 0 0 0' }}>
                                Aşağıdan şu an tahsil edilecek ürün adetlerini seçin:
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ rotate: 90, scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={onClose}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: 'rgba(255, 255, 255, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            <X size={16} />
                        </motion.button>
                    </div>

                    {/* Quick Selection Toolbar */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2px 2px' }}>
                        <span style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 600 }}>
                            {items.length} Çeşit Ürün • {payingItemCount}/{totalItemCount} Adet Seçili
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {payingItemCount > 0 && (
                                <motion.button
                                    whileTap={{ scale: 0.94 }}
                                    onClick={handleResetAll}
                                    style={{
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.65)',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        padding: '3px 8px',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <RotateCcw size={11} />
                                    <span>Temizle</span>
                                </motion.button>
                            )}
                            <motion.button
                                whileTap={{ scale: 0.94 }}
                                onClick={handleSelectAll}
                                style={{
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.25)',
                                    color: '#fbbf24',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 9px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                <Check size={11} />
                                <span>Tümünü Seç</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Scrollable Items List */}
                    <div
                        className="custom-scrollbar"
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '7px',
                            overflowY: 'auto',
                            maxHeight: 'min(38vh, 270px)',
                            paddingRight: '3px',
                            marginRight: '-3px'
                        }}
                    >
                        {items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 12px', color: 'rgba(255, 255, 255, 0.4)', fontSize: '13px' }}>
                                Bu masada kayıtlı ürün bulunamadı.
                            </div>
                        ) : (
                            items.map((item, idx) => {
                                const selQty = Number(splitSelections[idx]) || 0;
                                const maxQty = Number(item.quantity) || 1;
                                const isSelected = selQty > 0;
                                const isFullySelected = selQty === maxQty;

                                return (
                                    <motion.div
                                        key={idx}
                                        layout
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '10px 12px',
                                            borderRadius: '14px',
                                            background: isSelected
                                                ? 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(16, 185, 129, 0.04) 100%)'
                                                : 'rgba(255, 255, 255, 0.03)',
                                            border: isSelected
                                                ? '1px solid rgba(16, 185, 129, 0.4)'
                                                : '1px solid rgba(255, 255, 255, 0.07)',
                                            transition: 'border 0.2s, background 0.2s',
                                            gap: '10px'
                                        }}
                                    >
                                        {/* Product Details */}
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <div style={{
                                                fontSize: '13.5px',
                                                fontWeight: 700,
                                                color: '#FFFFFF',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {item.name}
                                            </div>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                marginTop: '3px',
                                                fontSize: '11.5px',
                                                flexWrap: 'nowrap'
                                            }}>
                                                <span style={{ fontWeight: 800, color: 'var(--brand-gold)', whiteSpace: 'nowrap' }}>
                                                    {formatMoney(item.price)}
                                                </span>
                                                <span style={{ color: 'rgba(255, 255, 255, 0.4)', whiteSpace: 'nowrap' }}>
                                                    • Mevcut: <strong style={{ color: 'rgba(255, 255, 255, 0.8)' }}>{maxQty}</strong>
                                                </span>
                                                {isSelected && (
                                                    <span style={{
                                                        padding: '1px 6px',
                                                        borderRadius: '6px',
                                                        background: 'rgba(16, 185, 129, 0.2)',
                                                        color: '#34d399',
                                                        fontSize: '10.5px',
                                                        fontWeight: 700,
                                                        whiteSpace: 'nowrap'
                                                    }}>
                                                        +{formatMoney(Number(item.price) * selQty)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stepper & Quick Action */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                            {/* Minus */}
                                            <motion.button
                                                type="button"
                                                whileTap={{ scale: 0.86 }}
                                                onClick={() => handleStep(idx, -1, maxQty)}
                                                disabled={selQty <= 0}
                                                style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '8px',
                                                    background: selQty > 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: selQty > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: selQty > 0 ? 'pointer' : 'default',
                                                    padding: 0
                                                }}
                                            >
                                                <Minus size={13} strokeWidth={2.5} />
                                            </motion.button>

                                            {/* Quantity display */}
                                            <span style={{
                                                minWidth: '22px',
                                                textAlign: 'center',
                                                fontWeight: 800,
                                                fontSize: '14px',
                                                color: selQty > 0 ? '#10b981' : 'rgba(255, 255, 255, 0.35)'
                                            }}>
                                                {selQty}
                                            </span>

                                            {/* Plus */}
                                            <motion.button
                                                type="button"
                                                whileTap={{ scale: 0.86 }}
                                                onClick={() => handleStep(idx, 1, maxQty)}
                                                disabled={selQty >= maxQty}
                                                style={{
                                                    width: '28px',
                                                    height: '28px',
                                                    borderRadius: '8px',
                                                    background: selQty < maxQty ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: selQty < maxQty ? '#FFFFFF' : 'rgba(255, 255, 255, 0.25)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: selQty < maxQty ? 'pointer' : 'default',
                                                    padding: 0
                                                }}
                                            >
                                                <Plus size={13} strokeWidth={2.5} />
                                            </motion.button>

                                            {/* "Tümü" quick pill */}
                                            <motion.button
                                                type="button"
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleToggleItemAll(idx, maxQty)}
                                                style={{
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    padding: '4px 8px',
                                                    borderRadius: '8px',
                                                    background: isFullySelected
                                                        ? 'rgba(16, 185, 129, 0.25)'
                                                        : 'rgba(245, 158, 11, 0.12)',
                                                    border: isFullySelected
                                                        ? '1px solid rgba(16, 185, 129, 0.5)'
                                                        : '1px solid rgba(245, 158, 11, 0.28)',
                                                    color: isFullySelected ? '#34d399' : '#fbbf24',
                                                    cursor: 'pointer',
                                                    whiteSpace: 'nowrap'
                                                }}
                                                title={isFullySelected ? "Seçimi Kaldır" : "Tamamını Seç"}
                                            >
                                                {isFullySelected ? 'Dolu' : 'Tümü'}
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                    </div>

                    {/* Summary Card (Tahsil Edilecek, İndirim & Kalan Tutar) */}
                    <div
                        style={{
                            background: 'linear-gradient(145deg, rgba(42, 32, 30, 0.85) 0%, rgba(26, 20, 19, 0.92) 100%)',
                            border: '1px solid rgba(245, 159, 0, 0.18)',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Receipt size={15} style={{ color: '#fbbf24' }} />
                                <span>Tahsil Edilecek Tutar:</span>
                            </span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                {payingDiscount > 0 && (
                                    <span style={{ textDecoration: 'line-through', color: 'rgba(255, 255, 255, 0.38)', fontSize: '13px', fontWeight: 600 }}>
                                        {formatMoney(payingSubtotal)}
                                    </span>
                                )}
                                <span style={{ fontSize: '20px', fontWeight: 900, color: payingTotal > 0 ? '#10b981' : '#fbbf24', letterSpacing: '-0.3px' }}>
                                    {formatMoney(payingTotal)}
                                </span>
                            </div>
                        </div>

                        {/* Masa İndirimi Bilgilendirme Çubuğu */}
                        {orderDiscount > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '6px 10px',
                                    borderRadius: '10px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.22)',
                                    fontSize: '11.5px'
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#fca5a5', fontWeight: 600 }}>
                                    <Tag size={12} />
                                    <span>Masa İndirimi {discountReason ? `(${discountReason})` : ''}:</span>
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ color: '#f87171', fontWeight: 800 }}>-{formatMoney(orderDiscount)}</span>
                                    {payingDiscount > 0 && !isAllSelected && (
                                        <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '10.5px' }}>
                                            (Bu parçaya: -{formatMoney(payingDiscount)})
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '6px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.45)'
                        }}>
                            <span>
                                Masa Toplamı: <strong style={{ color: 'rgba(255, 255, 255, 0.75)' }}>{formatMoney(orderNetTotal)}</strong>
                                {orderDiscount > 0 && (
                                    <span style={{ textDecoration: 'line-through', marginLeft: '5px', color: 'rgba(255, 255, 255, 0.35)' }}>
                                        {formatMoney(orderSubtotal)}
                                    </span>
                                )}
                            </span>
                            <span>Kalan Tutar: <strong style={{ color: remainingTotal > 0 ? '#f59e0b' : '#34d399' }}>{formatMoney(remainingTotal)}</strong></span>
                        </div>
                    </div>

                    {/* Payment Method Selector (21st-style Modern Segmented Switch) */}
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Ödeme Yöntemi
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            {/* Cash Option */}
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSplitPayMethod('cash')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '11px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: splitPayMethod === 'cash'
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'rgba(255, 255, 255, 0.04)',
                                    border: splitPayMethod === 'cash'
                                        ? '1px solid #10b981'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                    color: splitPayMethod === 'cash' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                                    boxShadow: splitPayMethod === 'cash'
                                        ? '0 6px 18px -4px rgba(16, 185, 129, 0.45)'
                                        : 'none',
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                <Banknote size={16} />
                                <span>Nakit Ödeme</span>
                            </motion.button>

                            {/* Card Option (Blue matching POS standard and checkout buttons) */}
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSplitPayMethod('card')}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    padding: '11px',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: splitPayMethod === 'card'
                                        ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                                        : 'rgba(255, 255, 255, 0.04)',
                                    border: splitPayMethod === 'card'
                                        ? '1px solid #3b82f6'
                                        : '1px solid rgba(255, 255, 255, 0.08)',
                                    color: splitPayMethod === 'card' ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                                    boxShadow: splitPayMethod === 'card'
                                        ? '0 6px 18px -4px rgba(37, 99, 235, 0.45)'
                                        : 'none',
                                    transition: 'all 0.18s ease'
                                }}
                            >
                                <CreditCard size={16} />
                                <span>Kredi Kartı</span>
                            </motion.button>
                        </div>
                    </div>

                    {/* Action Buttons: Cancel & Collect */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                        <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.75)',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            Vazgeç
                        </motion.button>

                        <motion.button
                            type="button"
                            whileHover={payingTotal > 0 ? { scale: 1.02 } : {}}
                            whileTap={payingTotal > 0 ? { scale: 0.97 } : {}}
                            onClick={onConfirm}
                            disabled={payingTotal <= 0}
                            style={{
                                flex: 2,
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: payingTotal > 0
                                    ? splitPayMethod === 'cash'
                                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                        : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                                    : 'rgba(255, 255, 255, 0.06)',
                                border: payingTotal > 0
                                    ? splitPayMethod === 'cash' ? '1px solid #10b981' : '1px solid #3b82f6'
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                color: payingTotal > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                                fontSize: '13.5px',
                                fontWeight: 800,
                                cursor: payingTotal > 0 ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: payingTotal > 0
                                    ? splitPayMethod === 'cash'
                                        ? '0 8px 24px -6px rgba(16, 185, 129, 0.5)'
                                        : '0 8px 24px -6px rgba(37, 99, 235, 0.5)'
                                    : 'none',
                                transition: 'background 0.2s, box-shadow 0.2s'
                            }}
                        >
                            <CheckCircle2 size={16} />
                            <span>
                                {payingTotal > 0 ? `${formatMoney(payingTotal)} Tahsil Et` : 'Ürün Seçiniz'}
                            </span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
