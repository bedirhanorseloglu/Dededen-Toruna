import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Plus, 
    Pencil, 
    X, 
    CheckCircle2, 
    Wallet, 
    CreditCard,
    UtensilsCrossed,
    Coffee,
    Users,
    Receipt,
    Wrench,
    Package
} from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';

const CATEGORY_META = {
    mutfak: { name: 'Mutfak & Gıda', icon: UtensilsCrossed, color: '#10b981' },
    icecek: { name: 'İçecek & Meşrubat', icon: Coffee, color: '#3b82f6' },
    personel: { name: 'Personel Avans', icon: Users, color: '#8b5cf6' },
    faturalar: { name: 'Kira & Fatura', icon: Receipt, color: '#f59e0b' },
    sarf: { name: 'Bakım & Sarf', icon: Wrench, color: '#ec4899' },
    diger: { name: 'Diğer / Muhtelif', icon: Package, color: '#94a3b8' }
};

const DEFAULT_CATEGORIES = [
    { id: 'mutfak', name: 'Mutfak & Gıda', color: '#10b981' },
    { id: 'icecek', name: 'İçecek & Meşrubat', color: '#3b82f6' },
    { id: 'personel', name: 'Personel Avans', color: '#8b5cf6' },
    { id: 'faturalar', name: 'Kira & Fatura', color: '#f59e0b' },
    { id: 'sarf', name: 'Bakım & Sarf', color: '#ec4899' },
    { id: 'diger', name: 'Diğer / Muhtelif', color: '#94a3b8' }
];

