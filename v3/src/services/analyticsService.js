// analyticsService.js
// Personel Performans ve Sipariş İstatistikleri Yönetim Servisi
import { 
    db, 
    collection, 
    doc, 
    updateDoc,
    addDoc, 
    increment 
} from "../config/firebase";

/**
 * 1. GARSON İSTATİSTİĞİ GÜNCELLEME (0 Read, Atomik increment)
 * Sadece veritabanında gerçekten var olan garsonları günceller.
 * Yöneticiler (mgr-), tanımsız/geçersiz id'ler için asla garson dokümanı oluşturmaz.
 */
export async function updateWaiterStats(waiterId, orderAmount, itemsCount) {
    if (!waiterId) return;
    const idStr = String(waiterId).trim();
    if (
        idStr === 'undefined' || 
        idStr === 'null' || 
        idStr === '' || 
        idStr.startsWith('mgr') || 
        idStr.startsWith('admin')
    ) {
        return;
    }

    try {
        const waiterRef = doc(db, "waiters", idStr);
        // updateDoc doküman yoksa YENİ HAREKETSİZ/HAYALET DOKÜMAN YARATMAZ
        await updateDoc(waiterRef, {
            total_orders_count: increment(1),
            total_revenue: increment(Number(orderAmount || 0)),
            total_items_sold: increment(Number(itemsCount || 0)),
            last_order_at: new Date().toISOString()
        });
    } catch(e) {
        // Garson dokümanı mevcut değilse hata yutulur ve hayalet garson yaratılması önlenir
        console.warn("Waiter stats update skipped/failed:", e?.message || e);
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
        
        // Yönetici / Patron kontrolü
        const isManager = 
            String(order.waiter_id || '').startsWith('mgr') || 
            String(order.waiter_id || '').startsWith('admin') ||
            String(order.waiter_name || '').toLowerCase().includes('yönetici') ||
            String(order.waiter_name || '').toLowerCase().includes('patron');

        let cleanWaiterId = order.waiter_id;
        if (!cleanWaiterId || cleanWaiterId === 'undefined' || cleanWaiterId === 'null') {
            cleanWaiterId = isManager ? 'mgr-1' : 'wtr-1';
        }

        let cleanWaiterName = order.waiter_name;
        if (!cleanWaiterName || cleanWaiterName === 'undefined' || cleanWaiterName === 'null') {
            cleanWaiterName = isManager ? 'Yönetici' : 'Garson';
        }

        const discountAmount = Number(order.discount || 0);
        const subtotalAmount = Number(order.subtotal || order.total || 0);
        const totalAmount = Number(order.total !== undefined ? order.total : Math.max(0, subtotalAmount - discountAmount));

        const record = {
            table_no: Number(order.table_no),
            waiter_id: cleanWaiterId,
            waiter_name: cleanWaiterName,
            order_taken_at: order.created_at || order.updated_at || nowIso,
            payment_collected_at: nowIso,
            items: order.items || [],
            items_count: itemsCount,
            subtotal: subtotalAmount,
            discount: discountAmount,
            discount_reason: order.discount_reason || '',
            total: totalAmount,
            payment_method: paymentMethod, // 'cash' | 'card'
            status: 'closed',
            created_at: nowIso
        };

        const docRef = await addDoc(collection(db, "completed_orders"), record);
        record.id = docRef.id;

        if (discountAmount > 0) {
            logStaffActivity(
                cleanWaiterId,
                cleanWaiterName,
                isManager ? 'admin' : 'waiter',
                'discount_applied',
                order.table_no,
                { discount: discountAmount, reason: order.discount_reason || 'İndirim/İkram', total: totalAmount }
            );
        }

        // Yerel önbelleğe anında ekle (Admin paneli Firestore'u gereksiz okumasın)
        try {
            const raw = localStorage.getItem('cafe_cached_completed_orders');
            const cached = raw ? JSON.parse(raw) : [];
            cached.unshift(record);
            localStorage.setItem('cafe_cached_completed_orders', JSON.stringify(cached.slice(0, 1000)));
        } catch(e) {}
        
        // YALNIZCA gerçek garson ise garson istatistiğini güncelle (Yönetici için garson koleksiyonu tetiklenmez!)
        if (!isManager && cleanWaiterId && !cleanWaiterId.startsWith('mgr')) {
            await updateWaiterStats(cleanWaiterId, record.total, itemsCount);
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
