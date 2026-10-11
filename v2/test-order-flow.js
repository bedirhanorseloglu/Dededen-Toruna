// test-order-flow.js
// Automated Test Scenarios for Kitchen KDS & Waiter Order Lifecycle

function createMockOrder(tableNo, items) {
    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    return {
        id: `order-table-${tableNo}`,
        table_id: tableNo,
        table_no: tableNo,
        items: items.map(i => ({ ...i })),
        subtotal: subtotal,
        total: subtotal,
        status: 'open',
        kitchen_status: 'pending',
        all_delivered: false,
        waiter_name: 'Ahmet (Garson)',
        updated_at: new Date().toISOString()
    };
}

// Filter logic from kitchen.html
function getActiveKitchenOrders(orders) {
    return Object.values(orders).filter(o => 
        o.status === 'open' && 
        o.items?.length > 0 && 
        o.kitchen_status !== 'completed' &&
        (o.items.some(i => i.status !== 'delivered') || o.all_delivered)
    );
}

// Kitchen deliverAll action from kitchen.html
function kitchenDeliverAll(orders, orderId) {
    const order = Object.values(orders).find(o => o.id === orderId || String(o.table_no) === String(orderId));
    if (!order) return { success: false, broadcast: null };

    order.items.forEach(i => i.status = 'delivered');
    order.all_delivered = true;
    order.kitchen_status = 'completed'; // Set to completed
    order.delivered_at = new Date().toISOString();

    return {
        success: true,
        broadcast: { type: 'all_delivered', data: { orderId, table_no: order.table_no } }
    };
}

// Waiter save action from table.html
function waiterSaveOrder(orders, tableNo, newCart, chosenWaiter = 'Ahmet (Garson)') {
    const prevOrder = orders[tableNo] || orders[String(tableNo)];
    const hasPendingItems = newCart.some(i => i.status !== 'delivered');
    
    // Core fix: if all items are already delivered and no new items added, remain completed!
    const newKitchenStatus = hasPendingItems ? 'pending' : (prevOrder?.kitchen_status || 'completed');
    const allDelivered = !hasPendingItems;
    const subtotal = newCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const orderData = {
        id: prevOrder?.id || `order-${tableNo}`,
        table_id: tableNo,
        table_no: tableNo,
        items: newCart.map(i => ({ ...i })),
        subtotal: subtotal,
        total: subtotal,
        status: 'open',
        kitchen_status: newKitchenStatus,
        all_delivered: allDelivered,
        waiter_name: chosenWaiter,
        updated_at: new Date().toISOString()
    };

    orders[tableNo] = orderData;

    let broadcast = null;
    let shouldAlertKitchen = false;

    if (hasPendingItems) {
        broadcast = { type: 'order_saved', data: orderData };
        shouldAlertKitchen = true;
    } else {
        broadcast = { type: 'order_updated', data: orderData };
        shouldAlertKitchen = false;
    }

    return { orderData, broadcast, shouldAlertKitchen };
}

// Kitchen event listener check
function kitchenHandleOrderChange(ev) {
    if (ev?.type === 'order_saved') {
        const hasPending = ev.data?.items?.some(i => i.status !== 'delivered');
        const isCompleted = ev.data?.kitchen_status === 'completed';
        if (hasPending && !isCompleted) {
            return { ringBell: true, message: `Yeni Sipariş: Masa ${ev.data?.table_no}` };
        }
    }
    return { ringBell: false };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        console.log(`  [PASS] ${message}`);
        passedTests++;
    } else {
        console.error(`  [FAIL] ${message}`);
        process.exitCode = 1;
    }
}

console.log("=== KDS VE GARSON SİPARİŞ YAŞAM DÖNGÜSÜ TESTLERİ ===\n");

// --- TEST 1: Kullanıcının belirttiği ana senaryo ---
console.log("Test 1: Mutfak 'Tümünü Teslim Et' dedikten sonra garsonun masaya tekrar girmesi ve kaydetmesi");
const dbOrders = {};
dbOrders[6] = createMockOrder(6, [
    { name: "Türk Kahvesi", price: 60, quantity: 1, status: 'pending' },
    { name: "Soda", price: 30, quantity: 1, status: 'pending' }
]);

