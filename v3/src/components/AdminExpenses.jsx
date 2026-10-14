import React, { useState, useMemo, useEffect } from 'react';
import { 
    Plus, 
    Trash2, 
    Pencil,
    TrendingDown, 
    Wallet, 
    CreditCard, 
    X,
    TrendingUp, 
    Search, 
    Receipt, 
    CheckCircle2, 
    ArrowDownRight, 
    ArrowUpRight,
    Calendar,
    Tag,
    ChevronRight,
    SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../data/menu';
import ModernDatePicker from './ModernDatePicker';
import ExpenseCard from './ExpenseCard';
import ExpenseDrawer from './ExpenseDrawer';

export const EXPENSE_CATEGORIES = [
    { id: 'mutfak', name: 'Mutfak & Gıda', icon: '🥬', color: '#10b981' },
    { id: 'icecek', name: 'İçecek & Meşrubat', icon: '🥤', color: '#3b82f6' },
    { id: 'personel', name: 'Personel Avans', icon: '👨‍🍳', color: '#8b5cf6' },
    { id: 'faturalar', name: 'Kira & Fatura', icon: '💡', color: '#f59e0b' },
    { id: 'sarf', name: 'Bakım & Sarf', icon: '🛠️', color: '#ec4899' },
    { id: 'diger', name: 'Diğer / Muhtelif', icon: '📦', color: '#64748b' }
];

const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

export const formatTurkishDate = (dateVal) => {
    if (!dateVal) return 'Bugün';
    const str = String(dateVal).trim();
    let day = '', month = '', year = '';

    if (str.includes('.')) {
        const p = str.split('.');
        day = p[0];
        month = p[1];
        year = p[2];
    } else if (str.includes('-')) {
        const p = str.slice(0, 10).split('-');
        year = p[0];
        month = p[1];
        day = p[2];
    } else {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
            day = String(d.getDate());
            month = String(d.getMonth() + 1);
            year = String(d.getFullYear());
        }
    }

    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12 && day && year) {
        return `${parseInt(day, 10)} ${TURKISH_MONTHS[mIdx]} ${year}`;
    }
    return str;
};

