import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { formatMoney } from '../data/menu';
import { EXPENSE_CATEGORIES, formatTurkishDate } from './AdminExpenses';

export default function ExpenseCard({
    exp,
    onEdit,
    onDelete
}) {
    const cat = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
    const isCash = exp.payment_method === 'cash';
    const catColor = cat?.color || '#ef4444';

    return (
        <motion.div
            key={exp.id}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            whileHover={{ y: -3 }}
            className="admin-expense-grid-card"
            style={{ '--card-accent': catColor }}
            onClick={() => !exp.isOrderDiscount && onEdit?.(exp)}
        >
            {/* Kart Üst Bölüm: Kategori İkonu + Rozetler + Sağda Aksiyonlar */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: `${catColor}18`,
                        border: `1px solid ${catColor}35`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0
                    }}>
                        {cat?.icon || '📦'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{
                            background: `${catColor}18`,
                            color: catColor,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 800,
                            fontSize: '11px',
                            border: `1px solid ${catColor}30`,
                            width: 'fit-content'
                        }}>
                            {cat?.name || 'Genel'}
                        </span>
                        <span style={{
                            background: isCash ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                            color: isCash ? 'var(--brand-gold)' : '#38bdf8',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            fontSize: '11px',
                            border: isCash ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
                            width: 'fit-content'
                        }}>
                            {isCash ? '💵 Nakit' : '💳 Kart'}
                        </span>
                    </div>
                </div>

                {/* Aksiyon Butonları (Düzenle & Sil veya Adisyon İndirimi Rozeti) */}
                {exp.isOrderDiscount ? (
                    <span style={{
                        background: 'rgba(244, 63, 94, 0.15)',
                        color: '#f43f5e',
                        border: '1px solid rgba(244, 63, 94, 0.35)',
                        padding: '4px 9px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                    }}>
                        🏷️ Adisyon
                    </span>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.(exp);
                            }}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Düzenle"
                        >
                            <Pencil size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(exp);
                            }}
                            style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: '8px',
                                width: '30px',
                                height: '30px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#f87171',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Sil"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                )}
            </div>

            {/* Kart Orta Bölüm: Başlık & Tarih / Not */}
            <div style={{ margin: '14px 0 10px 0' }}>
                <div style={{
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'white',
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
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                    marginTop: '4px'
                }}>
                    <span>📅 {formatTurkishDate(exp.date || (exp.created_at ? exp.created_at.slice(0, 10) : ''))}</span>
                    {exp.notes && (
                        <>
                            <span>•</span>
                            <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                "{exp.notes}"
                            </span>
                        </>
                    )}
                </div>
            </div>

            {/* Kart Alt Bölüm: Tutar */}
            <div style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                paddingTop: '10px',
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                    {exp.isOrderDiscount ? 'İndirim Tutarı' : 'Harcama Tutarı'}
                </span>
                <span style={{ 
                    fontSize: '17px', 
                    fontWeight: 900, 
                    color: exp.isOrderDiscount ? '#f43f5e' : '#f87171', 
                    fontFamily: 'monospace' 
                }}>
                    -{formatMoney(exp.amount)}
                </span>
            </div>
        </motion.div>
    );
}
