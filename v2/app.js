import { 
    db, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    serverTimestamp, 
    writeBatch 
} from "./firebase-config.js";
import { formatMoney, printOrderReceipt } from "./printer.js";

// Sabit Varsayılan Veriler (Firestore kuralı kapalı olsa bile sistemi anında çalıştırır)
const DEFAULT_STAFF = [
    { id: "staff-1", name: "Yönetici (Patron)", role: "admin", pin: "197300", active: true },
    { id: "staff-2", name: "Ahmet (Garson)", role: "waiter", pin: "123456", active: true },
    { id: "staff-3", name: "Mehmet (Garson)", role: "waiter", pin: "654321", active: true },
    { id: "staff-4", name: "Ayşe (Garson)", role: "waiter", pin: "111111", active: true },
    { id: "staff-5", name: "Mutfak Ekibi", role: "kitchen", pin: "112233", active: true }
];

const DEFAULT_CATEGORIES = [
    { id: "kahvalti", name: "Kahvaltılar", sort: 10 },
    { id: "sicak-icecek", name: "Sıcak & Soğuk İçecekler", sort: 20 },
    { id: "tost", name: "Tostlar & Atıştırmalık", sort: 30 },
    { id: "yemekler", name: "Yemekler & Izgara", sort: 40 },
    { id: "tatlilar", name: "Tatlılar", sort: 50 }
];

const DEFAULT_PRODUCTS = [
    { id: "p1", category_id: "kahvalti", name: "Serpme Kahvaltı (2 Kişilik)", price: 1200, active: true },
    { id: "p2", category_id: "kahvalti", name: "Menemen", price: 250, active: true },
    { id: "p3", category_id: "kahvalti", name: "Kuymak", price: 300, active: true },
    { id: "p4", category_id: "sicak-icecek", name: "Çay", price: 30, active: true },
    { id: "p5", category_id: "sicak-icecek", name: "Fincan Çay", price: 50, active: true },
    { id: "p6", category_id: "sicak-icecek", name: "Türk Kahvesi", price: 100, active: true },
    { id: "p7", category_id: "sicak-icecek", name: "Soda", price: 60, active: true },
    { id: "p8", category_id: "tost", name: "Karışık Tost", price: 260, active: true },
    { id: "p9", category_id: "tost", name: "Kaşarlı Tost", price: 250, active: true },
    { id: "p10", category_id: "yemekler", name: "Köfte Porsiyon", price: 500, active: true },
    { id: "p11", category_id: "yemekler", name: "Tavuk Izgara", price: 400, active: true },
    { id: "p12", category_id: "tatlilar", name: "Sütlaç", price: 120, active: true },
    { id: "p13", category_id: "tatlilar", name: "Atom Sütlaç", price: 290, active: true }
];

const DEFAULT_TABLES = Array.from({ length: 15 }, (_, i) => ({ id: String(i + 1), table_no: i + 1, active: true }));

// Global Durum
const state = {
    currentUser: JSON.parse(localStorage.getItem('cafe_active_user') || 'null'),
    currentRole: localStorage.getItem('cafe_active_role') || 'waiter',
    tables: DEFAULT_TABLES,
    categories: DEFAULT_CATEGORIES,
    products: DEFAULT_PRODUCTS,
    activeOrders: JSON.parse(localStorage.getItem('cafe_cached_orders') || '{}'),
    selectedTable: null,
    cart: [],
    staffList: DEFAULT_STAFF
};

function saveCachedOrders() {
    localStorage.setItem('cafe_cached_orders', JSON.stringify(state.activeOrders));
}

