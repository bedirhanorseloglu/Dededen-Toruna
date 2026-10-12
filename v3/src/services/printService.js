// Termal Fiş Yazdırma Servisi
// Fiş, 80mm termal kağıt genişliğinde (576px @ 203dpi) siyah-beyaz bir görsel olarak çizilir.
// Android tabletlerde görsel doğrudan RawBT uygulamasına gönderilir (önizleme AÇILMAZ).
// Bilgisayarda ise aynı görsel bir yazdırma penceresinde açılır.
import { formatMoney, isInstantDeliveryCategory } from '../data/menu.js';

const PAPER_WIDTH = 576;
const PAD = 28;
const FONT = "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

// Logoyu önceden yükle (tıklama anında senkron çizebilmek için)
const logoImg = typeof Image !== 'undefined' ? new Image() : null;
if (logoImg) logoImg.src = '/logo.png';

const isAndroid = () => /Android/i.test(navigator.userAgent);

/* ------------------------------------------------------------------ */
/* Canvas yardımcıları                                                 */
/* ------------------------------------------------------------------ */

function wrapText(ctx, text, maxWidth) {
    const words = String(text || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach(word => {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function dashedLine(ctx, y) {
    ctx.save();
    ctx.setLineDash([10, 8]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PAD, y);
    ctx.lineTo(PAPER_WIDTH - PAD, y);
    ctx.stroke();
    ctx.restore();
}

/**
 * İki geçişli çizim: önce yükseklik ölçülür, sonra gerçek canvas'a çizilir.
 * layoutFn(ctx, draw) -> toplam yükseklik
 */
function renderToDataUrl(layoutFn) {
    const measure = document.createElement('canvas').getContext('2d');
    const height = Math.ceil(layoutFn(measure, false));

    const canvas = document.createElement('canvas');
    canvas.width = PAPER_WIDTH;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, PAPER_WIDTH, height);
    ctx.fillStyle = '#000';
    ctx.strokeStyle = '#000';
    layoutFn(ctx, true);
    return canvas.toDataURL('image/png');
}

function drawLogo(ctx, draw, y, maxH = 150) {
    if (!logoImg || !logoImg.complete || !logoImg.naturalWidth) return y;
    const ratio = logoImg.naturalWidth / logoImg.naturalHeight;
    let h = maxH;
    let w = h * ratio;
    const maxW = PAPER_WIDTH - PAD * 4;
    if (w > maxW) { w = maxW; h = w / ratio; }
    if (draw) {
        ctx.save();
        ctx.filter = 'grayscale(1) contrast(1.25)';
        ctx.drawImage(logoImg, (PAPER_WIDTH - w) / 2, y, w, h);
        ctx.restore();
    }
    return y + h;
}

function centerText(ctx, draw, text, y, font, size) {
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    if (draw) ctx.fillText(text, PAPER_WIDTH / 2, y);
    ctx.textAlign = 'left';
    return y + size;
}

function nowStrings() {
    const now = new Date();
    return {
        date: now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' }),
        time: now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    };
}

function drawMetaRow(ctx, draw, y, left, right) {
    ctx.font = `500 22px ${FONT}`;
    ctx.textBaseline = 'top';
    if (draw) {
        ctx.textAlign = 'left';
        ctx.fillText(left, PAD, y);
        ctx.textAlign = 'right';
        ctx.fillText(right, PAPER_WIDTH - PAD, y);
        ctx.textAlign = 'left';
    }
    return y + 28;
}

/* ------------------------------------------------------------------ */
/* Fiş tasarımları                                                     */
/* ------------------------------------------------------------------ */

function renderKitchenTicket({ tableNo, items, isExtra }) {
    const { date, time } = nowStrings();

    return renderToDataUrl((ctx, draw) => {
        let y = 20;
        y = drawLogo(ctx, draw, y, 120) + 14;

        y = centerText(ctx, draw, isExtra ? 'İ L A V E   S İ P A R İ Ş' : 'M U T F A K   S İ P A R İ Ş İ', y, `700 22px ${FONT}`, 22) + 14;

        // Ters renkli masa bandı
        const bandH = 100;
        if (draw) {
            roundRect(ctx, PAD, y, PAPER_WIDTH - PAD * 2, bandH, 18);
            ctx.fill();
            ctx.fillStyle = '#fff';
        }
        centerText(ctx, draw, `MASA ${tableNo}`, y + 16, `900 68px ${FONT}`, 68);
        if (draw) ctx.fillStyle = '#000';
        y += bandH + 16;

        y = drawMetaRow(ctx, draw, y, date, time) + 10;
        if (draw) dashedLine(ctx, y);
        y += 22;

        // Ürünler
        const boxW = 76;
        const nameX = PAD + boxW + 18;
        const nameW = PAPER_WIDTH - PAD - nameX;
        items.forEach(item => {
            ctx.font = `800 32px ${FONT}`;
            const lines = wrapText(ctx, item.name, nameW);
            const blockH = Math.max(56, lines.length * 38 + 6);

            if (draw) {
                ctx.lineWidth = 3;
                roundRect(ctx, PAD, y, boxW, 56, 12);
                ctx.stroke();
                ctx.font = `900 30px ${FONT}`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${item.quantity}×`, PAD + boxW / 2, y + 29);
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.font = `800 32px ${FONT}`;
                lines.forEach((ln, i) => ctx.fillText(ln, nameX, y + 9 + i * 38));
            }
            y += blockH + 6;

            const note = item.notes || item.note;
            if (note) {
                ctx.font = `italic 600 24px ${FONT}`;
                const noteLines = wrapText(ctx, `Not: ${note}`, nameW - 16);
                if (draw) {
                    ctx.fillRect(nameX, y, 4, noteLines.length * 30);
                    noteLines.forEach((ln, i) => ctx.fillText(ln, nameX + 14, y + i * 30));
                }
                y += noteLines.length * 30 + 6;
            }
            y += 12;
        });

        if (draw) dashedLine(ctx, y);
        y += 20;
        const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 1), 0);
        y = centerText(ctx, draw, `${items.length} kalem • ${totalQty} adet`, y, `600 22px ${FONT}`, 22) + 10;
        y = centerText(ctx, draw, 'Dededen Toruna', y, `500 20px ${FONT}`, 20);
        return y + 60; // kesici payı
    });
}

function renderCustomerTicket({ tableNo, items, total, title }) {
    const { date, time } = nowStrings();
    const priceColW = 150;

    return renderToDataUrl((ctx, draw) => {
        let y = 20;
        y = drawLogo(ctx, draw, y, 150) + 12;
        y = centerText(ctx, draw, 'DEDEDEN TORUNA', y, `900 36px ${FONT}`, 36) + 6;
        y = centerText(ctx, draw, 'Hamsiköy Sütlacı & Cafe', y, `500 22px ${FONT}`, 22) + 20;

        // Masa rozeti (çerçeveli)
        const badgeW = 260, badgeH = 64;
        if (draw) {
            ctx.lineWidth = 3;
            roundRect(ctx, (PAPER_WIDTH - badgeW) / 2, y, badgeW, badgeH, 32);
            ctx.stroke();
        }
        centerText(ctx, draw, `MASA ${tableNo}`, y + 12, `900 38px ${FONT}`, 38);
        y += badgeH + 10;
        y = centerText(ctx, draw, title, y, `600 20px ${FONT}`, 20) + 18;

        y = drawMetaRow(ctx, draw, y, date, time) + 10;
        if (draw) dashedLine(ctx, y);
        y += 18;

        // Başlık satırı
        ctx.font = `800 18px ${FONT}`;
        if (draw) {
            ctx.textBaseline = 'top';
            ctx.fillText('Ü R Ü N', PAD, y);
            ctx.textAlign = 'right';
            ctx.fillText('T U T A R', PAPER_WIDTH - PAD, y);
            ctx.textAlign = 'left';
        }
        y += 34;

        const nameW = PAPER_WIDTH - PAD * 2 - priceColW;
        items.forEach(item => {
            const qty = Number(item.quantity) || 1;
            ctx.font = `700 26px ${FONT}`;
            const lines = wrapText(ctx, `${qty} × ${item.name}`, nameW);
            if (draw) {
                ctx.textBaseline = 'top';
                lines.forEach((ln, i) => ctx.fillText(ln, PAD, y + i * 32));
                ctx.font = `800 26px ${FONT}`;
                ctx.textAlign = 'right';
                ctx.fillText(formatMoney(Number(item.price) * qty), PAPER_WIDTH - PAD, y);
                ctx.textAlign = 'left';
            }
            y += lines.length * 32;
            if (qty > 1) {
                ctx.font = `500 19px ${FONT}`;
                if (draw) ctx.fillText(`Birim: ${formatMoney(Number(item.price))}`, PAD + 4, y);
                y += 24;
            }
            y += 10;
        });

        y += 4;
        if (draw) dashedLine(ctx, y);
        y += 18;

        // Ters renkli toplam bandı
        const totalH = 80;
        if (draw) {
            roundRect(ctx, PAD, y, PAPER_WIDTH - PAD * 2, totalH, 16);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.textBaseline = 'middle';
            ctx.font = `800 26px ${FONT}`;
            ctx.fillText('TOPLAM', PAD + 22, y + totalH / 2);
            ctx.font = `900 40px ${FONT}`;
            ctx.textAlign = 'right';
            ctx.fillText(formatMoney(total), PAPER_WIDTH - PAD - 22, y + totalH / 2);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#000';
        }
        y += totalH + 26;

        y = centerText(ctx, draw, 'Bizi tercih ettiğiniz için teşekkür ederiz', y, `600 22px ${FONT}`, 22) + 8;
        y = centerText(ctx, draw, 'Afiyet olsun!', y, `800 24px ${FONT}`, 24) + 14;
        y = centerText(ctx, draw, 'Bu belge mali değer taşımaz', y, `400 17px ${FONT}`, 17);
        return y + 60;
    });
}

/* ------------------------------------------------------------------ */
/* Gönderim                                                            */
/* ------------------------------------------------------------------ */

function dispatchImage(dataUrl, title, settings) {
    const isAndroidDevice = isAndroid();

    // 1. Android Tablet / Telefon: Doğrudan RawBT'ye fırlat (SIFIR YENİ SEKME, SIFIR ÖNİZLEME)
    if (isAndroidDevice && settings?.mode !== 'browser') {
        try {
            const oldFrame = document.getElementById('rawbt-intent-iframe');
            if (oldFrame) oldFrame.remove();

            const iframe = document.createElement('iframe');
            iframe.id = 'rawbt-intent-iframe';
            iframe.style.position = 'fixed';
            iframe.style.top = '-9999px';
            iframe.style.left = '-9999px';
            iframe.style.width = '1px';
            iframe.style.height = '1px';
            iframe.style.opacity = '0';
            iframe.style.border = 'none';
            iframe.src = 'rawbt:' + dataUrl;
            document.body.appendChild(iframe);
            setTimeout(() => {
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
            }, 3000);
            return true;
        } catch (e) {
            console.warn("RawBT iframe error, falling back to window.location:", e);
            window.location.href = 'rawbt:' + dataUrl;
            return true;
        }
    }

    // 2. Bilgisayar / Masaüstü: KESİNLİKLE YENİ SEKME AÇMAZ! Gizli arka plan iframe üzerinden doğrudan yazdırır
    printViaSilentIframe(dataUrl);
    return false;
}

function printViaSilentIframe(dataUrl) {
    const oldFrame = document.getElementById('thermal-print-silent-iframe');
    if (oldFrame) oldFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'thermal-print-silent-iframe';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        @page { size: 80mm auto; margin: 0; }
        html, body { margin: 0; padding: 0; background: #fff; }
        img { display: block; width: 100%; max-width: 76mm; margin: 0 auto; }
    </style>
</head>
<body>
    <img src="${dataUrl}" onload="setTimeout(function(){ try { iframeWindow = window; iframeWindow.focus(); iframeWindow.print(); } catch(e){} }, 80)">
</body>
</html>`);
    doc.close();
}

/* ------------------------------------------------------------------ */
/* Dışa açık API                                                       */
/* ------------------------------------------------------------------ */

/**
 * 🍳 Mutfak Fişi
 * Tatlı/içecek kategorisi ve teslim edilmiş ürünler fişe DAHİL EDİLMEZ.
 */
export function printKitchenOrderTicket(order, settings = null) {
    if (!order || !order.items || order.items.length === 0) {
        return { ok: false, message: 'Yazdırılacak ürün bulunamadı.' };
    }

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
    const dataUrl = renderKitchenTicket({
        tableNo,
        items: kitchenItems,
        isExtra: order.items.some(i => i.status === 'delivered')
    });

    const direct = dispatchImage(dataUrl, `Mutfak Fişi - Masa ${tableNo}`, settings);
    return { ok: true, count: kitchenItems.length, direct };
}

/**
 * 🧾 Müşteri Adisyon Fişi (masa açık kalır)
 */
export function printCustomerReceipt(order, customTitle = 'Masa Adisyon Fişi', settings = null) {
    if (!order || !order.items || order.items.length === 0) return false;

    const tableNo = order.table_no || order.table_id || '1';
    const total = order.total || order.subtotal ||
        order.items.reduce((s, i) => s + (Number(i.price) * (Number(i.quantity) || 1)), 0);

    const dataUrl = renderCustomerTicket({ tableNo, items: order.items, total, title: customTitle });
    dispatchImage(dataUrl, `Adisyon - Masa ${tableNo}`, settings);
    return true;
}
