import React, { useState, useMemo } from 'react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    BarChart, 
    Bar, 
    PieChart, 
    Pie, 
    Cell, 
    XAxis, 
    YAxis, 
    Tooltip, 
    CartesianGrid,
    Legend
} from 'recharts';
import { formatMoney } from '../data/menu';
import { 
    TrendingUp, 
    CreditCard, 
    Banknote, 
    Receipt, 
    Calendar, 
    CalendarDays, 
    Clock, 
    Trophy, 
    Users, 
    Search,
    PieChart as PieIcon,
    BarChart3,
    ArrowUpRight,
    ShoppingBag,
    ChefHat,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw
} from 'lucide-react';

const COLORS = {
    gold: '#f59e0b',
    goldGlow: 'rgba(245, 158, 11, 0.25)',
    cash: '#10b981',
    card: '#3b82f6',
    purple: '#8b5cf6',
    orange: '#f97316',
    grid: 'rgba(255, 255, 255, 0.05)'
};

// Özel Koyu Cam Tasarımlı Tooltip
const CustomChartTooltip = ({ active, payload, label, unit = '₺' }) => {
    if (!active || !payload || !payload.length) return null;

    return (
        <div style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            fontSize: '13px',
            minWidth: '170px'
        }}>
            <div style={{ fontWeight: 800, color: 'white', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                {label}
            </div>
            {payload.map((entry, index) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', margin: '4px 0', fontSize: '12px' }}>
                    <span style={{ color: entry.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color }} />
                        {entry.name}:
                    </span>
                    <span style={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                        {unit === '₺' ? formatMoney(entry.value) : `${entry.value} ${unit}`}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function AdminAnalyticsDashboard({
    completedOrders = [],
    currentPeriod = 'today',
    setCurrentPeriod,
    weeklyDayStats = [],
    monthlyDayStats = [],
    productStats = [],
    waiterStats = [],
    productSearch = '',
    setProductSearch,
    handleResetAnalytics
}) {
    // Grafik Görünüm Modu: 'weekly' | 'monthly' | 'hourly'
    const [chartMode, setChartMode] = useState('weekly');
    const [activeDetailTab, setActiveDetailTab] = useState('weekly'); // 'weekly' | 'monthly'

    // Ürün Satış Karnesi Dinamik Sıralama
    const [productSortField, setProductSortField] = useState('revenue'); // 'revenue' | 'quantity' | 'name'
    const [productSortDirection, setProductSortDirection] = useState('desc'); // 'asc' | 'desc'

    // Garson Performans Karnesi Dinamik Sıralama
    const [waiterSortField, setWaiterSortField] = useState('revenue'); // 'revenue' | 'orderCount' | 'name'
    const [waiterSortDirection, setWaiterSortDirection] = useState('desc'); // 'asc' | 'desc'

    const handleProductSort = (field) => {
        if (productSortField === field) {
            setProductSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setProductSortField(field);
            setProductSortDirection(field === 'name' ? 'asc' : 'desc');
        }
    };

    const handleWaiterSort = (field) => {
        if (waiterSortField === field) {
            setWaiterSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setWaiterSortField(field);
            setWaiterSortDirection(field === 'name' ? 'asc' : 'desc');
        }
    };

    // Sıralanmış Ürün Verisi
    const sortedProductStats = useMemo(() => {
        const list = [...(productStats || [])];
        list.sort((a, b) => {
            if (productSortField === 'name') {
                const valA = (a.name || '').toLocaleLowerCase('tr-TR');
                const valB = (b.name || '').toLocaleLowerCase('tr-TR');
                return productSortDirection === 'asc' 
                    ? valA.localeCompare(valB, 'tr-TR') 
                    : valB.localeCompare(valA, 'tr-TR');
            } else if (productSortField === 'quantity') {
                const valA = Number(a.quantity) || 0;
                const valB = Number(b.quantity) || 0;
                return productSortDirection === 'asc' ? valA - valB : valB - valA;
            } else {
                const valA = Number(a.revenue) || 0;
                const valB = Number(b.revenue) || 0;
                return productSortDirection === 'asc' ? valA - valB : valB - valA;
            }
        });
        return list;
    }, [productStats, productSortField, productSortDirection]);

    // Sıralanmış Garson Verisi
    const sortedWaiterStats = useMemo(() => {
        const list = [...(waiterStats || [])];
        list.sort((a, b) => {
            if (waiterSortField === 'name') {
                const valA = (a.name || '').toLocaleLowerCase('tr-TR');
                const valB = (b.name || '').toLocaleLowerCase('tr-TR');
                return waiterSortDirection === 'asc' 
                    ? valA.localeCompare(valB, 'tr-TR') 
                    : valB.localeCompare(valA, 'tr-TR');
            } else if (waiterSortField === 'orderCount') {
                const valA = Number(a.orderCount) || 0;
                const valB = Number(b.orderCount) || 0;
                return waiterSortDirection === 'asc' ? valA - valB : valB - valA;
            } else {
                const valA = Number(a.revenue) || 0;
                const valB = Number(b.revenue) || 0;
                return waiterSortDirection === 'asc' ? valA - valB : valB - valA;
            }
        });
        return list;
    }, [waiterStats, waiterSortField, waiterSortDirection]);

    // Filtrelenmiş Siparişler
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return completedOrders.filter(o => {
            const t = new Date(o.created_at || o.closed_at || 0).getTime();
            if (currentPeriod === 'today') return t >= startOfToday;
            if (currentPeriod === 'week') return t >= startOfWeek;
            if (currentPeriod === 'month') return t >= startOfMonth;
            return true;
        });
    }, [completedOrders, currentPeriod]);

    // Finansal Metrikler
    const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cashTotal = filteredOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cardTotal = filteredOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;
    const cashPct = totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 50;
    const cardPct = totalRevenue > 0 ? Math.round((cardTotal / totalRevenue) * 100) : 50;
    const totalKitchenItemsCount = filteredOrders.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0), 0);

    // Pasta Grafik Verisi (Ödeme Yöntemi Dağılımı)
    const paymentPieData = useMemo(() => [
        { name: 'Nakit', value: cashTotal, pct: cashPct, color: COLORS.cash },
        { name: 'Kredi Kartı', value: cardTotal, pct: cardPct, color: COLORS.card }
    ], [cashTotal, cardTotal, cashPct, cardPct]);

    // En Çok Satan İlk 6 Ürün (Bar Chart Verisi)
    const topProductsChartData = useMemo(() => {
        return (productStats || []).slice(0, 6).map(p => ({
            name: p.name.length > 14 ? p.name.slice(0, 14) + '...' : p.name,
            fullName: p.name,
            quantity: p.quantity,
            revenue: p.revenue
        }));
    }, [productStats]);

    // Saatlik Sipariş Yoğunluğu (Peak Hours - 09:00 - 23:00)
    const hourlyChartData = useMemo(() => {
        const hoursMap = {};
        for (let h = 9; h <= 23; h++) {
            const label = `${String(h).padStart(2, '0')}:00`;
            hoursMap[label] = { hour: label, count: 0, revenue: 0 };
        }

        filteredOrders.forEach(o => {
            if (!o.created_at && !o.closed_at) return;
            const d = new Date(o.created_at || o.closed_at);
            const h = d.getHours();
            if (h >= 9 && h <= 23) {
                const label = `${String(h).padStart(2, '0')}:00`;
                if (hoursMap[label]) {
                    hoursMap[label].count += 1;
                    hoursMap[label].revenue += (Number(o.total) || 0);
                }
            }
        });

        return Object.values(hoursMap);
    }, [filteredOrders]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Üst Bar: Başlık ve Zaman Dilimi Filtresi */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: 'var(--bg-surface)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.3px', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--brand-gold)' }}>📊</span> Finansal Performans & Satış Analizi
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Restoran cirosu, lezzet satışları ve anlık grafik analizleri
                    </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="filter-pill-group">
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'today' ? 'active' : ''}`} 
                            onClick={() => setCurrentPeriod('today')}
                        >
                            Bugün
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'week' ? 'active' : ''}`} 
                            onClick={() => setCurrentPeriod('week')}
                        >
                            Bu Hafta
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'month' ? 'active' : ''}`} 
                            onClick={() => setCurrentPeriod('month')}
                        >
                            Bu Ay
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'all' ? 'active' : ''}`} 
                            onClick={() => setCurrentPeriod('all')}
                        >
                            Tüm Zamanlar
                        </button>
                    </div>

                    {handleResetAnalytics && (
                        <button 
                            onClick={handleResetAnalytics}
                            className="btn-outline"
                            style={{ 
                                padding: '6px 12px', 
                                fontSize: '12px', 
                                color: '#ef4444', 
                                borderColor: 'rgba(239, 68, 68, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px'
                            }}
                            title="Tüm satış ve ciro geçmişini sıfırla (Canlı lansman öncesi temizlik)"
                        >
                            <RotateCcw size={13} />
                            Sıfırla
                        </button>
                    )}
                </div>
            </div>

            {/* 4 BÜYÜK MODERN KPI KARTI */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '16px'
            }}>
                {/* 1. Net Ciro */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), var(--bg-surface))',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Toplam Net Ciro
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold)' }}>
                            <TrendingUp size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--brand-gold)', letterSpacing: '-0.5px' }}>
                        {formatMoney(totalRevenue)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={14} /> {orderCount} tamamlanan sipariş
                    </div>
                </div>

                {/* 2. Tahsilat Dağılımı (Nakit & Kart) */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tahsilat Dağılımı
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa' }}>
                            <CreditCard size={20} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, marginTop: '8px' }}>
                        <span style={{ color: COLORS.cash }}>💵 Nakit: {formatMoney(cashTotal)}</span>
                        <span style={{ color: COLORS.card }}>💳 Kart: {formatMoney(cardTotal)}</span>
                    </div>
                    {/* Dağılım Barı */}
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '99px', marginTop: '14px', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${cashPct}%`, background: COLORS.cash, height: '100%' }} title={`Nakit: %${cashPct}`} />
                        <div style={{ width: `${cardPct}%`, background: COLORS.card, height: '100%' }} title={`Kart: %${cardPct}`} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                        <span>%{cashPct} Nakit</span>
                        <span>%{cardPct} Kart</span>
                    </div>
                </div>

                {/* 3. Adisyon Sayısı */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Toplam Adisyon
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Receipt size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: 'white', letterSpacing: '-0.5px' }}>
                        {orderCount} <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Masa</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Kapatılan toplam masa hesabı
                    </div>
                </div>

                {/* 4. Ortalama Sepet Tutarı */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ortalama Masa Sepeti
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--brand-primary)', letterSpacing: '-0.5px' }}>
                        {formatMoney(avgOrder)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        Masa başına ortalama ciro
                    </div>
                </div>
            </div>

            {/* BÜYÜK İNTERAKTİF CİRO GRAFİĞİ (GÖRSELLEŞTİRME MERKEZİ) */}
            <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-card)',
                padding: '24px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginBottom: '20px'
                }}>
                    <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} className="text-amber-400" />
                            {chartMode === 'weekly' && 'Haftalık Ciro Dağılım Trendi (Pazartesi - Pazar)'}
                            {chartMode === 'monthly' && 'Bu Ay Gün Gün Ciro Eğrisi (1 - 31 Gün)'}
                            {chartMode === 'hourly' && 'Saatlik Sipariş & Ciro Yoğunluğu (09:00 - 23:00)'}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            Grafik üzerine gelerek detaylı gün ve saat dökümünü inceleyebilirsiniz
                        </p>
                    </div>

                    {/* Grafik Görünüm Seçici Butonları */}
                    <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
                        <button
                            onClick={() => setChartMode('weekly')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: chartMode === 'weekly' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                                color: chartMode === 'weekly' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            📅 Bu Hafta
                        </button>
                        <button
                            onClick={() => setChartMode('monthly')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: chartMode === 'monthly' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                                color: chartMode === 'monthly' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            🗓️ Bu Ay
                        </button>
                        <button
                            onClick={() => setChartMode('hourly')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: chartMode === 'hourly' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                                color: chartMode === 'hourly' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ⏰ Saatlik Yoğunluk
                        </button>
                    </div>
                </div>

                {/* Grafik Çizim Alanı (Recharts) */}
                <div style={{ width: '100%', height: '320px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                        {chartMode === 'weekly' ? (
                            <AreaChart data={weeklyDayStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.cash} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.cash} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradCard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.card} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.card} stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                                <XAxis dataKey="dayName" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area type="monotone" dataKey="revenue" name="Toplam Ciro" stroke={COLORS.gold} strokeWidth={3} fillOpacity={1} fill="url(#gradRevenue)" />
                                <Area type="monotone" dataKey="cash" name="Nakit" stroke={COLORS.cash} strokeWidth={2} fillOpacity={1} fill="url(#gradCash)" />
                                <Area type="monotone" dataKey="card" name="Kredi Kartı" stroke={COLORS.card} strokeWidth={2} fillOpacity={1} fill="url(#gradCard)" />
                            </AreaChart>
                        ) : chartMode === 'monthly' ? (
                            <AreaChart data={monthlyDayStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradMonthly" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                                <XAxis dataKey="dayNumber" stroke="var(--text-muted)" fontSize={11} tickFormatter={(d) => `${d}. gün`} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                <Tooltip content={<CustomChartTooltip label={monthlyDayStats.dateDisplay} />} />
                                <Area type="monotone" dataKey="revenue" name="Günlük Ciro" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#gradMonthly)" />
                            </AreaChart>
                        ) : (
                            <AreaChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradHourly" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.45} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Saatlik Ciro" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#gradHourly)" />
                                <Bar yAxisId="right" dataKey="count" name="Sipariş Adedi" fill="#38bdf8" radius={[4, 4, 0, 0]} opacity={0.7} />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* İKİ SÜTUNLU GÖRSEL ANALİZ KARTLARI (PASTA & EN ÇOK SATANLAR GRAFİĞİ) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
                gap: '20px'
            }}>
                {/* 1. Ödeme Dağılımı Donut Grafiği */}
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-card)',
                    padding: '22px',
                    boxShadow: 'var(--shadow-soft)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PieIcon size={18} className="text-emerald-400" />
                            Kasa Tahsilat Oranları (Nakit / Kart)
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Cironun ödeme yöntemlerine göre görsel dağılımı
                        </p>
                    </div>

                    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={85}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {paymentPieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="transparent" />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomChartTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                        {/* Ortadaki Gösterge */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none'
                        }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700 }}>TOPLAM</div>
                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'white' }}>{formatMoney(totalRevenue)}</div>
                        </div>
                    </div>

                    {/* Detay Açıklamaları */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: 'auto', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: COLORS.cash, fontWeight: 700 }}>💵 Nakit Kasa</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: '2px 0' }}>{formatMoney(cashTotal)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>%{cashPct} Oran</div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '11px', color: COLORS.card, fontWeight: 700 }}>💳 Kredi Kartı</div>
                            <div style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: '2px 0' }}>{formatMoney(cardTotal)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>%{cardPct} Oran</div>
                        </div>
                    </div>
                </div>

                {/* 2. En Çok Satan Lezzetler Bar Grafiği */}
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-card)',
                    padding: '22px',
                    boxShadow: 'var(--shadow-soft)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ marginBottom: '14px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Trophy size={18} className="text-amber-400" />
                            En Çok Satan Top 6 Lezzet
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Restoranın en popüler ürünlerinin adet dökümü
                        </p>
                    </div>

                    <div style={{ width: '100%', height: '260px' }}>
                        {topProductsChartData.length === 0 ? (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                                Henüz satış kaydı bulunmuyor.
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                                    <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                    <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} width={90} />
                                    <Tooltip content={<CustomChartTooltip unit="adet" />} />
                                    <Bar dataKey="quantity" name="Satış Adedi" fill="var(--brand-primary)" radius={[0, 6, 6, 0]}>
                                        {topProductsChartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={index === 0 ? 'var(--brand-gold)' : (index === 1 ? '#f97316' : '#ea580c')} 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>
            </div>

            {/* DETAYLI ANALİZ TABLOLARI (AKILLI TABLOLAR) */}
            <div className="analytics-grid">
                {/* Sol Sütun: En Çok Satan Lezzetler Tablosu (Arama Kutulu) */}
                <div style={{ background: 'var(--bg-surface)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'white' }}>🏆 Tüm Ürün Satış Karnesi</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>Hangi üründen kaç adet satıldı, ne kadar ciro sağladı?</p>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="text" 
                                placeholder="Ürün ara..." 
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                style={{ padding: '8px 12px 8px 32px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '13px', width: '180px' }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                    <th 
                                        onClick={() => handleProductSort('revenue')}
                                        style={{ padding: '10px 6px', cursor: 'pointer', userSelect: 'none' }}
                                        title="Ciroya göre azalan sırala"
                                    >
                                        #
                                    </th>
                                    <th 
                                        onClick={() => handleProductSort('name')}
                                        style={{ 
                                            padding: '10px 8px', 
                                            cursor: 'pointer', 
                                            userSelect: 'none',
                                            color: productSortField === 'name' ? 'var(--brand-gold)' : 'var(--text-muted)',
                                            transition: 'color 0.15s ease'
                                        }}
                                        title="Ürün adına göre sırala (A-Z / Z-A)"
                                    >
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span>Ürün</span>
                                            {productSortField === 'name' ? (
                                                productSortDirection === 'asc' ? <ArrowUp size={13} color="var(--brand-gold)" /> : <ArrowDown size={13} color="var(--brand-gold)" />
                                            ) : (
                                                <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleProductSort('quantity')}
                                        style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'center', 
                                            cursor: 'pointer', 
                                            userSelect: 'none',
                                            color: productSortField === 'quantity' ? 'var(--brand-gold)' : 'var(--text-muted)',
                                            transition: 'color 0.15s ease'
                                        }}
                                        title="Satış adedine göre sırala (Çoktan aza / Azdan çoğa)"
                                    >
                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                            <span>Adet</span>
                                            {productSortField === 'quantity' ? (
                                                productSortDirection === 'asc' ? <ArrowUp size={13} color="var(--brand-gold)" /> : <ArrowDown size={13} color="var(--brand-gold)" />
                                            ) : (
                                                <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleProductSort('revenue')}
                                        style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            cursor: 'pointer', 
                                            userSelect: 'none',
                                            color: productSortField === 'revenue' ? 'var(--brand-gold)' : 'var(--text-muted)',
                                            transition: 'color 0.15s ease'
                                        }}
                                        title="Toplam ciroya göre sırala (Çoktan aza / Azdan çoğa)"
                                    >
                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                            <span>Toplam Ciro</span>
                                            {productSortField === 'revenue' ? (
                                                productSortDirection === 'asc' ? <ArrowUp size={13} color="var(--brand-gold)" /> : <ArrowDown size={13} color="var(--brand-gold)" />
                                            ) : (
                                                <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedProductStats.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Satış kaydı bulunamadı.</td></tr>
                                ) : (
                                    sortedProductStats.map((p, idx) => {
                                        const sharePct = totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0;
                                        const rankClass = idx === 0 ? 'top-1' : (idx === 1 ? 'top-2' : (idx === 2 ? 'top-3' : ''));
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                <td style={{ padding: '10px 6px' }}>
                                                    <span className={`rank-badge ${rankClass}`}>{idx + 1}</span>
                                                </td>
                                                <td style={{ padding: '10px 8px', fontWeight: 700 }}>
                                                    <div style={{ color: 'white' }}>{p.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>%{sharePct} Ciro Payı</div>
                                                </td>
                                                <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 800, color: 'var(--brand-primary)' }}>{p.quantity}x</td>
                                                <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'white' }}>{formatMoney(p.revenue)}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sağ Sütun: Garson Performans Karnesi */}
                <div style={{ background: 'var(--bg-surface)', padding: '22px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-card)', boxShadow: 'var(--shadow-soft)' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Users size={18} className="text-amber-400" />
                            Garson Satış & Performans Karnesi
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Hangi garson kaç masaya baktı, ne kadar ciro sağladı?
                        </p>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                    <th 
                                        onClick={() => handleWaiterSort('name')}
                                        style={{ 
                                            padding: '10px 8px', 
                                            cursor: 'pointer', 
                                            userSelect: 'none',
                                            color: waiterSortField === 'name' ? 'var(--brand-gold)' : 'var(--text-muted)'
                                        }}
                                        title="Garson adına göre sırala"
                                    >
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span>Garson</span>
                                            {waiterSortField === 'name' ? (
                                                waiterSortDirection === 'asc' ? <ArrowUp size={13} color="var(--brand-gold)" /> : <ArrowDown size={13} color="var(--brand-gold)" />
                                            ) : (
                                                <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                                            )}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleWaiterSort('orderCount')}
                                        style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'center', 
                                            cursor: 'pointer', 
                                            userSelect: 'none',
                                            color: waiterSortField === 'orderCount' ? 'var(--brand-gold)' : 'var(--text-muted)'
                                        }}
                                        title="Masa/Adisyon adedine göre sırala"
                                    >
                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                                            <span>Masa</span>
                                            {waiterSortField === 'orderCount' ? (
                                                waiterSortDirection === 'asc' ? <ArrowUp size={13} color="var(--brand-gold)" /> : <ArrowDown size={13} color="var(--brand-gold)" />
                                            ) : (
                                                <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                                            )}
                                        </div>
                                    </th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Ciro Payı</th>
                                    <th 
                                        onClick={() => handleWaiterSort('revenue')}
                                        style={{ 
                                            padding: '10px 8px', 
                                            textAlign: 'right', 
                                            cursor: 'pointer', 
                                            userSelect: 'none',
                                            color: waiterSortField === 'revenue' ? 'var(--brand-gold)' : 'var(--text-muted)'
                                        }}
                                        title="Garson cirosuna göre sırala"
                                    >
                                        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                            <span>Toplam Ciro</span>
                                            {waiterSortField === 'revenue' ? (
                                                waiterSortDirection === 'asc' ? <ArrowUp size={13} color="var(--brand-gold)" /> : <ArrowDown size={13} color="var(--brand-gold)" />
                                            ) : (
                                                <ArrowUpDown size={12} style={{ opacity: 0.35 }} />
                                            )}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedWaiterStats.length === 0 ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>Garson verisi bulunamadı.</td></tr>
                                ) : (
                                    sortedWaiterStats.map((w, idx) => {
                                        const wShare = totalRevenue > 0 ? ((w.revenue / totalRevenue) * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                                <td style={{ padding: '12px 8px', fontWeight: 800, color: 'white' }}>
                                                    {w.name}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                                    {w.orderCount} adisyon
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right', color: 'var(--brand-gold)', fontWeight: 700 }}>
                                                    %{wShare}
                                                </td>
                                                <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--success)' }}>
                                                    {formatMoney(w.revenue)}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mutfak Operasyon & Teslimat Özeti */}
                    <div style={{ marginTop: '16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', padding: '14px 16px', border: '1px solid var(--border-card)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ChefHat size={16} className="text-amber-400" />
                                Mutfak Operasyon Özeti
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mutfak Hazırlık</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', textAlign: 'center' }}>
                            <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>HAZIRLANAN KALEM</div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>{totalKitchenItemsCount} Adet</div>
                            </div>
                            <div style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>KAPANAN MASALAR</div>
                                <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--success)', marginTop: '2px' }}>{orderCount} Masa</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* GÜN GÜN DETAYLI CİRO RAPORU (TABLOLU DÖKÜM) */}
            <div style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-card)',
                padding: '22px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '18px' }}>
                    <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Calendar size={18} className="text-amber-400" />
                            Gün Gün Detaylı Muhasebe Dökümü
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                            Pazartesi-Pazar haftalık veya 1-31 aylık tüm günlerin satır bazlı dökümü
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
                        <button
                            onClick={() => setActiveDetailTab('weekly')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: activeDetailTab === 'weekly' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                                color: activeDetailTab === 'weekly' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            📅 Bu Hafta (Pzt - Paz)
                        </button>
                        <button
                            onClick={() => setActiveDetailTab('monthly')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: activeDetailTab === 'monthly' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                                color: activeDetailTab === 'monthly' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            🗓️ Bu Ay (1 - 31 Gün)
                        </button>
                    </div>
                </div>

                {activeDetailTab === 'weekly' ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                    <th style={{ padding: '10px 10px' }}>Gün</th>
                                    <th style={{ padding: '10px 10px' }}>Tarih</th>
                                    <th style={{ padding: '10px 10px' }}>Adisyon Sayısı</th>
                                    <th style={{ padding: '10px 10px' }}>Nakit</th>
                                    <th style={{ padding: '10px 10px' }}>Kredi Kartı</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Toplam Ciro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {weeklyDayStats.map((d, i) => (
                                    <tr 
                                        key={i}
                                        style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            background: d.isToday ? 'rgba(247, 103, 7, 0.12)' : 'transparent'
                                        }}
                                    >
                                        <td style={{ padding: '12px 10px', fontWeight: 800, color: d.isToday ? 'var(--brand-primary)' : 'white' }}>
                                            {d.dayName} {d.isToday && <span style={{ fontSize: '10px', background: 'var(--brand-primary)', color: 'white', padding: '2px 6px', borderRadius: '3px', marginLeft: '6px' }}>BUGÜN</span>}
                                        </td>
                                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{d.dateStr}</td>
                                        <td style={{ padding: '12px 10px', color: 'var(--text-secondary)' }}>{d.count} adisyon</td>
                                        <td style={{ padding: '12px 10px', color: 'var(--success)', fontWeight: 700 }}>{formatMoney(d.cash)}</td>
                                        <td style={{ padding: '12px 10px', color: '#60a5fa', fontWeight: 700 }}>{formatMoney(d.card)}</td>
                                        <td style={{ padding: '12px 10px', color: 'var(--brand-gold)', fontWeight: 800, textAlign: 'right' }}>{formatMoney(d.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto', maxHeight: '400px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-surface)' }}>
                                <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                    <th style={{ padding: '10px 10px' }}>Gün No</th>
                                    <th style={{ padding: '10px 10px' }}>Tarih</th>
                                    <th style={{ padding: '10px 10px' }}>Adisyon Sayısı</th>
                                    <th style={{ padding: '10px 10px' }}>Nakit</th>
                                    <th style={{ padding: '10px 10px' }}>Kredi Kartı</th>
                                    <th style={{ padding: '10px 10px', textAlign: 'right' }}>Toplam Ciro</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyDayStats.map((d, i) => (
                                    <tr 
                                        key={i}
                                        style={{
                                            borderBottom: '1px solid var(--border-subtle)',
                                            background: d.isToday ? 'rgba(247, 103, 7, 0.12)' : 'transparent'
                                        }}
                                    >
                                        <td style={{ padding: '10px 10px', fontWeight: 800, color: d.isToday ? 'var(--brand-primary)' : 'white' }}>
                                            {d.dayNumber}. Gün {d.isToday && <span style={{ fontSize: '10px', background: 'var(--brand-primary)', color: 'white', padding: '2px 6px', borderRadius: '3px', marginLeft: '6px' }}>BUGÜN</span>}
                                        </td>
                                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>{d.dateDisplay}</td>
                                        <td style={{ padding: '10px 10px', color: 'var(--text-secondary)' }}>{d.count} adisyon</td>
                                        <td style={{ padding: '10px 10px', color: 'var(--success)', fontWeight: 700 }}>{formatMoney(d.cash)}</td>
                                        <td style={{ padding: '10px 10px', color: '#60a5fa', fontWeight: 700 }}>{formatMoney(d.card)}</td>
                                        <td style={{ padding: '10px 10px', color: 'var(--brand-gold)', fontWeight: 800, textAlign: 'right' }}>{formatMoney(d.revenue)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
