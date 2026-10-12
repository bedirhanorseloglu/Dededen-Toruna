// Termal Fiş Yazdırma Servisi (ESC/POS & Tarayıcı Termal Yazıcı Şablonu & RawBT Entegrasyonu)
import { formatMoney, isInstantDeliveryCategory } from '../data/menu.js';

/**
 * Mutfak fişi metin formatı (ESC/POS & RawBT için saf metin)
 */
export function generateKitchenTicketText(order) {
    const tableNo = order.table_no || order.table_id || '1';
    const waiterName = order.waiter_name || 'Personel';
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR');
    const kitchenItems = (order.items || []).filter(item => {
        if (item.status === 'delivered') return false;
        return !isInstantDeliveryCategory(item.category_id, item.name);
    });

    let txt = '';
    txt += '================================\n';
    txt += '    *** MUTFAK SIPARISI ***     \n';
    txt += `           MASA ${tableNo}      \n`;
    txt += '================================\n';
    txt += `Garson: ${waiterName}\n`;
    txt += `Saat  : ${nowTime} | ${nowDate}\n`;
    txt += '--------------------------------\n';
    kitchenItems.forEach(item => {
        txt += `${item.quantity}x ${item.name}\n`;
        if (item.notes || item.note) {
            txt += `  >> Not: ${item.notes || item.note}\n`;
        }
    });
    txt += '--------------------------------\n';
    txt += '   Dededen Toruna Hamsikoy      \n';
    txt += '================================\n\n\n';
    return txt;
}

/**
 * Müşteri adisyon fişi metin formatı
 */
export function generateCustomerTicketText(order, customTitle = "Masa Adisyon Fişi") {
    const tableNo = order.table_no || order.table_id || '1';
    const waiterName = order.waiter_name || 'Personel';
    const total = order.total || order.subtotal || (order.items || []).reduce((s, i) => s + (i.price * i.quantity), 0);
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR');

    let txt = '';
    txt += '================================\n';
    txt += '        DEDEDEN TORUNA          \n';
    txt += '    Hamsikoy Sutlaci & Cafe     \n';
    txt += `           MASA ${tableNo}      \n`;
    txt += '================================\n';
    txt += `Garson: ${waiterName}\n`;
    txt += `Tarih : ${nowDate} ${nowTime}\n`;
    txt += `Belge : ${customTitle}\n`;
    txt += '--------------------------------\n';
    (order.items || []).forEach(item => {
        const itemTotal = formatMoney(item.price * item.quantity);
        txt += `${item.quantity}x ${item.name.padEnd(18).slice(0, 18)} ${itemTotal}\n`;
    });
    txt += '================================\n';
    txt += `GENEL TOPLAM: ${formatMoney(total)}\n`;
    txt += '================================\n';
    txt += '   Bizi Tercih Ettiginiz Icin   \n';
    txt += '       Tesekkur Ederiz!         \n';
    txt += '         Afiyet Olsun           \n';
    txt += '================================\n\n\n';
    return txt;
}

/**
 * 🍳 Mutfağa Termal Sipariş Fişi Yazdır
 * Müşteri Kuralı: Tatlı ve içecek kategorisindeki ürünler bu fişe DAHİL EDİLMEZ!
 */
