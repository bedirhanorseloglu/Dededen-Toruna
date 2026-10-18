import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    MoveHorizontal, 
    ArrowRight, 
    CheckCircle2, 
    AlertTriangle, 
    X, 
    Layers, 
    Utensils, 
    ArrowRightLeft,
    Check
} from 'lucide-react';

export default function MoveTableModal({
    isOpen,
    sourceTable,
    selectedTargetTable,
    onSelectTargetTable,
    onConfirm,
    onClose,
    tables = [],
    activeOrders = {}
}) {
    // ESC tuşu ile kapatma
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sourceOrder = activeOrders[String(sourceTable)];
    const sourceItemCount = sourceOrder?.items?.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0) || 0;
    const targetOrder = selectedTargetTable ? activeOrders[String(selectedTargetTable)] : null;
    const isTargetOccupied = !!targetOrder;
    const targetItemCount = targetOrder?.items?.reduce((acc, i) => acc + (Number(i.quantity) || 1), 0) || 0;

    return (
        <AnimatePresence>
            <div 
                className="move-table-portal-overlay"
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    boxSizing: 'border-box'
                }}
            >
                {/* 21st Frosted Backdrop */}
                <motion.div
                    className="move-table-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(17, 13, 12, 0.82)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)'
                    }}
                />

                {/* 21st / Linear Glass Dialog */}
                <motion.div
                    className="move-table-dialog"
                    initial={{ opacity: 0, scale: 0.93, y: 18 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 18 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 360 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '480px',
                        background: 'linear-gradient(165deg, rgba(32, 24, 22, 0.98) 0%, rgba(18, 14, 13, 0.99) 100%)',
                        border: '1px solid rgba(245, 159, 0, 0.16)',
                        borderRadius: '22px',
                        padding: '18px 20px',
                        boxShadow: '0 32px 72px -16px rgba(0, 0, 0, 0.8), 0 0 35px rgba(247, 103, 7, 0.15)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxSizing: 'border-box',
                        maxHeight: '94vh',
                        maxHeight: '94dvh'
                    }}
                >
                    {/* Top Ambient Glow Line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '12%',
                            right: '12%',
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.75), transparent)',
                            opacity: 0.9
                        }}
                    />

                    {/* Header: Title & Close Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <div 
                                style={{ 
                                    display: 'inline-flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    padding: '3px 10px', 
                                    borderRadius: '999px',
                                    background: 'rgba(245, 158, 11, 0.12)',
                                    border: '1px solid rgba(245, 158, 11, 0.28)',
                                    color: '#fbbf24',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    letterSpacing: '0.4px',
                                    marginBottom: '6px'
                                }}
                            >
                                <ArrowRightLeft size={12} />
                                <span>MASA AKTARIMI</span>
                            </div>
                            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.3px' }}>
                                Masa Taşı / Birleştir
                            </h2>
                        </div>

                        <motion.button
                            whileHover={{ rotate: 90, scale: 1.08 }}
                            whileTap={{ scale: 0.92 }}
                            onClick={onClose}
                            style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '50%',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.09)',
                                color: '#94a3b8',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#FFFFFF';
                                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#94a3b8';
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.09)';
                            }}
                            title="Kapat (ESC)"
                        >
                            <X size={16} />
                        </motion.button>
                    </div>

                    {/* 21st Interactive Route Bridge (Source -> Target) */}
                    <div 
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.07)',
                            borderRadius: '16px',
                            padding: '12px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px'
                        }}
                    >
                        {/* Source Table Card */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                            <div 
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: 'rgba(245, 158, 11, 0.15)',
                                    border: '1px solid rgba(245, 158, 11, 0.35)',
                                    color: '#fbbf24',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    flexShrink: 0
                                }}
                            >
                                M{sourceTable}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Kaynak Masa
                                </div>
                                <div style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {sourceItemCount > 0 ? `${sourceItemCount} Ürün Aktif` : 'Sipariş Yok'}
                                </div>
                            </div>
                        </div>

                        {/* Animated Arrow Connector */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0, padding: '0 4px' }}>
                            <motion.div
                                animate={selectedTargetTable ? { x: [0, 4, 0] } : {}}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                                style={{
                                    color: selectedTargetTable 
                                        ? (isTargetOccupied ? '#f59e0b' : '#10b981')
                                        : 'rgba(255, 255, 255, 0.3)'
                                }}
                            >
                                <ArrowRight size={18} />
                            </motion.div>
                            <span style={{ 
                                fontSize: '9.5px', 
                                fontWeight: 700, 
                                letterSpacing: '0.3px',
                                color: selectedTargetTable 
                                    ? (isTargetOccupied ? '#fbbf24' : '#34d399')
                                    : 'rgba(255, 255, 255, 0.4)'
                            }}>
                                {selectedTargetTable ? (isTargetOccupied ? 'BİRLEŞTİR' : 'TAŞI') : 'HEDEF SEÇ'}
                            </span>
                        </div>

                        {/* Target Table Card */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', flex: 1, minWidth: 0 }}>
                            <div style={{ textAlign: 'right', minWidth: 0 }}>
                                <div style={{ fontSize: '10.5px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase' }}>
                                    Hedef Masa
                                </div>
                                <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: 700, 
                                    color: selectedTargetTable 
                                        ? (isTargetOccupied ? '#fbbf24' : '#34d399')
                                        : 'rgba(255, 255, 255, 0.4)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {selectedTargetTable ? (isTargetOccupied ? 'Dolu • Birleşecek' : 'Boş • Taşınacak') : 'Seçilmedi'}
                                </div>
                            </div>
                            <div 
                                style={{
                                    width: '38px',
                                    height: '38px',
                                    borderRadius: '12px',
                                    background: selectedTargetTable 
                                        ? (isTargetOccupied ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)')
                                        : 'rgba(255, 255, 255, 0.04)',
                                    border: selectedTargetTable
                                        ? (isTargetOccupied ? '1.5px solid #f59e0b' : '1.5px solid #10b981')
                                        : '1px dashed rgba(255, 255, 255, 0.15)',
                                    color: selectedTargetTable 
                                        ? (isTargetOccupied ? '#fbbf24' : '#34d399')
                                        : 'rgba(255, 255, 255, 0.3)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 900,
                                    fontSize: '14px',
                                    flexShrink: 0,
                                    boxShadow: selectedTargetTable ? (isTargetOccupied ? '0 0 14px rgba(245, 158, 11, 0.3)' : '0 0 14px rgba(16, 185, 129, 0.3)') : 'none'
                                }}
                            >
                                {selectedTargetTable ? `M${selectedTargetTable}` : '?'}
                            </div>
                        </div>
                    </div>

                    {/* Table Selection Grid with Scroll on Small Devices */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fffaf5' }}>
                                Hedef Masayı Seçin:
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#d1b8af' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981' }} />
                                    Boş
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#f59e0b' }} />
                                    Dolu
                                </span>
                            </div>
                        </div>

                        <div 
                            style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(auto-fill, minmax(58px, 1fr))', 
                                gap: '6px',
                                maxHeight: 'none',
                                overflowY: 'visible',
                                paddingRight: '0px',
                                paddingBottom: '2px'
                            }}
                        >
                            {tables.map(t => {
                                const isSelf = t.table_no === Number(sourceTable);
                                const isOccupied = !!activeOrders[String(t.table_no)];
                                const isSelected = selectedTargetTable === String(t.table_no);

                                return (
                                    <motion.button
                                        key={t.id || t.table_no}
                                        disabled={isSelf}
                                        whileHover={!isSelf ? { scale: 1.05, y: -2 } : {}}
                                        whileTap={!isSelf ? { scale: 0.94 } : {}}
                                        onClick={() => onSelectTargetTable(String(t.table_no))}
                                        style={{
                                            position: 'relative',
                                            height: '44px',
                                            borderRadius: '10px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '1px',
                                            cursor: isSelf ? 'not-allowed' : 'pointer',
                                            opacity: isSelf ? 0.35 : 1,
                                            border: isSelected 
                                                ? '2px solid #f59e0b' 
                                                : (isOccupied ? '1px solid rgba(245, 158, 11, 0.28)' : '1px solid rgba(255, 255, 255, 0.08)'),
                                            background: isSelected
                                                ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.28), rgba(217, 119, 6, 0.22))'
                                                : (isOccupied ? 'rgba(245, 158, 11, 0.1)' : 'rgba(40, 30, 28, 0.65)'),
                                            boxShadow: isSelected 
                                                ? '0 0 16px rgba(245, 158, 11, 0.35), inset 0 0 8px rgba(245, 158, 11, 0.2)' 
                                                : 'none',
                                            transition: 'border-color 0.15s ease, background 0.15s ease'
                                        }}
                                    >
                                        {/* Status Dot */}
                                        {!isSelf && (
                                            <span 
                                                style={{
                                                    position: 'absolute',
                                                    top: '4px',
                                                    right: '5px',
                                                    width: '5px',
                                                    height: '5px',
                                                    borderRadius: '50%',
                                                    background: isOccupied ? '#f59e0b' : '#10b981',
                                                    boxShadow: isOccupied ? '0 0 6px rgba(245, 158, 11, 0.8)' : '0 0 6px rgba(16, 185, 129, 0.8)'
                                                }}
                                            />
                                        )}

                                        <span 
                                            style={{ 
                                                fontWeight: 800, 
                                                fontSize: '13px',
                                                color: isSelf 
                                                    ? '#64748b' 
                                                    : (isSelected ? '#FFFFFF' : (isOccupied ? '#fbbf24' : '#f8fafc'))
                                            }}
                                        >
                                            M{t.table_no}
                                        </span>

                                        <span 
                                            style={{ 
                                                fontSize: '8.5px', 
                                                fontWeight: 700, 
                                                letterSpacing: '0.2px',
                                                color: isSelf 
                                                    ? '#64748b' 
                                                    : (isSelected ? '#fde68a' : (isOccupied ? '#f59e0b' : '#64748b'))
                                            }}
                                        >
                                            {isSelf ? 'Mevcut' : (isOccupied ? 'Dolu' : 'Boş')}
                                        </span>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Explanatory Context Banner with Motion Animation */}
                    <AnimatePresence mode="wait">
                        {selectedTargetTable ? (
                            <motion.div
                                key={selectedTargetTable}
                                initial={{ opacity: 0, y: 6, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -6, height: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{
                                    padding: '12px 14px',
                                    borderRadius: '14px',
                                    background: isTargetOccupied 
                                        ? 'rgba(245, 158, 11, 0.1)' 
                                        : 'rgba(16, 185, 129, 0.1)',
                                    border: isTargetOccupied 
                                        ? '1px solid rgba(245, 158, 11, 0.28)' 
                                        : '1px solid rgba(16, 185, 129, 0.28)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px'
                                }}
                            >
                                <div 
                                    style={{
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '8px',
                                        background: isTargetOccupied ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                        color: isTargetOccupied ? '#fbbf24' : '#34d399',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0
                                    }}
                                >
                                    {isTargetOccupied ? <Layers size={15} /> : <CheckCircle2 size={15} />}
                                </div>
                                <div style={{ fontSize: '11.5px', lineHeight: 1.45, color: '#e2e8f0' }}>
                                    {isTargetOccupied ? (
                                        <span>
                                            <strong style={{ color: '#fbbf24' }}>Masa {selectedTargetTable} DOLU!</strong> Masa {sourceTable}'deki siparişler bu masanın adisyonuyla <strong style={{ color: '#FFFFFF' }}>BİRLEŞTİRİLECEKTİR</strong>.
                                        </span>
                                    ) : (
                                        <span>
                                            <strong style={{ color: '#34d399' }}>Masa {selectedTargetTable} BOŞ.</strong> Masa {sourceTable}'deki tüm siparişler doğrudan bu masaya <strong style={{ color: '#FFFFFF' }}>TAŞINACAKTIR</strong>.
                                        </span>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                style={{
                                    padding: '10px 14px',
                                    borderRadius: '12px',
                                    background: 'rgba(255, 255, 255, 0.02)',
                                    border: '1px dashed rgba(255, 255, 255, 0.08)',
                                    fontSize: '11.5px',
                                    color: '#94a3b8',
                                    textAlign: 'center'
                                }}
                            >
                                Siparişleri aktarmak istediğiniz masayı yukarıdaki listeden tıklayınız.
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Footer Actions */}
                    <div style={{ display: 'flex', gap: '10px', marginTop: '2px' }}>
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            style={{
                                flex: 1,
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                color: '#fffaf5',
                                fontSize: '13px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.09)';
                                e.currentTarget.style.color = '#FFFFFF';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                e.currentTarget.style.color = '#fffaf5';
                            }}
                        >
                            Vazgeç
                        </motion.button>

                        <motion.button
                            whileHover={selectedTargetTable ? { scale: 1.02, y: -1 } : {}}
                            whileTap={selectedTargetTable ? { scale: 0.98 } : {}}
                            onClick={onConfirm}
                            disabled={!selectedTargetTable}
                            style={{
                                flex: 2,
                                padding: '12px 18px',
                                borderRadius: '12px',
                                background: selectedTargetTable
                                    ? (isTargetOccupied 
                                        ? 'linear-gradient(135deg, #f59e0b, #d97706)' 
                                        : 'linear-gradient(135deg, #10b981, #059669)')
                                    : 'rgba(255, 255, 255, 0.06)',
                                border: selectedTargetTable 
                                    ? 'none' 
                                    : '1px solid rgba(255, 255, 255, 0.08)',
                                color: selectedTargetTable ? '#FFFFFF' : '#64748b',
                                fontSize: '13px',
                                fontWeight: 800,
                                cursor: selectedTargetTable ? 'pointer' : 'not-allowed',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                boxShadow: selectedTargetTable 
                                    ? (isTargetOccupied 
                                        ? '0 6px 20px rgba(245, 158, 11, 0.35)' 
                                        : '0 6px 20px rgba(16, 185, 129, 0.35)')
                                    : 'none',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            <Check size={16} />
                            <span>{isTargetOccupied ? 'Birleştirmeyi Onayla' : 'Taşımayı Onayla'}</span>
                        </motion.button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
