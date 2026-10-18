import StaffPerformanceModal from './StaffPerformanceModal';
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../data/menu';
import { db, doc, updateDoc } from '../config/firebase';
import { 
    Users, 
    UserPlus, 
    ShieldCheck,
    Crown,
    Smartphone, 
    Search, 
    KeyRound,
    Trash2, 
    Eye, 
    EyeOff, 
    LayoutGrid, 
    List, 
    Phone,
    ShoppingBag,
    BarChart3,
    Check,
    Copy,
    X,
    Calendar
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
    // Filtreler: 'all' | 'waiter' | 'admin'
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [revealedPins, setRevealedPins] = useState({}); // { [staffId]: boolean }
    const [copiedPinId, setCopiedPinId] = useState(null);

    // Garson / Personel Performans Modalı State'leri
    const [selectedStaffForPerformance, setSelectedStaffForPerformance] = useState(null);
    const [perfPeriod, setPerfPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
    const [isResettingStats, setIsResettingStats] = useState(false);

    // PIN görünürlük toggle
    const toggleRevealPin = (id) => {
        setRevealedPins(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // PIN panoya kopyalama
    const handleCopyPin = (e, staff) => {
        e.stopPropagation();
        if (!staff.pin) return;
        navigator.clipboard?.writeText(staff.pin);
        setCopiedPinId(staff.id);
        if (showToast) showToast(`${staff.name} PIN kodu kopyalandı (${staff.pin})`, 'success');
        setTimeout(() => setCopiedPinId(null), 2000);
    };

    // İsimden baş harf türetme (Parantezleri ve Patron yazısını temizler)
    const getInitials = (name) => {
        if (!name) return 'P';
        const clean = name.replace(/\(.*?\)/g, '').trim();
        const parts = clean.split(/\s+/).filter(Boolean);
        if (parts.length === 0) return 'P';
        if (parts.length === 1) return parts[0].slice(0, 2).toLocaleUpperCase('tr-TR');
        return (parts[0][0] + parts[parts.length - 1][0]).toLocaleUpperCase('tr-TR');
    };

    // Tüm personelleri tek listede birleştir (Dededen Toruna Sıcak Renk Paleti)
    const allStaff = useMemo(() => {
        const list = [
            ...managersList.map(m => {
                const cleanName = String(m.name || '').replace(/\s*\(Patron\)/gi, '').trim() || 'Yönetici';
                const cleanPhone = (m.phone === '0532 100 20 30' || m.phone === '05321002030') ? '' : (m.phone || '');
                return { 
                    ...m, 
                    name: cleanName,
                    phone: cleanPhone,
                    role: 'admin', 
                    roleLabel: 'Yönetici', 
                    color: '#f59f00', // Kehribar Sarısı
                    gradient: 'linear-gradient(135deg, rgba(245, 159, 0, 0.25) 0%, rgba(217, 119, 6, 0.12) 100%)',
                    borderColor: 'rgba(245, 159, 0, 0.35)',
                    tagBg: 'rgba(245, 159, 0, 0.12)'
                };
            }),
            ...waitersList.map(w => ({ 
                ...w, 
                role: 'waiter', 
                roleLabel: 'Garson', 
                color: '#f76707', // Fırın Karamel Turuncusu
                gradient: 'linear-gradient(135deg, rgba(247, 103, 7, 0.25) 0%, rgba(217, 72, 15, 0.12) 100%)',
                borderColor: 'rgba(247, 103, 7, 0.35)',
                tagBg: 'rgba(247, 103, 7, 0.12)'
            }))
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

        const staffOrders = (completedOrders || []).filter(o => {
            const oWaiterId = String(o.waiter_id || '').trim();
            const oWaiterName = String(o.waiter_name || '').trim().toLowerCase();
            
            if (oWaiterId && oWaiterId === staffIdStr) return true;
            if (oWaiterName && oWaiterName === staffNameLower) return true;
            if (staff.role === 'admin' && (oWaiterId.startsWith('mgr') || oWaiterId.startsWith('admin'))) return true;
            return false;
        });

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
            return true;
        });

        let periodRevenue = filteredOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
        let periodOrdersCount = filteredOrders.length;
        let periodCashRevenue = filteredOrders.reduce((sum, o) => sum + (o.payment_method === 'cash' ? (Number(o.total) || 0) : 0), 0);
        let periodCardRevenue = filteredOrders.reduce((sum, o) => sum + (o.payment_method === 'card' ? (Number(o.total) || 0) : 0), 0);

        if (perfPeriod === 'all' && periodOrdersCount === 0) {
            periodRevenue = Number(staff.total_revenue) || 0;
            periodOrdersCount = Number(staff.total_orders_count) || 0;
        }

        const avgOrder = periodOrdersCount > 0 ? (periodRevenue / periodOrdersCount) : 0;

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

    // Personel Sayaç Sıfırlama
    const handleResetStaffStats = async (staff, e) => {
        if (e) e.stopPropagation();
        if (!staff) return;

        const collectionName = staff.role === 'admin' ? 'managers' : 'waiters';

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
                if (showToast) showToast(`${staff.name} sayaçları sıfırlandı!`, 'success');
            } catch (err) {
                console.error("Staff stats reset error:", err);
                if (showToast) showToast('Sayaç sıfırlanırken hata oluştu.', 'error');
            } finally {
                setIsResettingStats(false);
            }
        };

        if (showConfirm) {
            const ok = await showConfirm({
                title: `${staff.name} Sayacını Sıfırla`,
                message: `"${staff.name}" adlı personelin toplam ciro ve sipariş sayaçları 0 olarak sıfırlanacaktır. Bu işlem geri alınamaz. Onaylıyor musunuz?`,
                confirmText: 'Evet, Sıfırla',
                cancelText: 'Vazgeç',
                variant: 'danger'
            });
            if (ok) await doReset();
        } else {
            if (window.confirm(`${staff.name} personelinin sayacını sıfırlamak istiyor musunuz?`)) {
                await doReset();
            }
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* 1. ÜST HEADER: Sıcak Karamel & Kehribar Bar */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '14px',
                background: 'rgba(28, 21, 20, 0.75)',
                backdropFilter: 'blur(16px)',
                padding: '16px 20px',
                borderRadius: '16px',
                border: '1px solid rgba(245, 159, 0, 0.14)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'rgba(247, 103, 7, 0.15)',
                        border: '1px solid rgba(247, 103, 7, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#f76707'
                    }}>
                        <Users size={20} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h2 style={{ 
                                fontSize: '18px', 
                                fontWeight: 800, 
                                margin: 0, 
                                color: '#fffaf5', 
                                letterSpacing: '-0.02em',
                                fontFamily: "'Plus Jakarta Sans', sans-serif"
                            }}>
                                Personel & PIN Yönetimi
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                color: '#f59f00',
                                background: 'rgba(245, 159, 0, 0.12)',
                                border: '1px solid rgba(245, 159, 0, 0.25)',
                                padding: '2px 8px',
                                borderRadius: '12px'
                            }}>
                                {totalStaffCount} Aktif
                            </span>
                        </div>
                        <p style={{ 
                            fontSize: '12px', 
                            color: 'var(--text-secondary, #d1b8af)', 
                            margin: '2px 0 0 0'
                        }}>
                            Çalışan PIN kodları, yetkilendirmeler ve canlı performans raporları
                        </p>
                    </div>
                </div>

                {/* Yeni Personel Ekle Butonu */}
                <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOpenAddModal('waiter')}
                    style={{
                        padding: '10px 18px',
                        fontSize: '13px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '7px',
                        background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        boxShadow: '0 4px 14px rgba(247, 103, 7, 0.35)'
                    }}
                >
                    <UserPlus size={15} />
                    <span>Yeni Personel Ekle</span>
                </motion.button>
            </div>

            {/* 2. ZARİF VE MİNİMAL METRİK BAR (Uyumlu Sıcak Tonlar) */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px'
            }}>
                {/* 1. Toplam */}
                <div 
                    onClick={() => setSelectedRoleFilter('all')}
                    style={{
                        background: selectedRoleFilter === 'all' ? 'rgba(245, 159, 0, 0.12)' : 'rgba(28, 21, 20, 0.6)',
                        border: selectedRoleFilter === 'all' ? '1px solid rgba(245, 159, 0, 0.4)' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Toplam Kadro
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#fffaf5', marginTop: '2px' }}>
                        {totalStaffCount} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted, #8d736b)' }}>Çalışan</span>
                    </div>
                </div>

                {/* 2. Garsonlar */}
                <div 
                    onClick={() => setSelectedRoleFilter('waiter')}
                    style={{
                        background: selectedRoleFilter === 'waiter' ? 'rgba(247, 103, 7, 0.14)' : 'rgba(28, 21, 20, 0.6)',
                        border: selectedRoleFilter === 'waiter' ? '1px solid rgba(247, 103, 7, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#f76707', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Garsonlar
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f76707', marginTop: '2px' }}>
                        {waitersList.length} <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(247, 103, 7, 0.7)' }}>Garson</span>
                    </div>
                </div>

                {/* 3. Yöneticiler */}
                <div 
                    onClick={() => setSelectedRoleFilter('admin')}
                    style={{
                        background: selectedRoleFilter === 'admin' ? 'rgba(245, 159, 0, 0.14)' : 'rgba(28, 21, 20, 0.6)',
                        border: selectedRoleFilter === 'admin' ? '1px solid rgba(245, 159, 0, 0.45)' : '1px solid rgba(255, 255, 255, 0.06)',
                        borderRadius: '14px',
                        padding: '12px 16px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                    }}
                >
                    <div style={{ fontSize: '11px', color: '#f59f00', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Yöneticiler
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59f00', marginTop: '2px' }}>
                        {managersList.length} <span style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(245, 159, 0, 0.7)' }}>Yönetici</span>
                    </div>
                </div>
            </div>

            {/* 3. FİLTRE VE ARAMA ŞERİDİ */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '2px 4px'
            }}>
                {/* Sol: Rol Seçiciler (Karamel / Kehribar Tasarım) */}
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        onClick={() => setSelectedRoleFilter('all')}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: selectedRoleFilter === 'all' ? '1px solid rgba(247, 103, 7, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: selectedRoleFilter === 'all' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'rgba(28, 21, 20, 0.6)',
                            color: selectedRoleFilter === 'all' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                            cursor: 'pointer',
                            boxShadow: selectedRoleFilter === 'all' ? '0 2px 8px rgba(247, 103, 7, 0.3)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Tümü ({totalStaffCount})
                    </button>
                    <button
                        onClick={() => setSelectedRoleFilter('waiter')}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: selectedRoleFilter === 'waiter' ? '1px solid rgba(247, 103, 7, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: selectedRoleFilter === 'waiter' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'rgba(28, 21, 20, 0.6)',
                            color: selectedRoleFilter === 'waiter' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                            cursor: 'pointer',
                            boxShadow: selectedRoleFilter === 'waiter' ? '0 2px 8px rgba(247, 103, 7, 0.3)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Garsonlar ({waitersList.length})
                    </button>
                    <button
                        onClick={() => setSelectedRoleFilter('admin')}
                        style={{
                            padding: '7px 14px',
                            borderRadius: '10px',
                            fontSize: '12px',
                            fontWeight: 700,
                            border: selectedRoleFilter === 'admin' ? '1px solid rgba(245, 159, 0, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                            background: selectedRoleFilter === 'admin' ? 'linear-gradient(135deg, #f59f00 0%, #d97706 100%)' : 'rgba(28, 21, 20, 0.6)',
                            color: selectedRoleFilter === 'admin' ? '#ffffff' : 'var(--text-secondary, #d1b8af)',
                            cursor: 'pointer',
                            boxShadow: selectedRoleFilter === 'admin' ? '0 2px 8px rgba(245, 159, 0, 0.3)' : 'none',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        Yöneticiler ({managersList.length})
                    </button>
                </div>

                {/* Sağ: Arama & Görünüm */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Personel veya PIN ara..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '7px 28px 7px 30px',
                                background: 'rgba(28, 21, 20, 0.8)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                color: '#fffaf5',
                                borderRadius: '10px',
                                fontSize: '12px',
                                width: '200px',
                                outline: 'none'
                            }}
                        />
                        <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted, #8d736b)' }} />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted, #8d736b)', cursor: 'pointer', padding: '2px' }}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', background: 'rgba(28, 21, 20, 0.8)', padding: '2px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                        <button
                            onClick={() => setViewMode('grid')}
                            style={{
                                padding: '5px 8px',
                                border: 'none',
                                borderRadius: '8px',
                                background: viewMode === 'grid' ? 'rgba(247, 103, 7, 0.25)' : 'transparent',
                                color: viewMode === 'grid' ? '#f76707' : 'var(--text-muted, #8d736b)',
                                cursor: 'pointer',
                                display: 'flex'
                            }}
                        >
                            <LayoutGrid size={14} />
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            style={{
                                padding: '5px 8px',
                                border: 'none',
                                borderRadius: '8px',
                                background: viewMode === 'table' ? 'rgba(247, 103, 7, 0.25)' : 'transparent',
                                color: viewMode === 'table' ? '#f76707' : 'var(--text-muted, #8d736b)',
                                cursor: 'pointer',
                                display: 'flex'
                            }}
                        >
                            <List size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4. MİNİMALİST LÜKS PERSONEL KARTLARI (Sıcak Brand Teması) */}
            {allStaff.length === 0 ? (
                <div style={{
                    background: 'rgba(28, 21, 20, 0.6)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: 'var(--text-secondary, #d1b8af)'
                }}>
                    <Users size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontSize: '13px' }}>Arama kriterlerine uygun personel bulunamadı.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '14px'
                }}>
                    {allStaff.map((staff, idx) => {
                        const isPinVisible = !!revealedPins[staff.id];
                        const isCopied = copiedPinId === staff.id;
                        const initials = getInitials(staff.name);

                        return (
                            <motion.div
                                key={staff.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: idx * 0.03 }}
                                whileHover={{ y: -3 }}
                                style={{
                                    background: 'linear-gradient(180deg, #1c1514 0%, #140e0d 100%)',
                                    backdropFilter: 'blur(16px)',
                                    borderRadius: '18px',
                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                    borderTop: '1px solid rgba(255, 255, 255, 0.16)',
                                    padding: '20px 22px',
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    position: 'relative'
                                }}
                            >
                                {/* Kart Üstü: Yuvarlak Sıcak Avatar, İsim & Rapor Butonu */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        {/* Şık Yuvarlak Avatar */}
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '50%',
                                            background: staff.gradient,
                                            border: `1.5px solid ${staff.borderColor}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: staff.color,
                                            fontSize: '15px',
                                            fontWeight: 800,
                                            boxShadow: `0 0 16px ${staff.role === 'admin' ? 'rgba(245, 159, 0, 0.15)' : 'rgba(247, 103, 7, 0.15)'}`,
                                            flexShrink: 0
                                        }}>
                                            {initials}
                                        </div>

                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                                <h3 style={{ 
                                                    fontSize: '16px', 
                                                    fontWeight: 800, 
                                                    margin: 0, 
                                                    color: '#fffaf5',
                                                    letterSpacing: '-0.01em',
                                                    fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                }}>
                                                    {staff.name}
                                                </h3>
                                                <span style={{
                                                    width: '6px',
                                                    height: '6px',
                                                    borderRadius: '50%',
                                                    background: '#10b981',
                                                    boxShadow: '0 0 6px #10b981'
                                                }} />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                                <span style={{
                                                    fontSize: '10px',
                                                    fontWeight: 800,
                                                    color: staff.color,
                                                    background: staff.tagBg,
                                                    padding: '2px 7px',
                                                    borderRadius: '5px',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.04em'
                                                }}>
                                                    {staff.roleLabel}
                                                </span>
                                                {staff.hire_date && (
                                                    <span style={{ fontSize: '11px', color: 'var(--text-muted, #8d736b)' }}>
                                                        • {new Date(staff.hire_date).getFullYear()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Zarif Rapor Butonu */}
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            setSelectedStaffForPerformance(staff);
                                            setPerfPeriod('today');
                                        }}
                                        title="Performans Raporunu İncele"
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '9px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            color: '#fffaf5',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <BarChart3 size={13} color="#f59f00" />
                                        <span>Rapor</span>
                                    </motion.button>
                                </div>

                                {/* Orta Kısım: Sade, Şık PIN Kapsülü */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(0, 0, 0, 0.25)',
                                    border: '1px solid rgba(255, 255, 255, 0.06)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <KeyRound size={14} color="#f59f00" style={{ opacity: 0.85 }} />
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary, #d1b8af)', fontWeight: 600 }}>Giriş PIN:</span>
                                        <span style={{
                                            fontSize: '14px',
                                            fontWeight: 800,
                                            color: '#fffaf5',
                                            letterSpacing: isPinVisible ? '2px' : '4px',
                                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                                        }}>
                                            {isPinVisible ? (staff.pin || '------') : '••••••'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            onClick={() => toggleRevealPin(staff.id)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: isPinVisible ? '#f59f00' : 'var(--text-secondary, #d1b8af)',
                                                cursor: 'pointer',
                                                padding: '4px 6px',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title={isPinVisible ? "Gizle" : "Göster"}
                                        >
                                            {isPinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                                        </button>

                                        <button
                                            onClick={(e) => handleCopyPin(e, staff)}
                                            style={{
                                                background: 'transparent',
                                                border: 'none',
                                                color: isCopied ? '#10b981' : 'var(--text-secondary, #d1b8af)',
                                                cursor: 'pointer',
                                                padding: '4px 6px',
                                                borderRadius: '6px',
                                                display: 'flex',
                                                alignItems: 'center'
                                            }}
                                            title="Kopyala"
                                        >
                                            {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                </div>

                                {/* Bilgi Satırı: Tek Satır, Kutusuz ve Ferah */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '2px 4px',
                                    fontSize: '12px'
                                }}>
                                    {staff.role === 'waiter' ? (
                                        <>
                                            <span style={{ color: 'var(--text-secondary, #d1b8af)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ShoppingBag size={13} style={{ opacity: 0.7 }} />
                                                <span>{staff.total_orders_count || 0} Sipariş</span>
                                            </span>
                                            <span style={{ fontWeight: 800, color: '#f59f00', fontSize: '13px' }}>
                                                {formatMoney(staff.total_revenue || 0)}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <span style={{ color: 'var(--text-secondary, #d1b8af)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <ShieldCheck size={13} style={{ color: '#f59f00' }} />
                                                <span>Kasa & Sistem Erişimi</span>
                                            </span>
                                            <span style={{ fontWeight: 700, color: '#f59f00', fontSize: '11px', background: 'rgba(245, 159, 0, 0.12)', border: '1px solid rgba(245, 159, 0, 0.25)', padding: '2px 8px', borderRadius: '6px' }}>
                                                Tam Yetkili
                                            </span>
                                        </>
                                    )}
                                </div>

                                {/* Alt Butonlar */}
                                <div style={{ 
                                    display: 'flex', 
                                    gap: '8px', 
                                    paddingTop: '12px', 
                                    borderTop: '1px solid rgba(255, 255, 255, 0.06)' 
                                }}>
                                    <motion.button
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingStaffPin(staff);
                                            setNewPinInput('');
                                            setShowPinModal(true);
                                        }}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            background: 'rgba(245, 159, 0, 0.1)',
                                            border: '1px solid rgba(245, 159, 0, 0.25)',
                                            borderRadius: '9px',
                                            color: '#f59f00',
                                            fontSize: '12px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '6px'
                                        }}
                                    >
                                        <KeyRound size={13} />
                                        <span>PIN Değiştir</span>
                                    </motion.button>

                                    <motion.button
                                        whileHover={{ scale: 1.04, backgroundColor: 'rgba(239, 68, 68, 0.15)' }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteStaff(staff.id, staff.role, staff.name);
                                        }}
                                        style={{
                                            padding: '8px 12px',
                                            background: 'rgba(255, 255, 255, 0.03)',
                                            border: '1px solid rgba(255, 255, 255, 0.08)',
                                            borderRadius: '9px',
                                            color: 'rgba(255, 255, 255, 0.45)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}
                                        title="Personeli Sil"
                                    >
                                        <Trash2 size={13} />
                                    </motion.button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                /* TABLO GÖRÜNÜMÜ */
                <div style={{
                    background: 'rgba(28, 21, 20, 0.75)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    padding: '16px',
                    overflowX: 'auto'
                }}>
                    <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse', fontSize: '13px' }}>
                        <thead>
                            <tr style={{ textAlign: 'left', color: 'var(--text-muted, #8d736b)', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <th style={{ padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase' }}>Personel</th>
                                <th style={{ padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase' }}>Rol</th>
                                <th style={{ padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase' }}>Giriş PIN</th>
                                <th style={{ padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase' }}>Sipariş</th>
                                <th style={{ padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase' }}>Toplam Ciro</th>
                                <th style={{ padding: '10px 12px', fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allStaff.map(staff => {
                                const isPinVisible = !!revealedPins[staff.id];
                                const initials = getInitials(staff.name);

                                return (
                                    <tr 
                                        key={staff.id} 
                                        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}
                                    >
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <div style={{
                                                    width: '30px',
                                                    height: '30px',
                                                    borderRadius: '50%',
                                                    background: staff.gradient,
                                                    border: `1px solid ${staff.borderColor}`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: staff.color,
                                                    fontSize: '11px',
                                                    fontWeight: 800
                                                }}>
                                                    {initials}
                                                </div>
                                                <span style={{ fontWeight: 700, color: '#fffaf5' }}>{staff.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 800,
                                                color: staff.color,
                                                background: staff.tagBg,
                                                padding: '2px 8px',
                                                borderRadius: '5px'
                                            }}>
                                                {staff.roleLabel}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontWeight: 800, color: '#fffaf5', letterSpacing: isPinVisible ? '1px' : '3px' }}>
                                                    {isPinVisible ? staff.pin : '••••••'}
                                                </span>
                                                <button
                                                    onClick={() => toggleRevealPin(staff.id)}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary, #d1b8af)', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    {isPinVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                                                </button>
                                            </div>
                                        </td>
                                        <td style={{ padding: '12px', color: 'var(--text-secondary, #d1b8af)' }}>
                                            {staff.role === 'waiter' ? `${staff.total_orders_count || 0} Adet` : '—'}
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: 800, color: '#f59f00' }}>
                                            {staff.role === 'waiter' ? formatMoney(staff.total_revenue || 0) : '—'}
                                        </td>
                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                <button
                                                    style={{ padding: '5px 8px', fontSize: '11px', fontWeight: 700, color: '#fffaf5', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => {
                                                        setSelectedStaffForPerformance(staff);
                                                        setPerfPeriod('today');
                                                    }}
                                                >
                                                    <BarChart3 size={12} color="#f59f00" /> Rapor
                                                </button>
                                                <button
                                                    style={{ padding: '5px 8px', fontSize: '11px', fontWeight: 700, color: '#f59f00', background: 'rgba(245,159,0,0.1)', border: '1px solid rgba(245,159,0,0.25)', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => {
                                                        setEditingStaffPin(staff);
                                                        setNewPinInput('');
                                                        setShowPinModal(true);
                                                    }}
                                                >
                                                    <KeyRound size={12} /> PIN
                                                </button>
                                                <button
                                                    style={{ padding: '5px 8px', fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: 'transparent', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
                                                    onClick={() => handleDeleteStaff(staff.id, staff.role, staff.name)}
                                                >
                                                    <Trash2 size={12} />
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
