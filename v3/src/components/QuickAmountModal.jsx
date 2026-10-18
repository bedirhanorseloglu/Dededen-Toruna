import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Zap, 
    X, 
    Delete, 
    RotateCcw, 
    Banknote, 
    CreditCard, 
    Printer, 
    Check,
    ArrowUpRight
} from 'lucide-react';
import { formatMoney } from '../data/menu';

const QUICK_PRESET_AMOUNTS = [50, 100, 200, 500, 1000];

export default function QuickAmountModal({
    isOpen,
    onClose,
    tableNo,
    existingOrder = null,
    currentUser = null,
    onConfirm,
    printerSettings = null
}) {
    const [amountStr, setAmountStr] = useState('');
    const [shouldPrint, setShouldPrint] = useState(false);

    // Modal açıldığında state sıfırlama veya hazırlama
    useEffect(() => {
        if (isOpen) {
            setAmountStr('');
            setShouldPrint(Boolean(printerSettings?.autoPrintBill));
        }
    }, [isOpen, printerSettings]);

    // Klavye tuşları dinleme (Fiziksel numpad veya klavye kullanan masaüstü/kasa için)
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key >= '0' && e.key <= '9') {
                handleNumberPress(e.key);
            } else if (e.key === 'Backspace') {
                handleBackspace();
            } else if (e.key === 'Delete' || e.key === 'c' || e.key === 'C') {
                handleClear();
            } else if (e.key === 'Enter' && (Number(amountStr) || 0) > 0) {
                handleCheckoutSubmit('cash');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, amountStr]);

    if (!isOpen) return null;

    const currentAmount = Number(amountStr) || 0;
    const existingTotal = Number(existingOrder?.total || existingOrder?.subtotal || 0);

    // Numpad Handlers
    const handleNumberPress = (num) => {
        if (navigator.vibrate) {
            try { navigator.vibrate(10); } catch (e) {}
        }
        if (amountStr.length >= 7) return; // Maksimum 7 basamak
        if (amountStr === '' && (num === '0' || num === '00')) return; // Başa 0 yazılmaz
        setAmountStr(prev => prev + num);
    };

    const handleBackspace = () => {
        if (navigator.vibrate) {
            try { navigator.vibrate(12); } catch (e) {}
        }
        setAmountStr(prev => prev.slice(0, -1));
    };

    const handleClear = () => {
        if (navigator.vibrate) {
            try { navigator.vibrate(18); } catch (e) {}
        }
        setAmountStr('');
    };

    const handleAddAmount = (addVal) => {
        if (navigator.vibrate) {
            try { navigator.vibrate(14); } catch (e) {}
        }
        const newVal = currentAmount + addVal;
        setAmountStr(String(newVal));
    };

    const handleFillExistingTotal = () => {
        if (existingTotal > 0) {
            if (navigator.vibrate) {
                try { navigator.vibrate(20); } catch (e) {}
            }
            setAmountStr(String(Math.round(existingTotal)));
        }
    };

    const handleCheckoutSubmit = (paymentMethod) => {
        if (currentAmount <= 0) return;

        if (onConfirm) {
            onConfirm({
                amount: currentAmount,
                paymentMethod,
                note: 'Hızlı Ödeme (Öğle Yoğunluğu)',
                shouldPrint
            });
        }
    };

    return (
        <AnimatePresence>
            <div
                className="quick-amount-overlay"
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
                    className="quick-amount-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'radial-gradient(circle at center, rgba(30, 20, 16, 0.85) 0%, rgba(12, 9, 8, 0.95) 100%)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)'
                    }}
                />

                {/* 21st / Linear Glass Dialog */}
                <motion.div
                    className="quick-amount-dialog"
                    initial={{ opacity: 0, scale: 0.93, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 16 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '420px',
                        background: 'linear-gradient(165deg, rgba(28, 22, 20, 0.98) 0%, rgba(16, 12, 11, 0.99) 100%)',
                        border: '1px solid rgba(245, 159, 0, 0.22)',
                        borderRadius: '24px',
                        padding: '20px 22px',
                        boxShadow: '0 32px 80px -16px rgba(0, 0, 0, 0.85), 0 0 35px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxSizing: 'border-box',
                        maxHeight: '94vh',
                        maxHeight: '94dvh'
                    }}
                >
                    {/* Top Ambient Ember Glow Beam */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '15%',
                            right: '15%',
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.85), transparent)',
                            opacity: 0.9
                        }}
                    />

                    {/* Header: Capsule Badge, Title & Close */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    padding: '4px 11px',
                                    borderRadius: '999px',
                                    background: 'rgba(245, 158, 11, 0.14)',
                                    border: '1px solid rgba(245, 158, 11, 0.32)',
                                    color: '#fbbf24',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    letterSpacing: '0.4px',
                                    marginBottom: '6px'
                                }}
                            >
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#fbbf24', boxShadow: '0 0 6px #fbbf24' }} />
                                <Zap size={11} />
                                <span>SERBEST TUTAR KAPATMA</span>
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>Hızlı Ödeme Al</span>
                                <span style={{ color: 'rgba(255, 255, 255, 0.35)' }}>•</span>
                                <span style={{ color: '#fbbf24' }}>Masa {tableNo}</span>
                            </h2>
                            <p style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '12px', margin: '3px 0 0 0' }}>
                                Tutarı girerek masayı tek dokunuşla kapatın:
                            </p>
                        </div>

                        <motion.button
                            whileHover={{ rotate: 90, scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={onClose}
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                color: 'rgba(255, 255, 255, 0.7)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'color 0.15s, background 0.15s'
                            }}
                            title="Kapat (ESC)"
                            type="button"
                        >
                            <X size={17} />
                        </motion.button>
                    </div>

                    {/* Quick Fill: If table already has an active balance */}
                    {existingTotal > 0 && (
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleFillExistingTotal}
                            style={{
                                padding: '8px 12px',
                                borderRadius: '12px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px dashed rgba(245, 158, 11, 0.35)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer'
                            }}
                            title="Masanın mevcut sipariş tutarını otomatik aktar"
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#fbbf24', fontWeight: 700 }}>
                                <Zap size={13} />
                                <span>Masa Bakiyesi: <strong>{formatMoney(existingTotal)}</strong></span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#FFFFFF', fontWeight: 800, background: 'rgba(245, 158, 11, 0.25)', padding: '2px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span>Aktar</span>
                                <ArrowUpRight size={12} />
                            </span>
                        </motion.div>
                    )}

                    {/* Hero Stage: Amount Display (21st FinTech Digital Vault) */}
                    <div
                        style={{
                            background: 'linear-gradient(145deg, rgba(38, 28, 25, 0.95) 0%, rgba(20, 15, 14, 0.98) 100%)',
                            border: currentAmount > 0 ? '1px solid rgba(245, 158, 11, 0.45)' : '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '18px',
                            padding: '12px 18px',
                            boxShadow: 'inset 0 3px 12px rgba(0, 0, 0, 0.55), 0 4px 16px rgba(0, 0, 0, 0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                            position: 'relative',
                            transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                                fontSize: '10.5px',
                                fontWeight: 800,
                                letterSpacing: '0.8px',
                                color: 'rgba(245, 158, 11, 0.9)',
                                textTransform: 'uppercase',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{
                                    width: '6px',
                                    height: '6px',
                                    borderRadius: '50%',
                                    background: currentAmount > 0 ? '#10b981' : '#f59e0b',
                                    boxShadow: currentAmount > 0 ? '0 0 8px #10b981' : '0 0 6px #f59e0b'
                                }} />
                                <span>ÖDENECEK TUTAR</span>
                            </span>

                            {currentAmount > 0 && (
                                <motion.button
                                    type="button"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.92 }}
                                    onClick={handleClear}
                                    style={{
                                        background: 'rgba(239, 68, 68, 0.16)',
                                        border: '1px solid rgba(239, 68, 68, 0.38)',
                                        color: '#f87171',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '3px 8px',
                                        borderRadius: '7px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                    title="Tutarı Sıfırla"
                                >
                                    <RotateCcw size={11} />
                                    <span>Sıfırla</span>
                                </motion.button>
                            )}
                        </div>

                        <div style={{
                            display: 'flex',
                            alignItems: 'baseline',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '6px 0 4px',
                            position: 'relative'
                        }}>
                            <span style={{
                                fontSize: '26px',
                                fontWeight: 900,
                                color: currentAmount > 0 ? '#fbbf24' : 'rgba(245, 158, 11, 0.5)',
                                lineHeight: 1
                            }}>
                                ₺
                            </span>
                            <span style={{
                                fontSize: '46px',
                                fontWeight: 900,
                                letterSpacing: '-1px',
                                fontVariantNumeric: 'tabular-nums',
                                lineHeight: 1,
                                color: currentAmount > 0 ? '#ffd43b' : 'rgba(255, 255, 255, 0.25)',
                                textShadow: currentAmount > 0 ? '0 0 28px rgba(245, 158, 11, 0.45)' : 'none',
                                transition: 'all 0.15s ease'
                            }}>
                                {currentAmount > 0 ? currentAmount.toLocaleString('tr-TR') : '0'}
                            </span>
                        </div>
                    </div>

                    {/* Preset Quick-Add Chips (+50, +100, +200, +500, +1000) */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                        {QUICK_PRESET_AMOUNTS.map(amt => (
                            <motion.button
                                key={amt}
                                type="button"
                                whileHover={{ y: -2, scale: 1.05 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleAddAmount(amt)}
                                style={{
                                    height: '38px',
                                    borderRadius: '11px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.03) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#f8fafc',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                                    transition: 'border-color 0.15s, background 0.15s'
                                }}
                            >
                                +{amt} ₺
                            </motion.button>
                        ))}
                    </div>

                    {/* 21st POS Tactile Numpad */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                            <motion.button
                                key={num}
                                type="button"
                                whileHover={{ y: -1, scale: 1.02 }}
                                whileTap={{ y: 2, scale: 0.94 }}
                                onClick={() => handleNumberPress(num)}
                                style={{
                                    height: '50px',
                                    borderRadius: '15px',
                                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    boxShadow: '0 4px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
                                    color: '#FFFFFF',
                                    fontSize: '22px',
                                    fontWeight: 800,
                                    letterSpacing: '-0.3px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'border-color 0.15s'
                                }}
                            >
                                {num}
                            </motion.button>
                        ))}

                        {/* 00 Keycap */}
                        <motion.button
                            type="button"
                            whileHover={{ y: -1, scale: 1.02 }}
                            whileTap={{ y: 2, scale: 0.94 }}
                            onClick={() => handleNumberPress('00')}
                            style={{
                                height: '50px',
                                borderRadius: '15px',
                                background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.12) 0%, rgba(245, 158, 11, 0.04) 100%)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                color: '#ffd43b',
                                fontSize: '18px',
                                fontWeight: 900,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            00
                        </motion.button>

                        {/* 0 Keycap */}
                        <motion.button
                            type="button"
                            whileHover={{ y: -1, scale: 1.02 }}
                            whileTap={{ y: 2, scale: 0.94 }}
                            onClick={() => handleNumberPress('0')}
                            style={{
                                height: '50px',
                                borderRadius: '15px',
                                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
                                color: '#FFFFFF',
                                fontSize: '22px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            0
                        </motion.button>

                        {/* Backspace Keycap */}
                        <motion.button
                            type="button"
                            whileHover={{ y: -1, scale: 1.02 }}
                            whileTap={{ y: 2, scale: 0.94 }}
                            onClick={handleBackspace}
                            style={{
                                height: '50px',
                                borderRadius: '15px',
                                background: 'linear-gradient(180deg, rgba(239, 68, 68, 0.16) 0%, rgba(239, 68, 68, 0.06) 100%)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            title="Geri Sil (Backspace)"
                        >
                            <Delete size={20} />
                        </motion.button>
                    </div>

                    {/* Modern iOS / 21st Print Toggle */}
                    <div 
                        onClick={() => setShouldPrint(prev => !prev)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            borderRadius: '13px',
                            background: 'rgba(255, 255, 255, 0.04)',
                            border: '1px solid rgba(255, 255, 255, 0.09)',
                            cursor: 'pointer',
                            userSelect: 'none',
                            transition: 'background 0.15s, border-color 0.15s'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Printer size={16} style={{ color: shouldPrint ? '#fbbf24' : 'rgba(255, 255, 255, 0.45)' }} />
                            <span style={{ fontSize: '13px', fontWeight: 700, color: shouldPrint ? '#ffffff' : '#cbd5e1' }}>
                                Müşteri Bilgi Fişi Yazdır
                            </span>
                        </div>
                        <div style={{
                            width: '40px',
                            height: '24px',
                            borderRadius: '999px',
                            background: shouldPrint ? '#f59e0b' : 'rgba(255, 255, 255, 0.16)',
                            position: 'relative',
                            transition: 'background 0.2s ease',
                            padding: '2px',
                            boxSizing: 'border-box'
                        }}>
                            <motion.div
                                animate={{ x: shouldPrint ? 16 : 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.4)'
                                }}
                            >
                                {shouldPrint && <Check size={11} color="#1c1411" strokeWidth={3} />}
                            </motion.div>
                        </div>
                    </div>

                    {/* Dual Action Checkout Buttons (Emerald Cash & Vibrant Blue Card) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '2px' }}>
                        <motion.button
                            type="button"
                            whileHover={currentAmount > 0 ? { scale: 1.025, y: -2 } : {}}
                            whileTap={currentAmount > 0 ? { scale: 0.96 } : {}}
                            disabled={currentAmount <= 0}
                            onClick={() => handleCheckoutSubmit('cash')}
                            style={{
                                minHeight: '54px',
                                borderRadius: '15px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: currentAmount > 0 ? 'pointer' : 'not-allowed',
                                border: currentAmount > 0 ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                                background: currentAmount > 0
                                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                                    : 'rgba(255, 255, 255, 0.04)',
                                color: currentAmount > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                                boxShadow: currentAmount > 0 ? '0 10px 25px -4px rgba(16, 185, 129, 0.5)' : 'none',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '11px',
                                background: currentAmount > 0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <Banknote size={21} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                                <span style={{ fontSize: '14px', fontWeight: 900, lineHeight: 1.1 }}>Nakit Kapat</span>
                                <span style={{ fontSize: '11px', opacity: 0.95, fontWeight: 700, marginTop: '3px' }}>
                                    {currentAmount > 0 ? formatMoney(currentAmount) : 'Tutar Girin'}
                                </span>
                            </div>
                        </motion.button>

                        <motion.button
                            type="button"
                            whileHover={currentAmount > 0 ? { scale: 1.025, y: -2 } : {}}
                            whileTap={currentAmount > 0 ? { scale: 0.96 } : {}}
                            disabled={currentAmount <= 0}
                            onClick={() => handleCheckoutSubmit('card')}
                            style={{
                                minHeight: '54px',
                                borderRadius: '15px',
                                padding: '8px 12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                cursor: currentAmount > 0 ? 'pointer' : 'not-allowed',
                                border: currentAmount > 0 ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.08)',
                                background: currentAmount > 0
                                    ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
                                    : 'rgba(255, 255, 255, 0.04)',
                                color: currentAmount > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                                boxShadow: currentAmount > 0 ? '0 10px 25px -4px rgba(37, 99, 235, 0.5)' : 'none',
                                transition: 'all 0.18s ease'
                            }}
                        >
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '11px',
                                background: currentAmount > 0 ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                <CreditCard size={21} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                                <span style={{ fontSize: '14px', fontWeight: 900, lineHeight: 1.1 }}>Kart Kapat</span>
                                <span style={{ fontSize: '11px', opacity: 0.95, fontWeight: 700, marginTop: '3px' }}>
                                    {currentAmount > 0 ? formatMoney(currentAmount) : 'Tutar Girin'}
                                </span>
                            </div>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