export function printKitchenOrderTicket(order, settings = null) {
    if (!order || !order.items || order.items.length === 0) return { ok: false, message: 'Yazdırılacak ürün bulunamadı.' };

    const kitchenItems = order.items.filter(item => {
        if (item.status === 'delivered') return false;
        return !isInstantDeliveryCategory(item.category_id, item.name);
    });

    if (kitchenItems.length === 0) {
        return { 
            ok: false, 
            message: 'Mutfakta yeni hazırlanacak ürün yok. (Teslim edilenler ve tatlı/içecekler mutfak fişine tekrar gönderilmez.)' 
        };
    }

    const tableNo = order.table_no || order.table_id || '1';
    const waiterName = order.waiter_name || 'Personel';
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR');
    const hasAlreadyDelivered = order.items.some(i => i.status === 'delivered');
    const ticketTitle = hasAlreadyDelivered ? '*** İLAVE MUTFAK SİPARİŞİ ***' : '*** MUTFAK SİPARİŞİ ***';

    const rawText = generateKitchenTicketText(order);

    // Eğer doğrudan RawBT modu aktif ve Android ise arkadan fırlat
    if (settings?.mode === 'rawbt' && /Android/i.test(navigator.userAgent)) {
        try {
            window.location.href = 'rawbt:data:text/plain;charset=utf-8,' + encodeURIComponent(rawText);
            return { ok: true, count: kitchenItems.length, mode: 'rawbt' };
        } catch (e) {
            console.warn("Direct RawBT fail, opening print window:", e);
        }
    }

    const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mutfak Fişi - Masa ${tableNo}</title>
            <style>
                @page { margin: 4mm; }
                * { box-sizing: border-box; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    color: #000;
                    background: #f1f5f9;
                    margin: 0;
                    padding: 0;
                }
                .action-bar {
                    position: sticky;
                    top: 0;
                    background: #0f172a;
                    color: #fff;
                    padding: 10px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    z-index: 9999;
                }
                .btn-print {
                    background: #2563eb;
                    color: #fff;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                }
                .btn-rawbt {
                    background: #059669;
                    color: #fff;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                }
                .btn-close {
                    background: #475569;
                    color: #fff;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                }
                .receipt-paper {
                    max-width: 80mm;
                    margin: 16px auto;
                    background: #fff;
                    padding: 12px 10px;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.1);
                    font-size: 13px;
                    line-height: 1.35;
                }
                .ticket-header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                .ticket-title { font-size: 18px; font-weight: 900; }
                .table-badge { font-size: 26px; font-weight: 900; margin: 4px 0; border: 2px solid #000; padding: 2px; }
                .meta-line { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
                .items-list { border-bottom: 2px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                .item-row { display: flex; justify-content: space-between; font-size: 14px; font-weight: 800; margin: 4px 0; }
                .item-qty { min-width: 28px; }
                .item-note { font-size: 11px; font-weight: normal; margin-left: 28px; color: #333; }
                .ticket-footer { text-align: center; font-size: 11px; margin-top: 6px; }

                @media print {
                    body { background: #fff; }
                    .action-bar { display: none !important; }
                    .receipt-paper {
                        max-width: 100%;
                        width: 100%;
                        margin: 0;
                        padding: 2px 0;
                        box-shadow: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="action-bar">
                <span style="font-weight: 700; font-size: 14px;">Mutfak Fişi (Masa ${tableNo})</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn-rawbt" onclick="sendRawbt()">⚡ RawBT Bas</button>
                    <button class="btn-print" onclick="window.print()">🖨️ Yazdır</button>
                    <button class="btn-close" onclick="window.close()">✕ Kapat</button>
                </div>
            </div>

            <div class="receipt-paper">
                <div class="ticket-header">
                    <div class="ticket-title">${ticketTitle}</div>
                    <div class="table-badge">MASA ${tableNo}</div>
                    <div class="meta-line">
                        <span>Garson: ${waiterName}</span>
                        <span>Saat: ${nowTime}</span>
                    </div>
                    <div class="meta-line">
                        <span>Tarih: ${nowDate}</span>
                        <span>Kalem: ${kitchenItems.length}</span>
                    </div>
                </div>

                <div class="items-list">
                    ${kitchenItems.map(item => `
                        <div class="item-row">
                            <span class="item-qty">${item.quantity}x</span>
                            <span style="flex:1;">${item.name}</span>
                        </div>
                        ${(item.notes || item.note) ? `<div class="item-note">>> Not: ${item.notes || item.note}</div>` : ''}
                    `).join('')}
                </div>

                <div class="ticket-footer">
                    <div>Afiyet Olsun • Dededen Toruna</div>
                    <div>--------------------------------</div>
                </div>
            </div>

            <script>
                const RAW_TEXT = ${JSON.stringify(rawText)};
                function sendRawbt() {
                    window.location.href = 'rawbt:data:text/plain;charset=utf-8,' + encodeURIComponent(RAW_TEXT);
                }
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        window.print();
                    }, 350);
                });
            </script>
        </body>
        </html>
    `;

    openPrintWindow(ticketHtml);
    return { ok: true, count: kitchenItems.length, mode: 'browser' };
}

/**
 * 🧾 Müşteri Masa Fişi Yazdır (Hesap Kapanmaz)
 */
export function printCustomerReceipt(order, customTitle = "Masa Adisyon Fişi", settings = null) {
    if (!order || !order.items || order.items.length === 0) return false;

    const tableNo = order.table_no || order.table_id || '1';
    const waiterName = order.waiter_name || 'Personel';
    const total = order.total || order.subtotal || order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR');

    const rawText = generateCustomerTicketText(order, customTitle);

    // Eğer doğrudan RawBT modu aktif ve Android ise arkadan fırlat
    if (settings?.mode === 'rawbt' && /Android/i.test(navigator.userAgent)) {
        try {
            window.location.href = 'rawbt:data:text/plain;charset=utf-8,' + encodeURIComponent(rawText);
            return true;
        } catch (e) {
            console.warn("Direct RawBT fail, opening print window:", e);
        }
    }

    const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Adisyon Fişi - Masa ${tableNo}</title>
            <style>
                @page { margin: 4mm; }
                * { box-sizing: border-box; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    color: #000;
                    background: #f1f5f9;
                    margin: 0;
                    padding: 0;
                }
                .action-bar {
                    position: sticky;
                    top: 0;
                    background: #0f172a;
                    color: #fff;
                    padding: 10px 16px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
                    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                    z-index: 9999;
                }
                .btn-print {
                    background: #2563eb;
                    color: #fff;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                }
                .btn-rawbt {
                    background: #059669;
                    color: #fff;
                    border: none;
                    padding: 8px 14px;
                    border-radius: 6px;
                    font-weight: 700;
                    font-size: 13px;
                    cursor: pointer;
                }
                .btn-close {
                    background: #475569;
                    color: #fff;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 13px;
                    cursor: pointer;
                }
                .receipt-paper {
                    max-width: 80mm;
                    margin: 16px auto;
                    background: #fff;
                    padding: 12px 10px;
                    box-shadow: 0 4px 14px rgba(0,0,0,0.1);
                    font-size: 12px;
                    line-height: 1.35;
                }
                .ticket-header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                .brand-title { font-size: 16px; font-weight: 900; }
                .sub-title { font-size: 11px; margin-bottom: 4px; }
                .table-title { font-size: 20px; font-weight: 900; margin: 4px 0; }
                .meta-line { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px; }
                .items-list { border-bottom: 1px dashed #000; padding-bottom: 6px; margin-bottom: 6px; }
                .item-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
                .total-section { border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 6px; }
                .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; }
                .ticket-footer { text-align: center; font-size: 11px; margin-top: 8px; }

                @media print {
                    body { background: #fff; }
                    .action-bar { display: none !important; }
                    .receipt-paper {
                        max-width: 100%;
                        width: 100%;
                        margin: 0;
                        padding: 2px 0;
                        box-shadow: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="action-bar">
                <span style="font-weight: 700; font-size: 14px;">Hesap Fişi (Masa ${tableNo})</span>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <button class="btn-rawbt" onclick="sendRawbt()">⚡ RawBT Bas</button>
                    <button class="btn-print" onclick="window.print()">🖨️ Yazdır</button>
                    <button class="btn-close" onclick="window.close()">✕ Kapat</button>
                </div>
            </div>

            <div class="receipt-paper">
                <div class="ticket-header">
                    <div class="brand-title">DEDEDEN TORUNA</div>
                    <div class="sub-title">Hamsiköy Sütlacı & Cafe</div>
                    <div class="table-title">MASA ${tableNo}</div>
                    <div class="meta-line">
                        <span>Garson: ${waiterName}</span>
                        <span>Saat: ${nowTime}</span>
                    </div>
                    <div class="meta-line">
                        <span>Tarih: ${nowDate}</span>
                        <span>Fiş: ${customTitle}</span>
                    </div>
                </div>

                <div class="items-list">
                    ${order.items.map(item => `
                        <div class="item-row">
                            <span>${item.quantity}x ${item.name}</span>
                            <span style="font-weight:700;">${formatMoney(item.price * item.quantity)}</span>
                        </div>
                    `).join('')}
                </div>

                <div class="total-section">
                    <div class="total-row">
                        <span>TOPLAM:</span>
                        <span>${formatMoney(total)}</span>
                    </div>
                </div>

                <div class="ticket-footer">
                    <div>Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz</div>
                    <div>Afiyet Olsun!</div>
                </div>
            </div>

            <script>
                const RAW_TEXT = ${JSON.stringify(rawText)};
                function sendRawbt() {
                    window.location.href = 'rawbt:data:text/plain;charset=utf-8,' + encodeURIComponent(RAW_TEXT);
                }
                window.addEventListener('load', function() {
                    setTimeout(function() {
                        window.print();
                    }, 350);
                });
            </script>
        </body>
        </html>
    `;

    openPrintWindow(ticketHtml);
    return true;
}

function openPrintWindow(html) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    } else {
        alert('Yazdırma penceresi açılamadı. Lütfen tarayıcınızdan açılır pencere (pop-up) izni verin.');
    }
}