// Firestore Gerçek Zamanlı Dinleyicileri (Hata durumunda sessizce yerel çalışır)
function setupRealtimeListeners() {
    try {
        // Personel Dinleyici
        onSnapshot(collection(db, "staff"), (snap) => {
            if (!snap.empty) {
                state.staffList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                if (!state.currentUser) renderLoginScreen();
            }
        }, (err) => console.warn("Firestore Personel Okuma (Yerel veriler devrede):", err.message));

        // Masalar Dinleyici
        onSnapshot(collection(db, "tables"), (snap) => {
            if (!snap.empty) {
                state.tables = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.table_no - b.table_no);
                if (state.currentUser && state.currentRole === 'waiter' && !state.selectedTable) {
                    renderWaiterTables();
                }
            }
        }, (err) => console.warn("Firestore Masalar Okuma:", err.message));

        // Kategoriler & Ürünler
        onSnapshot(collection(db, "categories"), (snap) => {
            if (!snap.empty) state.categories = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.sort - b.sort);
        }, (err) => {});
        onSnapshot(collection(db, "products"), (snap) => {
            if (!snap.empty) state.products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }, (err) => {});

        // Açık Siparişler
        const ordersQuery = query(collection(db, "orders"), where("status", "==", "open"));
        onSnapshot(ordersQuery, (snap) => {
            state.activeOrders = {};
            snap.forEach(d => {
                const data = d.data();
                state.activeOrders[data.table_id] = { id: d.id, ...data };
            });
            saveCachedOrders();

            if (state.currentUser) {
                if (state.currentRole === 'waiter' && !state.selectedTable) {
                    renderWaiterTables();
                } else if (state.currentRole === 'kitchen') {
                    renderKitchenBoard();
                } else if (state.selectedTable) {
                    renderTableOrderScreen(state.selectedTable);
                }
            }
        }, (err) => console.warn("Firestore Siparişler:", err.message));
    } catch (e) {
        console.warn("Firestore bağlantı uyarısı:", e);
    }
}

const appContainer = document.getElementById('app');

// 1. GİRİŞ & ROL & PIN SEÇİMİ
let enteredPin = "";
function renderLoginScreen() {
    enteredPin = "";
    const activeRole = state.currentRole;
    const roleStaff = state.staffList.filter(s => s.role === activeRole && s.active);

    appContainer.innerHTML = `
        <div class="login-screen">
            <div class="login-card">
                <div style="font-size: 32px; margin-bottom: 8px;">☕</div>
                <h1 style="font-size: 22px; font-weight: 800; color: white;">Dededen Toruna</h1>
                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Kafe Adisyon & Mutfak Sistemi</p>
                
                <div class="role-selector">
                    <button class="role-btn ${activeRole === 'waiter' ? 'active' : ''}" onclick="selectRole('waiter')">
                        <span style="font-size: 20px;">📱</span> Garson
                    </button>
                    <button class="role-btn ${activeRole === 'kitchen' ? 'active' : ''}" onclick="selectRole('kitchen')">
                        <span style="font-size: 20px;">🍳</span> Mutfak
                    </button>
                    <button class="role-btn ${activeRole === 'admin' ? 'active' : ''}" onclick="selectRole('admin')">
                        <span style="font-size: 20px;">👑</span> Yönetici
                    </button>
                </div>

                <div style="text-align: left; margin-bottom: 14px;">
                    <label style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">Personel Seçiniz:</label>
                    <select id="staff-select" style="width: 100%; padding: 12px; background: var(--bg-main); border: 1px solid var(--border); color: white; border-radius: var(--radius-sm); margin-top: 6px; font-size: 15px; font-weight: 600;">
                        ${roleStaff.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                    </select>
                </div>

                <div style="font-size: 12px; color: var(--text-muted); margin-top: 15px;">6 Haneli PIN Kodunu Giriniz:</div>
                <div class="pin-display">
                    <div class="pin-dot" id="dot-0"></div>
                    <div class="pin-dot" id="dot-1"></div>
                    <div class="pin-dot" id="dot-2"></div>
                    <div class="pin-dot" id="dot-3"></div>
                    <div class="pin-dot" id="dot-4"></div>
                    <div class="pin-dot" id="dot-5"></div>
                </div>

                <div class="numpad">
                    <button class="num-btn" onclick="pressNum('1')">1</button>
                    <button class="num-btn" onclick="pressNum('2')">2</button>
                    <button class="num-btn" onclick="pressNum('3')">3</button>
                    <button class="num-btn" onclick="pressNum('4')">4</button>
                    <button class="num-btn" onclick="pressNum('5')">5</button>
                    <button class="num-btn" onclick="pressNum('6')">6</button>
                    <button class="num-btn" onclick="pressNum('7')">7</button>
                    <button class="num-btn" onclick="pressNum('8')">8</button>
                    <button class="num-btn" onclick="pressNum('9')">9</button>
                    <button class="num-btn" style="color: var(--danger);" onclick="clearPin()">C</button>
                    <button class="num-btn" onclick="pressNum('0')">0</button>
                    <button class="num-btn" style="color: var(--accent);" onclick="submitPin()">✓</button>
                </div>
            </div>
        </div>
    `;
}

