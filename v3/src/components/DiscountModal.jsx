import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Tag, X, Check, Calculator, RefreshCw, AlertCircle, Percent, ArrowRight } from 'lucide-react';
import { formatMoney } from '../data/menu';

export default function DiscountModal({
    isOpen,
    onClose,
    tableNo,
    subtotal = 0,
    currentDiscount = 0,
    items = [],
    onApply,
    onRemove
}) {
    const [finalTotalInput, setFinalTotalInput] = useState('');
    const [discountInput, setDiscountInput] = useState('');

    // Masadaki tüm çayları hesapla
    const teaItems = (items || []).filter(item => {
        const name = (item.name || '').toLocaleLowerCase('tr-TR');
        return name.includes('çay') || name.includes('semaver');
    });

    const teaTotal = teaItems.reduce((acc, it) => acc + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
    const teaCount = teaItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);


    // Modal açıldığında mevcut değerleri yükle
    useEffect(() => {
        if (isOpen) {
            const existingDisc = Number(currentDiscount) || 0;
            if (existingDisc > 0) {
                setDiscountInput(String(existingDisc));
                const target = Math.max(0, subtotal - existingDisc);
                setFinalTotalInput(String(target));
            } else {
                setDiscountInput('');
                setFinalTotalInput('');
            }
        }
    }, [isOpen, currentDiscount, subtotal]);

    // ESC ile kapatma
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // 1. "Alınacak Tutar" değiştiğinde indirimi otomatik hesapla
    const handleFinalTotalChange = (val) => {
        setFinalTotalInput(val);
        const parsed = parseFloat(val.replace(',', '.'));
        if (!isNaN(parsed) && parsed >= 0) {
            const calculatedDisc = Math.max(0, subtotal - parsed);
            setDiscountInput(calculatedDisc > 0 ? String(Math.round(calculatedDisc * 100) / 100) : '0');
        } else if (val === '') {
            setDiscountInput('');
        }
    };

    // 2. "İndirim Tutarı" değiştiğinde alınacak tutarı otomatik hesapla
    const handleDiscountChange = (val) => {
        setDiscountInput(val);
        const parsed = parseFloat(val.replace(',', '.'));
        if (!isNaN(parsed) && parsed >= 0) {
            const calculatedFinal = Math.max(0, subtotal - parsed);
            setFinalTotalInput(String(Math.round(calculatedFinal * 100) / 100));
        } else if (val === '') {
            setFinalTotalInput('');
        }
    };

    // Hızlı yüzdelik indirim uygula
    const applyPercentageDiscount = (percent) => {
        const disc = Math.round((subtotal * (percent / 100)) * 100) / 100;
        setDiscountInput(String(disc));
        setFinalTotalInput(String(Math.max(0, Math.round((subtotal - disc) * 100) / 100)));
    };

    // Hızlı sabit indirim uygula
    const applyFixedDiscount = (amount) => {
        const disc = Math.min(subtotal, amount);
        setDiscountInput(String(disc));
        setFinalTotalInput(String(Math.max(0, Math.round((subtotal - disc) * 100) / 100)));
    };

    // Hızlı hedef tutar (Düz hesap yap)
    const applyTargetTotal = (target) => {
        if (target < subtotal && target >= 0) {
            setFinalTotalInput(String(target));
            setDiscountInput(String(Math.round((subtotal - target) * 100) / 100));
        }
    };

    // Dinamik akıllı yuvarlama seçenekleri üret
    const getSmartRoundingOptions = () => {
        const options = [];
        if (subtotal <= 10) return options;

        // 10 TL tabanına yuvarla
        const floor10 = Math.floor(subtotal / 10) * 10;
        if (floor10 < subtotal && floor10 > 0) {
            options.push({ target: floor10, diff: subtotal - floor10 });
        }

        // 50 TL tabanına yuvarla
        const floor50 = Math.floor(subtotal / 50) * 50;
        if (floor50 < subtotal && floor50 > 0 && floor50 !== floor10) {
            options.push({ target: floor50, diff: subtotal - floor50 });
        }

        // 100 TL tabanına yuvarla
        const floor100 = Math.floor(subtotal / 100) * 100;
        if (floor100 < subtotal && floor100 > 0 && floor100 !== floor10 && floor100 !== floor50) {
            options.push({ target: floor100, diff: subtotal - floor100 });
        }

        return options.sort((a, b) => b.target - a.target);
    };

    // Onay ve Kaydet
    const handleSave = () => {
        const parsedDisc = parseFloat(discountInput.replace(',', '.'));
        const discountAmount = (!isNaN(parsedDisc) && parsedDisc > 0) ? Math.min(subtotal, parsedDisc) : 0;

        if (discountAmount <= 0) {
            if (onRemove) onRemove();
            else onClose();
            return;
        }

        if (onApply) {
            onApply(discountAmount);
        }
        onClose();
    };

    const currentCalculatedDisc = parseFloat(discountInput.replace(',', '.')) || 0;
    const currentCalculatedTotal = Math.max(0, subtotal - currentCalculatedDisc);
    const smartRoundings = getSmartRoundingOptions();

    return (
        <AnimatePresence>
            <div
                className="modal-overlay open discount-modal-overlay"
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
                    boxSizing: 'border-box'
                }}
                onClick={onClose}
            >
                <motion.div
                    className="modal-content modal-responsive-card discount-modal-card"
                    style={{ position: 'relative', zIndex: 1000000 }}
                    onClick={(e) => e.stopPropagation()}
                    initial={{ scale: 0.92, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.92, opacity: 0, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                >
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--brand-gold)',
                                flexShrink: 0
                            }}>
                                <Tag size={20} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0, lineHeight: 1.2 }}>
                                    İndirim & İkram Belirle
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Masa {tableNo} • Hesap: <strong style={{ color: 'var(--brand-gold)' }}>{formatMoney(subtotal)}</strong>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: 'none',
                                borderRadius: '8px',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Canlı Hesap Özeti Kartı */}
                    <div style={{
                        background: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '14px',
                        padding: '12px 14px',
                        marginBottom: '14px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>Ara Toplam (Ürünler):</span>
                            <span style={{ fontWeight: 700, color: 'white' }}>{formatMoney(subtotal)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#10b981', marginBottom: '6px' }}>
                            <span>
                                {teaTotal > 0 && currentCalculatedDisc === teaTotal
                                    ? '🫖 Çayların Tamamı İkram:'
                                    : currentCalculatedDisc >= subtotal && subtotal > 0
                                    ? '🎁 Tüm Hesap İkram:'
                                    : 'Uygulanacak İndirim:'}
                            </span>
                            <span style={{ fontWeight: 800 }}>-{formatMoney(currentCalculatedDisc)}</span>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.1)', margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: 800, color: 'white' }}>Tahsil Edilecek Net Tutar:</span>
                            <span style={{ fontSize: '22px', fontWeight: 900, color: 'var(--brand-gold)' }}>
                                {formatMoney(currentCalculatedTotal)}
                            </span>
                        </div>
                    </div>

                    {/* Akıllı Giriş Alanları (İki Yönlü Eşzamanlı) */}
                    <div className="discount-inputs-grid">
                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                                Alınacak Tutar (₺)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={subtotal}
                                    placeholder={String(subtotal)}
                                    value={finalTotalInput}
                                    onChange={(e) => handleFinalTotalChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        border: '1px solid rgba(245, 158, 11, 0.4)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        color: 'white',
                                        fontSize: '16px',
                                        fontWeight: 800,
                                        outline: 'none'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '13px', fontWeight: 700 }}>
                                    ₺
                                </span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                Örn: 220 yerine 200 al
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '5px', textTransform: 'uppercase' }}>
                                İndirim Tutarı (₺)
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={subtotal}
                                    placeholder="0"
                                    value={discountInput}
                                    onChange={(e) => handleDiscountChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        boxSizing: 'border-box',
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        border: '1px solid rgba(16, 185, 129, 0.4)',
                                        borderRadius: '10px',
                                        padding: '10px 12px',
                                        color: '#10b981',
                                        fontSize: '16px',
                                        fontWeight: 800,
                                        outline: 'none'
                                    }}
                                />
                                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontSize: '13px', fontWeight: 700 }}>
                                    ₺
                                </span>
                            </div>
                            <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                Düşülecek indirim miktarı
                            </div>
                        </div>
                    </div>

                    {/* Akıllı Yuvarlama Butonları (Düz Hesap Yap) */}
                    {smartRoundings.length > 0 && (
                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Calculator size={12} /> Hızlı Düz Hesap (Yuvarla)
                            </div>
                            <div className="discount-chips-container">
                                {smartRoundings.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => applyTargetTotal(opt.target)}
                                        className="btn-outline discount-chip-btn"
                                        style={{
                                            background: 'rgba(245, 158, 11, 0.08)',
                                            borderColor: 'rgba(245, 158, 11, 0.3)',
                                            color: 'white'
                                        }}
                                    >
                                        <span>Düz <strong>{formatMoney(opt.target)}</strong> Yap</span>
                                        <span style={{ fontSize: '10.5px', color: '#10b981' }}>(-{formatMoney(opt.diff)})</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hızlı Sabit & Yüzdelik Butonlar */}
                    <div style={{ marginBottom: '16px' }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                            Hızlı İndirim Seçenekleri
                        </div>
                        <div className="discount-chips-container">
                            {[10, 15, 20].map((pct) => (
                                <button
                                    key={pct}
                                    type="button"
                                    onClick={() => applyPercentageDiscount(pct)}
                                    className="btn-outline discount-chip-btn"
                                    style={{
                                        color: 'var(--brand-gold)',
                                        borderColor: 'rgba(245, 158, 11, 0.35)',
                                        background: 'rgba(245, 158, 11, 0.06)'
                                    }}
                                >
                                    %{pct} İndirim
                                </button>
                            ))}

                            {/* 🫖 Çayların Tamamı İkram Butonu */}
                            <button
                                type="button"
                                disabled={teaTotal === 0}
                                onClick={() => applyFixedDiscount(teaTotal)}
                                className="btn-outline discount-chip-btn"
                                style={{
                                    color: teaTotal > 0 ? '#fbbf24' : 'var(--text-muted)',
                                    background: teaTotal > 0 ? 'rgba(245, 158, 11, 0.16)' : 'rgba(255, 255, 255, 0.03)',
                                    borderColor: teaTotal > 0 ? 'rgba(245, 158, 11, 0.55)' : 'rgba(255, 255, 255, 0.1)',
                                    cursor: teaTotal > 0 ? 'pointer' : 'not-allowed',
                                    opacity: teaTotal > 0 ? 1 : 0.45
                                }}
                                title={teaTotal === 0 ? 'Masada çay siparişi bulunmuyor' : `${teaCount} adet çay toplamı: ${formatMoney(teaTotal)}`}
                            >
                                🫖 Çayların Tamamı İkram {teaTotal > 0 ? `(-${formatMoney(teaTotal)})` : ''}
                            </button>

                            {/* 🎁 Tamamı İkram (%100) Butonu */}
                            <button
                                type="button"
                                onClick={() => applyPercentageDiscount(100)}
                                className="btn-outline discount-chip-btn"
                                style={{
                                    color: '#f87171',
                                    borderColor: 'rgba(239, 68, 68, 0.35)',
                                    background: 'rgba(239, 68, 68, 0.08)'
                                }}
                            >
                                🎁 Tamamı İkram (%100)
                            </button>
                        </div>
                    </div>

                    {/* Alt Aksiyon Butonları (Tam Responsive Grid / Flex) */}
                    <div className="discount-modal-actions">
                        {currentDiscount > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (onRemove) onRemove();
                                    onClose();
                                }}
                                className="btn-outline btn-remove"
                            >
                                🗑️ İndirimi Kaldır
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-outline btn-cancel"
                        >
                            Vazgeç
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            className="btn-primary btn-confirm"
                        >
                            <Check size={16} />
                            İndirimi Uygula
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
