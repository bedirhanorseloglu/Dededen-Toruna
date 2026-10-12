import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import LoginView from './views/LoginView';
import WaiterView from './views/WaiterView';
import TableDetailView from './views/TableDetailView';
import AdminView from './views/AdminView';
import KitchenView from './views/KitchenView';
import { registerServiceWorker, requestNotificationPermission } from './services/notificationService';
import { unlockAudioContext } from './services/audioService';

function AppContent() {
    const { currentUser, currentView, selectedTableId, toast } = useApp();

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

        switch (currentView) {
            case 'table':
                return <TableDetailView />;
            case 'admin':
                return currentUser.role === 'admin' ? <AdminView /> : <WaiterView />;
            case 'kitchen':
                return <KitchenView />;
            case 'waiter':
            default:
                return <WaiterView />;
        }
    };

    const getToastBadge = (type) => {
        switch (type) {
            case 'warning': return { char: '🔔', className: 'warning' };
            case 'danger':
            case 'error': return { char: '✕', className: 'danger' };
            case 'info': return { char: 'ℹ️', className: 'info' };
            case 'success':
            default: return { char: '✓', className: 'success' };
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Navbar />
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div 
                        key={`${currentView}-${selectedTableId || ''}`} 
                        className="view-transition-wrapper"
                        initial={{ opacity: 0, y: 12, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.995 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {renderActiveView()}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Apple Dynamic Island Floating Glass Toast Notification (Framer Motion) */}
            <div className="toast-container">
                <AnimatePresence>
                    {toast && (
                        <motion.div 
                            key={toast.id || toast.message}
                            className="toast-notification"
                            initial={{ opacity: 0, y: -20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -16, scale: 0.95 }}
                            transition={{ type: "spring", stiffness: 450, damping: 28 }}
                        >
                            <span className={`toast-icon-badge ${getToastBadge(toast.type).className}`}>
                                {getToastBadge(toast.type).char}
                            </span>
                            <span style={{ letterSpacing: '-0.2px', fontWeight: 700 }}>
                                {toast.message}
                            </span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
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