window.selectRole = (r) => {
    state.currentRole = r;
    localStorage.setItem('cafe_active_role', r);
    renderLoginScreen();
};

window.pressNum = (num) => {
    if (enteredPin.length < 6) {
        enteredPin += num;
        updatePinDots();
        if (enteredPin.length === 6) {
            setTimeout(submitPin, 80);
        }
    }
};

window.clearPin = () => {
    enteredPin = "";
    updatePinDots();
};

function updatePinDots() {
    for (let i = 0; i < 6; i++) {
        const dot = document.getElementById(`dot-${i}`);
        if (dot) dot.classList.toggle('filled', i < enteredPin.length);
    }
}

window.submitPin = () => {
    const staffId = document.getElementById('staff-select')?.value;
    const staff = state.staffList.find(s => s.id === staffId);
    if (!staff) return alert("Personel seçiniz.");

    if (staff.pin === enteredPin) {
        state.currentUser = staff;
        localStorage.setItem('cafe_active_user', JSON.stringify(staff));
        routeUserToMain();
    } else {
        alert("Hatalı PIN Kodu! Lütfen tekrar deneyin.");
        clearPin();
    }
};

window.logout = () => {
    state.currentUser = null;
    state.selectedTable = null;
    localStorage.removeItem('cafe_active_user');
    renderLoginScreen();
};

function routeUserToMain() {
    if (state.currentRole === 'waiter') {
        renderWaiterTables();
    } else if (state.currentRole === 'kitchen') {
        renderKitchenBoard();
    } else if (state.currentRole === 'admin') {
        renderAdminDashboard();
    }
}

function getHeaderHtml(title = "Masalar") {
    return `
    <header class="app-header">
        <div class="brand-section">
            <div class="brand-logo">DT</div>
            <div class="brand-text">
                <h1>${title}</h1>
                <p>Dededen Toruna</p>
            </div>
        </div>
        <div style="display: flex; align-items: center; gap: 12px;">
            <div class="user-badge">
                <span class="user-role-tag">${state.currentUser?.role}</span>
                <strong>${state.currentUser?.name}</strong>
            </div>
            <button class="btn-logout" title="Çıkış Yap" onclick="logout()">✕</button>
        </div>
    </header>
    `;
}

// 2. GARSON: MASA SEÇİMİ
function renderWaiterTables() {
    state.selectedTable = null;
    const tableCards = state.tables.map(table => {
        const activeOrder = state.activeOrders[table.table_no];
        const isBusy = !!activeOrder;
        const allDelivered = isBusy && activeOrder.items?.every(i => i.status === 'delivered');

        return `
            <div class="table-card ${allDelivered ? 'delivered' : (isBusy ? 'busy' : '')}" onclick="openTableOrder(${table.table_no})">
                <div class="table-no">Masa ${table.table_no}</div>
                <div class="table-status">
                    ${allDelivered ? '✓ Tümü Verildi' : (isBusy ? '● Sipariş Var' : 'Boş')}
                </div>
                <div class="table-total">
                    ${isBusy ? formatMoney(activeOrder.total) : '0,00 ₺'}
                </div>
            </div>
        `;
    }).join('');

    appContainer.innerHTML = `
        ${getHeaderHtml("Masa Yönetimi")}
        <main class="tables-grid">
            ${tableCards}
        </main>
    `;
}

