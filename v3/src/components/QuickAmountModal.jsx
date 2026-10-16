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
    AlertCircle,
    Check
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
            // Yazıcı açıksa varsayılan olarak fiş yazdır seçili gelebilir
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
                // Enter varsayılan olarak nakit kapatır
                handleCheckoutSubmit('cash');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, amountStr]);

    if (!isOpen) return null;

    const currentAmount = Number(amountStr) || 0;
    const hasExistingItems = existingOrder?.items && existingOrder.items.length > 0;
    const existingTotal = existingOrder?.total || existingOrder?.subtotal || 0;

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
                className="modal-overlay open" 
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    zIndex: 2200, 
                    padding: '12px',
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                    background: 'rgba(0, 0, 0, 0.75)'
                }}
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 18 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    className="quick-amount-modal-card"
                >
                    {/* Header */}
                    <div className="quick-amount-header">
                        <div className="header-left">
                            <div className="quick-amount-icon-badge">
                                <Zap size={18} className="text-amber-400" />
                            </div>
                            <div className="header-titles">
                                <h3 className="quick-amount-title">
                                    Hızlı Ödeme Al
                                </h3>
                                <div className="quick-amount-subtitle">
                                    <span className="subtitle-info">
                                        Serbest Tutar Kapatma
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="header-right">
                            <span className="quick-amount-table-pill">
                                Masa {tableNo}
                            </span>
                            <button
                                onClick={onClose}
                                className="quick-amount-close-btn"
                                title="Kapat (ESC)"
                                type="button"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Hero Amount Display (Apple Pay / Revolut Clean Aesthetic) */}
                    <div className="quick-amount-hero-stage">
                        <div className="hero-stage-top-bar">
                            <span className="hero-stage-label">ÖDENECEK TUTAR</span>
                            {currentAmount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleClear}
                                    className="hero-stage-clear-btn"
                                    title="Tutarı Sıfırla"
                                >
                                    <RotateCcw size={11} /> Sıfırla
                                </button>
                            )}
                        </div>

                        <div className="hero-stage-value-row">
                            <span className="hero-currency-symbol">₺</span>
                            <span className={`hero-amount-text ${currentAmount > 0 ? 'has-value' : 'is-zero'}`}>
                                {currentAmount > 0 ? currentAmount.toLocaleString('tr-TR') : '0'}
                            </span>
                            {currentAmount > 0 && (
                                <button
                                    type="button"
                                    onClick={handleBackspace}
                                    className="hero-backspace-pill"
                                    title="Geri Sil"
                                >
                                    <Delete size={19} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Quick Additive Chips */}
                    <div className="quick-amount-chips-row">
                        {QUICK_PRESET_AMOUNTS.map(amt => (
                            <motion.button
                                key={amt}
                                type="button"
                                whileTap={{ scale: 0.92 }}
                                onClick={() => handleAddAmount(amt)}
                                className="quick-amount-chip-btn"
                            >
                                +{amt} ₺
                            </motion.button>
                        ))}
                    </div>

                    {/* Modern Glassmorphic POS Numpad */}
                    <div className="quick-amount-numpad">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                            <motion.button
                                key={num}
                                type="button"
                                whileTap={{ scale: 0.93 }}
                                onClick={() => handleNumberPress(num)}
                                className="quick-amount-numpad-key"
                            >
                                <span className="numpad-digit">{num}</span>
                            </motion.button>
                        ))}
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.93 }}
                            onClick={() => handleNumberPress('00')}
                            className="quick-amount-numpad-key double-zero"
                        >
                            <span className="numpad-digit">00</span>
                        </motion.button>
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.93 }}
                            onClick={() => handleNumberPress('0')}
                            className="quick-amount-numpad-key"
                        >
                            <span className="numpad-digit">0</span>
                        </motion.button>
                        <motion.button
                            type="button"
                            whileTap={{ scale: 0.93 }}
                            onClick={handleBackspace}
                            className="quick-amount-numpad-key backspace"
                            title="Geri Sil"
                        >
                            <Delete size={22} />
                        </motion.button>
                    </div>

                    {/* Modern iOS-Style Print Toggle */}
                    <div 
                        className="quick-amount-toggle-pill"
                        onClick={() => setShouldPrint(prev => !prev)}
                    >
                        <div className="toggle-left">
                            <Printer size={16} className={shouldPrint ? "text-amber-400" : "text-gray-400"} />
                            <span className="toggle-label">Müşteri Bilgi Fişi Yazdır</span>
                        </div>
                        <div className={`modern-switch ${shouldPrint ? 'active' : ''}`}>
                            <div className="switch-handle">
                                {shouldPrint && <Check size={10} color="#1c1411" strokeWidth={3} />}
                            </div>
                        </div>
                    </div>

                    {/* Dual Action Checkout Buttons (Emerald Cash & Cobalt Card) */}
                    <div className="quick-amount-actions">
                        <motion.button
                            type="button"
                            whileTap={currentAmount > 0 ? { scale: 0.96 } : {}}
                            disabled={currentAmount <= 0}
                            onClick={() => handleCheckoutSubmit('cash')}
                            className="quick-amount-action-btn cash"
                        >
                            <div className="btn-icon-wrapper">
                                <Banknote size={22} />
                            </div>
                            <div className="btn-content">
                                <span className="btn-title">Nakit Kapat</span>
                                <span className="btn-subtitle">
                                    {currentAmount > 0 ? formatMoney(currentAmount) : 'Tutar Girin'}
                                </span>
                            </div>
                        </motion.button>

                        <motion.button
                            type="button"
                            whileTap={currentAmount > 0 ? { scale: 0.96 } : {}}
                            disabled={currentAmount <= 0}
                            onClick={() => handleCheckoutSubmit('card')}
                            className="quick-amount-action-btn card"
                        >
                            <div className="btn-icon-wrapper">
                                <CreditCard size={22} />
                            </div>
                            <div className="btn-content">
                                <span className="btn-title">Kart Kapat</span>
                                <span className="btn-subtitle">
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
