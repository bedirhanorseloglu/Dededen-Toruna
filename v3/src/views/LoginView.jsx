import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Crown, ChefHat, UserCheck, ChevronDown, Delete, Check, User } from 'lucide-react';
import { useApp, DEFAULT_USERS } from '../context/AppContext';
import { db, collection, onSnapshot } from '../config/firebase';
import { playChimeSound, playKeypadBeep } from '../services/audioService';

const KEYPAD_BUTTONS = [
    { digit: '1', letters: '•' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { action: 'clear', label: 'C', icon: Delete },
    { digit: '0', letters: '+' },
    { action: 'submit', label: '✓', icon: Check }
];

const DEFAULT_KITCHEN_USERS = [
    { id: "ktc-1", name: "Mutfak Ekibi", role: "kitchen", pin: "197300", phone: "" }
];

// İsimden (Patron) ibaresini temizleme
const cleanStaffName = (name) => {
    if (!name) return '';
    return String(name).replace(/\s*\(Patron\)/gi, '').trim();
};

export default function LoginView() {
    const { login, showToast } = useApp();
    const [currentRole, setCurrentRole] = useState('waiter');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [enteredPin, setEnteredPin] = useState('');
    const [isShaking, setIsShaking] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const [waiters, setWaiters] = useState([]);
    const [kitchenStaff, setKitchenStaff] = useState(DEFAULT_KITCHEN_USERS);
    const [managers, setManagers] = useState(DEFAULT_USERS);

    useEffect(() => {
        const unsubW = onSnapshot(collection(db, "waiters"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'waiter' }));
            setWaiters(list);
        }, () => { });

        const unsubK = onSnapshot(collection(db, "kitchen_staff"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'kitchen' }));
            setKitchenStaff(list.length > 0 ? list : DEFAULT_KITCHEN_USERS);
        }, () => { });

        const unsubM = onSnapshot(collection(db, "managers"), snap => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data(), role: 'admin' }));
            setManagers(list.length > 0 ? list : DEFAULT_USERS);
        }, () => { });

        return () => {
            unsubW();
            unsubK();
            unsubM();
        };
    }, []);

    const filteredStaff = currentRole === 'admin'
        ? (managers.length > 0 ? managers : DEFAULT_USERS)
        : (currentRole === 'kitchen'
            ? (kitchenStaff.length > 0 ? kitchenStaff : DEFAULT_KITCHEN_USERS)
            : waiters);

    useEffect(() => {
        if (filteredStaff.length > 0) {
            setSelectedStaffId(filteredStaff[0].id);
        } else {
            setSelectedStaffId('');
        }
        setEnteredPin('');
        setIsDropdownOpen(false);
    }, [currentRole, waiters, kitchenStaff, managers]);

    // Dışarı tıklandığında özel açılır menüyü kapat
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    const pressNum = (num) => {
        playKeypadBeep();
        if (enteredPin.length < 6) {
            const next = enteredPin + num;
            setEnteredPin(next);

            if (next.length === 6) {
                setTimeout(() => submitPin(next), 60);
            }
        }
    };

    const clearPin = () => {
        playKeypadBeep();
        setEnteredPin('');
    };

    const submitPin = (pinToCheck = enteredPin) => {
        const staff = filteredStaff.find(s => s.id === selectedStaffId);
        if (!staff) {
            showToast("Lütfen personel seçiniz.", "warning");
            return;
        }

        if (staff.pin === pinToCheck) {
            playChimeSound();
            login({
                ...staff,
                name: cleanStaffName(staff.name)
            });
        } else {
            showToast("Hatalı PIN Kodu!", "danger");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            clearPin();
        }
    };

    // Fiziksel klavye ve numpad desteği (Erişilebilirlik ve POS Kolaylığı)
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            if (e.key >= '0' && e.key <= '9') {
                pressNum(e.key);
            } else if (e.key === 'Backspace' || e.key === 'c' || e.key === 'C') {
                clearPin();
            } else if (e.key === 'Enter') {
                submitPin();
            } else if (e.key === 'Escape') {
                setIsDropdownOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [enteredPin, selectedStaffId, filteredStaff]);

    const currentSelectedStaff = filteredStaff.find(s => s.id === selectedStaffId) || filteredStaff[0];

    return (
        <div className="login-screen">
            {/* 21st.dev Ambient Radial Spotlight */}
            <div className="login-screen-ambient-spotlight" />

            <motion.div
                className="login-card"
                initial={{ opacity: 0, scale: 0.94, y: 22 }}
                animate={isShaking
                    ? { x: [-12, 12, -10, 10, -5, 5, 0], scale: [1, 0.985, 1], opacity: 1, y: 0 }
                    : { opacity: 1, scale: 1, y: 0, x: 0 }
                }
                transition={isShaking ? { duration: 0.45 } : { duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
            >
                {/* 21st.dev Specular Top Edge Light */}
                <div className="login-card-specular" />

                {/* Left Pane (Header, Role Select, Staff Select) */}
                <div className="login-left-pane">
                    {/* Logo with Ambient Breathing Glow */}
                    <div className="login-logo-halo">
                        <motion.img
                            src="/logo.png"
                            alt="Dededen Toruna"
                            className="login-brand-logo"
                            style={{
                                borderRadius: '50%',
                                border: '3px solid var(--brand-primary)',
                                objectFit: 'cover'
                            }}
                            animate={{
                                boxShadow: [
                                    '0 0 20px rgba(247, 103, 7, 0.35)',
                                    '0 0 38px rgba(247, 103, 7, 0.65)',
                                    '0 0 20px rgba(247, 103, 7, 0.35)'
                                ]
                            }}
                            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                        />
                    </div>

                    <h1 className="login-brand-title">
                        Dededen Toruna
                    </h1>

                    <div>
                        <span className="login-brand-badge">
                            ADİSYON SİSTEMİ
                        </span>
                    </div>

                    {/* Role Selector (21st.dev Segmented Interactive Cards) */}
                    <div className="role-selector">
                        <motion.button
                            type="button"
                            className={`role-btn ${currentRole === 'waiter' ? 'active' : ''}`}
                            onClick={() => {
                                playKeypadBeep();
                                setCurrentRole('waiter');
                            }}
                            whileHover={{ y: -2, scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <div className="role-btn-icon-wrap">
                                <Smartphone size={18} strokeWidth={2.4} />
                            </div>
                            <div className="role-btn-info">
                                <span className="role-btn-title">Garson</span>
                                <span className="role-btn-desc">Sipariş & Masa</span>
                            </div>
                        </motion.button>

                        <motion.button
                            type="button"
                            className={`role-btn ${currentRole === 'kitchen' ? 'active' : ''}`}
                            onClick={() => {
                                playKeypadBeep();
                                setCurrentRole('kitchen');
                            }}
                            whileHover={{ y: -2, scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <div className="role-btn-icon-wrap">
                                <ChefHat size={18} strokeWidth={2.4} />
                            </div>
                            <div className="role-btn-info">
                                <span className="role-btn-title">Mutfak</span>
                                <span className="role-btn-desc">Siparişler</span>
                            </div>
                        </motion.button>

                        <motion.button
                            type="button"
                            className={`role-btn ${currentRole === 'admin' ? 'active' : ''}`}
                            onClick={() => {
                                playKeypadBeep();
                                setCurrentRole('admin');
                            }}
                            whileHover={{ y: -2, scale: 1.015 }}
                            whileTap={{ scale: 0.97 }}
                        >
                            <div className="role-btn-icon-wrap">
                                <Crown size={18} strokeWidth={2.4} />
                            </div>
                            <div className="role-btn-info">
                                <span className="role-btn-title">Yönetici</span>
                                <span className="role-btn-desc">Kasa & Rapor</span>
                            </div>
                        </motion.button>
                    </div>

                    {/* Modern 21st.dev Animated Staff Dropdown */}
                    <div className="login-staff-select-wrapper">
                        <label style={{
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.6)',
                            fontWeight: 800,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <UserCheck size={13} strokeWidth={2.4} style={{ color: 'var(--brand-primary)' }} />
                            Personel Seçiniz:
                        </label>

                        {filteredStaff.length === 0 ? (
                            <div style={{
                                padding: '12px',
                                background: 'rgba(245, 158, 11, 0.1)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '14px',
                                fontSize: '12px',
                                color: '#f59e0b',
                                lineHeight: 1.4,
                                marginTop: '6px'
                            }}>
                                ⚠️ Henüz kayıtlı {currentRole === 'kitchen' ? 'mutfak personeli' : 'garson'} bulunmuyor. Yönetici girişi yaparak <strong>Personel & Ekip Yönetimi</strong> sekmesinden personel ekleyebilirsiniz.
                            </div>
                        ) : (
                            <div ref={dropdownRef} className="custom-staff-dropdown-container" style={{ marginTop: '6px' }}>
                                <motion.button
                                    type="button"
                                    id="staff-select-trigger"
                                    className={`custom-staff-trigger ${isDropdownOpen ? 'open' : ''}`}
                                    onClick={() => {
                                        playKeypadBeep();
                                        setIsDropdownOpen(prev => !prev);
                                    }}
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.985 }}
                                >
                                    <div className="staff-trigger-left">
                                        <div className={`staff-avatar-badge ${currentRole}`}>
                                            {currentRole === 'admin' ? (
                                                <Crown size={16} strokeWidth={2.4} />
                                            ) : currentRole === 'kitchen' ? (
                                                <ChefHat size={16} strokeWidth={2.4} />
                                            ) : (
                                                <User size={16} strokeWidth={2.4} />
                                            )}
                                        </div>
                                        <div className="staff-trigger-text">
                                            <span className="staff-trigger-name">
                                                {cleanStaffName(currentSelectedStaff?.name) || 'Personel Seçiniz'}
                                            </span>
                                            <span className="staff-trigger-role">
                                                {currentSelectedStaff?.role === 'admin' ? 'Tüm Yetkiler' : (currentSelectedStaff?.role === 'kitchen' ? 'Mutfak Ekibi' : 'Garson')}
                                            </span>
                                        </div>
                                    </div>
                                    <motion.div
                                        className="staff-trigger-chevron"
                                        animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <ChevronDown size={17} strokeWidth={2.4} />
                                    </motion.div>
                                </motion.button>

                                {/* 21st.dev Animated Floating Glass Dropdown Menu */}
                                <AnimatePresence>
                                    {isDropdownOpen && (
                                        <motion.div
                                            className="custom-staff-menu"
                                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                                            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                                        >
                                            <div className="custom-staff-menu-specular" />
                                            <div className="custom-staff-menu-header">
                                                <span>{currentRole === 'admin' ? 'Yönetici Listesi' : (currentRole === 'kitchen' ? 'Mutfak Listesi' : 'Garson Listesi')}</span>
                                                <span className="staff-count-badge">{filteredStaff.length} Personel</span>
                                            </div>
                                            <div className="custom-staff-menu-list">
                                                {filteredStaff.map(staff => {
                                                    const isSelected = staff.id === selectedStaffId;
                                                    const cleanedName = cleanStaffName(staff.name);
                                                    return (
                                                        <motion.button
                                                            key={staff.id}
                                                            type="button"
                                                            className={`custom-staff-item ${isSelected ? 'selected' : ''}`}
                                                            onClick={() => {
                                                                playKeypadBeep();
                                                                setSelectedStaffId(staff.id);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            whileHover={{ x: 3, backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
                                                            whileTap={{ scale: 0.98 }}
                                                        >
                                                            <div className="staff-item-left">
                                                                <div className={`staff-item-avatar ${staff.role}`}>
                                                                    {staff.role === 'admin' ? (
                                                                        <Crown size={14} strokeWidth={2.4} />
                                                                    ) : staff.role === 'kitchen' ? (
                                                                        <ChefHat size={14} strokeWidth={2.4} />
                                                                    ) : (
                                                                        <User size={14} strokeWidth={2.4} />
                                                                    )}
                                                                </div>
                                                                <div className="staff-item-info">
                                                                    <span className="staff-item-name">{cleanedName}</span>
                                                                    <span className="staff-item-sub">
                                                                        {staff.role === 'admin' ? 'Yönetici • Tüm Yetkiler' : (staff.role === 'kitchen' ? 'Mutfak Ekibi' : 'Garson')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            {isSelected && (
                                                                <motion.div
                                                                    className="staff-item-check"
                                                                    initial={{ scale: 0 }}
                                                                    animate={{ scale: 1 }}
                                                                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                                                >
                                                                    <Check size={16} strokeWidth={3} />
                                                                </motion.div>
                                                            )}
                                                        </motion.button>
                                                    );
                                                })}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane (PIN Display & Dialpad) */}
                <div className="login-right-pane">
                    {/* PIN Dots (Interactive 6-Capsule Display) */}
                    <div className="login-pin-instruction">
                        6 Haneli PIN Kodunu Giriniz:
                    </div>
                    <div className="pin-display">
                        {[0, 1, 2, 3, 4, 5].map(idx => {
                            const isFilled = idx < enteredPin.length;
                            return (
                                <div
                                    key={idx}
                                    className={`pin-dot ${isFilled ? 'filled' : ''} ${isShaking ? 'error' : ''}`}
                                    id={`dot-${idx}`}
                                >
                                    {isFilled && (
                                        <motion.div
                                            className="pin-dot-fill-core"
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* 21st.dev Tactile Glass Dialpad */}
                    <div className="numpad">
                        {KEYPAD_BUTTONS.map((btn, i) => {
                            if (btn.action === 'clear') {
                                return (
                                    <motion.button
                                        key={i}
                                        type="button"
                                        className="num-btn btn-clear"
                                        onClick={clearPin}
                                        whileHover={{ scale: 1.04, y: -2 }}
                                        whileTap={{ scale: 0.92 }}
                                        title="PIN Temizle"
                                    >
                                        <Delete size={20} strokeWidth={2.4} />
                                        <span className="num-letters" style={{ color: '#f87171' }}>TEMİZLE</span>
                                    </motion.button>
                                );
                            }
                            if (btn.action === 'submit') {
                                return (
                                    <motion.button
                                        key={i}
                                        type="button"
                                        className="num-btn btn-submit"
                                        onClick={() => submitPin()}
                                        whileHover={{ scale: 1.04, y: -2 }}
                                        whileTap={{ scale: 0.92 }}
                                        title="Giriş Yap"
                                    >
                                        <Check size={22} strokeWidth={2.8} />
                                        <span className="num-letters" style={{ color: '#fbbf24' }}>GİRİŞ</span>
                                    </motion.button>
                                );
                            }
                            return (
                                <motion.button
                                    key={i}
                                    type="button"
                                    className="num-btn"
                                    onClick={() => pressNum(btn.digit)}
                                    whileHover={{ scale: 1.04, y: -2 }}
                                    whileTap={{ scale: 0.92 }}
                                >
                                    <span className="num-digit">{btn.digit}</span>
                                    <span className="num-letters">{btn.letters}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