// 3. GARSON: SİPARİŞ & ADİSYON ALMA
let selectedCategoryId = 'all';

window.openTableOrder = (tableNo) => {
    state.selectedTable = tableNo;
    const activeOrder = state.activeOrders[tableNo];
    state.cart = activeOrder ? JSON.parse(JSON.stringify(activeOrder.items || [])) : [];
    renderTableOrderScreen(tableNo);
};

function renderTableOrderScreen(tableNo) {
    const activeOrder = state.activeOrders[tableNo];
    const filteredProducts = selectedCategoryId === 'all' 
        ? state.products 
        : state.products.filter(p => p.category_id === selectedCategoryId);

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const categoriesTabs = [
        `<button class="category-tab-btn ${selectedCategoryId === 'all' ? 'active' : ''}" onclick="filterCat('all')">Tümü (${state.products.length})</button>`,
        ...state.categories.map(c => `
            <button class="category-tab-btn ${selectedCategoryId === c.id ? 'active' : ''}" onclick="filterCat('${c.id}')">
                ${c.name}
            </button>
        `)
    ].join('');

    const productsHtml = filteredProducts.map(p => `
        <div class="product-item-card" onclick="addToCart('${p.id}')">
            <div class="product-name">${p.name}</div>
            <div class="product-price">${formatMoney(p.price)}</div>
        </div>
    `).join('');

    const cartItemsHtml = state.cart.length === 0 
        ? `<div style="text-align: center; color: var(--text-muted); margin-top: 40px;">Henüz ürün eklenmedi.<br>Sol taraftan ürün seçin.</div>`
        : state.cart.map((item, index) => `
            <div class="receipt-item-row">
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 13px;">${item.name}</div>
                    <div style="font-size: 12px; color: var(--accent-gold);">${formatMoney(item.price)}</div>
                    ${item.status === 'delivered' ? '<span style="font-size: 10px; color: var(--success); font-weight: bold;">✓ Teslim Edildi</span>' : ''}
                </div>
                <div class="qty-counter">
                    <button class="qty-btn" onclick="changeQty(${index}, -1)">−</button>
                    <span style="font-weight: bold; font-size: 13px; min-width: 16px; text-align: center;">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQty(${index}, 1)">+</button>
                </div>
            </div>
        `).join('');

    appContainer.innerHTML = `
        <header class="app-header">
            <div style="display: flex; align-items: center; gap: 12px;">
                <button class="btn-outline" onclick="renderWaiterTables()" style="padding: 6px 12px; font-size: 12px;">← Masalar</button>
                <div class="brand-text">
                    <h1>Masa ${tableNo} Adisyonu</h1>
                    <p>${activeOrder ? 'Açık Hesap' : 'Yeni Adisyon'}</p>
                </div>
            </div>
            <div class="user-badge">
                <strong>Garson: ${state.currentUser?.name}</strong>
            </div>
        </header>

        <div class="order-screen-layout">
            <section class="menu-side">
                <div class="category-bar">
                    ${categoriesTabs}
                </div>
                <div class="products-grid">
                    ${productsHtml}
                </div>
            </section>

            <aside class="receipt-side">
                <div class="receipt-header">
                    <div>
                        <div style="font-size: 11px; color: var(--text-muted);">ADİSYON DETAYI</div>
                        <h2 style="font-size: 16px; font-weight: 700;">Masa ${tableNo}</h2>
                    </div>
                    <button class="btn-outline" style="font-size: 12px; padding: 4px 8px; color: var(--danger);" onclick="clearCart()">Temizle</button>
                </div>

                <div class="receipt-items-list">
                    ${cartItemsHtml}
                </div>

                <div class="receipt-footer">
                    <div class="total-summary">
                        <span>Toplam</span>
                        <span style="color: var(--accent-gold);">${formatMoney(subtotal)}</span>
                    </div>

                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button class="btn-primary" onclick="saveOrderToKitchen()">
                            🍳 Mutfağa Gönder / Kaydet
                        </button>
                        
                        <div class="pay-btn-group">
                            <button class="btn-success" onclick="checkoutOrder('cash')">
                                💵 Nakit Kapat
                            </button>
                            <button class="btn-success" style="background: #6366f1;" onclick="checkoutOrder('card')">
                                💳 Kart (Yazdır)
                            </button>
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    `;
}

