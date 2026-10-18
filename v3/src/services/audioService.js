// Ses ve Konuşma Servisi (Audio & Speech Synthesis)
let audioCtx = null;

// Global ses kapalılık durumu (localStorage senkronize)
let isSoundMuted = false;
try {
    isSoundMuted = localStorage.getItem('adisyon_sound_muted') === '1';
} catch (e) {}

export function setAudioMuted(muted) {
    isSoundMuted = !!muted;
    try {
        localStorage.setItem('adisyon_sound_muted', isSoundMuted ? '1' : '0');
    } catch (e) {}
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
    } catch (e) {}
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
        } catch (e) {}
    }
}

export function playNotificationSound() {
    if (isSoundMuted) return;
    try {
        initAudio();
        if (!audioCtx) return;
        const now = audioCtx.currentTime;
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(987.77, now);
        gain1.gain.setValueAtTime(0.4, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.5);

        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(659.25, now + 0.15);
        gain2.gain.setValueAtTime(0.4, now + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.7);
    } catch (e) {}
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
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do (C5) - Mi (E5) - Sol (G5) - Do (C6)
        notes.forEach((freq, idx) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            const start = now + (idx * 0.11);
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.45, start);
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(start);
            osc.stop(start + 0.65);
        });
    } catch (e) {}
}

export function speakAnnouncement(text) {
    if (isSoundMuted) return;
    try {
        if ('speechSynthesis' in window && text) {
            window.speechSynthesis.cancel();
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'tr-TR';
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    } catch (e) {}
}

export const speakTurkish = speakAnnouncement;

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
    } catch (e) {}
}
