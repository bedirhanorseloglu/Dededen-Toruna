<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/helpers.php';

$tableId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$tableId) redirect('home.php');
$stmt = $pdo->prepare('SELECT id, table_no FROM cafe_tables WHERE id = ? AND is_active = 1');
$stmt->execute([$tableId]);
$table = $stmt->fetch();
if (!$table) { http_response_code(404); exit('Masa bulunamadı.'); }

$profile = business_profile($pdo);
$categories = active_categories($pdo);
$products = active_products($pdo);
$productsByCategory = [];
$productCounts = [];
foreach ($categories as $category) {
    $categoryId = (int)$category['id'];
    $productsByCategory[$categoryId] = [];
    $productCounts[$categoryId] = 0;
}
foreach ($products as $product) {
    $categoryId = (int)$product['category_id'];
    $productsByCategory[$categoryId][] = $product;
    $productCounts[$categoryId] = ($productCounts[$categoryId] ?? 0) + 1;
}
$initialOrder = order_payload($pdo, (int)$table['id']);
$allTables = $pdo->query('SELECT id,table_no FROM cafe_tables WHERE is_active=1 ORDER BY table_no')->fetchAll();
$credits = credit_orders($pdo);
$csrf = csrf_token();
$revision = menu_revision($pdo);
$refreshSeconds = live_refresh_seconds($pdo);
?>
<!doctype html>
<html lang="tr">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="<?= e($csrf) ?>">
    <title>Masa <?= (int)$table['table_no'] ?> • <?= e($profile['name']) ?></title>
    <?php if($profile['logo_path']!==''):?><link rel="icon" href="<?= e($profile['logo_path']) ?>"><?php endif;?>
    <link rel="stylesheet" href="assets/style.css?v=10.1">
</head>
<body class="order-page-v4">
<header class="topbar">
    <div class="container topbar-inner">
        <a class="brand" href="home.php">
            <?php if ($profile['logo_path'] !== ''): ?>
                <span class="brand-mark brand-mark-image"><img src="<?= e($profile['logo_path']) ?>" alt="Logo"></span>
            <?php else: ?>
                <span class="brand-mark"><?= e(business_initials($profile['name'])) ?></span>
            <?php endif; ?>
            <span><?= e($profile['name']) ?><small>Masa <?= (int)$table['table_no'] ?> • Adisyon</small></span>
        </a>
        <div class="nav-actions"><a class="btn btn-ghost" href="home.php">← Masalar</a><a class="btn btn-ghost" href="orders.php">Adisyonlar</a><a class="btn" href="admin/login.php">Admin</a></div>
    </div>
</header>

