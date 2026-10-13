import React, { useState, useMemo } from 'react';
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Check,
    X,
    Utensils,
    Tag,
    RotateCcw,
    CheckCircle2,
    SlidersHorizontal,
    Sparkles,
    AlertCircle,
    CheckCircle,
    XCircle,
    Filter,
    ChevronDown,
    ChevronUp,
    Layers,
    LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney } from '../data/menu';

export default function AdminMenuManagement({
    menuProducts = [],
    categories = [],
    saveMenuItem,
    toggleMenuItemAvailability,
    deleteMenuItem,
    seedDefaultMenu,
    showConfirm,
    showToast
}) {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'out_of_stock'
    const [searchTerm, setSearchTerm] = useState('');

    // Görünüm Modu: 'grid' (Kare kart ızgarası) | 'stack' (Liste yığını)
    const [viewMode, setViewMode] = useState(() => {
        try {
            return localStorage.getItem('menu_admin_view_mode') || 'grid';
        } catch {
            return 'grid';
        }
    });

    const handleSwitchViewMode = (mode) => {
        setViewMode(mode);
        try {
            localStorage.setItem('menu_admin_view_mode', mode);
        } catch (_) { }
    };
    // Akordeon Kategori Yığını (Açılır/Kapanır Kategoriler)
    const [collapsedCategories, setCollapsedCategories] = useState({});

    const toggleCategoryCollapse = (catId) => {
        setCollapsedCategories(prev => ({
            ...prev,
            [catId]: !prev[catId]
        }));
    };

    const handleCollapseAll = () => {
        const next = {};
        categories.forEach(c => { next[c.id] = true; });
        setCollapsedCategories(next);
    };

    const handleExpandAll = () => {
        setCollapsedCategories({});
    };

    // Satır içi hızlı fiyat düzenleme: id
    const [editingPriceId, setEditingPriceId] = useState(null);
    const [editingPriceValue, setEditingPriceValue] = useState('');

    // Düzenleme / Ekleme Modalı
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formName, setFormName] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formCategory, setFormCategory] = useState(categories[0]?.id || 'kahvalti');
    const [formActive, setFormActive] = useState(true);

    // Kategori bazlı lezzet sayıları (hap badge'ler için)
    const categoryCounts = useMemo(() => {
        const counts = {};
        (menuProducts || []).forEach(p => {
            counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        });
        return counts;
    }, [menuProducts]);

    const activeCount = useMemo(() => (menuProducts || []).filter(p => p.active !== false).length, [menuProducts]);
    const outOfStockCount = (menuProducts || []).length - activeCount;

    // Filtreleme
    const filteredProducts = useMemo(() => {
        return (menuProducts || []).filter(p => {
            // Kategori filtresi
            if (selectedCategory !== 'all' && p.category_id !== selectedCategory) {
                return false;
            }
            // Stok durumu filtresi
            if (statusFilter === 'active' && p.active === false) {
                return false;
            }
            if (statusFilter === 'out_of_stock' && p.active !== false) {
                return false;
            }
            // Arama
            if (searchTerm.trim()) {
                const q = searchTerm.toLowerCase();
                return (p.name || '').toLowerCase().includes(q);
            }
            return true;
        });
    }, [menuProducts, selectedCategory, statusFilter, searchTerm]);

    // Gruplanmış kategoriler (menüdeki gibi başlıklarla ayrım)
    const groupedCategories = useMemo(() => {
        // Hangi kategorilerin gösterileceğini belirle
        const catsToDisplay = selectedCategory === 'all'
            ? categories
            : categories.filter(c => c.id === selectedCategory);

        return catsToDisplay.map(cat => {
            const items = filteredProducts.filter(p => p.category_id === cat.id);
            return {
                ...cat,
                items,
                totalCount: categoryCounts[cat.id] || 0
            };
        }).filter(group => group.items.length > 0 || (selectedCategory === group.id && !searchTerm.trim() && statusFilter === 'all'));
    }, [categories, filteredProducts, selectedCategory, categoryCounts, searchTerm, statusFilter]);

    // Modal Aç
    const handleOpenModal = (product = null) => {
        if (product) {
            setEditingProduct(product);
            setFormName(product.name || '');
            setFormPrice(String(product.price || ''));
            setFormCategory(product.category_id || categories[0]?.id || 'kahvalti');
            setFormActive(product.active !== false);
        } else {
            setEditingProduct(null);
            setFormName('');
            setFormPrice('');
            setFormCategory(selectedCategory !== 'all' ? selectedCategory : (categories[0]?.id || 'kahvalti'));
            setFormActive(true);
        }
        setShowModal(true);
    };

    // Modal Kaydet
    const handleSaveForm = async (e) => {
        if (e) e.preventDefault();
        if (!formName.trim()) {
            showToast('Lütfen lezzet adını giriniz.', 'warning');
            return;
        }
        const numPrice = Number(formPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
            showToast('Lütfen geçerli bir fiyat giriniz.', 'warning');
            return;
        }

        try {
            await saveMenuItem({
                ...(editingProduct || {}),
                name: formName.trim(),
                price: numPrice,
                category_id: formCategory,
                active: formActive
            });
            setShowModal(false);
        } catch (err) {
            console.error('Save error:', err);
            showToast('Kaydedilirken hata oluştu.', 'danger');
        }
    };

    // Hızlı Fiyat Kaydet
    const handleSaveInlinePrice = async (p) => {
        const num = Number(editingPriceValue);
        if (isNaN(num) || num <= 0) {
            showToast('Geçerli bir tutar giriniz.', 'warning');
            return;
        }
        try {
            await saveMenuItem({ ...p, price: num });
            setEditingPriceId(null);
        } catch (err) {
            console.error('Price error:', err);
        }
    };

    // Silme
    const handleDelete = async (p) => {
        const ok = await showConfirm({
            title: 'Ürünü Menüden Sil',
            message: `"${p.name}" adlı lezzeti menüden kalıcı olarak silmek istediğinize emin misiniz?`,
            confirmText: 'Evet, Sil',
            cancelText: 'Vazgeç',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await deleteMenuItem(p.id, p.name);
        } catch (err) {
            console.error('Delete error:', err);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            {/* 1. ÜST KONTROL & STATS ÇUBUĞU (Modern POS Kokpiti) */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(28, 21, 20, 0.95), rgba(17, 13, 12, 0.98))',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-card)',
                padding: '20px 24px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '14px',
                        background: 'linear-gradient(135deg, rgba(247, 103, 7, 0.25), rgba(245, 159, 0, 0.15))',
                        border: '1px solid rgba(247, 103, 7, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--brand-primary)'
                    }}>
                        <Utensils size={24} />
                    </div>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.3px' }}>
                                Menü & Lezzet Yönetimi
                            </h2>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '3px 10px',
                                borderRadius: '20px',
                                background: 'rgba(245, 158, 11, 0.15)',
                                color: 'var(--brand-gold)',
                                border: '1px solid rgba(245, 158, 11, 0.3)'
                            }}>
                                {menuProducts.length} Lezzet
                            </span>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                            Fiyatı değiştirmek için tutara tıklayın. Tek dokunuşla ürünleri satışa açın veya kapatın.
                        </p>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Canlı Stok Durum Filtresi (Buton kalabalığı yerine 3 net dokunmatik hap) */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: 'rgba(0, 0, 0, 0.4)',
                        padding: '4px',
                        borderRadius: '12px',
                        border: '1px solid var(--border-card)',
                        gap: '4px'
                    }}>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            style={{
                                border: 'none',
                                background: statusFilter === 'all' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                                color: statusFilter === 'all' ? '#ffffff' : 'var(--text-muted)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            Tümü ({menuProducts.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('active')}
                            style={{
                                border: 'none',
                                background: statusFilter === 'active' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                                color: statusFilter === 'active' ? '#10b981' : 'var(--text-muted)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                            Satışta ({activeCount})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('out_of_stock')}
                            style={{
                                border: 'none',
                                background: statusFilter === 'out_of_stock' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                color: statusFilter === 'out_of_stock' ? '#ef4444' : 'var(--text-muted)',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }} />
                            Tükendi ({outOfStockCount})
                        </button>
                    </div>

                    <button
                        onClick={() => handleOpenModal(null)}
                        className="btn-primary"
                        style={{
                            padding: '10px 20px',
                            fontSize: '13px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: 'var(--shadow-glow)'
                        }}
                    >
                        <Plus size={16} /> Yeni Lezzet Ekle
                    </button>
                </div>
            </div>

            {/* 2. ARAMA BARI (Modern Full-Width Arama) */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 18px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <Search size={18} color="var(--brand-gold)" />
                <input
                    type="text"
                    placeholder="Menüde lezzet veya ürün ara (Serpme kahvaltı, kuymak, hamburger, tost...)"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: 600,
                        width: '100%'
                    }}
                />
                {searchTerm && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '10px',
                            background: 'rgba(245, 159, 0, 0.15)',
                            color: 'var(--brand-gold)'
                        }}>
                            {filteredProducts.length} sonuç
                        </span>
                        <button
                            onClick={() => setSearchTerm('')}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* 3. MODERN KATEGORİ IZGARASI (Menüdeki gibi 2-Row Responsive Pills, scrollbar yok) */}
            <div className="modern-category-grid">
                <motion.button
                    className={`modern-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setSelectedCategory('all')}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="pill-icon">🍽️</span>
                    <span className="pill-title">Tüm Kategoriler</span>
                    <span className="pill-badge">{menuProducts.length}</span>
                </motion.button>

                {categories.map(cat => {
                    const count = categoryCounts[cat.id] || 0;
                    return (
                        <motion.button
                            key={cat.id}
                            className={`modern-cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span className="pill-icon">{cat.icon}</span>
                            <span className="pill-title">{cat.name}</span>
                            {count > 0 && <span className="pill-badge">{count}</span>}
                        </motion.button>
                    );
                })}
            </div>

            {/* 4. DÜZENLEME & STACK KONTROL ARAÇ ÇUBUĞU */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-card)',
                borderRadius: 'var(--radius-lg)',
                padding: '12px 18px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 800 }}>
                        Görünüm:
                    </span>
                    <button
                        type="button"
                        onClick={() => handleSwitchViewMode('grid')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            background: viewMode === 'grid' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                            color: viewMode === 'grid' ? 'white' : 'var(--text-muted)',
                            border: `1px solid ${viewMode === 'grid' ? 'transparent' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: viewMode === 'grid' ? '0 2px 8px rgba(247, 103, 7, 0.3)' : 'none'
                        }}
                    >
                        <LayoutGrid size={14} />
                        <span>▦ Kare Izgara</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSwitchViewMode('stack')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 14px',
                            background: viewMode === 'stack' ? 'linear-gradient(135deg, var(--brand-primary), #e8590c)' : 'transparent',
                            color: viewMode === 'stack' ? 'white' : 'var(--text-muted)',
                            border: `1px solid ${viewMode === 'stack' ? 'transparent' : 'var(--border-subtle)'}`,
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                            boxShadow: viewMode === 'stack' ? '0 2px 8px rgba(247, 103, 7, 0.3)' : 'none'
                        }}
                    >
                        <Layers size={14} />
                        <span>☰ Liste Yığını</span>
                    </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>
                        Kategoriler:
                    </span>
                    <button
                        type="button"
                        onClick={handleExpandAll}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title="Tüm kategorileri genişlet"
                    >
                        <ChevronDown size={13} /> Tümünü Aç
                    </button>
                    <button
                        type="button"
                        onClick={handleCollapseAll}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '5px 12px',
                            background: 'var(--bg-surface-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-card)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        title="Tüm kategorileri daralt"
                    >
                        <ChevronUp size={13} /> Tümünü Daralt
                    </button>
                </div>
            </div>

            {/* 5. AKORDEON KATEGORİ YIĞINI VE LEZZET LİSTESİ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <AnimatePresence mode="wait">
                    {groupedCategories.map((group) => {
                        const groupOutOfStockCount = group.items.filter(p => p.active === false).length;
                        const isCollapsed = searchTerm.trim() ? false : Boolean(collapsedCategories[group.id]);

                        return (
                            <motion.div
                                key={group.id}
                                className="menu-category-section"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.15 }}
                                style={{
                                    borderRadius: 'var(--radius-lg)',
                                    overflow: 'hidden',
                                    border: '1px solid var(--border-card)',
                                    background: 'var(--bg-surface)',
                                    boxShadow: 'var(--shadow-soft)'
                                }}
                            >
                                {/* Kategori Başlığı (Tıklanabilir Stack / Akordeon Barı) */}
                                <div
                                    onClick={() => toggleCategoryCollapse(group.id)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        gap: '12px',
                                        padding: '12px 18px',
                                        background: isCollapsed ? 'var(--bg-surface)' : 'rgba(255, 255, 255, 0.02)',
                                        borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        userSelect: 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                        <span style={{ fontSize: '20px' }}>{group.icon}</span>
                                        <span style={{ fontSize: '16px', fontWeight: 900, color: 'var(--brand-gold)', letterSpacing: '-0.3px' }}>
                                            {group.name}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 800,
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            color: 'var(--text-secondary)'
                                        }}>
                                            {group.items.length} çeşit
                                        </span>

                                        {/* Stok Durum Rozeti */}
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            padding: '2px 8px',
                                            borderRadius: '12px',
                                            background: groupOutOfStockCount > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                                            color: groupOutOfStockCount > 0 ? '#ef4444' : '#10b981',
                                            border: `1px solid ${groupOutOfStockCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)'}`
                                        }}>
                                            {groupOutOfStockCount > 0 ? `${groupOutOfStockCount} Tükendi` : 'Tümü Satışta'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                                        {/* Hızlı Ekle Butonu */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingProduct(null);
                                                setFormName('');
                                                setFormPrice('');
                                                setFormCategory(group.id);
                                                setFormActive(true);
                                                setShowModal(true);
                                            }}
                                            style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                color: 'var(--text-secondary)',
                                                padding: '5px 12px',
                                                borderRadius: '8px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.background = 'rgba(247, 103, 7, 0.15)';
                                                e.currentTarget.style.color = 'var(--brand-primary)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                e.currentTarget.style.color = 'var(--text-secondary)';
                                            }}
                                        >
                                            <Plus size={13} /> Ürün Ekle
                                        </button>

                                        {/* Akordeon Göstergesi */}
                                        <div
                                            style={{
                                                width: '28px',
                                                height: '28px',
                                                borderRadius: '6px',
                                                background: 'rgba(255, 255, 255, 0.06)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'var(--text-secondary)',
                                                cursor: 'pointer',
                                                transition: 'all 0.15s ease'
                                            }}
                                            onClick={() => toggleCategoryCollapse(group.id)}
                                        >
                                            {isCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                                        </div>
                                    </div>
                                </div>

                                {/* Kategori İçeriği (Yalnızca Açıkken) */}
                                {!isCollapsed && (
                                    <div style={{ padding: '14px 18px' }}>
                                        {group.items.length === 0 ? (
                                            <div style={{
                                                padding: '20px',
                                                borderRadius: 'var(--radius-md)',
                                                border: '1px dashed var(--border-card)',
                                                textAlign: 'center',
                                                color: 'var(--text-muted)',
                                                fontSize: '13px'
                                            }}>
                                                Bu kategoride arama kriterine uygun lezzet bulunamadı.
                                            </div>
                                        ) : viewMode === 'stack' ? (
                                            /* GÖRÜNÜM 1: MODERN KART YIĞINI (STACK LIST) */
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {group.items.map((p) => {
                                                    const isOutOfStock = p.active === false;
                                                    const isEditingThisPrice = editingPriceId === p.id;

                                                    return (
                                                        <div
                                                            key={p.id}
                                                            style={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                flexWrap: 'wrap',
                                                                gap: '12px',
                                                                padding: '10px 16px',
                                                                background: isOutOfStock
                                                                    ? 'rgba(239, 68, 68, 0.035)'
                                                                    : 'rgba(255, 255, 255, 0.025)',
                                                                border: isOutOfStock
                                                                    ? '1px dashed rgba(239, 68, 68, 0.3)'
                                                                    : '1px solid var(--border-subtle)',
                                                                borderRadius: 'var(--radius-md)',
                                                                transition: 'all 0.15s ease',
                                                                opacity: isOutOfStock ? 0.75 : 1
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!isOutOfStock) {
                                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.045)';
                                                                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!isOutOfStock) {
                                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.025)';
                                                                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                                                                }
                                                            }}
                                                        >
                                                            {/* Sol Grup: Durum Noktası & Ürün Adı */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: '220px' }}>
                                                                <span style={{
                                                                    width: '8px',
                                                                    height: '8px',
                                                                    borderRadius: '50%',
                                                                    background: !isOutOfStock ? '#10b981' : '#ef4444',
                                                                    boxShadow: !isOutOfStock ? '0 0 8px rgba(16, 185, 129, 0.6)' : 'none',
                                                                    flexShrink: 0
                                                                }} />
                                                                <span style={{
                                                                    fontSize: '14px',
                                                                    fontWeight: 800,
                                                                    color: isOutOfStock ? 'var(--text-muted)' : '#ffffff',
                                                                    textDecoration: isOutOfStock ? 'line-through' : 'none',
                                                                    letterSpacing: '-0.2px'
                                                                }}>
                                                                    {p.name}
                                                                </span>
                                                            </div>

                                                            {/* Orta Grup: Tıklanabilir Hızlı Fiyat */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                {isEditingThisPrice ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            value={editingPriceValue}
                                                                            onChange={(e) => setEditingPriceValue(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                            autoFocus
                                                                            style={{
                                                                                width: '80px',
                                                                                background: '#110d0c',
                                                                                border: '1px solid var(--brand-gold)',
                                                                                borderRadius: '6px',
                                                                                padding: '4px 8px',
                                                                                color: 'var(--brand-gold)',
                                                                                fontWeight: 900,
                                                                                fontSize: '13px',
                                                                                outline: 'none',
                                                                                textAlign: 'right'
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSaveInlinePrice(p);
                                                                                else if (e.key === 'Escape') setEditingPriceId(null);
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveInlinePrice(p)}
                                                                            className="btn-primary"
                                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        >
                                                                            <Check size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingPriceId(null)}
                                                                            className="btn-outline"
                                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        >
                                                                            <X size={13} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        onClick={() => {
                                                                            setEditingPriceId(p.id);
                                                                            setEditingPriceValue(String(p.price));
                                                                        }}
                                                                        style={{
                                                                            fontSize: '14px',
                                                                            fontWeight: 900,
                                                                            color: 'var(--brand-gold)',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '5px',
                                                                            padding: '3px 9px',
                                                                            borderRadius: '6px',
                                                                            background: 'rgba(245, 159, 0, 0.08)',
                                                                            border: '1px solid rgba(245, 159, 0, 0.2)',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                        title="Fiyatı anında değiştirmek için tıklayın"
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(245, 159, 0, 0.18)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(245, 159, 0, 0.08)'}
                                                                    >
                                                                        {formatMoney(p.price)}
                                                                        <Edit3 size={11} style={{ opacity: 0.6 }} />
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {/* Sağ Grup: Stok Durumu ve İşlemler */}
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                                                                {/* Stok Durum Butonu */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleMenuItemAvailability(p.id, p.active !== false)}
                                                                    style={{
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        background: !isOutOfStock ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                                                                        color: !isOutOfStock ? '#10b981' : '#ef4444',
                                                                        border: `1px solid ${!isOutOfStock ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                                        borderRadius: '20px',
                                                                        padding: '4px 10px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 800,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '5px',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    title="Siparişe açık veya tükendi olarak işaretle"
                                                                >
                                                                    <span style={{
                                                                        width: '6px',
                                                                        height: '6px',
                                                                        borderRadius: '50%',
                                                                        background: !isOutOfStock ? '#10b981' : '#ef4444'
                                                                    }} />
                                                                    {!isOutOfStock ? 'Satışta' : 'Tükendi'}
                                                                </button>

                                                                {/* Düzenle */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleOpenModal(p)}
                                                                    style={{
                                                                        background: 'rgba(255, 255, 255, 0.05)',
                                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                        borderRadius: '6px',
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: 'var(--text-secondary)',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    title="Ürünü Düzenle"
                                                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                                                >
                                                                    <Edit3 size={13} />
                                                                </button>

                                                                {/* Sil */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDelete(p)}
                                                                    style={{
                                                                        background: 'rgba(239, 68, 68, 0.08)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                        borderRadius: '6px',
                                                                        width: '28px',
                                                                        height: '28px',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: '#ef4444',
                                                                        cursor: 'pointer',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    title="Ürünü Sil"
                                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            /* GÖRÜNÜM 2: KARE KART IZGARASI (GRID - KARE KARE YAN YANA) */
                                            <div style={{
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                                                gap: '12px'
                                            }}>
                                                {group.items.map((p) => {
                                                    const isOutOfStock = p.active === false;
                                                    const isEditingThisPrice = editingPriceId === p.id;

                                                    return (
                                                        <div
                                                            key={p.id}
                                                            style={{
                                                                background: isOutOfStock
                                                                    ? 'linear-gradient(155deg, rgba(239, 68, 68, 0.05) 0%, rgba(20, 15, 14, 0.9) 100%)'
                                                                    : 'linear-gradient(155deg, rgba(32, 24, 22, 0.9) 0%, rgba(18, 14, 13, 0.95) 100%)',
                                                                border: isOutOfStock
                                                                    ? '1px dashed rgba(239, 68, 68, 0.35)'
                                                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                                                borderRadius: '16px',
                                                                padding: '14px 16px',
                                                                position: 'relative',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                justifyContent: 'space-between',
                                                                minHeight: '135px',
                                                                gap: '10px',
                                                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35)',
                                                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                                                opacity: isOutOfStock ? 0.75 : 1
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                if (!isOutOfStock) {
                                                                    e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.35)';
                                                                    e.currentTarget.style.transform = 'translateY(-3px)';
                                                                    e.currentTarget.style.boxShadow = '0 10px 24px -4px rgba(0, 0, 0, 0.6)';
                                                                }
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                if (!isOutOfStock) {
                                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                                    e.currentTarget.style.transform = 'translateY(0)';
                                                                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.35)';
                                                                }
                                                            }}
                                                        >
                                                            {/* Üst Kısım: Ürün Adı ve İşlem Butonları */}
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                                                <h3 style={{
                                                                    fontSize: '15px',
                                                                    fontWeight: 800,
                                                                    color: isOutOfStock ? 'var(--text-muted)' : '#ffffff',
                                                                    margin: 0,
                                                                    lineHeight: 1.3,
                                                                    textDecoration: isOutOfStock ? 'line-through' : 'none'
                                                                }}>
                                                                    {p.name}
                                                                </h3>

                                                                {/* Düzenle & Sil */}
                                                                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleOpenModal(p)}
                                                                        style={{
                                                                            background: 'rgba(255, 255, 255, 0.05)',
                                                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                                                            borderRadius: '6px',
                                                                            width: '28px',
                                                                            height: '28px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: 'var(--text-secondary)',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                        title="Ürünü Düzenle"
                                                                        onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                                                                    >
                                                                        <Edit3 size={13} />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleDelete(p)}
                                                                        style={{
                                                                            background: 'rgba(239, 68, 68, 0.08)',
                                                                            border: '1px solid rgba(239, 68, 68, 0.2)',
                                                                            borderRadius: '6px',
                                                                            width: '28px',
                                                                            height: '28px',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            justifyContent: 'center',
                                                                            color: '#ef4444',
                                                                            cursor: 'pointer',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                        title="Ürünü Sil"
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Alt Bar: Fiyat (Tıklayıp Değiştir) & Stok Switch */}
                                                            <div style={{
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                                                paddingTop: '12px',
                                                                marginTop: '4px'
                                                            }}>
                                                                {/* Tıklanabilir Hızlı Fiyat */}
                                                                {isEditingThisPrice ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                        <input
                                                                            type="text"
                                                                            inputMode="decimal"
                                                                            value={editingPriceValue}
                                                                            onChange={(e) => setEditingPriceValue(e.target.value.replace(/[^0-9.]/g, ''))}
                                                                            autoFocus
                                                                            style={{
                                                                                width: '78px',
                                                                                background: '#110d0c',
                                                                                border: '1px solid var(--brand-gold)',
                                                                                borderRadius: '6px',
                                                                                padding: '4px 8px',
                                                                                color: 'var(--brand-gold)',
                                                                                fontWeight: 900,
                                                                                fontSize: '13px',
                                                                                outline: 'none',
                                                                                textAlign: 'right'
                                                                            }}
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSaveInlinePrice(p);
                                                                                else if (e.key === 'Escape') setEditingPriceId(null);
                                                                            }}
                                                                        />
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleSaveInlinePrice(p)}
                                                                            className="btn-primary"
                                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        >
                                                                            <Check size={13} />
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setEditingPriceId(null)}
                                                                            className="btn-outline"
                                                                            style={{ width: '26px', height: '26px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                                        >
                                                                            <X size={13} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        onClick={() => {
                                                                            setEditingPriceId(p.id);
                                                                            setEditingPriceValue(String(p.price));
                                                                        }}
                                                                        style={{
                                                                            fontSize: '16px',
                                                                            fontWeight: 900,
                                                                            color: 'var(--brand-gold)',
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '5px',
                                                                            padding: '3px 8px',
                                                                            borderRadius: '6px',
                                                                            background: 'rgba(245, 159, 0, 0.08)',
                                                                            border: '1px solid rgba(245, 159, 0, 0.2)',
                                                                            transition: 'all 0.15s ease'
                                                                        }}
                                                                        title="Fiyatı anında değiştirmek için tıklayın"
                                                                    >
                                                                        {formatMoney(p.price)}
                                                                        <Edit3 size={11} style={{ opacity: 0.6 }} />
                                                                    </div>
                                                                )}

                                                                {/* Tek Tıkla Stok Durumu */}
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleMenuItemAvailability(p.id, p.active !== false)}
                                                                    style={{
                                                                        border: 'none',
                                                                        cursor: 'pointer',
                                                                        background: !isOutOfStock ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                                        color: !isOutOfStock ? '#10b981' : '#ef4444',
                                                                        border: `1px solid ${!isOutOfStock ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                                                                        borderRadius: '20px',
                                                                        padding: '4px 11px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 800,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '5px',
                                                                        transition: 'all 0.15s ease'
                                                                    }}
                                                                    title="Siparişe açık veya tükendi olarak işaretle"
                                                                >
                                                                    <span style={{
                                                                        width: '6px',
                                                                        height: '6px',
                                                                        borderRadius: '50%',
                                                                        background: !isOutOfStock ? '#10b981' : '#ef4444'
                                                                    }} />
                                                                    {!isOutOfStock ? 'Satışta' : 'Tükendi'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </AnimatePresence>

                {groupedCategories.length === 0 && (
                    <div style={{
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px dashed var(--border-card)',
                        padding: '48px 24px',
                        textAlign: 'center',
                        color: 'var(--text-muted)'
                    }}>
                        <Utensils size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                        <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: '0 0 6px 0' }}>
                            Arama kriterine uygun lezzet bulunamadı
                        </h4>
                        <p style={{ fontSize: '13px', margin: 0 }}>
                            Farklı bir arama terimi deneyin veya kategori filtresini temizleyin.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('all');
                                setStatusFilter('all');
                            }}
                            className="btn-outline"
                            style={{ marginTop: '16px', padding: '8px 18px', fontSize: '12px' }}
                        >
                            Filtreleri Temizle
                        </button>
                    </div>
                )}
            </div>

            {/* 5. LEZZET EKLEME / DÜZENLEME MODALI (Modern Glassmorphic Tasarım) */}
            {showModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 9999,
                    padding: '16px'
                }}>
                    <div style={{
                        background: '#1c1514',
                        border: '1px solid rgba(245, 159, 0, 0.3)',
                        borderRadius: 'var(--radius-lg)',
                        width: '100%',
                        maxWidth: '480px',
                        padding: '28px',
                        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '10px',
                                    background: 'rgba(247, 103, 7, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--brand-primary)'
                                }}>
                                    <Utensils size={20} />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: 900, color: 'white', margin: 0 }}>
                                    {editingProduct ? 'Lezzeti Düzenle' : 'Yeni Lezzet Ekle'}
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowModal(false)}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Lezzet / Ürün Adı
                                </label>
                                <input
                                    type="text"
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="Örn: Kuymak, Serpme Kahvaltı, Tost..."
                                    required
                                    style={{
                                        width: '100%',
                                        background: 'rgba(0, 0, 0, 0.35)',
                                        border: '1px solid var(--border-card)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '12px 14px',
                                        color: 'white',
                                        fontSize: '14px',
                                        outline: 'none',
                                        fontWeight: 600
                                    }}
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                                    Satış Fiyatı (₺)
                                </label>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    border: '1px solid var(--border-card)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: '10px 14px'
                                }}>
                                    <span style={{ color: 'var(--brand-gold)', fontWeight: 900, marginRight: '6px', fontSize: '16px' }}>₺</span>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={formPrice}
                                        onChange={(e) => setFormPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                        placeholder="0.00"
                                        required
                                        style={{
                                            width: '100%',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'var(--brand-gold)',
                                            fontSize: '17px',
                                            fontWeight: 900,
                                            outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                                    Kategori Seçimi
                                </label>
                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                    gap: '8px',
                                    maxHeight: '160px',
                                    overflowY: 'auto',
                                    padding: '6px',
                                    background: 'rgba(0, 0, 0, 0.35)',
                                    borderRadius: 'var(--radius-md)',
                                    border: '1px solid var(--border-card)'
                                }}>
                                    {categories.map(c => {
                                        const isSelected = formCategory === c.id;
                                        return (
                                            <button
                                                key={c.id}
                                                type="button"
                                                onClick={() => setFormCategory(c.id)}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '8px 10px',
                                                    borderRadius: '8px',
                                                    border: isSelected ? '1px solid var(--brand-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                                                    background: isSelected ? 'rgba(247, 103, 7, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                                    fontSize: '12px',
                                                    fontWeight: isSelected ? 800 : 600,
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    transition: 'all 0.15s ease'
                                                }}
                                            >
                                                <span style={{ fontSize: '16px' }}>{c.icon}</span>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Satış Durumu Switch */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '14px 16px',
                                background: 'rgba(0,0,0,0.25)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid var(--border-card)'
                            }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'white' }}>Sipariş Durumu</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Garson tabletlerinde anında görünür / gizlenir</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormActive(!formActive)}
                                    style={{
                                        border: 'none',
                                        borderRadius: '20px',
                                        padding: '6px 14px',
                                        fontSize: '12px',
                                        fontWeight: 800,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        background: formActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                        color: formActive ? '#10b981' : '#ef4444',
                                        border: `1px solid ${formActive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`
                                    }}
                                >
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: formActive ? '#10b981' : '#ef4444' }} />
                                    {formActive ? 'Satışta (Mevcut)' : 'Tükendi (Kapalı)'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="btn-outline"
                                    style={{ padding: '10px 20px', fontSize: '13px' }}
                                >
                                    Vazgeç
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary"
                                    style={{ padding: '10px 24px', fontSize: '13px', fontWeight: 800 }}
                                >
                                    {editingProduct ? 'Değişiklikleri Kaydet' : 'Lezzeti Ekle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
