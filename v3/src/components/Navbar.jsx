import React from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
    Maximize2,
    Minimize2,
    Volume2,
    VolumeX,
    LogOut,
    ArrowLeft,
    ChefHat
} from 'lucide-react';

export default function Navbar() {
    const {
        currentUser,
        currentView,
        selectedTableId,
        navigateTo,
        logout,
        isFullscreen,
        toggleFullscreen,
        soundEnabled,
        toggleSound
    } = useApp();

    if (!currentUser || currentView === 'login' || currentView === 'kitchen') return null;

    const handleBack = () => {
        if (currentUser.role === 'admin') {
            navigateTo('admin');
        } else if (currentUser.role === 'kitchen') {
            navigateTo('kitchen');
        } else {
            navigateTo('waiter');
        }
    };

    const getRoleTitle = (role) => {
        switch (role) {
            case 'admin': return 'YÖNETİCİ';
            case 'kitchen': return 'MUTFAK';
            case 'waiter':
            default: return 'GARSON';
        }
    };

    return (
        <header className="app-header">
            {/* Brand Section */}
            <div className="brand-section">
                {currentView === 'table' && (
                    <motion.button
                        onClick={handleBack}
                        className="btn-outline btn-nav-back"
                        title={currentUser.role === 'admin' ? 'Yöneticiye Dön' : 'Masalara Dön'}
                        whileHover={{ x: -2, transition: { duration: 0.12 } }}
                        whileTap={{ scale: 0.94 }}
                    >
                        <ArrowLeft size={16} />
                        <span className="nav-back-text">{currentUser.role === 'admin' ? 'Yöneticiye Dön' : 'Masalara Dön'}</span>
                    </motion.button>
                )}

                <img
                    src="/logo.png"
                    alt="Dededen Toruna"
                    className="brand-logo-img"
                    onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="brand-text">
                    <h1>DEDEDEN TORUNA</h1>
                    <p className="brand-subtitle">{currentView === 'table' ? `MASA ${selectedTableId} • ADİSYON` : 'CAFE & HAMSİKÖY SÜTLACI'}</p>
                </div>
            </div>

            {/* Right Controls */}
            <div className="header-controls">
                {/* Admin Quick Switch to Kitchen Screen */}
                {currentUser.role === 'admin' && (
                    <motion.button
                        onClick={() => navigateTo(currentView === 'kitchen' ? 'admin' : 'kitchen')}
                        className={`btn-outline ${currentView === 'kitchen' ? 'active' : ''}`}
                        title={currentView === 'kitchen' ? "Yönetici Paneline Dön" : "Mutfak KDS Ekranını Aç"}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.95 }}
                        style={{
                            padding: '6px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            color: currentView === 'kitchen' ? '#fff' : 'var(--brand-gold)',
                            borderColor: currentView === 'kitchen' ? 'var(--brand-primary)' : 'rgba(251, 191, 36, 0.4)',
                            background: currentView === 'kitchen' ? 'linear-gradient(135deg, #f76707 0%, #d9480f 100%)' : 'rgba(251, 191, 36, 0.08)'
                        }}
                    >
                        <ChefHat size={15} />
                        <span className="nav-back-text">{currentView === 'kitchen' ? 'Yönetici' : 'Mutfak'}</span>
                    </motion.button>
                )}

                {/* User Badge */}
                <div className="user-badge">
                    <span className="user-name-text" style={{ fontWeight: 700 }}>{currentUser.name}</span>
                    <span className="user-role-tag">{getRoleTitle(currentUser.role)}</span>
                </div>

                {/* Sound Toggle */}
                <button
                    onClick={toggleSound}
                    className="btn-outline"
                    title={soundEnabled ? "Sesi Kapat" : "Sesi Aç"}
                    style={{
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: soundEnabled ? 'var(--brand-gold)' : 'var(--text-muted)'
                    }}
                >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>

                {/* Fullscreen Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleFullscreen();
                    }}
                    className="btn-outline"
                    title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran Yap"}
                    style={{
                        padding: '8px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: isFullscreen ? 'var(--success)' : 'var(--text-secondary)'
                    }}
                >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>

                {/* Logout Button */}
                <button
                    onClick={logout}
                    className="btn-logout"
                    title="Çıkış Yap"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
}
