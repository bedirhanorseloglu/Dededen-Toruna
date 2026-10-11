// ESC/POS Termal Yazıcı ve Standart Tarayıcı Yazdırma Motoru

export function formatMoney(val) {
    return new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(val || 0)) + ' ₺';
}

export function printOrderReceipt(order, restaurantInfo = { name: "Dededen Toruna", subtitle: "Geleneksel Lezzetler & Cafe Restoran", phone: "" }) {
    // 80mm / 58mm Termal Yazıcı Fiş Şablonu
    const receiptFrame = document.getElementById('receipt-print-frame') || createReceiptFrame();
    
    const itemsHtml = (order.items || []).map(item => `
        <tr>
            <td style="text-align: left; padding: 2px 0;">
                <div><strong>${item.quantity}x ${item.product_name || item.name}</strong></div>
                ${item.note ? `<div style="font-size: 11px; color: #555;">* ${item.note}</div>` : ''}
            </td>
            <td style="text-align: right; vertical-align: top; padding: 2px 0; white-space: nowrap;">
                ${formatMoney((item.unit_price || item.price) * item.quantity)}
            </td>
        </tr>
    `).join('');

    const discountHtml = order.discount_amount > 0 ? `
        <tr>
            <td style="text-align: left; padding: 2px 0;">İndirim:</td>
            <td style="text-align: right; padding: 2px 0;">- ${formatMoney(order.discount_amount)}</td>
        </tr>
    ` : '';

    const content = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Adisyon Fişi</title>
        <style>
            @page {
                size: 80mm auto;
                margin: 0;
            }
            body {
                width: 72mm;
                margin: 4mm auto;
                padding: 0;
                font-family: 'Courier New', Courier, monospace, sans-serif;
                font-size: 13px;
                line-height: 1.3;
                color: #000;
                background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            .double-divider { border-top: 2px solid #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            .header { margin-bottom: 8px; }
            .title { font-size: 16px; font-weight: bold; }
            .subtitle { font-size: 11px; }
            .meta { font-size: 11px; margin-bottom: 6px; }
            .total-row { font-size: 16px; font-weight: bold; }
            .footer { margin-top: 12px; font-size: 11px; text-align: center; }
        </style>
    </head>
    <body>
        <div class="center header">
            <div class="title">${restaurantInfo.name}</div>
            <div class="subtitle">${restaurantInfo.subtitle}</div>
            ${restaurantInfo.phone ? `<div class="subtitle">Tel: ${restaurantInfo.phone}</div>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <div class="meta">
            <div><strong>MASA: ${order.table_no || order.table_id}</strong></div>
            <div>Adisyon No: #${order.id ? order.id.slice(-6).toUpperCase() : '---'}</div>
            <div>Tarih: ${new Date().toLocaleString('tr-TR')}</div>
            <div>Garson: ${order.waiter_name || 'Personel'}</div>
            <div>Ödeme Türü: <strong>${order.payment_method === 'card' ? 'KREDİ KARTI' : (order.payment_method === 'cash' ? 'NAKİT' : 'DİĞER')}</strong></div>
        </div>

        <div class="divider"></div>

        <table>
            <thead>
                <tr>
                    <th style="text-align: left; border-bottom: 1px solid #000; padding-bottom: 3px;">ÜRÜN</th>
                    <th style="text-align: right; border-bottom: 1px solid #000; padding-bottom: 3px;">TUTAR</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
        </table>

        <div class="divider"></div>

        <table>
            <tr>
                <td style="text-align: left;">Ara Toplam:</td>
                <td style="text-align: right;">${formatMoney(order.subtotal || order.total)}</td>
            </tr>
            ${discountHtml}
            <tr class="total-row">
                <td style="text-align: left; padding-top: 4px;">GENEL TOPLAM:</td>
                <td style="text-align: right; padding-top: 4px;">${formatMoney(order.total)}</td>
            </tr>
        </table>

        <div class="double-divider"></div>

        <div class="footer">
            <div>AFİYET OLSUN!</div>
            <div>Mali değeri yoktur / Bilgi fişidir.</div>
        </div>
    </body>
    </html>
    `;

    const doc = receiptFrame.contentWindow.document;
    doc.open();
    doc.write(content);
    doc.close();

    setTimeout(() => {
        receiptFrame.contentWindow.focus();
        receiptFrame.contentWindow.print();
    }, 250);
}

function createReceiptFrame() {
    const iframe = document.createElement('iframe');
    iframe.id = 'receipt-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);
    return iframe;
}
