import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Pencil, X, CheckCircle2 } from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';
import { EXPENSE_CATEGORIES } from './AdminExpenses';

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
    categories = EXPENSE_CATEGORIES
}) {
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Karartma Katmanı (Backdrop) */}
                    <motion.div
                        className="expense-drawer-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Sağdan Kayan Çekmece (Slide-over Drawer) */}
                    <motion.aside
                        className="expense-slide-drawer"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                    >
                        {/* Mobil Tutamaç (Drag pill) */}
                        <div className="admin-drawer-drag-pill" onClick={onClose} style={{ display: 'block', margin: '8px auto 0 auto' }} />

                        {/* Çekmece Başlığı */}
                        <div style={{
                            padding: '18px 22px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(25, 18, 16, 0.95)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '10px',
                                    background: editingExpense ? 'rgba(56, 189, 248, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                    border: editingExpense ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: editingExpense ? '#38bdf8' : '#f97316'
                                }}>
                                    {editingExpense ? <Pencil size={18} /> : <Plus size={20} />}
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0 }}>
                                        {editingExpense ? 'Gider Kaydını Düzenle' : 'Yeni Gider Ekle'}
                                    </h3>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                        {editingExpense ? 'Gider detaylarını güncelleyin' : 'Gideri kasadan düşerek kaydedin'}
                                    </div>
                                </div>
                            </div>

                            <button
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
                                    transition: 'all 0.15s ease'
                                }}
                                title="Kapat (ESC)"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Çekmece Form Alanı (Kaydırılabilir İçerik) */}
                        <form
                            onSubmit={onSubmit}
                            style={{
                                flex: 1,
                                overflowY: 'auto',
                                padding: '20px 22px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '18px'
                            }}
                        >
                            {/* 1. HARCAMA TUTARI */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                    Harcama Tutarı *
                                </label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    border: '1px solid rgba(255, 255, 255, 0.14)',
                                    borderRadius: '14px',
                                    padding: '10px 16px',
                                    gap: '10px'
                                }}>
                                    <span style={{ fontSize: '24px', fontWeight: 900, color: '#f87171' }}>₺</span>
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
                                            fontFamily: 'monospace'
                                        }}
                                    />
                                </div>

                                {/* Hızlı Tutar Çipleri */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                                    {[100, 250, 500, 1000].map(val => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => onQuickAmountSet?.(val)}
                                            style={{
                                                padding: '7px 4px',
                                                borderRadius: '8px',
                                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                                background: 'rgba(255, 255, 255, 0.04)',
                                                color: 'var(--text-secondary)',
                                                fontSize: '12px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                textAlign: 'center',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            +{val}₺
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 2. AÇIKLAMA */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                    Gider Açıklaması / Başlık *
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Örn: Kasap et alımı, Fırın ekmek, Elektrik fatura..."
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        border: '1px solid rgba(255, 255, 255, 0.12)',
                                        borderRadius: '12px',
                                        padding: '12px 14px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* 3. TARİH VE ÖDEME KAYNAĞI (2 SÜTUN) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                        Tarih
                                    </label>
                                    <ModernDatePicker value={date} onChange={setDate} />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                        Ödeme Kaynağı
                                    </label>
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: '1fr 1fr',
                                        gap: '4px',
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        padding: '4px',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('cash')}
                                            style={{
                                                border: 'none',
                                                background: paymentMethod === 'cash' ? 'var(--brand-primary)' : 'transparent',
                                                color: paymentMethod === 'cash' ? 'white' : 'var(--text-muted)',
                                                borderRadius: '8px',
                                                padding: '9px 4px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            💵 Nakit
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPaymentMethod('card')}
                                            style={{
                                                border: 'none',
                                                background: paymentMethod === 'card' ? 'var(--brand-primary)' : 'transparent',
                                                color: paymentMethod === 'card' ? 'white' : 'var(--text-muted)',
                                                borderRadius: '8px',
                                                padding: '9px 4px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            💳 Kart
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 4. KATEGORİ SEÇİMİ (6 KATEGORİ KARTLARI) */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                                    Harcama Kategorisi *
                                </label>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                    {categories.map(cat => {
                                        const isSelected = category === cat.id;
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setCategory(cat.id)}
                                                style={{
                                                    border: isSelected ? `1.5px solid ${cat.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: isSelected ? `${cat.color}22` : 'rgba(0, 0, 0, 0.3)',
                                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                                    borderRadius: '12px',
                                                    padding: '10px 12px',
                                                    fontSize: '12px',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    textAlign: 'left',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* 5. NOT / EK AÇIKLAMA */}
                            <div>
                                <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
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
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            {/* Çekmece Alt Butonları (Sabit Footer) */}
                            <div style={{
                                marginTop: 'auto',
                                paddingTop: '16px',
                                display: 'flex',
                                gap: '10px'
                            }}>
                                {editingExpense && (
                                    <button
                                        type="button"
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
                                    </button>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
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
                                        background: editingExpense 
                                            ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                                            : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                        color: 'white',
                                        border: 'none',
                                        cursor: 'pointer',
                                        boxShadow: editingExpense
                                            ? '0 4px 14px rgba(2, 132, 199, 0.35)'
                                            : '0 4px 14px rgba(234, 88, 12, 0.35)'
                                    }}
                                >
                                    <CheckCircle2 size={18} />
                                    <span>
                                        {isSubmitting 
                                            ? 'Kaydediliyor...' 
                                            : (editingExpense ? 'Değişiklikleri Kaydet' : 'Gideri Kasadan Düş & Kaydet')
                                        }
                                    </span>
                                </button>
                            </div>
                        </form>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
