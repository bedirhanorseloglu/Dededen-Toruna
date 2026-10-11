(() => {
    const board = document.getElementById('orderBoard');
    if (!board) return;
    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
    let orders = Array.isArray(window.ORDER_BOARD_INITIAL) ? window.ORDER_BOARD_INITIAL : [];
    let signature = '';
    let syncBusy = false;
    const mutating = new Set();

    const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));

    function render() {
        let pendingCount = 0;
        let doneCount = 0;
        for (const order of orders) {
            pendingCount += Number(order.pending_count || 0);
            if (order.all_delivered) doneCount++;
        }
        document.getElementById('boardOpenCount').textContent = String(orders.length);
        document.getElementById('boardPendingCount').textContent = String(pendingCount);
        document.getElementById('boardDoneCount').textContent = String(doneCount);
        const nav = document.getElementById('boardPendingNav');
        if (nav) nav.textContent = String(pendingCount);
        document.getElementById('boardEmpty').hidden = orders.length > 0;

        board.innerHTML = orders.map(order => {
            const allDone = !!order.all_delivered;
            return `<article class="board-order-card${allDone ? ' all-delivered' : ''}" data-order-id="${order.order_id}">
                <div class="board-order-head">
                    <div>
                        <span class="board-status-dot"></span>
                        <strong>Masa ${order.table_no}</strong>
                        <small>${allDone ? 'Tümü verildi' : `${order.pending_count} ürün bekliyor`} • ${esc(order.age_text || '')}</small>
                    </div>
                    <div class="board-order-meta">
                        <b>${formatMoney(order.total)}</b>
                        <a class="board-detail-link" href="table.php?id=${order.table_id}">Masayı Aç</a>
                    </div>
                </div>
                <div class="board-items">
                    ${(order.items || []).map(item => {
                        const delivered = item.status === 'delivered';
                        const busy = mutating.has(Number(item.id));
                        return `<div class="board-item${delivered ? ' delivered' : ''}" data-item-ids="${(item.ids || [item.id]).join(',')}">
                            <button class="serve-toggle" type="button" data-toggle-items="${(item.ids || [item.id]).join(',')}" data-next-status="${delivered ? 'pending' : 'delivered'}" ${busy ? 'disabled' : ''}>
                                <span>${delivered ? '✓' : ''}</span><small>${delivered ? 'Verildi' : 'Verildi'}</small>
                            </button>
                            <div class="board-item-copy">
                                <strong>${item.quantity > 1 ? `${item.quantity}× ` : ''}${esc(item.name)}</strong>
                                ${item.note ? `<small class="board-item-note">${esc(item.note)}</small>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </article>`;
        }).join('');
    }

    async function postStatus(itemId, status) {
        const r = await fetch('api/toggle_item_status.php', {
            method: 'POST',
            headers: {'Content-Type':'application/json','X-CSRF-Token':csrf},
            body: JSON.stringify({item_id:itemId,status})
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) throw new Error(d.message || 'Durum güncellenemedi.');
        return d;
    }

    board.addEventListener('click', async e => {
        const btn = e.target.closest('[data-toggle-items]');
        if (!btn) return;
        const itemIds = String(btn.dataset.toggleItems || '').split(',').map(Number).filter(Boolean);
        const status = btn.dataset.nextStatus;
        if (!itemIds.length || itemIds.some(id => mutating.has(id))) return;

        let targetItem = null;
        let targetOrder = null;
        for (const order of orders) {
            const found = (order.items || []).find(item => (item.ids || [item.id]).some(id => Number(id) === itemIds[0]));
            if (found) { targetItem = found; targetOrder = order; break; }
        }
        if (!targetItem || !targetOrder) return;

        const oldStatus = targetItem.status;
        targetItem.status = status;
        targetOrder.pending_count = (targetOrder.items || []).reduce((n, item) => n + (item.status === 'delivered' ? 0 : Number(item.quantity || 0)), 0);
        targetOrder.all_delivered = targetOrder.pending_count === 0;
        itemIds.forEach(id => mutating.add(id));
        render();

        try {
            for (const itemId of itemIds) await postStatus(itemId, status);
        } catch (err) {
            targetItem.status = oldStatus;
            targetOrder.pending_count = (targetOrder.items || []).reduce((n, item) => n + (item.status === 'delivered' ? 0 : Number(item.quantity || 0)), 0);
            targetOrder.all_delivered = targetOrder.pending_count === 0;
            showToast(err.message || 'Durum güncellenemedi.', 'error');
        } finally {
            itemIds.forEach(id => mutating.delete(id));
            render();
        }
    });

    async function sync() {
        if (syncBusy || document.hidden || mutating.size) return;
        syncBusy = true;
        try {
            const r = await fetch(`api/orders_state.php?signature=${encodeURIComponent(signature)}`, {cache:'no-store'});
            const d = await r.json();
            if (!d.ok) return;
            signature = d.signature || signature;
            if (d.changed && Array.isArray(d.orders)) {
                orders = d.orders;
                render();
            }
        } catch (_) {
        } finally {
            syncBusy = false;
        }
    }

    render();
    sync();
    setInterval(sync, Math.max(1200, Number(window.ORDER_BOARD_REFRESH_MS || 1800)));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
})();
