import React, { useState, useMemo, useEffect } from 'react';
import { 
    FileText, 
    Printer, 
    X, 
    TrendingUp, 
    Wallet, 
    CreditCard, 
    TrendingDown, 
    ShoppingBag, 
    Receipt, 
    CheckCircle2,
    Save,
    BarChart3,
    PieChart as PieIcon,
    Archive,
    Eye,
    Trash2,
    ArrowLeft,
    Clock,
    Calendar,
    Sparkles,
    Check
} from 'lucide-react';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    PieChart, 
    Pie, 
    Cell, 
    Tooltip, 
    XAxis, 
    YAxis 
} from 'recharts';
import { formatMoney } from '../data/menu';
import { printZReportTicket } from '../services/printService';
import { db, doc, setDoc, collection, getDocs, deleteDoc } from '../config/firebase';

const CustomClosingTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        const SORT_ORDER = {
            'revenue': 1,
            'toplam ciro': 1,
            'ciro': 1,
            'cash': 2,
            'nakit': 2,
            'card': 3,
            'kredi kartı': 3,
            'kart': 3,
            'expense': 4,
            'giderler': 4,
            'netprofit': 5,
            'net kâr': 5
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
                background: 'rgba(20, 15, 14, 0.96)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '10px',
                padding: '8px 12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '4px' }}>
                    {label}
                </div>
                {sortedPayload.map((entry, index) => (
                    <div key={index} style={{ fontSize: '12px', fontWeight: 800, color: entry.color, display: 'flex', justifyContent: 'space-between', gap: '10px', margin: '3px 0' }}>
                        <span>{entry.name}:</span>
                        <span style={{ fontFamily: 'monospace' }}>{formatMoney(entry.value)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export default function DailyClosingModal({
    isOpen,
    onClose,
    completedOrders = [],
    expenses = [],
    printerSettings = null,
    showToast
}) {
    if (!isOpen) return null;

    const [mainTab, setMainTab] = useState('current'); // 'current' | 'archive'
    const [periodTab, setPeriodTab] = useState('today'); // 'today' | 'week' | 'month'
    const [chartViewMode, setChartViewMode] = useState('flow'); // 'flow' (Eğri) | 'pie' (Dağılım)
    const [isSaving, setIsSaving] = useState(false);
    const [savedReports, setSavedReports] = useState([]);
    const [selectedArchivedReport, setSelectedArchivedReport] = useState(null);
    const [justSavedNotification, setJustSavedNotification] = useState(false);

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const periodStartTime = useMemo(() => {
        if (periodTab === 'today') return startOfToday;
        if (periodTab === 'week') return startOfWeek;
        return startOfMonth;
    }, [periodTab, startOfToday, startOfWeek, startOfMonth]);

    // Seçilen Döneme Göre Tamamlanan Siparişler
    const selectedOrders = useMemo(() => {
        return completedOrders.filter(o => {
            const t = new Date(o.created_at || o.closed_at || 0).getTime();
            return t >= periodStartTime;
        });
    }, [completedOrders, periodStartTime]);

    // Seçilen Döneme Göre Giderler
    const selectedExpenses = useMemo(() => {
        return (expenses || []).filter(e => {
            if (periodTab === 'today') {
                if (e.date) return e.date === todayStr;
                const t = new Date(e.created_at || 0).getTime();
                return t >= startOfToday;
            }
            const t = new Date(e.date || e.created_at || 0).getTime();
            return t >= periodStartTime;
        });
    }, [expenses, periodTab, todayStr, startOfToday, periodStartTime]);

    // Finansal Hesaplamalar
    const totalRevenue = useMemo(() => selectedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0), [selectedOrders]);
    const cashTotal = useMemo(() => selectedOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0), [selectedOrders]);
    const cardTotal = useMemo(() => selectedOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0), [selectedOrders]);
    const orderCount = selectedOrders.length;
    const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

    const expensesTotal = useMemo(() => selectedExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0), [selectedExpenses]);
    const cashExpenses = useMemo(() => selectedExpenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + (Number(e.amount) || 0), 0), [selectedExpenses]);
    
    // Net Nakit Kasa Kalanı = Nakit Ciro - Kasadan Çıkan Nakit Gider
    const netCash = cashTotal - cashExpenses;
    // Net İşletme Kârı = Brüt Ciro - Toplam Gider
    const netProfit = totalRevenue - expensesTotal;

    // Satılan Toplam Ürün Adedi
    const totalItemsCount = useMemo(() => {
        let count = 0;
        selectedOrders.forEach(o => {
            (o.items || []).forEach(it => {
                count += (Number(it.quantity) || 1);
            });
        });
        return count;
    }, [selectedOrders]);

    // Etkileşimli Saatlik/Günlük Grafik Verisi
    const chartData = useMemo(() => {
        if (periodTab === 'today') {
            const targetHours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0];
            const hoursMap = {};
            targetHours.forEach(h => {
                const label = `${String(h).padStart(2, '0')}:00`;
                hoursMap[label] = { label, count: 0, revenue: 0, cash: 0, card: 0 };
            });
            selectedOrders.forEach(o => {
                if (!o.created_at && !o.closed_at) return;
                const d = new Date(o.created_at || o.closed_at);
                const h = d.getHours();
                const label = `${String(h).padStart(2, '0')}:00`;
                if (hoursMap[label]) {
                    const tot = Number(o.total) || 0;
                    hoursMap[label].count += 1;
                    hoursMap[label].revenue += tot;
                    if (o.payment_method === 'cash') hoursMap[label].cash += tot;
                    else if (o.payment_method === 'card') hoursMap[label].card += tot;
                }
            });
            return Object.values(hoursMap);
        } else {
            const dateMap = {};
            selectedOrders.forEach(o => {
                if (!o.created_at && !o.closed_at) return;
                const d = new Date(o.created_at || o.closed_at);
                const dateKey = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
                if (!dateMap[dateKey]) {
                    dateMap[dateKey] = { label: dateKey, count: 0, revenue: 0, cash: 0, card: 0 };
                }
                const tot = Number(o.total) || 0;
                dateMap[dateKey].count += 1;
                dateMap[dateKey].revenue += tot;
                if (o.payment_method === 'cash') dateMap[dateKey].cash += tot;
                else if (o.payment_method === 'card') dateMap[dateKey].card += tot;
            });
            const list = Object.values(dateMap);
            return list.length > 0 ? list : [{ label: 'Bugün', count: 0, revenue: 0, cash: 0, card: 0 }];
        }
    }, [periodTab, selectedOrders]);

    // Finansal Pasta / Donut Dağılım Verisi
    const pieData = useMemo(() => {
        const items = [];
        if (cashTotal > 0) items.push({ name: 'Nakit Tahsilat', value: cashTotal, color: '#10b981' });
        if (cardTotal > 0) items.push({ name: 'Kredi Kartı', value: cardTotal, color: '#38bdf8' });
        if (expensesTotal > 0) items.push({ name: 'Giderler', value: expensesTotal, color: '#ef4444' });
        return items.length > 0 ? items : [{ name: 'Kayıtlı Veri Yok', value: 1, color: 'rgba(255,255,255,0.1)' }];
    }, [cashTotal, cardTotal, expensesTotal]);

    const reportNo = `Z-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Kayıtlı raporları yükle (Local Storage + Firestore)
    useEffect(() => {
        const fetchReports = async () => {
            let localList = [];
            try {
                const raw = localStorage.getItem('cafe_saved_daily_reports');
                if (raw) localList = JSON.parse(raw);
            } catch (e) {
                console.warn("Local storage parse error:", e);
            }

            try {
                const snap = await getDocs(collection(db, "daily_reports"));
                if (!snap.empty) {
                    const remoteList = snap.docs.map(d => ({ docId: d.id, ...d.data() }));
                    const map = new Map();
                    (Array.isArray(localList) ? localList : []).forEach(r => map.set(r.docId || r.reportNo, r));
                    remoteList.forEach(r => map.set(r.docId || r.reportNo, r));
                    const merged = Array.from(map.values()).sort((a, b) => {
                        const tA = new Date(a.savedAt || a.date || 0).getTime();
                        const tB = new Date(b.savedAt || b.date || 0).getTime();
                        return tB - tA;
                    });
                    setSavedReports(merged);
                    localStorage.setItem('cafe_saved_daily_reports', JSON.stringify(merged));
                    return;
                }
            } catch (err) {
                console.warn("Firestore reports fetch fallback:", err);
            }

            if (Array.isArray(localList)) {
                localList.sort((a, b) => {
                    const tA = new Date(a.savedAt || a.date || 0).getTime();
                    const tB = new Date(b.savedAt || b.date || 0).getTime();
                    return tB - tA;
                });
                setSavedReports(localList);
            }
        };

        if (isOpen) {
            fetchReports();
        }
    }, [isOpen]);

    const handleSaveClosing = async () => {
        setIsSaving(true);
        const docId = `${todayStr}_${periodTab}_${Date.now()}`;
        const closingDoc = {
            docId,
            reportNo: `${reportNo}${periodTab !== 'today' ? `-${periodTab.toUpperCase()}` : ''}`,
            date: dateFormatted,
            time: timeFormatted,
            savedAt: new Date().toISOString(),
            period: periodTab,
            totalRevenue,
            cashTotal,
            cardTotal,
            expensesTotal,
            cashExpenses,
            netCash,
            netProfit,
            orderCount,
            avgOrder,
            totalItemsCount
        };

        // 1. Önce güvenle yerel hafızaya kaydet
        try {
            const raw = localStorage.getItem('cafe_saved_daily_reports');
            const prev = raw ? JSON.parse(raw) : [];
            const filtered = Array.isArray(prev) ? prev.filter(p => (p.docId || p.reportNo) !== docId) : [];
            const nextList = [closingDoc, ...filtered].slice(0, 100);
            localStorage.setItem('cafe_saved_daily_reports', JSON.stringify(nextList));
            setSavedReports(nextList);
            setJustSavedNotification(true);
        } catch (e) {
            console.warn("Local storage save error:", e);
        }

        // 2. Firestore'a izin verilen koleksiyona kaydet
        let firestoreOk = false;
        try {
            await setDoc(doc(db, "daily_reports", docId), closingDoc);
            firestoreOk = true;
        } catch (e1) {
            try {
                await setDoc(doc(db, "daily_closings", docId), closingDoc);
                firestoreOk = true;
            } catch (e2) {
                console.warn("Firestore save fallback to local memory:", e2);
            }
        }

        if (showToast) {
            showToast(
                firestoreOk 
                    ? `Hesap özeti buluta ve arşive kaydedildi! (${closingDoc.reportNo})` 
                    : `Hesap özeti arşive kaydedildi! (${closingDoc.reportNo})`, 
                'success'
            );
        }
        setIsSaving(false);
    };

    const handleDeleteReport = async (rep, e) => {
        if (e) e.stopPropagation();
        const idToDelete = rep.docId || rep.reportNo;

        try {
            const raw = localStorage.getItem('cafe_saved_daily_reports');
            if (raw) {
                const arr = JSON.parse(raw);
                const filtered = arr.filter(r => (r.docId || r.reportNo) !== idToDelete);
                localStorage.setItem('cafe_saved_daily_reports', JSON.stringify(filtered));
            }
        } catch (e) {
            console.warn("Local delete error:", e);
        }

        try {
            if (rep.docId) await deleteDoc(doc(db, "daily_reports", rep.docId));
        } catch (e1) {
            try {
                if (rep.docId) await deleteDoc(doc(db, "daily_closings", rep.docId));
            } catch (e2) {}
        }

        setSavedReports(prev => prev.filter(r => (r.docId || r.reportNo) !== idToDelete));
        if (selectedArchivedReport && (selectedArchivedReport.docId || selectedArchivedReport.reportNo) === idToDelete) {
            setSelectedArchivedReport(null);
        }
        if (showToast) showToast(`Rapor (${rep.reportNo || idToDelete}) silindi.`, 'info');
    };

    const handlePrintArchivedReport = (rep, e) => {
        if (e) e.stopPropagation();
        const zData = {
            reportDate: rep.date || (rep.savedAt ? rep.savedAt.slice(0, 10) : ''),
            reportTime: rep.time || '',
            reportNo: rep.reportNo || rep.docId || 'Z-RAPORU',
            totalRevenue: rep.totalRevenue,
            cashTotal: rep.cashTotal,
            cardTotal: rep.cardTotal,
            expensesTotal: rep.expensesTotal,
            cashExpenses: rep.cashExpenses,
            netCash: rep.netCash,
            netProfit: rep.netProfit,
            orderCount: rep.orderCount,
            avgOrder: rep.avgOrder,
            totalItemsCount: rep.totalItemsCount
        };
        printZReportTicket(zData, printerSettings);
        if (showToast) showToast(`Z-Raporu (${zData.reportNo}) termal yazıcıya gönderildi!`, 'success');
    };

    const handlePrintZ = () => {
        const zData = {
            reportDate: dateFormatted,
            reportTime: timeFormatted,
            reportNo: `${reportNo}${periodTab !== 'today' ? `-${periodTab.toUpperCase()}` : ''}`,
            totalRevenue,
            cashTotal,
            cardTotal,
            expensesTotal,
            cashExpenses,
            netCash,
            netProfit,
            orderCount,
            avgOrder,
            totalItemsCount
        };

        printZReportTicket(zData, printerSettings);
        if (showToast) showToast('Rapor termal yazıcıya gönderildi!', 'success');
    };

    return (
        <div className="modal-overlay open" style={{ display: 'flex', opacity: 1, zIndex: 1100 }}>
            <div 
                className="modal-content open modal-responsive-card modal-lg" 
                style={{ 
                    maxWidth: '680px', 
                    width: '95vw',
                    background: 'linear-gradient(180deg, #1f1816 0%, #140f0e 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '24px',
                    padding: 'clamp(14px, 3vw, 24px)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.08)',
                    maxHeight: '92vh', 
                    overflowY: 'auto' 
                }}
            >
                {/* 1. ÜST BAŞLIK */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingBottom: '16px',
                    marginBottom: '18px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            width: '42px', 
                            height: '42px', 
                            borderRadius: '12px', 
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(247, 103, 7, 0.1))', 
                            border: '1px solid rgba(245, 158, 11, 0.35)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'var(--brand-gold)' 
                        }}>
                            <FileText size={22} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                                Gün Sonu Hesap Özeti (Z-Raporu)
                            </h3>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span>{dateFormatted} {timeFormatted}</span>
                                <span>•</span>
                                <span style={{ fontFamily: 'monospace', color: 'var(--brand-gold)', fontWeight: 700 }}>{reportNo}</span>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={onClose} 
                        style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: '50%', 
                            background: 'rgba(255, 255, 255, 0.06)', 
                            border: '1px solid rgba(255, 255, 255, 0.1)', 
                            color: 'var(--text-muted)', 
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div>
                        {/* Yeni Kaydedildi Bildirim Çubuğu */}
                        {justSavedNotification && (
                            <div style={{
                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                borderRadius: '12px',
                                padding: '10px 14px',
                                marginBottom: '14px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '10px',
                                animation: 'fadeIn 0.2s ease'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <CheckCircle2 size={16} color="#10b981" />
                                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                                        Hesap özeti başarıyla arşive eklendi!
                                    </span>
                                </div>
                                <button
                                    onClick={() => setMainTab('archive')}
                                    style={{
                                        background: '#10b981',
                                        color: '#062817',
                                        border: 'none',
                                        borderRadius: '8px',
                                        padding: '5px 12px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}
                                >
                                    <span>Rapor Arşivinde Gör</span> ➔
                                </button>
                            </div>
                        )}

                        {/* DÖNEM SEÇİCİ TABLAR (Bugün / Bu Hafta / Bu Ay) */}
                        <div style={{
                    display: 'flex',
                    background: 'rgba(0, 0, 0, 0.4)',
                    padding: '4px',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    marginBottom: '16px',
                    gap: '4px'
                }}>
                    <button
                        onClick={() => setPeriodTab('today')}
                        style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '9px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: periodTab === 'today' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                            color: periodTab === 'today' ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        ⏰ Bugün (Z)
                    </button>
                    <button
                        onClick={() => setPeriodTab('week')}
                        style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '9px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: periodTab === 'week' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                            color: periodTab === 'week' ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        📅 Bu Hafta
                    </button>
                    <button
                        onClick={() => setPeriodTab('month')}
                        style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: 'none',
                            borderRadius: '9px',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            background: periodTab === 'month' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                            color: periodTab === 'month' ? 'white' : 'var(--text-muted)',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        🗓️ Bu Ay
                    </button>
                </div>

                {/* 2. ANA FİNANSAL VİTRİN (2 BÜYÜK KOKPİT KARTI) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '12px', marginBottom: '16px' }}>
                    {/* Toplam Ciro */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(28, 21, 20, 0.8))', 
                        border: '1px solid rgba(245, 158, 11, 0.35)', 
                        borderRadius: '16px', 
                        padding: '16px' 
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            {periodTab === 'today' ? 'Bugünkü Toplam Ciro' : periodTab === 'week' ? 'Bu Haftaki Toplam Ciro' : 'Bu Ayki Toplam Ciro'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '4px', letterSpacing: '-0.3px' }}>
                            {formatMoney(totalRevenue)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px', fontWeight: 600 }}>
                            {orderCount} masa hesabı
                        </div>
                    </div>

                    {/* Net Kasa Kalanı */}
                    <div style={{ 
                        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(28, 21, 20, 0.8))', 
                        border: '1px solid rgba(16, 185, 129, 0.35)', 
                        borderRadius: '16px', 
                        padding: '16px' 
                    }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Net Nakit Kasa Kalanı
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 900, color: '#10b981', marginTop: '4px', letterSpacing: '-0.3px' }}>
                            {formatMoney(netCash)}
                        </div>
                        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '4px', fontWeight: 600 }}>
                            Nakit Tahsilat - Kasadan Çıkan
                        </div>
                    </div>
                </div>

                {/* ETKİLEŞİMLİ FİNANSAL GRAFİK ALANI */}
                <div style={{
                    background: 'rgba(0, 0, 0, 0.45)',
                    borderRadius: '16px',
                    border: '1px solid rgba(245, 158, 11, 0.2)',
                    padding: '16px',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--brand-gold)' }}>📊</span> 
                            {chartViewMode === 'flow' 
                                ? (periodTab === 'today' ? 'Saatlik Ciro & Akış Eğrisi' : 'Dönemsel Ciro Dağılımı') 
                                : 'Kasa & Ödeme Dağılımı'}
                        </div>

                        <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <button
                                type="button"
                                onClick={() => setChartViewMode('flow')}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: chartViewMode === 'flow' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                    color: chartViewMode === 'flow' ? 'var(--brand-gold)' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <BarChart3 size={12} /> Ciro Akışı
                            </button>
                            <button
                                type="button"
                                onClick={() => setChartViewMode('pie')}
                                style={{
                                    padding: '4px 10px',
                                    borderRadius: '6px',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    background: chartViewMode === 'pie' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                    color: chartViewMode === 'pie' ? '#38bdf8' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <PieIcon size={12} /> Kasa Dağılımı
                            </button>
                        </div>
                    </div>

                    {chartViewMode === 'flow' ? (
                        <div style={{ width: '100%', height: '170px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="modalRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="modalCashGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="label" stroke="rgba(255, 255, 255, 0.3)" fontSize={10} tickLine={false} />
                                    <YAxis stroke="rgba(255, 255, 255, 0.3)" fontSize={10} tickLine={false} tickFormatter={(val) => `₺${val}`} />
                                    <Tooltip content={<CustomClosingTooltip />} />
                                    <Area type="monotone" dataKey="revenue" name="Toplam Ciro" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#modalRevenueGrad)" />
                                    <Area type="monotone" dataKey="cash" name="Nakit" stroke="#10b981" strokeWidth={1.5} fillOpacity={1} fill="url(#modalCashGrad)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '170px', gap: '20px' }}>
                            <div style={{ width: '140px', height: '140px' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={35}
                                            outerRadius={58}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="rgba(0,0,0,0.4)" strokeWidth={1.5} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomClosingTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {pieData.map((entry, index) => (
                                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                        <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: entry.color }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>{entry.name}:</span>
                                        <strong style={{ color: 'white', fontFamily: 'monospace' }}>{formatMoney(entry.value)}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. TAHSİLAT & GİDER DETAY DÖKÜMÜ (Modern Finansal Tablo) */}
                <div style={{ 
                    background: 'rgba(0, 0, 0, 0.3)', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    padding: '16px', 
                    marginBottom: '16px' 
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💵 Nakit Tahsilat
                        </span>
                        <strong style={{ color: 'white', fontFamily: 'monospace', fontSize: '14px' }}>{formatMoney(cashTotal)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                        <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💳 Kredi Kartı Tahsilat
                        </span>
                        <strong style={{ color: 'white', fontFamily: 'monospace', fontSize: '14px' }}>{formatMoney(cardTotal)}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '13px' }}>
                        <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            💸 Toplam Giderler
                        </span>
                        <strong style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: '14px' }}>-{formatMoney(expensesTotal)}</strong>
                    </div>

                    {cashExpenses > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0 7px 18px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '12px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>↳ Kasadan Çıkan Nakit</span>
                            <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>-{formatMoney(cashExpenses)}</span>
                        </div>
                    )}

                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 0 2px 0', 
                        fontWeight: 900, 
                        fontSize: '15px' 
                    }}>
                        <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            📈 Net İşletme Kârı
                        </span>
                        <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', fontSize: '16px' }}>
                            {formatMoney(netProfit)}
                        </span>
                    </div>
                </div>

                {/* 4. OPERASYONEL İSTATİSTİKLER (3 HAP KART) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Masa Sayısı</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{orderCount}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ort. Masa</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>{formatMoney(avgOrder)}</div>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '12px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Toplam Ürün</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{totalItemsCount} Adet</div>
                    </div>
                </div>

                {/* 5. ALT AKSİYON BUTONLARI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={onClose}
                        className="btn-outline"
                        style={{ padding: '10px 18px', fontSize: '13px', borderRadius: '12px' }}
                    >
                        Kapat
                    </button>

                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

                        <button
                            type="button"
                            onClick={handleSaveClosing}
                            disabled={isSaving}
                            className="btn-outline"
                            style={{ 
                                padding: '10px 16px', 
                                fontSize: '13px', 
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                color: 'var(--brand-gold)',
                                borderColor: 'rgba(245, 158, 11, 0.4)'
                            }}
                        >
                            <Save size={15} /> {isSaving ? 'Kaydediliyor...' : 'Özeti Kaydet'}
                        </button>

                        <button
                            onClick={handlePrintZ}
                            className="btn-primary"
                            style={{ 
                                padding: '10px 20px', 
                                fontSize: '13px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                background: 'linear-gradient(135deg, #10b981, #059669)', 
                                borderColor: '#059669',
                                borderRadius: '12px',
                                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.35)'
                            }}
                        >
                            <Printer size={16} /> {periodTab === 'today' ? 'Termal Z-Raporu' : 'Raporu'} Yazdır
                        </button>
                    </div>
                </div>
            </div>
    </div>
</div>
    );
}