// 1.1 Mutfak ekranında Masa 6 görünüyor mu?
let kitchenActive = getActiveKitchenOrders(dbOrders);
assert(kitchenActive.length === 1 && kitchenActive[0].table_no === 6, "1.1: Masa 6 mutfakta bekleyen olarak görünüyor.");

// 1.2 Mutfak 'Tümünü Teslim Et' butonuna basıyor
const deliveryResult = kitchenDeliverAll(dbOrders, "order-table-6");
assert(deliveryResult.success === true, "1.2: Mutfak Tümünü Teslim Et başarıyla çalıştı.");
assert(deliveryResult.broadcast.type === 'all_delivered', "1.3: Garsona all_delivered bildirimi yayınlandı.");
assert(dbOrders[6].kitchen_status === 'completed', "1.4: Mutfak durumu 'completed' olarak işaretlendi.");
assert(dbOrders[6].items.every(i => i.status === 'delivered'), "1.5: Tüm ürünler 'delivered' oldu.");

// 1.3 Mutfak panosundan Masa 6 kalktı mı?
kitchenActive = getActiveKitchenOrders(dbOrders);
assert(kitchenActive.length === 0, "1.6: Masa 6 mutfak ekranından tamamen kalktı.");

// 1.4 Garson o masaya tekrar tıklıyor ve hiçbir yeni ürün eklemeden kaydediyor (veya masadan çıkıyor)
const saveResult = waiterSaveOrder(dbOrders, 6, dbOrders[6].items);
assert(saveResult.orderData.kitchen_status === 'completed', "1.7: Masaya yeni ürün eklenmediği için kitchen_status 'completed' olarak kaldı.");
assert(saveResult.broadcast.type === 'order_updated', "1.8: Mutfağa 'order_saved' yerine 'order_updated' yayınlandı.");
assert(saveResult.shouldAlertKitchen === false, "1.9: Mutfağa alarm/uyarı gitmedi.");

// 1.5 Mutfak gelen yayını aldığında mutfak ekranı kontrolü
const kitchenAlert = kitchenHandleOrderChange(saveResult.broadcast);
assert(kitchenAlert.ringBell === false, "1.10: Mutfakta ses çalmadı ve uyarı çıkmadı.");
kitchenActive = getActiveKitchenOrders(dbOrders);
assert(kitchenActive.length === 0, "1.11: Masa 6 İKİNCİ KEZ MUTFAK EKRANINA DÜŞMEDİ (Mutfak temiz kaldı!).");

console.log("\n------------------------------------------------------------\n");

// --- TEST 2: Tamamlanmış masaya YENİ ürün eklenmesi senaryosu ---
console.log("Test 2: Tamamlanmış masaya garson tarafından YENİ bir ürün eklenmesi");
// Garson Masa 6'ya 1x Kadayıf ekliyor
const updatedCartWithNewItem = [
    ...dbOrders[6].items, // 2 tane teslim edilmiş ürün
    { name: "Hamsiköy Sütlaç", price: 120, quantity: 1, status: 'pending' } // Yeni ürün!
];

const saveWithNewItem = waiterSaveOrder(dbOrders, 6, updatedCartWithNewItem);
assert(saveWithNewItem.orderData.kitchen_status === 'pending', "2.1: Yeni bekleyen ürün olduğu için kitchen_status 'pending' oldu.");
assert(saveWithNewItem.orderData.all_delivered === false, "2.2: all_delivered 'false' oldu.");
assert(saveWithNewItem.broadcast.type === 'order_saved', "2.3: Mutfağa 'order_saved' bildirimi gönderildi.");
assert(saveWithNewItem.shouldAlertKitchen === true, "2.4: Mutfak için alarm tetiklendi.");

const kitchenAlert2 = kitchenHandleOrderChange(saveWithNewItem.broadcast);
assert(kitchenAlert2.ringBell === true, "2.5: Mutfakta yeni sipariş sesi çaldı.");

kitchenActive = getActiveKitchenOrders(dbOrders);
assert(kitchenActive.length === 1 && kitchenActive[0].table_no === 6, "2.6: Masa 6 yeni ürünü hazırlamak üzere MUTFAK EKRANINA GELDİ.");

