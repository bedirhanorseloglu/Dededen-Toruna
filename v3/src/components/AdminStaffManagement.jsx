import React, { useState, useMemo } from 'react';
import { formatMoney } from '../data/menu';
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
    Sparkles,
    Phone,
    TrendingUp,
    UtensilsCrossed
} from 'lucide-react';

export default function AdminStaffManagement({
    waitersList = [],
    kitchenList = [],
    managersList = [],
    setStaffModalRole,
    setShowStaffModal,
    setEditingStaffPin,
    setNewPinInput,
    setShowPinModal,
    handleDeleteStaff
}) {
    // Filtreler: 'all' | 'waiter' | 'kitchen' | 'admin'
    const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [revealedPins, setRevealedPins] = useState({}); // { [staffId]: boolean }

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
            const matchesRole = selectedRoleFilter === 'all' || item.role === selectedRoleFilter;
            const q = searchQuery.trim().toLocaleLowerCase('tr-TR');
            const matchesQuery = !q || 
                (item.name && item.name.toLocaleLowerCase('tr-TR').includes(q)) ||
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
                        Garsonlar, mutfak şefleri ve yöneticilerin sisteme giriş PIN kodları ve yetkileri
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
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {/* Kart Başlığı: Avatar, İsim & Rol Rozeti */}
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
                                                    <span>İşe Giriş: {new Date(staff.hire_date).toLocaleDateString('tr-TR')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Orta Kısım: PIN Kodu Kutusu (Göz ikonuyla açıp kapatılabilir) */}
                                <div style={{
                                    background: 'var(--bg-surface-elevated)',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    border: '1px solid var(--border-subtle)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Giriş PIN Kodu</div>
                                        <div style={{ fontSize: '16px', fontWeight: 900, color: 'white', fontFamily: 'monospace', letterSpacing: isPinVisible ? '2px' : '3px' }}>
                                            {displayPin}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => toggleRevealPin(staff.id)}
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
                                <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                                    <button
                                        type="button"
                                        onClick={() => {
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
                                        onClick={() => handleDeleteStaff(staff.id, staff.role, staff.name)}
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
                                    <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                                        <td style={{ padding: '14px 10px', fontWeight: 800, color: 'white' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <span style={{ fontSize: '16px' }}>{staff.icon}</span>
                                                <div>
                                                    <div>{staff.name}</div>
                                                    {staff.hire_date && (
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginTop: '2px' }}>
                                                            📅 İşe Giriş: {new Date(staff.hire_date).toLocaleDateString('tr-TR')}
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
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: 'white', letterSpacing: isPinVisible ? '1px' : '2px' }}>
                                                    {displayPin}
                                                </span>
                                                <button
                                                    onClick={() => toggleRevealPin(staff.id)}
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
                                            <div style={{ display: 'inline-flex', gap: '6px' }}>
                                                <button
                                                    className="btn-outline"
                                                    style={{ padding: '5px 10px', fontSize: '12px', color: 'var(--brand-gold)', borderColor: 'rgba(245,159,0,0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                                    onClick={() => {
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
                                                    onClick={() => handleDeleteStaff(staff.id, staff.role, staff.name)}
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
        </div>
    );
}