<main class="order-layout order-layout-v4">
    <section class="menu-panel">
        <div class="menu-toolbar-v4">
            <div>
                <div class="eyebrow">Sipariş Menüsü</div>
                <h1 class="table-page-title">Masa <?= (int)$table['table_no'] ?></h1>
                <p class="muted">Ürüne dokunarak adisyona ekle.</p>
            </div>
            <label class="search-box search-box-v4"><span>Ürün ara</span><input type="search" id="productSearch" autocomplete="off" placeholder="Ürün adı yaz..."></label>
        </div>

        <div class="category-tabs category-tabs-v4 category-tabs-v5" id="categoryTabs">
            <button class="category-tab active" type="button" data-category="all"><span>Tümü</span><small><?= count($products) ?></small></button>
            <?php foreach ($categories as $category): ?>
                <?php $categoryId = (int)$category['id']; ?>
                <button class="category-tab" type="button" data-category="<?= $categoryId ?>"><span><?= e($category['name']) ?></span><small><?= (int)($productCounts[$categoryId] ?? 0) ?></small></button>
            <?php endforeach; ?>
        </div>
        <div class="menu-filter-info" id="menuFilterInfo"><strong>Tüm Menü</strong><span><?= count($products) ?> ürün • kategorilere göre sıralı</span></div>

        <div class="product-catalog-v5" id="productCatalog">
            <?php foreach ($categories as $category): ?>
                <?php
                    $categoryId = (int)$category['id'];
                    $categoryProducts = $productsByCategory[$categoryId] ?? [];
                    if (!$categoryProducts) continue;
                ?>
                <section class="product-category-section" data-category-section="<?= $categoryId ?>" data-category-name="<?= e($category['name']) ?>">
                    <div class="product-category-heading">
                        <div><span class="category-kicker">Kategori</span><h2><?= e($category['name']) ?></h2></div>
                        <span class="category-count"><?= count($categoryProducts) ?> ürün</span>
                    </div>
                    <div class="product-grid product-grid-v4 product-grid-v5">
                        <?php foreach ($categoryProducts as $product): ?>
                            <button class="product-card product-card-v4 product-card-v5" type="button"
                                    data-product-id="<?= (int)$product['id'] ?>"
                                    data-price="<?= e((string)$product['price']) ?>"
                                    data-category="<?= $categoryId ?>"
                                    data-search="<?= e($product['name'] . ' ' . ($product['description'] ?? '') . ' ' . $product['category_name']) ?>">
                                <span class="product-card-copy">
                                    <span class="product-name"><?= e($product['name']) ?></span>
                                    <?php if (!empty($product['description'])): ?><span class="product-description"><?= e($product['description']) ?></span><?php endif; ?>
                                </span>
                                <span class="product-card-price"><?= money((float)$product['price']) ?></span>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </section>
            <?php endforeach; ?>
        </div>
    </section>

    <aside class="receipt receipt-v4" id="receiptPanel">
        <div class="receipt-head receipt-head-v4">
            <div><div class="eyebrow">Adisyon</div><h2>Masa <?= (int)$table['table_no'] ?></h2></div>
            <div class="receipt-head-actions"><span class="badge gold" id="itemCountBadge">0 ürün</span><button class="btn btn-sm" type="button" data-open-dialog="customDialog">+ Özel Kalem</button></div>
        </div>

        <div class="receipt-body receipt-body-v4" id="receiptBody"></div>

        <div class="receipt-foot receipt-foot-v4">
            <div class="totals-breakdown totals-v4">
                <div><span>Ara toplam</span><strong id="subtotalValue">0,00 ₺</strong></div>
                <div id="discountSummaryRow" hidden><span>İndirim</span><strong id="discountAmountValue">− 0,00 ₺</strong></div>
                <div class="grand-total"><span>Ödenecek</span><strong id="totalValue">0,00 ₺</strong></div>
            </div>

            <div class="payment-box payment-box-v4">
                <span>Ödeme</span>
                <div class="payment-options">
                    <label><input type="radio" name="paymentMethod" value="cash" checked><span>Nakit</span></label>
                    <label><input type="radio" name="paymentMethod" value="card"><span>Kart</span></label>
                    <label><input type="radio" name="paymentMethod" value="other"><span>Diğer</span></label>
                </div>
            </div>

            <div class="receipt-options">
                <details class="receipt-option" id="discountDetails">
                    <summary>İndirim <span id="discountMini">Yok</span></summary>
                    <div class="receipt-option-body">
                        <div class="discount-controls">
                            <select id="discountType"><option value="none">İndirim yok</option><option value="percent">Yüzde (%)</option><option value="fixed">Sabit tutar (₺)</option></select>
                            <input id="discountValue" type="number" min="0" step="0.01" value="0" disabled>
                        </div>
                        <div class="quick-discounts" id="quickDiscounts" hidden><button type="button" data-discount="5">%5</button><button type="button" data-discount="10">%10</button><button type="button" data-discount="15">%15</button><button type="button" data-discount="20">%20</button></div>
                    </div>
                </details>

                <details class="receipt-option">
                    <summary>Hesabı böl <span id="splitMini">1 kişi</span></summary>
                    <div class="receipt-option-body">
                        <div class="split-controls"><button type="button" data-split="2">2 kişi</button><button type="button" data-split="3">3 kişi</button><button type="button" data-split="4">4 kişi</button><input type="number" id="splitCount" min="1" max="50" value="1" aria-label="Kişi sayısı"></div>
                        <div class="split-result"><span>Kişi başı</span><strong id="splitValue">0,00 ₺</strong></div>
                    </div>
                </details>
            </div>

            <button class="btn btn-primary checkout checkout-v4" type="button" id="checkoutBtn">Hesabı Al</button>

            <div class="receipt-secondary-actions">
                <button class="btn btn-credit" type="button" data-open-dialog="creditDialog">Veresiye Yaz</button>
                <button class="btn btn-ghost" type="button" data-open-dialog="tableOpsDialog">Masa İşlemleri</button>
                <button class="btn btn-ghost danger-text" type="button" id="cancelOrderBtn">Adisyonu İptal Et</button>
            </div>
            <div class="live-note"><span class="live-pill"><i></i> Canlı</span><small>Diğer cihazlardaki değişiklikler otomatik gelir.</small></div>
        </div>
    </aside>
</main>
<button class="mobile-receipt-jump mobile-receipt-jump-v7" type="button" id="mobileReceiptJump" aria-label="Adisyonu gör">
    <span class="mobile-cart-left"><small>Adisyon</small><strong id="mobileItemCount">0 ürün</strong></span>
    <span class="mobile-cart-right"><small>Toplam</small><b id="mobileTotalValue">0,00 ₺</b></span>
</button>

