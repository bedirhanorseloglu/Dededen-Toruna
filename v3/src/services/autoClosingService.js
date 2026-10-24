import { db, collection, getDocs, doc, setDoc } from '../config/firebase';
import { resetKitchenHistoryNow } from './kitchenHistoryService';

const TURKISH_MONTHS = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
];

/**
 * Belirtilen tarih için gün sonu özetinin alınıp alınmadığını kontrol eder.
 * Alınmamışsa ve saat 23:59 gelmişse otomatik olarak özeti kaydeder.
 */
export async function checkAndExecuteDailyClosing({
    completedOrders = [],
    expenses = [],
    showToast = null
}) {
    try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Kontrol edilecek tarihler:
        // 1. Bugün: Eğer saat >= 23:59 ise bugün kontrol edilir.
        // 2. Dün: Eğer dün 23:59 geçmiş ve dünün kapanış raporu hiç alınmamışsa, dünün raporu otomatik kaydedilir.
        const datesToCheck = [];

        // Bugün için kontrol: Saat 23:59 veya sonrası mı?
        if (currentHour === 23 && currentMinute >= 59) {
            datesToCheck.push(now);
        }

        // Dün için kontrol: Dün gece 23:59'da sistem kapalıydıysa ve dün satış olmuşsa dün de kapatılmalı
        const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        datesToCheck.push(yesterday);

        for (const targetDate of datesToCheck) {
            const year = targetDate.getFullYear();
            const month = String(targetDate.getMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`; // '2026-10-17'
            const displayDate = `${day}.${month}.${year}`; // '17.10.2026'
            const reportNoPrefix = `Z-${year}${month}${day}`;
            const mIdx = targetDate.getMonth();
            const monthName = TURKISH_MONTHS[mIdx] || month;

            // 1. Yerel bayrak kontrolü (Bu tarih için bu oturumda işlem yapıldı mı?)
            const localDoneKey = `auto_closing_done_${dateStr}`;
            if (localStorage.getItem(localDoneKey) === 'true') {
                continue;
            }

            // 2. Mevcut kaydedilmiş raporlarda bu güne ait Z raporu var mı?
            let hasExistingReport = false;

            // LocalStorage kontrolü
            try {
                const rawReports = localStorage.getItem('cafe_saved_daily_reports');
                if (rawReports) {
                    const parsed = JSON.parse(rawReports);
                    if (Array.isArray(parsed)) {
                        hasExistingReport = parsed.some(r => {
                            if (!r) return false;
                            if (r.date === displayDate) return true;
                            if (r.docId && r.docId.includes(dateStr)) return true;
                            if (r.reportNo && r.reportNo.startsWith(reportNoPrefix)) return true;
                            return false;
                        });
                    }
                }
            } catch (e) {
                console.warn("Auto closing local check warning:", e);
            }

            // Eğer localde bulunamadıysa Firestore'u kontrol et
            if (!hasExistingReport) {
                try {
                    const snap = await getDocs(collection(db, "daily_reports"));
                    if (!snap.empty) {
                        hasExistingReport = snap.docs.some(d => {
                            const data = d.data() || {};
                            if (d.id && d.id.includes(dateStr)) return true;
                            if (data.date === displayDate) return true;
                            if (data.reportNo && data.reportNo.startsWith(reportNoPrefix)) return true;
                            return false;
                        });
                    }
                } catch (err) {
                    console.warn("Auto closing firestore check warning:", err);
                }
            }

            if (hasExistingReport) {
                // Zaten rapor alınmış, tekrar otomatik rapor oluşturmaya gerek yok
                localStorage.setItem(localDoneKey, 'true');
                continue;
            }

            // 3. O güne ait siparişleri ve giderleri filtrele
            const startOfDay = new Date(year, targetDate.getMonth(), targetDate.getDate(), 0, 0, 0).getTime();
            const endOfDay = new Date(year, targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999).getTime();

            const dayOrders = (completedOrders || []).filter(o => {
                const t = new Date(o.created_at || o.closed_at || 0).getTime();
                if (t >= startOfDay && t <= endOfDay) return true;
                const oDate = (o.created_at || o.closed_at || '').slice(0, 10);
                return oDate === dateStr;
            });

            const dayExpenses = (expenses || []).filter(e => {
                if (e.date) return e.date === dateStr;
                const t = new Date(e.created_at || 0).getTime();
                return t >= startOfDay && t <= endOfDay;
            });

            // Eğer o gün hiç sipariş ve gider yoksa boş rapor oluşturma, bayrağı işaretle
            if (dayOrders.length === 0 && dayExpenses.length === 0) {
                localStorage.setItem(localDoneKey, 'true');
                continue;
            }

            // 4. Finansal Toplamları Hesapla
            const totalRevenue = dayOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
            const discountTotal = dayOrders.reduce((s, o) => s + (Number(o.discount) || 0), 0);
            const cashTotal = dayOrders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const cardTotal = dayOrders.filter(o => o.payment_method === 'card').reduce((s, o) => s + (Number(o.total) || 0), 0);
            const orderCount = dayOrders.length;
            const avgOrder = orderCount > 0 ? totalRevenue / orderCount : 0;

            const expensesTotal = dayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
            const cashExpenses = dayExpenses.filter(e => e.payment_method === 'cash').reduce((s, e) => s + (Number(e.amount) || 0), 0);
            const netCash = cashTotal - cashExpenses;
            const netProfit = totalRevenue - expensesTotal;

            let totalItemsCount = 0;
            dayOrders.forEach(o => {
                (o.items || []).forEach(it => {
                    totalItemsCount += (Number(it.quantity) || 1);
                });
            });

            const docId = `auto_closing_${dateStr}`;
            const reportNo = `${reportNoPrefix}-AUTO`;
            const title = `${parseInt(day, 10)} ${monthName} ${year} • Otomatik Gün Sonu Özeti (23:59)`;

            const closingDoc = {
                docId,
                reportNo,
                title,
                customTitle: title,
                date: displayDate,
                time: '23:59',
                savedAt: new Date().toISOString(),
                period: 'today',
                isAutoClosing: true,
                autoSavedAt: new Date().toISOString(),
                totalRevenue,
                discountTotal,
                cashTotal,
                cardTotal,
                expensesTotal,
                cashExpenses,
                netCash,
                netProfit,
                orderCount,
                avgOrder,
                totalItemsCount
            };

            // 5. Yerel Depolamaya Kaydet
            try {
                const rawPrev = localStorage.getItem('cafe_saved_daily_reports');
                const prevList = rawPrev ? JSON.parse(rawPrev) : [];
                const filtered = Array.isArray(prevList) ? prevList.filter(p => p.docId !== docId && p.reportNo !== reportNo) : [];
                const nextList = [closingDoc, ...filtered].slice(0, 100);
                localStorage.setItem('cafe_saved_daily_reports', JSON.stringify(nextList));
            } catch (e) {
                console.warn("Auto closing local save warning:", e);
            }

            // 6. Firestore'a Kaydet
            try {
                await setDoc(doc(db, "daily_reports", docId), closingDoc);
            } catch (err1) {
                try {
                    await setDoc(doc(db, "daily_closings", docId), closingDoc);
                } catch (err2) {
                    console.warn("Auto closing firestore save error:", err2);
                }
            }

            localStorage.setItem(localDoneKey, 'true');

            // 7. Mutfak Geçmişini 23:59'da Sıfırla (Firestore veritabanında gereksiz yer tutmasını önler)
            try {
                await resetKitchenHistoryNow();
                console.log("[AutoClosingService] 23:59 mutfak geçmişi sıfırlandı.");
            } catch (kErr) {
                console.warn("[AutoClosingService] Kitchen history reset error:", kErr);
            }

            if (showToast) {
                showToast(`🌙 23:59 Gün Sonu Özeti otomatik olarak kaydedildi ve arşive eklendi! (${reportNo})`, 'success');
            }
            console.log(`[AutoClosingService] ${dateStr} için otomatik gün sonu özeti başarıyla kaydedildi!`);
        }
    } catch (globalErr) {
        console.error("AutoClosingService global error:", globalErr);
    }
}