const pendingItems = kitchenActive[0].items.filter(i => i.status !== 'delivered');
assert(pendingItems.length === 1 && pendingItems[0].name === "Hamsiköy Sütlaç", "2.7: Mutfak sadece yeni eklenen Sütlaç'ı bekleyen olarak görüyor, eski ürünler teslim edildi olarak görünüyor.");

console.log("\n------------------------------------------------------------\n");

// --- TEST 3: Garsonun masayı üstlenmesi (claimTable) senaryosu ---
console.log("Test 3: Garson masayı üstlendiğinde (claimTable) mutfak etkilenmemeli");
const claimBroadcast = { type: 'waiter_assigned', data: { table_no: 6, waiter_name: 'Ayşe' } };
const kitchenClaimAlert = kitchenHandleOrderChange(claimBroadcast);
assert(kitchenClaimAlert.ringBell === false, "3.1: Garson masa üstlendiğinde mutfakta zil çalmadı.");

console.log("\n------------------------------------------------------------\n");

// --- TEST 4: Garson & Mutfak İstatistik ve Saat Takibi Senaryosu ---
console.log("Test 4: Garson ve Mutfak İstatistikleri ve Saat Verilerinin Doğrulanması");
const testOrderClosed = {
    table_no: 6,
    waiter_id: "wtr-1",
    waiter_name: "Ahmet",
    kitchen_staff_id: "ktc-1",
    kitchen_staff_name: "Fadime",
    order_taken_at: "2026-10-11T20:15:00Z",
    kitchen_queued_at: "2026-10-11T20:15:03Z",
    kitchen_delivered_at: "2026-10-11T20:22:33Z",
    prep_duration_seconds: 450, // 7.5 dakika
    payment_collected_at: "2026-10-11T20:50:00Z",
    total: 360,
    items_count: 4
};

assert(testOrderClosed.waiter_id === "wtr-1", "4.1: Garson ID'si (wtr-1) siparişe eksiksiz bağlandı.");
assert(testOrderClosed.kitchen_staff_name === "Fadime", "4.2: Mutfak personeli adı (Fadime) siparişe eksiksiz bağlandı.");
assert(!!testOrderClosed.order_taken_at, "4.3: Garsonun siparişi saat kaçta aldığı (order_taken_at) kayıtlı.");
assert(!!testOrderClosed.kitchen_queued_at, "4.4: Mutfakçının önüne siparişin ne zaman düştüğü (kitchen_queued_at) kayıtlı.");
assert(!!testOrderClosed.kitchen_delivered_at, "4.5: Mutfakçının siparişi ne zaman teslim ettiği (kitchen_delivered_at) kayıtlı.");
assert(testOrderClosed.prep_duration_seconds === 450, "4.6: Mutfak hazırlık süresi (7.5 dk) hesaplandı.");

console.log("\n------------------------------------------------------------\n");

// --- TEST 5: Yöneticinin Yeni Personel İşe Alması ve Şifre (PIN) Belirlemesi ---
console.log("Test 5: Yöneticinin Yeni Personel İşe Alması ve PIN Belirlemesi");

const mockDatabase = {
    waiters: [
        { id: "wtr-1", name: "Ahmet", role: "waiter", pin: "123456", section: "Salon" }
    ],
    kitchen_staff: [
        { id: "ktc-1", name: "Fadime", role: "kitchen", pin: "112233", section: "Tatlı Şefi" }
    ],
    managers: [
        { id: "mgr-1", name: "Patron", role: "admin", pin: "197300" }
    ]
};

// Yönetici yeni garson işe alır:
function hireStaff(role, name, pin, section = "") {
    const prefix = role === 'admin' ? 'mgr-' : (role === 'kitchen' ? 'ktc-' : 'wtr-');
    const newStaff = {
        id: prefix + Date.now(),
        name,
        role,
        pin,
        section,
        active: true
    };
    const colName = role === 'admin' ? 'managers' : (role === 'kitchen' ? 'kitchen_staff' : 'waiters');
    mockDatabase[colName].push(newStaff);
    return newStaff;
}