<dialog class="app-dialog" id="customDialog">
    <form method="dialog" class="dialog-card" id="customForm">
        <div class="dialog-head"><div><div class="eyebrow">Menü Dışı</div><h3>Özel kalem ekle</h3></div><button type="button" class="dialog-close" data-close-dialog>×</button></div>
        <label>Başlık<input id="customName" maxlength="160" placeholder="Örn. Servis ücreti" required></label>
        <label>Tutar (₺)<input id="customPrice" type="number" min="0" step="0.01" required></label>
        <label>Not <textarea id="customNote" maxlength="500" placeholder="İsteğe bağlı"></textarea></label>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-close-dialog>Vazgeç</button><button class="btn btn-primary" value="default">Ekle</button></div>
    </form>
</dialog>

<dialog class="app-dialog" id="noteDialog">
    <form method="dialog" class="dialog-card" id="noteForm">
        <div class="dialog-head"><div><div class="eyebrow">Ürün Notu</div><h3 id="noteProductName">Not ekle</h3></div><button type="button" class="dialog-close" data-close-dialog>×</button></div>
        <input type="hidden" id="noteItemId">
        <label>Not<textarea id="itemNote" maxlength="500" placeholder="Örn. Turşusuz, soğansız..."></textarea></label>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-close-dialog>Vazgeç</button><button class="btn btn-primary" value="default">Kaydet</button></div>
    </form>
</dialog>

<dialog class="app-dialog" id="tableOpsDialog">
    <div class="dialog-card dialog-card-wide">
        <div class="dialog-head"><div><div class="eyebrow">Masa İşlemleri</div><h3>Masa taşı / birleştir</h3></div><button type="button" class="dialog-close" data-close-dialog>×</button></div>
        <div class="ops-dialog-grid">
            <form id="moveForm" class="ops-card">
                <strong>Masa Değiştir</strong><p class="muted small-note">Adisyonu boş bir masaya komple taşı.</p>
                <label>Hedef masa<select id="moveTarget" required><option value="">Masa seç</option><?php foreach($allTables as $t): if((int)$t['id']===(int)$table['id']) continue; ?><option value="<?= (int)$t['id'] ?>">Masa <?= (int)$t['table_no'] ?></option><?php endforeach; ?></select></label>
                <button class="btn btn-primary" type="submit">Masayı Taşı</button>
            </form>
            <form id="mergeForm" class="ops-card">
                <strong>Masaları Birleştir</strong><p class="muted small-note">Bu adisyonu hedef masanın hesabına ekle.</p>
                <label>Hedef masa<select id="mergeTarget" required><option value="">Masa seç</option><?php foreach($allTables as $t): if((int)$t['id']===(int)$table['id']) continue; ?><option value="<?= (int)$t['id'] ?>">Masa <?= (int)$t['table_no'] ?></option><?php endforeach; ?></select></label>
                <button class="btn" type="submit">Birleştir</button>
            </form>
        </div>
    </div>
</dialog>

<dialog class="app-dialog" id="creditDialog">
    <form method="dialog" class="dialog-card" id="creditForm">
        <div class="dialog-head"><div><div class="eyebrow">Veresiye</div><h3>Adisyonu veresiye yaz</h3></div><button type="button" class="dialog-close" data-close-dialog>×</button></div>
        <label>Mevcut veresiye<select id="creditTarget"><option value="">Yeni veresiye kaydı</option><?php foreach($credits as $c): ?><option value="<?= (int)$c['id'] ?>">#<?= (int)$c['id'] ?> • <?= e((string)$c['credit_name']) ?> • <?= money((float)$c['current_total']) ?></option><?php endforeach; ?></select></label>
        <label>Ad / kişi<input id="creditName" maxlength="160" placeholder="Örn. Ahmet Bey"></label>
        <label>Not<textarea id="creditNote" maxlength="500" placeholder="İsteğe bağlı"></textarea></label>
        <p class="muted small-note">Mevcut kayıt seçilirse bu masa onun üzerine eklenir. İşlem sonrası masa boşalır.</p>
        <div class="dialog-actions"><button type="button" class="btn btn-ghost" data-close-dialog>Vazgeç</button><button class="btn btn-credit" value="default">Veresiye Kaydet</button></div>
    </form>
</dialog>

<script src="assets/app.js?v=10"></script>
<script>
const tableId = <?= (int)$table['id'] ?>;
const tableNo = <?= (int)$table['table_no'] ?>;
const csrf = document.querySelector('meta[name="csrf-token"]').content;
const menuRevision = <?= (int)$revision ?>;
const refreshMs = <?= (int)$refreshSeconds * 1000 ?>;
let orderState = <?= json_encode($initialOrder, JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_HEX_TAG|JSON_HEX_AMP|JSON_HEX_APOS|JSON_HEX_QUOT) ?>;
let selectedCategory = 'all';
const addQueues = new Map();
const removeQueues = new Map();
let activeMutationRequests = 0;
let addBatchTimer = null;
let addBatchInFlight = false;

