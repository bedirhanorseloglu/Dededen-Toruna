import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import WaiterView from './views/WaiterView';
import TableDetailView from './views/TableDetailView';
import AdminView from './views/AdminView';
import KitchenView from './views/KitchenView';
import ConfirmModal from './components/ConfirmModal';
import { registerServiceWorker, requestNotificationPermission } from './services/notificationService';
import { unlockAudioContext } from './services/audioService';

function AppContent() {
    const { currentUser, currentView, selectedTableId, toasts = [], hideToast, confirmModal } = useApp();
    const [isToastHovered, setIsToastHovered] = useState(false);
    const [isToastManuallyExpanded, setIsToastManuallyExpanded] = useState(false);

    useEffect(() => {
        if (toasts.length <= 1) {
            setIsToastManuallyExpanded(false);
        }
    }, [toasts.length]);

    useEffect(() => {
        registerServiceWorker();
        requestNotificationPermission();

        const handleFirstInteraction = () => {
            unlockAudioContext();
            window.removeEventListener('pointerdown', handleFirstInteraction);
        };
        window.addEventListener('pointerdown', handleFirstInteraction);

        return () => window.removeEventListener('pointerdown', handleFirstInteraction);
    }, []);

    const renderActiveView = () => {
        if (!currentUser || currentView === 'login') {
            return <LoginView />;
        }

        // KATI ROL ERİŞİM KONTROLÜ (Role-Based Access Control)
        // 1. Mutfak personeli SADECE mutfak ekranını görebilir; garson veya adisyon ekranlarını asla göremez
        if (currentUser.role === 'kitchen') {
            return <KitchenView />;
        }

        // 2. Garson personeli SADECE masaları ve masa adisyon detayını görebilir; yönetici veya mutfak ekranlarını göremez
        if (currentUser.role === 'waiter') {
            if (currentView === 'table') {
                return <TableDetailView />;
            }
            return <WaiterView />;
        }

        // 3. Yönetici tüm ekranlara serbestçe geçiş yapabilir
        switch (currentView) {
            case 'table':
                return <TableDetailView />;
            case 'kitchen':
                return <KitchenView />;
            case 'waiter':
                return <WaiterView />;
            case 'admin':
            default:
                return <AdminView />;
        }
    };

    const getToastMeta = (type) => {
        switch (type) {
            case 'warning': 
                return { 
                    icon: <AlertTriangle size={18} strokeWidth={2.5} />, 
                    className: 'warning',
                    color: '#f59e0b'
                };
            case 'danger':
            case 'error': 
                return { 
                    icon: <AlertCircle size={18} strokeWidth={2.5} />, 
                    className: 'danger',
                    color: '#ef4444'
                };
            case 'info': 
                return { 
                    icon: <Info size={18} strokeWidth={2.5} />, 
                    className: 'info',
                    color: '#f97316'
                };
            case 'success':
            default: 
                return { 
                    icon: <CheckCircle2 size={18} strokeWidth={2.5} />, 
                    className: 'success',
                    color: '#10b981'
                };
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <div 
                    key={`${currentView}-${selectedTableId || ''}`} 
                    className="view-transition-wrapper"
                >
                    {renderActiveView()}
                </div>
            </main>

            {/* Apple Dynamic Island & 21st.dev Modern Floating Toast Stack (Sonner Style Deck) */}
            {toasts.length > 0 && (
                <div className="toast-container">
                    <div 
                        className="toast-stack-wrapper"
                        onMouseEnter={() => setIsToastHovered(true)}
                        onMouseLeave={() => setIsToastHovered(false)}
                    >
                        <AnimatePresence mode="popLayout">
                            {toasts.slice().reverse().map((t, index) => {
                                const meta = getToastMeta(t.type);
                                const isFront = index === 0;
                                const isExpanded = (isToastHovered || isToastManuallyExpanded) && toasts.length > 1;

                                // Katmanlı deste parametreleri:
                                // Kapalıyken (collapsed): Arkadaki kartlar alttan 12px ve 23px hafifçe taşar (peeking)
                                // Açıkken (expanded): Kartlar dikey liste olarak ayrılır (56px aralık)
                                const y = isExpanded ? index * 56 : index * 12;
                                const scale = isExpanded ? 1 : Math.max(0.88, 1 - index * 0.045);
                                const opacity = isExpanded ? 1 : Math.max(0.68, 1 - index * 0.16);
                                const zIndex = 50 - index;

                                return (
                                    <motion.div 
                                        key={t.id}
                                        layout
                                        className={`modern-toast-notification ${meta.className}`}
                                        style={{ zIndex, transformOrigin: 'center top' }}
                                        initial={{ opacity: 0, y: -24, scale: 0.94 }}
                                        animate={{ opacity, y, scale }}
                                        exit={{ opacity: 0, y: -16, scale: 0.92 }}
                                        transition={{ type: "spring", stiffness: 440, damping: 28, mass: 0.65 }}
                                        whileHover={isExpanded ? { scale: 1.01 } : undefined}
                                        onClick={() => {
                                            if (toasts.length > 1 && !isExpanded) {
                                                setIsToastManuallyExpanded(true);
                                            }
                                        }}
                                    >
                                        <div className="toast-specular-edge" />
                                        <div className={`toast-icon-badge ${meta.className}`}>
                                            {meta.icon}
                                        </div>
                                        <div className="toast-body">
                                            <span className="toast-text">
                                                {t.message}
                                            </span>
                                        </div>

                                        {/* Birden fazla bildirim varsa öndeki kartta +N rozeti */}
                                        {isFront && toasts.length > 1 && (
                                            <span 
                                                className="toast-stack-count"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setIsToastManuallyExpanded(prev => !prev);
                                                }}
                                                title="Tüm bildirimleri aç/kapat"
                                            >
                                                +{toasts.length - 1}
                                            </span>
                                        )}

                                        <button 
                                            type="button" 
                                            className="toast-dismiss-btn" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                hideToast(t.id);
                                            }}
                                            title="Kapat"
                                        >
                                            <X size={14} strokeWidth={2.4} />
                                        </button>

                                        {isFront && (
                                            <motion.div 
                                                className={`toast-progress-bar ${meta.className}`}
                                                initial={{ scaleX: 1 }}
                                                animate={{ scaleX: 0 }}
                                                transition={{ duration: (t.duration || 3500) / 1000, ease: 'linear' }}
                                            />
                                        )}
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Modern Evrensel Onay Modalı */}
            {confirmModal && <ConfirmModal {...confirmModal} />}
        </div>
    );
}

export default function App() {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
}
