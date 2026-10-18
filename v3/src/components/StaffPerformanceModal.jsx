import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
    CreditCard,
    Utensils,
    ShieldCheck
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

    const staffPerformanceData = data;
    const perfPeriod = period;
    const setPerfPeriod = setPeriod;

    // (Patron) veya parantez ifadelerini temizleyip baş harf üret
    const getInitials = (name) => {
        if (!name) return 'Y';
        const clean = name.replace(/\(.*?\)/g, '').trim();
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'Y';
        if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
        return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
    };

    // İsimden (Patron) temizle
    const cleanStaffName = String(staff.name || '').replace(/\s*\(Patron\)/gi, '').trim() || 'Personel';
    const initials = getInitials(cleanStaffName);
    const isManager = staff.role === 'admin';

    const periods = [
        { id: 'today', label: 'Bugün', icon: Clock },
        { id: 'week', label: 'Bu Hafta', icon: Calendar },
        { id: 'month', label: 'Bu Ay', icon: CalendarDays },
        { id: 'all', label: 'Tüm Zamanlar', icon: TrendingUp }
    ];

    const modalContent = (
        <AnimatePresence>
            <div 
                style={{ 
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                    zIndex: 999999,
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px 16px',
                    backgroundColor: 'rgba(8, 6, 5, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    overflowY: 'auto'
                }} 
                onClick={onClose}
            >
                <motion.div 
                    initial={{ opacity: 0, scale: 0.96, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 15 }}
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ 
                        maxWidth: '740px', 
                        width: '100%', 
                        height: 'min(86vh, 780px)', 
                        minHeight: 'min(520px, 90vh)',
                        display: 'flex', 
                        flexDirection: 'column',
                        margin: 'auto',
                        padding: 0,
                        overflow: 'hidden',
                        background: 'linear-gradient(180deg, #1c1514 0%, #140e0d 100%)',
                        border: '1px solid rgba(245, 159, 0, 0.25)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.22)',
                        borderRadius: '20px',
                        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
                        position: 'relative'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* 1. ÜST HEADER: Sabit (Asla kaymaz / flexShrink: 0) */}
                    <div style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(28, 21, 20, 0.95)',
                        backdropFilter: 'blur(12px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        flexShrink: 0,
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            {/* Dairesel Avatar */}
                            <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '50%',
                                background: isManager 
                                    ? 'linear-gradient(135deg, rgba(245, 159, 0, 0.25) 0%, rgba(217, 119, 6, 0.15) 100%)' 
                                    : 'linear-gradient(135deg, rgba(247, 103, 7, 0.25) 0%, rgba(217, 72, 15, 0.15) 100%)',
                                border: `1.5px solid ${isManager ? 'rgba(245, 159, 0, 0.4)' : 'rgba(247, 103, 7, 0.4)'}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: isManager ? '#f59f00' : '#f76707',
                                fontSize: '15px',
                                fontWeight: 800,
                                boxShadow: `0 0 16px ${isManager ? 'rgba(245, 159, 0, 0.2)' : 'rgba(247, 103, 7, 0.2)'}`,
                                flexShrink: 0
                            }}>
                                {initials}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <h3 style={{ 
                                        fontSize: '17px', 
                                        fontWeight: 800, 
                                        color: '#fffaf5', 
                                        margin: 0,
                                        letterSpacing: '-0.02em',
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {cleanStaffName}
                                    </h3>
                                    <span style={{
                                        fontSize: '10px',
                                        fontWeight: 800,
                                        color: isManager ? '#f59f00' : '#f76707',
                                        background: isManager ? 'rgba(245, 159, 0, 0.12)' : 'rgba(247, 103, 7, 0.12)',
                                        border: `1px solid ${isManager ? 'rgba(245, 159, 0, 0.25)' : 'rgba(247, 103, 7, 0.25)'}`,
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.04em'
                                    }}>
                                        {isManager ? 'Yönetici' : 'Garson'}
                                    </span>
                                    <span style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background: '#10b981',
                                        boxShadow: '0 0 6px #10b981'
                                    }} />
                                </div>
                                <p style={{ 
                                    margin: '2px 0 0 0', 
                                    fontSize: '12px', 
                                    color: 'var(--text-secondary, #d1b8af)' 
                                }}>
                                    Satış & Servis Performans Raporu
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: 'rgba(255, 255, 255, 0.7)',
                                width: '32px',
                                height: '32px',
                                borderRadius: '9px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0
                            }}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* 2. DÖNEM SEÇİCİ TABLAR (Sabit, Header'ın hemen altında / flexShrink: 0) */}
                    <div style={{
                        padding: '10px 20px',
                        background: 'rgba(20, 14, 13, 0.85)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        flexShrink: 0,
                        zIndex: 1
                    }}>
                        <div style={{
                            display: 'flex',
                            gap: '6px',
                            overflowX: 'auto',
                            WebkitOverflowScrolling: 'touch'
                        }}>
                            {periods.map(p => {
                                const Icon = p.icon;
                                const isActive = perfPeriod === p.id;
                                return (
                                    <button
                                        key={p.id}
                                        onClick={() => setPerfPeriod(p.id)}
                                        style={{
                                            flex: '1 1 0px',
                                            minWidth: 'fit-content',
                                            padding: '8px 12px',
                                            borderRadius: '9px',
                                            border: isActive ? '1px solid rgba(247, 103, 7, 0.5)' : '1px solid rgba(255, 255, 255, 0.06)',
                                            background: isActive 
                                                ? 'linear-gradient(135deg, rgba(247, 103, 7, 0.22) 0%, rgba(245, 159, 0, 0.12) 100%)' 
                                                : 'rgba(255, 255, 255, 0.03)',
                                            color: isActive ? '#f59f00' : 'var(--text-secondary, #d1b8af)',
                                            fontWeight: isActive ? 800 : 600,
                                            fontSize: '12px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            whiteSpace: 'nowrap',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                                        }}
                                    >
                                        <Icon size={13} />
                                        <span>{p.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* 3. İÇERİK BÖLÜMÜ: SADECE BURASI SCROLL EDER (flex: 1, minHeight: 0, overflowY: auto) */}
                    <div style={{ 
                        padding: '16px 20px', 
                        overflowY: 'auto', 
                        flex: '1 1 0px',
                        minHeight: 0,
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '16px' 
                    }}>
                        {/* 4 KPI METRİK KARTI (Responsive 2x2 veya 4x1) */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                            gap: '10px'
                        }}>
                            {/* 1. Dönem Cirosu */}
                            <div style={{ 
                                background: 'linear-gradient(180deg, rgba(38, 27, 25, 0.7) 0%, rgba(24, 17, 16, 0.8) 100%)', 
                                border: '1px solid rgba(245, 159, 0, 0.18)', 
                                borderTop: '1px solid rgba(245, 159, 0, 0.35)',
                                borderRadius: '14px', 
                                padding: '12px 14px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Dönem Cirosu
                                    </span>
                                    <TrendingUp size={13} color="#f59f00" />
                                </div>
                                <div style={{ 
                                    fontSize: '20px', 
                                    fontWeight: 800, 
                                    color: '#f59f00', 
                                    marginTop: '4px',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.02em'
                                }}>
                                    {formatMoney(staffPerformanceData?.revenue || 0)}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #8d736b)', marginTop: '3px' }}>
                                    {perfPeriod === 'today' ? 'Bugünkü hasılat' : (perfPeriod === 'week' ? 'Son 7 günlük' : (perfPeriod === 'month' ? 'Bu ayki' : 'Toplam ciro'))}
                                </div>
                            </div>

                            {/* 2. Sipariş Sayısı */}
                            <div style={{ 
                                background: 'linear-gradient(180deg, rgba(38, 27, 25, 0.7) 0%, rgba(24, 17, 16, 0.8) 100%)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)', 
                                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '14px', 
                                padding: '12px 14px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Alınan Sipariş
                                    </span>
                                    <ShoppingBag size={13} color="#f76707" />
                                </div>
                                <div style={{ 
                                    fontSize: '20px', 
                                    fontWeight: 800, 
                                    color: '#fffaf5', 
                                    marginTop: '4px',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.02em'
                                }}>
                                    {staffPerformanceData?.ordersCount || 0} <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>Adet</span>
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #8d736b)', marginTop: '3px' }}>
                                    Kapanan adisyon
                                </div>
                            </div>

                            {/* 3. Ortalama Masa Tutarı */}
                            <div style={{ 
                                background: 'linear-gradient(180deg, rgba(38, 27, 25, 0.7) 0%, rgba(24, 17, 16, 0.8) 100%)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)', 
                                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '14px', 
                                padding: '12px 14px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Ort. Masa
                                    </span>
                                    <Receipt size={13} color="#f59f00" />
                                </div>
                                <div style={{ 
                                    fontSize: '20px', 
                                    fontWeight: 800, 
                                    color: '#fffaf5', 
                                    marginTop: '4px',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.02em'
                                }}>
                                    {formatMoney(staffPerformanceData?.avgOrder || 0)}
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #8d736b)', marginTop: '3px' }}>
                                    Masa başı ortalama
                                </div>
                            </div>

                            {/* 4. Satılan Kalem */}
                            <div style={{ 
                                background: 'linear-gradient(180deg, rgba(38, 27, 25, 0.7) 0%, rgba(24, 17, 16, 0.8) 100%)', 
                                border: '1px solid rgba(255, 255, 255, 0.08)', 
                                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '14px', 
                                padding: '12px 14px' 
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Satılan Kalem
                                    </span>
                                    <Utensils size={13} color="#f76707" />
                                </div>
                                <div style={{ 
                                    fontSize: '20px', 
                                    fontWeight: 800, 
                                    color: '#f76707', 
                                    marginTop: '4px',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    letterSpacing: '-0.02em'
                                }}>
                                    {staffPerformanceData?.totalItemsSold || 0} <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(247, 103, 7, 0.7)' }}>Kalem</span>
                                </div>
                                <div style={{ fontSize: '10.5px', color: 'var(--text-muted, #8d736b)', marginTop: '3px' }}>
                                    Servis edilen ürün
                                </div>
                            </div>
                        </div>

                        {/* TAHSİLAT DAĞILIMI (Nakit = Yeşil #10b981 | Kart = Mavi #3b82f6) */}
                        <div style={{
                            background: 'rgba(28, 21, 20, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '14px',
                            padding: '14px 16px'
                        }}>
                            <div style={{ fontSize: '12px', fontWeight: 800, color: '#fffaf5', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Receipt size={14} color="#f59f00" />
                                <span>Tahsilat Dağılımı ({perfPeriod === 'today' ? 'Bugün' : (perfPeriod === 'week' ? 'Bu Hafta' : (perfPeriod === 'month' ? 'Bu Ay' : 'Tüm Dönem'))})</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                                {/* NAKİT TAHSİLAT: YEŞİL */}
                                <div style={{ 
                                    background: 'rgba(16, 185, 129, 0.08)', 
                                    border: '1px solid rgba(16, 185, 129, 0.28)', 
                                    borderRadius: '10px', 
                                    padding: '10px 14px' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#10b981', fontWeight: 800 }}>
                                        <Banknote size={15} /> Nakit Tahsilat
                                    </div>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#10b981', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        {formatMoney(staffPerformanceData?.cashRevenue || 0)}
                                    </div>
                                </div>

                                {/* KART TAHSİLAT: MAVİ */}
                                <div style={{ 
                                    background: 'rgba(59, 130, 246, 0.08)', 
                                    border: '1px solid rgba(59, 130, 246, 0.28)', 
                                    borderRadius: '10px', 
                                    padding: '10px 14px' 
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#3b82f6', fontWeight: 800 }}>
                                        <CreditCard size={15} /> Kredi Kartı
                                    </div>
                                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#3b82f6', marginTop: '4px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        {formatMoney(staffPerformanceData?.cardRevenue || 0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* EN ÇOK SATTIĞI ÜRÜNLER (TOP PRODUCTS) */}
                        <div style={{
                            background: 'rgba(28, 21, 20, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '14px',
                            padding: '14px 16px'
                        }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#fffaf5', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Award size={14} color="#f59f00" />
                                    <span>En Çok Satışını Yaptığı Ürünler</span>
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted, #8d736b)', fontWeight: 600 }}>
                                    {staffPerformanceData?.topProducts?.length || 0} Farklı Kalem
                                </span>
                            </div>

                            {!staffPerformanceData?.topProducts?.length ? (
                                <div style={{ textAlign: 'center', padding: '16px 10px', color: 'var(--text-muted, #8d736b)', fontSize: '12px' }}>
                                    Seçilen dönemde satılan ürün kaydı bulunmuyor.
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {staffPerformanceData.topProducts.map((p, idx) => (
                                        <div 
                                            key={idx}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '8px 12px',
                                                background: 'rgba(40, 30, 28, 0.6)',
                                                borderRadius: '9px',
                                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                                fontSize: '12.5px',
                                                gap: '8px'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                                                <span style={{
                                                    width: '20px',
                                                    height: '20px',
                                                    borderRadius: '5px',
                                                    background: idx === 0 ? 'rgba(245, 159, 0, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                                                    color: idx === 0 ? '#f59f00' : 'var(--text-secondary, #d1b8af)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    fontSize: '10.5px',
                                                    fontWeight: 800,
                                                    flexShrink: 0
                                                }}>
                                                    {idx + 1}
                                                </span>
                                                <span style={{ 
                                                    fontWeight: 700, 
                                                    color: '#fffaf5',
                                                    overflow: 'hidden',
                                                    textOverflow: 'ellipsis',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {p.name}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                                <span style={{ color: 'var(--text-secondary, #d1b8af)', fontWeight: 600, fontSize: '11.5px' }}>
                                                    {p.quantity} Adet
                                                </span>
                                                <span style={{ color: '#f59f00', fontWeight: 800, fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                    {formatMoney(p.revenue)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* DÖNEMDEKİ TAMAMLANAN SİPARİŞ GEÇMİŞİ */}
                        <div style={{
                            background: 'rgba(28, 21, 20, 0.6)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '14px',
                            padding: '14px 16px'
                        }}>
                            <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#fffaf5', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <ShoppingBag size={14} color="#f76707" />
                                    <span>Kapanan Masa & Sipariş Geçmişi</span>
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted, #8d736b)', fontWeight: 600 }}>
                                    {staffPerformanceData?.orders?.length || 0} Adisyon
                                </span>
                            </div>

                            {!staffPerformanceData?.orders?.length ? (
                                <div style={{ textAlign: 'center', padding: '16px 10px', color: 'var(--text-muted, #8d736b)', fontSize: '12px' }}>
                                    Seçilen dönemde tamamlanan adisyon kaydı bulunmuyor.
                                </div>
                            ) : (
                                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {staffPerformanceData.orders.map((o, idx) => {
                                        const orderDate = o.closed_at || o.created_at || '';
                                        const dateFormatted = orderDate ? new Date(orderDate).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                                        const isCard = o.payment_method === 'card';

                                        return (
                                            <div 
                                                key={o.id || idx}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    padding: '8px 10px',
                                                    background: 'rgba(40, 30, 28, 0.5)',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.04)',
                                                    fontSize: '12px',
                                                    gap: '8px'
                                                }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                                    <span style={{ fontWeight: 800, color: '#fffaf5', background: 'rgba(255,255,255,0.08)', padding: '2px 7px', borderRadius: '4px', flexShrink: 0 }}>
                                                        Masa {o.table_no || o.table_number || '?'}
                                                    </span>
                                                    <span style={{ color: 'var(--text-muted, #8d736b)', fontSize: '11px', whiteSpace: 'nowrap' }}>
                                                        {dateFormatted}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                                    {/* KART: MAVİ | NAKİT: YEŞİL */}
                                                    <span style={{ 
                                                        fontSize: '9.5px', 
                                                        fontWeight: 800, 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px',
                                                        background: isCard ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                                                        color: isCard ? '#3b82f6' : '#10b981',
                                                        border: `1px solid ${isCard ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
                                                    }}>
                                                        {isCard ? 'KART' : 'NAKİT'}
                                                    </span>
                                                    <span style={{ fontWeight: 800, color: '#f59f00', fontSize: '12.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
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

                    {/* 4. ALT FOOTER: Sabit (Asla kaymaz / flexShrink: 0) */}
                    <div style={{
                        padding: '12px 20px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(28, 21, 20, 0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '10px',
                        flexShrink: 0,
                        position: 'relative',
                        zIndex: 2
                    }}>
                        <button
                            type="button"
                            disabled={isResettingStats}
                            onClick={(e) => onResetStats(staff, e)}
                            style={{
                                padding: '8px 12px',
                                background: 'rgba(239, 68, 68, 0.08)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: '8px',
                                color: '#f87171',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: isResettingStats ? 'not-allowed' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                            title="Bu personelin birikmiş sayaçlarını sıfırlar"
                        >
                            <RotateCcw size={13} />
                            {isResettingStats ? 'Sıfırlanıyor...' : 'Sayacı Sıfırla'}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            style={{ 
                                padding: '8px 22px', 
                                fontSize: '13px', 
                                fontWeight: 800,
                                background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '9px',
                                cursor: 'pointer',
                                boxShadow: '0 4px 14px rgba(247, 103, 7, 0.35)'
                            }}
                        >
                            Kapat
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );

    if (typeof document !== 'undefined') {
        return createPortal(modalContent, document.body);
    }
    return modalContent;
}