function escapeHtml(v) {
    return String(v ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[ch]));
}

async function postJson(url, payload) {
    const r = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type':'application/json','X-CSRF-Token':csrf},
        body: JSON.stringify(payload)
    });
    const raw = await r.text();
    let d;
    try { d = JSON.parse(raw); } catch { throw new Error('Sunucudan geçersiz yanıt geldi. Sayfayı yenileyip tekrar deneyin.'); }
    if (!r.ok || !d.ok) throw new Error(d.message || 'İşlem başarısız.');
    return d;
}

function pendingSummary() {
    let subtotalDelta = 0;
    let countDelta = 0;
    for (const [productId, q] of addQueues) {
        const qty = q.queued + (q.inFlight ? q.inFlightQty : 0);
        if (qty <= 0) continue;
        const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
        const price = Number(card?.dataset.price || 0);
        subtotalDelta += price * qty;
        countDelta += qty;
    }
    for (const [itemId, q] of removeQueues) {
        const qty = q.queued + (q.inFlight ? q.inFlightQty : 0);
        if (qty <= 0) continue;
        const item = (orderState.items || []).find(row => Number(row.id) === Number(itemId));
        if (!item) continue;
        const effectiveQty = Math.min(qty, Number(item.quantity || 0));
        subtotalDelta -= Number(item.unit_price || 0) * effectiveQty;
        countDelta -= effectiveQty;
    }
    return {subtotalDelta, countDelta};
}

function displayOrderSummary() {
    const pending = pendingSummary();
    return {
        subtotal: Math.max(0, Math.round((Number(orderState.subtotal || 0) + pending.subtotalDelta) * 100) / 100),
        itemCount: Math.max(0, Number(orderState.item_count || 0) + pending.countDelta)
    };
}

function productMeta(productId) {
    const card = document.querySelector(`.product-card[data-product-id="${productId}"]`);
    return {
        id: Number(productId),
        name: card?.querySelector('.product-name')?.textContent?.trim() || 'Ürün',
        price: Number(card?.dataset.price || 0)
    };
}

function displayReceiptItems() {
    const items = (Array.isArray(orderState.items) ? orderState.items : []).map(item => ({
        ...item,
        quantity: Number(item.quantity || 0),
        unit_price: Number(item.unit_price || 0),
        line_total: Number(item.line_total || 0),
        _pendingAdd: 0,
        _pendingRemove: 0
    }));

    for (const [itemId, q] of removeQueues) {
        const qty = q.queued + (q.inFlight ? q.inFlightQty : 0);
        if (qty <= 0) continue;
        const item = items.find(row => Number(row.id) === Number(itemId));
        if (!item) continue;
        const removeQty = Math.min(qty, item.quantity);
        item.quantity -= removeQty;
        item._pendingRemove += removeQty;
    }

    for (const [productId, q] of addQueues) {
        const qty = q.queued + (q.inFlight ? q.inFlightQty : 0);
        if (qty <= 0) continue;
        const meta = productMeta(productId);
        let item = [...items].reverse().find(row => Number(row.product_id) === Number(productId) && Math.abs(Number(row.unit_price) - meta.price) < 0.001 && !row.note);
        if (!item) {
            item = {
                id: `pending-${productId}`,
                product_id: Number(productId),
                product_name: meta.name,
                unit_price: meta.price,
                quantity: 0,
                line_total: 0,
                note: '',
                _pendingAdd: 0,
                _pendingRemove: 0,
                _virtual: true
            };
            items.push(item);
        }
        item.quantity += qty;
        item._pendingAdd += qty;
    }

    return items.filter(item => item.quantity > 0).map(item => ({
        ...item,
        line_total: Math.round(item.unit_price * item.quantity * 100) / 100
    }));
}

let receiptRenderFrame = 0;
function scheduleReceiptRender() {
    if (receiptRenderFrame) return;
    receiptRenderFrame = requestAnimationFrame(() => {
        receiptRenderFrame = 0;
        renderReceipt();
    });
}

function discountPreview() {
    const subtotal = displayOrderSummary().subtotal;
    const type = document.getElementById('discountType').value;
    let value = Number(document.getElementById('discountValue').value || 0);
    if (value < 0 || !Number.isFinite(value)) value = 0;
    let amount = 0;
    if (type === 'percent') amount = subtotal * Math.min(value, 100) / 100;
    if (type === 'fixed') amount = Math.min(value, subtotal);
    amount = Math.round(amount * 100) / 100;
    return {subtotal, type, value, amount, total: Math.max(0, Math.round((subtotal - amount) * 100) / 100)};
}

