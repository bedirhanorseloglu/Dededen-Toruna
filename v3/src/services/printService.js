// Termal Fiş Yazdırma Servisi (ESC/POS & Tarayıcı Termal Yazıcı Şablonu)
import { formatMoney, isInstantDeliveryCategory } from '../data/menu.js';

/**
 * 🍳 Mutfağa Termal Sipariş Fişi Yazdır
 * Müşteri Kuralı: Tatlı ve içecek kategorisindeki ürünler bu fişe DAHİL EDİLMEZ!
 * Yalnızca mutfakta pişirilecek/hazırlanacak ürünler dökülür.
 */
export function printKitchenOrderTicket(order) {
    if (!order || !order.items || order.items.length === 0) return { ok: false, message: 'Yazdırılacak ürün bulunamadı.' };

    // 1) Teslim edilmiş (status === 'delivered') ürünler mutfak fişine DAHİL EDİLMEZ! (Daha önce teslim edilmiş olanlar tekrar mutfağa gitmez)
    // 2) Tatlı ve içecek kategorisi doğrudan tezgahtan verildiği için mutfak fişine DAHİL EDİLMEZ!
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

    const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Mutfak Fişi - Masa ${tableNo}</title>
            <style>
                @page { size: 80mm auto; margin: 0; }
                body {
                    width: 76mm;
                    margin: 0 auto;
                    padding: 8px 4px;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 13px;
                    line-height: 1.35;
                    color: #000;
                    background: #fff;
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
            </style>
        </head>
        <body>
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
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `;

    openPrintWindow(ticketHtml);
    return { ok: true, count: kitchenItems.length };
}

/**
 * 🧾 Müşteri Masa Fişi Yazdır (Hesap Kapanmaz)
 */
export function printCustomerReceipt(order, customTitle = "Masa Adisyon Fişi") {
    if (!order || !order.items || order.items.length === 0) return false;

    const tableNo = order.table_no || order.table_id || '1';
    const waiterName = order.waiter_name || 'Personel';
    const total = order.total || order.subtotal || order.items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const nowTime = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    const nowDate = new Date().toLocaleDateString('tr-TR');

    const ticketHtml = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Adisyon Fişi - Masa ${tableNo}</title>
            <style>
                @page { size: 80mm auto; margin: 0; }
                body {
                    width: 76mm;
                    margin: 0 auto;
                    padding: 8px 4px;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    line-height: 1.35;
                    color: #000;
                    background: #fff;
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
            </style>
        </head>
        <body>
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
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `;

    openPrintWindow(ticketHtml);
    return true;
}

function openPrintWindow(html) {
    const printWindow = window.open('', '_blank', 'width=380,height=600');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
    }
}
