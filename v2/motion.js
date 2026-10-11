// ==========================================================================
// DEDEDEN TORUNA — MOTION & TRANSITION ENGINE (GSAP)
// ==========================================================================

const gsap = window.gsap || null;

/**
 * Sayfalar arası anında ve akıcı geçiş (Zero-lag Instant Navigation)
 * @param {string} url - Gidilecek URL
 */
export function pageNavigate(url) {
    if (!url || url === '#' || url.startsWith('javascript:')) return;
    window.location.href = url;
}

// Global window erişimi
if (typeof window !== 'undefined') {
    window.pageNavigate = pageNavigate;
}

export function initPageAnimations() {
    if (!window.gsap) return;

    const loginCard = document.querySelector('.login-card');
    if (loginCard) {
        window.gsap.fromTo(loginCard,
            { scale: 0.96, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.25, ease: 'power2.out' }
        );
    }
}

/**
 * Masa veya Ürün Kartları Listelendiğinde Zarif Dalga (Stagger) Animasyonu
 * @param {string} selector - Kart seçici (örn: '.table-card', '.product-item-card')
 */
export function animateCardEntrance(selector = '.table-card') {
    if (!window.gsap) return;
    const items = document.querySelectorAll(selector);
    if (!items.length) return;

    window.gsap.killTweensOf(items);

    const staggerTime = items.length > 20 ? 0.004 : (items.length > 10 ? 0.012 : 0.025);
    const durationTime = items.length > 20 ? 0.18 : 0.28;

    window.gsap.fromTo(items,
        { opacity: 0, y: 10, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: durationTime, stagger: staggerTime, ease: 'power1.out' }
    );
}

/**
 * Kartın Listeden Çıkıp Kaybolması (Mutfak "✓ Hazır" veya "Kaldır")
 * @param {HTMLElement} element - Çıkarılacak HTML elemanı
 * @param {Function} onComplete - Animasyon bittiğinde çalışacak fonksiyon
 */
export function animateCardExit(element, onComplete) {
    if (!element) return;
    if (window.gsap) {
        window.gsap.to(element, {
            x: 60,
            opacity: 0,
            scale: 0.9,
            height: 0,
            marginBottom: 0,
            paddingTop: 0,
            paddingBottom: 0,
            duration: 0.35,
            ease: 'power2.in',
            onComplete: () => {
                element.remove();
                if (onComplete) onComplete();
            }
        });
    } else {
        element.style.transition = '0.3s ease';
        element.style.opacity = '0';
        element.style.transform = 'translateX(60px)';
        setTimeout(() => {
            element.remove();
            if (onComplete) onComplete();
        }, 300);
    }
}

/**
 * Sepete Yeni Ürün Eklendiğinde Satır Işıltısı ve Zıplaması
 * @param {HTMLElement} rowElement - Eklenen sepet satırı
 */
export function animateCartRowAdd(rowElement) {
    if (!rowElement) return;
    if (window.gsap) {
        window.gsap.fromTo(rowElement,
            { x: -15, opacity: 0, scale: 0.95 },
            { x: 0, opacity: 1, scale: 1, duration: 0.28, ease: 'back.out(1.4)' }
        );
    } else {
        rowElement.classList.add('item-updated');
    }
}

/**
 * Modal Açılış Animasyonu
 * @param {HTMLElement} overlayEl - Modal overlay elemanı
 */