function renderTotals() {
    const d = discountPreview();
    document.getElementById('subtotalValue').textContent = formatMoney(d.subtotal);
    document.getElementById('discountAmountValue').textContent = '− ' + formatMoney(d.amount);
    document.getElementById('totalValue').textContent = formatMoney(d.total);
    document.getElementById('mobileTotalValue').textContent = formatMoney(d.total);
    const displaySummary = displayOrderSummary();
    document.getElementById('mobileItemCount').textContent = `${displaySummary.itemCount} ürün`;
    document.getElementById('itemCountBadge').textContent = `${displaySummary.itemCount} ürün`;
    document.getElementById('discountSummaryRow').hidden = d.amount <= 0;
    const discountMini = document.getElementById('discountMini');
    discountMini.textContent = d.amount > 0 ? '− ' + formatMoney(d.amount) : 'Yok';
    const count = Math.min(50, Math.max(1, Number(document.getElementById('splitCount').value || 1)));
    document.getElementById('splitCount').value = String(count);
    document.getElementById('splitMini').textContent = `${count} kişi`;
    document.getElementById('splitValue').textContent = formatMoney(d.total / count);
}

function renderReceipt() {
    const body = document.getElementById('receiptBody');
    const items = displayReceiptItems();
    const empty = items.length === 0;
    document.getElementById('checkoutBtn').disabled = empty || hasPendingMutations();
    document.getElementById('cancelOrderBtn').disabled = !orderState.order_id || hasPendingMutations();
    renderTotals();
    if (empty) {
        body.innerHTML = '<div class="empty-receipt"><strong>Adisyon boş</strong><br><span>Soldaki menüden ürün seç.</span></div>';
        return;
    }
    body.innerHTML = items.map(item => {
        const pending = Number(item._pendingAdd || 0) + Number(item._pendingRemove || 0) > 0;
        const canEditServerItem = !item._virtual && Number.isFinite(Number(item.id));
        return `
        <div class="receipt-row receipt-row-v4${pending ? ' is-pending' : ''}">
            <div class="receipt-main">
                <div class="receipt-title">${escapeHtml(item.product_name)} ${pending ? '<span class="pending-chip">Ekleniyor</span>' : ''}</div>
                <div class="receipt-sub">${item.quantity} × ${formatMoney(item.unit_price)}</div>
                ${item.note ? `<div class="item-note">${escapeHtml(item.note)}</div>` : ''}
                <div class="qty-controls qty-controls-v4">
                    ${canEditServerItem ? `<button class="qty-btn" type="button" data-action="remove" data-item-id="${item.id}" aria-label="Azalt">−</button>` : ''}
                    <span class="qty-number">${item.quantity}</span>
                    ${item.product_id ? `<button class="qty-btn" type="button" data-action="add" data-product-id="${item.product_id}" aria-label="Artır">+</button>` : ''}
                    ${canEditServerItem ? `<button class="mini-action" type="button" data-action="note" data-item-id="${item.id}" data-name="${escapeHtml(item.product_name)}">${item.note ? 'Notu Düzenle' : '+ Not'}</button>` : ''}
                </div>
            </div>
            <strong class="receipt-line-total">${formatMoney(item.line_total)}</strong>
        </div>`;
    }).join('');
}

function queueFor(map, id) {
    if (!map.has(id)) map.set(id, {queued: 0, inFlight: false, inFlightQty: 0, timer: null});
    return map.get(id);
}

function hasPendingMutations() {
    if (activeMutationRequests > 0) return true;
    for (const q of addQueues.values()) if (q.queued > 0 || q.inFlight) return true;
    for (const q of removeQueues.values()) if (q.queued > 0 || q.inFlight) return true;
    return false;
}

function updateActionLocks() {
    const empty = !(orderState.items || []).length;
    document.getElementById('checkoutBtn').disabled = empty || hasPendingMutations();
    document.getElementById('cancelOrderBtn').disabled = !orderState.order_id || hasPendingMutations();
}

function updateProductFeedback(productId) {
    const q = addQueues.get(productId);
    const pending = q ? q.queued + (q.inFlight ? q.inFlightQty : 0) : 0;
    document.querySelectorAll(`.product-card[data-product-id="${productId}"]`).forEach(card => {
        card.classList.toggle('is-adding', pending > 0);
        if (pending > 0) card.dataset.pending = `+${pending}`;
        else card.removeAttribute('data-pending');
    });
    updateActionLocks();
    scheduleReceiptRender();
}

function addProduct(id) {
    const productId = Number(id);
    if (!productId) return;
    const q = queueFor(addQueues, productId);
    q.queued += 1;
    updateProductFeedback(productId);
    scheduleAddBatch();
}

function scheduleAddBatch() {
    if (addBatchTimer || addBatchInFlight) return;
    addBatchTimer = setTimeout(() => {
        addBatchTimer = null;
        flushAddBatch();
    }, 80);
}