window.filterCat = (catId) => {
    selectedCategoryId = catId;
    renderTableOrderScreen(state.selectedTable);
};

window.addToCart = (productId) => {
    const product = state.products.find(p => p.id === productId);
    if (!product) return;

    const existing = state.cart.find(i => i.product_id === productId && i.status !== 'delivered');
    if (existing) {
        existing.quantity += 1;
    } else {
        state.cart.push({
            product_id: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            status: 'pending',
            note: ''
        });
    }
    renderTableOrderScreen(state.selectedTable);
};

window.changeQty = (index, delta) => {
    const item = state.cart[index];
    if (!item) return;

    item.quantity += delta;
    if (item.quantity <= 0) {
        state.cart.splice(index, 1);
    }
    renderTableOrderScreen(state.selectedTable);
};

window.clearCart = () => {
    if (confirm("Sepeti temizlemek istediğinize emin misiniz?")) {
        state.cart = [];
        renderTableOrderScreen(state.selectedTable);
    }
};

window.saveOrderToKitchen = async () => {
    if (state.cart.length === 0) {
        return alert("Lütfen en az bir ürün ekleyin.");
    }

    const tableNo = state.selectedTable;
    const activeOrder = state.activeOrders[tableNo];
    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const orderData = {
        id: activeOrder?.id || ("order-" + Date.now()),
        table_id: tableNo,
        table_no: tableNo,
        items: state.cart,
        subtotal: subtotal,
        discount_amount: 0,
        total: subtotal,
        status: 'open',
        waiter_id: state.currentUser?.id,
        waiter_name: state.currentUser?.name,
        updated_at: new Date().toISOString()
    };

    // Hem Firestore'a hem yerel önbelleğe anında yaz
    state.activeOrders[tableNo] = orderData;
    saveCachedOrders();

    try {
        if (activeOrder?.id && !activeOrder.id.startsWith("order-")) {
            await updateDoc(doc(db, "orders", activeOrder.id), orderData);
        } else {
            const docRef = await addDoc(collection(db, "orders"), orderData);
            orderData.id = docRef.id;
        }
    } catch (e) {
        console.warn("Firestore yazma gecikmeli/çevrimdışı, yerel önbellekte korundu.");
    }

    alert("Sipariş mutfağa iletildi!");
    renderWaiterTables();
};

window.checkoutOrder = async (method) => {
    const tableNo = state.selectedTable;
    const activeOrder = state.activeOrders[tableNo];

    if (!activeOrder && state.cart.length === 0) {
        return alert("Kapatılacak hesap bulunamadı.");
    }

    const subtotal = state.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const orderToClose = activeOrder || {
        table_no: tableNo,
        items: state.cart,
        subtotal: subtotal,
        total: subtotal,
        waiter_name: state.currentUser?.name
    };

    orderToClose.payment_method = method;

    const confirmMsg = method === 'card' 
        ? `Masa ${tableNo} tutarı (${formatMoney(orderToClose.total)}) KART ile alınıp adisyon yazdırılsın mı?`
        : `Masa ${tableNo} tutarı (${formatMoney(orderToClose.total)}) NAKİT ile kapatılsın mı?`;

    if (!confirm(confirmMsg)) return;

    try {
        if (activeOrder?.id && !activeOrder.id.startsWith("order-")) {
            await updateDoc(doc(db, "orders", activeOrder.id), {
                status: 'paid',
                payment_method: method,
                closed_at: serverTimestamp()
            });
        }
    } catch (e) {
        console.warn("Ödeme yerel kapatıldı.");
    }

    delete state.activeOrders[tableNo];
    saveCachedOrders();

    alert("Hesap başarıyla kapatıldı.");
    state.cart = [];
    renderWaiterTables();
};