export function openModalWithMotion(overlayEl) {
    if (!overlayEl) return;
    overlayEl.style.display = 'flex';
    const content = overlayEl.querySelector('.modal-content') || overlayEl.firstElementChild;

    if (window.gsap) {
        window.gsap.fromTo(overlayEl, 
            { opacity: 0 }, 
            { opacity: 1, duration: 0.22, ease: 'power2.out' }
        );
        if (content) {
            window.gsap.fromTo(content,
                { scale: 0.85, opacity: 0, y: 20 },
                { scale: 1, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(1.5)' }
            );
        }
    } else {
        overlayEl.style.opacity = '1';
        if (content) {
            content.style.opacity = '1';
            content.style.transform = 'scale(1)';
        }
    }
}

/**
 * Modal Kapanış Animasyonu
 * @param {HTMLElement} overlayEl - Modal overlay elemanı
 * @param {Function} onDone - Bittiğinde çağrılacak fonksiyon
 */
export function closeModalWithMotion(overlayEl, onDone) {
    if (!overlayEl) return;
    const content = overlayEl.querySelector('.modal-content') || overlayEl.firstElementChild;

    if (window.gsap) {
        if (content) {
            window.gsap.to(content, {
                scale: 0.9,
                opacity: 0,
                duration: 0.2,
                ease: 'power2.in'
            });
        }
        window.gsap.to(overlayEl, {
            opacity: 0,
            duration: 0.22,
            ease: 'power2.in',
            onComplete: () => {
                overlayEl.style.display = 'none';
                if (onDone) onDone();
            }
        });
    } else {
        overlayEl.style.display = 'none';
        if (onDone) onDone();
    }
}

/**
 * Modern Awwwards Glass Toast Bildirimi
 * @param {string} message - Bildirim mesajı
 * @param {'success'|'warning'|'danger'|'info'} type - Bildirim türü
 */
export function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-notification';

    let iconChar = '✓';
    let typeClass = 'success';
    if (type === 'warning') { iconChar = '🔔'; typeClass = 'warning'; }
    if (type === 'danger')  { iconChar = '✕'; typeClass = 'danger'; }
    if (type === 'info')    { iconChar = 'ℹ️'; typeClass = 'info'; }

    toast.innerHTML = `
        <span class="toast-icon-badge ${typeClass}">${iconChar}</span>
        <span style="letter-spacing: -0.2px; font-weight: 700;">${message}</span>
    `;
    document.body.appendChild(toast);

    if (window.gsap) {
        window.gsap.fromTo(toast,
            { y: -50, opacity: 0, scale: 0.88 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.6)' }
        );

        setTimeout(() => {
            window.gsap.to(toast, {
                y: -30,
                opacity: 0,
                scale: 0.92,
                duration: 0.28,
                ease: 'power2.in',
                onComplete: () => toast.remove()
            });
        }, 2500);
    } else {
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 2400);
    }
}

/**
 * Awwwards Seviyesinde Çift Taraflı Konfeti Patlaması (Ödeme & Başarı)
 */
export function triggerPaymentCelebration() {
    // Konfeti efekti kullanıcı isteğiyle tamamen devre dışı bırakıldı
}

/**
 * Modern Awwwards Onay Modalı (Browser confirm yerine)
 * @param {Object} options
 * @param {string} options.title - Başlık
 * @param {string} options.message - Açıklama metni
 * @param {string} options.confirmText - Onay buton metni
 * @param {string} options.cancelText - İptal buton metni
 * @param {'danger'|'primary'|'warning'} options.type - Tip
 * @returns {Promise<boolean>}
 */