async function flushAddBatch() {
    if (addBatchInFlight) return;
    const snapshot = [];
    for (const [productId, q] of addQueues) {
        if (q.inFlight || q.queued <= 0) continue;
        const quantity = Math.min(25, q.queued);
        q.queued -= quantity;
        q.inFlight = true;
        q.inFlightQty = quantity;
        snapshot.push([Number(productId), quantity]);
        updateProductFeedback(productId);
    }
    if (!snapshot.length) return;

    addBatchInFlight = true;
    activeMutationRequests++;
    updateActionLocks();
    let failed = null;
    try {
        const d = await postJson('api/add_items_batch.php', {
            table_id: tableId,
            items: snapshot.map(([product_id, quantity]) => ({product_id, quantity}))
        });
        orderState = d.order;
    } catch (e) {
        failed = e;
    } finally {
        activeMutationRequests = Math.max(0, activeMutationRequests - 1);
        addBatchInFlight = false;
        for (const [productId] of snapshot) {
            const q = queueFor(addQueues, productId);
            q.inFlight = false;
            q.inFlightQty = 0;
            updateProductFeedback(productId);
        }
        renderReceipt();
        if (failed) showToast(failed.message, 'error');
        if ([...addQueues.values()].some(q => q.queued > 0)) scheduleAddBatch();
    }
}

function removeItem(id) {
    const itemId = Number(id);
    if (!itemId) return;
    const q = queueFor(removeQueues, itemId);
    q.queued += 1;
    updateActionLocks();
    scheduleReceiptRender();
    if (!q.inFlight && !q.timer) q.timer = setTimeout(() => flushItemRemove(itemId), 0);
}

async function flushItemRemove(itemId) {
    const q = queueFor(removeQueues, itemId);
    if (q.inFlight || q.queued <= 0) return;
    if (q.timer) { clearTimeout(q.timer); q.timer = null; }
    const quantity = Math.min(25, q.queued);
    q.queued -= quantity;
    q.inFlight = true;
    q.inFlightQty = quantity;
    activeMutationRequests++;
    updateActionLocks();
    let failed = null;
    try {
        const d = await postJson('api/remove_item.php', {table_id: tableId, item_id: itemId, quantity});
        orderState = d.order;
    } catch (e) {
        failed = e;
    } finally {
        activeMutationRequests = Math.max(0, activeMutationRequests - 1);
        q.inFlight = false;
        q.inFlightQty = 0;
        if (!(orderState.items || []).some(item => Number(item.id) === itemId)) q.queued = 0;
        updateActionLocks();
        renderReceipt();
        if (failed) showToast(failed.message, 'error');
        if (q.queued > 0) q.timer = setTimeout(() => flushItemRemove(itemId), 0);
    }
}

function updateFilterInfo(shown, visibleSections, q) {
    const info = document.getElementById('menuFilterInfo');
    const activeButton = document.querySelector(`.category-tab[data-category="${selectedCategory}"]`);
    const categoryName = activeButton?.querySelector('span')?.textContent?.trim() || 'Tüm Menü';
    const title = selectedCategory === 'all' ? (q ? 'Arama Sonuçları' : 'Tüm Menü') : categoryName;
    let detail = `${shown} ürün`;
    if (selectedCategory === 'all' && !q) detail += ` • ${visibleSections} kategori • pahalıdan uyguna`;
    else if (q) detail += ` • “${document.getElementById('productSearch').value.trim()}”`;
    else detail += ' • pahalıdan uyguna';
    info.querySelector('strong').textContent = title;
    info.querySelector('span').textContent = detail;
}

function filterProducts() {
    const searchInput = document.getElementById('productSearch');
    const q = searchInput.value.trim().toLocaleLowerCase('tr-TR');
    let shown = 0;
    let visibleSections = 0;

    document.querySelectorAll('.product-category-section').forEach(section => {
        const sectionMatchesCategory = selectedCategory === 'all' || section.dataset.categorySection === selectedCategory;
        let sectionShown = 0;

        section.querySelectorAll('.product-card-v5').forEach(card => {
            const matchesSearch = !q || card.dataset.search.toLocaleLowerCase('tr-TR').includes(q);
            const visible = sectionMatchesCategory && matchesSearch;
            card.hidden = !visible;
            if (visible) { sectionShown++; shown++; }
        });

        section.hidden = !sectionMatchesCategory || sectionShown === 0;
        if (!section.hidden) visibleSections++;
    });

    updateFilterInfo(shown, visibleSections, q);
}

function selectCategory(category, clearSearch = true) {
    selectedCategory = String(category || 'all');
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.category === selectedCategory);
    });
    if (clearSearch) document.getElementById('productSearch').value = '';
    filterProducts();
}

document.getElementById('productCatalog').addEventListener('click', e => {
    const card = e.target.closest('[data-product-id]');
    if (card && !card.hidden) addProduct(card.dataset.productId);
});

