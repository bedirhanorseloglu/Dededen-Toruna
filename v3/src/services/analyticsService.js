// analyticsService.js
// Personel Performans ve Sipariş İstatistikleri Yönetim Servisi
import { 
    db, 
    collection, 
    doc, 
    setDoc,
    addDoc, 
    increment 
} from "../config/firebase";

/**
 * 1. GARSON İSTATİSTİĞİ GÜNCELLEME (0 Read, Atomik increment)
 */
export async function updateWaiterStats(waiterId, orderAmount, itemsCount) {
    if (!waiterId) return;
    try {
        const waiterRef = doc(db, "waiters", waiterId);
        await setDoc(waiterRef, {
            total_orders_count: increment(1),
            total_revenue: increment(Number(orderAmount || 0)),
            total_items_sold: increment(Number(itemsCount || 0)),
            last_order_at: new Date().toISOString()
        }, { merge: true });
    } catch(e) {
        console.warn("Waiter stats update failed:", e);
    }
}

/**
 * 2. TAMAMLANAN ADİSYONU ARŞİVE & İSTATİSTİĞE KAYDETME
 */
export async function recordCompletedOrder(order, paymentMethod = 'cash') {
    if (!order) return;
    try {
        const nowIso = new Date().toISOString();
        const itemsCount = (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
        
        const record = {
            table_no: Number(order.table_no),
            waiter_id: order.waiter_id || "wtr-1",
            waiter_name: order.waiter_name || "Garson",
            order_taken_at: order.created_at || order.updated_at || nowIso,
            payment_collected_at: nowIso,
            items: order.items || [],
            items_count: itemsCount,
            subtotal: Number(order.subtotal || order.total || 0),
            total: Number(order.total || 0),
            payment_method: paymentMethod, // 'cash' | 'card'
            status: 'closed',
            created_at: nowIso
        };

        const docRef = await addDoc(collection(db, "completed_orders"), record);
        record.id = docRef.id;

        // Yerel önbelleğe anında ekle (Admin paneli Firestore'u gereksiz okumasın)
        try {
            const raw = localStorage.getItem('cafe_cached_completed_orders');
            const cached = raw ? JSON.parse(raw) : [];
            cached.unshift(record);
            localStorage.setItem('cafe_cached_completed_orders', JSON.stringify(cached.slice(0, 1000)));
        } catch(e) {}
        
        if (record.waiter_id) {
            await updateWaiterStats(record.waiter_id, record.total, itemsCount);
        }

        return docRef.id;
    } catch(e) {
        console.warn("Record completed order failed:", e);
        return null;
    }
}

/**
 * 3. PERSONEL HAREKET LOGU YAZMA
 */
export async function logStaffActivity(staffId, staffName, role, action, tableNo, details = {}) {
    try {
        const log = {
            staff_id: staffId,
            staff_name: staffName,
            role: role,
            action: action, // 'order_taken', 'table_moved', 'payment_collected'
            table_no: tableNo,
            details: details,
            timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, "staff_activity_logs"), log);
    } catch(e) {
        console.warn("Log activity failed:", e);
    }
}