export default function AdminExpenses({
    expenses = [],
    addExpense,
    updateExpense,
    deleteExpense,
    completedOrders = [],
    totalRevenue = 0,
    currentPeriod = 'today',
    setCurrentPeriod,
    showConfirm,
    showToast
}) {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
    const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'highest' | 'lowest' | 'name'
    // Sağdan açılan çekmece (Drawer) State'leri
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null); // null => yeni ekleme, object => düzenleme

    const [formTitle, setFormTitle] = useState('');
    const [formAmount, setFormAmount] = useState('');
    const [formCategory, setFormCategory] = useState('mutfak');
    const [formPaymentMethod, setFormPaymentMethod] = useState('cash'); // 'cash' | 'card'
    const [formDate, setFormDate] = useState(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    });
    const [formNotes, setFormNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ESC Tuşu ile Drawer kapatma & Body scroll kilidi
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isDrawerOpen) {
                handleCloseDrawer();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDrawerOpen]);

    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isDrawerOpen]);

    // Dinamik Dönem Etiketi (Bugünkü, Haftalık, Aylık, Genel)
    const periodLabel = useMemo(() => {
        switch (currentPeriod) {
            case 'today': return 'Bugünkü';
            case 'week': return 'Haftalık';
            case 'month': return 'Aylık';
            case 'all': return 'Genel';
            default: return 'Dönem';
        }
    }, [currentPeriod]);

    // Seçilen dönemin cirosu (completedOrders içerisinden dinamik hesaplama)
    const periodRevenue = useMemo(() => {
        if (!completedOrders || completedOrders.length === 0) {
            return totalRevenue || 0;
        }
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
        }).reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    }, [completedOrders, currentPeriod, totalRevenue]);

    // Kategori bazlı sayaçlar
    const categoryCounts = useMemo(() => {
        const counts = { all: (expenses || []).length };
        EXPENSE_CATEGORIES.forEach(c => { counts[c.id] = 0; });
        (expenses || []).forEach(e => {
            if (counts[e.category] !== undefined) {
                counts[e.category]++;
            }
        });
        return counts;
    }, [expenses]);

    // Filtrelenmiş & Sıralanmış Giderler
    const filteredExpenses = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const localTodayStr = `${y}-${m}-${d}`;

        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        const list = (expenses || []).filter(e => {
            const expTime = new Date(e.date || e.created_at || 0).getTime();
            if (currentPeriod === 'today') {
                const eDate = e.date || (e.created_at ? e.created_at.slice(0, 10) : '');
                if (eDate !== localTodayStr) return false;
            } else if (currentPeriod === 'week') {
                if (expTime < startOfWeek) return false;
            } else if (currentPeriod === 'month') {
                if (expTime < startOfMonth) return false;
            }

            if (selectedCategoryFilter !== 'all' && e.category !== selectedCategoryFilter) {
                return false;
            }

            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                const titleMatch = (e.title || '').toLowerCase().includes(q);
                const notesMatch = (e.notes || '').toLowerCase().includes(q);
                return titleMatch || notesMatch;
            }

            return true;
        });

        // Sıralama
        return list.sort((a, b) => {
            if (sortOption === 'highest') return (Number(b.amount) || 0) - (Number(a.amount) || 0);
            if (sortOption === 'lowest') return (Number(a.amount) || 0) - (Number(b.amount) || 0);
            if (sortOption === 'name') return (a.title || '').localeCompare(b.title || '');
            // default: newest
            const timeA = new Date(a.date || a.created_at || 0).getTime();
            const timeB = new Date(b.date || b.created_at || 0).getTime();
            return timeB - timeA;
        });
    }, [expenses, currentPeriod, selectedCategoryFilter, searchTerm, sortOption]);

    // Finansal Metrikler (Seçili Döneme Göre Dinamik)
    const totalExpenses = useMemo(() => {
        return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }, [filteredExpenses]);

    const cashExpenses = useMemo(() => {
        return filteredExpenses.filter(e => e.payment_method === 'cash').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }, [filteredExpenses]);

    const cardExpenses = useMemo(() => {
        return filteredExpenses.filter(e => e.payment_method === 'card').reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    }, [filteredExpenses]);

    const netProfit = periodRevenue - totalExpenses;

    // Hızlı Tutar Ekleme Yardımcısı
    const handleQuickAmountSet = (addAmount) => {
        const cur = Number(formAmount) || 0;
        setFormAmount(String(cur + addAmount));
    };

    // Yeni Gider Ekleme Drawer'ını Aç
    const handleOpenAddDrawer = () => {
        setEditingExpense(null);
        setFormTitle('');
        setFormAmount('');
        setFormCategory('mutfak');
        setFormPaymentMethod('cash');
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        setFormDate(`${y}-${m}-${d}`);
        setFormNotes('');
        setIsDrawerOpen(true);
    };

    // Mevcut Gideri Düzenlemek için Drawer'ı Aç
    const handleOpenEditDrawer = (exp) => {
        setEditingExpense(exp);
        setFormTitle(exp.title || '');
        setFormAmount(String(exp.amount || ''));
        setFormCategory(exp.category || 'diger');
        setFormPaymentMethod(exp.payment_method || 'cash');
        setFormDate(exp.date || (exp.created_at ? exp.created_at.slice(0, 10) : ''));
        setFormNotes(exp.notes || '');
        setIsDrawerOpen(true);
    };

    // Drawer'ı Kapat
    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setEditingExpense(null);
    };

    // Drawer Formu Kaydet / Güncelle
    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formTitle.trim()) {
            showToast?.('Lütfen gider açıklamasını yazınız.', 'warning');
            return;
        }
        const numAmount = Number(formAmount);
        if (isNaN(numAmount) || numAmount <= 0) {
            showToast?.('Lütfen geçerli bir tutar giriniz.', 'warning');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingExpense) {
                if (updateExpense) {
                    await updateExpense(editingExpense.id, {
                        title: formTitle.trim(),
                        amount: numAmount,
                        category: formCategory,
                        payment_method: formPaymentMethod,
                        date: formDate || new Date().toISOString().slice(0, 10),
                        notes: formNotes.trim()
                    });
                    showToast?.('Gider kaydı başarıyla güncellendi.', 'success');
                }
            } else {
                if (addExpense) {
                    await addExpense({
                        title: formTitle.trim(),
                        amount: numAmount,
                        category: formCategory,
                        payment_method: formPaymentMethod,
                        date: formDate,
                        notes: formNotes.trim()
                    });
                    showToast?.('Gider başarıyla kasadan düşüldü ve kaydedildi.', 'success');
                }
            }
            handleCloseDrawer();
        } catch (err) {
            console.error('Expense submit error:', err);
            showToast?.('İşlem sırasında bir hata oluştu.', 'danger');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Gider Silme
    const handleDeleteExpense = async (exp) => {
        const ok = await showConfirm?.({
            title: 'Gider Kaydını Sil',
            message: `"${exp.title}" (${formatMoney(exp.amount)}) gider kaydını silmek istediğinize emin misiniz?`,
            confirmText: 'Evet, Sil',
            cancelText: 'Vazgeç',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await deleteExpense?.(exp.id);
            showToast?.('Gider kaydı silindi.', 'info');
        } catch (err) {
            console.error('Delete expense error:', err);
            showToast?.('Silinirken hata oluştu.', 'danger');
        }
    };

    return (
        <div className="admin-expenses-container">
            {/* 1. ÜST FİNANSAL ÖZET ŞERİDİ (DÖNEM FİLTRESİNE GÖRE ANLIK GÜNCELLENİR) */}
            <div className="admin-expenses-kpi-grid">
                {/* 1. KART: DÖNEM CİROSU (GÜNCEL BRÜT SATIŞ HASILATI) */}
                <div style={{
                    background: 'rgba(56, 189, 248, 0.05)',
                    border: '1px solid rgba(56, 189, 248, 0.22)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {periodLabel} Ciro
                        </span>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
                            <ArrowUpRight size={15} />
                        </div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: 'white', margin: '8px 0 3px 0', fontFamily: 'monospace' }}>
                        {formatMoney(periodRevenue)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Dönem brüt satış hasılatı
                    </div>
                </div>

                {/* 2. KART: TOPLAM GİDER */}
                <div style={{
                    background: 'rgba(239, 68, 68, 0.05)',
                    border: '1px solid rgba(239, 68, 68, 0.22)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {periodLabel} Toplam Gider
                        </span>
                        <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                            <ArrowDownRight size={15} />
                        </div>
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 900, color: '#f87171', margin: '8px 0 3px 0', fontFamily: 'monospace' }}>
                        -{formatMoney(totalExpenses)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Nakit: {formatMoney(cashExpenses)} • Kart: {formatMoney(cardExpenses)}
                    </div>
                </div>

                {/* 4. KART: NET İŞLETME KÂRI */}
                <div style={{
                    background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                    border: `1px solid ${netProfit >= 0 ? 'rgba(16, 185, 129, 0.22)' : 'rgba(239, 68, 68, 0.22)'}`,
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {periodLabel} Net Kâr
                        </span>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '8px',
                            background: netProfit >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: netProfit >= 0 ? '#10b981' : '#f87171'
                        }}>
                            {netProfit >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                        </div>
                    </div>
                    <div style={{
                        fontSize: '22px',
                        fontWeight: 900,
                        color: netProfit >= 0 ? '#10b981' : '#f87171',
                        margin: '8px 0 3px 0',
                        fontFamily: 'monospace'
                    }}>
                        {formatMoney(netProfit)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Ciro eksi dönem giderleri
                    </div>
                </div>
            </div>

            {/* 2. KONTROL & FİLTRELEME ARAÇ ÇUBUĞU */}
            <div className="admin-expenses-toolbar">
                {/* Sol: Dönem Filtreleri ve Kategori Dropdown */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div className="filter-pill-group" style={{ margin: 0 }}>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'today' ? 'active' : ''}`}
                            onClick={() => setCurrentPeriod && setCurrentPeriod('today')}
                        >
                            Bugün
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'week' ? 'active' : ''}`}
                            onClick={() => setCurrentPeriod && setCurrentPeriod('week')}
                        >
                            Bu Hafta
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'month' ? 'active' : ''}`}
                            onClick={() => setCurrentPeriod && setCurrentPeriod('month')}
                        >
                            Bu Ay
                        </button>
                        <button 
                            className={`filter-pill-btn ${currentPeriod === 'all' ? 'active' : ''}`}
                            onClick={() => setCurrentPeriod && setCurrentPeriod('all')}
                        >
                            Tümü
                        </button>
                    </div>

                    {/* Kategori Seçim Dropdown */}
                    <select
                        value={selectedCategoryFilter}
                        onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                        style={{
                            background: 'rgba(0, 0, 0, 0.35)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '12px',
                            padding: '8px 14px',
                            color: selectedCategoryFilter !== 'all' ? 'var(--brand-gold)' : 'var(--text-secondary)',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="all" style={{ background: '#1c1514', color: 'white' }}>
                            Tüm Kategoriler ({categoryCounts.all || 0})
                        </option>
                        {EXPENSE_CATEGORIES.map(cat => (
                            <option key={cat.id} value={cat.id} style={{ background: '#1c1514', color: 'white' }}>
                                {cat.icon} {cat.name} ({categoryCounts[cat.id] || 0})
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sağ: Arama, Sıralama ve + YENİ GİDER EKLE BUTONU */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Arama Kutusu */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border-card)',
                        borderRadius: '12px',
                        padding: '7px 12px',
                        minWidth: '150px'
                    }}>
                        <Search size={14} color="var(--text-muted)" />
                        <input
                            type="text"
                            placeholder="Gider ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: 'white',
                                fontSize: '13px',
                                width: '100%'
                            }}
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0 }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>

                    {/* Sıralama */}
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid var(--border-card)',
                            borderRadius: '12px',
                            padding: '7px 12px',
                            color: 'var(--text-secondary)',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none'
                        }}
                    >
                        <option value="newest" style={{ background: '#1c1514', color: 'white' }}>🕒 En Yeni</option>
                        <option value="highest" style={{ background: '#1c1514', color: 'white' }}>🔻 En Yüksek</option>
                        <option value="lowest" style={{ background: '#1c1514', color: 'white' }}>🔺 En Düşük</option>
                        <option value="name" style={{ background: '#1c1514', color: 'white' }}>🔤 İsim (A-Z)</option>
                    </select>


                    {/* Sayaç */}
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', padding: '0 4px' }}>
                        {filteredExpenses.length} Kayıt
                    </span>

                    {/* + YENİ GİDER EKLE BUTONU (Sağdan Çekmeceyi Açar) */}
                    <button
                        onClick={handleOpenAddDrawer}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '9px 18px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer',
                            boxShadow: '0 4px 14px rgba(234, 88, 12, 0.35)',
                            transition: 'all 0.15s ease',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>Yeni Gider Ekle</span>
                    </button>
                </div>
            </div>

            {/* 3. GİDER LİSTESİ (KARE KARE YAN YANA IZGARA) */}
            <div className="admin-expenses-grid">
                <AnimatePresence>
                    {filteredExpenses.map((exp) => (
                        <ExpenseCard
                            key={exp.id}
                            exp={exp}
                            onEdit={handleOpenEditDrawer}
                            onDelete={handleDeleteExpense}
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Boş Durum (Empty State) */}
            {filteredExpenses.length === 0 && (
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: '16px',
                    border: '1px dashed var(--border-card)',
                    padding: '50px 20px',
                    textAlign: 'center',
                    color: 'var(--text-muted)'
                }}>
                    <Receipt size={40} style={{ margin: '0 auto 12px auto', opacity: 0.3 }} />
                    <h4 style={{ color: 'white', fontSize: '16px', fontWeight: 800, margin: '0 0 6px 0' }}>
                        {periodLabel} dönemde henüz gider kaydı yok
                    </h4>
                    <p style={{ fontSize: '13px', margin: '0 0 18px 0' }}>
                        Sağ üstteki butona tıklayarak işletme gideri kaydedebilirsiniz.
                    </p>
                    <button
                        onClick={handleOpenAddDrawer}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                            color: 'white',
                            border: 'none',
                            fontWeight: 800,
                            fontSize: '13px',
                            cursor: 'pointer'
                        }}
                    >
                        <Plus size={16} />
                        <span>Yeni Gider Ekle</span>
                    </button>
                </div>
            )}

            {/* ============================================================== */}
            {/* 4. SAĞDAN AÇILAN GİDER ÇEKMECESİ */}
            <ExpenseDrawer
                isOpen={isDrawerOpen}
                onClose={handleCloseDrawer}
                editingExpense={editingExpense}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                amount={formAmount}
                setAmount={setFormAmount}
                onQuickAmountSet={handleQuickAmountSet}
                title={formTitle}
                setTitle={setFormTitle}
                date={formDate}
                setDate={setFormDate}
                paymentMethod={formPaymentMethod}
                setPaymentMethod={setFormPaymentMethod}
                category={formCategory}
                setCategory={setFormCategory}
                notes={formNotes}
                setNotes={setFormNotes}
            />
        </div>
    );
}