document.getElementById('receiptBody').addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    if (b.dataset.action === 'add') return addProduct(b.dataset.productId);
    if (b.dataset.action === 'remove') return removeItem(b.dataset.itemId);
    if (b.dataset.action === 'note') {
        const item = (orderState.items || []).find(x => x.id === Number(b.dataset.itemId));
        document.getElementById('noteItemId').value = b.dataset.itemId;
        document.getElementById('noteProductName').textContent = b.dataset.name;
        document.getElementById('itemNote').value = item?.note || '';
        document.getElementById('noteDialog').showModal();
    }
});

document.getElementById('categoryTabs').addEventListener('click', e => {
    const b = e.target.closest('.category-tab');
    if (!b) return;
    selectCategory(b.dataset.category, true);
});
document.getElementById('productSearch').addEventListener('input', e => {
    if (e.target.value.trim() && selectedCategory !== 'all') selectCategory('all', false);
    else filterProducts();
});
document.getElementById('productSearch').addEventListener('search', filterProducts);
document.getElementById('mobileReceiptJump').addEventListener('click', () => document.getElementById('receiptPanel').scrollIntoView({behavior:'smooth', block:'start'}));
const discountType = document.getElementById('discountType');
const discountValue = document.getElementById('discountValue');
const quick = document.getElementById('quickDiscounts');
discountType.addEventListener('change', () => {
    discountValue.disabled = discountType.value === 'none';
    if (discountType.value === 'none') discountValue.value = '0';
    quick.hidden = discountType.value !== 'percent';
    renderTotals();
});
discountValue.addEventListener('input', renderTotals);
quick.addEventListener('click', e => {
    const b = e.target.closest('[data-discount]');
    if (!b) return;
    discountValue.value = b.dataset.discount;
    renderTotals();
});
document.querySelectorAll('[data-split]').forEach(b => b.addEventListener('click', () => {
    document.getElementById('splitCount').value = b.dataset.split;
    renderTotals();
}));
document.getElementById('splitCount').addEventListener('input', renderTotals);

async function refreshCreditOptions() {
    try {
        const r = await fetch('api/credit_list.php', {cache:'no-store'});
        const d = await r.json();
        if (!d.ok) return;
        const select = document.getElementById('creditTarget');
        const current = select.value;
        select.innerHTML = '<option value="">Yeni veresiye kaydı</option>' + d.credits.map(c => `<option value="${c.id}">#${c.id} • ${escapeHtml(c.name)} • ${formatMoney(c.total)}</option>`).join('');
        if ([...select.options].some(o => o.value === current)) select.value = current;
    } catch (e) {}
}

document.querySelectorAll('[data-open-dialog]').forEach(b => b.addEventListener('click', () => {
    const dialog = document.getElementById(b.dataset.openDialog);
    if (dialog && !dialog.open) dialog.showModal();
    if (b.dataset.openDialog === 'creditDialog') refreshCreditOptions();
}));
document.querySelectorAll('[data-close-dialog]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));

document.getElementById('customForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submit = e.submitter; if (submit) submit.disabled = true;
    try {
        const d = await postJson('api/add_custom_item.php', {table_id:tableId,name:document.getElementById('customName').value,price:document.getElementById('customPrice').value,note:document.getElementById('customNote').value});
        orderState = d.order; renderReceipt(); document.getElementById('customDialog').close(); e.target.reset();
        showToast('Özel kalem eklendi.');
    } catch (err) { showToast(err.message,'error'); }
    finally { if (submit) submit.disabled = false; }
});

document.getElementById('noteForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submit = e.submitter; if (submit) submit.disabled = true;
    try {
        const d = await postJson('api/update_item_note.php', {table_id:tableId,item_id:Number(document.getElementById('noteItemId').value),note:document.getElementById('itemNote').value});
        orderState = d.order; renderReceipt(); document.getElementById('noteDialog').close(); showToast('Not kaydedildi.');
    } catch (err) { showToast(err.message,'error'); }
    finally { if (submit) submit.disabled = false; }
});

document.getElementById('moveForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (hasPendingMutations()) return showToast('Son ürün işlemi tamamlanıyor. Bir an sonra tekrar deneyin.','error');
    if (!orderState.order_id) return showToast('Taşınacak açık adisyon yok.','error');
    const target = Number(document.getElementById('moveTarget').value);
    if (!target) return showToast('Hedef masa seçin.','error');
    try {
        const d = await postJson('api/move_order.php', {source_table_id:tableId,target_table_id:target});
        showToast(`Adisyon Masa ${d.target_table_no}'a taşındı.`);
        setTimeout(() => location.href = 'table.php?id=' + d.target_table_id, 350);
    } catch (err) { showToast(err.message,'error'); }
});