// 4. MUTFAK EKRANI
function renderKitchenBoard() {
    const ordersList = Object.values(state.activeOrders);

    const cardsHtml = ordersList.length === 0
        ? `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 60px;">Şu an bekleyen mutfak siparişi yok.</div>`
        : ordersList.map(order => {
            const allDelivered = order.items?.every(i => i.status === 'delivered');

            const itemsRows = (order.items || []).map((item, idx) => `
                <div class="kitchen-item ${item.status === 'delivered' ? 'done' : ''}">
                    <div>
                        <strong>${item.quantity}x</strong> ${item.name}
                        ${item.note ? `<div style="font-size: 11px; color: var(--accent-gold);">* ${item.note}</div>` : ''}
                    </div>
                    <button class="btn-outline" style="padding: 4px 8px; font-size: 11px;" onclick="toggleItemDelivered('${order.id || order.table_no}', ${idx})">
                        ${item.status === 'delivered' ? 'Geri Al' : '✓ Hazır'}
                    </button>
                </div>
            `).join('');

            return `
                <div class="kitchen-card ${allDelivered ? '' : 'urgent'}">
                    <div>
                        <div class="kitchen-card-head">
                            <div>
                                <h3 style="font-size: 18px; font-weight: 800;">Masa ${order.table_no}</h3>
                                <div style="font-size: 11px; color: var(--text-muted);">Garson: ${order.waiter_name || 'Personel'}</div>
                            </div>
                            <span class="user-role-tag" style="background: ${allDelivered ? 'var(--success)' : 'var(--danger)'};">
                                ${allDelivered ? 'HAZIR' : 'BEKLİYOR'}
                            </span>
                        </div>
                        <div>
                            ${itemsRows}
                        </div>
                    </div>
                    
                    <button class="btn-primary" style="margin-top: 15px; background: var(--success);" onclick="deliverAllOrder('${order.id || order.table_no}')">
                        Tümünü Teslim Edildi Yap
                    </button>
                </div>
            `;
        }).join('');

    appContainer.innerHTML = `
        ${getHeaderHtml("Mutfak Sipariş Panosu")}
        <main class="kitchen-board">
            ${cardsHtml}
        </main>
    `;
}

window.toggleItemDelivered = async (orderId, itemIndex) => {
    const orderDoc = Object.values(state.activeOrders).find(o => o.id === orderId || String(o.table_no) === String(orderId));
    if (!orderDoc) return;

    orderDoc.items[itemIndex].status = orderDoc.items[itemIndex].status === 'delivered' ? 'pending' : 'delivered';
    saveCachedOrders();
    renderKitchenBoard();

    try {
        if (orderDoc.id && !orderDoc.id.startsWith("order-")) {
            await updateDoc(doc(db, "orders", orderDoc.id), {
                items: orderDoc.items
            });
        }
    } catch (e) {}
};

window.deliverAllOrder = async (orderId) => {
    const orderDoc = Object.values(state.activeOrders).find(o => o.id === orderId || String(o.table_no) === String(orderId));
    if (!orderDoc) return;

    orderDoc.items.forEach(i => i.status = 'delivered');
    saveCachedOrders();
    renderKitchenBoard();

    try {
        if (orderDoc.id && !orderDoc.id.startsWith("order-")) {
            await updateDoc(doc(db, "orders", orderDoc.id), {
                items: orderDoc.items
            });
        }
    } catch (e) {}
};

