import { db, collection, getDocs, writeBatch, doc, setDoc } from '../config/firebase';

/**
 * Yerel saat dilimine göre YYYY-MM-DD formatında tarih dizesi döner.
 * UTC (toISOString) farkından kaynaklanan gece yarısı tarih sapmalarını önler.
 */
export function getLocalDateStr(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Firestore'daki kitchen_history koleksiyonunu temizler.
 * all = true ise tüm koleksiyonu sıfırlar (23:59 sıfırlaması veya manuel temizleme).
 * all = false ise sadece bugünden önceki (dünden ve daha eski günlerden kalan) eski kayıtları siler.
 * 450'lik batch paketleri kullanarak Firestore 500 sınırını aşmaz.
 */
export async function clearKitchenHistoryInFirestore({ all = false } = {}) {
    try {
        const todayStr = getLocalDateStr();
        const snap = await getDocs(collection(db, "kitchen_history"));
        if (snap.empty) return 0;

        const idsToDelete = [];
        snap.forEach(d => {
            const data = d.data() || {};
            if (all) {
                idsToDelete.push(d.id);
            } else {
                // Sadece bugünden önceki eski günleri temizle
                if (!data.date_str || data.date_str < todayStr) {
                    idsToDelete.push(d.id);
                }
            }
        });

        if (idsToDelete.length === 0) return 0;

        for (let i = 0; i < idsToDelete.length; i += 450) {
            const chunk = idsToDelete.slice(i, i + 450);
            const batch = writeBatch(db);
            chunk.forEach(id => {
                batch.delete(doc(db, "kitchen_history", id));
            });
            await batch.commit();
        }

        console.log(`[KitchenHistoryService] ${idsToDelete.length} adet mutfak geçmiş kaydı Firestore'dan temizlendi.`);
        return idsToDelete.length;
    } catch (err) {
        console.error("[KitchenHistoryService] clearKitchenHistoryInFirestore error:", err);
        return 0;
    }
}

/**
 * Mutfak geçmişini anında sıfırlar (Tüm cihazlar ve Firestore için).
 */
export async function resetKitchenHistoryNow() {
    const todayStr = getLocalDateStr();
    const nowIso = new Date().toISOString();
    const nowTime = Date.now();

    // 1. Firestore'daki tüm kitchen_history kayıtlarını sil (kotayı ve depolamayı korur)
    await clearKitchenHistoryInFirestore({ all: true });

    // 2. Diğer cihazların ve açık ekranların anında sıfırlanması için Firestore ayarlarını güncelle
    try {
        await setDoc(doc(db, "settings", "kitchen_history_state"), {
            last_reset_at: nowIso,
            last_reset_timestamp: nowTime,
            last_reset_date: todayStr,
            updated_at: nowIso
        }, { merge: true });
    } catch (e) {
        console.warn("[KitchenHistoryService] setDoc error:", e);
    }

    // 3. LocalStorage'a kaydet
    try {
        localStorage.setItem(`kitchen_reset_done_${todayStr}`, 'true');
        localStorage.setItem('kitchen_last_reset_timestamp', String(nowTime));
        localStorage.setItem('kitchen_last_reset_date', todayStr);
    } catch (e) { }

    return nowTime;
}

/**
 * Saat 23:59 kontrolü ve eski gün temizliği:
 * 1. Eğer saat 23:59 veya sonrasıysa ve bugünkü 23:59 sıfırlaması henüz yapılmadıysa -> Tam Sıfırlama
 * 2. Eğer gün değiştiyse veya dünden/önceki günlerden kalma eski kayıtlar varsa -> Eski kayıtları sil
 */
export async function checkAndExecuteKitchen2359Reset({ onReset } = {}) {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayStr = getLocalDateStr(now);
        const resetKey = `kitchen_reset_done_${todayStr}`;

        // 1. Saat 23:59 Kontrolü (Günün son dakikasında mutfak geçmişini tamamen sıfırla)
        if (currentHour === 23 && currentMinute >= 59) {
            const alreadyResetToday = localStorage.getItem(resetKey) === 'true';
            if (!alreadyResetToday) {
                console.log(`[KitchenHistoryService] 🌙 Saat 23:59! Mutfak geçmişi otomatik sıfırlanıyor...`);
                const resetTime = await resetKitchenHistoryNow();
                if (onReset) onReset(resetTime);
                return { reset: true, reason: '2359_auto_reset' };
            }
        }

        // 2. Eğer dünden veya önceki günlerden kalan kayıtlar varsa temizle
        const lastResetDate = localStorage.getItem('kitchen_last_reset_date');
        if (lastResetDate && lastResetDate < todayStr) {
            // Dünün sıfırlama bayrağını temizle, eski gün kayıtlarını sil
            const deletedCount = await clearKitchenHistoryInFirestore({ all: false });
            localStorage.setItem('kitchen_last_reset_date', todayStr);
            if (deletedCount > 0) {
                console.log(`[KitchenHistoryService] Dünden kalan ${deletedCount} mutfak kaydı temizlendi.`);
                if (onReset) onReset(Date.now());
            }
        } else if (!lastResetDate) {
            // İlk kez açılıyorsa dünden kalan eski kayıtları temizle
            const deletedCount = await clearKitchenHistoryInFirestore({ all: false });
            localStorage.setItem('kitchen_last_reset_date', todayStr);
            if (deletedCount > 0 && onReset) {
                onReset(Date.now());
            }
        }

        return { reset: false };
    } catch (err) {
        console.error("[KitchenHistoryService] checkAndExecuteKitchen2359Reset error:", err);
        return { reset: false, error: err };
    }
}