export default function ExpenseDrawer({
    isOpen,
    onClose,
    editingExpense,
    onSubmit,
    isSubmitting = false,
    amount,
    setAmount,
    onQuickAmountSet,
    title,
    setTitle,
    date,
    setDate,
    paymentMethod,
    setPaymentMethod,
    category,
    setCategory,
    notes,
    setNotes,
    categories = DEFAULT_CATEGORIES
}) {
    // ESC ile kapatma ve arka plan kaydırma kilidi (scroll lock)
    useEffect(() => {
        if (!isOpen) return;

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (typeof document === 'undefined') return null;

    const drawerContent = (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'relative', zIndex: 2500 }}>
                    {/* Karartma Katmanı (Backdrop) */}
                    <motion.div
                        className="expense-drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.22, ease: 'easeOut' }}
                        onClick={onClose}
                        aria-hidden="true"
                    />

                    {/* Sağdan Kayan Modern Çekmece */}
                    <motion.aside
                        className="expense-slide-drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
                        role="dialog"
                        aria-modal="true"
                    >
                        {/* Çekmece Başlığı (Sabit Üst Başlık) */}
                        <div style={{
                            padding: '18px 22px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(21, 15, 14, 0.98)',
                            backdropFilter: 'blur(16px)',
                            WebkitBackdropFilter: 'blur(16px)',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: editingExpense ? 'rgba(245, 159, 0, 0.15)' : 'rgba(247, 103, 7, 0.15)',
                                    border: editingExpense ? '1px solid rgba(245, 159, 0, 0.35)' : '1px solid rgba(247, 103, 7, 0.35)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: editingExpense ? 'var(--brand-gold)' : 'var(--brand-primary)',
                                    boxShadow: editingExpense ? '0 4px 14px rgba(245, 159, 0, 0.2)' : '0 4px 14px rgba(247, 103, 7, 0.2)'
                                }}>
                                    {editingExpense ? <Pencil size={18} /> : <Plus size={20} />}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                                        {editingExpense ? 'Gider Kaydını Düzenle' : 'Yeni Gider Ekle'}
                                    </h3>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {editingExpense ? 'Gider detaylarını güncelleyin' : 'Gideri kasadan düşerek kaydedin'}
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                onClick={onClose}
                                style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'color 0.15s ease, background 0.15s ease'
                                }}
                                title="Kapat (ESC)"
                                type="button"
                            >
                                <X size={18} />
                            </motion.button>
                        </div>

                        {/* Çekmece Form Alanı (Kaydırılabilir İçerik) */}
                        <form
                            onSubmit={onSubmit}
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                WebkitOverflowScrolling: 'touch',
                                overscrollBehavior: 'contain',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        >
                            <div style={{
                                padding: '20px 22px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px'
                            }}>
                                {/* 1. HARCAMA TUTARI */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        Harcama Tutarı *
                                    </label>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(0, 0, 0, 0.5)',
                                        border: '1px solid rgba(239, 68, 68, 0.35)',
                                        borderRadius: '14px',
                                        padding: '10px 16px',
                                        gap: '10px',
                                        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)'
                                    }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#ef4444' }}>₺</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                            placeholder="0.00"
                                            autoFocus={!editingExpense}
                                            required
                                            style={{
                                                width: '100%',
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                color: 'white',
                                                fontSize: '24px',
                                                fontWeight: 900,
                                                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
                                                letterSpacing: '-0.5px'
                                            }}
                                        />
                                    </div>

                                    {/* Hızlı Tutar Çipleri */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                                        {[100, 250, 500, 1000].map(val => (
                                            <motion.button
                                                key={val}
                                                type="button"
                                                whileHover={{ scale: 1.03, borderColor: 'rgba(247, 103, 7, 0.4)' }}
                                                whileTap={{ scale: 0.96 }}
                                                onClick={() => onQuickAmountSet?.(val)}
                                                style={{
                                                    padding: '8px 4px',
                                                    borderRadius: '9px',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                }}
                                            >
                                                +{val}₺
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. AÇIKLAMA */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        Gider Açıklaması / Başlık *
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Örn: Kasap et alımı, Fırın ekmek, Elektrik faturası..."
                                        required
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            color: 'white',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>

                                {/* 3. TARİH VE ÖDEME KAYNAĞI (RESPONSİVE AUTO-FIT) */}
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                                    gap: '12px'
                                }}>
                                    <div style={{ position: 'relative' }}>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                            Tarih
                                        </label>
                                        <ModernDatePicker value={date} onChange={setDate} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                            Ödeme Kaynağı
                                        </label>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '4px',
                                            background: 'rgba(0, 0, 0, 0.45)',
                                            padding: '4px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <motion.button
                                                type="button"
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setPaymentMethod('cash')}
                                                style={{
                                                    border: 'none',
                                                    background: paymentMethod === 'cash' 
                                                        ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' 
                                                        : 'transparent',
                                                    color: paymentMethod === 'cash' ? 'white' : 'var(--text-muted)',
                                                    borderRadius: '8px',
                                                    padding: '9px 6px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: paymentMethod === 'cash' ? '0 2px 8px rgba(247, 103, 7, 0.3)' : 'none'
                                                }}
                                            >
                                                <Wallet size={15} />
                                                <span>Nakit</span>
                                            </motion.button>
                                            <motion.button
                                                type="button"
                                                whileTap={{ scale: 0.97 }}
                                                onClick={() => setPaymentMethod('card')}
                                                style={{
                                                    border: 'none',
                                                    background: paymentMethod === 'card' 
                                                        ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' 
                                                        : 'transparent',
                                                    color: paymentMethod === 'card' ? 'white' : 'var(--text-muted)',
                                                    borderRadius: '8px',
                                                    padding: '9px 6px',
                                                    fontSize: '12px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: paymentMethod === 'card' ? '0 2px 8px rgba(247, 103, 7, 0.3)' : 'none'
                                                }}
                                            >
                                                <CreditCard size={15} />
                                                <span>Kart</span>
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. KATEGORİ SEÇİMİ (6 KATEGORİ KARTLARI - LUCIDE İKONLARIYLA) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                                        Harcama Kategorisi *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                        {categories.map(cat => {
                                            const isSelected = category === cat.id;
                                            const meta = CATEGORY_META[cat.id] || {};
                                            const CatIcon = meta.icon || Package;
                                            const catColor = cat.color || meta.color || '#94a3b8';
                                            const catName = meta.name || cat.name;

                                            return (
                                                <motion.button
                                                    key={cat.id}
                                                    type="button"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.97 }}
                                                    onClick={() => setCategory(cat.id)}
                                                    style={{
                                                        border: isSelected 
                                                            ? `1.5px solid ${catColor}` 
                                                            : '1px solid rgba(255, 255, 255, 0.08)',
                                                        background: isSelected 
                                                            ? `${catColor}18` 
                                                            : 'rgba(0, 0, 0, 0.35)',
                                                        color: isSelected ? 'white' : 'var(--text-secondary)',
                                                        borderRadius: '12px',
                                                        padding: '10px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: isSelected ? 800 : 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '10px',
                                                        textAlign: 'left',
                                                        boxShadow: isSelected ? `0 4px 16px ${catColor}25` : 'none',
                                                        minHeight: '46px'
                                                    }}
                                                >
                                                    <div style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        borderRadius: '8px',
                                                        background: `${catColor}22`,
                                                        border: `1px solid ${catColor}44`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: catColor,
                                                        flexShrink: 0
                                                    }}>
                                                        <CatIcon size={15} />
                                                    </div>
                                                    <span style={{ 
                                                        whiteSpace: 'nowrap', 
                                                        overflow: 'hidden', 
                                                        textOverflow: 'ellipsis',
                                                        flex: 1
                                                    }}>
                                                        {catName}
                                                    </span>
                                                </motion.button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 5. NOT / EK AÇIKLAMA */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        Not / Detay / Fatura No (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Örn: Fatura No: 2026-A12, 5 çuval un..."
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '12px',
                                            padding: '11px 14px',
                                            color: 'white',
                                            fontSize: '13px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Çekmece Alt Butonları (Sabit Footer) */}
                            <div style={{
                                marginTop: 'auto',
                                padding: '14px 22px',
                                paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
                                display: 'flex',
                                gap: '10px',
                                background: 'rgba(18, 12, 11, 0.98)',
                                backdropFilter: 'blur(16px)',
                                WebkitBackdropFilter: 'blur(16px)',
                                borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                                flexShrink: 0
                            }}>
                                {editingExpense && (
                                    <motion.button
                                        type="button"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.97 }}
                                        onClick={onClose}
                                        style={{
                                            flex: 1,
                                            padding: '13px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.06)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            color: 'var(--text-muted)',
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Vazgeç
                                    </motion.button>
                                )}

                                <motion.button
                                    type="submit"
                                    disabled={isSubmitting}
                                    whileHover={{ scale: 1.02, filter: 'brightness(1.06)' }}
                                    whileTap={{ scale: 0.97 }}
                                    style={{
                                        flex: editingExpense ? 2 : 1,
                                        padding: '14px',
                                        fontSize: '14px',
                                        fontWeight: 800,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, var(--brand-primary), #e8590c)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                                        boxShadow: '0 4px 18px rgba(247, 103, 7, 0.35)',
                                        opacity: isSubmitting ? 0.7 : 1
                                    }}
                                >
                                    <CheckCircle2 size={18} />
                                    <span>
                                        {isSubmitting 
                                            ? 'Kaydediliyor...' 
                                            : (editingExpense ? 'Değişiklikleri Kaydet' : 'Gideri Kasadan Düş & Kaydet')
                                        }
                                    </span>
                                </motion.button>
                            </div>
                        </form>
                    </motion.aside>
                </div>
            )}
        </AnimatePresence>
    );

    return createPortal(drawerContent, document.body);
}
