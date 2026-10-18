import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    MoveHorizontal,
    Scissors,
    X,
    Zap,
    Clock,
    CheckCircle2,
    Check,
    Flame,
    Utensils,
    MessageSquare,
    Minus,
    Plus,
    Trash2,
    Tag,
    Printer,
    Banknote,
    CreditCard,
    Receipt,
    ArrowUpRight
} from 'lucide-react';
import { formatMoney } from '../data/menu';

/**
 * LiveOrderDrawer (Canlı Adisyon Çekmecesi & Sağ Panel)
 * 21st / Framer Motion standartlarında tekil, ortak Canlı Adisyon bileşeni.
 * AdminView, WaiterView (drawer/slide-over) ve TableDetailView (sidebar/mobile-drawer)
 * tarafından ortak kullanılır.
 */
export default function LiveOrderDrawer({
    isOpen = true,
    mode = 'drawer', // 'drawer' (overlay) | 'sidebar' (split layout)
    tableNo,
    order = null,
    currentUser = null,
    isTableDetail = false,
    onClose,
    onMove,
    onSplit,
    onToggleItemStatus,
    onDeliverAll,
    onUpdateQuantity,
    onAddNote,
    onNavigateToTable,
    onQuickAmount,
    onOpenDiscount,
    onRemoveDiscount,
    onPrintKitchen,
    onPrintCustomerBill,
    onCheckout
}) {
    if (!isOpen && mode === 'drawer') return null;

    const items = order?.items || [];
    const cookingItems = items.filter(i => i.status !== 'delivered');
    const deliveredItems = items.filter(i => i.status === 'delivered');
    const cookingCount = cookingItems.length;
    const deliveredCount = deliveredItems.length;
    const totalCount = items.length;
    const progressPct = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0;

    const orderSubtotal = Number(order?.subtotal || order?.total || 0);
    const orderDiscount = Number(order?.discount || 0);
    const orderTotal = Number(order?.total || 0);

    // Sorumlu personel ismi & avatar harfi
    const rawWaiterName = (order?.waiter_name || currentUser?.name || '').trim();
    const cleanWaiterName = rawWaiterName.replace(/\(Patron\)/gi, '').replace(/\(Yönetici\)/gi, '').trim() || 'Garson';
    const waiterInitial = (cleanWaiterName || 'G').charAt(0).toUpperCase();
    const isBossOrAdmin = rawWaiterName.toLowerCase().includes('patron') || rawWaiterName.toLowerCase().includes('yönetici');

    // Drawer İçeriği
    const drawerContent = (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
            {/* Ambient Top Glow Line */}
            <div style={{
                position: 'absolute',
                top: 0,
                left: '10%',
                right: '10%',
                height: '2px',
                background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.7), transparent)',
                opacity: 0.8,
                zIndex: 2,
                pointerEvents: 'none'
            }} />

            {/* Mobil Sürükleme / Kapatma Çizgisi */}
            <div
                className={mode === 'drawer' ? 'admin-drawer-drag-pill' : 'drawer-drag-pill'}
                onClick={onClose}
                title="Kapat"
            />

            {/* Header: CANLI ADİSYON Badge, Masa No, Taşı, Böl, Kapat */}
            <div className="receipt-header-unified">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <div>
                            <div className="modern-receipt-badge" style={{ marginBottom: '2px' }}>
                                <span className="live-pulse-dot is-amber" style={{ width: '6px', height: '6px' }} />
                                <span>CANLI ADİSYON</span>
                            </div>
                            <h2 className="receipt-table-title" style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px', margin: 0, color: '#FFFFFF' }}>
                                Masa {tableNo}
                            </h2>
                        </div>

                        {/* Mobile Waiter Inline Badge */}
                        <div className="receipt-waiter-inline-mobile">
                            <span className="waiter-mini-avatar">{waiterInitial}</span>
                            <span className="waiter-mini-name">{cleanWaiterName}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {onMove && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="receipt-action-btn"
                                onClick={onMove}
                                title="Masayı Başka Masaya Taşı"
                            >
                                <MoveHorizontal size={13} />
                                <span>Taşı</span>
                            </motion.button>
                        )}


                        {onSplit && (
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="receipt-action-btn"
                                onClick={onSplit}
                                title="Hesabı Parçalı / Ayrı Böl"
                            >
                                <Scissors size={13} />
                                <span>Böl</span>
                            </motion.button>
                        )}

                        {onClose && (
                            <motion.button
                                whileHover={{ rotate: 90, scale: 1.08 }}
                                whileTap={{ scale: 0.92 }}
                                className="receipt-close-btn"
                                onClick={onClose}
                                title="Adisyonu Kapat (ESC)"
                            >
                                <X size={16} />
                            </motion.button>
                        )}
                    </div>
                </div>

                {/* Sorumlu Garson Bento Capsule (Desktop Reference 1) */}
                <div className="receipt-waiter-bento receipt-waiter-desktop">
                    <div className="receipt-waiter-bento-left">
                        <div className="receipt-waiter-avatar">
                            {waiterInitial}
                        </div>
                        <div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.2px' }}>
                                Sorumlu Personel
                            </div>
                            <div style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700 }}>
                                {cleanWaiterName}
                            </div>
                        </div>
                    </div>
                    <div className="receipt-waiter-name-pill">
                        {isBossOrAdmin ? 'Yönetici Masası' : 'Garson Masası'}
                    </div>
                </div>
            </div>

            {/* Ürün Listesi VEYA Boş Adisyon Durumu */}
            <div className="receipt-items-list" style={{ flex: 1, overflowY: 'auto', padding: '14px 18px' }}>
                {totalCount === 0 ? (
                    <div style={{
                        height: '100%',
                        minHeight: '260px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '24px 16px',
                        boxSizing: 'border-box'
                    }}>
                        {/* Ready Pill Badge */}
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 12px',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            border: '1px solid rgba(16, 185, 129, 0.28)',
                            color: '#34d399',
                            fontSize: '11px',
                            fontWeight: 800,
                            letterSpacing: '0.4px',
                            marginBottom: '10px'
                        }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                            <span>MASA {tableNo} • SİPARİŞE HAZIR</span>
                        </div>

                        <h3 style={{ fontSize: '17px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0', letterSpacing: '-0.2px' }}>
                            Adisyon Henüz Boş
                        </h3>
                        <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.55)', maxWidth: '260px', lineHeight: '1.45', margin: '0 0 20px 0' }}>
                            {isTableDetail
                                ? 'Soldaki menüden lezzetleri tıklayarak masaya sipariş eklemeye başlayın.'
                                : 'Bu masada henüz aktif sipariş veya ürün bulunmuyor.'}
                        </p>

                        {/* Masa Genel Görünümünden açıldıysa: Masaya Git ve Sipariş Aç butonu */}
                        {!isTableDetail && onNavigateToTable && (
                            <motion.button
                                whileHover={{ scale: 1.025, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                style={{
                                    width: '100%',
                                    maxWidth: '300px',
                                    minHeight: '48px',
                                    padding: '12px 18px',
                                    fontSize: '13.5px',
                                    fontWeight: 800,
                                    borderRadius: '13px',
                                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 55%, #c2410c 100%)',
                                    border: '1px solid rgba(255, 255, 255, 0.22)',
                                    color: '#FFFFFF',
                                    boxShadow: '0 8px 24px -4px rgba(234, 88, 12, 0.45)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: 'pointer',
                                    marginBottom: '10px'
                                }}
                                onClick={() => onNavigateToTable(tableNo)}
                            >
                                <span>Masaya Git ve Sipariş Aç</span>
                                <ArrowUpRight size={16} />
                            </motion.button>
                        )}

                        {/* Hızlı Ödeme Al (21st Amber Frosted Glass) */}
                        {onQuickAmount && (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={onQuickAmount}
                                style={{
                                    width: '100%',
                                    maxWidth: '300px',
                                    minHeight: '44px',
                                    padding: '10px 16px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    borderRadius: '12px',
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    border: '1px solid rgba(245, 158, 11, 0.28)',
                                    color: '#fbbf24',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '7px',
                                    cursor: 'pointer',
                                    marginBottom: '16px'
                                }}
                            >
                                <Zap size={15} />
                                <span>Hızlı Ödeme Al</span>
                            </motion.button>
                        )}

                        {/* 21st Shortcut Tip Card */}
                        <div style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '12px 14px',
                            borderRadius: '14px',
                            background: 'linear-gradient(145deg, rgba(38, 28, 26, 0.6) 0%, rgba(22, 16, 15, 0.8) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            textAlign: 'left'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#fbbf24', marginBottom: '4px' }}>
                                <Zap size={12} />
                                <span>Hızlı İşlem İpucu</span>
                            </div>
                            <p style={{ fontSize: '11.5px', color: 'rgba(255, 255, 255, 0.6)', margin: 0, lineHeight: 1.4 }}>
                                Menü seçmeden masayı doğrudan tutarla kapatmak için yukarıdaki <strong>Hızlı Ödeme Al</strong> butonunu kullanabilirsiniz.
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Teslim Durumu Telemetri Özeti & Hızlı Toplu Teslim */}
                        <div className="receipt-telemetry-card">
                            <div className="receipt-telemetry-row">
                                <div className="receipt-status-chip is-cooking" title={`${cookingCount} ürün mutfakta hazırlanıyor`}>
                                    <Clock size={11} style={{ flexShrink: 0 }} />
                                    <span><strong>{cookingCount}</strong> Hazırlanıyor</span>
                                </div>
                                <div className="receipt-status-chip is-delivered" title={`${deliveredCount} ürün masaya teslim edildi`}>
                                    <CheckCircle2 size={11} style={{ flexShrink: 0 }} />
                                    <span><strong>{deliveredCount}</strong> Teslim</span>
                                </div>

                                {cookingCount > 0 && onDeliverAll && (
                                    <motion.button
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        onClick={onDeliverAll}
                                        className="receipt-telemetry-deliver-btn"
                                        title="Tüm hazırlananları tek tıkla teslim edildi yap"
                                    >
                                        <Check size={11} style={{ flexShrink: 0 }} />
                                        <span>Tümünü Teslim</span>
                                    </motion.button>
                                )}
                            </div>

                            {/* Teslimat İlerleme Çubuğu */}
                            <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                                <motion.div
                                    style={{
                                        height: '100%',
                                        background: 'linear-gradient(90deg, #f59e0b, #10b981)',
                                        borderRadius: '999px',
                                        boxShadow: '0 0 10px rgba(16, 185, 129, 0.5)'
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPct}%` }}
                                    transition={{ duration: 0.35, ease: 'easeOut' }}
                                />
                            </div>
                        </div>

                        {/* 1. GRUP: MUTFAKTA HAZIRLANAN / PİŞEN ÜRÜNLER */}
                        {cookingCount > 0 && (
                            <div style={{ marginBottom: '14px' }}>
                                <div className="receipt-group-header is-cooking">
                                    <Flame size={13} />
                                    <span>MUTFAKTA HAZIRLANIYOR ({cookingCount})</span>
                                </div>
                                {items.map((item, idx) => {
                                    if (item.status === 'delivered') return null;
                                    return (
                                        <motion.div
                                            key={item.id || idx}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="receipt-item-card-21 pending"
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                    <div className="receipt-dish-icon-box">
                                                        <Utensils size={15} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#FFFFFF', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--brand-gold)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', textWrap: 'nowrap', flexWrap: 'nowrap' }}>
                                                            <span style={{ fontWeight: 800, flexShrink: 0 }}>{formatMoney(Number(item.price) * Number(item.quantity || 1))}</span>
                                                            <span className="receipt-item-qty-badge">{item.quantity || 1}&nbsp;Adet</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {onToggleItemStatus && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => onToggleItemStatus(idx)}
                                                        className="receipt-status-chip is-cooking cursor-pointer"
                                                        style={{ border: '1px solid rgba(245, 158, 11, 0.35)', cursor: 'pointer', flexShrink: 0 }}
                                                        title="Teslim Edildi Olarak İşaretle"
                                                    >
                                                        <Clock size={12} />
                                                        <span>Hazırlanıyor</span>
                                                    </motion.button>
                                                )}
                                            </div>

                                            {item.notes && (
                                                <div style={{
                                                    fontSize: '11.5px',
                                                    color: '#fde68a',
                                                    background: 'rgba(245, 158, 11, 0.08)',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <MessageSquare size={12} />
                                                    <span>{item.notes}</span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                                {onAddNote && (
                                                    <button
                                                        onClick={() => onAddNote(idx)}
                                                        className="btn-outline"
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '3px 9px',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            color: item.notes ? 'var(--brand-gold)' : 'var(--text-muted)'
                                                        }}
                                                    >
                                                        <MessageSquare size={12} />
                                                        <span>{item.notes ? 'Not Düzenle' : '+ Not Ekle'}</span>
                                                    </button>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                    {onUpdateQuantity && (
                                                        <>
                                                            <div className="receipt-stepper-segmented">
                                                                <button
                                                                    onClick={() => onUpdateQuantity(idx, -1)}
                                                                    className="receipt-stepper-btn"
                                                                    title="Azalt"
                                                                >
                                                                    <Minus size={12} />
                                                                </button>
                                                                <span className="receipt-stepper-val">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => onUpdateQuantity(idx, 1)}
                                                                    className="receipt-stepper-btn"
                                                                    title="Artır"
                                                                >
                                                                    <Plus size={12} />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => onUpdateQuantity(idx, -item.quantity)}
                                                                className="receipt-trash-btn"
                                                                title="Ürünü Adisyondan Sil"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 2. GRUP: MASAYA TESLİM EDİLEN ÜRÜNLER */}
                        {deliveredCount > 0 && (
                            <div>
                                <div className="receipt-group-header is-delivered">
                                    <CheckCircle2 size={13} />
                                    <span>MASADA / TESLİM EDİLDİ ({deliveredCount})</span>
                                </div>
                                {items.map((item, idx) => {
                                    if (item.status !== 'delivered') return null;
                                    return (
                                        <motion.div
                                            key={item.id || idx}
                                            layout
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="receipt-item-card-21 delivered"
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                                                    <div className="receipt-dish-icon-box">
                                                        <Utensils size={15} />
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontWeight: 800, fontSize: '14.5px', color: '#FFFFFF', letterSpacing: '-0.2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                            {item.name}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: 'var(--brand-gold)', fontWeight: 700, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap', textWrap: 'nowrap', flexWrap: 'nowrap' }}>
                                                            <span style={{ fontWeight: 800, flexShrink: 0 }}>{formatMoney(Number(item.price) * Number(item.quantity || 1))}</span>
                                                            <span className="receipt-item-qty-badge">{item.quantity || 1}&nbsp;Adet</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {onToggleItemStatus && (
                                                    <motion.button
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => onToggleItemStatus(idx)}
                                                        className="receipt-status-chip is-delivered cursor-pointer"
                                                        style={{ border: '1px solid rgba(16, 185, 129, 0.35)', cursor: 'pointer', flexShrink: 0 }}
                                                        title="Geri Al (Hazırlanıyor Yap)"
                                                    >
                                                        <CheckCircle2 size={12} />
                                                        <span>Masada</span>
                                                    </motion.button>
                                                )}
                                            </div>

                                            {item.notes && (
                                                <div style={{
                                                    fontSize: '11.5px',
                                                    color: '#fde68a',
                                                    background: 'rgba(245, 158, 11, 0.08)',
                                                    border: '1px solid rgba(245, 158, 11, 0.2)',
                                                    padding: '4px 10px',
                                                    borderRadius: '8px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px'
                                                }}>
                                                    <MessageSquare size={12} />
                                                    <span>{item.notes}</span>
                                                </div>
                                            )}

                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                                {onAddNote && (
                                                    <button
                                                        onClick={() => onAddNote(idx)}
                                                        className="btn-outline"
                                                        style={{
                                                            fontSize: '11px',
                                                            padding: '3px 9px',
                                                            borderRadius: '8px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '5px',
                                                            color: item.notes ? 'var(--brand-gold)' : 'var(--text-muted)'
                                                        }}
                                                    >
                                                        <MessageSquare size={12} />
                                                        <span>{item.notes ? 'Not Düzenle' : '+ Not Ekle'}</span>
                                                    </button>
                                                )}

                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                                    {onUpdateQuantity && (
                                                        <>
                                                            <div className="receipt-stepper-segmented">
                                                                <button
                                                                    onClick={() => onUpdateQuantity(idx, -1)}
                                                                    className="receipt-stepper-btn"
                                                                    title="Azalt"
                                                                >
                                                                    <Minus size={12} />
                                                                </button>
                                                                <span className="receipt-stepper-val">
                                                                    {item.quantity}
                                                                </span>
                                                                <button
                                                                    onClick={() => onUpdateQuantity(idx, 1)}
                                                                    className="receipt-stepper-btn"
                                                                    title="Artır"
                                                                >
                                                                    <Plus size={12} />
                                                                </button>
                                                            </div>
                                                            <button
                                                                onClick={() => onUpdateQuantity(idx, -item.quantity)}
                                                                className="receipt-trash-btn"
                                                                title="Ürünü Adisyondan Sil"
                                                            >
                                                                <Trash2 size={13} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer & Checkout Buttons (Reference 1 Glass Dock) */}
            <div className="receipt-footer-glass">
                {orderDiscount > 0 ? (
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Ara Toplam</span>
                            <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 700, textDecoration: 'line-through' }}>
                                {formatMoney(orderSubtotal)}
                            </span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 800 }}>
                                <Tag size={13} /> İndirim / İkram
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '14px', color: '#10b981', fontWeight: 800 }}>
                                    -{formatMoney(orderDiscount)}
                                </span>
                                {onRemoveDiscount && (
                                    <button
                                        onClick={onRemoveDiscount}
                                        title="İndirimi Kaldır"
                                        style={{
                                            background: 'rgba(239, 68, 68, 0.15)',
                                            border: '1px solid rgba(239, 68, 68, 0.35)',
                                            color: '#ef4444',
                                            borderRadius: '6px',
                                            padding: '2px 6px',
                                            fontSize: '11px',
                                            cursor: 'pointer',
                                            fontWeight: 800
                                        }}
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>
                        <div style={{ height: '1px', background: 'rgba(255, 255, 255, 0.08)', margin: '6px 0' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '14px', fontWeight: 800, color: '#FFFFFF' }}>Ödenecek Tutar</span>
                            <span className="receipt-total-price-glow">
                                {formatMoney(orderTotal)}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="receipt-total-banner-21">
                        <div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                                GENEL TUTAR
                            </div>

                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <span className="receipt-total-price-glow">
                                {formatMoney(orderTotal)}
                            </span>
                        </div>
                    </div>
                )}

                {/* DESKTOP ACTIONS */}
                <div className="receipt-actions-desktop">
                    {/* Satır 1: Sipariş Ekle & İndirim / İkram (Reference 1) */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <motion.button
                            whileHover={{ scale: 1.02, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                if (onNavigateToTable) {
                                    onNavigateToTable(tableNo);
                                }
                            }}
                            className="receipt-btn-add-order"
                        >
                            <Plus size={15} />
                            <span>Sipariş Ekle</span>
                            <ArrowUpRight size={13} style={{ opacity: 0.7 }} />
                        </motion.button>

                        {onOpenDiscount && (
                            <motion.button
                                whileHover={{ scale: 1.02, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onOpenDiscount}
                                disabled={totalCount === 0}
                                style={{ opacity: totalCount === 0 ? 0.45 : 1, cursor: totalCount === 0 ? 'not-allowed' : 'pointer' }}
                                className={`receipt-btn-discount ${orderDiscount > 0 ? 'active' : ''}`}
                            >
                                <Tag size={14} />
                                <span>{orderDiscount > 0 ? `İndirim (${formatMoney(orderDiscount)})` : 'İndirim / İkram'}</span>
                            </motion.button>
                        )}
                    </div>

                    {/* Satır 2: Mutfak Fişi Yazdır (Reference 1 Thick Bar) */}
                    {onPrintKitchen && (
                        <div>
                            <motion.button
                                whileHover={{ scale: 1.015, y: -1 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={onPrintKitchen}
                                disabled={totalCount === 0}
                                style={{ opacity: totalCount === 0 ? 0.45 : 1, cursor: totalCount === 0 ? 'not-allowed' : 'pointer' }}
                                className="receipt-btn-kitchen-21"
                            >
                                <Printer size={17} />
                                <span>Mutfak Fişi Yazdır</span>
                            </motion.button>
                        </div>
                    )}
                </div>

                {/* MOBILE COMPACT ACTIONS (Single Row: Sipariş + İndirim + Mutfak Fişi) */}
                <div className="receipt-actions-mobile">
                    <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            if (onNavigateToTable) {
                                onNavigateToTable(tableNo);
                            }
                        }}
                        className="receipt-mobile-chip-btn"
                        title="Sipariş Menüsüne Git / Kapat"
                    >
                        <Plus size={14} />
                        <span>Sipariş</span>
                    </motion.button>

                    {onOpenDiscount && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onOpenDiscount}
                            disabled={totalCount === 0}
                            style={{ opacity: totalCount === 0 ? 0.4 : 1 }}
                            className={`receipt-mobile-chip-btn ${orderDiscount > 0 ? 'active' : ''}`}
                            title="İndirim / İkram"
                        >
                            <Tag size={14} />
                            <span>{orderDiscount > 0 ? formatMoney(orderDiscount) : 'İndirim'}</span>
                        </motion.button>
                    )}

                    {onPrintKitchen && (
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={onPrintKitchen}
                            disabled={totalCount === 0}
                            style={{ opacity: totalCount === 0 ? 0.4 : 1 }}
                            className="receipt-mobile-chip-btn"
                            title="Mutfak Fişi Yazdır"
                        >
                            <Printer size={14} />
                            <span>Mutfak</span>
                        </motion.button>
                    )}
                </div>

                {/* Satır 3: 3 Checkout Butonu (Nakit Kapat, Kart Kapat, Hesap Fişi - Reference 1) */}
                <div className="checkout-actions-3col" style={{ marginTop: '2px' }}>
                    <motion.button
                        whileHover={totalCount > 0 ? { scale: 1.025, y: -2 } : {}}
                        whileTap={totalCount > 0 ? { scale: 0.97 } : {}}
                        onClick={() => onCheckout && onCheckout('cash')}
                        disabled={totalCount === 0}
                        style={{ opacity: totalCount === 0 ? 0.35 : 1, cursor: totalCount === 0 ? 'not-allowed' : 'pointer' }}
                        className="receipt-btn-checkout-21 cash"
                    >
                        <Banknote size={18} />
                        <span>Nakit Kapat</span>
                    </motion.button>

                    <motion.button
                        whileHover={totalCount > 0 ? { scale: 1.025, y: -2 } : {}}
                        whileTap={totalCount > 0 ? { scale: 0.97 } : {}}
                        onClick={() => onCheckout && onCheckout('card')}
                        disabled={totalCount === 0}
                        style={{ opacity: totalCount === 0 ? 0.35 : 1, cursor: totalCount === 0 ? 'not-allowed' : 'pointer' }}
                        className="receipt-btn-checkout-21 card"
                    >
                        <CreditCard size={18} />
                        <span>Kart Kapat</span>
                    </motion.button>

                    <motion.button
                        whileHover={totalCount > 0 ? { scale: 1.025, y: -2 } : {}}
                        whileTap={totalCount > 0 ? { scale: 0.97 } : {}}
                        onClick={onPrintCustomerBill}
                        disabled={totalCount === 0}
                        style={{ opacity: totalCount === 0 ? 0.35 : 1, cursor: totalCount === 0 ? 'not-allowed' : 'pointer' }}
                        className="receipt-btn-checkout-21 bill"
                        title="Müşteri Hesap Fişini Yazdır (Hesap Açık Kalır)"
                    >
                        <Receipt size={18} />
                        <span>Hesap Fişi</span>
                    </motion.button>
                </div>
            </div>
        </div>
    );

    // Sidebar modunda ise doğrudan aside döner (TableDetailView)
    if (mode === 'sidebar') {
        return (
            <aside className={`receipt-side ${isOpen ? 'mobile-open' : ''}`}>
                {drawerContent}
            </aside>
        );
    }

    // Drawer modunda ise AnimatePresence ve Backdrop ile overlay olarak açılır (AdminView & WaiterView)
    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="admin-receipt-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={onClose}
                    />
                    <motion.aside
                        className="admin-receipt-drawer"
                        initial={{
                            x: typeof window !== 'undefined' && window.innerWidth <= 900 ? 0 : '100%',
                            y: typeof window !== 'undefined' && window.innerWidth <= 900 ? '100%' : 0
                        }}
                        animate={{ x: 0, y: 0 }}
                        exit={{
                            x: typeof window !== 'undefined' && window.innerWidth <= 900 ? 0 : '100%',
                            y: typeof window !== 'undefined' && window.innerWidth <= 900 ? '100%' : 0
                        }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                    >
                        {drawerContent}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    );
}