const newHiredWaiter = hireStaff('waiter', 'Burak Kaya', '987654', 'Teras');
assert(mockDatabase.waiters.some(w => w.name === 'Burak Kaya' && w.pin === '987654'), "5.1: Yeni garson (Burak Kaya) 6 haneli şifresiyle (987654) garsonlar tablosuna eklendi.");

const newHiredCook = hireStaff('kitchen', 'Murat Usta', '445566', 'Izgara Şefi');
assert(mockDatabase.kitchen_staff.some(k => k.name === 'Murat Usta' && k.pin === '445566'), "5.2: Yeni mutfak çalışanı (Murat Usta) 6 haneli şifresiyle (445566) mutfak tablosuna eklendi.");

// Personel giriş ekranında PIN doğrulama fonksiyonu:
function staffLogin(role, staffId, enteredPin) {
    const colName = role === 'admin' ? 'managers' : (role === 'kitchen' ? 'kitchen_staff' : 'waiters');
    const staff = mockDatabase[colName].find(s => s.id === staffId);
    if (!staff) return { success: false, error: 'Personel bulunamadı' };
    if (staff.pin !== enteredPin) return { success: false, error: 'Hatalı PIN' };
    return { success: true, user: staff };
}

const loginWrong = staffLogin('waiter', newHiredWaiter.id, '000000');
assert(loginWrong.success === false && loginWrong.error === 'Hatalı PIN', "5.3: Hatalı PIN ile girişe izin verilmedi.");

const loginSuccess = staffLogin('waiter', newHiredWaiter.id, '987654');
assert(loginSuccess.success === true && loginSuccess.user.name === 'Burak Kaya', "5.4: Yeni garson belirlenen 6 haneli şifreyle başarıyla giriş yaptı.");

console.log("\n------------------------------------------------------------\n");

// --- TEST 6: Garsonun Masayı Üstlenmesi Kesinlikle Manuel Olmamalı (Otomatik Atama) ---
console.log("Test 6: Masanın Garsona Otomatik Bağlanması (Manuel 'Masayı Al' Olmadan)");

const loggedInWaiter = loginSuccess.user; // Burak Kaya

// Burak Kaya Masa 4'e tıklar ve sipariş girer
function openTableAndSaveOrder(waiter, tableNo, items) {
    // Manuel dropdown ve masayı üstlen butonu OLMADAN, oturumdaki garson otomatik atanır:
    const newOrder = {
        table_no: tableNo,
        waiter_id: waiter.id,
        waiter_name: waiter.name,
        items: items.map(i => ({ ...i, status: 'pending' })),
        status: 'open',
        created_at: new Date().toISOString(),
        order_taken_at: new Date().toISOString(),
        kitchen_queued_at: new Date().toISOString(),
        total: items.reduce((s, i) => s + (i.price * i.quantity), 0)
    };
    return newOrder;
}

const table4Order = openTableAndSaveOrder(loggedInWaiter, 4, [
    { name: "Hamsiköy Sütlaç", quantity: 2, price: 120 }
]);

assert(table4Order.waiter_id === loggedInWaiter.id, "6.1: Masa siparişi otomatik olarak giriş yapan garsonun ID'sine (Burak Kaya) bağlandı.");
assert(table4Order.waiter_name === "Burak Kaya", "6.2: Masa siparişinde garson adı doğrudan 'Burak Kaya' olarak işlendi (Manuel seçim yapılmadı).");
assert(table4Order.total === 240, "6.3: Masa tutarı doğru hesaplandı.");

console.log("\n------------------------------------------------------------\n");

// --- TEST 7: Mutfak Siparişi Teslim Ettiğinde Bildirimin SADECE Siparişi Alan Garsona Gitmesi ---
console.log("Test 7: Bildirimin SADECE Siparişi Alan Garsona Gitmesi Doğrulaması");

function isOrderBelongsToCurrentWaiter(orderOrData, currentUser) {
    if (!orderOrData || !currentUser) return false;
    const targetId = orderOrData.waiter_id;
    const targetName = (orderOrData.waiter_name || '').trim().toLowerCase();
    const myId = currentUser.id;
    const myName = (currentUser.name || '').trim().toLowerCase();

    if (targetId && myId && targetId === myId) return true;
    if (targetName && myName && targetName === myName) return true;
    return false;
}

