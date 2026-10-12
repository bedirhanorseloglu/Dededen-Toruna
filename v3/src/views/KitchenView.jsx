import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ChefHat, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';

export default function KitchenView() {
    const { activeOrders, navigateTo, currentUser } = useApp();
    const [clock, setClock] = useState('');

    useEffect(() => {
        const update = () => {
            setClock(new Date().toLocaleTimeString('tr-TR'));
        };
        update();
        const id = setInterval(update, 1000);
        return () => clearInterval(id);
    }, []);

    // Filter cooking items
    const kitchenOrders = Object.values(activeOrders).filter(ord => {
        const items = ord.items || [];
        return items.some(i => i.status === 'cooking');
    });

    return (
        <div style={{ padding: '20px 24px', maxWidth: '1400px', margin: '0 auto' }}>
            {/* Passive Mode Notice Header */}
            <div style={{
                background: 'rgba(247, 103, 7, 0.12)',
                border: '1px solid rgba(247, 103, 7, 0.35)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ background: 'var(--brand-primary)', color: 'white', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                        <ChefHat size={22} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '15px', color: 'white' }}>
                            Mutfak Ekranı (Pasif Modda Korunuyor)
                        </div>
                        <div style={{ color: 'var(--brand-gold)', fontSize: '12px', marginTop: '2px' }}>
                            Müşteri kararı: Ürün teslimat işaretlemeleri Garson & Yönetici ekranlarından yapılmaktadır. Mutfak ekranı gelecekteki kullanım için hazır tutulmaktadır.
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '14px' }}>
                        🕒 {clock}
                    </div>
                    <button
                        onClick={() => navigateTo(currentUser?.role === 'admin' ? 'admin' : 'waiter')}
                        className="btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                    >
                        <ArrowLeft size={15} /> Geri Dön
                    </button>
                </div>
            </div>

            {/* KDS Kitchen Cards Board */}
            <div className="kitchen-board" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px'
            }}>
                {kitchenOrders.length === 0 ? (
                    <div style={{
                        gridColumn: '1 / -1',
                        textAlign: 'center',
                        padding: '60px 20px',
                        color: 'var(--text-muted)'
                    }}>
                        <ChefHat size={48} style={{ margin: '0 auto 12px auto', opacity: 0.4 }} />
                        <div style={{ fontWeight: 800, fontSize: '18px', color: 'var(--text-secondary)' }}>Mutfakta Bekleyen Yemek Yok</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>Tüm siparişler teslim edildi veya masalar müsait.</div>
                    </div>
                ) : (
                    kitchenOrders.map(ord => {
                        const cookingItems = (ord.items || []).filter(i => i.status === 'cooking');
                        return (
                            <div 
                                key={ord.id} 
                                className="kitchen-card urgent"
                                style={{
                                    background: 'var(--bg-surface)',
                                    border: '1px solid var(--border-card)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '16px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '10px'
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '17px', color: 'white' }}>
                                        Masa {ord.table_no}
                                    </span>
                                    <span style={{
                                        fontSize: '11px',
                                        color: 'var(--warning)',
                                        background: 'var(--warning-soft)',
                                        padding: '3px 8px',
                                        borderRadius: 'var(--radius-sm)',
                                        fontWeight: 800
                                    }}>
                                        {cookingItems.length} Kalem Hazırlanıyor
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {cookingItems.map((item, idx) => (
                                        <div 
                                            key={idx}
                                            style={{
                                                background: 'var(--bg-surface-elevated)',
                                                border: '1px solid var(--border-card)',
                                                padding: '8px 10px',
                                                borderRadius: 'var(--radius-sm)',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                fontSize: '13px',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <span style={{ fontWeight: 600 }}>{item.name}</span>
                                            <span style={{ fontWeight: 800, color: 'var(--brand-gold)' }}>x{item.quantity}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
