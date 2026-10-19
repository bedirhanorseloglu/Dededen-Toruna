import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
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
    Users,
    Check,
    Tag
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
    showToast: propShowToast
}) {
    const { showConfirm, showToast: contextShowToast } = useApp();
    const showToast = propShowToast || contextShowToast;

    const [mainTab, setMainTab] = useState('current'); // 'current' | 'archive'
    const [periodTab, setPeriodTab] = useState('today'); // 'today' | 'week' | 'month'
    const [chartViewMode, setChartViewMode] = useState('flow'); // 'flow' (Eğri) | 'pie' (Dağılım)
    const [isSaving, setIsSaving] = useState(false);
    const [savedReports, setSavedReports] = useState([]);
    const [selectedArchivedReport, setSelectedArchivedReport] = useState(null);
    const [justSavedNotification, setJustSavedNotification] = useState(false);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
                const eDate = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
                return eDate === todayStr;
            }
            const t = new Date(e.date || e.created_at || 0).getTime();
            return t >= periodStartTime;
        });
    }, [expenses, periodTab, todayStr, startOfToday, periodStartTime]);

    // Finansal Hesaplamalar
    const totalRevenue = useMemo(() => selectedOrders.reduce((s, o) => s + (Number(o.total) || 0), 0), [selectedOrders]);
    const discountTotal = useMemo(() => selectedOrders.reduce((s, o) => s + (Number(o.discount) || 0), 0), [selectedOrders]);
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

    const hourlyData = chartData;
    const distributionData = pieData;

    const reportNo = `Z-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const dateFormatted = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeFormatted = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Kayıtlı raporları yükle (Local Storage + Firestore çift yönlü senkronizasyon)
    useEffect(() => {
        const fetchReports = async () => {
            let localList = [];
            try {
                const raw = localStorage.getItem('cafe_saved_daily_reports');
                if (raw) localList = JSON.parse(raw);
            } catch (e) {
                console.warn("Local storage parse error:", e);
            }

            const map = new Map();
            (Array.isArray(localList) ? localList : []).forEach(r => {
                if (r) map.set(r.docId || r.reportNo, r);
            });

            const remoteDocIds = new Set();

            // 1. daily_reports koleksiyonunu çek
            try {
                const snap = await getDocs(collection(db, "daily_reports"));
                snap.docs.forEach(d => {
                    remoteDocIds.add(d.id);
                    const data = { docId: d.id, ...d.data() };
                    map.set(d.id || data.reportNo, data);
                });
            } catch (err) {
                console.warn("daily_reports fetch warning:", err);
            }

            // 2. daily_closings koleksiyonunu da çek (uyumluluk için)
            try {
                const snap2 = await getDocs(collection(db, "daily_closings"));
                snap2.docs.forEach(d => {
                    remoteDocIds.add(d.id);
                    const data = { docId: d.id, ...d.data() };
                    map.set(d.id || data.reportNo, data);
                });
            } catch (err2) {
                // opsiyonel
            }

            const merged = Array.from(map.values()).sort((a, b) => {
                const tA = new Date(a.savedAt || a.date || 0).getTime();
                const tB = new Date(b.savedAt || b.date || 0).getTime();
                return tB - tA;
            });

            setSavedReports(merged);
            try {
                localStorage.setItem('cafe_saved_daily_reports', JSON.stringify(merged));
            } catch (e) { }

            // 3. Yerelde olup Firestore'da olmayan raporları (örn. bilgisayarda kalan manuel özetleri) buluta eşitle
            if (Array.isArray(localList)) {
                localList.forEach(async (locRep) => {
                    const id = locRep.docId || locRep.reportNo;
                    if (id && !remoteDocIds.has(id)) {
                        try {
                            await setDoc(doc(db, "daily_reports", id), locRep);
                        } catch (syncErr) {
                            console.warn("Cloud sync error for report:", id, syncErr);
                        }
                    }
                });
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
            discountTotal,
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

        // 2. Firestore'a kaydet
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
        const repTitle = getReportFriendlyTitle(rep);
        const ok = await showConfirm({
            title: 'Hesap Özetini Sil',
            message: `"${repTitle}" kaydını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
            confirmText: 'Evet, Sil',
            cancelText: 'Vazgeç',
            variant: 'danger'
        });
        if (!ok) return;

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
            discountTotal: rep.discountTotal || 0,
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
            discountTotal,
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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div 
                style={{ 
                    position: 'fixed',
                    inset: 0,
                    zIndex: 1100, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    padding: 'clamp(8px, 2vw, 16px)' 
                }}
            >
                {/* 1. Backdrop Blur Overlay (Emil Kowalski Standartı) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(8, 6, 5, 0.85)',
                        backdropFilter: 'blur(14px)',
                        WebkitBackdropFilter: 'blur(14px)',
                        zIndex: 0
                    }}
                />

                {/* 2. Modal Kart Gövdesi (21st.dev Mimarisi + Emil Kowalski Giriş Fiziği + Tam Responsive Boyutlama) */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 14 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: -10 }}
                    transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                    onClick={(e) => e.stopPropagation()}
                    style={{ 
                        position: 'relative',
                        maxWidth: '720px', 
                        width: 'min(720px, 98vw)',
                        maxHeight: '94vh',
                        maxHeight: '94dvh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(180deg, rgba(26, 20, 18, 0.98) 0%, rgba(14, 11, 10, 0.99) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.22)',
                        borderRadius: 'clamp(18px, 4vw, 26px)',
                        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.85), inset 0 1px 1px rgba(255, 255, 255, 0.14)',
                        overflow: 'hidden',
                        zIndex: 1
                    }}
                >
                    {/* 21st.dev Katman 1: Ambient Glow Aura (Arkaya Yayılan Işık) */}
                    <div style={{
                        position: 'absolute',
                        top: -45,
                        left: '15%',
                        right: '15%',
                        height: '130px',
                        background: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.25), rgba(247, 103, 7, 0.08), transparent 70%)',
                        filter: 'blur(35px)',
                        pointerEvents: 'none',
                        zIndex: 0
                    }} />

                    {/* 21st.dev Katman 3: Specular Hairline (Üst kenardaki 1px ışık kırılması) */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: '8%',
                        right: '8%',
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.75), rgba(247, 103, 7, 0.5), transparent)',
                        borderRadius: '2px',
                        pointerEvents: 'none',
                        zIndex: 2
                    }} />

                    {/* 1. ÜST BAŞLIK (STICKY GLASS HEADER - RESPONSIVE) */}
                    <div style={{
                        position: 'relative',
                        padding: 'clamp(12px, 2.5vw, 16px) clamp(14px, 3vw, 22px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(28, 21, 20, 0.88)',
                        backdropFilter: 'blur(16px)',
                        flexShrink: 0,
                        gap: '10px',
                        zIndex: 2
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(10px, 2.5vw, 14px)', minWidth: 0 }}>
                            <div style={{ 
                                width: 'clamp(36px, 8vw, 42px)', 
                                height: 'clamp(36px, 8vw, 42px)', 
                                borderRadius: '12px', 
                                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(247, 103, 7, 0.1))', 
                                border: '1px solid rgba(245, 158, 11, 0.35)', 
                                boxShadow: '0 4px 18px rgba(245, 158, 11, 0.15)',
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                color: 'var(--brand-gold)',
                                flexShrink: 0
                            }}>
                                <FileText size={20} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <h3 style={{ 
                                        fontSize: 'clamp(15px, 4vw, 18px)', 
                                        fontWeight: 900, 
                                        color: 'white', 
                                        margin: 0, 
                                        letterSpacing: '-0.3px',
                                        whiteSpace: 'nowrap',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis'
                                    }}>
                                        Gün Sonu Hesap Özeti
                                    </h3>
                                    <span style={{
                                        fontSize: '9.5px',
                                        fontWeight: 800,
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        background: 'rgba(245, 158, 11, 0.16)',
                                        color: 'var(--brand-gold)',
                                        border: '1px solid rgba(245, 158, 11, 0.32)',
                                        letterSpacing: '0.4px',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        Z-RAPORU
                                    </span>
                                </div>
                                <div style={{ fontSize: 'clamp(10.5px, 2.8vw, 11.5px)', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                    <span>{dateFormatted} {timeFormatted}</span>
                                    <span style={{ opacity: 0.35 }}>•</span>
                                    <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{reportNo}</span>
                                </div>
                            </div>
                        </div>

                        {/* Kapat Butonu (Emil Kowalski Mikro Basış) */}
                        <motion.button 
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
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
                                flexShrink: 0
                            }}
                        >
                            <X size={15} />
                        </motion.button>
                    </div>

                    {/* 2. KAYDIRILABİLİR İÇERİK GÖVDESİ */}
                    <div style={{
                        position: 'relative',
                        padding: 'clamp(12px, 3vw, 20px)',
                        overflowY: 'auto',
                        flex: '1 1 auto',
                        WebkitOverflowScrolling: 'touch',
                        zIndex: 1
                    }}>
                        {/* 21st.dev MANYETİK KAYAN SEKME KONTROLÜ (Responsive Flex-Wrap) */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '14px',
                            flexWrap: 'wrap'
                        }}>
                            {/* Manyetik Canlı vs Arşiv Sekmesi */}
                            <div style={{
                                display: 'flex',
                                position: 'relative',
                                background: 'rgba(0, 0, 0, 0.45)',
                                padding: '3.5px',
                                borderRadius: '13px',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                flex: '1 1 auto',
                                maxWidth: '100%',
                                justifyContent: 'center'
                            }}>
                                <button
                                    type="button"
                                    onClick={() => { setMainTab('current'); setSelectedArchivedReport(null); }}
                                    style={{
                                        position: 'relative',
                                        padding: '7px clamp(8px, 2.5vw, 15px)',
                                        border: 'none',
                                        background: 'transparent',
                                        borderRadius: '10px',
                                        fontSize: 'clamp(11px, 2.8vw, 12px)',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        color: mainTab === 'current' ? '#ffffff' : 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        flex: '1 1 auto',
                                        zIndex: 1,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {mainTab === 'current' && (
                                        <motion.div
                                            layoutId="closing-main-tab-pill"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, var(--brand-primary), #e8590c)',
                                                boxShadow: '0 2px 14px rgba(247, 103, 7, 0.4)',
                                                zIndex: -1
                                            }}
                                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                        />
                                    )}
                                    <BarChart3 size={13} /> Canlı Rapor
                                </button>

                                <button
                                    type="button"
                                    onClick={() => { setMainTab('archive'); setSelectedArchivedReport(null); }}
                                    style={{
                                        position: 'relative',
                                        padding: '7px clamp(8px, 2.5vw, 15px)',
                                        border: 'none',
                                        background: 'transparent',
                                        borderRadius: '10px',
                                        fontSize: 'clamp(11px, 2.8vw, 12px)',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        color: mainTab === 'archive' ? '#ffffff' : 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px',
                                        flex: '1 1 auto',
                                        zIndex: 1,
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    {mainTab === 'archive' && (
                                        <motion.div
                                            layoutId="closing-main-tab-pill"
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                borderRadius: '10px',
                                                background: 'linear-gradient(135deg, var(--brand-primary), #e8590c)',
                                                boxShadow: '0 2px 14px rgba(247, 103, 7, 0.4)',
                                                zIndex: -1
                                            }}
                                            transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                        />
                                    )}
                                    <Archive size={13} /> Kayıtlı Özetler ({savedReports.length})
                                </button>
                            </div>

                            {/* Canlı Mod Dönem Filtresi Manyetik Sekme */}
                            {mainTab === 'current' && (
                                <div style={{
                                    display: 'flex',
                                    position: 'relative',
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    padding: '3.5px',
                                    borderRadius: '13px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    flex: '1 1 auto',
                                    justifyContent: 'center'
                                }}>
                                    {[
                                        { key: 'today', label: 'Bugün (Z)' },
                                        { key: 'week', label: 'Bu Hafta' },
                                        { key: 'month', label: 'Bu Ay' }
                                    ].map(p => (
                                        <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => setPeriodTab(p.key)}
                                            style={{
                                                position: 'relative',
                                                padding: '6px clamp(6px, 2vw, 12px)',
                                                border: 'none',
                                                background: 'transparent',
                                                borderRadius: '9px',
                                                fontSize: 'clamp(10.5px, 2.6vw, 11.5px)',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                color: periodTab === p.key ? 'var(--brand-gold)' : 'var(--text-muted)',
                                                flex: '1 1 auto',
                                                textAlign: 'center',
                                                zIndex: 1,
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {periodTab === p.key && (
                                                <motion.div
                                                    layoutId="closing-period-pill"
                                                    style={{
                                                        position: 'absolute',
                                                        inset: 0,
                                                        borderRadius: '9px',
                                                        background: 'rgba(255, 255, 255, 0.12)',
                                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                                                        zIndex: -1
                                                    }}
                                                    transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                                                />
                                            )}
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* AKICI İÇERİK GEÇİŞİ (Emil Kowalski AnimatePresence mode="wait" + Micro-blur) */}
                        <AnimatePresence mode="wait">
                            {mainTab === 'current' ? (
                                <motion.div
                                    key={`current-${periodTab}`}
                                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    {/* Kaydedildi Bildirimi */}
                                    {justSavedNotification && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            style={{
                                                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.08))',
                                                border: '1px solid rgba(16, 185, 129, 0.4)',
                                                borderRadius: '14px',
                                                padding: '10px 14px',
                                                marginBottom: '14px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                gap: '8px',
                                                flexWrap: 'wrap'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <CheckCircle2 size={16} color="#10b981" />
                                                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#34d399' }}>
                                                    Hesap özeti başarıyla kaydedildi!
                                                </span>
                                            </div>
                                            <motion.button
                                                whileHover={{ scale: 1.04 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => setMainTab('archive')}
                                                style={{
                                                    background: '#10b981',
                                                    color: '#062817',
                                                    border: 'none',
                                                    borderRadius: '8px',
                                                    padding: '5px 12px',
                                                    fontSize: '11.5px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '4px'
                                                }}
                                            >
                                                <span>Arşivde Gör</span> ➔
                                            </motion.button>
                                        </motion.div>
                                    )}

                                    {/* 2 KARTLI ÜST KPI KOKPİTİ (Responsive Grid) */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                                        gap: '12px',
                                        marginBottom: '14px'
                                    }}>
                                        {/* Kart 1: Toplam Ciro */}
                                        <div style={{
                                            position: 'relative',
                                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(247, 103, 7, 0.05))',
                                            border: '1px solid rgba(245, 158, 11, 0.32)',
                                            borderRadius: '18px',
                                            padding: '14px clamp(12px, 3vw, 18px)',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: '12%',
                                                right: '12%',
                                                height: '1px',
                                                background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.5), transparent)'
                                            }} />
                                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                {periodTab === 'today' ? 'Bugünkü Toplam Ciro' : periodTab === 'week' ? 'Haftalık Toplam Ciro' : 'Aylık Toplam Ciro'}
                                            </div>
                                            <div style={{ 
                                                fontSize: 'clamp(22px, 6.5vw, 28px)', 
                                                fontWeight: 900, 
                                                color: 'var(--brand-gold)', 
                                                letterSpacing: '-0.5px', 
                                                marginTop: '3px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {formatMoney(totalRevenue)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                                {orderCount} masa hesabı
                                            </div>
                                        </div>

                                        {/* Kart 2: Net Nakit Kasa Kalanı */}
                                        <div style={{
                                            position: 'relative',
                                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12), rgba(5, 150, 105, 0.05))',
                                            border: '1px solid rgba(16, 185, 129, 0.32)',
                                            borderRadius: '18px',
                                            padding: '14px clamp(12px, 3vw, 18px)',
                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: '12%',
                                                right: '12%',
                                                height: '1px',
                                                background: 'linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.5), transparent)'
                                            }} />
                                            <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Net Nakit Kasa Kalanı
                                            </div>
                                            <div style={{ 
                                                fontSize: 'clamp(22px, 6.5vw, 28px)', 
                                                fontWeight: 900, 
                                                color: '#10b981', 
                                                letterSpacing: '-0.5px', 
                                                marginTop: '3px',
                                                whiteSpace: 'nowrap'
                                            }}>
                                                {formatMoney(netCash)}
                                            </div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                                                Nakit Tahsilat - Kasadan Çıkan
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3. SAATLİK AKIŞ EĞRİSİ VEYA DAĞILIM GRAFİĞİ */}
                                    <div style={{
                                        background: 'rgba(255, 255, 255, 0.025)',
                                        border: '1px solid rgba(255, 255, 255, 0.07)',
                                        borderRadius: '18px',
                                        padding: '14px',
                                        marginBottom: '14px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '12.5px', fontWeight: 800, color: 'white' }}>
                                                    📊 {periodTab === 'today' ? 'Saatlik Ciro & Akış Eğrisi' : 'Günlük Ciro & Akış Eğrisi'}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '3px', background: 'rgba(0, 0, 0, 0.45)', padding: '3px', borderRadius: '9px' }}>
                                                <button
                                                    type="button"
                                                    onClick={() => setChartViewMode('flow')}
                                                    style={{
                                                        padding: '4px 9px',
                                                        border: 'none',
                                                        borderRadius: '7px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        background: chartViewMode === 'flow' ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                                                        color: chartViewMode === 'flow' ? 'var(--brand-gold)' : 'var(--text-muted)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <BarChart3 size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                                    Ciro Akışı
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setChartViewMode('pie')}
                                                    style={{
                                                        padding: '4px 9px',
                                                        border: 'none',
                                                        borderRadius: '7px',
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        cursor: 'pointer',
                                                        background: chartViewMode === 'pie' ? 'rgba(56, 189, 248, 0.25)' : 'transparent',
                                                        color: chartViewMode === 'pie' ? '#38bdf8' : 'var(--text-muted)',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <PieIcon size={11} style={{ display: 'inline', marginRight: '3px' }} />
                                                    Kasa Dağılımı
                                                </button>
                                            </div>
                                        </div>

                                        <div style={{ height: 'clamp(140px, 22vh, 170px)', width: '100%' }}>
                                            {chartViewMode === 'flow' ? (
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={hourlyData} margin={{ top: 5, right: 6, left: -22, bottom: 0 }}>
                                                        <defs>
                                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                                                                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <XAxis dataKey="hour" stroke="rgba(255,255,255,0.3)" fontSize={9.5} tickLine={false} />
                                                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={9.5} tickLine={false} tickFormatter={(v) => `₺${v}`} />
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
                                                            innerRadius={42}
                                                            outerRadius={65}
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
                                        padding: '14px clamp(12px, 3vw, 18px)',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                        marginBottom: '14px'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'clamp(12px, 3vw, 13px)' }}>
                                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Wallet size={14} color="#10b981" /> Nakit Tahsilat
                                            </span>
                                            <span style={{ fontWeight: 800, color: 'white' }}>
                                                {formatMoney(cashTotal)}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'clamp(12px, 3vw, 13px)' }}>
                                            <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <CreditCard size={14} color="#38bdf8" /> Kredi Kartı Tahsilat
                                            </span>
                                            <span style={{ fontWeight: 800, color: 'white' }}>
                                                {formatMoney(cardTotal)}
                                            </span>
                                        </div>
                                        {discountTotal > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'clamp(12px, 3vw, 13px)' }}>
                                                <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Tag size={14} color="#f59e0b" /> Toplam İndirim / İkram
                                                </span>
                                                <span style={{ fontWeight: 800, color: '#f59e0b' }}>
                                                    -{formatMoney(discountTotal)}
                                                </span>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'clamp(12px, 3vw, 13px)' }}>
                                            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingDown size={14} color="#ef4444" /> Toplam Giderler
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#ef4444' }}>
                                                -{formatMoney(expensesTotal)}
                                            </span>
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            fontSize: 'clamp(14px, 3.5vw, 15.5px)',
                                            fontWeight: 900,
                                            borderTop: '1px dashed rgba(255, 255, 255, 0.12)',
                                            paddingTop: '10px'
                                        }}>
                                            <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <TrendingUp size={15} color={netProfit >= 0 ? '#10b981' : '#ef4444'} /> Net İşletme Kârı
                                            </span>
                                            <span style={{ color: netProfit >= 0 ? '#10b981' : '#ef4444', fontSize: 'clamp(15px, 4vw, 17px)' }}>
                                                {formatMoney(netProfit)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* OPERASYONEL ÖZET (3 KUTU - Responsive) */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                            <div style={{ fontSize: 'clamp(9px, 2.5vw, 10.5px)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Masa Sayısı</div>
                                            <div style={{ fontSize: 'clamp(15px, 4.2vw, 18px)', fontWeight: 900, color: 'white', marginTop: '2px' }}>{orderCount}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                            <div style={{ fontSize: 'clamp(9px, 2.5vw, 10.5px)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Ort. Masa</div>
                                            <div style={{ fontSize: 'clamp(15px, 4.2vw, 18px)', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>{formatMoney(avgOrder)}</div>
                                        </div>
                                        <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 4px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                            <div style={{ fontSize: 'clamp(9px, 2.5vw, 10.5px)', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Toplam Ürün</div>
                                            <div style={{ fontSize: 'clamp(15px, 4.2vw, 18px)', fontWeight: 900, color: 'white', marginTop: '2px' }}>{totalItemsCount} Adet</div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key={selectedArchivedReport ? 'archive-detail' : 'archive-list'}
                                    initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
                                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    {selectedArchivedReport ? (
                                        /* Seçilen Raporun Detayı */
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                background: 'rgba(2, 132, 199, 0.12)',
                                                border: '1px solid rgba(56, 189, 248, 0.3)',
                                                borderRadius: '16px',
                                                padding: '12px 14px',
                                                flexWrap: 'wrap',
                                                gap: '10px'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        type="button"
                                                        onClick={() => setSelectedArchivedReport(null)}
                                                        style={{
                                                            background: 'rgba(255,255,255,0.08)',
                                                            border: '1px solid rgba(255,255,255,0.15)',
                                                            borderRadius: '9px',
                                                            padding: '6px 10px',
                                                            color: 'white',
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px',
                                                            cursor: 'pointer',
                                                            flexShrink: 0
                                                        }}
                                                    >
                                                        <ArrowLeft size={13} /> Geri Dön
                                                    </motion.button>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '15px', fontWeight: 900, color: 'white', letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {getReportFriendlyTitle(selectedArchivedReport)}
                                                        </div>
                                                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 700 }}>#{selectedArchivedReport.reportNo || 'Z-Raporu'}</span>
                                                            <span style={{ opacity: 0.35 }}>•</span>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <Calendar size={12} color="var(--brand-gold)" />
                                                                <span>{selectedArchivedReport.date} {selectedArchivedReport.time || ''}</span>
                                                            </span>
                                                            <span style={{ opacity: 0.35 }}>•</span>
                                                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                <Users size={12} color="var(--text-muted)" />
                                                                <span>{selectedArchivedReport.orderCount || 0} Masa</span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        type="button"
                                                        onClick={(e) => handlePrintArchivedReport(selectedArchivedReport, e)}
                                                        style={{
                                                            background: 'linear-gradient(135deg, #10b981, #059669)',
                                                            border: 'none',
                                                            borderRadius: '9px',
                                                            padding: '6px 12px',
                                                            color: 'white',
                                                            fontSize: '11.5px',
                                                            fontWeight: 800,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            cursor: 'pointer',
                                                            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
                                                        }}
                                                    >
                                                        <Printer size={13} /> Yazdır
                                                    </motion.button>
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        type="button"
                                                        onClick={(e) => handleDeleteReport(selectedArchivedReport, e)}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.15)',
                                                            border: '1px solid rgba(239, 68, 68, 0.35)',
                                                            borderRadius: '9px',
                                                            padding: '6px 10px',
                                                            color: '#ef4444',
                                                            fontSize: '11.5px',
                                                            fontWeight: 700,
                                                            cursor: 'pointer'
                                                        }}
                                                        title="Sil"
                                                    >
                                                        <Trash2 size={13} />
                                                    </motion.button>
                                                </div>
                                            </div>

                                            {/* Finansal Özet Kartları (Responsive Grid) */}
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
                                                gap: '10px'
                                            }}>
                                                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.28)', borderRadius: '14px', padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)' }}>TOPLAM CİRO</div>
                                                    <div style={{ fontSize: 'clamp(20px, 5.5vw, 24px)', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>
                                                        {formatMoney(selectedArchivedReport.totalRevenue)}
                                                    </div>
                                                </div>
                                                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.28)', borderRadius: '14px', padding: '12px 16px' }}>
                                                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: 'var(--text-muted)' }}>KASA NAKİT KALAN</div>
                                                    <div style={{ fontSize: 'clamp(20px, 5.5vw, 24px)', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                                                        {formatMoney(selectedArchivedReport.netCash)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Kalem Dağılımı */}
                                            <div style={{
                                                background: 'rgba(255, 255, 255, 0.025)',
                                                border: '1px solid rgba(255, 255, 255, 0.07)',
                                                borderRadius: '16px',
                                                padding: '12px 16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '9px'
                                            }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><Wallet size={13} color="#10b981" /> Nakit Tahsilat</span>
                                                    <span style={{ fontWeight: 800, color: 'white' }}>{formatMoney(selectedArchivedReport.cashTotal)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}><CreditCard size={13} color="#38bdf8" /> Kredi Kartı Tahsilat</span>
                                                    <span style={{ fontWeight: 800, color: 'white' }}>{formatMoney(selectedArchivedReport.cardTotal)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                                                    <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingDown size={13} color="#ef4444" /> Toplam Giderler</span>
                                                    <span style={{ fontWeight: 800, color: '#ef4444' }}>-{formatMoney(selectedArchivedReport.expensesTotal)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', fontWeight: 900, borderTop: '1px dashed rgba(255, 255, 255, 0.12)', paddingTop: '9px' }}>
                                                    <span style={{ color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}><TrendingUp size={14} color={(selectedArchivedReport.netProfit || 0) >= 0 ? '#10b981' : '#ef4444'} /> Net İşletme Kârı</span>
                                                    <span style={{ color: (selectedArchivedReport.netProfit || 0) >= 0 ? '#10b981' : '#ef4444' }}>
                                                        {formatMoney(selectedArchivedReport.netProfit)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Operasyonel Özet */}
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 4px', borderRadius: '12px' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Masa Sayısı</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{selectedArchivedReport.orderCount || 0}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 4px', borderRadius: '12px' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Ort. Masa</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand-gold)', marginTop: '2px' }}>{formatMoney(selectedArchivedReport.avgOrder)}</div>
                                                </div>
                                                <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '10px 4px', borderRadius: '12px' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700 }}>Toplam Ürün</div>
                                                    <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', marginTop: '2px' }}>{selectedArchivedReport.totalItemsCount || 0} Adet</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* Kayıtlı Raporlar Listesi (21st.dev Card List - Tam Responsive) */
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                                            {savedReports.length === 0 ? (
                                                <div style={{ textAlign: 'center', padding: '36px 14px', color: 'var(--text-muted)' }}>
                                                    <Archive size={38} style={{ opacity: 0.35, marginBottom: '10px' }} />
                                                    <div style={{ fontSize: '14.5px', fontWeight: 800, color: 'white' }}>Henüz Kayıtlı Rapor Yok</div>
                                                    <div style={{ fontSize: '12px', marginTop: '4px', maxWidth: '320px', margin: '4px auto 0 auto' }}>
                                                        Canlı hesap özetinde "Özeti Kaydet" butonuna bastığınızda kapanış raporlarınız burada listelenecektir.
                                                    </div>
                                                </div>
                                            ) : (
                                                savedReports.map((rep) => (
                                                    <motion.div
                                                        key={rep.docId || rep.reportNo || Math.random()}
                                                        whileHover={{ y: -2, borderColor: 'rgba(245, 158, 11, 0.35)' }}
                                                        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                                        onClick={() => setSelectedArchivedReport(rep)}
                                                        style={{
                                                            position: 'relative',
                                                            background: 'linear-gradient(135deg, rgba(28, 21, 19, 0.95), rgba(18, 14, 13, 0.98))',
                                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                                            borderRadius: '16px',
                                                            padding: '14px clamp(12px, 3vw, 18px)',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            cursor: 'pointer',
                                                            gap: '12px',
                                                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.08)',
                                                            flexWrap: 'wrap',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        {/* Üst İnce Refraksiyon Çizgisi */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: '10%',
                                                            right: '10%',
                                                            height: '1px',
                                                            background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.45), transparent)'
                                                        }} />

                                                        {/* Sol Taraf (Başlık, Etiket, Tarih - Modern ve Sade) */}
                                                        <div style={{ flex: '1 1 210px', minWidth: 0 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ fontSize: '14.5px', fontWeight: 900, color: 'white', letterSpacing: '-0.3px' }}>
                                                                    {getReportFriendlyTitle(rep)}
                                                                </span>
                                                                <span style={{ 
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    fontSize: '10.5px', 
                                                                    padding: '3px 8px', 
                                                                    borderRadius: '6px', 
                                                                    background: rep.period === 'month' || rep.reportNo?.includes('MONTH') ? 'rgba(168, 85, 247, 0.14)' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? 'rgba(56, 189, 248, 0.14)' : 'rgba(245, 158, 11, 0.14)'), 
                                                                    color: rep.period === 'month' || rep.reportNo?.includes('MONTH') ? '#c084fc' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? '#38bdf8' : 'var(--brand-gold)'), 
                                                                    fontWeight: 800,
                                                                    border: `1px solid ${rep.period === 'month' || rep.reportNo?.includes('MONTH') ? 'rgba(168, 85, 247, 0.28)' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? 'rgba(56, 189, 248, 0.28)' : 'rgba(245, 158, 11, 0.28)')}`
                                                                }}>
                                                                    <FileText size={11} />
                                                                    <span>{rep.period === 'month' || rep.reportNo?.includes('MONTH') ? 'Aylık' : (rep.period === 'week' || rep.reportNo?.includes('WEEK') ? 'Haftalık' : 'Günlük Z')}</span>
                                                                </span>
                                                            </div>
                                                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                <span style={{ color: 'rgba(255,255,255,0.45)', fontWeight: 700 }}>#{rep.reportNo || 'Z-Raporu'}</span>
                                                                <span style={{ opacity: 0.35 }}>•</span>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Clock size={12} color="var(--brand-gold)" />
                                                                    <span>{rep.time ? `${rep.date} ${rep.time}` : rep.date}</span>
                                                                </span>
                                                                <span style={{ opacity: 0.35 }}>•</span>
                                                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                                    <Users size={12} color="var(--text-muted)" />
                                                                    <span>{rep.orderCount || 0} Masa</span>
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Sağ Taraf (Tutar & Butonlar - Asla Taşmaz) */}
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flex: '1 1 auto', flexWrap: 'wrap' }}>
                                                            <div style={{ textAlign: 'right', minWidth: '95px' }}>
                                                                <div style={{ fontSize: '16.5px', fontWeight: 900, color: 'var(--brand-gold)', letterSpacing: '-0.3px' }}>
                                                                    {formatMoney(rep.totalRevenue)}
                                                                </div>
                                                                <div style={{ 
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px',
                                                                    fontSize: '11px', 
                                                                    color: '#10b981', 
                                                                    fontWeight: 800, 
                                                                    marginTop: '2px',
                                                                    padding: '2px 7px',
                                                                    borderRadius: '6px',
                                                                    background: 'rgba(16, 185, 129, 0.1)',
                                                                    border: '1px solid rgba(16, 185, 129, 0.22)'
                                                                }}>
                                                                    <span>Kasa:</span>
                                                                    <span>{formatMoney(rep.netCash)}</span>
                                                                </div>
                                                            </div>

                                                            <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.08 }}
                                                                    whileTap={{ scale: 0.92 }}
                                                                    type="button"
                                                                    onClick={() => setSelectedArchivedReport(rep)}
                                                                    style={{ 
                                                                        background: 'rgba(255, 255, 255, 0.05)', 
                                                                        border: '1px solid rgba(255, 255, 255, 0.12)', 
                                                                        borderRadius: '9px', 
                                                                        padding: '7px 10px', 
                                                                        color: 'var(--text-secondary)', 
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    title="İncele"
                                                                >
                                                                    <Eye size={14} />
                                                                </motion.button>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.08 }}
                                                                    whileTap={{ scale: 0.92 }}
                                                                    type="button"
                                                                    onClick={(e) => handlePrintArchivedReport(rep, e)}
                                                                    style={{ 
                                                                        background: 'rgba(16, 185, 129, 0.12)', 
                                                                        border: '1px solid rgba(16, 185, 129, 0.28)', 
                                                                        borderRadius: '9px', 
                                                                        padding: '7px 10px', 
                                                                        color: '#10b981', 
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    title="Yazdır"
                                                                >
                                                                    <Printer size={14} />
                                                                </motion.button>
                                                                <motion.button
                                                                    whileHover={{ scale: 1.08 }}
                                                                    whileTap={{ scale: 0.92 }}
                                                                    type="button"
                                                                    onClick={(e) => handleDeleteReport(rep, e)}
                                                                    style={{ 
                                                                        background: 'rgba(239, 68, 68, 0.12)', 
                                                                        border: '1px solid rgba(239, 68, 68, 0.28)', 
                                                                        borderRadius: '9px', 
                                                                        padding: '7px 10px', 
                                                                        color: '#ef4444', 
                                                                        cursor: 'pointer',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center'
                                                                    }}
                                                                    title="Sil"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </motion.button>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* 3. SABİT ALT AKSİYON BARI (21st.dev Shimmer CTA & Glass Footer - Tam Responsive) */}
                    <div style={{
                        position: 'relative',
                        padding: '12px clamp(12px, 3vw, 20px) calc(12px + env(safe-area-inset-bottom, 0px)) clamp(12px, 3vw, 20px)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(18, 14, 13, 0.96)',
                        backdropFilter: 'blur(16px)',
                        flexShrink: 0,
                        gap: '8px',
                        flexWrap: 'wrap',
                        zIndex: 2
                    }}>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.96 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                            type="button"
                            onClick={onClose}
                            className="btn-outline"
                            style={{ 
                                padding: '8px clamp(12px, 2.5vw, 18px)', 
                                fontSize: '12.5px', 
                                borderRadius: '11px',
                                border: '1px solid rgba(255, 255, 255, 0.14)',
                                background: 'rgba(255, 255, 255, 0.04)',
                                color: 'var(--text-secondary)',
                                flex: '1 1 auto',
                                minWidth: '70px',
                                textAlign: 'center'
                            }}
                        >
                            Kapat
                        </motion.button>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', flex: '2 1 auto', justifyContent: 'flex-end' }}>
                            {mainTab === 'current' ? (
                                <>
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        type="button"
                                        onClick={handleSaveClosing}
                                        disabled={isSaving}
                                        className="btn-outline"
                                        style={{ 
                                            padding: '8px clamp(10px, 2vw, 15px)', 
                                            fontSize: '12.5px', 
                                            borderRadius: '11px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px',
                                            color: 'var(--brand-gold)',
                                            borderColor: 'rgba(245, 158, 11, 0.45)',
                                            background: 'rgba(245, 158, 11, 0.08)',
                                            flex: '1 1 auto',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <Save size={14} /> {isSaving ? 'Kaydediliyor...' : 'Özeti Kaydet'}
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.96 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                        type="button"
                                        onClick={handlePrintZ}
                                        style={{ 
                                            position: 'relative',
                                            overflow: 'hidden',
                                            padding: '8px clamp(12px, 2.5vw, 18px)', 
                                            fontSize: '12.5px', 
                                            fontWeight: 800,
                                            borderRadius: '11px',
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center',
                                            gap: '6px', 
                                            background: 'linear-gradient(135deg, #10b981, #059669)', 
                                            border: 'none',
                                            color: 'white',
                                            cursor: 'pointer',
                                            boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                                            flex: '1 1 auto',
                                            whiteSpace: 'nowrap'
                                        }}
                                    >
                                        <Printer size={14} /> {periodTab === 'today' ? 'Termal Z-Raporu' : 'Raporu'} Yazdır
                                    </motion.button>
                                </>
                            ) : (
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.96 }}
                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                    type="button"
                                    onClick={() => { setMainTab('current'); setSelectedArchivedReport(null); }}
                                    style={{
                                        padding: '9px clamp(14px, 3vw, 22px)',
                                        fontSize: '12.5px',
                                        borderRadius: '12px',
                                        background: 'linear-gradient(135deg, var(--brand-primary), #e8590c)',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: 'white',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '7px',
                                        boxShadow: '0 4px 16px rgba(247, 103, 7, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.2)',
                                        flex: '1 1 auto',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    <ArrowLeft size={14} /> Canlı Rapora Dön
                                </motion.button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
