import gsap from 'gsap';

/**
 * Masa veya Ürün Kartları Listelendiğinde Zarif Dalga (Stagger) Animasyonu
 */
export function animateCardEntrance(selector = '.table-card') {
    try {
        const items = document.querySelectorAll(selector);
        if (!items.length) return;

        gsap.killTweensOf(items);

        // Maksimum ilk 24 kartı stagger yap (performans ve pürüzsüzlük garantisi)
        const animateItems = Array.from(items).slice(0, 24);
        const staggerTime = animateItems.length > 16 ? 0.012 : (animateItems.length > 8 ? 0.02 : 0.028);
        const durationTime = 0.26;

        gsap.fromTo(animateItems,
            { opacity: 0, y: 8, scale: 0.985 },
            { opacity: 1, y: 0, scale: 1, duration: durationTime, stagger: staggerTime, ease: 'power2.out' }
        );
    } catch (e) {
        console.warn('animateCardEntrance error:', e);
    }
}

/**
 * Sepete Yeni Ürün Eklendiğinde Satır Işıltısı ve Zıplaması
 */
export function animateCartRowAdd(rowElement) {
    if (!rowElement) return;
    try {
        gsap.fromTo(rowElement,
            { x: -18, opacity: 0, scale: 0.94 },
            { x: 0, opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.5)' }
        );
    } catch (e) {}
}

/**
 * Kartın Listeden Çıkıp Kaybolması
 */
export function animateCardExit(element, onComplete) {
    if (!element) return;
    try {
        gsap.to(element, {
            x: 60,
            opacity: 0,
            scale: 0.9,
            duration: 0.25,
            ease: 'power2.in',
            onComplete: () => {
                if (onComplete) onComplete();
            }
        });
    } catch (e) {
        if (onComplete) onComplete();
    }
}

/**
 * Login Kartı Titremesi (Hatalı PIN)
 */
export function shakeLoginCard() {
    const card = document.querySelector('.login-card');
    if (!card) return;
    try {
        gsap.to(card, {
            x: -12,
            repeat: 5,
            yoyo: true,
            duration: 0.05,
            ease: 'none',
            onComplete: () => {
                gsap.set(card, { x: 0 });
            }
        });
    } catch (e) {}
}

/**
 * PIN Dot Doldurulurken Zıplama
 */
export function bouncePinDot(dotElement) {
    if (!dotElement) return;
    try {
        gsap.fromTo(dotElement,
            { scale: 1.45 },
            { scale: 1, duration: 0.2, ease: 'back.out(2)' }
        );
    } catch (e) {}
}

/**
 * Uçan +1 Rozeti (Ürün Eklendiğinde)
 */
export function spawnFlyingBadge(targetCard, text = '+1') {
    if (!targetCard) return;
    try {
        const badge = document.createElement('div');
        badge.className = 'flying-add-badge';
        badge.textContent = text;
        targetCard.appendChild(badge);
        setTimeout(() => badge.remove(), 700);
    } catch (e) {}
}
