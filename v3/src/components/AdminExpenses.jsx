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
    SlidersHorizontal,
    LayoutGrid,
    List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../data/menu';
import ModernDatePicker from './ModernDatePicker';

export const EXPENSE_CATEGORIES = [
    { id: 'mutfak', name: 'Mutfak & Gıda', icon: '🥬', color: '#10b981' },
    { id: 'icecek', name: 'İçecek & Meşrubat', icon: '🥤', color: '#3b82f6' },
    { id: 'personel', name: 'Personel Avans', icon: '👨‍🍳', color: '#8b5cf6' },
    { id: 'faturalar', name: 'Kira & Fatura', icon: '💡', color: '#f59e0b' },
    { id: 'sarf', name: 'Bakım & Sarf', icon: '🛠️', color: '#ec4899' },
    { id: 'diger', name: 'Diğer / Muhtelif', icon: '📦', color: '#64748b' }
];

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
    const [viewMode, setViewMode] = useState(() => {
        try {
            return localStorage.getItem('expenses_view_mode') || 'grid';
        } catch {
            return 'grid';
        }
    }); // 'grid' (kare kare yan yana) | 'list'

    const handleSwitchViewMode = (mode) => {
        setViewMode(mode);
        try {
            localStorage.setItem('expenses_view_mode', mode);
        } catch (_) {}
    };

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

                    {/* Görünüm Modu Seçici (Kare Izgara ▦ / Liste ☰) */}
                    <div style={{
                        display: 'flex',
                        background: 'rgba(0, 0, 0, 0.35)',
                        borderRadius: '10px',
                        padding: '3px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        <button
                            onClick={() => handleSwitchViewMode('grid')}
                            style={{
                                background: viewMode === 'grid' ? 'var(--brand-primary)' : 'transparent',
                                border: 'none',
                                color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                                borderRadius: '7px',
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Kare Kartlar"
                        >
                            <LayoutGrid size={14} />
                            <span>Kare</span>
                        </button>
                        <button
                            onClick={() => handleSwitchViewMode('list')}
                            style={{
                                background: viewMode === 'list' ? 'var(--brand-primary)' : 'transparent',
                                border: 'none',
                                color: viewMode === 'list' ? 'white' : 'var(--text-muted)',
                                borderRadius: '7px',
                                padding: '5px 8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '12px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Liste Görünümü"
                        >
                            <List size={14} />
                            <span>Liste</span>
                        </button>
                    </div>

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

            {/* 3. GİDER LİSTESİ (KARE KARE YAN YANA IZGARA VEYA LİSTE) */}
            {viewMode === 'grid' ? (
                <div className="admin-expenses-grid">
                    <AnimatePresence>
                        {filteredExpenses.map((exp) => {
                            const cat = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
                            const isCash = exp.payment_method === 'cash';
                            const catColor = cat?.color || '#ef4444';

                            return (
                                <motion.div
                                    key={exp.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    whileHover={{ y: -3 }}
                                    className="admin-expense-grid-card"
                                    style={{ '--card-accent': catColor }}
                                    onClick={() => handleOpenEditDrawer(exp)}
                                >
                                    {/* Kart Üst Bölüm: Kategori İkonu + Rozetler + Sağda Aksiyonlar */}
                                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '42px',
                                                height: '42px',
                                                borderRadius: '12px',
                                                background: `${catColor}18`,
                                                border: `1px solid ${catColor}35`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontSize: '20px',
                                                flexShrink: 0
                                            }}>
                                                {cat?.icon || '📦'}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                <span style={{
                                                    background: `${catColor}18`,
                                                    color: catColor,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: 800,
                                                    fontSize: '11px',
                                                    border: `1px solid ${catColor}30`,
                                                    width: 'fit-content'
                                                }}>
                                                    {cat?.name || 'Genel'}
                                                </span>
                                                <span style={{
                                                    background: isCash ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                                                    color: isCash ? 'var(--brand-gold)' : '#38bdf8',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                    border: isCash ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
                                                    width: 'fit-content'
                                                }}>
                                                    {isCash ? '💵 Nakit' : '💳 Kart'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Aksiyon Butonları (Düzenle & Sil) */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditDrawer(exp);
                                                }}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '8px',
                                                    width: '30px',
                                                    height: '30px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Düzenle"
                                            >
                                                <Pencil size={13} />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteExpense(exp);
                                                }}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    borderRadius: '8px',
                                                    width: '30px',
                                                    height: '30px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#f87171',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Sil"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Kart Orta Bölüm: Başlık & Tarih / Not */}
                                    <div style={{ margin: '14px 0 10px 0' }}>
                                        <div style={{
                                            fontSize: '16px',
                                            fontWeight: 800,
                                            color: 'white',
                                            lineHeight: 1.3,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }}>
                                            {exp.title}
                                        </div>
                                        <div style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            fontSize: '12px',
                                            color: 'var(--text-muted)',
                                            marginTop: '4px'
                                        }}>
                                            <span>📅 {exp.date || (exp.created_at ? exp.created_at.slice(0, 10) : 'Bugün')}</span>
                                            {exp.notes && (
                                                <>
                                                    <span>•</span>
                                                    <span style={{ fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        "{exp.notes}"
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Kart Alt Bölüm: Tutar */}
                                    <div style={{
                                        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                        paddingTop: '12px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}>
                                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                            Harcama Tutarı
                                        </span>
                                        <span style={{
                                            fontSize: '20px',
                                            fontWeight: 900,
                                            color: '#f87171',
                                            fontFamily: 'monospace'
                                        }}>
                                            -{formatMoney(exp.amount)}
                                        </span>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <AnimatePresence>
                        {filteredExpenses.map((exp) => {
                            const cat = EXPENSE_CATEGORIES.find(c => c.id === exp.category);
                            const isCash = exp.payment_method === 'cash';
                            const catColor = cat?.color || '#ef4444';

                            return (
                                <motion.div
                                    key={exp.id}
                                    layout
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="admin-expense-item-card"
                                    onClick={() => handleOpenEditDrawer(exp)}
                                >
                                    {/* Sol: Kategori İkonu ve Gider Bilgileri */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                                        <div style={{
                                            width: '42px',
                                            height: '42px',
                                            borderRadius: '12px',
                                            background: `${catColor}15`,
                                            border: `1px solid ${catColor}35`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '20px',
                                            flexShrink: 0
                                        }}>
                                            {cat?.icon || '📦'}
                                        </div>

                                        <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div style={{
                                                fontSize: '15px',
                                                fontWeight: 800,
                                                color: 'white',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {exp.title}
                                            </div>

                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                fontSize: '12px',
                                                color: 'var(--text-muted)',
                                                flexWrap: 'wrap'
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    📅 {exp.date || (exp.created_at ? exp.created_at.slice(0, 10) : 'Bugün')}
                                                </span>
                                                <span>•</span>
                                                <span style={{
                                                    background: `${catColor}18`,
                                                    color: catColor,
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                    border: `1px solid ${catColor}30`
                                                }}>
                                                    {cat?.name || 'Genel'}
                                                </span>
                                                <span>•</span>
                                                <span style={{
                                                    background: isCash ? 'rgba(245, 158, 11, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                                                    color: isCash ? 'var(--brand-gold)' : '#38bdf8',
                                                    padding: '2px 8px',
                                                    borderRadius: '6px',
                                                    fontWeight: 700,
                                                    fontSize: '11px',
                                                    border: isCash ? '1px solid rgba(245, 158, 11, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)'
                                                }}>
                                                    {isCash ? '💵 Nakit (Kasa)' : '💳 Kart / Banka'}
                                                </span>
                                                {exp.notes && (
                                                    <>
                                                        <span>•</span>
                                                        <span style={{ fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            "{exp.notes}"
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sağ: Tutar ve Aksiyon Butonları */}
                                    <div className="expense-card-right" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                        <div style={{
                                            fontSize: '18px',
                                            fontWeight: 900,
                                            color: '#f87171',
                                            fontFamily: 'monospace'
                                        }}>
                                            -{formatMoney(exp.amount)}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleOpenEditDrawer(exp);
                                                }}
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '10px',
                                                    width: '34px',
                                                    height: '34px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Düzenle"
                                            >
                                                <Pencil size={14} />
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteExpense(exp);
                                                }}
                                                style={{
                                                    background: 'rgba(239, 68, 68, 0.1)',
                                                    border: '1px solid rgba(239, 68, 68, 0.25)',
                                                    borderRadius: '10px',
                                                    width: '34px',
                                                    height: '34px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#f87171',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Sil"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

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
            {/* 4. SAĞDAN AÇILAN GİDER ÇEKMECESİ (DRAWER - ADİSYON GİBİ)        */}
            {/* ============================================================== */}
            <AnimatePresence>
                {isDrawerOpen && (
                    <>
                        {/* Karartma Katmanı (Backdrop) */}
                        <motion.div
                            className="expense-drawer-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleCloseDrawer}
                        />

                        {/* Sağdan Kayan Çekmece (Slide-over Drawer) */}
                        <motion.aside
                            className="expense-slide-drawer"
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
                        >
                            {/* Mobil Tutamaç (Drag pill) */}
                            <div className="admin-drawer-drag-pill" onClick={handleCloseDrawer} style={{ display: 'block', margin: '8px auto 0 auto' }} />

                            {/* Çekmece Başlığı */}
                            <div style={{
                                padding: '18px 22px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: 'rgba(25, 18, 16, 0.95)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        background: editingExpense ? 'rgba(56, 189, 248, 0.15)' : 'rgba(249, 115, 22, 0.15)',
                                        border: editingExpense ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(249, 115, 22, 0.3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: editingExpense ? '#38bdf8' : '#f97316'
                                    }}>
                                        {editingExpense ? <Pencil size={18} /> : <Plus size={20} />}
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: 'white', margin: 0 }}>
                                            {editingExpense ? 'Gider Kaydını Düzenle' : 'Yeni Gider Ekle'}
                                        </h3>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                            {editingExpense ? 'Gider detaylarını güncelleyin' : 'Gideri kasadan düşerek kaydedin'}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleCloseDrawer}
                                    style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        background: 'rgba(255, 255, 255, 0.06)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="Kapat (ESC)"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Çekmece Form Alanı (Kaydırılabilir İçerik) */}
                            <form
                                onSubmit={handleSubmit}
                                style={{
                                    flex: 1,
                                    overflowY: 'auto',
                                    padding: '20px 22px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '18px'
                                }}
                            >
                                {/* 1. HARCAMA TUTARI */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                        Harcama Tutarı *
                                    </label>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        background: 'rgba(0, 0, 0, 0.45)',
                                        border: '1px solid rgba(255, 255, 255, 0.14)',
                                        borderRadius: '14px',
                                        padding: '10px 16px',
                                        gap: '10px'
                                    }}>
                                        <span style={{ fontSize: '24px', fontWeight: 900, color: '#f87171' }}>₺</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={formAmount}
                                            onChange={(e) => setFormAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                                            placeholder="0.00"
                                            autoFocus={!editingExpense}
                                            required
                                            style={{
                                                width: '100%',
                                                background: 'transparent',
                                                border: 'none',
                                                outline: 'none',
                                                color: 'white',
                                                fontSize: '24px',
                                                fontWeight: 900,
                                                fontFamily: 'monospace'
                                            }}
                                        />
                                    </div>

                                    {/* Hızlı Tutar Çipleri */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                                        {[100, 250, 500, 1000].map(val => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => handleQuickAmountSet(val)}
                                                style={{
                                                    padding: '7px 4px',
                                                    borderRadius: '8px',
                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: 'rgba(255, 255, 255, 0.04)',
                                                    color: 'var(--text-secondary)',
                                                    fontSize: '12px',
                                                    fontWeight: 700,
                                                    cursor: 'pointer',
                                                    textAlign: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                +{val}₺
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. AÇIKLAMA */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                        Gider Açıklaması / Başlık *
                                    </label>
                                    <input
                                        type="text"
                                        value={formTitle}
                                        onChange={(e) => setFormTitle(e.target.value)}
                                        placeholder="Örn: Kasap et alımı, Fırın ekmek, Elektrik fatura..."
                                        required
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '12px',
                                            padding: '12px 14px',
                                            color: 'white',
                                            fontSize: '14px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* 3. TARİH VE ÖDEME KAYNAĞI (2 SÜTUN) */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                            Tarih
                                        </label>
                                        <ModernDatePicker value={formDate} onChange={setFormDate} />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                            Ödeme Kaynağı
                                        </label>
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: '1fr 1fr',
                                            gap: '4px',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            padding: '4px',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255, 255, 255, 0.1)'
                                        }}>
                                            <button
                                                type="button"
                                                onClick={() => setFormPaymentMethod('cash')}
                                                style={{
                                                    border: 'none',
                                                    background: formPaymentMethod === 'cash' ? 'var(--brand-primary)' : 'transparent',
                                                    color: formPaymentMethod === 'cash' ? 'white' : 'var(--text-muted)',
                                                    borderRadius: '8px',
                                                    padding: '9px 4px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                💵 Nakit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormPaymentMethod('card')}
                                                style={{
                                                    border: 'none',
                                                    background: formPaymentMethod === 'card' ? 'var(--brand-primary)' : 'transparent',
                                                    color: formPaymentMethod === 'card' ? 'white' : 'var(--text-muted)',
                                                    borderRadius: '8px',
                                                    padding: '9px 4px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                💳 Kart
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. KATEGORİ SEÇİMİ (6 KATEGORİ KARTLARI) */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px' }}>
                                        Harcama Kategorisi *
                                    </label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                                        {EXPENSE_CATEGORIES.map(cat => {
                                            const isSelected = formCategory === cat.id;
                                            return (
                                                <button
                                                    key={cat.id}
                                                    type="button"
                                                    onClick={() => setFormCategory(cat.id)}
                                                    style={{
                                                        border: isSelected ? `1.5px solid ${cat.color}` : '1px solid rgba(255, 255, 255, 0.08)',
                                                        background: isSelected ? `${cat.color}22` : 'rgba(0, 0, 0, 0.3)',
                                                        color: isSelected ? 'white' : 'var(--text-secondary)',
                                                        borderRadius: '12px',
                                                        padding: '10px 12px',
                                                        fontSize: '12px',
                                                        fontWeight: isSelected ? 800 : 600,
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        textAlign: 'left',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cat.name}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* 5. NOT / EK AÇIKLAMA */}
                                <div>
                                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
                                        Not / Detay / Fatura No (Opsiyonel)
                                    </label>
                                    <input
                                        type="text"
                                        value={formNotes}
                                        onChange={(e) => setFormNotes(e.target.value)}
                                        placeholder="Örn: Fatura No: 2026-A12, 5 çuval un..."
                                        style={{
                                            width: '100%',
                                            background: 'rgba(0, 0, 0, 0.4)',
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '12px',
                                            padding: '11px 14px',
                                            color: 'white',
                                            fontSize: '13px',
                                            outline: 'none'
                                        }}
                                    />
                                </div>

                                {/* Çekmece Alt Butonları (Sabit Footer) */}
                                <div style={{
                                    marginTop: 'auto',
                                    paddingTop: '16px',
                                    display: 'flex',
                                    gap: '10px'
                                }}>
                                    {editingExpense && (
                                        <button
                                            type="button"
                                            onClick={handleCloseDrawer}
                                            style={{
                                                flex: 1,
                                                padding: '13px',
                                                borderRadius: '12px',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                                color: 'var(--text-muted)',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Vazgeç
                                        </button>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        style={{
                                            flex: editingExpense ? 2 : 1,
                                            padding: '14px',
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            borderRadius: '12px',
                                            background: editingExpense 
                                                ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' 
                                                : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                                            color: 'white',
                                            border: 'none',
                                            cursor: 'pointer',
                                            boxShadow: editingExpense
                                                ? '0 4px 14px rgba(2, 132, 199, 0.35)'
                                                : '0 4px 14px rgba(234, 88, 12, 0.35)'
                                        }}
                                    >
                                        <CheckCircle2 size={18} />
                                        <span>
                                            {isSubmitting 
                                                ? 'Kaydediliyor...' 
                                                : (editingExpense ? 'Değişiklikleri Kaydet' : 'Gideri Kasadan Düş & Kaydet')
                                            }
                                        </span>
                                    </button>
                                </div>
                            </form>
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
