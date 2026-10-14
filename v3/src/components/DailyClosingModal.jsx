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

const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const getReportFriendlyTitle = (rep) => {
    if (!rep) return 'Gün Sonu Raporu';
    if (rep.customTitle) return rep.customTitle;
    if (rep.title) return rep.title;

    let day = '', month = '', year = '';

    // Tarih alanından (örn: '14.10.2026' veya '2026-10-14')
    if (rep.date && typeof rep.date === 'string') {
        if (rep.date.includes('.')) {
            const p = rep.date.split('.');
            day = p[0];
            month = p[1];
            year = p[2];
        } else if (rep.date.includes('-')) {
            const p = rep.date.split('-');
            year = p[0];
            month = p[1];
            day = p[2];
        }
    }

    // Eğer tarih parse edilemediyse reportNo'dan (örn: 'Z-20261014')
    if (!year && rep.reportNo) {
        const digits = rep.reportNo.replace(/\D/g, '').slice(0, 8);
        if (digits.length === 8) {
            year = digits.slice(0, 4);
            month = digits.slice(4, 6);
            day = digits.slice(6, 8);
        }
    }

    const mIdx = parseInt(month, 10) - 1;
    const monthName = (mIdx >= 0 && mIdx < 12) ? TURKISH_MONTHS[mIdx] : month;
    const period = rep.period || (rep.reportNo && rep.reportNo.includes('MONTH') ? 'month' : (rep.reportNo && rep.reportNo.includes('WEEK') ? 'week' : 'today'));

    if (period === 'month') {
        return monthName && year ? `${monthName} ${year} • Aylık Kapanış Özeti` : 'Aylık Kapanış Özeti';
    }
    if (period === 'week') {
        return day && monthName ? `${parseInt(day, 10)} ${monthName} • Haftalık Hesap Özeti` : 'Haftalık Hesap Özeti';
    }
    // Günlük Z-Raporu
    if (day && monthName && year) {
        const timePart = rep.time ? ` (${rep.time})` : '';
        return `${parseInt(day, 10)} ${monthName} ${year} • Gün Sonu Özeti${timePart}`;
    }
    return rep.reportNo ? `${rep.reportNo} Gün Sonu Raporu` : 'Gün Sonu Hesap Özeti';
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
                hoursMap[label] = { label, hour: label, count: 0, revenue: 0, cash: 0, card: 0 };
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
                    dateMap[dateKey] = { label: dateKey, hour: dateKey, count: 0, revenue: 0, cash: 0, card: 0 };
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

    // Saatlik ve Pasta Dağılım Grafik Aliases
    const hourlyData = chartData;
    const distributionData = pieData;

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
        const generatedTitle = getReportFriendlyTitle({
            date: dateFormatted,
            time: timeFormatted,
            period: periodTab,
            reportNo
        });
        const closingDoc = {
            docId,
            reportNo: `${reportNo}${periodTab !== 'today' ? `-${periodTab.toUpperCase()}` : ''}`,
            title: generatedTitle,
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
                    ? `Hesap özeti kaydedildi! (${closingDoc.reportNo})` 
                    : `Hesap özeti arşive kaydedildi! (${closingDoc.reportNo})`, 
                'success'
            );
        }
        setIsSaving(false);
        setMainTab('archive');
        setSelectedArchivedReport(closingDoc);
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
        <div className="modal-overlay open" style={{ display: 'flex', opacity: 1, zIndex: 1100, padding: '12px' }}>
            <div 
                className="modal-content open modal-responsive-card modal-lg" 
                style={{ 
                    maxWidth: '680px', 
                    width: '96vw',
                    maxHeight: '92vh',
                    maxHeight: '92dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'linear-gradient(180deg, #1f1816 0%, #140f0e 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: '24px',
                    padding: 0,
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(245, 158, 11, 0.08)',
                    overflow: 'hidden'
                }}
            >
                {/* 1. SABİT ÜST BAŞLIK (STICKY HEADER) */}
                <div style={{
                    padding: '14px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(28, 21, 20, 0.95)',
                    flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                            width: '38px', 
                            height: '38px', 
                            borderRadius: '12px', 
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(247, 103, 7, 0.1))', 
                            border: '1px solid rgba(245, 158, 11, 0.35)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: 'var(--brand-gold)' 
                        }}>
                            <FileText size={20} />
                        </div>
                        <div>
                            <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
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

                {/* 2. KAYDIRILABİLİR İÇERİK GÖVDESİ (SCROLLABLE BODY) */}
                <div style={{
                    padding: '16px 20px',
                    overflowY: 'auto',
                    flex: '1 1 auto',
                    WebkitOverflowScrolling: 'touch'
                }}>
                    {/* ÜST SEÇİCİ BARI (Canlı vs Kayıtlı Özetler ve Dönemler) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginBottom: '14px',
                        flexWrap: 'wrap'
                    }}>
                        {/* Canlı vs Arşiv Seçici */}
                        <div style={{
                            display: 'flex',
                            background: 'rgba(0, 0, 0, 0.45)',
                            padding: '3px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            gap: '4px'
                        }}>
                            <button
                                type="button"
                                onClick={() => { setMainTab('current'); setSelectedArchivedReport(null); }}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '9px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: mainTab === 'current' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                                    color: mainTab === 'current' ? 'white' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <Sparkles size={13} /> Canlı Rapor
                            </button>
                            <button
                                type="button"
                                onClick={() => { setMainTab('archive'); setSelectedArchivedReport(null); }}
                                style={{
                                    padding: '6px 12px',
                                    border: 'none',
                                    borderRadius: '9px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    background: mainTab === 'archive' ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'transparent',
                                    color: mainTab === 'archive' ? 'white' : 'var(--text-muted)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <Archive size={13} /> Kayıtlı Özetler ({savedReports.length})
                            </button>
                        </div>

                        {/* Canlı modda Bugün / Bu Hafta / Bu Ay butonları */}
                        {mainTab === 'current' && (
                            <div style={{
                                display: 'flex',
                                background: 'rgba(0, 0, 0, 0.45)',
                                padding: '3px',
                                borderRadius: '12px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                gap: '4px'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => setPeriodTab('today')}
                                    style={{
                                        padding: '6px 10px',
                                        border: 'none',
                                        borderRadius: '9px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: periodTab === 'today' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                                        color: periodTab === 'today' ? 'var(--brand-gold)' : 'var(--text-muted)'
                                    }}
                                >
                                    Bugün (Z)
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPeriodTab('week')}
                                    style={{
                                        padding: '6px 10px',
                                        border: 'none',
                                        borderRadius: '9px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: periodTab === 'week' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                                        color: periodTab === 'week' ? 'white' : 'var(--text-muted)'
                                    }}
                                >
                                    Bu Hafta
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPeriodTab('month')}
                                    style={{
                                        padding: '6px 10px',
                                        border: 'none',
                                        borderRadius: '9px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        background: periodTab === 'month' ? 'rgba(255, 255, 255, 0.14)' : 'transparent',
                                        color: periodTab === 'month' ? 'white' : 'var(--text-muted)'
                                    }}
                                >
                                    Bu Ay
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2.A: CANLI HESAP ÖZETİ GÖRÜNÜMÜ */}
                    {mainTab === 'current' && (
                        <div>
                            {/* Yeni Kaydedildi Bildirimi */}
                            {justSavedNotification && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
                                    border: '1px solid rgba(16, 185, 129, 0.4)',
                                    borderRadius: '12px',
                                    padding: '8px 12px',
                                    marginBottom: '14px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <CheckCircle2 size={16} color="#10b981" />
                                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#34d399' }}>
                                            Hesap özeti başarıyla kaydedildi!
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => setMainTab('archive')}
                                        style={{
                                            background: '#10b981',
                                            color: '#062817',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '4px 10px',
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px'
                                        }}
                                    >
                                        <span>Arşivde Gör</span> ➔
                                    </button>
                                </div>
                            )}

                            {/* 2 KARTLI ÜST KPI KOKPİTİ */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                                gap: '12px',
                                marginBottom: '14px'
                            }}>
                                {/* Kart 1: Ciro */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(247, 103, 7, 0.05))',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    borderRadius: '18px',
                                    padding: '14px 18px',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        {periodTab === 'today' ? 'Bugünkü Toplam Ciro' : periodTab === 'week' ? 'Haftalık Toplam Ciro' : 'Aylık Toplam Ciro'}
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--brand-gold)', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '4px' }}>
                                        {formatMoney(totalRevenue)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        {orderCount} masa hesabı
                                    </div>
                                </div>

                                {/* Kart 2: Kasa Nakit */}
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))',
                                    border: '1px solid rgba(16, 185, 129, 0.35)',
                                    borderRadius: '18px',
                                    padding: '14px 18px',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)'
                                }}>
                                    <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Net Nakit Kasa Kalanı
                                    </div>
                                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', letterSpacing: '-0.5px', marginTop: '4px' }}>
                                        {formatMoney(netCash)}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                        Nakit Tahsilat - Kasadan Çıkan
                                    </div>
                                </div>
                            </div>

                            {/* 3. SAATLİK AKIŞ EĞRİSİ VEYA DAĞILIM GRAFİĞİ */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                borderRadius: '18px',
                                padding: '14px',
                                marginBottom: '14px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>
                                            📊 {periodTab === 'today' ? 'Saatlik Ciro & Akış Eğrisi' : 'Günlük Ciro & Akış Eğrisi'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0, 0, 0, 0.4)', padding: '3px', borderRadius: '8px' }}>
                                        <button
                                            type="button"
                                            onClick={() => setChartViewMode('flow')}
                                            style={{
                                                padding: '4px 10px',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                background: chartViewMode === 'flow' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                                color: chartViewMode === 'flow' ? 'var(--brand-gold)' : 'var(--text-muted)'
                                            }}
                                        >
                                            <BarChart3 size={11} style={{ display: 'inline', marginRight: '4px' }} />
                                            Ciro Akışı
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setChartViewMode('pie')}
                                            style={{
                                                padding: '4px 10px',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                background: chartViewMode === 'pie' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                                color: chartViewMode === 'pie' ? '#38bdf8' : 'var(--text-muted)'
                                            }}
                                        >
                                            <PieIcon size={11} style={{ display: 'inline', marginRight: '4px' }} />
                                            Kasa Dağılımı
                                        </button>
                                    </div>
                                </div>

                                <div style={{ height: '160px', width: '100%' }}>
                                    {chartViewMode === 'flow' ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={hourlyData} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                                                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} tickFormatter={(v) => `₺${v}`} />
                                                <Tooltip content={<CustomClosingTooltip />} />
                                                <Area type="monotone" dataKey="revenue" name="Ciro" stroke="#f59e0b" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={distributionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={68}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {distributionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip content={<CustomClosingTooltip />} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            {/* 4. NET FİNANSAL DÖKÜM */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.025)',
                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                borderRadius: '18px',
                                padding: '14px 18px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                marginBottom: '14px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💵 Nakit Tahsilat
                                    </span>
                                    <span style={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                                        {formatMoney(cashTotal)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💳 Kredi Kartı Tahsilat
                                    </span>
                                    <span style={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>
                                        {formatMoney(cardTotal)}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        💸 Toplam Giderler
                                    </span>
                                    <span style={{ fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>
                                        -{formatMoney(expensesTotal)}
                                    </span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontSize: '15px',
                                    fontWeight: 900,
                                    borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
                                    paddingTop: '10px'
                                }}>
                                    <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        📈 Net İşletme Kârı
                                    </span>
                                    <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace', fontSize: '16px' }}>
                                        {formatMoney(netProfit)}
                                    </span>
                                </div>
                            </div>

                            {/* OPERASYONEL ÖZET (3 KUTU) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Masa Sayısı</div>
                                    <div style={{ fontSize: '17px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{orderCount}</div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ort. Masa</div>
                                    <div style={{ fontSize: '17px', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>{formatMoney(avgOrder)}</div>
                                </div>
                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 8px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Toplam Ürün</div>
                                    <div style={{ fontSize: '17px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{totalItemsCount} Adet</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2.B: KAYITLI ÖZETLER (ARŞİV) GÖRÜNÜMÜ */}
                    {mainTab === 'archive' && (
                        <div>
                            {selectedArchivedReport ? (
                                /* Seçilen Raporun Detayı */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'rgba(2, 132, 199, 0.12)',
                                        border: '1px solid rgba(56, 189, 248, 0.3)',
                                        borderRadius: '14px',
                                        padding: '10px 14px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedArchivedReport(null)}
                                                style={{
                                                    background: 'rgba(255,255,255,0.08)',
                                                    border: '1px solid rgba(255,255,255,0.15)',
                                                    borderRadius: '8px',
                                                    padding: '5px 10px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <ArrowLeft size={13} /> Geri Dön
                                            </button>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#38bdf8' }}>
                                                    {getReportFriendlyTitle(selectedArchivedReport)}
                                                </div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>#{selectedArchivedReport.reportNo || 'Z-Raporu'}</span>
                                                    <span>•</span>
                                                    <span>📅 {selectedArchivedReport.date} {selectedArchivedReport.time || ''}</span>
                                                    <span>•</span>
                                                    <span>👥 {selectedArchivedReport.orderCount || 0} Masa</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                type="button"
                                                onClick={(e) => handlePrintArchivedReport(selectedArchivedReport, e)}
                                                style={{
                                                    background: 'linear-gradient(135deg, #10b981, #059669)',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '6px 10px',
                                                    color: 'white',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <Printer size={12} /> Yazdır
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => handleDeleteReport(selectedArchivedReport, e)}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.15)',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '8px',
                                                    padding: '6px 8px',
                                                    color: '#ef4444',
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer'
                                                }}
                                                title="Sil"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Finansal Özet Kartları */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '10px'
                                    }}>
                                        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '14px', padding: '12px 16px' }}>
                                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)' }}>TOPLAM CİRO</div>
                                            <div style={{ fontSize: '22px', fontWeight: 900, color: 'var(--brand-gold)', fontFamily: 'monospace', marginTop: '2px' }}>
                                                {formatMoney(selectedArchivedReport.totalRevenue)}
                                            </div>
                                        </div>
                                        <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '14px', padding: '12px 16px' }}>
                                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)' }}>KASA NAKİT KALAN</div>
                                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', marginTop: '2px' }}>
                                                {formatMoney(selectedArchivedReport.netCash)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Kalem Dağılımı */}
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.025)',
                                        border: '1px solid rgba(255, 255, 255, 0.06)',
                                        borderRadius: '16px',
                                        padding: '12px 16px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '8px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>💵 Nakit Tahsilat</span>
                                            <span style={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{formatMoney(selectedArchivedReport.cashTotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                            <span style={{ color: 'var(--text-secondary)' }}>💳 Kredi Kartı Tahsilat</span>
                                            <span style={{ fontWeight: 800, color: 'white', fontFamily: 'monospace' }}>{formatMoney(selectedArchivedReport.cardTotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                            <span style={{ color: '#ef4444' }}>💸 Toplam Giderler</span>
                                            <span style={{ fontWeight: 800, color: '#ef4444', fontFamily: 'monospace' }}>-{formatMoney(selectedArchivedReport.expensesTotal)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 900, borderTop: '1px dashed rgba(255, 255, 255, 0.12)', paddingTop: '8px' }}>
                                            <span style={{ color: 'white' }}>📈 Net İşletme Kârı</span>
                                            <span style={{ color: (selectedArchivedReport.netProfit || 0) >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>
                                                {formatMoney(selectedArchivedReport.netProfit)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Operasyonel Özet */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 6px', borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Masa Sayısı</div>
                                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{selectedArchivedReport.orderCount || 0}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 6px', borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Ort. Masa</div>
                                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>{formatMoney(selectedArchivedReport.avgOrder)}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 6px', borderRadius: '12px' }}>
                                            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Toplam Ürün</div>
                                            <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{selectedArchivedReport.totalItemsCount || 0} Adet</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Kayıtlı Raporlar Listesi */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {savedReports.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-muted)' }}>
                                            <Archive size={36} style={{ opacity: 0.35, marginBottom: '10px' }} />
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: 'white' }}>Henüz Kayıtlı Rapor Yok</div>
                                            <div style={{ fontSize: '12px', marginTop: '4px' }}>Canlı hesap özetinde "Özeti Kaydet" butonuna bastığınızda raporlarınız burada listelenecektir.</div>
                                        </div>
                                    ) : (
                                        savedReports.map((rep) => (
                                            <div
                                                key={rep.docId || rep.reportNo || Math.random()}
                                                onClick={() => setSelectedArchivedReport(rep)}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.07)',
                                                    borderRadius: '14px',
                                                    padding: '12px 14px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    gap: '10px'
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.07)'; e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                                            >
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '14px', fontWeight: 900, color: 'white' }}>
                                                            {getReportFriendlyTitle(rep)}
                                                        </span>
                                                        <span style={{ 
                                                            fontSize: '10px', 
                                                            padding: '2px 7px', 
                                                            borderRadius: '4px', 
                                                            background: rep.period === 'month' || rep.reportNo?.includes('MONTH') ? 'rgba(168, 85, 247, 0.15)' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)'), 
                                                            color: rep.period === 'month' || rep.reportNo?.includes('MONTH') ? '#c084fc' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? '#38bdf8' : 'var(--brand-gold)'), 
                                                            fontWeight: 800 
                                                        }}>
                                                            {rep.period === 'month' || rep.reportNo?.includes('MONTH') ? '🗓️ Aylık' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? '📆 Haftalık' : '📋 Günlük (Z)')}
                                                        </span>
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>#{rep.reportNo || 'Z-Raporu'}</span>
                                                        <span>•</span>
                                                        <span>🕒 {rep.time ? `${rep.date} ${rep.time}` : rep.date}</span>
                                                        <span>•</span>
                                                        <span>👥 {rep.orderCount || 0} Masa</span>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontSize: '14px', fontWeight: 900, color: 'var(--brand-gold)', fontFamily: 'monospace' }}>
                                                            {formatMoney(rep.totalRevenue)}
                                                        </div>
                                                        <div style={{ fontSize: '10.5px', color: '#10b981', fontWeight: 700 }}>
                                                            Kasa: {formatMoney(rep.netCash)}
                                                        </div>
                                                    </div>

                                                    <div style={{ display: 'flex', gap: '5px' }} onClick={(e) => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedArchivedReport(rep)}
                                                            style={{ background: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '8px', padding: '5px 8px', color: '#38bdf8', cursor: 'pointer' }}
                                                            title="İncele"
                                                        >
                                                            <Eye size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handlePrintArchivedReport(rep, e)}
                                                            style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '8px', padding: '5px 8px', color: '#10b981', cursor: 'pointer' }}
                                                            title="Yazdır"
                                                        >
                                                            <Printer size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleDeleteReport(rep, e)}
                                                            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', padding: '5px 8px', color: '#ef4444', cursor: 'pointer' }}
                                                            title="Sil"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 3. SABİT ALT AKSİYON BARI (STICKY FOOTER - ASLA EKRANDAN TAŞMAZ) */}
                <div style={{
                    padding: '12px 20px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(18, 13, 12, 0.98)',
                    backdropFilter: 'blur(10px)',
                    flexShrink: 0,
                    gap: '10px',
                    flexWrap: 'wrap'
                }}>
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-outline"
                        style={{ padding: '8px 16px', fontSize: '12.5px', borderRadius: '10px' }}
                    >
                        Kapat
                    </button>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {mainTab === 'current' ? (
                            <>
                                <button
                                    type="button"
                                    onClick={handleSaveClosing}
                                    disabled={isSaving}
                                    className="btn-outline"
                                    style={{ 
                                        padding: '8px 14px', 
                                        fontSize: '12.5px', 
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        color: 'var(--brand-gold)',
                                        borderColor: 'rgba(245, 158, 11, 0.4)'
                                    }}
                                >
                                    <Save size={14} /> {isSaving ? 'Kaydediliyor...' : 'Özeti Kaydet'}
                                </button>

                                <button
                                    type="button"
                                    onClick={handlePrintZ}
                                    className="btn-primary"
                                    style={{ 
                                        padding: '8px 16px', 
                                        fontSize: '12.5px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        background: 'linear-gradient(135deg, #10b981, #059669)', 
                                        borderColor: '#059669',
                                        borderRadius: '10px',
                                        boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                                    }}
                                >
                                    <Printer size={15} /> {periodTab === 'today' ? 'Termal Z-Raporu' : 'Raporu'} Yazdır
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => { setMainTab('current'); setSelectedArchivedReport(null); }}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '12.5px',
                                    borderRadius: '10px',
                                    background: 'linear-gradient(135deg, var(--brand-primary), #e8590c)',
                                    border: 'none',
                                    color: 'white',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}
                            >
                                <Sparkles size={14} /> Canlı Rapora Dön
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
