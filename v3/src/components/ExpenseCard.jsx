import React from 'react';
import { motion } from 'framer-motion';
import { 
    Pencil, 
    Trash2, 
    UtensilsCrossed, 
    Coffee, 
    Users, 
    Receipt, 
    Wrench, 
    Package, 
    Wallet, 
    CreditCard, 
    Calendar,
    Tag
} from 'lucide-react';
import { formatMoney } from '../data/menu';
import { EXPENSE_CATEGORIES, formatTurkishDate } from './AdminExpenses';

const CATEGORY_ICONS = {
    mutfak: UtensilsCrossed,
    icecek: Coffee,
    personel: Users,
    faturalar: Receipt,
    sarf: Wrench,
    diger: Package
};

export default function ExpenseCard({
    exp,
    onEdit,
    onDelete
}) {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
    const isCash = exp.payment_method === 'cash';
    const catColor = cat?.color || '#ef4444';
    const CatIcon = CATEGORY_ICONS[exp.category] || Package;

    return (
        <motion.div
            key={exp.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -3 }}
            className="admin-expense-grid-card"
            style={{ 
                '--card-accent': catColor,
                position: 'relative',
                background: 'linear-gradient(145deg, rgba(30, 23, 21, 0.92) 0%, rgba(18, 14, 13, 0.98) 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '18px',
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '172px',
                boxShadow: '0 8px 24px -6px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                overflow: 'hidden'
            }}
            onClick={() => !exp.isOrderDiscount && onEdit?.(exp)}
        >
            {/* 21st.dev Katman 1: Ambient Glow Aura (Kategori renginde arkaya hafif yayılan ışık) */}
            <div style={{
                position: 'absolute',
                top: -24,
                right: -24,
                width: '110px',
                height: '110px',
                background: `radial-gradient(circle, ${catColor}16, transparent 70%)`,
                filter: 'blur(22px)',
                pointerEvents: 'none',
                zIndex: 0
            }} />

            {/* 1. ÜST BÖLÜM: Kategori Rozetleri + Aksiyon Butonları */}
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '11px',
                        background: `${catColor}15`,
                        border: `1px solid ${catColor}30`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: catColor,
                        flexShrink: 0
                    }}>
                        <CatIcon size={17} />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            background: `${catColor}14`,
                            color: catColor,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '11px',
                            border: `1px solid ${catColor}28`,
                            letterSpacing: '0.2px'
                        }}>
                            {cat?.name || 'Genel'}
                        </span>

                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: isCash ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                            color: isCash ? 'var(--brand-gold)' : '#38bdf8',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '11px',
                            border: isCash ? '1px solid rgba(245, 158, 11, 0.28)' : '1px solid rgba(56, 189, 248, 0.28)'
                        }}>
                            {isCash ? <Wallet size={11} /> : <CreditCard size={11} />}
                            <span>{isCash ? 'Nakit' : 'Kart'}</span>
                        </span>
                    </div>
                </div>

                {/* Aksiyon Butonları */}
                {exp.isOrderDiscount ? (
                    <span style={{
                        background: 'rgba(244, 63, 94, 0.14)',
                        color: '#f43f5e',
                        border: '1px solid rgba(244, 63, 94, 0.3)',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        <Tag size={11} /> Adisyon
                    </span>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(exp);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '8px',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer'
                            }}
                            title="Düzenle"
                        >
                            <Pencil size={12} />
                        </motion.button>
                        <motion.button
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(exp);
                            }}
                            style={{
                                background: 'rgba(239, 68, 68, 0.12)',
                                border: '1px solid rgba(239, 68, 68, 0.28)',
                                borderRadius: '8px',
                                width: '28px',
                                height: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#ef4444',
                                cursor: 'pointer'
                            }}
                            title="Sil"
                        >
                            <Trash2 size={12} />
                        </motion.button>
                    </div>
                )}
            </div>

            {/* 2. ORTA BÖLÜM: Harcama Başlığı & Tarih / Not */}
            <div style={{ position: 'relative', zIndex: 1, margin: '14px 0 10px 0' }}>
                <div style={{
                    fontSize: '17px',
                    fontWeight: 900,
                    color: 'white',
                    letterSpacing: '-0.3px',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    {exp.title}
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11.5px',
                    color: 'var(--text-muted)',
                    marginTop: '5px'
                }}>
                    <Calendar size={12} color="var(--brand-gold)" />
                    <span>{formatTurkishDate(exp.date || (exp.created_at ? exp.created_at.slice(0, 10) : ''))}</span>
                    {exp.notes && (
                        <>
                            <span style={{ opacity: 0.35 }}>•</span>
                            <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{exp.notes}"
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* 3. ALT BÖLÜM: Harcama Tutarı (Sans-Serif, Zengin Kırmızı/Rose Vurgusu) */}
            <div style={{
                position: 'relative',
                zIndex: 1,
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '10px',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {exp.isOrderDiscount ? 'İndirim Tutarı' : 'Harcama Tutarı'}
                </span>
                <span style={{ 
                    fontSize: '19px', 
                    fontWeight: 900, 
                    color: exp.isOrderDiscount ? '#f43f5e' : '#ef4444', 
                    letterSpacing: '-0.5px' 
                }}>
                    -{formatMoney(exp.amount)}
                </span>
            </div>
        </motion.div>
    );
}