export function showConfirmModal({
    title = 'Onay Gerekiyor',
    message = 'Bu işlemi onaylıyor musunuz?',
    confirmText = 'Evet, Onayla',
    cancelText = 'Vazgeç',
    type = 'danger'
} = {}) {
    return new Promise((resolve) => {
        const existing = document.getElementById('custom-confirm-modal');
        if (existing) existing.remove();

        const overlay = document.createElement('div');
        overlay.id = 'custom-confirm-modal';
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        overlay.style.zIndex = '999999';
        overlay.style.backdropFilter = 'blur(12px)';
        overlay.style.webkitBackdropFilter = 'blur(12px)';
        overlay.style.backgroundColor = 'rgba(10, 6, 6, 0.72)';

        let iconSymbol = '⚠️';
        let iconBg = 'rgba(239, 68, 68, 0.15)';
        let iconBorder = 'rgba(239, 68, 68, 0.35)';
        let btnGradient = 'linear-gradient(135deg, #ef4444, #dc2626)';
        let btnGlow = '0 8px 24px rgba(239, 68, 68, 0.35)';

        if (type === 'primary') {
            iconSymbol = '💳';
            iconBg = 'rgba(247, 103, 7, 0.15)';
            iconBorder = 'rgba(247, 103, 7, 0.35)';
            btnGradient = 'linear-gradient(135deg, var(--brand-primary), #d9480f)';
            btnGlow = '0 8px 24px rgba(247, 103, 7, 0.4)';
        } else if (type === 'warning') {
            iconSymbol = '🗑️';
            iconBg = 'rgba(245, 159, 0, 0.15)';
            iconBorder = 'rgba(245, 159, 0, 0.35)';
            btnGradient = 'linear-gradient(135deg, #f59f00, #d97706)';
            btnGlow = '0 8px 24px rgba(245, 159, 0, 0.4)';
        }

        overlay.innerHTML = `
            <div class="modal-content custom-confirm-card" style="text-align: center; max-width: 410px; width: 90%; padding: 32px 28px; border-radius: 28px; background: rgba(22, 14, 13, 0.95); backdrop-filter: blur(28px); -webkit-backdrop-filter: blur(28px); border: 1px solid rgba(247, 103, 7, 0.28); box-shadow: 0 30px 80px rgba(0,0,0,0.85), 0 0 40px rgba(247, 103, 7, 0.18);">
                <div style="width: 64px; height: 64px; border-radius: 20px; background: ${iconBg}; border: 1px solid ${iconBorder}; margin: 0 auto 18px; display: flex; align-items: center; justify-content: center; font-size: 28px; box-shadow: inset 0 2px 8px rgba(255,255,255,0.08);">
                    ${iconSymbol}
                </div>
                <h3 style="font-size: 21px; font-weight: 800; color: #ffffff; margin-bottom: 10px; letter-spacing: -0.4px;">${title}</h3>
                <p style="font-size: 14px; color: var(--text-secondary); line-height: 1.55; margin-bottom: 26px; font-weight: 500;">${message}</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <button class="btn-confirm-cancel" style="flex: 1; padding: 14px; font-size: 14px; font-weight: 700; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.14); color: #cbd5e1; cursor: pointer; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                        ${cancelText}
                    </button>
                    <button class="btn-confirm-ok" style="flex: 1.2; padding: 14px; font-size: 14px; font-weight: 800; border-radius: var(--radius-md); background: ${btnGradient}; color: white; border: none; cursor: pointer; box-shadow: ${btnGlow}; transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const card = overlay.querySelector('.custom-confirm-card');
        const btnCancel = overlay.querySelector('.btn-confirm-cancel');
        const btnOk = overlay.querySelector('.btn-confirm-ok');

        // Hover efektleri
        btnCancel.onmouseenter = () => {
            btnCancel.style.background = 'rgba(255, 255, 255, 0.12)';
            btnCancel.style.color = '#ffffff';
            btnCancel.style.transform = 'translateY(-1px)';
        };
        btnCancel.onmouseleave = () => {
            btnCancel.style.background = 'rgba(255, 255, 255, 0.06)';
            btnCancel.style.color = '#cbd5e1';
            btnCancel.style.transform = 'translateY(0)';
        };

        btnOk.onmouseenter = () => {
            btnOk.style.transform = 'translateY(-2px) scale(1.02)';
            btnOk.style.filter = 'brightness(1.08)';
        };
        btnOk.onmouseleave = () => {
            btnOk.style.transform = 'translateY(0) scale(1)';
            btnOk.style.filter = 'brightness(1)';
        };

        if (window.gsap) {
            window.gsap.fromTo(overlay, { opacity: 0 }, { opacity: 1, duration: 0.2 });
            window.gsap.fromTo(card,
                { scale: 0.82, opacity: 0, y: 30 },
                { scale: 1, opacity: 1, y: 0, duration: 0.38, ease: 'back.out(1.6)' }
            );
        }

        let isClosed = false;
        const closeWithResult = (result) => {
            if (isClosed) return;
            isClosed = true;
            document.removeEventListener('keydown', handleKey);

            if (window.gsap) {
                window.gsap.to(card, { scale: 0.88, opacity: 0, duration: 0.18, ease: 'power2.in' });
                window.gsap.to(overlay, {
                    opacity: 0,
                    duration: 0.2,
                    ease: 'power2.in',
                    onComplete: () => {
                        overlay.remove();
                        resolve(result);
                    }
                });
            } else {
                overlay.remove();
                resolve(result);
            }
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') closeWithResult(false);
            if (e.key === 'Enter') closeWithResult(true);
        };
        document.addEventListener('keydown', handleKey);

        btnCancel.onclick = () => closeWithResult(false);
        btnOk.onclick = () => closeWithResult(true);

        // Overlay backdrop tıklandığında iptal et
        overlay.onclick = (e) => {
            if (e.target === overlay) closeWithResult(false);
        };
    });
}

// Sayfa yüklendiğinde otomatik animasyonları başlat
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPageAnimations);
    } else {
        initPageAnimations();
    }
}
