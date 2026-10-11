// seed-stats.js
// Firestore Test Veritabanı ve İstatistik Oluşturucu

import { 
    db, 
    collection, 
    doc, 
    setDoc, 
    addDoc 
} from "./firebase-config.js";

export async function seedCompleteStaffAndAnalytics() {
    console.log("Starting staff and analytics seed...");

    // 1. YÖNETİCİLER TABLOSU (managers)
    const managers = [
        {
            id: "mgr-1",
            name: "Yönetici (Patron)",
            role: "admin",
            pin: "197300",
            phone: "0532 100 20 30",
            active: true,
            permissions: ["all", "reports", "staff_management", "expenses", "discounts", "audit"],
            created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
            last_login_at: new Date().toISOString()
        }
    ];

    // 2. GARSONLAR TABLOSU (waiters) - Detaylı Satış İstatistikleri Dahil
    const waiters = [
        {
            id: "wtr-1",
            name: "Ahmet",
            role: "waiter",
            pin: "123456",
            phone: "0541 222 33 44",
            active: true,
            total_orders_count: 24,
            total_revenue: 9480,
            total_items_sold: 72,
            top_selling_product: "Hamsiköy Sütlacı",
            created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            last_order_at: new Date(Date.now() - 25 * 60000).toISOString()
        },
        {
            id: "wtr-2",
            name: "Mehmet",
            role: "waiter",
            pin: "654321",
            phone: "0542 333 44 55",
            active: true,
            total_orders_count: 16,
            total_revenue: 6140,
            total_items_sold: 48,
            top_selling_product: "Karışık Tost",
            created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            last_order_at: new Date(Date.now() - 45 * 60000).toISOString()
        },
        {
            id: "wtr-3",
            name: "Ayşe",
            role: "waiter",
            pin: "111111",
            phone: "0543 444 55 66",
            active: true,
            total_orders_count: 20,
            total_revenue: 8320,
            total_items_sold: 61,
            top_selling_product: "Fincan Çay",
            created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
            last_order_at: new Date(Date.now() - 12 * 60000).toISOString()
        }
    ];

    // 3. MUTFAK ÇALIŞANLARI TABLOSU (kitchen_staff) - Hazırlık Süresi & Teslim İstatistikleri Dahil
    const kitchenStaff = [
        {
            id: "ktc-1",
            name: "Fadime",
            role: "kitchen",
            pin: "112233",
            section: "Tatlı & Fırın Şefi",
            active: true,
            total_orders_prepared: 42,
            total_items_prepared: 136,
            total_prep_seconds: 18144, // Toplam 302 dakika
            avg_prep_time_minutes: 7.2,
            fastest_prep_minutes: 3.5,
            created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
            last_delivery_at: new Date(Date.now() - 15 * 60000).toISOString()
        },
        {
            id: "ktc-2",
            name: "Emre Usta",
            role: "kitchen",
            pin: "223344",
            section: "Sıcak Mutfak & Izgara",
            active: true,
            total_orders_prepared: 28,
            total_items_prepared: 84,
            total_prep_seconds: 14784,
            avg_prep_time_minutes: 8.8,
            fastest_prep_minutes: 4.0,
            created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
            last_delivery_at: new Date(Date.now() - 35 * 60000).toISOString()
        }
    ];

    // Firestore Yazma İşlemleri
    const writes = [];

    // Managers
    for (const m of managers) {
        writes.push(setDoc(doc(db, "managers", m.id), m));
    }
    // Waiters
    for (const w of waiters) {
        writes.push(setDoc(doc(db, "waiters", w.id), w));
    }
    // Kitchen Staff
    for (const k of kitchenStaff) {
        writes.push(setDoc(doc(db, "kitchen_staff", k.id), k));
    }

    // 4. ÖRNEK TAMAMLANMIŞ ADİSYONLAR (completed_orders) - Zengin Analiz İçin
    const sampleCompletedOrders = [
        {
            id: "ord-test-101",
            table_no: 6,
            waiter_id: "wtr-1",
            waiter_name: "Ahmet",
            kitchen_staff_id: "ktc-1",
            kitchen_staff_name: "Fadime",
            order_taken_at: new Date(Date.now() - 110 * 60000).toISOString(),
            kitchen_queued_at: new Date(Date.now() - 110 * 60000 + 5000).toISOString(),
            kitchen_delivered_at: new Date(Date.now() - 103 * 60000).toISOString(),
            prep_duration_seconds: 420, // 7.0 dk
            payment_collected_at: new Date(Date.now() - 75 * 60000).toISOString(),
            items: [
                { name: "Hamsiköy Sütlacı", quantity: 2, price: 120, category: "Tatlılar" },
                { name: "Türk Kahvesi", quantity: 2, price: 60, category: "Sıcak İçecekler" }
            ],
            items_count: 4,
            subtotal: 360,
            total: 360,
            payment_method: "card",
            status: "closed"
        },
        {
            id: "ord-test-102",
            table_no: 3,
            waiter_id: "wtr-3",
            waiter_name: "Ayşe",
            kitchen_staff_id: "ktc-1",
            kitchen_staff_name: "Fadime",
            order_taken_at: new Date(Date.now() - 95 * 60000).toISOString(),
            kitchen_queued_at: new Date(Date.now() - 95 * 60000 + 4000).toISOString(),
            kitchen_delivered_at: new Date(Date.now() - 89 * 60000).toISOString(),
            prep_duration_seconds: 360, // 6.0 dk
            payment_collected_at: new Date(Date.now() - 60 * 60000).toISOString(),
            items: [
                { name: "Kadayıf + Dondurma", quantity: 1, price: 160, category: "Tatlılar" },
                { name: "Fincan Çay", quantity: 2, price: 30, category: "Sıcak İçecekler" }
            ],
            items_count: 3,
            subtotal: 220,
            total: 220,
            payment_method: "cash",
            status: "closed"
        },
        {
            id: "ord-test-103",
            table_no: 12,
            waiter_id: "wtr-2",
            waiter_name: "Mehmet",
            kitchen_staff_id: "ktc-2",
            kitchen_staff_name: "Emre Usta",
            order_taken_at: new Date(Date.now() - 80 * 60000).toISOString(),
            kitchen_queued_at: new Date(Date.now() - 80 * 60000 + 6000).toISOString(),
            kitchen_delivered_at: new Date(Date.now() - 70 * 60000).toISOString(),
            prep_duration_seconds: 600, // 10.0 dk
            payment_collected_at: new Date(Date.now() - 40 * 60000).toISOString(),
            items: [
                { name: "Sac Kavurma", quantity: 1, price: 340, category: "Yemekler" },
                { name: "Günün Menüsü", quantity: 1, price: 280, category: "Yemekler" },
                { name: "Kola", quantity: 2, price: 50, category: "Soğuk İçecekler" }
            ],
            items_count: 4,
            subtotal: 720,
            total: 720,
            payment_method: "card",
            status: "closed"
        },
        {
            id: "ord-test-104",
            table_no: 1,
            waiter_id: "wtr-1",
            waiter_name: "Ahmet",
            kitchen_staff_id: "ktc-1",
            kitchen_staff_name: "Fadime",
            order_taken_at: new Date(Date.now() - 65 * 60000).toISOString(),
            kitchen_queued_at: new Date(Date.now() - 65 * 60000 + 3000).toISOString(),
            kitchen_delivered_at: new Date(Date.now() - 58 * 60000).toISOString(),
            prep_duration_seconds: 420, // 7.0 dk
            payment_collected_at: new Date(Date.now() - 25 * 60000).toISOString(),
            items: [
                { name: "Serpme Kahvaltı", quantity: 1, price: 450, category: "Kahvaltı" },
                { name: "Fincan Çay", quantity: 3, price: 30, category: "Sıcak İçecekler" }
            ],
            items_count: 4,
            subtotal: 540,
            total: 540,
            payment_method: "card",
            status: "closed"
        },
        {
            id: "ord-test-105",
            table_no: 10,
            waiter_id: "wtr-3",
            waiter_name: "Ayşe",
            kitchen_staff_id: "ktc-2",
            kitchen_staff_name: "Emre Usta",
            order_taken_at: new Date(Date.now() - 50 * 60000).toISOString(),
            kitchen_queued_at: new Date(Date.now() - 50 * 60000 + 4000).toISOString(),
            kitchen_delivered_at: new Date(Date.now() - 41 * 60000).toISOString(),
            prep_duration_seconds: 540, // 9.0 dk
            payment_collected_at: new Date(Date.now() - 15 * 60000).toISOString(),
            items: [
                { name: "Et Wrap", quantity: 1, price: 260, category: "Dürüm & Sandviç" },
                { name: "Hamburger", quantity: 1, price: 240, category: "Fast Food" },
                { name: "Ayran", quantity: 2, price: 35, category: "Soğuk İçecekler" }
            ],
            items_count: 4,
            subtotal: 570,
            total: 570,
            payment_method: "cash",
            status: "closed"
        }
    ];

    for (const ord of sampleCompletedOrders) {
        writes.push(setDoc(doc(db, "completed_orders", ord.id), ord));
    }

    await Promise.all(writes);
    console.log("All staff and sample orders seeded successfully into Firestore!");
    return { managers, waiters, kitchenStaff, sampleCompletedOrders };
}
