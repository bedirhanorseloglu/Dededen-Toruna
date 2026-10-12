import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useApp, DEFAULT_USERS } from '../context/AppContext';
import { playChimeSound } from '../services/audioService';

export default function LoginView() {
    const { login, showToast } = useApp();
    const [currentRole, setCurrentRole] = useState('waiter');
    const [selectedStaffId, setSelectedStaffId] = useState('');
    const [enteredPin, setEnteredPin] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const filteredStaff = DEFAULT_USERS.filter(u => u.role === currentRole);

    useEffect(() => {
        if (filteredStaff.length > 0) {
            setSelectedStaffId(filteredStaff[0].id);
        } else {
            setSelectedStaffId('');
        }
        setEnteredPin('');
    }, [currentRole]);

    const pressNum = (num) => {
        if (enteredPin.length < 6) {
            const next = enteredPin + num;
            setEnteredPin(next);

            if (next.length === 6) {
                setTimeout(() => submitPin(next), 60);
            }
        }
    };

    const clearPin = () => {
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
            login(staff);
        } else {
            showToast("Hatalı PIN Kodu!", "danger");
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500);
            clearPin();
        }
    };

    return (
        <div className="login-screen">
            <motion.div 
                className="login-card"
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={isShaking ? { x: [-12, 12, -10, 10, -5, 5, 0], opacity: 1, scale: 1, y: 0 } : { opacity: 1, scale: 1, y: 0, x: 0 }}
                transition={isShaking ? { duration: 0.4 } : { duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            >
                <div style={{ marginBottom: '14px' }}>
                    <img 
                        src="/logo.png" 
                        alt="Dededen Toruna"
                        style={{
                            width: '88px',
                            height: '88px',
                            borderRadius: '50%',
                            border: '3px solid var(--brand-primary)',
                            boxShadow: '0 0 24px rgba(247, 103, 7, 0.45)',
                            objectFit: 'cover'
                        }}
                    />
                </div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px', color: 'white' }}>
                    Dededen Toruna
                </h1>
                <p style={{
                    fontSize: '13px',
                    color: 'var(--brand-gold)',
                    fontWeight: 700,
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                }}>
                    Hamsiköy Sütlacı & Adisyon
                </p>

                {/* Role Selector */}
                <div className="role-selector">
                    <button 
                        className={`role-btn ${currentRole === 'waiter' ? 'active' : ''}`}
                        onClick={() => setCurrentRole('waiter')}
                    >
                        <span style={{ fontSize: '24px' }}>📱</span> Garson
                    </button>
                    <button 
                        className={`role-btn ${currentRole === 'admin' ? 'active' : ''}`}
                        onClick={() => setCurrentRole('admin')}
                    >
                        <span style={{ fontSize: '24px' }}>👑</span> Yönetici
                    </button>
                </div>

                {/* Staff Select Dropdown */}
                <div style={{ textAlign: 'left', marginBottom: '14px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                        Personel Seçiniz:
                    </label>
                    <select
                        id="staff-select"
                        value={selectedStaffId}
                        onChange={(e) => setSelectedStaffId(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--bg-surface-elevated)',
                            border: '1px solid var(--border-card)',
                            color: 'white',
                            borderRadius: 'var(--radius-md)',
                            marginTop: '6px',
                            fontSize: '15px',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {filteredStaff.map(staff => (
                            <option key={staff.id} value={staff.id}>
                                {staff.name} {staff.role === 'admin' ? '(Tüm Yetkiler)' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* PIN Dots */}
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '15px', fontWeight: 600 }}>
                    6 Haneli PIN Kodunu Giriniz:
                </div>
                <div className="pin-display">
                    {[0, 1, 2, 3, 4, 5].map(idx => (
                        <div 
                            key={idx}
                            className={`pin-dot ${idx < enteredPin.length ? 'filled' : ''}`}
                            id={`dot-${idx}`}
                        />
                    ))}
                </div>

                {/* Numpad */}
                <div className="numpad">
                    <button className="num-btn" onClick={() => pressNum('1')}>1</button>
                    <button className="num-btn" onClick={() => pressNum('2')}>2</button>
                    <button className="num-btn" onClick={() => pressNum('3')}>3</button>
                    <button className="num-btn" onClick={() => pressNum('4')}>4</button>
                    <button className="num-btn" onClick={() => pressNum('5')}>5</button>
                    <button className="num-btn" onClick={() => pressNum('6')}>6</button>
                    <button className="num-btn" onClick={() => pressNum('7')}>7</button>
                    <button className="num-btn" onClick={() => pressNum('8')}>8</button>
                    <button className="num-btn" onClick={() => pressNum('9')}>9</button>
                    <button className="num-btn" style={{ color: 'var(--danger)' }} onClick={clearPin}>C</button>
                    <button className="num-btn" onClick={() => pressNum('0')}>0</button>
                    <button 
                        className="num-btn" 
                        style={{ color: 'var(--brand-primary)', fontSize: '26px' }}
                        onClick={() => submitPin()}
                    >
                        ✓
                    </button>
                </div>

                {/* Hızlı Test Girişleri */}
                <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-card)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 700 }}>
                        HIZLI TEST GİRİŞLERİ
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                            type="button" 
                            className="btn-outline"
                            onClick={() => login(DEFAULT_USERS[0])}
                            style={{ padding: '6px 10px', fontSize: '12px', borderColor: 'var(--brand-gold)', color: 'var(--brand-gold)' }}
                        >
                            👑 Patron
                        </button>
                        <button 
                            type="button" 
                            className="btn-outline"
                            onClick={() => login(DEFAULT_USERS[1])}
                            style={{ padding: '6px 10px', fontSize: '12px', borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                            📱 Ahmet
                        </button>
                        <button 
                            type="button" 
                            className="btn-outline"
                            onClick={() => login(DEFAULT_USERS[2])}
                            style={{ padding: '6px 10px', fontSize: '12px', borderColor: 'var(--success)', color: 'var(--success)' }}
                        >
                            📱 Mehmet
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
