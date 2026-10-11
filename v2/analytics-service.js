// analytics-service.js
// Personel Performans ve Sipariş İstatistikleri Yönetim Servisi

import { 
    db, 
    collection, 
    doc, 
    setDoc, 
    addDoc, 
    getDocs, 
    updateDoc, 
    query, 
    where, 
    orderBy 
} from "./firebase-config.js";

/**
 * 1. GARSON İSTATİSTİĞİ GÜNCELLEME
 * Garson sipariş kapattığında veya aldığında çağrılır.
 */
export async function updateWaiterStats(waiterId, orderAmount, itemsCount) {
    if (!waiterId) return;
    try {
        const waiterRef = doc(db, "waiters", waiterId);
        // Firestore'dan mevcut veriyi alıp kümülatif artıralım
        const waiterDoc = (await import("./firebase-config.js")).getDoc;
        let prevStats = { total_orders_count: 0, total_revenue: 0, total_items_sold: 0 };
        try {
            const snap = await waiterDoc(waiterRef);
            if (snap.exists()) prevStats = snap.data();
        } catch(e) {}

        const updated = {
            total_orders_count: (Number(prevStats.total_orders_count) || 0) + 1,
            total_revenue: (Number(prevStats.total_revenue) || 0) + Number(orderAmount || 0),
            total_items_sold: (Number(prevStats.total_items_sold) || 0) + Number(itemsCount || 0),
            last_order_at: new Date().toISOString()
        };

        await updateDoc(waiterRef, updated);
    } catch(e) {
        console.warn("Waiter stats update failed:", e);
    }
}

/**
 * 2. MUTFAK PERSONELİ İSTATİSTİĞİ GÜNCELLEME
 * Mutfak personeli siparişi teslim ettiğinde hazırlanma süresi ve adetleri günceller.
 */
export async function updateKitchenStats(kitchenStaffId, prepDurationSeconds, itemsCount) {
    if (!kitchenStaffId) return;
    try {
        const ktcRef = doc(db, "kitchen_staff", kitchenStaffId);
        const ktcDoc = (await import("./firebase-config.js")).getDoc;
        let prev = { total_orders_prepared: 0, total_items_prepared: 0, total_prep_seconds: 0 };
        try {
            const snap = await ktcDoc(ktcRef);
            if (snap.exists()) prev = snap.data();
        } catch(e) {}

        const newOrdersCount = (Number(prev.total_orders_prepared) || 0) + 1;
        const newTotalSecs = (Number(prev.total_prep_seconds) || 0) + Number(prepDurationSeconds || 0);
        const avgMins = Number(((newTotalSecs / newOrdersCount) / 60).toFixed(1));

        const updated = {
            total_orders_prepared: newOrdersCount,
            total_items_prepared: (Number(prev.total_items_prepared) || 0) + Number(itemsCount || 0),
            total_prep_seconds: newTotalSecs,
            avg_prep_time_minutes: avgMins,
            last_delivery_at: new Date().toISOString()
        };

        await updateDoc(ktcRef, updated);
    } catch(e) {
        console.warn("Kitchen stats update failed:", e);
    }
}

/**
 * 3. TAMAMLANAN ADİSYONU ARŞİVE & İSTATİSTİĞE KAYDETME
 * Sipariş kapatıldığında hem completed_orders tablosuna yazar hem garsonu günceller.
 */
export async function recordCompletedOrder(order, paymentMethod = 'cash') {
    if (!order) return;
    try {
        const nowIso = new Date().toISOString();
        const itemsCount = (order.items || []).reduce((s, i) => s + (Number(i.quantity) || 1), 0);
        
        const record = {
            table_no: Number(order.table_no),
            waiter_id: order.waiter_id || "wtr-1",
            waiter_name: order.waiter_name || "Ahmet",
            kitchen_staff_id: order.kitchen_staff_id || "ktc-1",
            kitchen_staff_name: order.kitchen_staff_name || "Fadime",
            
            // Zaman Verileri
            order_taken_at: order.order_received_at || order.updated_at || nowIso,
            kitchen_queued_at: order.kitchen_queued_at || order.updated_at || nowIso,
            kitchen_delivered_at: order.kitchen_delivered_at || order.delivered_at || nowIso,
            prep_duration_seconds: Number(order.prep_duration_seconds) || 420, // varsayılan 7 dk
            payment_collected_at: nowIso,
            
            // Finansal Veriler
            items: order.items || [],
            items_count: itemsCount,
            subtotal: Number(order.subtotal || order.total || 0),
            total: Number(order.total || 0),
            payment_method: paymentMethod, // 'cash' | 'card'
            status: 'closed',
            created_at: nowIso
        };

        const docRef = await addDoc(collection(db, "completed_orders"), record);
        
        // Garson istatistiğini anında artır
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
 * 4. PERSONEL HAREKET LOGU YAZMA (YÖNETİCİ CANLI TAKİBİ İÇİN)
 */
export async function logStaffActivity(staffId, staffName, role, action, tableNo, details = {}) {
    try {
        const log = {
            staff_id: staffId,
            staff_name: staffName,
            role: role,
            action: action, // 'order_taken', 'kitchen_delivered', 'payment_collected'
            table_no: tableNo,
            details: details,
            timestamp: new Date().toISOString()
        };
        await addDoc(collection(db, "staff_activity_logs"), log);
    } catch(e) {
        console.warn("Log activity failed:", e);
    }
}