// 5. YÖNETİCİ PANELİ
function renderAdminDashboard() {
    appContainer.innerHTML = `
        ${getHeaderHtml("Yönetici Paneli")}
        <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius); border: 1px solid var(--border);">
                    <div style="font-size: 12px; color: var(--text-muted);">Açık Masa Sayısı</div>
                    <div style="font-size: 24px; font-weight: 800; color: var(--accent-gold); margin-top: 6px;">${Object.keys(state.activeOrders).length}</div>
                </div>
                <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius); border: 1px solid var(--border);">
                    <div style="font-size: 12px; color: var(--text-muted);">Açık Adisyon Tutarı</div>
                    <div style="font-size: 24px; font-weight: 800; color: white; margin-top: 6px;">
                        ${formatMoney(Object.values(state.activeOrders).reduce((sum, o) => sum + (o.total || 0), 0))}
                    </div>
                </div>
                <div style="background: var(--bg-card); padding: 18px; border-radius: var(--radius); border: 1px solid var(--border);">
                    <div style="font-size: 12px; color: var(--text-muted);">Toplam Personel</div>
                    <div style="font-size: 24px; font-weight: 800; color: var(--accent); margin-top: 6px;">${state.staffList.length}</div>
                </div>
            </div>

            <div style="background: var(--bg-card); padding: 20px; border-radius: var(--radius); border: 1px solid var(--border);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h2 style="font-size: 18px; font-weight: 700;">Personel Yönetimi</h2>
                    <button class="btn-primary" style="padding: 8px 16px; font-size: 12px;" onclick="addNewStaffModal()">+ Yeni Personel</button>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr style="text-align: left; color: var(--text-muted); border-bottom: 1px solid var(--border);">
                            <th style="padding: 10px;">İsim</th>
                            <th style="padding: 10px;">Rol</th>
                            <th style="padding: 10px;">PIN Kodu</th>
                            <th style="padding: 10px; text-align: right;">İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${state.staffList.map(s => `
                            <tr style="border-bottom: 1px solid var(--border-light);">
                                <td style="padding: 12px 10px; font-weight: 600;">${s.name}</td>
                                <td style="padding: 12px 10px;"><span class="user-role-tag">${s.role}</span></td>
                                <td style="padding: 12px 10px; font-family: monospace;">••••${s.pin ? s.pin.slice(-2) : ''}</td>
                                <td style="padding: 12px 10px; text-align: right;">
                                    <button class="btn-outline" style="padding: 4px 8px; font-size: 11px; color: var(--danger);" onclick="deleteStaff('${s.id}')">Sil</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

window.addNewStaffModal = async () => {
    const name = prompt("Personel Adı Soyadı:");
    if (!name) return;
    const role = prompt("Rolü (waiter / kitchen / admin):", "waiter");
    if (!role) return;
    const pin = prompt("6 Haneli PIN Kodu:", "123456");
    if (!pin || pin.length !== 6) return alert("PIN 6 haneli olmalıdır.");

    const newStaff = { id: "staff-" + Date.now(), name, role, pin, active: true };
    state.staffList.push(newStaff);
    renderAdminDashboard();

    try {
        await addDoc(collection(db, "staff"), newStaff);
    } catch(e) {}
};

window.deleteStaff = async (id) => {
    if (confirm("Bu personeli silmek istediğinize emin misiniz?")) {
        state.staffList = state.staffList.filter(s => s.id !== id);
        renderAdminDashboard();
        try {
            await deleteDoc(doc(db, "staff", id));
        } catch(e) {}
    }
};

// Başlat
setupRealtimeListeners();
if (state.currentUser) {
    routeUserToMain();
} else {
    renderLoginScreen();
}
