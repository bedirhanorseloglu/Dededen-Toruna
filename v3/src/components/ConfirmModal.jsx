import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, AlertCircle, Info, X } from 'lucide-react';

export default function ConfirmModal({
    isOpen,
    title = 'İşlemi Onaylayın',
    message = 'Bu işlemi gerçekleştirmek istediğinize emin misiniz?',
    confirmText = 'Evet, Onayla',
    cancelText = 'Vazgeç',
    variant = 'danger', // 'danger' | 'warning' | 'info'
    onConfirm,
    onCancel
}) {
    // ESC tuşu ile iptal et
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (onCancel) onCancel();
            } else if (e.key === 'Enter') {
                if (onConfirm) onConfirm();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onCancel, onConfirm]);

    if (!isOpen) return null;

    const getIconConfig = () => {
        switch (variant) {
            case 'danger':
                return {
                    icon: <Trash2 size={24} />,
                    bgColor: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    color: '#ef4444',
                    glow: '0 0 25px rgba(239, 68, 68, 0.25)',
                    btnBg: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    btnHover: 'linear-gradient(135deg, #f87171, #ef4444)',
                    btnShadow: '0 4px 16px rgba(239, 68, 68, 0.4)'
                };
            case 'warning':
                return {
                    icon: <AlertTriangle size={24} />,
                    bgColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    color: 'var(--brand-gold)',
                    glow: '0 0 25px rgba(245, 158, 11, 0.25)',
                    btnBg: 'linear-gradient(135deg, var(--brand-primary), #e8590c)',
                    btnHover: 'linear-gradient(135deg, #ff7e1d, var(--brand-primary))',
                    btnShadow: '0 4px 16px rgba(247, 103, 7, 0.4)'
                };
            case 'info':
            default:
                return {
                    icon: <Info size={24} />,
                    bgColor: 'rgba(59, 130, 246, 0.15)',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    color: '#60a5fa',
                    glow: '0 0 25px rgba(59, 130, 246, 0.25)',
                    btnBg: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    btnHover: 'linear-gradient(135deg, #60a5fa, #3b82f6)',
                    btnShadow: '0 4px 16px rgba(59, 130, 246, 0.4)'
                };
        }
    };

    const cfg = getIconConfig();

    return (
        <AnimatePresence>
            <div
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px'
                }}
            >
                {/* Backdrop Blur Overlay */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(10, 8, 7, 0.82)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)'
                    }}
                />

                {/* Modal Card */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.92, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'relative',
                        width: '100%',
                        maxWidth: '420px',
                        background: 'linear-gradient(180deg, #1f1915 0%, #17120e 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.22)',
                        borderRadius: '20px',
                        padding: '24px 22px',
                        boxShadow: `0 24px 50px rgba(0, 0, 0, 0.8), ${cfg.glow}`,
                        zIndex: 10000,
                        overflow: 'hidden'
                    }}
                >
                    {/* Top Ambient Glow Line */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: '10%',
                            right: '10%',
                            height: '2px',
                            background: `linear-gradient(90deg, transparent, ${cfg.color}, transparent)`,
                            opacity: 0.8
                        }}
                    />

                    {/* Close Button */}
                    <button
                        onClick={onCancel}
                        style={{
                            position: 'absolute',
                            top: '16px',
                            right: '16px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '50%',
                            width: '32px',
                            height: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'white';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--text-muted)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }}
                    >
                        <X size={16} />
                    </button>

                    {/* Header with Icon */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <div
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '14px',
                                background: cfg.bgColor,
                                border: `1px solid ${cfg.borderColor}`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: cfg.color,
                                flexShrink: 0,
                                boxShadow: cfg.glow
                            }}
                        >
                            {cfg.icon}
                        </div>
                        <div>
                            <h3
                                style={{
                                    fontSize: '18px',
                                    fontWeight: 900,
                                    margin: 0,
                                    color: 'white',
                                    letterSpacing: '-0.3px'
                                }}
                            >
                                {title}
                            </h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', fontWeight: 700 }}>
                                Onay Gerekiyor
                            </span>
                        </div>
                    </div>

                    {/* Message Body */}
                    <div
                        style={{
                            background: 'rgba(0, 0, 0, 0.25)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '12px',
                            padding: '14px 16px',
                            marginBottom: '20px',
                            fontSize: '14px',
                            lineHeight: 1.5,
                            color: '#e2e8f0',
                            wordBreak: 'break-word'
                        }}
                    >
                        {message}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button
                            type="button"
                            onClick={onCancel}
                            style={{
                                flex: 1,
                                padding: '12px 18px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                borderRadius: '12px',
                                color: '#e2e8f0',
                                fontSize: '14px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            }}
                        >
                            {cancelText}
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            style={{
                                flex: 1.3,
                                padding: '12px 18px',
                                background: cfg.btnBg,
                                border: 'none',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '14px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                boxShadow: cfg.btnShadow,
                                transition: 'all 0.15s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
