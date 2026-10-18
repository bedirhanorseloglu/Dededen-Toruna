import React from 'react';
import { 
    X, 
    RotateCcw, 
    TrendingUp, 
    ShoppingBag, 
    Receipt, 
    Award, 
    Calendar, 
    CalendarDays,
    Clock, 
    Banknote,
    CreditCard
} from 'lucide-react';
import { formatMoney } from '../data/menu';

export default function StaffPerformanceModal({
    staff,
    data,
    period,
    setPeriod,
    onClose,
    onResetStats,
    isResettingStats
}) {
    if (!staff) return null;

    const selectedStaffForPerformance = staff;
    const staffPerformanceData = data;
    const perfPeriod = period;
    const setPerfPeriod = setPeriod;
    const setSelectedStaffForPerformance = onClose;
    const handleResetStaffStats = onResetStats;

    return (
        <div 
            className="modal-overlay open" 
            style={{ display: 'flex', opacity: 1, zIndex: 1050 }} 
            onClick={onClose}
        >
            <div 
                className="modal-content open modal-responsive-card" 
                style={{ 
                    maxWidth: '780px', 
                    width: '95%', 
                    maxHeight: '92dvh', 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: 0,
                    overflow: 'hidden'
                }}
                onClick={(e) => e.stopPropagation()}
            >
{/* STICKY HEADER */}
                        <div style={{
                            padding: '18px 24px',
                            borderBottom: '1px solid var(--border-card)',
                            background: 'var(--bg-surface-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            flexShrink: 0
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{
                                    width: '46px',
                                    height: '46px',
                                    borderRadius: '12px',
                                    background: selectedStaffForPerformance.tagBg,
                                    border: `1px solid ${selectedStaffForPerformance.color}50`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '22px'
                                }}>
                                    {selectedStaffForPerformance.icon}
                                </div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <h3 style={{ fontSize: '19px', fontWeight: 900, color: 'white', margin: 0 }}>
                                            {selectedStaffForPerformance.name}
                                        </h3>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            color: selectedStaffForPerformance.color,
                                            background: selectedStaffForPerformance.tagBg,
                                            padding: '2px 8px',
                                            borderRadius: '4px',
                                            textTransform: 'uppercase'
                                        }}>
                                            {selectedStaffForPerformance.roleLabel}
                                        </span>
                                    </div>
                                    <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                                        📊 Günlük, Haftalık ve Aylık Satış / Servis Performansı
                                    </p>
                                </div>
                            </div>

                            <button 
                                onClick={() => setSelectedStaffForPerformance(null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: 'none',
                                    color: 'var(--text-muted)',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* SCROLLABLE BODY */}
                        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            {/* DÖNEM SEÇİCİ TABLAR */}
                            <div style={{
                                display: 'flex',
                                gap: '8px',
                                background: 'var(--bg-surface)',
                                padding: '6px',
                                borderRadius: '12px',
                                border: '1px solid var(--border-subtle)',
                                flexWrap: 'wrap'
                            }}>
                                {[
                                    { id: 'today', label: 'Bugün', icon: Clock },
                                    { id: 'week', label: 'Bu Hafta (7 Gün)', icon: Calendar },
                                    { id: 'month', label: 'Bu Ay', icon: CalendarDays },
                                    { id: 'all', label: 'Tüm Zamanlar', icon: TrendingUp }
                                ].map(p => {
                                    const Icon = p.icon;
                                    const isActive = perfPeriod === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => setPerfPeriod(p.id)}
                                            style={{
                                                flex: 1,
                                                minWidth: '120px',
                                                padding: '9px 12px',
                                                borderRadius: '8px',
                                                border: isActive ? '1px solid var(--brand-gold)' : '1px solid transparent',
                                                background: isActive ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                                                color: isActive ? 'var(--brand-gold)' : 'var(--text-secondary)',
                                                fontWeight: isActive ? 800 : 600,
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Icon size={15} />
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 4 KPI METRİK KARTI */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                                gap: '12px'
                            }}>
                                {/* Ciro */}
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Dönem Cirosu
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#ffd43b', fontFamily: 'monospace' }}>
                                        {formatMoney(staffPerformanceData?.revenue || 0)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {perfPeriod === 'today' ? 'Bugünkü hasılat' : (perfPeriod === 'week' ? 'Son 7 günlük hasılat' : (perfPeriod === 'month' ? 'Bu ayki hasılat' : 'Kayıtlı toplam ciro'))}
                                    </div>
                                </div>

                                {/* Sipariş Sayısı */}
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Alınan Sipariş
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: 'white' }}>
                                        {staffPerformanceData?.ordersCount || 0} Adet
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Kapatılan masa adisyonu
                                    </div>
                                </div>

                                {/* Ortalama Masa / Adisyon */}
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Ort. Masa Tutarı
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#38bdf8', fontFamily: 'monospace' }}>
                                        {formatMoney(staffPerformanceData?.avgOrder || 0)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Masa başı ortalama harcama
                                    </div>
                                </div>

                                {/* Toplam Satılan Kalem */}
                                <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-card)', borderRadius: '12px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                        Satılan Kalem
                                    </div>
                                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981' }}>
                                        {staffPerformanceData?.totalItemsSold || 0} Adet
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Siparişi alınan ürün adedi
                                    </div>
                                </div>
                            </div>

                            {/* TAHSİLAT DAĞILIMI (NAKİT / KART) */}
                            <div style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-card)',
                                borderRadius: '12px',
                                padding: '14px 18px'
                            }}>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: 'white', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Receipt size={14} style={{ color: 'var(--brand-gold)' }} />
                                    Tahsilat Dağılımı ({perfPeriod === 'today' ? 'Bugün' : (perfPeriod === 'week' ? 'Bu Hafta' : (perfPeriod === 'month' ? 'Bu Ay' : 'Tüm Dönem'))})
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10b981', fontWeight: 700 }}>
                                            <Banknote size={15} /> Nakit Tahsilat
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginTop: '4px', fontFamily: 'monospace' }}>
                                            {formatMoney(staffPerformanceData?.cashRevenue || 0)}
                                        </div>
                                    </div>
                                    <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3b82f6', fontWeight: 700 }}>
                                            <CreditCard size={15} /> Kredi Kartı
                                        </div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginTop: '4px', fontFamily: 'monospace' }}>
                                            {formatMoney(staffPerformanceData?.cardRevenue || 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* EN ÇOK SATTIĞI ÜRÜNLER (TOP PRODUCTS) */}
                            <div style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-card)',
                                borderRadius: '12px',
                                padding: '16px 18px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Award size={15} style={{ color: 'var(--brand-gold)' }} />
                                        En Çok Satışını Yaptığı Ürünler
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {staffPerformanceData?.topProducts?.length || 0} Farklı Kalem
                                    </span>
                                </div>

                                {!staffPerformanceData?.topProducts?.length ? (
                                    <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        Seçilen dönemde satılan ürün kaydı bulunmuyor.
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {staffPerformanceData.topProducts.map((p, idx) => (
                                            <div 
                                                key={idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '9px 12px',
                                                    background: 'var(--bg-surface-elevated)',
                                                    borderRadius: '8px',
                                                    border: '1px solid var(--border-subtle)',
                                                    fontSize: '13px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <span style={{
                                                        width: '22px',
                                                        height: '22px',
                                                        borderRadius: '6px',
                                                        background: idx === 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                                        color: idx === 0 ? 'var(--brand-gold)' : 'var(--text-muted)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 800
                                                    }}>
                                                        {idx + 1}
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: 'white' }}>{p.name}</span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                    <span style={{ color: '#10b981', fontWeight: 800 }}>{p.quantity} Adet</span>
                                                    <span style={{ color: '#ffd43b', fontWeight: 800, fontFamily: 'monospace' }}>{formatMoney(p.revenue)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* DÖNEMDEKİ TAMAMLANAN SİPARİŞ GEÇMİŞİ */}
                            <div style={{
                                background: 'var(--bg-surface)',
                                border: '1px solid var(--border-card)',
                                borderRadius: '12px',
                                padding: '16px 18px'
                            }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <ShoppingBag size={15} style={{ color: '#38bdf8' }} />
                                        Kapanan Masa & Sipariş Geçmişi
                                    </span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                        {staffPerformanceData?.orders?.length || 0} Adisyon
                                    </span>
                                </div>

                                {!staffPerformanceData?.orders?.length ? (
                                    <div style={{ textAlign: 'center', padding: '20px 10px', color: 'var(--text-muted)', fontSize: '13px' }}>
                                        Seçilen dönemde tamamlanan adisyon kaydı bulunmuyor.
                                    </div>
                                ) : (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {staffPerformanceData.orders.map((o, idx) => {
                                            const orderDate = o.closed_at || o.created_at || '';
                                            const dateFormatted = orderDate ? new Date(orderDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                                            return (
                                                <div 
                                                    key={o.id || idx}
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'space-between',
                                                        padding: '8px 12px',
                                                        background: 'var(--bg-surface-elevated)',
                                                        borderRadius: '8px',
                                                        border: '1px solid var(--border-subtle)',
                                                        fontSize: '12px'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <span style={{ fontWeight: 800, color: 'white', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px' }}>
                                                            Masa {o.table_no || o.table_number || '?'}
                                                        </span>
                                                        <span style={{ color: 'var(--text-muted)' }}>{dateFormatted}</span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>({(o.items || []).length} kalem)</span>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ 
                                                            fontSize: '10px', 
                                                            fontWeight: 800, 
                                                            padding: '2px 6px', 
                                                            borderRadius: '4px',
                                                            background: o.payment_method === 'card' ? 'rgba(59,130,246,0.15)' : 'rgba(16,185,129,0.15)',
                                                            color: o.payment_method === 'card' ? '#3b82f6' : '#10b981'
                                                        }}>
                                                            {o.payment_method === 'card' ? 'KART' : 'NAKİT'}
                                                        </span>
                                                        <span style={{ fontWeight: 900, color: '#ffd43b', fontFamily: 'monospace' }}>
                                                            {formatMoney(o.total || 0)}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* STICKY FOOTER */}
                        <div style={{
                            padding: '14px 24px',
                            borderTop: '1px solid var(--border-card)',
                            background: 'var(--bg-surface-elevated)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '12px',
                            flexShrink: 0
                        }}>
                            <button
                                type="button"
                                disabled={isResettingStats}
                                onClick={(e) => handleResetStaffStats(selectedStaffForPerformance, e)}
                                style={{
                                    padding: '9px 16px',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                    borderRadius: '8px',
                                    color: '#f87171',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: isResettingStats ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                                title="Bu personelin birikmiş sayaçlarını sıfırlar"
                            >
                                <RotateCcw size={14} />
                                {isResettingStats ? 'Sıfırlanıyor...' : 'Personel Sayacını Sıfırla'}
                            </button>

                            <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '9px 20px', fontSize: '13px' }}
                                onClick={() => setSelectedStaffForPerformance(null)}
                            >
                                Kapat
                            </button>
                        </div>
                    </div>
        </div>
    );
}