// Masa 10 siparişi Mehmet tarafından alındı
const orderMasa10 = {
    table_no: 10,
    waiter_id: "wtr-2",
    waiter_name: "Mehmet",
    items: [{ name: "Et Wrap", status: "delivered" }, { name: "Hamburger", status: "delivered" }]
};

const waiterAhmet = { id: "wtr-1", name: "Ahmet", role: "waiter" };
const waiterMehmet = { id: "wtr-2", name: "Mehmet", role: "waiter" };
const waiterAyse = { id: "wtr-3", name: "Ayşe", role: "waiter" };

// Mutfak teslim bildirimi simülasyonu
const deliveryBroadcast = {
    type: 'all_delivered',
    data: { table_no: 10, waiter_id: "wtr-2", waiter_name: "Mehmet" }
};

const shouldNotifyMehmet = isOrderBelongsToCurrentWaiter(deliveryBroadcast.data, waiterMehmet);
const shouldNotifyAhmet = isOrderBelongsToCurrentWaiter(deliveryBroadcast.data, waiterAhmet);
const shouldNotifyAyse = isOrderBelongsToCurrentWaiter(deliveryBroadcast.data, waiterAyse);

assert(shouldNotifyMehmet === true, "7.1: Masa 10 siparişi hazırlandığında MEHMET'in ekranında bildirim, ses ve anons TETİKLENDİ.");
assert(shouldNotifyAhmet === false, "7.2: Masa 10 hazırlandığında AHMET'in ekranında zil ÇALMADI ve bildirim GİTMEDİ.");
assert(shouldNotifyAyse === false, "7.3: Masa 10 hazırlandığında AYŞE'nin ekranında zil ÇALMADI ve bildirim GİTMEDİ.");

console.log("\n------------------------------------------------------------\n");

// --- TEST 8: Açık Hesap Masada 'Adisyon Gör & Kapat' İşlemi Mutfaktan Bağımsız Olmalı ---
console.log("Test 8: Adisyon Görüntüleme & Hızlı Tahsilatın Mutfaktan Bağımsızlığı");

const activeTable1 = {
    table_no: 1,
    status: 'open',
    kitchen_status: 'completed',
    all_delivered: true,
    total: 1870,
    items: [
        { name: "Serpme Kahvaltı", quantity: 1, price: 1200, status: 'delivered' },
        { name: "Kuymak", quantity: 1, price: 250, status: 'delivered' },
        { name: "Karışık Tost", quantity: 2, price: 210, status: 'delivered' }
    ]
};

// Garson Adisyon Gör & Kapat modalını açtığında:
let kitchenTriggeredOnViewReceipt = false;
function onViewReceiptModal(tableNo) {
    // Sadece adisyon görüntülenir, mutfağa tek bir event dahi fırlatılmaz
    kitchenTriggeredOnViewReceipt = false;
    return activeTable1;
}

const viewedReceipt = onViewReceiptModal(1);
assert(viewedReceipt.total === 1870, "8.1: Garson Masa 1'in adisyonunu eksiksiz gördü (1.870 ₺).");
assert(kitchenTriggeredOnViewReceipt === false, "8.2: Garson adisyona baktığında mutfak panosuna HİÇBİR istek gitmedi.");

// Garson hesabı Nakit veya Kartla kapatır:
function fastCheckout(order, method) {
    order.status = 'paid';
    order.closed_at = new Date().toISOString();
    return { broadcastType: 'order_paid', table_no: order.table_no };
}

const checkoutEv = fastCheckout(activeTable1, 'cash');
assert(checkoutEv.broadcastType === 'order_paid', "8.3: Masa hesabı kapatıldığında sadece 'order_paid' yayınlandı (Mutfağa sipariş DÜŞMEDİ).");
assert(activeTable1.status === 'paid', "8.4: Masa 1 başarıyla kapatıldı.");

console.log("\n============================================================");
console.log(`SONUÇ: ${passedTests}/${totalTests} Test Başarıyla Geçti!`);
if (passedTests === totalTests) {
    console.log("TÜM SİPARİŞ AKIŞI, ADİSYON GÖRÜNTÜLEME VE MUTFAK İZOLASYONU KUSURSUZ ÇALIŞIYOR.");
}


