import React, { useState, useMemo, useEffect } from 'react';
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
    Table as TableIcon
} from 'lucide-react';
import ModernDatePicker from './ModernDatePicker';

const COLORS = {
    gold: '#f59e0b',
    goldGlow: 'rgba(245, 158, 11, 0.25)',
    cash: '#10b981',
    card: '#3b82f6',
    purple: '#a855f7',
    orange: '#f97316',
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
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
            fontSize: '13px',
            minWidth: '180px'
        }}>
            <div style={{ fontWeight: 800, color: 'white', marginBottom: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '4px' }}>
                {headerTitle}
            </div>
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
                            gap: '14px', 
                            margin: '4px 0', 
                            fontSize: '12px',
                            paddingTop: isNetProfit ? '4px' : '0',
                            borderTop: isNetProfit ? '1px dashed rgba(255, 255, 255, 0.12)' : 'none'
                        }}
                    >
                        <span style={{ 
                            color: entry.color, 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px',
                            fontWeight: isRevenue || isNetProfit ? 800 : 600 
                        }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: entry.color, flexShrink: 0 }} />
                            {entry.name}:
                        </span>
                        <span style={{ 
                            fontWeight: isRevenue || isNetProfit ? 900 : 700, 
                            color: isExpense ? '#f87171' : isNetProfit ? (entry.value >= 0 ? '#10b981' : '#f87171') : 'white', 
                            fontFamily: 'monospace' 
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

    // Seçilen döneme göre dinamik hesaplanan garson istatistikleri
    const dynamicWaiterStats = useMemo(() => {
        const map = {};
        waiterFilteredOrders.forEach(o => {
            const name = o.waiter_name || 'Bilinmiyor';
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
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        return (expenses || []).filter(e => {
            const expTime = new Date(e.date || e.created_at || 0).getTime();
            if (currentPeriod === 'today') {
                const todayStr = now.toISOString().slice(0, 10);
                return (e.date && e.date === todayStr) || expTime >= startOfToday;
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
            const sortKey = d.toISOString().slice(0, 10);
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

            {/* 4 BÜYÜK MODERN KPI KARTI (DÖNEM FİLTRESİNE GÖRE DİNAMİK) */}
            <div className="admin-kpi-grid" style={{ marginBottom: 0 }}>
                {/* 1. Net Ciro (Dinamik Başlık) */}
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
                            {currentPeriod === 'today' ? 'Bugün Toplam Ciro' : currentPeriod === 'week' ? 'Bu Hafta Toplam Ciro' : currentPeriod === 'month' ? 'Bu Ay Toplam Ciro' : 'Tüm Zamanlar Toplam Ciro'}
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

                {/* 2. Ortalama Masa Harcaması (Dinamik Dönem Başlığı & Açıklaması) */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {currentPeriod === 'today' ? 'Bugün Ort. Masa Harcaması' : currentPeriod === 'week' ? 'Bu Hafta Ort. Masa Harcaması' : currentPeriod === 'month' ? 'Bu Ay Ort. Masa Harcaması' : 'Tüm Zamanlar Ort. Masa Harcaması'}
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa' }}>
                            <ShoppingBag size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: 'var(--brand-primary)', letterSpacing: '-0.5px' }}>
                        {formatMoney(avgOrder)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                        {currentPeriod === 'today' ? 'Bugünkü masa başına ortalama' : currentPeriod === 'week' ? 'Bu haftaki masa başına ortalama' : currentPeriod === 'month' ? 'Bu aydaki masa başına ortalama' : 'Masa başına ortalama harcama'}
                    </div>
                </div>

                {/* 4. Toplam Gider (Harcamalar - Dinamik Dönem Başlığı & Açıklaması) */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), var(--bg-surface))',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {currentPeriod === 'today' ? 'Bugün Toplam Gider' : currentPeriod === 'week' ? 'Bu Hafta Toplam Gider' : currentPeriod === 'month' ? 'Bu Ay Toplam Gider' : 'Tüm Zamanlar Toplam Gider'}
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <ArrowDownRight size={20} />
                        </div>
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.5px' }}>
                        -{formatMoney(totalExpenses)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 700 }}>
                        {currentPeriod === 'today' ? 'Bugün kaydedilen tüm harcamalar' : currentPeriod === 'week' ? 'Bu hafta kaydedilen harcamalar' : currentPeriod === 'month' ? 'Bu ay kaydedilen harcamalar' : 'Dönem içi kaydedilen tüm harcamalar'}
                    </div>
                </div>

                {/* 5. Net İşletme Kârı (Dinamik Dönem Başlığı & Açıklaması) */}
                <div style={{
                    background: netProfit >= 0
                        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), var(--bg-surface))'
                        : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), var(--bg-surface))',
                    border: `1px solid ${netProfit >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {currentPeriod === 'today' ? 'Bugün Net İşletme Kârı' : currentPeriod === 'week' ? 'Bu Hafta Net İşletme Kârı' : currentPeriod === 'month' ? 'Bu Ay Net İşletme Kârı' : 'Tüm Zamanlar Net Kâr'}
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: netProfit >= 0 ? '#10b981' : '#ef4444' }}>
                            {netProfit >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                        </div>
                    </div>
                    <div style={{ fontSize: '30px', fontWeight: 900, color: netProfit >= 0 ? '#10b981' : '#ef4444', letterSpacing: '-0.5px' }}>
                        {formatMoney(netProfit)}
                    </div>
                    <div style={{ fontSize: '12px', color: netProfit >= 0 ? '#10b981' : '#ef4444', marginTop: '6px', fontWeight: 700 }}>
                        {netProfit >= 0 ? '✓ Kârda' : '✕ Zararda'} ({currentPeriod === 'today' ? 'Bugünkü Ciro' : currentPeriod === 'week' ? 'Haftalık Ciro' : currentPeriod === 'month' ? 'Aylık Ciro' : 'Ciro'} - Giderler)
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
                            {chartMode === 'hourly' && 'Bugün: Saatlik Sipariş Yoğunluğu ve Ciro Dağılımı (07:00 – 00:00)'}
                            {chartMode === 'weekly' && 'Bu Hafta: Gün Gün Ciro Eğrisi (Pazartesi - Pazar)'}
                            {chartMode === 'monthly' && 'Bu Ay: Günlük Ciro Dağılım Trendi (1 - 31 Gün)'}
                            {chartMode === 'all' && 'Tüm Zamanlar: Genel Ciro ve Tarihsel Sipariş Eğrisi'}
                        </h3>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                            Grafik üzerine gelerek detaylı gün ve saat dökümünü inceleyebilirsiniz
                        </p>
                    </div>

                    {/* Grafik Görünüm Seçici Butonları */}
                    <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface-elevated)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)', flexWrap: 'wrap' }}>
                        <button
                            onClick={() => handleSelectPeriod('today')}
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
                            ⏰ Bugün
                        </button>
                        <button
                            onClick={() => handleSelectPeriod('week')}
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
                            onClick={() => handleSelectPeriod('month')}
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
                            onClick={() => handleSelectPeriod('all')}
                            style={{
                                padding: '6px 14px',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '12px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                background: chartMode === 'all' ? 'linear-gradient(135deg, var(--brand-primary), var(--brand-primary-hover))' : 'rgba(255,255,255,0.06)',
                                color: chartMode === 'all' ? 'white' : 'var(--text-muted)',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            🌐 Tüm Zamanlar
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

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center', gap: '20px' }}>
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
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: COLORS.cash, fontWeight: 700 }}>💵 Nakit Kasa</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '4px 0' }}>{formatMoney(cashTotal)}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%{cashPct} Oran</div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: COLORS.card, fontWeight: 700 }}>💳 Kredi Kartı</div>
                            <div style={{ fontSize: '18px', fontWeight: 800, color: 'white', margin: '4px 0' }}>{formatMoney(cardTotal)}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>%{cardPct} Oran</div>
                        </div>
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Dönem Filtre Butonları */}
                            <div className="filter-pill-group" style={{ margin: 0 }}>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${productPeriod === 'today' ? 'active' : ''}`}
                                    onClick={() => setProductPeriod('today')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Bugün
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${productPeriod === 'week' ? 'active' : ''}`}
                                    onClick={() => setProductPeriod('week')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Bu Hafta
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${productPeriod === 'month' ? 'active' : ''}`}
                                    onClick={() => setProductPeriod('month')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Bu Ay
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${productPeriod === 'all' ? 'active' : ''}`}
                                    onClick={() => setProductPeriod('all')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Tümü
                                </button>
                            </div>

                            {/* Arama Kutusu */}
                            <div style={{ position: 'relative' }}>
                                <input 
                                    type="text" 
                                    placeholder="Ürün ara..." 
                                    value={productSearch}
                                    onChange={(e) => setProductSearch(e.target.value)}
                                    style={{ padding: '6px 10px 6px 28px', background: 'var(--bg-surface-elevated)', border: '1px solid var(--border-card)', color: 'white', borderRadius: 'var(--radius-md)', fontSize: '12px', width: '130px' }}
                                />
                                <Search size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                            </div>
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
                                        const sharePct = productPeriodTotalRevenue > 0 ? ((p.revenue / productPeriodTotalRevenue) * 100).toFixed(1) : 0;
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 800, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Users size={18} className="text-amber-400" />
                                Garson Satış & Performans Karnesi
                            </h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                                Hangi garson kaç masaya baktı, ne kadar ciro sağladı?
                            </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Dönem Filtre Butonları */}
                            <div className="filter-pill-group" style={{ margin: 0 }}>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${waiterPeriod === 'today' ? 'active' : ''}`}
                                    onClick={() => setWaiterPeriod('today')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Bugün
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${waiterPeriod === 'week' ? 'active' : ''}`}
                                    onClick={() => setWaiterPeriod('week')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Bu Hafta
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${waiterPeriod === 'month' ? 'active' : ''}`}
                                    onClick={() => setWaiterPeriod('month')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Bu Ay
                                </button>
                                <button
                                    type="button"
                                    className={`filter-pill-btn ${waiterPeriod === 'all' ? 'active' : ''}`}
                                    onClick={() => setWaiterPeriod('all')}
                                    style={{ padding: '4px 10px', fontSize: '11.5px' }}
                                >
                                    Tümü
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto', maxHeight: '420px' }}>
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
                                        const wShare = waiterPeriodTotalRevenue > 0 ? ((w.revenue / waiterPeriodTotalRevenue) * 100).toFixed(1) : 0;
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
                </div>
            </div>

        </div>
    );
}
