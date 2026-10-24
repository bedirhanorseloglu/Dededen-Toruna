import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Check,
    X,
    UtensilsCrossed,
    Tag,
    CheckCircle2,
    XCircle,
    Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatMoney, getCategoryLucideIcon } from '../data/menu';

// Her kategori için modern Awwwards/21st.dev teması
const CATEGORY_THEMES = {
    'all': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', glow: 'rgba(245, 158, 11, 0.2)' },
    'kahvalti': { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)', glow: 'rgba(245, 158, 11, 0.2)' },
    'tost': { color: '#f97316', bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', glow: 'rgba(249, 115, 22, 0.2)' },
    'gozleme': { color: '#eab308', bg: 'rgba(234, 179, 8, 0.12)', border: 'rgba(234, 179, 8, 0.3)', glow: 'rgba(234, 179, 8, 0.2)' },
    'tavuk': { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)', glow: 'rgba(239, 68, 68, 0.2)' },
    'et': { color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.12)', border: 'rgba(244, 63, 94, 0.3)', glow: 'rgba(244, 63, 94, 0.2)' },
    'hamburger': { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.12)', border: 'rgba(251, 146, 60, 0.3)', glow: 'rgba(251, 146, 60, 0.2)' },
    'makarna': { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.12)', border: 'rgba(251, 191, 36, 0.3)', glow: 'rgba(251, 191, 36, 0.2)' },
    'salata': { color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', glow: 'rgba(16, 185, 129, 0.2)' },
    'gunun-menusu': { color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)', glow: 'rgba(6, 182, 212, 0.2)' },
    'tatlilar': { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.12)', border: 'rgba(236, 72, 153, 0.3)', glow: 'rgba(236, 72, 153, 0.2)' },
    'icecekler': { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.3)', glow: 'rgba(56, 189, 248, 0.2)' },
};
const getCategoryTheme = (id) => CATEGORY_THEMES[id] || CATEGORY_THEMES.all;

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
    // Sol Panelde varsayılan olarak ilk kategori veya 'all'
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.id || 'all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'out_of_stock'
    const [searchTerm, setSearchTerm] = useState('');

    const [editingPriceId, setEditingPriceId] = useState(null);
    const [editingPriceValue, setEditingPriceValue] = useState('');

    // Düzenleme / Ekleme Modalı
    const [showModal, setShowModal] = useState(false);
    const [isMobileCategorySheetOpen, setIsMobileCategorySheetOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [formName, setFormName] = useState('');
    const [formPrice, setFormPrice] = useState('');
    const [formCategory, setFormCategory] = useState(categories[0]?.id || 'kahvalti');
    const [formActive, setFormActive] = useState(true);

    // Modal & Sheet Scroll Lock & ESC dinleyici
    useEffect(() => {
        if (!showModal && !isMobileCategorySheetOpen) return;
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setShowModal(false);
                setIsMobileCategorySheetOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.body.style.overflow = originalOverflow;
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [showModal, isMobileCategorySheetOpen]);

    // Kategori bazlı lezzet sayıları ve tükenen sayıları
    const categoryStats = useMemo(() => {
        const stats = {};
        categories.forEach(c => {
            stats[c.id] = { total: 0, active: 0, outOfStock: 0 };
        });
        (menuProducts || []).forEach(p => {
            if (!stats[p.category_id]) {
                stats[p.category_id] = { total: 0, active: 0, outOfStock: 0 };
            }
            stats[p.category_id].total += 1;
            if (p.active === false) {
                stats[p.category_id].outOfStock += 1;
            } else {
                stats[p.category_id].active += 1;
            }
        });
        return stats;
    }, [menuProducts, categories]);

    const activeCount = useMemo(() => (menuProducts || []).filter(p => p.active !== false).length, [menuProducts]);
    const outOfStockCount = (menuProducts || []).length - activeCount;

    // Ortalama Fiyat
    const avgPrice = useMemo(() => {
        if (!menuProducts || menuProducts.length === 0) return 0;
        const sum = menuProducts.reduce((acc, p) => acc + (Number(p.price) || 0), 0);
        return Math.round(sum / menuProducts.length);
    }, [menuProducts]);

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

    // Seçili Kategorinin Bilgisi
    const activeCategoryInfo = useMemo(() => {
        if (selectedCategory === 'all') {
            return {
                id: 'all',
                name: 'Tüm Kategoriler',
                total: menuProducts.length,
                active: activeCount,
                outOfStock: outOfStockCount
            };
        }
        const found = categories.find(c => c.id === selectedCategory);
        const stats = categoryStats[selectedCategory] || { total: 0, active: 0, outOfStock: 0 };
        return {
            id: selectedCategory,
            name: found?.name || 'Kategori',
            ...stats
        };
    }, [selectedCategory, categories, categoryStats, menuProducts.length, activeCount, outOfStockCount]);

    // Gruplanmış kategoriler (Tüm Kategoriler seçiliyken bölümlere ayırmak için)
    const groupedCategories = useMemo(() => {
        const catsToDisplay = selectedCategory === 'all'
            ? categories
            : categories.filter(c => c.id === selectedCategory);

        return catsToDisplay.map(cat => {
            const items = filteredProducts.filter(p => p.category_id === cat.id);
            return {
                ...cat,
                items,
                totalCount: categoryStats[cat.id]?.total || 0,
                outOfStockCount: categoryStats[cat.id]?.outOfStock || 0
            };
        }).filter(group => group.items.length > 0 || (selectedCategory === group.id && !searchTerm.trim() && statusFilter === 'all'));
    }, [categories, filteredProducts, selectedCategory, categoryStats, searchTerm, statusFilter]);

    // Modal Aç
    const handleOpenModal = (product = null, defaultCat = null) => {
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
            const targetCat = defaultCat || (selectedCategory !== 'all' ? selectedCategory : (categories[0]?.id || 'kahvalti'));
            setFormCategory(targetCat);
            setFormActive(true);
        }
        setShowModal(true);
    };

    // Modal Kaydet
    const handleSaveForm = async (e) => {
        if (e) e.preventDefault();
        if (!formName.trim()) {
            showToast?.('Lütfen lezzet adını giriniz.', 'warning');
            return;
        }
        const numPrice = Number(formPrice);
        if (isNaN(numPrice) || numPrice <= 0) {
            showToast?.('Lütfen geçerli bir fiyat giriniz.', 'warning');
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
            showToast?.('Lezzet başarıyla kaydedildi.', 'success');
        } catch (err) {
            console.error('Save error:', err);
            showToast?.('Kaydedilirken hata oluştu.', 'danger');
        }
    };

    // Hızlı Fiyat Kaydet
    const handleSaveInlinePrice = async (p) => {
        const num = Number(editingPriceValue);
        if (isNaN(num) || num <= 0) {
            showToast?.('Geçerli bir tutar giriniz.', 'warning');
            return;
        }
        try {
            await saveMenuItem({ ...p, price: num });
            setEditingPriceId(null);
            showToast?.('Fiyat güncellendi.', 'success');
        } catch (err) {
            console.error('Price error:', err);
            showToast?.('Fiyat güncellenirken hata oluştu.', 'danger');
        }
    };

    // Silme
    const handleDelete = async (p) => {
        const ok = await showConfirm?.({
            title: 'Ürünü Menüden Sil',
            message: `"${p.name}" adlı lezzeti menüden kalıcı olarak silmek istediğinize emin misiniz?`,
            confirmText: 'Evet, Sil',
            cancelText: 'Vazgeç',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            await deleteMenuItem(p.id, p.name);
            showToast?.('Lezzet menüden silindi.', 'info');
        } catch (err) {
            console.error('Delete error:', err);
            showToast?.('Silinirken hata oluştu.', 'danger');
        }
    };

    // Ürün Kartı Render Fonksiyonu (Yeniden kullanılabilir)
    const renderProductCard = (p, groupName, index = 0) => {
        const isOutOfStock = p.active === false;
        const isEditingThisPrice = editingPriceId === p.id;
        const itemTheme = getCategoryTheme(p.category_id);
        const ItemIcon = getCategoryLucideIcon(p.category_id);

        return (
            <div
                key={p.id}
                className={`admin-menu-grid-card ${isOutOfStock ? 'out-of-stock' : ''}`}
            >
                {/* Specular Hairline Top Light Accent */}
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: '12%',
                    right: '12%',
                    height: '1.5px',
                    background: isOutOfStock
                        ? 'linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.6), transparent)'
                        : `linear-gradient(90deg, transparent, ${itemTheme.color}88, transparent)`,
                    pointerEvents: 'none',
                    zIndex: 1
                }} />

                {/* KART ÜSTÜ: BÜYÜK TEMALI AVATAR + BAŞLIK & DURUM ROZETİ + SAĞ AKSİYON BUTONLARI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', position: 'relative', zIndex: 2 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        {/* 42px Lüks İkon Kutusu & Glow Aura */}
                        <div style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: '12px',
                            background: `linear-gradient(135deg, ${itemTheme.color}22, ${itemTheme.color}08)`,
                            border: `1.5px solid ${itemTheme.border}`,
                            color: itemTheme.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: `0 4px 14px ${itemTheme.glow}`
                        }}>
                            <ItemIcon size={20} />
                        </div>

                        <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{
                                fontSize: '15.5px',
                                fontWeight: 800,
                                color: isOutOfStock ? '#a8948e' : '#fffaf5',
                                margin: 0,
                                lineHeight: 1.25,
                                textDecoration: isOutOfStock ? 'line-through' : 'none',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }} title={p.name}>
                                {p.name}
                            </h3>
                            
                            {/* Alt Kategori / Durum Rozeti */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                                <span style={{
                                    fontSize: '10.5px',
                                    fontWeight: 700,
                                    padding: '1.5px 7px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    color: 'var(--text-secondary)',
                                    letterSpacing: '0.2px'
                                }}>
                                    {groupName || 'Menü'}
                                </span>
                                {isOutOfStock ? (
                                    <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: 800,
                                        color: '#ef4444',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        • Servise Kapalı
                                    </span>
                                ) : (
                                    <span style={{
                                        fontSize: '10.5px',
                                        fontWeight: 700,
                                        color: '#10b981',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px'
                                    }}>
                                        • Aktif
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Düzenle & Sil Cam Butonları */}
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                        <button
                            type="button"
                            onClick={() => handleOpenModal(p)}
                            style={{
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '9px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Ürünü Düzenle"
                        >
                            <Pencil size={13.5} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            style={{
                                background: 'rgba(239, 68, 68, 0.07)',
                                border: '1px solid rgba(239, 68, 68, 0.22)',
                                borderRadius: '9px',
                                width: '32px',
                                height: '32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifySelf: 'center',
                                justifyContent: 'center',
                                color: '#f87171',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Ürünü Sil"
                        >
                            <Trash2 size={13.5} />
                        </button>
                    </div>
                </div>

                {/* KART ALTI: İNTERAKTİF FİYAT ROZETİ VE LÜKS STOK DOKUNMATİK BUTONU */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                    paddingTop: '12px',
                    marginTop: '2px',
                    gap: '8px',
                    position: 'relative',
                    zIndex: 2
                }}>
                    {/* Tıklanabilir Hızlı Fiyat / İnline Düzenleme */}
                    {isEditingThisPrice ? (
                        <div
                            key={`edit-${p.id}`}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: '#1c1513',
                                border: '1.5px solid rgba(245, 159, 0, 0.55)',
                                borderRadius: '12px',
                                padding: '3px 4px 3px 10px',
                                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <span style={{
                                color: 'var(--brand-gold)',
                                fontWeight: 900,
                                fontSize: '14px',
                                opacity: 0.85,
                                userSelect: 'none'
                            }}>
                                ₺
                            </span>
                            <input
                                type="text"
                                inputMode="decimal"
                                value={editingPriceValue}
                                onChange={(e) => setEditingPriceValue(e.target.value.replace(/[^0-9.]/g, ''))}
                                autoFocus
                                onFocus={(e) => e.target.select()}
                                placeholder="0"
                                style={{
                                    width: '62px',
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#ffffff',
                                    fontWeight: 900,
                                    fontSize: '14.5px',
                                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    outline: 'none',
                                    padding: '4px 2px',
                                    textAlign: 'left',
                                    letterSpacing: '-0.2px'
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveInlinePrice(p);
                                    else if (e.key === 'Escape') setEditingPriceId(null);
                                }}
                            />
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginLeft: '2px' }}>
                                <button
                                    type="button"
                                    onClick={() => handleSaveInlinePrice(p)}
                                    style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '8px',
                                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                        border: 'none',
                                        color: '#ffffff',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="Fiyatı Kaydet (Enter)"
                                >
                                    <Check size={13} strokeWidth={2.8} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingPriceId(null)}
                                    style={{
                                        width: '26px',
                                        height: '26px',
                                        borderRadius: '8px',
                                        background: 'rgba(255, 255, 255, 0.08)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="Vazgeç (Esc)"
                                >
                                    <X size={13} strokeWidth={2.4} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div
                            key={`view-${p.id}`}
                            onClick={() => {
                                setEditingPriceId(p.id);
                                setEditingPriceValue(String(p.price));
                            }}
                            style={{
                                fontSize: '15px',
                                fontWeight: 900,
                                color: 'var(--brand-gold)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '7px',
                                padding: '5px 12px',
                                borderRadius: '10px',
                                background: 'rgba(245, 159, 0, 0.08)',
                                border: '1px solid rgba(245, 159, 0, 0.28)',
                                fontFamily: "'Plus Jakarta Sans', sans-serif",
                                letterSpacing: '-0.3px',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
                                transition: 'all 0.15s ease'
                            }}
                            title="Fiyatı anında değiştirmek için tıklayın"
                        >
                            <span>{formatMoney(p.price)}</span>
                            <Pencil size={11} style={{ opacity: 0.65 }} />
                        </div>
                    )}

                    {/* Tek Dokunuşla Stok Durumu */}
                    <button
                        type="button"
                        onClick={() => toggleMenuItemAvailability(p.id, p.active !== false)}
                        style={{
                            cursor: 'pointer',
                            background: !isOutOfStock
                                ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.18) 0%, rgba(16, 185, 129, 0.08) 100%)'
                                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.18) 0%, rgba(239, 68, 68, 0.08) 100%)',
                            color: !isOutOfStock ? '#34d399' : '#f87171',
                            border: `1px solid ${!isOutOfStock ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                            borderRadius: '999px',
                            padding: '6px 13px',
                            fontSize: '11.5px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                            boxShadow: !isOutOfStock ? '0 2px 10px rgba(16, 185, 129, 0.18)' : '0 2px 8px rgba(239, 68, 68, 0.15)',
                            transition: 'all 0.18s ease'
                        }}
                        title="Siparişe açık veya tükendi olarak işaretle"
                    >
                        <span style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: !isOutOfStock ? '#10b981' : '#ef4444',
                            boxShadow: !isOutOfStock ? '0 0 8px #10b981' : '0 0 8px #ef4444'
                        }} />
                        {!isOutOfStock ? 'Satışta' : 'Tükendi'}
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* 1. ÜST KPI DASHBOARD (4 METRİK KARTI) */}
            <div className="admin-kpi-grid" style={{ marginBottom: 0 }}>
                {/* 1. KART: TOPLAM LEZZET */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), var(--bg-surface))',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'clamp(14px, 2.5vw, 20px)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Toplam Menü
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-gold)' }}>
                            <UtensilsCrossed size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 900, color: 'var(--brand-gold)', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {menuProducts.length} <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>Lezzet</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 700 }}>
                        {categories.length} aktif kategoride tanımlı
                    </div>
                </div>

                {/* 2. KART: SATIŞA AÇIK */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), var(--bg-surface))',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'clamp(14px, 2.5vw, 20px)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Satışa Açık
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                            <CheckCircle2 size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 900, color: '#10b981', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {activeCount} <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>Aktif</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#10b981', marginTop: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        Garson tabletlerinde siparişe açık
                    </div>
                </div>

                {/* 3. KART: TÜKENDİ / KAPALI */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08), var(--bg-surface))',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'clamp(14px, 2.5vw, 20px)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Tükendi / Kapalı
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                            <XCircle size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 900, color: outOfStockCount > 0 ? '#ef4444' : 'var(--text-muted)', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {outOfStockCount} <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-secondary)' }}>Ürün</span>
                    </div>
                    <div style={{ fontSize: '12px', color: outOfStockCount > 0 ? '#ef4444' : 'var(--text-muted)', marginTop: '6px', fontWeight: 700 }}>
                        {outOfStockCount > 0 ? 'Stokta yok veya servise kapalı' : 'Tüm menü servise hazır'}
                    </div>
                </div>

                {/* 4. KART: ORTALAMA FİYAT */}
                <div style={{
                    background: 'linear-gradient(135deg, rgba(247, 103, 7, 0.08), var(--bg-surface))',
                    border: '1px solid rgba(247, 103, 7, 0.25)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'clamp(14px, 2.5vw, 20px)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'var(--shadow-soft)',
                    transition: 'all 0.2s ease'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Ortalama Fiyat
                        </span>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(247, 103, 7, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--brand-primary)' }}>
                            <Tag size={18} />
                        </div>
                    </div>
                    <div style={{ fontSize: 'clamp(22px, 3.5vw, 30px)', fontWeight: 900, color: 'var(--brand-primary)', letterSpacing: '-0.5px', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {formatMoney(avgPrice)}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px', fontWeight: 700 }}>
                        Porsiyon / lezzet başına ortalama
                    </div>
                </div>
            </div>

            {/* 2. HIZLI ARAMA & FİLTRE ÇUBUĞU */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(28, 21, 20, 0.95), rgba(17, 13, 12, 0.98))',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-card)',
                padding: '14px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: 'var(--shadow-soft)'
            }}>
                {/* Arama Kutusu */}
                <div style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    background: 'rgba(0, 0, 0, 0.45)',
                    border: '1px solid var(--border-card)',
                    borderRadius: '12px',
                    padding: '8px 14px',
                    minWidth: '220px',
                    flex: '1 1 260px',
                    maxWidth: '420px'
                }}>
                    <Search size={16} color="var(--brand-gold)" style={{ flexShrink: 0, marginRight: '10px' }} />
                    <input
                        type="text"
                        placeholder="Lezzet adı veya ürün ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            outline: 'none',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 600,
                            width: '100%'
                        }}
                    />
                    {searchTerm && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: 800,
                                padding: '2px 7px',
                                borderRadius: '8px',
                                background: 'rgba(245, 159, 0, 0.18)',
                                color: 'var(--brand-gold)',
                                whiteSpace: 'nowrap'
                            }}>
                                {filteredProducts.length}
                            </span>
                            <button
                                onClick={() => setSearchTerm('')}
                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                            >
                                <X size={15} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Stok Durum Segmenti & Yeni Lezzet Butonu */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end', flex: '1 1 auto' }}>
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
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
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
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
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
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '11.5px',
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

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleOpenModal(null, selectedCategory !== 'all' ? selectedCategory : null)}
                        className="btn-primary"
                        style={{
                            padding: '9px 18px',
                            fontSize: '13px',
                            fontWeight: 800,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '7px',
                            boxShadow: 'var(--shadow-glow)',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Plus size={16} /> Yeni Lezzet Ekle
                    </motion.button>
                </div>
            </div>

            {/* 3. TELEFON VE TABLET İÇİN DOKUNMATİK KATEGORİ SEÇİCİ TETİKLEYİCİSİ */}
            <div
                className="admin-menu-mobile-picker"
                onClick={() => setIsMobileCategorySheetOpen(true)}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: getCategoryTheme(activeCategoryInfo.id).bg,
                        border: `1px solid ${getCategoryTheme(activeCategoryInfo.id).border}`,
                        color: getCategoryTheme(activeCategoryInfo.id).color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                    }}>
                        {React.createElement(getCategoryLucideIcon(activeCategoryInfo.id), { size: 18 })}
                    </div>
                    <div>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                            Kategori (Dokun & Değiştir)
                        </div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: 'white', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                            {activeCategoryInfo.name}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                        fontSize: '11.5px',
                        fontWeight: 800,
                        padding: '3px 9px',
                        borderRadius: '10px',
                        background: 'rgba(245, 159, 0, 0.15)',
                        color: 'var(--brand-gold)'
                    }}>
                        {activeCategoryInfo.total} Lezzet
                    </span>
                    <div style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-secondary)'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="m6 9 6 6 6-6" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* 4. MASTER-DETAIL SPLIT VIEW (SOL PANEL: KATEGORİLER | SAĞ PANEL: GENİŞ ÜRÜN IZGARASI) */}
            <div className="admin-menu-split-layout">
                {/* SOL PANEL (Kategori Listesi - Masaüstü) */}
                <div className="admin-menu-sidebar">
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px 10px 8px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                        marginBottom: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Layers size={15} color="var(--brand-gold)" />
                            <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                                Kategoriler
                            </span>
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background: 'rgba(245, 159, 0, 0.15)',
                            color: 'var(--brand-gold)'
                        }}>
                            {categories.length}
                        </span>
                    </div>

                    {/* Tüm Kategoriler Butonu */}
                    <motion.button
                        type="button"
                        whileHover={{ x: 4, transition: { duration: 0.15 } }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setSelectedCategory('all')}
                        className={`admin-menu-cat-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                            <div style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '8px',
                                background: selectedCategory === 'all' ? 'rgba(247, 103, 7, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: selectedCategory === 'all' ? 'var(--brand-primary)' : 'var(--text-muted)',
                                flexShrink: 0
                            }}>
                                <UtensilsCrossed size={15} />
                            </div>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                Tüm Lezzetler
                            </span>
                        </div>
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '8px',
                            background: selectedCategory === 'all' ? 'rgba(247, 103, 7, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                            color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)'
                        }}>
                            {menuProducts.length}
                        </span>
                    </motion.button>

                    {/* Her Kategori İçin Buton */}
                    {categories.map(cat => {
                        const isSelected = selectedCategory === cat.id;
                        const stats = categoryStats[cat.id] || { total: 0, active: 0, outOfStock: 0 };
                        const theme = getCategoryTheme(cat.id);
                        const CatIcon = getCategoryLucideIcon(cat.id);

                        return (
                            <motion.button
                                key={cat.id}
                                type="button"
                                whileHover={{ x: 4, transition: { duration: 0.15 } }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={`admin-menu-cat-btn ${isSelected ? 'active' : ''}`}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                                    <div style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '8px',
                                        background: isSelected ? theme.bg : 'rgba(255, 255, 255, 0.05)',
                                        border: `1px solid ${isSelected ? theme.border : 'rgba(255, 255, 255, 0.06)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: isSelected ? theme.color : 'var(--text-secondary)',
                                        flexShrink: 0
                                    }}>
                                        <CatIcon size={15} />
                                    </div>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {cat.name}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    {stats.outOfStock > 0 && (
                                        <span
                                            style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}
                                            title={`${stats.outOfStock} ürün tükendi`}
                                        />
                                    )}
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '2px 7px',
                                        borderRadius: '8px',
                                        background: isSelected ? 'rgba(247, 103, 7, 0.3)' : 'rgba(255, 255, 255, 0.08)',
                                        color: isSelected ? '#ffffff' : 'var(--text-secondary)'
                                    }}>
                                        {stats.total}
                                    </span>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* SAĞ PANEL (Geniş Ürün Izgarası) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
                    {/* Seçili Kategori Başlık Barı (Animasyonlu Geçiş) */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`header-${activeCategoryInfo.id}`}
                            initial={{ opacity: 0, y: -6, filter: 'blur(2px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: 6, filter: 'blur(2px)' }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(28, 21, 20, 0.95), rgba(18, 14, 13, 0.98))',
                                border: '1px solid var(--border-card)',
                                borderRadius: 'var(--radius-lg)',
                                padding: '14px 20px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px',
                                boxShadow: 'var(--shadow-soft)'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <motion.div
                                    key={`icon-${activeCategoryInfo.id}`}
                                    initial={{ scale: 0.8, rotate: -8 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '12px',
                                        background: getCategoryTheme(activeCategoryInfo.id).bg,
                                        border: `1px solid ${getCategoryTheme(activeCategoryInfo.id).border}`,
                                        color: getCategoryTheme(activeCategoryInfo.id).color,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: `0 4px 14px ${getCategoryTheme(activeCategoryInfo.id).glow}`
                                    }}
                                >
                                    {React.createElement(getCategoryLucideIcon(activeCategoryInfo.id), { size: 20 })}
                                </motion.div>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 900, color: 'white', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        {activeCategoryInfo.name}
                                    </h2>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>
                                            {filteredProducts.length} lezzet listeleniyor
                                        </span>
                                        {activeCategoryInfo.outOfStock > 0 ? (
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '1px 7px', borderRadius: '8px' }}>
                                                {activeCategoryInfo.outOfStock} Tükendi
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '1px 7px', borderRadius: '8px' }}>
                                                Tümü Satışta
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => handleOpenModal(null, selectedCategory !== 'all' ? selectedCategory : null)}
                                style={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.12)',
                                    color: '#ffffff',
                                    padding: '8px 16px',
                                    borderRadius: '10px',
                                    fontSize: '12px',
                                    fontWeight: 800,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    transition: 'all 0.15s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = 'rgba(247, 103, 7, 0.15)';
                                    e.currentTarget.style.color = 'var(--brand-primary)';
                                    e.currentTarget.style.borderColor = 'rgba(247, 103, 7, 0.35)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    e.currentTarget.style.color = '#ffffff';
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                                }}
                            >
                                <Plus size={14} /> Bu Kategoriye Ekle
                            </motion.button>
                        </motion.div>
                    </AnimatePresence>

                    {/* Lezzet Kartları Izgarası */}
                    <div
                        key={`content-${selectedCategory}_${statusFilter}_${searchTerm ? 's' : 'all'}`}
                        style={{ width: '100%' }}
                    >
                            {selectedCategory === 'all' ? (
                                /* Tüm Kategoriler Seçiliyse: Şık Kategori Grupları ile Açık Izgara */
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                    {groupedCategories.map((group, groupIdx) => {
                                        const GroupIcon = getCategoryLucideIcon(group.id);
                                        const theme = getCategoryTheme(group.id);

                                        return (
                                            <div
                                                key={group.id}
                                                style={{
                                                    background: 'var(--bg-surface)',
                                                    border: '1px solid var(--border-card)',
                                                    borderRadius: 'var(--radius-lg)',
                                                    padding: '16px 20px',
                                                    boxShadow: 'var(--shadow-soft)'
                                                }}
                                            >
                                                {/* Kategori Alt Başlığı */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                                                    <div
                                                        onClick={() => setSelectedCategory(group.id)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                                                        title="Bu kategoriye odaklanmak için tıklayın"
                                                    >
                                                        <div style={{
                                                            width: '32px',
                                                            height: '32px',
                                                            borderRadius: '8px',
                                                            background: theme.bg,
                                                            border: `1px solid ${theme.border}`,
                                                            color: theme.color,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center'
                                                        }}>
                                                            <GroupIcon size={16} />
                                                        </div>
                                                        <span style={{ fontSize: '16px', fontWeight: 900, color: '#ffffff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                                            {group.name}
                                                        </span>
                                                        <span style={{ fontSize: '11px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.08)', color: 'var(--text-secondary)' }}>
                                                            {group.items.length} çeşit
                                                        </span>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenModal(null, group.id)}
                                                        style={{
                                                            background: 'transparent',
                                                            border: 'none',
                                                            color: 'var(--brand-gold)',
                                                            fontSize: '11.5px',
                                                            fontWeight: 800,
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '4px'
                                                        }}
                                                    >
                                                        <Plus size={13} /> Ekle
                                                    </button>
                                                </div>

                                                {/* Kartlar */}
                                                <div style={{
                                                    display: 'grid',
                                                    gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
                                                    gap: '14px'
                                                }}>
                                                    {group.items.map((p, idx) => renderProductCard(p, group.name, idx))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Tekil Bir Kategori Seçiliyse: Doğrudan Geniş Izgara */
                                <div>
                                    {filteredProducts.length === 0 ? (
                                        <div
                                            style={{
                                                background: 'var(--bg-surface)',
                                                borderRadius: 'var(--radius-lg)',
                                                border: '1px dashed var(--border-card)',
                                                padding: '48px 24px',
                                                textAlign: 'center',
                                                color: 'var(--text-muted)'
                                            }}
                                        >
                                            <UtensilsCrossed size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                            <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'white', margin: '0 0 6px 0' }}>
                                                Bu kategoride lezzet bulunamadı
                                            </h4>
                                            <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>
                                                Bu kategoriye ilk lezzeti hemen ekleyebilirsiniz.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenModal(null, selectedCategory)}
                                                className="btn-primary"
                                                style={{ padding: '8px 18px', fontSize: '12px' }}
                                            >
                                                <Plus size={14} style={{ marginRight: '6px' }} /> Bu Kategoriye Lezzet Ekle
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 250px), 1fr))',
                                            gap: '14px'
                                        }}>
                                            {filteredProducts.map((p, idx) => renderProductCard(p, activeCategoryInfo.name, idx))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
            </div>

            {/* 4. LEZZET EKLEME / DÜZENLEME MODALI (21st.dev & Motion Tasarımı) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showModal && (
                        <motion.div
                            key="admin-menu-modal-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.78)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 2600,
                                padding: '16px'
                            }}
                            onClick={() => setShowModal(false)}
                        >
                            {(() => {
                                const currentTheme = getCategoryTheme(formCategory);
                                const CurrentIcon = getCategoryLucideIcon(formCategory);

                                return (
                                    <motion.div
                                        key="admin-menu-modal-card"
                                        initial={{ opacity: 0, scale: 0.93, y: 18 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 12 }}
                                        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            position: 'relative',
                                            background: `radial-gradient(ellipse 480px 220px at 50% -20px, ${currentTheme.color}20 0%, transparent 75%), linear-gradient(165deg, rgba(28, 20, 18, 0.98) 0%, rgba(16, 12, 11, 0.99) 100%)`,
                                            border: '1px solid rgba(255, 255, 255, 0.12)',
                                            borderRadius: '24px',
                                            width: '100%',
                                            maxWidth: '490px',
                                            maxHeight: '90vh',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            boxShadow: `0 28px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${currentTheme.glow}`,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {/* Specular Hairline (Dinamik Kategori Işığı) */}
                                        <div style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: '12%',
                                            right: '12%',
                                            height: '2px',
                                            background: `linear-gradient(90deg, transparent, ${currentTheme.color}, transparent)`,
                                            pointerEvents: 'none',
                                            zIndex: 3
                                        }} />

                                        {/* MODAL BAŞLIK ALANI */}
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '20px 24px 16px 24px',
                                            borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
                                            position: 'relative',
                                            zIndex: 2
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                                <motion.div
                                                    key={`modal-icon-${formCategory}`}
                                                    initial={{ scale: 0.75, rotate: -10 }}
                                                    animate={{ scale: 1, rotate: 0 }}
                                                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                                                    style={{
                                                        width: '42px',
                                                        height: '42px',
                                                        borderRadius: '13px',
                                                        background: currentTheme.bg,
                                                        border: `1.5px solid ${currentTheme.border}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: currentTheme.color,
                                                        boxShadow: `0 4px 16px ${currentTheme.glow}`
                                                    }}
                                                >
                                                    <CurrentIcon size={20} />
                                                </motion.div>
                                                <div>
                                                    <h3 style={{
                                                        fontSize: '18px',
                                                        fontWeight: 900,
                                                        color: '#ffffff',
                                                        margin: 0,
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                        letterSpacing: '-0.3px'
                                                    }}>
                                                        {editingProduct ? 'Lezzeti Düzenle' : 'Yeni Lezzet Ekle'}
                                                    </h3>
                                                    <p style={{
                                                        fontSize: '12px',
                                                        color: 'var(--text-muted)',
                                                        margin: '2px 0 0 0',
                                                        fontWeight: 500
                                                    }}>
                                                        {editingProduct ? 'Ürün detaylarını ve fiyatlandırmayı güncelleyin' : 'Menünüze yepyeni bir lezzet dahil edin'}
                                                    </p>
                                                </div>
                                            </div>

                                            <motion.button
                                                whileHover={{ rotate: 90, scale: 1.05, backgroundColor: 'rgba(255, 255, 255, 0.12)' }}
                                                whileTap={{ scale: 0.92 }}
                                                type="button"
                                                onClick={() => setShowModal(false)}
                                                style={{
                                                    width: '34px',
                                                    height: '34px',
                                                    borderRadius: '10px',
                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    color: 'var(--text-secondary)',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    transition: 'all 0.15s ease'
                                                }}
                                                title="Pencereyi Kapat"
                                            >
                                                <X size={16} />
                                            </motion.button>
                                        </div>

                                        {/* MODAL FORMU */}
                                        <form
                                            onSubmit={handleSaveForm}
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '16px',
                                                padding: '20px 24px',
                                                overflowY: 'auto',
                                                flex: 1
                                            }}
                                            className="modal-category-grid"
                                        >
                                            {/* 1. ÜRÜN ADI */}
                                            <div>
                                                <label style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '11px',
                                                    fontWeight: 800,
                                                    color: 'var(--text-secondary)',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.5px',
                                                    marginBottom: '7px'
                                                }}>
                                                    <Tag size={12} color="var(--brand-gold)" /> Lezzet / Ürün Adı
                                                </label>
                                                <div className="admin-modal-input" style={{
                                                    background: 'rgba(0, 0, 0, 0.4)',
                                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                                    borderRadius: '13px',
                                                    padding: '2px 14px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    transition: 'all 0.18s ease'
                                                }}>
                                                    <input
                                                        type="text"
                                                        value={formName}
                                                        onChange={(e) => setFormName(e.target.value)}
                                                        placeholder="Örn: Kuymak, Serpme Kahvaltı, Kaşarlı Tost..."
                                                        required
                                                        style={{
                                                            width: '100%',
                                                            background: 'transparent',
                                                            border: 'none',
                                                            padding: '10px 0',
                                                            color: '#ffffff',
                                                            fontSize: '14.5px',
                                                            fontWeight: 700,
                                                            outline: 'none',
                                                            fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* 2. SATIŞ FİYATI & HIZLI AYAR BUTONLARI */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '7px' }}>
                                                    <label style={{
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        color: 'var(--text-secondary)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        Satış Fiyatı (₺)
                                                    </label>
                                                    {/* Hızlı Tutar Ekleme */}
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                        {[10, 25, 50, 100].map(addVal => (
                                                            <button
                                                                key={addVal}
                                                                type="button"
                                                                onClick={() => {
                                                                    const cur = Number(formPrice) || 0;
                                                                    setFormPrice(String(cur + addVal));
                                                                }}
                                                                style={{
                                                                    background: 'rgba(255, 255, 255, 0.05)',
                                                                    border: '1px solid rgba(255, 255, 255, 0.08)',
                                                                    borderRadius: '6px',
                                                                    color: 'var(--text-secondary)',
                                                                    fontSize: '10.5px',
                                                                    fontWeight: 800,
                                                                    padding: '2px 6px',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.color = 'var(--brand-gold)';
                                                                    e.currentTarget.style.borderColor = 'rgba(245, 159, 0, 0.35)';
                                                                    e.currentTarget.style.background = 'rgba(245, 159, 0, 0.12)';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.color = 'var(--text-secondary)';
                                                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                                                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                                                }}
                                                            >
                                                                +{addVal}₺
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="admin-modal-input" style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    background: 'rgba(0, 0, 0, 0.45)',
                                                    border: '1px solid rgba(245, 159, 0, 0.3)',
                                                    borderRadius: '13px',
                                                    padding: '6px 14px',
                                                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
                                                    transition: 'all 0.18s ease'
                                                }}>
                                                    <div style={{
                                                        background: 'linear-gradient(135deg, rgba(245, 159, 0, 0.2), rgba(245, 159, 0, 0.06))',
                                                        border: '1px solid rgba(245, 159, 0, 0.35)',
                                                        borderRadius: '8px',
                                                        width: '32px',
                                                        height: '32px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'var(--brand-gold)',
                                                        fontWeight: 900,
                                                        fontSize: '17px',
                                                        marginRight: '12px',
                                                        flexShrink: 0
                                                    }}>
                                                        ₺
                                                    </div>
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
                                                            fontSize: '19px',
                                                            fontWeight: 900,
                                                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                                                            outline: 'none',
                                                            letterSpacing: '-0.3px'
                                                        }}
                                                    />
                                                    {formPrice && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormPrice('')}
                                                            style={{
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: 'var(--text-muted)',
                                                                cursor: 'pointer',
                                                                padding: '4px',
                                                                display: 'flex',
                                                                alignItems: 'center'
                                                            }}
                                                            title="Fiyatı temizle"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* 3. KATEGORİ SEÇİMİ (ŞIK VE AKICI KART IZGARASI - NO UGLY SCROLLBAR) */}
                                            <div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                    <label style={{
                                                        fontSize: '11px',
                                                        fontWeight: 800,
                                                        color: 'var(--text-secondary)',
                                                        textTransform: 'uppercase',
                                                        letterSpacing: '0.5px'
                                                    }}>
                                                        Kategori Seçimi
                                                    </label>
                                                    <span style={{ fontSize: '11px', color: currentTheme.color, fontWeight: 700 }}>
                                                        {categories.find(c => c.id === formCategory)?.name || ''} seçili
                                                    </span>
                                                </div>

                                                <div
                                                    className="modal-category-grid"
                                                    style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(2, 1fr)',
                                                        gap: '8px',
                                                        maxHeight: '175px',
                                                        overflowY: 'auto',
                                                        padding: '4px 3px 4px 1px'
                                                    }}
                                                >
                                                    {categories.map(c => {
                                                        const isSelected = formCategory === c.id;
                                                        const CatIcon = getCategoryLucideIcon(c.id);
                                                        const cTheme = getCategoryTheme(c.id);

                                                        return (
                                                            <motion.button
                                                                key={c.id}
                                                                type="button"
                                                                whileHover={{ scale: 1.015 }}
                                                                whileTap={{ scale: 0.97 }}
                                                                onClick={() => setFormCategory(c.id)}
                                                                style={{
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '9px',
                                                                    padding: '8px 10px',
                                                                    borderRadius: '11px',
                                                                    border: isSelected ? `1.5px solid ${cTheme.border}` : '1px solid rgba(255, 255, 255, 0.08)',
                                                                    background: isSelected ? `linear-gradient(135deg, ${cTheme.color}22 0%, ${cTheme.color}0a 100%)` : 'rgba(255, 255, 255, 0.03)',
                                                                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                                                    cursor: 'pointer',
                                                                    textAlign: 'left',
                                                                    boxShadow: isSelected ? `0 4px 14px ${cTheme.glow}` : 'none',
                                                                    transition: 'all 0.15s ease'
                                                                }}
                                                            >
                                                                <div style={{
                                                                    width: '28px',
                                                                    height: '28px',
                                                                    borderRadius: '8px',
                                                                    background: isSelected ? cTheme.color : 'rgba(255, 255, 255, 0.05)',
                                                                    color: isSelected ? '#ffffff' : cTheme.color,
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    flexShrink: 0
                                                                }}>
                                                                    <CatIcon size={14} />
                                                                </div>
                                                                <span style={{
                                                                    fontSize: '12.5px',
                                                                    fontWeight: isSelected ? 800 : 600,
                                                                    flex: 1,
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap'
                                                                }}>
                                                                    {c.name}
                                                                </span>
                                                                {isSelected && (
                                                                    <Check size={14} color={cTheme.color} style={{ flexShrink: 0 }} />
                                                                )}
                                                            </motion.button>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* 4. SİPARİŞ DURUMU (21st.dev Taktil iOS Switch Kartı) */}
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 14px',
                                                background: formActive
                                                    ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.02) 100%)'
                                                    : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0.02) 100%)',
                                                borderRadius: '13px',
                                                border: `1px solid ${formActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                                transition: 'all 0.2s ease'
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div style={{
                                                        width: '32px',
                                                        height: '32px',
                                                        borderRadius: '9px',
                                                        background: formActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                                        border: `1px solid ${formActive ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: formActive ? '#34d399' : '#f87171'
                                                    }}>
                                                        {formActive ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                                                    </div>
                                                    <div>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#ffffff' }}>
                                                                {formActive ? 'Siparişe Açık' : 'Tükendi (Servise Kapalı)'}
                                                            </span>
                                                            <span style={{
                                                                fontSize: '10px',
                                                                fontWeight: 800,
                                                                padding: '1px 6px',
                                                                borderRadius: '5px',
                                                                background: formActive ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                                                color: formActive ? '#34d399' : '#f87171'
                                                            }}>
                                                                {formActive ? 'Satışta' : 'Kapalı'}
                                                            </span>
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            {formActive ? 'Garson tabletlerinde siparişe açıktır' : 'Garson tabletlerinde tükendi olarak kilitlenir'}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Taktil iOS Switch Toggle */}
                                                <motion.button
                                                    type="button"
                                                    whileTap={{ scale: 0.92 }}
                                                    onClick={() => setFormActive(!formActive)}
                                                    style={{
                                                        width: '48px',
                                                        height: '26px',
                                                        borderRadius: '999px',
                                                        background: formActive
                                                            ? 'linear-gradient(90deg, #10b981, #059669)'
                                                            : 'rgba(255, 255, 255, 0.14)',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: '3px',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: formActive ? 'flex-end' : 'flex-start',
                                                        boxShadow: formActive ? '0 0 12px rgba(16, 185, 129, 0.45)' : 'none',
                                                        transition: 'background 0.2s ease',
                                                        flexShrink: 0
                                                    }}
                                                    title="Sipariş durumunu değiştir"
                                                >
                                                    <motion.div
                                                        layout
                                                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                        style={{
                                                            width: '20px',
                                                            height: '20px',
                                                            borderRadius: '50%',
                                                            background: '#ffffff',
                                                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                                                        }}
                                                    />
                                                </motion.button>
                                            </div>

                                            {/* 5. MODAL BUTONLARI (LÜKS AYAK) */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                alignItems: 'center',
                                                gap: '10px',
                                                paddingTop: '10px',
                                                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
                                            }}>
                                                <motion.button
                                                    whileHover={{ scale: 1.02, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                                                    whileTap={{ scale: 0.97 }}
                                                    type="button"
                                                    onClick={() => setShowModal(false)}
                                                    style={{
                                                        padding: '10px 18px',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        background: 'rgba(255, 255, 255, 0.04)',
                                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                                        borderRadius: '11px',
                                                        color: 'var(--text-secondary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease'
                                                    }}
                                                >
                                                    Vazgeç
                                                </motion.button>
                                                <motion.button
                                                    whileHover={{ scale: 1.02, boxShadow: '0 8px 24px rgba(247, 103, 7, 0.4)' }}
                                                    whileTap={{ scale: 0.97 }}
                                                    type="submit"
                                                    style={{
                                                        padding: '10px 22px',
                                                        fontSize: '13px',
                                                        fontWeight: 800,
                                                        background: 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)',
                                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                                        borderRadius: '11px',
                                                        color: '#ffffff',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 16px rgba(247, 103, 7, 0.3)',
                                                        transition: 'all 0.15s ease',
                                                        fontFamily: "'Plus Jakarta Sans', sans-serif"
                                                    }}
                                                >
                                                    {editingProduct ? 'Değişiklikleri Kaydet' : 'Lezzeti Menüye Ekle'}
                                                </motion.button>
                                            </div>
                                        </form>
                                    </motion.div>
                                );
                            })()}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* 5. TELEFON İÇİN KATEGORİ BOTTOM SHEET (AŞAĞIDAN AÇILIR LÜKS PANEL) */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {isMobileCategorySheetOpen && (
                        <motion.div
                            key="mobile-category-sheet-backdrop"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{
                                position: 'fixed',
                                inset: 0,
                                background: 'rgba(0, 0, 0, 0.78)',
                                backdropFilter: 'blur(10px)',
                                WebkitBackdropFilter: 'blur(10px)',
                                display: 'flex',
                                alignItems: 'flex-end',
                                justifyContent: 'center',
                                zIndex: 2700
                            }}
                            onClick={() => setIsMobileCategorySheetOpen(false)}
                        >
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'linear-gradient(170deg, rgba(28, 20, 18, 0.99) 0%, rgba(16, 12, 11, 1) 100%)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            width: '100%',
                            maxWidth: '520px',
                            maxHeight: '82vh',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 -20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(247, 103, 7, 0.15)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Tutma Çubuğu (Drag Pill) */}
                        <div style={{ padding: '12px 0 6px 0', display: 'flex', justifyContent: 'center' }}>
                            <div style={{ width: '40px', height: '4.5px', borderRadius: '999px', background: 'rgba(255, 255, 255, 0.25)' }} />
                        </div>

                        {/* Başlık ve Kapat Butonu */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 20px 14px 20px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    width: '34px',
                                    height: '34px',
                                    borderRadius: '10px',
                                    background: 'rgba(247, 103, 7, 0.15)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--brand-primary)'
                                }}>
                                    <Layers size={17} />
                                </div>
                                <div>
                                    <h3 style={{ fontSize: '16.5px', fontWeight: 900, color: 'white', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                                        Kategori Seçin
                                    </h3>
                                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
                                        Listelemek istediğiniz lezzet grubuna dokunun
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsMobileCategorySheetOpen(false)}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '8px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    color: 'var(--text-muted)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Kategori Listesi (Büyük Dokunmatik Hedefler) */}
                        <div style={{
                            padding: '12px 16px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            paddingBottom: 'max(24px, env(safe-area-inset-bottom, 24px))'
                        }}>
                            {/* Tüm Lezzetler Seçeneği */}
                            <motion.button
                                type="button"
                                whileTap={{ scale: 0.97 }}
                                onClick={() => {
                                    setSelectedCategory('all');
                                    setIsMobileCategorySheetOpen(false);
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px 14px',
                                    borderRadius: '14px',
                                    border: selectedCategory === 'all' ? '1px solid var(--brand-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                                    background: selectedCategory === 'all' ? 'linear-gradient(135deg, rgba(247, 103, 7, 0.22) 0%, rgba(245, 159, 0, 0.1) 100%)' : 'rgba(255, 255, 255, 0.03)',
                                    color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    minHeight: '48px',
                                    transition: 'all 0.15s ease'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '34px',
                                        height: '34px',
                                        borderRadius: '10px',
                                        background: selectedCategory === 'all' ? 'rgba(247, 103, 7, 0.3)' : 'rgba(255, 255, 255, 0.06)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: selectedCategory === 'all' ? 'var(--brand-primary)' : 'var(--text-muted)'
                                    }}>
                                        <UtensilsCrossed size={17} />
                                    </div>
                                    <span style={{ fontSize: '14.5px', fontWeight: 800 }}>Tüm Lezzetler</span>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '11.5px',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '8px',
                                        background: selectedCategory === 'all' ? 'rgba(247, 103, 7, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                                        color: selectedCategory === 'all' ? '#ffffff' : 'var(--text-secondary)'
                                    }}>
                                        {menuProducts.length}
                                    </span>
                                    {selectedCategory === 'all' && <Check size={16} color="var(--brand-primary)" />}
                                </div>
                            </motion.button>

                            {/* Kategoriler */}
                            {categories.map(cat => {
                                const isSelected = selectedCategory === cat.id;
                                const stats = categoryStats[cat.id] || { total: 0, active: 0, outOfStock: 0 };
                                const theme = getCategoryTheme(cat.id);
                                const CatIcon = getCategoryLucideIcon(cat.id);

                                return (
                                    <motion.button
                                        key={cat.id}
                                        type="button"
                                        whileTap={{ scale: 0.97 }}
                                        onClick={() => {
                                            setSelectedCategory(cat.id);
                                            setIsMobileCategorySheetOpen(false);
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '12px 14px',
                                            borderRadius: '14px',
                                            border: isSelected ? `1px solid ${theme.border}` : '1px solid rgba(255, 255, 255, 0.08)',
                                            background: isSelected ? 'linear-gradient(135deg, rgba(247, 103, 7, 0.18) 0%, rgba(245, 159, 0, 0.08) 100%)' : 'rgba(255, 255, 255, 0.03)',
                                            color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                                            cursor: 'pointer',
                                            minHeight: '48px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '34px',
                                                height: '34px',
                                                borderRadius: '10px',
                                                background: theme.bg,
                                                border: `1px solid ${theme.border}`,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: theme.color
                                            }}>
                                                <CatIcon size={17} />
                                            </div>
                                            <span style={{ fontSize: '14.5px', fontWeight: 800 }}>{cat.name}</span>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {stats.outOfStock > 0 && (
                                                <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#ef4444', background: 'rgba(239, 68, 68, 0.12)', padding: '1px 6px', borderRadius: '6px' }}>
                                                    {stats.outOfStock} kapalı
                                                </span>
                                            )}
                                            <span style={{
                                                fontSize: '11.5px',
                                                fontWeight: 800,
                                                padding: '2px 8px',
                                                borderRadius: '8px',
                                                background: isSelected ? 'rgba(247, 103, 7, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                                                color: isSelected ? '#ffffff' : 'var(--text-secondary)'
                                            }}>
                                                {stats.total}
                                            </span>
                                            {isSelected && <Check size={16} color="var(--brand-primary)" />}
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}
