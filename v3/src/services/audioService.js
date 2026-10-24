// Ses ve Konuşma Servisi (Audio & Speech Synthesis)
let audioCtx = null;

// Global ses kapalılık durumu (localStorage senkronize)
let isSoundMuted = false;
try {
    isSoundMuted = localStorage.getItem('adisyon_sound_muted') === '1';
} catch (e) { }

export function setAudioMuted(muted) {
    isSoundMuted = !!muted;
    try {
        localStorage.setItem('adisyon_sound_muted', isSoundMuted ? '1' : '0');
    } catch (e) { }
}

export function isAudioMuted() {
    return isSoundMuted;
}

export function initAudio() {
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    } catch (e) { }
}

export const unlockAudioContext = warmUpAudio;

export function warmUpAudio() {
    if (isSoundMuted) return;
    initAudio();
    if ('speechSynthesis' in window) {
        try {
            window.speechSynthesis.resume();
            const silent = new SpeechSynthesisUtterance(' ');
            silent.volume = 0.01;
            window.speechSynthesis.speak(silent);
        } catch (e) { }
    }
}

export function playNotificationSound() {
    if (isSoundMuted) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        // Mutfak gürültüsünü aşması için profesyonel ses kompresörü (Clipping önleyici dinamik yükseltici)
        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, now);
        compressor.knee.setValueAtTime(10, now);
        compressor.ratio.setValueAtTime(12, now);
        compressor.attack.setValueAtTime(0.002, now);
        compressor.release.setValueAtTime(0.2, now);
        compressor.connect(audioCtx.destination);

        // Yüksek güçlü ana kazanç (1.6x Boost)
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(1.6, now);
        masterGain.connect(compressor);

        // Katman 1: Yüksek ve parlak zil tonu (C6 - 1046 Hz)
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(1046.50, now);
        gain1.gain.setValueAtTime(0.95, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
        osc1.connect(gain1);
        gain1.connect(masterGain);
        osc1.start(now);
        osc1.stop(now + 0.55);

        // Katman 2: Orta armonik ton (E6 - 1318 Hz)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1318.51, now + 0.08);
        gain2.gain.setValueAtTime(0.9, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.65);

        // Katman 3: Dolgun çan yankısı (G5 - 784 Hz)
        const osc3 = audioCtx.createOscillator();
        const gain3 = audioCtx.createGain();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(783.99, now + 0.16);
        gain3.gain.setValueAtTime(0.95, now + 0.16);
        gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc3.connect(gain3);
        gain3.connect(masterGain);
        osc3.start(now + 0.16);
        osc3.stop(now + 0.85);
    } catch (e) { }
}

export const playChimeSound = playNotificationSound;
export const playKitchenNewOrderSound = playNotificationSound;
export const playDeliveryAlertSound = playOrderReadySound;

export function playOrderReadySound() {
    if (isSoundMuted) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;

        const compressor = audioCtx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-18, now);
        compressor.ratio.setValueAtTime(12, now);
        compressor.connect(audioCtx.destination);

        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(1.5, now);
        masterGain.connect(compressor);

        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do - Mi - Sol - Do
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const start = now + (idx * 0.11);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.9, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(start);
            osc.stop(start + 0.7);
        });
    } catch (e) { }
}

// Ses ve Konuşma Kuyruğu (FIFO Announcement Queue - Aynı anda gelen masaların birbirini ezmesini önler)
const speechQueue = [];
let isSpeechProcessing = false;
let speechWatchdogTimer = null;
let cachedVoices = [];

function loadVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            const v = window.speechSynthesis.getVoices() || [];
            if (v && v.length > 0) cachedVoices = v;
        } catch (e) {}
    }
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getBestTurkishVoice() {
    loadVoices();
    const voices = cachedVoices.length > 0 ? cachedVoices : (window.speechSynthesis?.getVoices?.() || []);
    if (voices.length === 0) return null;

    // Tüm Türkçe ses motorlarını normalize ederek filtrele (tr, tr-TR, tr_TR)
    const trVoices = voices.filter(v => {
        const l = (v.lang || '').toLowerCase().replace('_', '-');
        return l.startsWith('tr');
    });

    if (trVoices.length === 0) return null;

    // 1. Android Tablet Google Speech Services & Chrome Google Türkçe (en yüksek desibel)
    const googleVoice = trVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('google') || n.includes('network') || n.includes('online');
    });
    if (googleVoice) return googleVoice;

    // 2. iPad / iOS Türkçe (Yelda / Cem)
    const appleVoice = trVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('yelda') || n.includes('cem');
    });
    if (appleVoice) return appleVoice;

    // 3. Microsoft Natural / Online / Emel / Tolga
    const naturalVoice = trVoices.find(v => {
        const n = (v.name || '').toLowerCase();
        return n.includes('natural') || n.includes('emel') || n.includes('tolga');
    });
    if (naturalVoice) return naturalVoice;

    // 4. Bulunan ilk Türkçe ses motoru
    return trVoices[0];
}

