import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    Bar, 
    Line,
    ComposedChart,
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
    TrendingDown, 
    CreditCard, 
    Banknote, 
    Receipt, 
    Calendar, 
    CalendarDays, 
    Clock, 
    Users, 
    Search,
    PieChart as PieIcon,
    BarChart3,
    ArrowUpRight,
    ArrowDownRight,
    ShoppingBag,
    ChevronDown,
    ChevronUp,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Plus,
    X,
    Wallet,
    Layers,
    Filter,
    Table as TableIcon,
    Award,
    Crown,
    Flame,
    User
} from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';

const COLORS = {
    gold: '#f59f00',
    goldGlow: 'rgba(245, 159, 0, 0.25)',
    primary: '#f76707',
    primaryGlow: 'rgba(247, 103, 7, 0.25)',
    cash: '#10b981',
    card: '#3b82f6',
    purple: '#a855f7',
    orange: '#f76707',
    grid: 'rgba(255, 255, 255, 0.05)'
};

// Özel Koyu Cam Tasarımlı Tooltip
const CustomChartTooltip = ({ active, payload, label, unit = '₺' }) => {
    if (!active || !payload || !payload.length) return null;

    const headerTitle =
        payload[0]?.payload?.dateDisplay ||
        (payload[0]?.payload?.dayName && payload[0]?.payload?.dateStr ? `${payload[0]?.payload?.dayName} (${payload[0]?.payload?.dateStr})` : null) ||
        (typeof label === 'number' ? `${label}. Gün` : label);

    // Standart Finansal Sıralama Hiyerarşisi:
    // 1. Toplam Ciro (Brüt hasılat)
    // 2. Nakit (Nakit tahsilat)
    // 3. Kredi Kartı (Kart tahsilat)
    // 4. Sipariş Adedi (Varsa)
    // 5. Giderler (İşletme masrafları)
    // 6. Net Kâr (Ciro - Gider)
    const SORT_ORDER = {
        'revenue': 1,
        'toplam ciro': 1,
        'ciro': 1,
        'cash': 2,
        'nakit': 2,
        'card': 3,
        'kredi kartı': 3,
        'kart': 3,
        'count': 4,
        'quantity': 4,
        'sipariş adedi': 4,
        'expense': 5,
        'giderler': 5,
        'gider': 5,
        'netprofit': 6,
        'net_profit': 6,
        'net kâr': 6,
        'net kar': 6,
    };

    const getRank = (entry) => {
        const key = (entry.dataKey || '').toString().toLowerCase();
        const name = (entry.name || '').toString().toLowerCase();
        if (SORT_ORDER[key] !== undefined) return SORT_ORDER[key];
        if (SORT_ORDER[name] !== undefined) return SORT_ORDER[name];
        for (const [k, rank] of Object.entries(SORT_ORDER)) {
            if (name.includes(k) || key.includes(k)) return rank;
        }
        return 99;
    };

    const sortedPayload = [...payload].sort((a, b) => getRank(a) - getRank(b));

    return (
        <div style={{
            background: 'rgba(28, 21, 20, 0.96)',
            border: '1px solid rgba(245, 159, 0, 0.25)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderRadius: '14px',
            padding: '14px 18px',
            boxShadow: '0 14px 36px rgba(0, 0, 0, 0.6), 0 0 16px rgba(245, 159, 0, 0.1)',
            fontSize: '13px',
            minWidth: '200px',
            fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif"
        }}>
            {headerTitle && (
                <div style={{ 
                    fontWeight: 800, 
                    color: '#fffaf5', 
                    marginBottom: '10px', 
                    borderBottom: '1px solid rgba(245, 159, 0, 0.15)', 
                    paddingBottom: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59f00' }} />
                    <span>{headerTitle}</span>
                </div>
            )}
            {sortedPayload.map((entry, index) => {
                const isCount =
                    entry.name?.toLowerCase().includes('adet') ||
                    entry.name?.toLowerCase().includes('adedi') ||
                    entry.dataKey === 'count' ||
                    entry.dataKey === 'quantity';

                let displayValue;
                if (unit && unit !== '₺') {
                    displayValue = `${entry.value} ${unit}`;
                } else if (isCount) {
                    displayValue = Number(entry.value || 0).toLocaleString('tr-TR');
                } else {
                    displayValue = formatMoney(entry.value);
                }

                const isNetProfit = entry.dataKey === 'netProfit' || entry.name?.toLowerCase().includes('net k');
                const isExpense = entry.dataKey === 'expense' || entry.name?.toLowerCase().includes('gider');
                const isRevenue = entry.dataKey === 'revenue' || entry.name?.toLowerCase().includes('toplam ciro');

                return (
                    <div 
                        key={index} 
                        style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            gap: '16px', 
                            margin: '6px 0', 
                            fontSize: '12.5px',
                            paddingTop: isNetProfit ? '6px' : '0',
                            borderTop: isNetProfit ? '1px dashed rgba(245, 159, 0, 0.2)' : 'none'
                        }}
                    >
                        <span style={{ 
                            color: entry.color, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '7px',
                            fontWeight: isRevenue || isNetProfit ? 800 : 600 
                        }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0, boxShadow: `0 0 8px ${entry.color}88` }} />
                            {entry.name}:
                        </span>
                        <span style={{ 
                            fontWeight: isRevenue || isNetProfit ? 900 : 700, 
                            color: isExpense ? '#f87171' : isNetProfit ? (entry.value >= 0 ? '#10b981' : '#f87171') : '#ffffff', 
                            fontFamily: "'Plus Jakarta Sans', sans-serif" 
                        }}>
                            {displayValue}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default function AdminAnalyticsDashboard({
    completedOrders = [],
    expenses = [],
    addExpense,
    deleteExpense,
    onNavigateToExpenses,
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
    // Grafik Görünüm Modu: 'hourly' (Bugün) | 'weekly' (Bu Hafta) | 'monthly' (Bu Ay) | 'all' (Tüm Zamanlar)
    const [chartMode, setChartMode] = useState(
        currentPeriod === 'all' ? 'all' : (currentPeriod === 'month' ? 'monthly' : (currentPeriod === 'week' ? 'weekly' : 'hourly'))
    );
    const [activeDetailTab, setActiveDetailTab] = useState(
        currentPeriod === 'all' ? 'all' : (currentPeriod === 'month' ? 'monthly' : 'weekly')
    );

    // Kasa Tahsilat Donut Hover Durumu (Çakışmayı önleyen akıllı merkez göstergesi)
    const [hoveredPaymentIndex, setHoveredPaymentIndex] = useState(null);

    // Gün Gün Detaylı Muhasebe Dökümü State'leri (Stack / Akordeon Modu)
    const [isBreakdownOpen, setIsBreakdownOpen] = useState(true);
    const [breakdownViewMode, setBreakdownViewMode] = useState('stack'); // 'stack' | 'table'
    const [hideEmptyDays, setHideEmptyDays] = useState(true);

    // Hızlı Gider Ekleme Modal State'i
    const [showQuickExpenseModal, setShowQuickExpenseModal] = useState(false);
    const [quickExpTitle, setQuickExpTitle] = useState('');
    const [quickExpAmount, setQuickExpAmount] = useState('');
    const [quickExpCategory, setQuickExpCategory] = useState('mutfak');
    const [quickExpMethod, setQuickExpMethod] = useState('cash');
    const [quickExpDate, setQuickExpDate] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
    const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);

    const handleSaveQuickExpense = async (e) => {
        if (e) e.preventDefault();
        if (!quickExpTitle.trim()) return;
        const numAmount = Number(quickExpAmount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        setIsSubmittingExpense(true);
        try {
            if (addExpense) {
                await addExpense({
                    title: quickExpTitle.trim(),
                    amount: numAmount,
                    category: quickExpCategory,
                    payment_method: quickExpMethod,
                    date: quickExpDate,
                    notes: 'Hızlı Muhasebe Girişi'
                });
            }
            setQuickExpTitle('');
            setQuickExpAmount('');
            setShowQuickExpenseModal(false);
        } catch (err) {
            console.error('Save quick expense error:', err);
        } finally {
            setIsSubmittingExpense(false);
        }
    };

    // Dışarıdan veya butondan currentPeriod değiştiğinde grafiği ve alt tabloyu otomatik eşitle
    useEffect(() => {
        if (currentPeriod === 'today') {
            setChartMode('hourly');
        } else if (currentPeriod === 'week') {
            setChartMode('weekly');
            setActiveDetailTab('weekly');
        } else if (currentPeriod === 'month') {
            setChartMode('monthly');
            setActiveDetailTab('monthly');
        } else if (currentPeriod === 'all') {
            setChartMode('all');
            setActiveDetailTab('all');
        }
    }, [currentPeriod]);

    const handleSelectPeriod = (period) => {
        if (setCurrentPeriod) setCurrentPeriod(period);
        if (period === 'today') setChartMode('hourly');
        else if (period === 'week') {
            setChartMode('weekly');
            setActiveDetailTab('weekly');
        } else if (period === 'month') {
            setChartMode('monthly');
            setActiveDetailTab('monthly');
        } else if (period === 'all') {
            setChartMode('all');
            setActiveDetailTab('all');
        }
    };

    // Filtrelenmiş Siparişler (Seçilen Döneme Göre Dinamik Hesaplanır)
    const filteredOrders = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        const monthStr = `${y}-${m}`;

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return completedOrders.filter(o => {
            const t = new Date(o.created_at || o.closed_at || 0).getTime();
            const oDate = (o.created_at || o.closed_at || '').slice(0, 10);
            if (currentPeriod === 'today') {
                return oDate === todayStr || t >= startOfToday;
            }
            if (currentPeriod === 'week') return t >= startOfWeek;
            if (currentPeriod === 'month') return oDate.startsWith(monthStr) || t >= startOfMonth;
            return true;
        });
    }, [completedOrders, currentPeriod]);

    // Ürün & Garson Raporları Bağımsız Dönem Filtreleri (Bugün, Bu Hafta, Bu Ay, Tümü)
    const [productPeriod, setProductPeriod] = useState(currentPeriod || 'today');
    const [waiterPeriod, setWaiterPeriod] = useState(currentPeriod || 'today');

    useEffect(() => {
        if (currentPeriod) {
            setProductPeriod(currentPeriod);
            setWaiterPeriod(currentPeriod);
        }
    }, [currentPeriod]);

    // Yardımcı: Belirtilen döneme göre siparişleri filtrele
    const filterOrdersForPeriod = (orders, period) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;
        const monthStr = `${y}-${m}`;

        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return (orders || []).filter(o => {
            const t = new Date(o.created_at || o.closed_at || 0).getTime();
            const oDate = (o.created_at || o.closed_at || '').slice(0, 10);
            if (period === 'today') return oDate === todayStr || t >= startOfToday;
            if (period === 'week') return t >= startOfWeek;
            if (period === 'month') return oDate.startsWith(monthStr) || t >= startOfMonth;
            return true;
        });
    };

    // 1. Ürün Raporu Filtrelenmiş Siparişler & Ciro
    const productFilteredOrders = useMemo(() => {
        return filterOrdersForPeriod(completedOrders, productPeriod);
    }, [completedOrders, productPeriod]);

    const productPeriodTotalRevenue = useMemo(() => {
        return productFilteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    }, [productFilteredOrders]);

    // Seçilen döneme göre dinamik hesaplanan ürün satış istatistikleri
    const dynamicProductStats = useMemo(() => {
        const map = {};
        productFilteredOrders.forEach(o => {
            (o.items || []).forEach(item => {
                const name = item.name || 'İsimsiz Ürün';
                if (!map[name]) {
                    map[name] = {
                        name,
                        category_id: item.category_id,
                        quantity: 0,
                        revenue: 0
                    };
                }
                const qty = Number(item.quantity) || 1;
                const price = Number(item.price) || 0;
                map[name].quantity += qty;
                map[name].revenue += (qty * price);
            });
        });
        return Object.values(map);
    }, [productFilteredOrders]);

    // 2. Garson Raporu Filtrelenmiş Siparişler & Ciro
    const waiterFilteredOrders = useMemo(() => {
        return filterOrdersForPeriod(completedOrders, waiterPeriod);
    }, [completedOrders, waiterPeriod]);

    const waiterPeriodTotalRevenue = useMemo(() => {
        return waiterFilteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    }, [waiterFilteredOrders]);

    const getWaiterInitials = (name) => {
        if (!name) return 'G';
        const clean = name.replace(/\(.*?\)/g, '').trim();
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'G';
        if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
        return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
    };

    // Seçilen döneme göre dinamik hesaplanan garson istatistikleri
    const dynamicWaiterStats = useMemo(() => {
        const map = {};
        waiterFilteredOrders.forEach(o => {
            const rawName = o.waiter_name || 'Bilinmiyor';
            const name = rawName.replace(/\s*\(patron\)\s*/gi, '').trim() || 'Yönetici';
            if (!map[name]) {
                map[name] = {
                    name,
                    orderCount: 0,
                    revenue: 0,
                    cashRevenue: 0,
                    cardRevenue: 0
                };
            }
            map[name].orderCount += 1;
            const tot = Number(o.total) || 0;
            map[name].revenue += tot;
            if (o.payment_method === 'cash') map[name].cashRevenue += tot;
            else if (o.payment_method === 'card') map[name].cardRevenue += tot;
        });
        return Object.values(map);
    }, [waiterFilteredOrders]);

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

    // Sıralanmış Ürün Verisi (Dinamik Döneme ve Aramaya Dayalı)
    const sortedProductStats = useMemo(() => {
        let list = [...dynamicProductStats];
        if (productSearch && productSearch.trim()) {
            const q = productSearch.toLowerCase();
            list = list.filter(p => (p.name || '').toLowerCase().includes(q));
        }
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
    }, [dynamicProductStats, productSearch, productSortField, productSortDirection]);

    // Sıralanmış Garson Verisi (Dinamik Döneme Dayalı)
    const sortedWaiterStats = useMemo(() => {
        const list = [...dynamicWaiterStats];
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
    }, [dynamicWaiterStats, waiterSortField, waiterSortDirection]);

    // Finansal Metrikler
    const totalRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cashTotal = filteredOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const cardTotal = filteredOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const orderCount = filteredOrders.length;
    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;
    const cashPct = totalRevenue > 0 ? Math.round((cashTotal / totalRevenue) * 100) : 50;
    const cardPct = totalRevenue > 0 ? Math.round((cardTotal / totalRevenue) * 100) : 50;

    // Döneme Göre Filtrelenmiş Giderler ve Net Kâr
    const filteredExpenses = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return (expenses || []).filter(e => {
            const expTime = new Date(e.date || e.created_at || 0).getTime();
            if (currentPeriod === 'today') {
                const eDate = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
                return eDate === todayStr;
            }
            if (currentPeriod === 'week') return expTime >= startOfWeek;
            if (currentPeriod === 'month') return expTime >= startOfMonth;
            return true;
        });
    }, [expenses, currentPeriod]);

    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, [filteredExpenses]);

    const netProfit = totalRevenue - totalExpenses;

    // Pasta Grafik Verisi (Ödeme Yöntemi Dağılımı)
    const paymentPieData = useMemo(() => [
        { name: 'Nakit', value: cashTotal, pct: cashPct, color: COLORS.cash },
        { name: 'Kredi Kartı', value: cardTotal, pct: cardPct, color: COLORS.card }
    ], [cashTotal, cardTotal, cashPct, cardPct]);

    // Saatlik Sipariş Yoğunluğu (07:00 – 00:00)
    const hourlyChartData = useMemo(() => {
        const targetHours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
        const hoursMap = {};
        targetHours.forEach(h => {
            const label = `${String(h).padStart(2, '0')}:00`;
            hoursMap[label] = { hour: label, count: 0, revenue: 0, cash: 0, card: 0 };
        });

        filteredOrders.forEach(o => {
            if (!o.created_at && !o.closed_at) return;
            const d = new Date(o.created_at || o.closed_at);
            const h = d.getHours();
            if ((h >= 7 && h <= 23) || h === 0) {
                const label = `${String(h).padStart(2, '0')}:00`;
                if (hoursMap[label]) {
                    const tot = Number(o.total) || 0;
                    hoursMap[label].count += 1;
                    hoursMap[label].revenue += tot;
                    if (o.payment_method === 'cash') {
                        hoursMap[label].cash += tot;
                    } else if (o.payment_method === 'card') {
                        hoursMap[label].card += tot;
                    }
                }
            }
        });

        return Object.values(hoursMap);
    }, [filteredOrders]);

    // Tüm Zamanlar Grafik Verisi (Kronolojik Sıralı Tarihsel Dağılım - Ciro & Giderler)
    const allTimeChartData = useMemo(() => {
        const dateMap = {};
        completedOrders.forEach(o => {
            if (!o.created_at && !o.closed_at) return;
            const d = new Date(o.created_at || o.closed_at);
            if (isNaN(d.getTime())) return;
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const sortKey = `${year}-${month}-${day}`;
            const dateStr = `${day}.${month}`;
            if (!dateMap[sortKey]) {
                dateMap[sortKey] = { sortKey, dateStr, revenue: 0, cash: 0, card: 0, count: 0, expense: 0, netProfit: 0 };
            }
            const tot = Number(o.total) || 0;
            dateMap[sortKey].revenue += tot;
            dateMap[sortKey].count += 1;
            if (o.payment_method === 'cash') dateMap[sortKey].cash += tot;
            else if (o.payment_method === 'card') dateMap[sortKey].card += tot;
        });

        (expenses || []).forEach(e => {
            const dateStr = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
            if (!dateStr) return;
            const parts = dateStr.split('-');
            const display = parts.length === 3 ? `${parts[2]}.${parts[1]}` : dateStr;
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = { sortKey: dateStr, dateStr: display, revenue: 0, cash: 0, card: 0, count: 0, expense: 0, netProfit: 0 };
            }
            dateMap[dateStr].expense += (Number(e.amount) || 0);
        });

        const sorted = Object.values(dateMap).map(row => ({
            ...row,
            netProfit: row.revenue - row.expense
        })).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

        return sorted.length > 0 ? sorted : [{ dateStr: 'Genel', revenue: 0, cash: 0, card: 0, count: 0, expense: 0, netProfit: 0 }];
    }, [completedOrders, expenses]);

    // Tüm Zamanlar Detaylı Gün/Tarih Muhasebe Dökümü (Giderler ve Net Kâr Dahil)
    const allTimeDayStats = useMemo(() => {
        const map = {};
        completedOrders.forEach(o => {
            if (!o.created_at && !o.closed_at) return;
            const d = new Date(o.created_at || o.closed_at);
            if (isNaN(d.getTime())) return;
            const sortKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const dateDisplay = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
            if (!map[sortKey]) {
                map[sortKey] = {
                    sortKey,
                    dateDisplay,
                    count: 0,
                    revenue: 0,
                    cash: 0,
                    card: 0,
                    expense: 0,
                    netProfit: 0
                };
            }
            const tot = Number(o.total) || 0;
            map[sortKey].revenue += tot;
            map[sortKey].count += 1;
            if (o.payment_method === 'cash') map[sortKey].cash += tot;
            else if (o.payment_method === 'card') map[sortKey].card += tot;
        });

        (expenses || []).forEach(e => {
            const dateStr = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
            if (!dateStr) return;
            if (!map[dateStr]) {
                const parts = dateStr.split('-');
                const display = parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : dateStr;
                map[dateStr] = {
                    sortKey: dateStr,
                    dateDisplay: display,
                    count: 0,
                    revenue: 0,
                    cash: 0,
                    card: 0,
                    expense: 0,
                    netProfit: 0
                };
            }
            map[dateStr].expense += (Number(e.amount) || 0);
        });

        const list = Object.values(map).map(row => ({
            ...row,
            netProfit: row.revenue - row.expense
        }));

        // En yeni tarih en üstte listelenir
        return list.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    }, [completedOrders, expenses]);

    // Tablo Alt Toplamları (Haftalık, Aylık ve Tüm Zamanlar)
    const weeklyTotals = useMemo(() => {
        return (weeklyDayStats || []).reduce((acc, d) => ({
            count: acc.count + (d.count || 0),
            cash: acc.cash + (d.cash || 0),
            card: acc.card + (d.card || 0),
            revenue: acc.revenue + (d.revenue || 0),
            expense: acc.expense + (d.expense || 0),
            netProfit: acc.netProfit + (d.netProfit || 0)
        }), { count: 0, cash: 0, card: 0, revenue: 0, expense: 0, netProfit: 0 });
    }, [weeklyDayStats]);

    const monthlyTotals = useMemo(() => {
        return (monthlyDayStats || []).reduce((acc, d) => ({
            count: acc.count + (d.count || 0),
            cash: acc.cash + (d.cash || 0),
            card: acc.card + (d.card || 0),
            revenue: acc.revenue + (d.revenue || 0),
            expense: acc.expense + (d.expense || 0),
            netProfit: acc.netProfit + (d.netProfit || 0)
        }), { count: 0, cash: 0, card: 0, revenue: 0, expense: 0, netProfit: 0 });
    }, [monthlyDayStats]);

    const allTimeTotals = useMemo(() => {
        return (allTimeDayStats || []).reduce((acc, d) => ({
            count: acc.count + (d.count || 0),
            cash: acc.cash + (d.cash || 0),
            card: acc.card + (d.card || 0),
            revenue: acc.revenue + (d.revenue || 0),
            expense: acc.expense + (d.expense || 0),
            netProfit: acc.netProfit + (d.netProfit || 0)
        }), { count: 0, cash: 0, card: 0, revenue: 0, expense: 0, netProfit: 0 });
    }, [allTimeDayStats]);

    // Döküm Stack'i için Aktif Dönem Toplamları
    const currentDetailTotals = useMemo(() => {
        if (activeDetailTab === 'weekly') {
            return {
                title: 'Bu Hafta Toplamı (Pzt - Paz)',
                shortTitle: 'Bu Hafta',
                ...weeklyTotals
            };
        }
        if (activeDetailTab === 'monthly') {
            return {
                title: 'Bu Ay Toplamı (1 - 31)',
                shortTitle: 'Bu Ay',
                ...monthlyTotals
            };
        }
        return {
            title: 'Tüm Zamanlar Toplamı',
            shortTitle: 'Tüm Zamanlar',
            ...allTimeTotals
        };
    }, [activeDetailTab, weeklyTotals, monthlyTotals, allTimeTotals]);

    // Ham ve Filtrelenmiş Döküm Listeleri (Boş Günleri Gizleme Mantığı)
    const currentRawDetailList = useMemo(() => {
        if (activeDetailTab === 'weekly') return weeklyDayStats || [];
        if (activeDetailTab === 'monthly') return monthlyDayStats || [];
        return allTimeDayStats || [];
    }, [activeDetailTab, weeklyDayStats, monthlyDayStats, allTimeDayStats]);

    const currentFilteredDetailList = useMemo(() => {
        if (!hideEmptyDays) return currentRawDetailList;
        return currentRawDetailList.filter(d =>
            (d.revenue > 0) ||
            ((d.expense || 0) > 0) ||
            (d.count > 0) ||
            Boolean(d.isToday)
        );
    }, [currentRawDetailList, hideEmptyDays]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Üst Bar: Başlık ve Zaman Dilimi Filtresi */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                background: 'rgba(28, 21, 20, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                padding: '18px 22px',
                borderRadius: '16px',
                border: '1px solid rgba(245, 159, 0, 0.16)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.2), rgba(247, 103, 7, 0.12))',
                        border: '1px solid rgba(245, 159, 0, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-gold, #f59f00)',
                        boxShadow: '0 4px 14px rgba(245, 159, 0, 0.15)',
                        flexShrink: 0
                    }}>
                        <BarChart3 size={22} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '-0.4px', margin: 0, color: 'white' }}>
                            Finansal Performans & Satış Analizi
                        </h2>
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary, #d1b8af)', margin: '3px 0 0 0' }}>
                            Restoran cirosu, lezzet satışları ve anlık grafik analizleri
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div className="filter-pill-group" style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'today' ? 'active' : ''}`} 
                            onClick={() => handleSelectPeriod('today')}
                        >
                            Bugün
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'week' ? 'active' : ''}`} 
                            onClick={() => handleSelectPeriod('week')}
                        >
                            Bu Hafta
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'month' ? 'active' : ''}`} 
                            onClick={() => handleSelectPeriod('month')}
                        >
                            Bu Ay
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'all' ? 'active' : ''}`} 
                            onClick={() => handleSelectPeriod('all')}
                        >
                            Tüm Zamanlar
                        </button>
                    </div>

                    {handleResetAnalytics && (
                        <button 
                            onClick={handleResetAnalytics}
                            className="btn-outline"
                            style={{ 
                                padding: '8px 14px', 
                                fontSize: '12px', 
                                fontWeight: 700,
                                color: '#f87171', 
                                background: 'rgba(239, 68, 68, 0.08)',
                                borderColor: 'rgba(239, 68, 68, 0.25)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                            title="Tüm satış ve ciro geçmişini sıfırla"
                        >
                            <RotateCcw size={13} />
                            Sıfırla
                        </button>
                    )}
                </div>
            </div>

            {/* 4 BÜYÜK MODERN KPI KARTI (DÖNEM FİLTRESİNE GÖRE DİNAMİK) */}
            <div className="admin-kpi-grid" style={{ marginBottom: 0 }}>
                {/* 1. Net Ciro */}
                <div style={{
                    background: 'linear-gradient(145deg, rgba(245, 159, 0, 0.12) 0%, rgba(28, 21, 20, 0.85) 100%)',
                    border: '1px solid rgba(245, 159, 0, 0.28)',
                    borderRadius: '16px',
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                {currentPeriod === 'today' ? 'Bugün Toplam Ciro' : currentPeriod === 'week' ? 'Bu Hafta Toplam Ciro' : currentPeriod === 'month' ? 'Bu Ay Toplam Ciro' : 'Tüm Zamanlar Ciro'}
                            </span>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 159, 0, 0.16)', border: '1px solid rgba(245, 159, 0, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold, #f59f00)', flexShrink: 0 }}>
                                <TrendingUp size={18} />
                            </div>
                        </div>
                        <div style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', fontWeight: 900, color: 'var(--brand-gold, #f59f00)', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", wordBreak: 'break-word' }}>
                            {formatMoney(totalRevenue)}
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <ArrowUpRight size={14} /> {orderCount} tamamlanan sipariş
                    </div>
                </div>

                {/* 2. Ortalama Masa Harcaması */}
                <div style={{
                    background: 'linear-gradient(145deg, rgba(247, 103, 7, 0.10) 0%, rgba(28, 21, 20, 0.85) 100%)',
                    border: '1px solid rgba(247, 103, 7, 0.24)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                {currentPeriod === 'today' ? 'Bugün Ort. Masa' : currentPeriod === 'week' ? 'Bu Hafta Ort. Masa' : currentPeriod === 'month' ? 'Bu Ay Ort. Masa' : 'Ortalama Masa'}
                            </span>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(247, 103, 7, 0.16)', border: '1px solid rgba(247, 103, 7, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary, #f76707)', flexShrink: 0 }}>
                                <ShoppingBag size={18} />
                            </div>
                        </div>
                        <div style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', fontWeight: 900, color: '#fffaf5', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", wordBreak: 'break-word' }}>
                            {formatMoney(avgOrder)}
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', marginTop: '10px' }}>
                        {currentPeriod === 'today' ? 'Bugünkü masa başına ortalama' : currentPeriod === 'week' ? 'Haftalık masa ortalaması' : currentPeriod === 'month' ? 'Aylık masa ortalaması' : 'Masa başına ortalama'}
                    </div>
                </div>

                {/* 3. Toplam Gider */}
                <div style={{
                    background: 'linear-gradient(145deg, rgba(239, 68, 68, 0.10) 0%, rgba(28, 21, 20, 0.85) 100%)',
                    border: '1px solid rgba(239, 68, 68, 0.24)',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                {currentPeriod === 'today' ? 'Bugün Toplam Gider' : currentPeriod === 'week' ? 'Bu Hafta Toplam Gider' : currentPeriod === 'month' ? 'Bu Ay Toplam Gider' : 'Tüm Zamanlar Gider'}
                            </span>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.16)', border: '1px solid rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', flexShrink: 0 }}>
                                <ArrowDownRight size={18} />
                            </div>
                        </div>
                        <div style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", wordBreak: 'break-word' }}>
                            -{formatMoney(totalExpenses)}
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', marginTop: '10px', fontWeight: 600 }}>
                        {currentPeriod === 'today' ? 'Bugün kaydedilen harcamalar' : currentPeriod === 'week' ? 'Haftalık giderler' : currentPeriod === 'month' ? 'Aylık giderler' : 'Dönem harcamaları'}
                    </div>
                </div>

                {/* 4. Net İşletme Kârı */}
                <div style={{
                    background: netProfit >= 0
                        ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(28, 21, 20, 0.85) 100%)'
                        : 'linear-gradient(145deg, rgba(239, 68, 68, 0.12) 0%, rgba(28, 21, 20, 0.85) 100%)',
                    border: `1px solid ${netProfit >= 0 ? 'rgba(16, 185, 129, 0.32)' : 'rgba(239, 68, 68, 0.32)'}`,
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    minWidth: 0
                }}>
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary, #d1b8af)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                {currentPeriod === 'today' ? 'Bugün Net Kâr' : currentPeriod === 'week' ? 'Bu Hafta Net Kâr' : currentPeriod === 'month' ? 'Bu Ay Net Kâr' : 'Tüm Zamanlar Net Kâr'}
                            </span>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.16)' : 'rgba(239, 68, 68, 0.16)', border: `1px solid ${netProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: netProfit >= 0 ? '#10b981' : '#ef4444', flexShrink: 0 }}>
                                {netProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                        </div>
                        <div style={{ fontSize: 'clamp(22px, 2.2vw, 28px)', fontWeight: 900, color: netProfit >= 0 ? '#10b981' : '#ef4444', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif", wordBreak: 'break-word' }}>
                            {formatMoney(netProfit)}
                        </div>
                    </div>
                    <div style={{ fontSize: '12px', color: netProfit >= 0 ? '#10b981' : '#ef4444', marginTop: '10px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {netProfit >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                        <span>{netProfit >= 0 ? 'Kârda' : 'Zararda'} ({currentPeriod === 'today' ? 'Bugün' : currentPeriod === 'week' ? 'Hafta' : currentPeriod === 'month' ? 'Ay' : 'Genel'})</span>
                    </div>
                </div>
            </div>

            {/* BÜYÜK İNTERAKTİF CİRO GRAFİĞİ (GÖRSELLEŞTİRME MERKEZİ) */}
            <div style={{
                background: 'rgba(28, 21, 20, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(245, 159, 0, 0.14)',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)'
            }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '14px',
                    marginBottom: '22px'
                }}>
                    <div>
                        <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BarChart3 size={18} color="var(--brand-gold, #f59f00)" />
                            {chartMode === 'hourly' && 'Bugün: Saatlik Sipariş Yoğunluğu ve Ciro Dağılımı (07:00 – 00:00)'}
                            {chartMode === 'weekly' && 'Bu Hafta: Gün Gün Ciro Eğrisi (Pazartesi - Pazar)'}
                            {chartMode === 'monthly' && 'Bu Ay: Günlük Ciro Dağılım Trendi (1 - 31 Gün)'}
                            {chartMode === 'all' && 'Tüm Zamanlar: Genel Ciro ve Tarihsel Sipariş Eğrisi'}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', margin: '4px 0 0 0' }}>
                            Grafik üzerine gelerek detaylı gün ve saat dökümünü inceleyebilirsiniz
                        </p>
                    </div>

                    {/* Grafik Görünüm Seçici Butonları */}
                    <div style={{ display: 'flex', gap: '6px', background: 'rgba(0, 0, 0, 0.35)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => handleSelectPeriod('today')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: chartMode === 'hourly' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: chartMode === 'hourly' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                                boxShadow: chartMode === 'hourly' ? '0 3px 12px rgba(247, 103, 7, 0.35)' : 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Clock size={13} />
                            <span>Bugün</span>
                        </button>
                        <button
                            onClick={() => handleSelectPeriod('week')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: chartMode === 'weekly' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: chartMode === 'weekly' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                                boxShadow: chartMode === 'weekly' ? '0 3px 12px rgba(247, 103, 7, 0.35)' : 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <Calendar size={13} />
                            <span>Bu Hafta</span>
                        </button>
                        <button
                            onClick={() => handleSelectPeriod('month')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: chartMode === 'monthly' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: chartMode === 'monthly' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                                boxShadow: chartMode === 'monthly' ? '0 3px 12px rgba(247, 103, 7, 0.35)' : 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <CalendarDays size={13} />
                            <span>Bu Ay</span>
                        </button>
                        <button
                            onClick={() => handleSelectPeriod('all')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: chartMode === 'all' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'transparent',
                                color: chartMode === 'all' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                                boxShadow: chartMode === 'all' ? '0 3px 12px rgba(247, 103, 7, 0.35)' : 'none',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <TrendingUp size={13} />
                            <span>Tüm Zamanlar</span>
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
                                    <linearGradient id="gradExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
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
                                <Area type="monotone" dataKey="expense" name="Giderler" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#gradExpense)" />
                                <Area type="monotone" dataKey="netProfit" name="Net Kâr" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="4 4" fillOpacity={0} />
                            </AreaChart>
                        ) : chartMode === 'monthly' ? (
                            <AreaChart data={monthlyDayStats} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradMonthlyRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradMonthlyCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.cash} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.cash} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradMonthlyCard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.card} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.card} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradMonthlyExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                                <XAxis dataKey="dayNumber" stroke="var(--text-muted)" fontSize={11} tickFormatter={(d) => `${d}. gün`} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area type="monotone" dataKey="revenue" name="Toplam Ciro" stroke={COLORS.gold} strokeWidth={3} fillOpacity={1} fill="url(#gradMonthlyRevenue)" />
                                <Area type="monotone" dataKey="cash" name="Nakit" stroke={COLORS.cash} strokeWidth={2} fillOpacity={1} fill="url(#gradMonthlyCash)" />
                                <Area type="monotone" dataKey="card" name="Kredi Kartı" stroke={COLORS.card} strokeWidth={2} fillOpacity={1} fill="url(#gradMonthlyCard)" />
                                <Area type="monotone" dataKey="expense" name="Giderler" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#gradMonthlyExpense)" />
                                <Area type="monotone" dataKey="netProfit" name="Net Kâr" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="4 4" fillOpacity={0} />
                            </AreaChart>
                        ) : chartMode === 'all' ? (
                            <AreaChart data={allTimeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradAllRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradAllCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.cash} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.cash} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradAllCard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.card} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.card} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradAllExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                                <XAxis dataKey="dateStr" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area type="monotone" dataKey="revenue" name="Toplam Ciro" stroke={COLORS.gold} strokeWidth={3} fillOpacity={1} fill="url(#gradAllRevenue)" />
                                <Area type="monotone" dataKey="cash" name="Nakit" stroke={COLORS.cash} strokeWidth={2} fillOpacity={1} fill="url(#gradAllCash)" />
                                <Area type="monotone" dataKey="card" name="Kredi Kartı" stroke={COLORS.card} strokeWidth={2} fillOpacity={1} fill="url(#gradAllCard)" />
                                <Area type="monotone" dataKey="expense" name="Giderler" stroke="#ef4444" strokeWidth={2.5} fillOpacity={1} fill="url(#gradAllExpense)" />
                                <Area type="monotone" dataKey="netProfit" name="Net Kâr" stroke="#a855f7" strokeWidth={2.5} strokeDasharray="4 4" fillOpacity={0} />
                            </AreaChart>
                        ) : (
                            <ComposedChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradHourlyRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradHourlyCash" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.cash} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.cash} stopOpacity={0.0} />
                                    </linearGradient>
                                    <linearGradient id="gradHourlyCard" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={COLORS.card} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={COLORS.card} stopOpacity={0.0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                                <XAxis dataKey="hour" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                <YAxis yAxisId="right" orientation="right" stroke="#38bdf8" fontSize={11} tickLine={false} tickFormatter={(val) => `${val} ad.`} />
                                <Tooltip content={<CustomChartTooltip />} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Area yAxisId="left" type="monotone" dataKey="revenue" name="Toplam Ciro" stroke={COLORS.gold} strokeWidth={3} fillOpacity={1} fill="url(#gradHourlyRevenue)" />
                                <Area yAxisId="left" type="monotone" dataKey="cash" name="Nakit" stroke={COLORS.cash} strokeWidth={2} fillOpacity={1} fill="url(#gradHourlyCash)" />
                                <Area yAxisId="left" type="monotone" dataKey="card" name="Kredi Kartı" stroke={COLORS.card} strokeWidth={2} fillOpacity={1} fill="url(#gradHourlyCard)" />
                                <Line
                                    yAxisId="right"
                                    type="monotone"
                                    dataKey="count"
                                    name="Sipariş Adedi"
                                    stroke="#38bdf8"
                                    strokeWidth={2.5}
                                    strokeDasharray="4 4"
                                    dot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 1.5 }}
                                    activeDot={{ r: 6, fill: '#38bdf8' }}
                                />
                            </ComposedChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            {/* KASA TAHSİLAT ORANLARI (ÖDEME DAĞILIMI DONUT GRAFİĞİ) */}
            <div style={{
                background: 'rgba(28, 21, 20, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: '16px',
                border: '1px solid rgba(245, 159, 0, 0.14)',
                padding: '24px',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.35)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PieIcon size={18} color="var(--brand-gold, #f59f00)" />
                        Kasa Tahsilat Oranları (Nakit / Kart)
                    </h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', margin: '3px 0 0 0' }}>
                        Cironun ödeme yöntemlerine göre görsel dağılımı
                    </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center', gap: '24px' }}>
                    <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={paymentPieData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={62}
                                    outerRadius={88}
                                    paddingAngle={4}
                                    dataKey="value"
                                    onMouseEnter={(_, index) => setHoveredPaymentIndex(index)}
                                    onMouseLeave={() => setHoveredPaymentIndex(null)}
                                >
                                    {paymentPieData.map((entry, index) => {
                                        const isHovered = hoveredPaymentIndex === index;
                                        const isDimmed = hoveredPaymentIndex !== null && !isHovered;
                                        return (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={entry.color} 
                                                stroke={isHovered ? '#ffffff' : 'transparent'} 
                                                strokeWidth={isHovered ? 2 : 0}
                                                opacity={isDimmed ? 0.35 : 1}
                                                style={{ 
                                                    transition: 'all 0.25s ease', 
                                                    cursor: 'pointer',
                                                    outline: 'none'
                                                }}
                                            />
                                        );
                                    })}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Ortadaki Akıllı Gösterge (Hover Edilen Dilimi veya Toplamı Gösterir - Asla Çakışma Olmaz) */}
                        <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            textAlign: 'center',
                            pointerEvents: 'none',
                            width: '116px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease'
                        }}>
                            {hoveredPaymentIndex !== null && paymentPieData[hoveredPaymentIndex] ? (
                                <>
                                    <div style={{ 
                                        fontSize: '11px', 
                                        color: paymentPieData[hoveredPaymentIndex].color, 
                                        fontWeight: 800, 
                                        letterSpacing: '0.4px',
                                        textTransform: 'uppercase',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '4px'
                                    }}>
                                        <span>{paymentPieData[hoveredPaymentIndex].name}</span>
                                        <span style={{ opacity: 0.9 }}>%{paymentPieData[hoveredPaymentIndex].pct}</span>
                                    </div>
                                    <div style={{ 
                                        fontSize: '15.5px', 
                                        fontWeight: 900, 
                                        color: '#ffffff', 
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        marginTop: '3px',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.2
                                    }}>
                                        {formatMoney(paymentPieData[hoveredPaymentIndex].value)}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary, #d1b8af)', fontWeight: 800, letterSpacing: '0.6px' }}>
                                        TOPLAM KASA
                                    </div>
                                    <div style={{ 
                                        fontSize: totalRevenue > 99999 ? '15px' : '17px', 
                                        fontWeight: 900, 
                                        color: '#fffaf5', 
                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                        marginTop: '3px',
                                        wordBreak: 'break-word',
                                        lineHeight: 1.2
                                    }}>
                                        {formatMoney(totalRevenue)}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Detay Açıklamaları */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '14px' }}>
                        <div 
                            onMouseEnter={() => setHoveredPaymentIndex(0)}
                            onMouseLeave={() => setHoveredPaymentIndex(null)}
                            style={{ 
                                background: hoveredPaymentIndex === 0 ? 'rgba(16, 185, 129, 0.16)' : 'rgba(16, 185, 129, 0.08)', 
                                border: `1px solid ${hoveredPaymentIndex === 0 ? '#10b981' : 'rgba(16, 185, 129, 0.25)'}`, 
                                borderRadius: '14px', 
                                padding: '18px 16px', 
                                textAlign: 'center',
                                boxShadow: hoveredPaymentIndex === 0 ? '0 6px 20px rgba(16, 185, 129, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.2)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', color: '#10b981', fontWeight: 800 }}>
                                <Banknote size={16} />
                                <span>Nakit Kasa</span>
                            </div>
                            <div style={{ fontSize: 'clamp(18px, 1.8vw, 22px)', fontWeight: 900, color: '#ffffff', margin: '6px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {formatMoney(cashTotal)}
                            </div>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '12px', fontWeight: 800 }}>
                                %{cashPct} Oran
                            </span>
                        </div>

                        <div 
                            onMouseEnter={() => setHoveredPaymentIndex(1)}
                            onMouseLeave={() => setHoveredPaymentIndex(null)}
                            style={{ 
                                background: hoveredPaymentIndex === 1 ? 'rgba(59, 130, 246, 0.16)' : 'rgba(59, 130, 246, 0.08)', 
                                border: `1px solid ${hoveredPaymentIndex === 1 ? '#3b82f6' : 'rgba(59, 130, 246, 0.25)'}`, 
                                borderRadius: '14px', 
                                padding: '18px 16px', 
                                textAlign: 'center',
                                boxShadow: hoveredPaymentIndex === 1 ? '0 6px 20px rgba(59, 130, 246, 0.25)' : '0 4px 14px rgba(0, 0, 0, 0.2)',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '13px', color: '#3b82f6', fontWeight: 800 }}>
                                <CreditCard size={16} />
                                <span>Kredi Kartı</span>
                            </div>
                            <div style={{ fontSize: 'clamp(18px, 1.8vw, 22px)', fontWeight: 900, color: '#ffffff', margin: '6px 0', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                {formatMoney(cardTotal)}
                            </div>
                            <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontSize: '12px', fontWeight: 800 }}>
                                %{cardPct} Oran
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* DETAYLI ANALİZ KARTLARI (21ST.DEV & MOTION LEADERBOARDS) */}
            <div className="analytics-grid">
                {/* Sol Kart: Ürün Satış Karnesi (Leaderboard) */}
                <div style={{ 
                    background: 'rgba(28, 21, 20, 0.75)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(245, 159, 0, 0.16)', 
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.2), rgba(247, 103, 7, 0.1))',
                                border: '1px solid rgba(245, 159, 0, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'var(--brand-gold, #f59f00)',
                                boxShadow: '0 4px 14px rgba(245, 159, 0, 0.15)'
                            }}>
                                <Award size={22} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.3px' }}>
                                    Tüm Ürün Satış Karnesi
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', margin: '3px 0 0 0' }}>
                                    Hangi üründen kaç adet satıldı, ne kadar ciro sağladı?
                                </p>
                            </div>
                        </div>

                        {/* Animated Tab Switcher */}
                        <div style={{ 
                            display: 'inline-flex', 
                            background: 'rgba(0, 0, 0, 0.45)', 
                            padding: '3px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            position: 'relative'
                        }}>
                            {[
                                { id: 'today', label: 'Bugün' },
                                { id: 'week', label: 'Bu Hafta' },
                                { id: 'month', label: 'Bu Ay' },
                                { id: 'all', label: 'Tümü' }
                            ].map((tab) => {
                                const isActive = productPeriod === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setProductPeriod(tab.id)}
                                        style={{
                                            position: 'relative',
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '9px',
                                            fontSize: '11.5px',
                                            fontWeight: isActive ? 800 : 600,
                                            color: isActive ? '#1c1514' : 'var(--text-secondary, #d1b8af)',
                                            cursor: 'pointer',
                                            zIndex: 1,
                                            transition: 'color 0.18s ease',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                                        }}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="productPeriodHighlight"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'linear-gradient(135deg, #f59f00, #f76707)',
                                                    borderRadius: '9px',
                                                    zIndex: -1,
                                                    boxShadow: '0 2px 10px rgba(245, 159, 0, 0.4)'
                                                }}
                                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                            />
                                        )}
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Controls Bar: Search & Sort Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '14px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        flexWrap: 'wrap'
                    }}>
                        {/* Search Bar */}
                        <div style={{ position: 'relative', flex: '1', minWidth: '160px', maxWidth: '240px' }}>
                            <input 
                                type="text" 
                                placeholder="Ürün ara..." 
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                style={{ 
                                    width: '100%',
                                    padding: '7px 28px 7px 32px', 
                                    background: 'rgba(0, 0, 0, 0.4)', 
                                    border: '1px solid rgba(245, 159, 0, 0.22)', 
                                    color: '#ffffff', 
                                    borderRadius: '10px', 
                                    fontSize: '12px', 
                                    outline: 'none',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    boxSizing: 'border-box',
                                    transition: 'border-color 0.2s, box-shadow 0.2s'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = 'rgba(245, 159, 0, 0.6)';
                                    e.target.style.boxShadow = '0 0 10px rgba(245, 159, 0, 0.2)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'rgba(245, 159, 0, 0.22)';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary, #d1b8af)', pointerEvents: 'none' }} />
                            {productSearch && (
                                <button
                                    type="button"
                                    onClick={() => setProductSearch('')}
                                    style={{
                                        position: 'absolute',
                                        right: '8px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>

                        {/* Interactive Sort Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)', fontWeight: 700 }}>Sırala:</span>
                            {[
                                { id: 'revenue', label: 'Ciro' },
                                { id: 'quantity', label: 'Adet' },
                                { id: 'name', label: 'İsim' }
                            ].map((sortOption) => {
                                const isSortActive = productSortField === sortOption.id;
                                return (
                                    <button
                                        key={sortOption.id}
                                        type="button"
                                        onClick={() => handleProductSort(sortOption.id)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 9px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            border: isSortActive ? '1px solid rgba(245, 159, 0, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: isSortActive ? 'rgba(245, 159, 0, 0.12)' : 'rgba(0, 0, 0, 0.3)',
                                            color: isSortActive ? 'var(--brand-gold, #f59f00)' : 'var(--text-secondary, #d1b8af)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{sortOption.label}</span>
                                        {isSortActive ? (
                                            productSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                        ) : (
                                            <ArrowUpDown size={10} style={{ opacity: 0.4 }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Animated Product Feed (Custom Luxury Scroll) */}
                    <div className="luxury-scroll" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {sortedProductStats.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary, #d1b8af)' }}>
                                <ShoppingBag size={34} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <div style={{ fontSize: '13px', fontWeight: 700 }}>Satış kaydı bulunamadı</div>
                                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>Farklı bir arama veya dönem seçebilirsiniz</div>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {sortedProductStats.map((p, idx) => {
                                    const sharePct = productPeriodTotalRevenue > 0 ? Number(((p.revenue / productPeriodTotalRevenue) * 100).toFixed(1)) : 0;
                                    const isTop1 = idx === 0;
                                    const isTop2 = idx === 1;
                                    const isTop3 = idx === 2;

                                    return (
                                        <motion.div
                                            key={p.name || idx}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            whileHover={{ scale: 1.006, x: 2 }}
                                            style={{
                                                background: isTop1 
                                                    ? 'linear-gradient(135deg, rgba(245, 159, 0, 0.08), rgba(28, 21, 20, 0.7))'
                                                    : 'rgba(255, 255, 255, 0.025)',
                                                border: isTop1 
                                                    ? '1px solid rgba(245, 159, 0, 0.3)' 
                                                    : '1px solid rgba(255, 255, 255, 0.06)',
                                                borderRadius: '13px',
                                                padding: '11px 13px',
                                                transition: 'border-color 0.15s ease, background-color 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                                {/* Left: Rank Badge + Name + Quantity */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                    {/* Rank Badge */}
                                                    <div style={{
                                                        width: '26px',
                                                        height: '26px',
                                                        minWidth: '26px',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 900,
                                                        background: isTop1 
                                                            ? 'linear-gradient(135deg, #f59f00, #ffc078)'
                                                            : isTop2 
                                                                ? 'linear-gradient(135deg, #94a3b8, #e2e8f0)'
                                                                : isTop3 
                                                                    ? 'linear-gradient(135deg, #b45309, #d97706)'
                                                                    : 'rgba(255, 255, 255, 0.06)',
                                                        color: isTop1 ? '#1c1514' : isTop2 ? '#0f172a' : isTop3 ? '#ffffff' : '#94a3b8',
                                                        boxShadow: isTop1 ? '0 0 12px rgba(245, 159, 0, 0.4)' : 'none'
                                                    }}>
                                                        {isTop1 ? <Crown size={13} strokeWidth={2.5} /> : idx + 1}
                                                    </div>

                                                    {/* Title & Badge */}
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ 
                                                            fontSize: '13px', 
                                                            fontWeight: 800, 
                                                            color: '#ffffff', 
                                                            whiteSpace: 'nowrap', 
                                                            overflow: 'hidden', 
                                                            textOverflow: 'ellipsis' 
                                                        }}>
                                                            {p.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <span style={{ 
                                                                fontSize: '11px', 
                                                                fontWeight: 800, 
                                                                color: 'var(--brand-primary, #f76707)',
                                                                background: 'rgba(247, 103, 7, 0.12)',
                                                                padding: '1px 6px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                {p.quantity} Adet
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)' }}>
                                                                %{sharePct} Pay
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Revenue */}
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ 
                                                        fontSize: '14px', 
                                                        fontWeight: 900, 
                                                        color: '#fffaf5',
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif" 
                                                    }}>
                                                        {formatMoney(p.revenue)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Micro Progress Bar */}
                                            <div style={{ 
                                                width: '100%', 
                                                height: '3.5px', 
                                                background: 'rgba(255, 255, 255, 0.05)', 
                                                borderRadius: '999px', 
                                                overflow: 'hidden', 
                                                marginTop: '8px' 
                                            }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, Math.max(3, sharePct))}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    style={{ 
                                                        height: '100%', 
                                                        background: isTop1 
                                                            ? 'linear-gradient(90deg, #f59f00, #ff922b)' 
                                                            : 'linear-gradient(90deg, #f76707, #f59f00)',
                                                        borderRadius: '999px' 
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>

                {/* Sağ Kart: Garson Performans Karnesi (Leaderboard) */}
                <div style={{ 
                    background: 'rgba(28, 21, 20, 0.75)', 
                    padding: '24px', 
                    borderRadius: '20px', 
                    border: '1px solid rgba(245, 159, 0, 0.16)', 
                    boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.1))',
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#60a5fa',
                                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.15)'
                            }}>
                                <Users size={22} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '17px', fontWeight: 900, margin: 0, color: '#ffffff', letterSpacing: '-0.3px' }}>
                                    Garson Satış & Performans Karnesi
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary, #d1b8af)', margin: '3px 0 0 0' }}>
                                    Hangi garson kaç masaya baktı, ne kadar ciro sağladı?
                                </p>
                            </div>
                        </div>

                        {/* Animated Tab Switcher */}
                        <div style={{ 
                            display: 'inline-flex', 
                            background: 'rgba(0, 0, 0, 0.45)', 
                            padding: '3px', 
                            borderRadius: '12px', 
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            position: 'relative'
                        }}>
                            {[
                                { id: 'today', label: 'Bugün' },
                                { id: 'week', label: 'Bu Hafta' },
                                { id: 'month', label: 'Bu Ay' },
                                { id: 'all', label: 'Tümü' }
                            ].map((tab) => {
                                const isActive = waiterPeriod === tab.id;
                                return (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setWaiterPeriod(tab.id)}
                                        style={{
                                            position: 'relative',
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '6px 12px',
                                            borderRadius: '9px',
                                            fontSize: '11.5px',
                                            fontWeight: isActive ? 800 : 600,
                                            color: isActive ? '#1c1514' : 'var(--text-secondary, #d1b8af)',
                                            cursor: 'pointer',
                                            zIndex: 1,
                                            transition: 'color 0.18s ease',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                                        }}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="waiterPeriodHighlight"
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    background: 'linear-gradient(135deg, #f59f00, #f76707)',
                                                    borderRadius: '9px',
                                                    zIndex: -1,
                                                    boxShadow: '0 2px 10px rgba(245, 159, 0, 0.4)'
                                                }}
                                                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                            />
                                        )}
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Controls Bar: Staff Count & Sort Buttons */}
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        gap: '12px', 
                        marginBottom: '14px',
                        paddingBottom: '12px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                        flexWrap: 'wrap'
                    }}>
                        {/* Summary Pill */}
                        <div style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            background: 'rgba(59, 130, 246, 0.1)', 
                            border: '1px solid rgba(59, 130, 246, 0.2)', 
                            padding: '4px 10px', 
                            borderRadius: '8px', 
                            fontSize: '11.5px', 
                            color: '#93c5fd', 
                            fontWeight: 700 
                        }}>
                            <User size={12} color="#60a5fa" />
                            <span>{sortedWaiterStats.length} Personel Aktif</span>
                        </div>

                        {/* Interactive Sort Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)', fontWeight: 700 }}>Sırala:</span>
                            {[
                                { id: 'revenue', label: 'Ciro' },
                                { id: 'orderCount', label: 'Masa' },
                                { id: 'name', label: 'İsim' }
                            ].map((sortOption) => {
                                const isSortActive = waiterSortField === sortOption.id;
                                return (
                                    <button
                                        key={sortOption.id}
                                        type="button"
                                        onClick={() => handleWaiterSort(sortOption.id)}
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '4px 9px',
                                            borderRadius: '8px',
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            border: isSortActive ? '1px solid rgba(59, 130, 246, 0.45)' : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: isSortActive ? 'rgba(59, 130, 246, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                                            color: isSortActive ? '#60a5fa' : 'var(--text-secondary, #d1b8af)',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <span>{sortOption.label}</span>
                                        {isSortActive ? (
                                            waiterSortDirection === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
                                        ) : (
                                            <ArrowUpDown size={10} style={{ opacity: 0.4 }} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Animated Waiter Feed (Custom Luxury Scroll) */}
                    <div className="luxury-scroll" style={{ maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                        {sortedWaiterStats.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary, #d1b8af)' }}>
                                <Users size={34} style={{ opacity: 0.3, marginBottom: '8px' }} />
                                <div style={{ fontSize: '13px', fontWeight: 700 }}>Garson kaydı bulunamadı</div>
                                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>Bu dönemde tamamlanan adisyon bulunmuyor</div>
                            </div>
                        ) : (
                            <AnimatePresence mode="popLayout">
                                {sortedWaiterStats.map((w, idx) => {
                                    const wShare = waiterPeriodTotalRevenue > 0 ? Number(((w.revenue / waiterPeriodTotalRevenue) * 100).toFixed(1)) : 0;
                                    const isTop1 = idx === 0;
                                    const isTop2 = idx === 1;
                                    const isTop3 = idx === 2;
                                    const initials = getWaiterInitials(w.name);

                                    return (
                                        <motion.div
                                            key={w.name || idx}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            transition={{ duration: 0.2 }}
                                            whileHover={{ scale: 1.006, x: 2 }}
                                            style={{
                                                background: isTop1 
                                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(28, 21, 20, 0.7))'
                                                    : 'rgba(255, 255, 255, 0.025)',
                                                border: isTop1 
                                                    ? '1px solid rgba(16, 185, 129, 0.3)' 
                                                    : '1px solid rgba(255, 255, 255, 0.06)',
                                                borderRadius: '13px',
                                                padding: '11px 13px',
                                                transition: 'border-color 0.15s ease, background-color 0.15s ease'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                                                {/* Left: Rank Badge + Avatar + Name + Order Count */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                    {/* Rank Badge */}
                                                    <div style={{
                                                        width: '26px',
                                                        height: '26px',
                                                        minWidth: '26px',
                                                        borderRadius: '8px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 900,
                                                        background: isTop1 
                                                            ? 'linear-gradient(135deg, #f59f00, #ffc078)'
                                                            : isTop2 
                                                                ? 'linear-gradient(135deg, #94a3b8, #e2e8f0)'
                                                                : isTop3 
                                                                    ? 'linear-gradient(135deg, #b45309, #d97706)'
                                                                    : 'rgba(255, 255, 255, 0.06)',
                                                        color: isTop1 ? '#1c1514' : isTop2 ? '#0f172a' : isTop3 ? '#ffffff' : '#94a3b8',
                                                        boxShadow: isTop1 ? '0 0 12px rgba(245, 159, 0, 0.4)' : 'none'
                                                    }}>
                                                        {isTop1 ? <Crown size={13} strokeWidth={2.5} /> : idx + 1}
                                                    </div>

                                                    {/* Monogram Avatar */}
                                                    <div style={{
                                                        width: '28px',
                                                        height: '28px',
                                                        minWidth: '28px',
                                                        borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.25), rgba(16, 185, 129, 0.25))',
                                                        border: '1px solid rgba(59, 130, 246, 0.35)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        color: '#93c5fd'
                                                    }}>
                                                        {initials}
                                                    </div>

                                                    {/* Name & Badge */}
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ 
                                                            fontSize: '13px', 
                                                            fontWeight: 800, 
                                                            color: '#ffffff', 
                                                            whiteSpace: 'nowrap', 
                                                            overflow: 'hidden', 
                                                            textOverflow: 'ellipsis' 
                                                        }}>
                                                            {w.name}
                                                        </div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                            <span style={{ 
                                                                fontSize: '11px', 
                                                                fontWeight: 800, 
                                                                color: '#60a5fa',
                                                                background: 'rgba(59, 130, 246, 0.12)',
                                                                padding: '1px 6px',
                                                                borderRadius: '6px'
                                                            }}>
                                                                {w.orderCount} Adisyon
                                                            </span>
                                                            <span style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)' }}>
                                                                %{wShare} Pay
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Revenue */}
                                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                                    <div style={{ 
                                                        fontSize: '14px', 
                                                        fontWeight: 900, 
                                                        color: '#10b981',
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif" 
                                                    }}>
                                                        {formatMoney(w.revenue)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Micro Progress Bar */}
                                            <div style={{ 
                                                width: '100%', 
                                                height: '3.5px', 
                                                background: 'rgba(255, 255, 255, 0.05)', 
                                                borderRadius: '999px', 
                                                overflow: 'hidden', 
                                                marginTop: '8px' 
                                            }}>
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${Math.min(100, Math.max(3, wShare))}%` }}
                                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                                    style={{ 
                                                        height: '100%', 
                                                        background: 'linear-gradient(90deg, #10b981, #06b6d4)',
                                                        borderRadius: '999px' 
                                                    }}
                                                />
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
