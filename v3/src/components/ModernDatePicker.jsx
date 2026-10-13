import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Check } from 'lucide-react';

const MONTH_NAMES_TR = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

const DAY_NAMES_SHORT_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const DAY_NAMES_FULL_TR = [
    'Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'
];

/**
 * Modern Dark-Themed Glassmorphic Turkish Date Picker
 * @param {string} value - ISO date string "YYYY-MM-DD"
 * @param {function} onChange - Callback function(dateStr: "YYYY-MM-DD")
 * @param {string} [placeholder] - Placeholder text
 * @param {object} [style] - Custom trigger style overrides
 */
export default function ModernDatePicker({
    value,
    onChange,
    placeholder = 'Tarih Seçiniz',
    style = {},
    align = 'left'
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Seçili tarihe göre başlangıç ay ve yılını belirle
    const parsedDate = useMemo(() => {
        if (!value) return new Date();
        const parts = value.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            return new Date(y, m, d);
        }
        return new Date();
    }, [value]);

    const [viewYear, setViewYear] = useState(() => parsedDate.getFullYear());
    const [viewMonth, setViewMonth] = useState(() => parsedDate.getMonth());

    // value dışarıdan değiştiğinde görüntülenen ayı güncelle
    useEffect(() => {
        setViewYear(parsedDate.getFullYear());
        setViewMonth(parsedDate.getMonth());
    }, [parsedDate]);

    // Dışarı tıklandığında veya ESC basıldığında takvimi kapat
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('pointerdown', handleClickOutside);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('pointerdown', handleClickOutside);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    // Ay geçişleri
    const handlePrevMonth = (e) => {
        e.stopPropagation();
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(v => v - 1);
        } else {
            setViewMonth(v => v - 1);
        }
    };

    const handleNextMonth = (e) => {
        e.stopPropagation();
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(v => v + 1);
        } else {
            setViewMonth(v => v + 1);
        }
    };

    // Bugünün ISO tarihi
    const todayIso = useMemo(() => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }, []);

    // Dünün ISO tarihi
    const yesterdayIso = useMemo(() => {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }, []);

    // Seçili tarihin Türkçe görünümü
    const formattedDisplay = useMemo(() => {
        if (!value) return placeholder;
        const parts = value.split('-');
        if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            const dateObj = new Date(y, m, d);
            const dayName = DAY_NAMES_FULL_TR[dateObj.getDay()];
            const monthName = MONTH_NAMES_TR[m];
            return `${d} ${monthName} ${y}, ${dayName}`;
        }
        return value;
    }, [value, placeholder]);

    // Takvim günlerini hesapla (Pazartesi başlangıçlı)
    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
        const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
        const daysInMonth = lastDayOfMonth.getDate();

        // JS'de 0 Pazar, 1 Pazartesi... Pazartesi'yi 0 yapmak için:
        let startDayOfWeek = firstDayOfMonth.getDay() - 1;
        if (startDayOfWeek === -1) startDayOfWeek = 6;

        const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
        const days = [];

        // Önceki aydan kalan günler
        for (let i = startDayOfWeek - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
            const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
            const iso = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
            days.push({ dayNum, iso, isCurrentMonth: false });
        }

        // Bu ayın günleri
        for (let i = 1; i <= daysInMonth; i++) {
            const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ dayNum: i, iso, isCurrentMonth: true });
        }

        // Sonraki aydan tamamlanan günler (Toplam 35 veya 42 güne tamamla)
        const totalSlots = days.length <= 35 ? 35 : 42;
        const remaining = totalSlots - days.length;
        for (let i = 1; i <= remaining; i++) {
            const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
            const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
            const iso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            days.push({ dayNum: i, iso, isCurrentMonth: false });
        }

        return days;
    }, [viewYear, viewMonth]);

    const handleSelectDate = (iso) => {
        onChange?.(iso);
        setIsOpen(false);
    };

    return (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', userSelect: 'none' }}>
            {/* Tetikleyici Giriş Kutusu */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    background: isOpen ? 'rgba(245, 158, 11, 0.08)' : 'rgba(0, 0, 0, 0.35)',
                    border: isOpen ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.12)',
                    boxShadow: isOpen ? '0 0 14px rgba(245, 158, 11, 0.2)' : 'none',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    transition: 'all 0.2s ease',
                    ...style
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden', color: value ? 'white' : 'var(--text-muted)' }}>
                        {formattedDisplay}
                    </span>
                    {value === todayIso && (
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            background: 'rgba(16, 185, 129, 0.2)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            Bugün
                        </span>
                    )}
                </div>

                <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '8px',
                    background: isOpen ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isOpen ? 'white' : 'var(--brand-gold)',
                    flexShrink: 0,
                    transition: 'all 0.2s ease'
                }}>
                    <Calendar size={15} />
                </div>
            </div>

            {/* Açılır Modern Takvim Paneli (Dropdown) */}
            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        [align === 'right' ? 'right' : 'left']: 0,
                        zIndex: 9999,
                        background: 'rgba(15, 23, 42, 0.98)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.85), 0 0 25px rgba(245, 158, 11, 0.15)',
                        width: '320px',
                        maxWidth: '92vw',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    {/* Hızlı Seçim Butonları (Bugün / Dün) */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                            type="button"
                            onClick={() => handleSelectDate(todayIso)}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                                background: value === todayIso ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                color: value === todayIso ? '#34d399' : 'var(--text-secondary)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ⚡ Bugün
                        </button>
                        <button
                            type="button"
                            onClick={() => handleSelectDate(yesterdayIso)}
                            style={{
                                flex: 1,
                                padding: '6px 10px',
                                border: '1px solid rgba(245, 158, 11, 0.25)',
                                background: value === yesterdayIso ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                                color: value === yesterdayIso ? 'var(--brand-gold)' : 'var(--text-secondary)',
                                borderRadius: '8px',
                                fontSize: '11px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                        >
                            ⏮️ Dün
                        </button>
                    </div>

                    {/* Ay ve Yıl Başlığı & Yön Okları */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '4px 2px'
                    }}>
                        <button
                            type="button"
                            onClick={handlePrevMonth}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Önceki Ay"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div style={{
                            fontSize: '15px',
                            fontWeight: 800,
                            color: 'white',
                            letterSpacing: '0.3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}>
                            <span style={{ color: 'var(--brand-gold)' }}>{MONTH_NAMES_TR[viewMonth]}</span>
                            <span>{viewYear}</span>
                        </div>

                        <button
                            type="button"
                            onClick={handleNextMonth}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                background: 'rgba(255, 255, 255, 0.05)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                            }}
                            title="Sonraki Ay"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Gün Başlıkları (Pzt, Sal, Çar...) */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        textAlign: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        color: 'rgba(255, 255, 255, 0.4)',
                        paddingBottom: '4px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                        {DAY_NAMES_SHORT_TR.map((name, idx) => (
                            <div key={idx} style={{ padding: '4px 0' }}>
                                {name}
                            </div>
                        ))}
                    </div>

                    {/* Gün Kutucukları Izgarası */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(7, 1fr)',
                        gap: '4px'
                    }}>
                        {calendarDays.map((item, idx) => {
                            const isSelected = item.iso === value;
                            const isToday = item.iso === todayIso;

                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSelectDate(item.iso)}
                                    style={{
                                        aspectRatio: '1 / 1',
                                        width: '100%',
                                        borderRadius: '9px',
                                        border: isSelected
                                            ? '1px solid rgba(245, 158, 11, 0.8)'
                                            : isToday
                                                ? '1px solid rgba(16, 185, 129, 0.6)'
                                                : '1px solid transparent',
                                        background: isSelected
                                            ? 'linear-gradient(135deg, var(--brand-primary), #d97706)'
                                            : isToday
                                                ? 'rgba(16, 185, 129, 0.12)'
                                                : 'transparent',
                                        color: isSelected
                                            ? 'white'
                                            : item.isCurrentMonth
                                                ? (isToday ? '#34d399' : 'white')
                                                : 'rgba(255, 255, 255, 0.25)',
                                        fontSize: '12px',
                                        fontWeight: isSelected ? 900 : (item.isCurrentMonth ? 700 : 500),
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.12s ease',
                                        boxShadow: isSelected ? '0 4px 12px rgba(245, 158, 11, 0.4)' : 'none'
                                    }}
                                >
                                    <span>{item.dayNum}</span>
                                    {isToday && !isSelected && (
                                        <span style={{
                                            width: '4px',
                                            height: '4px',
                                            borderRadius: '50%',
                                            background: '#10b981',
                                            marginTop: '1px'
                                        }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Alt Kısım: Seçili Tarih Özeti & Kapat Butonu */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                        fontSize: '11px',
                        color: 'var(--text-muted)'
                    }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'white', fontWeight: 700 }}>
                            <Check size={13} className="text-amber-400" />
                            {value ? value.split('-').reverse().join('.') : 'Seçilmedi'}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--brand-gold)',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                padding: '4px 8px'
                            }}
                        >
                            Tamam
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