document.getElementById('mergeForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (hasPendingMutations()) return showToast('Son ürün işlemi tamamlanıyor. Bir an sonra tekrar deneyin.','error');
    if (!orderState.order_id) return showToast('Birleştirilecek açık adisyon yok.','error');
    const target = Number(document.getElementById('mergeTarget').value);
    if (!target) return showToast('Hedef masa seçin.','error');
    if (!confirm('Bu masanın adisyonu hedef masaya aktarılsın mı?')) return;
    try {
        const d = await postJson('api/merge_order.php', {source_table_id:tableId,target_table_id:target});
        showToast(`Masa ${d.target_table_no} ile birleştirildi.`);
        setTimeout(() => location.href = 'table.php?id=' + d.target_table_id, 350);
    } catch (err) { showToast(err.message,'error'); }
});

document.getElementById('creditTarget').addEventListener('change', e => {
    const input = document.getElementById('creditName');
    input.disabled = !!e.target.value;
    if (e.target.value) input.value = '';
});

document.getElementById('creditForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (hasPendingMutations()) return showToast('Son ürün işlemi tamamlanıyor. Bir an sonra tekrar deneyin.','error');
    if (!orderState.order_id) return showToast('Veresiye yazılacak adisyon yok.','error');
    const target = document.getElementById('creditTarget').value;
    const submit = e.submitter; if (submit) submit.disabled = true;
    try {
        await postJson('api/to_credit.php', {table_id:tableId,target_credit_id:target ? Number(target) : null,credit_name:document.getElementById('creditName').value,credit_note:document.getElementById('creditNote').value});
        showToast('Adisyon veresiye kaydedildi.');
        setTimeout(() => location.href = 'credits.php', 400);
    } catch (err) { showToast(err.message,'error'); }
    finally { if (submit) submit.disabled = false; }
});

document.getElementById('checkoutBtn').addEventListener('click', async () => {
    if (hasPendingMutations()) return showToast('Son ürün işlemi tamamlanıyor. Bir an sonra tekrar deneyin.','error');
    if (!orderState.items?.length) return;
    const d = discountPreview();
    if (d.type === 'percent' && d.value > 100) return showToast('Yüzde indirim 100’den büyük olamaz.','error');
    if (d.type === 'fixed' && d.value > d.subtotal) return showToast('Sabit indirim ara toplamdan büyük olamaz.','error');
    const payment = document.querySelector('input[name="paymentMethod"]:checked').value;
    const label = {cash:'Nakit',card:'Kart',other:'Diğer'}[payment];
    if (!confirm(`Masa ${tableNo} hesabı ${formatMoney(d.total)} olarak ${label} ile kapatılsın mı?`)) return;
    const btn = document.getElementById('checkoutBtn'); btn.disabled = true;
    try {
        const data = await postJson('api/checkout.php', {table_id:tableId,discount_type:d.type,discount_value:d.value,payment_method:payment});
        showToast(`Hesap kapatıldı: ${formatMoney(data.total)}`);
        setTimeout(() => location.href = 'home.php', 450);
    } catch (err) { showToast(err.message,'error'); btn.disabled = false; }
});

document.getElementById('cancelOrderBtn').addEventListener('click', async () => {
    if (hasPendingMutations()) return showToast('Son ürün işlemi tamamlanıyor. Bir an sonra tekrar deneyin.','error');
    if (!orderState.order_id) return;
    if (!confirm(`Masa ${tableNo} adisyonu satışa yazılmadan iptal edilsin mi?`)) return;
    const btn = document.getElementById('cancelOrderBtn'); btn.disabled = true;
    try {
        await postJson('api/cancel_order.php', {table_id:tableId});
        showToast('Adisyon iptal edildi.');
        setTimeout(() => location.href = 'home.php', 400);
    } catch (err) { showToast(err.message,'error'); btn.disabled = false; }
});

let liveBusy = false;
let liveOrderSignature = '';
async function liveSync() {
    if (liveBusy || document.hidden || hasPendingMutations()) return;
    liveBusy = true;
    try {
        const r = await fetch(`api/live_state.php?table_id=${tableId}&revision=${menuRevision}&signature=${encodeURIComponent(liveOrderSignature)}`, {cache:'no-store'});
        const d = await r.json();
        if (d.ok) {
            if (d.menu_changed) { location.reload(); return; }
            liveOrderSignature = d.order_signature || liveOrderSignature;
            if (d.order) {
                orderState = d.order;
                renderReceipt();
            }
        }
    } catch (e) {} finally { liveBusy = false; }
}
const liveTimer = setInterval(liveSync, Math.max(2000, refreshMs));
document.addEventListener('visibilitychange', () => { if (!document.hidden) liveSync(); });
filterProducts();
renderReceipt();
</script>
</body>
</html>
