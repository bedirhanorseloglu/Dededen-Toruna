import StaffPerformanceModal from './StaffPerformanceModal';
import React, { useState, useMemo } from 'react';
import { formatMoney } from '../data/menu';
import { db, doc, updateDoc } from '../config/firebase';
import { 
    Users, 
    UserPlus, 
    Shield, 
    ChefHat, 
    Smartphone, 
    Search, 
    Key, 
    Trash2, 
    Eye, 
    EyeOff, 
    LayoutGrid, 
    List, 
    Phone,
    TrendingUp,
    UtensilsCrossed,
    Clock,
    Calendar,
    CalendarDays,
    RotateCcw,
    X,
    ShoppingBag,
    Receipt,
    ChevronRight,
    CreditCard,
    Banknote,
    BarChart3,
    ArrowUpRight,
    Award
} from 'lucide-react';

export default function AdminStaffManagement({
    waitersList = [],
    kitchenList = [],
    managersList = [],
    completedOrders = [],
    setStaffModalRole,
    setShowStaffModal,
    setEditingStaffPin,
    setNewPinInput,
    setShowPinModal,
    handleDeleteStaff,
    showConfirm,
    showToast
}) {
    // Filtreler: 'all' | 'waiter' | 'kitchen' | 'admin'
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [revealedPins, setRevealedPins] = useState({}); // { [staffId]: boolean }

    // Garson / Personel Performans Modalı State'leri
    const [selectedStaffForPerformance, setSelectedStaffForPerformance] = useState(null);
    const [perfPeriod, setPerfPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
    const [isResettingStats, setIsResettingStats] = useState(false);

    // PIN görünürlük toggle
    const toggleRevealPin = (id) => {
        setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Tüm personelleri tek bir listede birleştir (Mutfak pasifize edildiği için Garsonlar & Yöneticiler)
    const allStaff = useMemo(() => {
        const list = [
            ...managersList.map(m => ({ ...m, role: 'admin', roleLabel: 'Yönetici', icon: '👑', color: '#f59e0b', tagBg: 'rgba(245, 158, 11, 0.15)' })),
            ...waitersList.map(w => ({ ...w, role: 'waiter', roleLabel: 'Garson', icon: '📱', color: '#10b981', tagBg: 'rgba(16, 185, 129, 0.15)' }))
        ];

        return list.filter(item => {
            const name = String(item.name || '').trim();
            const id = String(item.id || '').trim();
            if (!name || name.toLowerCase() === 'undefined' || name.toLowerCase() === 'null' || id === 'undefined' || id === 'null') {
                return false;
            }
            const matchesRole = selectedRoleFilter === 'all' || item.role === selectedRoleFilter;
            const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
            const matchesQuery = !q || 
                (name && name.toLocaleLowerCase('tr-TR').includes(q)) ||
                (item.pin && item.pin.includes(q)) ||
                (item.phone && item.phone.includes(q));
            return matchesRole && matchesQuery;
        });
    }, [managersList, waitersList, selectedRoleFilter, searchQuery]);

    const totalStaffCount = managersList.length + waitersList.length;

    // Rol bazında yeni personel ekle modalı tetikleyici
    const handleOpenAddModal = (role = 'waiter') => {
        setStaffModalRole(role);
        setShowStaffModal(true);
    };

    // Seçilen personele ve periyoda ait performans analizi
    const staffPerformanceData = useMemo(() => {
        if (!selectedStaffForPerformance) return null;
        const staff = selectedStaffForPerformance;

        const staffNameLower = String(staff.name || '').trim().toLowerCase();
        const staffIdStr = String(staff.id || '').trim();

        // 1. Personele ait tüm tamamlanan siparişleri filtrele
        const staffOrders = (completedOrders || []).filter(o => {
            const oWaiterId = String(o.waiter_id || '').trim();
            const oWaiterName = String(o.waiter_name || '').trim().toLowerCase();
            
            if (oWaiterId && oWaiterId === staffIdStr) return true;
            if (oWaiterName && oWaiterName === staffNameLower) return true;
            if (staff.role === 'admin' && (oWaiterId.startsWith('mgr') || oWaiterId.startsWith('admin'))) return true;
            return false;
        });

        // 2. Zaman aralığı filtresi
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth();
        const d = now.getDate();
        const todayStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const monthStr = `${y}-${String(m + 1).padStart(2, '0')}`;
        const startOfToday = new Date(y, m, d, 0, 0, 0).getTime();
        const startOfWeek = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)).getTime();
        const startOfMonth = new Date(y, m, 1, 0, 0, 0).getTime();

        const filteredOrders = staffOrders.filter(o => {
            const rawTime = o.created_at || o.closed_at || o.order_taken_at || o.timestamp || 0;
            const t = new Date(rawTime).getTime();
            const dateStr = typeof rawTime === 'string' ? rawTime.slice(0, 10) : '';

            if (perfPeriod === 'today') {
                return (dateStr && dateStr === todayStr) || (t && t >= startOfToday);
            }
            if (perfPeriod === 'week') {
                return t >= startOfWeek;
            }
            if (perfPeriod === 'month') {
                return (dateStr && dateStr.startsWith(monthStr)) || (t && t >= startOfMonth);
            }
            return true; // 'all'
        });

        // 3. Metrik hesaplamaları
        let periodRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        let periodOrdersCount = filteredOrders.length;
        let periodCashRevenue = filteredOrders.reduce((sum, o) => sum + (o.payment_method === 'cash' ? (Number(o.total) || 0) : 0), 0);
        let periodCardRevenue = filteredOrders.reduce((sum, o) => sum + (o.payment_method === 'card' ? (Number(o.total) || 0) : 0), 0);

        // Eğer 'all' seçiliyse ve sipariş listesi boşsa, personelin statik sayacını fallback yap
        if (perfPeriod === 'all' && periodOrdersCount === 0) {
            periodRevenue = Number(staff.total_revenue) || 0;
            periodOrdersCount = Number(staff.total_orders_count) || 0;
        }

        const avgOrder = periodOrdersCount > 0 ? (periodRevenue / periodOrdersCount) : 0;

        // Ürün bazlı satış analizi
        const productMap = {};
        let totalItemsSold = 0;
        filteredOrders.forEach(o => {
            (o.items || []).forEach(it => {
                const pName = it.name || 'Ürün';
                const qty = Number(it.quantity || it.count || 1);
                const price = Number(it.price || 0);
                totalItemsSold += qty;
                if (!productMap[pName]) {
                    productMap[pName] = { name: pName, quantity: 0, revenue: 0 };
                }
                productMap[pName].quantity += qty;
                productMap[pName].revenue += (qty * price);
            });
        });

        const topProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

        // Siparişleri yeniden eskiye sırala
        const sortedOrders = [...filteredOrders].sort((a, b) => {
            const ta = new Date(a.closed_at || a.created_at || 0).getTime();
            const tb = new Date(b.closed_at || b.created_at || 0).getTime();
            return tb - ta;
        });

        return {
            orders: sortedOrders,
            revenue: periodRevenue,
            ordersCount: periodOrdersCount,
            cashRevenue: periodCashRevenue,
            cardRevenue: periodCardRevenue,
            avgOrder,
            totalItemsSold,
            topProducts,
            allTimeTotalRevenue: Number(staff.total_revenue) || 0,
            allTimeTotalOrders: Number(staff.total_orders_count) || 0
        };
    }, [selectedStaffForPerformance, completedOrders, perfPeriod]);

    // Personel Sayaç Sıfırlama (Firestore Document Update)
    const handleResetStaffStats = async (staff, e) => {
        if (e) e.stopPropagation();
        if (!staff) return;

        const collectionName = staff.role === 'admin' ? 'managers' : (staff.role === 'kitchen' ? 'kitchen_staff' : 'waiters');

        const doReset = async () => {
            setIsResettingStats(true);
            try {
                await updateDoc(doc(db, collectionName, staff.id), {
                    total_revenue: 0,
                    total_orders_count: 0,
                    total_items_sold: 0
                });
                setSelectedStaffForPerformance(prev => prev ? ({
                    ...prev,
                    total_revenue: 0,
                    total_orders_count: 0,
                    total_items_sold: 0
                }) : null);
                if (showToast) showToast(`${staff.name} isimli personelin ciro ve sipariş sayaçları sıfırlandı!`, 'success');
            } catch (err) {
                console.error("Staff stats reset error:", err);
                if (showToast) showToast('Sayaç sıfırlanırken hata oluştu.', 'error');
            } finally {
                setIsResettingStats(false);
            }
        };

        if (showConfirm) {
            const ok = await showConfirm({
                title: `${staff.name} Personel Sayacını Sıfırla`,
                message: `"${staff.name}" adlı personelin toplam ciro ve sipariş adet sayaçları 0,00 ₺ olarak sıfırlanacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?`,
                confirmText: 'Evet, Sıfırla',
                cancelText: 'Vazgeç',
                variant: 'danger'
            });
            if (ok) await doReset();
        } else {
            if (window.confirm(`${staff.name} personelinin ciro sayacını sıfırlamak istediğinize emin misiniz?`)) {
                await doReset();
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* Üst Başlık & Aksiyon Butonları */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: 'var(--bg-surface)',
                padding: '18px 22px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-card)',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 900, margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--brand-gold)' }}>👥</span> Personel & Ekip Yönetimi
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                        Garsonlar, mutfak şefleri ve yöneticilerin sisteme giriş PIN kodları, yetkileri ve performans raporları
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button 
                        className="btn-primary" 
                        style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleOpenAddModal('waiter')}
                    >
                        <UserPlus size={16} />
                        Yeni Personel Ekle
                    </button>
                </div>
            </div>

            {/* 4 ÖZET KPI KARTI */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '14px'
            }}>
                {/* 1. Toplam Ekip */}
                <div style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-card)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '16px 18px',
                    boxShadow: 'var(--shadow-soft)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Toplam Kadro</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                            <Users size={17} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'white' }}>{totalStaffCount} Kişi</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Restoran aktif personeli</div>
                </div>

                {/* 2. Garsonlar */}
                <div 
                    onClick={() => setSelectedRoleFilter('waiter')}
                    style={{
                        background: selectedRoleFilter === 'waiter' ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-surface)',
                        border: selectedRoleFilter === 'waiter' ? '1px solid #10b981' : '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 18px',
                        boxShadow: 'var(--shadow-soft)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Garsonlar</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <Smartphone size={17} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: '#10b981' }}>{waitersList.length} Garson</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Sipariş & masa servisi</div>
                </div>

                {/* 3. Yöneticiler */}
                <div 
                    onClick={() => setSelectedRoleFilter('admin')}
                    style={{
                        background: selectedRoleFilter === 'admin' ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-surface)',
                        border: selectedRoleFilter === 'admin' ? '1px solid var(--brand-gold)' : '1px solid var(--border-card)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '16px 18px',
                        boxShadow: 'var(--shadow-soft)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--brand-gold)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Yöneticiler</span>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold)' }}>
                            <Shield size={17} />
                        </div>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--brand-gold)' }}>{managersList.length} Yönetici</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Kasa & tam yetki</div>
                </div>
            </div>

            {/* FİLTRE VE ARAMA KONTROL ÇUBUĞU */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--bg-surface)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-card)'
            }}>
                {/* Sol: Rol Filtre Hapları */}
                <div className="filter-pill-group" style={{ margin: 0 }}>
                    <button
                        className={`filter-pill-btn ${selectedRoleFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setSelectedRoleFilter('all')}
                    >
                        Tümü ({totalStaffCount})
                    </button>
                    <button
                        className={`filter-pill-btn ${selectedRoleFilter === 'waiter' ? 'active' : ''}`}
                        onClick={() => setSelectedRoleFilter('waiter')}
                    >
                        📱 Garsonlar ({waitersList.length})
                    </button>
                    <button
                        className={`filter-pill-btn ${selectedRoleFilter === 'admin' ? 'active' : ''}`}
                        onClick={() => setSelectedRoleFilter('admin')}
                    >
                        👑 Yöneticiler ({managersList.length})
                    </button>
                </div>

                {/* Sağ: Canlı Arama & Görünüm Seçici */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Personel veya PIN ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '8px 12px 8px 34px',
                                background: 'var(--bg-surface-elevated)',
                                border: '1px solid var(--border-card)',
                                color: 'white',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '13px',
                                width: '210px'
                            }}
                        />
                        <Search size={14} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    </div>

                    {/* Grid / Tablo Görünüm Düğmeleri */}
                    <div style={{ display: 'flex', background: 'var(--bg-surface-elevated)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-card)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            title="Kart Görünümü"
                            style={{
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                background: viewMode === 'grid' ? 'var(--brand-primary)' : 'transparent',
                                color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <LayoutGrid size={15} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            title="Tablo Görünümü"
                            style={{
                                padding: '6px 10px',
                                border: 'none',
                                borderRadius: '6px',
                                background: viewMode === 'table' ? 'var(--brand-primary)' : 'transparent',
                                color: viewMode === 'table' ? 'white' : 'var(--text-muted)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <List size={15} />
                        </button>
                    </div>
                </div>
            </div>

            {/* PERSONEL İÇERİĞİ: KARTLAR (GRID) VEYA TABLO (TABLE) */}
            {allStaff.length === 0 ? (
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-card)',
                    padding: '48px 20px',
                    textAlign: 'center'
                }}>
                    <Users size={36} style={{ color: 'var(--text-muted)', margin: '0 auto 12px auto', opacity: 0.5 }} />
                    <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'white', margin: 0 }}>Personel Bulunamadı</h3>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 16px 0' }}>
                        Arama kriterlerine uyan personel kaydı bulunmuyor.
                    </p>
                    <button 
                        className="btn-primary" 
                        style={{ padding: '8px 16px', fontSize: '13px' }}
                        onClick={() => { setSearchQuery(''); setSelectedRoleFilter('all'); }}
                    >
                        Filtreleri Temizle
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                /* 1. MODERN RESPONSIVE KARTLAR (GRID MODU) */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
                    gap: '16px'
                }}>
                    {allStaff.map(staff => {
                        const isPinVisible = !!revealedPins[staff.id];
                        const displayPin = isPinVisible ? (staff.pin || '------') : '••••••';

                        return (
                            <div
                                key={staff.id}
                                onClick={() => {
                                    setSelectedStaffForPerformance(staff);
                                    setPerfPeriod('today');
                                }}
                                style={{
                                    background: 'var(--bg-surface)',
                                    borderRadius: 'var(--radius-lg)',
                                    border: '1px solid var(--border-card)',
                                    padding: '20px',
                                    boxShadow: 'var(--shadow-soft)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '14px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--brand-gold)';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-card)';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'var(--shadow-soft)';
                                }}
                            >
                                {/* Kart Başlığı: Avatar, İsim & Rol Rozeti & Performans İpucu */}
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Renkli Avatar Baş Harfi */}
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '12px',
                                            background: staff.tagBg,
                                            border: `1px solid ${staff.color}40`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: staff.color,
                                            fontSize: '18px',
                                            fontWeight: 900
                                        }}>
                                            {staff.icon}
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'white' }}>
                                                {staff.name}
                                            </h3>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 800,
                                                    color: staff.color,
                                                    background: staff.tagBg,
                                                    padding: '2px 7px',
                                                    borderRadius: '4px',
                                                    textTransform: 'uppercase'
                                                }}>
                                                    {staff.roleLabel}
                                                </span>
                                                <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                                                    Aktif
                                                </span>
                                            </div>
                                            {staff.hire_date && (
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <span>📅</span>
                                                    <span>İşe Giriş: {new Date(staff.hire_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Performans İncele Rozeti */}
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        color: 'var(--brand-gold)',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.25)',
                                        padding: '4px 8px',
                                        borderRadius: '6px'
                                    }}>
                                        <BarChart3 size={13} />
                                        <span>Performans</span>
                                        <ChevronRight size={13} />
                                    </div>
                                </div>

                                {/* Orta Kısım: PIN Kodu Kutusu (Göz ikonuyla açıp kapatılabilir) */}
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                        background: 'var(--bg-surface-elevated)',
                                        borderRadius: '10px',
                                        padding: '10px 14px',
                                        border: '1px solid var(--border-subtle)',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Giriş PIN Kodu</div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', fontFamily: 'monospace', letterSpacing: isPinVisible ? '2px' : '3px' }}>
                                            {displayPin}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleRevealPin(staff.id);
                                        }}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '6px 8px',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center'
                                        }}
                                        title={isPinVisible ? "PIN'i Gizle" : "PIN'i Göster"}
                                    >
                                        {isPinVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                                    </button>
                                </div>

                                {/* Alt Metrikler */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
                                    {staff.role === 'waiter' ? (
                                        <>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Alınan Sipariş</div>
                                                <div style={{ fontWeight: 800, color: 'white', fontSize: '13px', marginTop: '2px' }}>
                                                    {staff.total_orders_count || 0} Adet
                                                </div>
                                            </div>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Toplam Ciro</div>
                                                <div style={{ fontWeight: 800, color: '#ffd43b', fontSize: '13px', marginTop: '2px' }}>
                                                    {formatMoney(staff.total_revenue || 0)}
                                                </div>
                                            </div>
                                        </>
                                    ) : staff.role === 'kitchen' ? (
                                        <>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Hazırlanan Kalem</div>
                                                <div style={{ fontWeight: 800, color: '#f97316', fontSize: '13px', marginTop: '2px' }}>
                                                    {staff.total_items_prepared || 0} Kalem
                                                </div>
                                            </div>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Görev Yeri</div>
                                                <div style={{ fontWeight: 800, color: 'white', fontSize: '13px', marginTop: '2px' }}>
                                                    {staff.section || 'Fırın & Servis'}
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>İletişim No</div>
                                                <div style={{ fontWeight: 800, color: 'white', fontSize: '12px', marginTop: '2px' }}>
                                                    {staff.phone || '0532 100 20 30'}
                                                </div>
                                            </div>
                                            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Yetki</div>
                                                <div style={{ fontWeight: 800, color: 'var(--brand-gold)', fontSize: '12px', marginTop: '2px' }}>
                                                    👑 Tam Yetkili
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Aksiyon Butonları */}
                                <div 
                                    onClick={(e) => e.stopPropagation()}
                                    style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}
                                >
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStaffPin(staff);
                                            setNewPinInput('');
                                            setShowPinModal(true);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: 'rgba(245, 158, 11, 0.1)',
                                            border: '1px solid rgba(245, 158, 11, 0.3)',
                                            borderRadius: '8px',
                                            color: 'var(--brand-gold)',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '5px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <Key size={13} />
                                        PIN Güncelle
                                    </button>

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteStaff(staff.id, staff.role, staff.name);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(239, 68, 68, 0.08)',
                                            border: '1px solid rgba(239, 68, 68, 0.25)',
                                            borderRadius: '8px',
                                            color: '#f87171',
                                            fontSize: '12px',
                                            fontWeight: 800,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                        title={`${staff.name} isimli çalışanı sil`}
                                    >
                                        <Trash2 size={13} />
                                        Sil
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* 2. DETAYLI VE MODERN TABLO GÖRÜNÜMÜ (TABLE MODU) */
                <div style={{
                    background: 'var(--bg-surface)',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border-card)',
                    padding: '20px',
                    boxShadow: 'var(--shadow-soft)',
                    overflowX: 'auto'
                }}>
                    <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
                                <th style={{ padding: '12px 10px' }}>Personel Adı</th>
                                <th style={{ padding: '12px 10px' }}>Görevi</th>
                                <th style={{ padding: '12px 10px' }}>Giriş PIN</th>
                                <th style={{ padding: '12px 10px' }}>Sipariş / Kalem</th>
                                <th style={{ padding: '12px 10px' }}>Toplam Ciro</th>
                                <th style={{ padding: '12px 10px' }}>Durum</th>
                                <th style={{ padding: '12px 10px', textAlign: 'right' }}>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allStaff.map(staff => {
                                const isPinVisible = !!revealedPins[staff.id];
                                const displayPin = isPinVisible ? (staff.pin || '------') : '••••••';

                                return (
                                    <tr 
                                        key={staff.id} 
                                        onClick={() => {
                                            setSelectedStaffForPerformance(staff);
                                            setPerfPeriod('today');
                                        }}
                                        style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }}
                                    >
                                        <td style={{ padding: '14px 10px', fontWeight: 800, color: 'white' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '16px' }}>{staff.icon}</span>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        {staff.name}
                                                        <span style={{ fontSize: '11px', color: 'var(--brand-gold)' }}>📊</span>
                                                    </div>
                                                    {staff.hire_date && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                                                            📅 İşe Giriş: {new Date(staff.hire_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 10px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: staff.color,
                                                background: staff.tagBg,
                                                padding: '3px 8px',
                                                borderRadius: '4px'
                                            }}>
                                                {staff.roleLabel}
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 10px' }}>
                                            <div 
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                            >
                                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: 'white', letterSpacing: isPinVisible ? '1px' : '2px' }}>
                                                    {displayPin}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleRevealPin(staff.id);
                                                    }}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    {isPinVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '14px 10px', color: 'var(--text-secondary)' }}>
                                            {staff.role === 'waiter' 
                                                ? `${staff.total_orders_count || 0} Adet`
                                                : staff.role === 'kitchen' 
                                                    ? `${staff.total_items_prepared || 0} Kalem` 
                                                    : 'Tam Yetki'}
                                        </td>
                                        <td style={{ padding: '14px 10px', fontWeight: 800, color: '#ffd43b' }}>
                                            {staff.role === 'waiter' ? formatMoney(staff.total_revenue || 0) : '—'}
                                        </td>
                                        <td style={{ padding: '14px 10px' }}>
                                            <span style={{ color: 'var(--success)', fontSize: '12px', fontWeight: 700, background: 'rgba(16,185,129,0.1)', padding: '3px 8px', borderRadius: '4px' }}>
                                                ● Aktif
                                            </span>
                                        </td>
                                        <td style={{ padding: '14px 10px', textAlign: 'right' }}>
                                            <div 
                                                onClick={(e) => e.stopPropagation()}
                                                style={{ display: 'inline-flex', gap: '6px' }}
                                            >
                                                <button
                                                    className="btn-outline"
                                                    style={{ padding: '5px 10px', fontSize: '12px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedStaffForPerformance(staff);
                                                        setPerfPeriod('today');
                                                    }}
                                                    title="Performansı İncele"
                                                >
                                                    <BarChart3 size={13} /> Performans
                                                </button>
                                                <button
                                                    className="btn-outline"
                                                    style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--brand-gold)', borderColor: 'rgba(245,159,0,0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingStaffPin(staff);
                                                        setNewPinInput('');
                                                        setShowPinModal(true);
                                                    }}
                                                >
                                                    <Key size={13} /> PIN
                                                </button>
                                                <button
                                                    className="btn-outline"
                                                    style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteStaff(staff.id, staff.role, staff.name);
                                                    }}
                                                >
                                                    <Trash2 size={13} /> Sil
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

                        {/* GARSON & PERSONEL PERFORMANS MODALI */}
            <StaffPerformanceModal
                staff={selectedStaffForPerformance}
                data={staffPerformanceData}
                period={perfPeriod}
                setPeriod={setPerfPeriod}
                onClose={() => setSelectedStaffForPerformance(null)}
                onResetStats={handleResetStaffStats}
                isResettingStats={isResettingStats}
            />
        </div>
    );
}