function processNextAnnouncement() {
    if (isSoundMuted) {
        speechQueue.length = 0;
        isSpeechProcessing = false;
        return;
    }

    if (speechQueue.length === 0) {
        isSpeechProcessing = false;
        return;
    }

    if (!('speechSynthesis' in window)) {
        speechQueue.length = 0;
        isSpeechProcessing = false;
        return;
    }

    isSpeechProcessing = true;
    const nextItem = speechQueue.shift();
    const { text, withChime } = nextItem;

    try {
        if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
        }

        if (withChime) {
            playNotificationSound();
        }

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'tr-TR';
        // 0.88 hafif yavaş ve tok tempo: Ses kartı her heceyi tam rezonansta ve en yüksek gövde gücünde çıkartır
        utterance.rate = 0.88;
        // 1.02 doğal göğüs rezonansı: Sesi inceltip cılızlaştırmadan tok ve gür duyulmasını sağlar
        utterance.pitch = 1.02;
        utterance.volume = 1.0; // W3C standardında izin verilen mutlak tavan (%100)

        const bestTrVoice = getBestTurkishVoice();
        if (bestTrVoice) {
            utterance.voice = bestTrVoice;
        }

        let hasEnded = false;
        const finish = () => {
            if (hasEnded) return;
            hasEnded = true;
            if (speechWatchdogTimer) {
                clearTimeout(speechWatchdogTimer);
                speechWatchdogTimer = null;
            }
            // İki masa anonsu arasında aşçının net anlaması için 700ms nefes payı bırak:
            setTimeout(() => {
                processNextAnnouncement();
            }, 700);
        };

        utterance.onend = finish;
        utterance.onerror = finish;

        // Watchdog: Tarayıcıda onend tetiklenmezse kuyruk kilitlenmesin
        speechWatchdogTimer = setTimeout(() => {
            finish();
        }, 8000);

        // Çan sesinin ardından konuşmayı başlat
        const startDelay = withChime ? 520 : 50;
        setTimeout(() => {
            try {
                window.speechSynthesis.speak(utterance);
            } catch (err) {
                finish();
            }
        }, startDelay);
    } catch (e) {
        isSpeechProcessing = false;
        processNextAnnouncement();
    }
}

export function speakAnnouncement(text, withChime = false) {
    if (isSoundMuted || !text) return;
    // Aynı anons zaten kuyrukta bekliyorsa mükerrer ekleme
    if (speechQueue.some(item => item.text === text)) {
        return;
    }
    speechQueue.push({ text, withChime });
    if (!isSpeechProcessing) {
        processNextAnnouncement();
    }
}

export const speakTurkish = speakAnnouncement;

// Mutfak sipariş uyarı anons servisi (Mutfakta kaçırılmaması için çift tekrarlı ve tok tonlu)
export function announceKitchenOrder(tableNo, items = [], isExtra = false) {
    if (isSoundMuted) return;
    try {
        const text = isExtra 
            ? `Dikkat! Masa ${tableNo} için ek sipariş geldi. Tekrar ediyorum, Masa ${tableNo} ek sipariş!` 
            : `Dikkat! Masa ${tableNo} için yeni sipariş geldi. Tekrar ediyorum, Masa ${tableNo} yeni sipariş!`;
        speakAnnouncement(text, true);
    } catch (e) {}
}

// Tuş Takımı Hafif Tıklama Sesi (Tactile Keypad Click)
export function playKeypadBeep() {
    if (isSoundMuted) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(580, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.045);
    } catch (e) { }
}
