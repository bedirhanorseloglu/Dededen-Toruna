import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { formatMoney } from '../data/menu';
import { Search } from 'lucide-react';

export default function TableCardGrid({
    onSelectTableForReceipt,
    onOpenTableOrder,
    selectedWaiterFilter = 'all',
    showControls = true,
    initialFilter = 'all'
}) {
    const { tables, activeOrders, currentUser, navigateTo } = useApp();
    const [filter, setFilter] = useState(initialFilter); // 'all' | 'occupied' | 'empty'
    const [searchQuery, setSearchQuery] = useState('');

    const handleOpenOrder = (tableNum) => {
        if (onOpenTableOrder) {
            onOpenTableOrder(tableNum);
        } else {
            navigateTo('table', tableNum);
        }
    };

    const handleSelectReceipt = (tableNum) => {
        if (onSelectTableForReceipt) {
            onSelectTableForReceipt(tableNum);
        }
    };

    const getTableOrder = (tableNo) => {
        return activeOrders[String(tableNo)] || null;
    };

    const occupiedCount = useMemo(() => {
        return tables.filter(t => !!getTableOrder(t.table_no)).length;
    }, [tables, activeOrders]);

    const emptyCount = tables.length - occupiedCount;

    const totalActiveRevenue = useMemo(() => {
        return Object.values(activeOrders).reduce((sum, ord) => sum + (Number(ord.total) || 0), 0);
    }, [activeOrders]);

    const filteredTables = useMemo(() => {
        return tables.filter(t => {
            const order = getTableOrder(t.table_no);
            const isOccupied = !!order;

            // Waiter filter (from Admin panel or parent)
            if (selectedWaiterFilter && selectedWaiterFilter !== 'all') {
                if (!order || order.waiter_name !== selectedWaiterFilter) {
                    return false;
                }
            }

            // Occupancy filter
            if (filter === 'occupied' && !isOccupied) return false;
            if (filter === 'empty' && isOccupied) return false;

            // Search query
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return `masa ${t.table_no}`.includes(q) || String(t.table_no).includes(q);
            }
            return true;
        });
    }, [tables, activeOrders, filter, searchQuery, selectedWaiterFilter]);

    return (
        <div className="table-card-grid-wrapper">
            {/* Filter Buttons & Search Box */}
            {showControls && (
                <div className="waiter-controls-row" style={{ marginBottom: '18px' }}>
                    <div className="modern-segmented-control">
                        <button
                            type="button"
                            onClick={() => setFilter('all')}
                            className={`segmented-btn ${filter === 'all' ? 'active' : ''}`}
                        >
                            <span>Tümü</span>
                            <span className="seg-count">{tables.length}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('occupied')}
                            className={`segmented-btn busy-tab ${filter === 'occupied' ? 'active' : ''}`}
                        >
                            <span className="kpi-dot busy-dot"></span>
                            <span>Dolu</span>
                            <span className="seg-count">{occupiedCount}</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter('empty')}
                            className={`segmented-btn empty-tab ${filter === 'empty' ? 'active' : ''}`}
                        >
                            <span className="kpi-dot empty-dot"></span>
                            <span>Boş</span>
                            <span className="seg-count">{emptyCount}</span>
                        </button>
                    </div>

                    <div className="modern-search-box">
                        <Search size={16} className="search-icon" />
                        <input
                            type="text"
                            placeholder="Masa ara (örn: 14)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="modern-search-input"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                className="clear-search-btn"
                                onClick={() => setSearchQuery('')}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* 17 Tables Grid with Framer Motion Stagger */}
            <motion.div
                className="tables-grid"
                initial="hidden"
                animate="show"
                variants={{
                    hidden: { opacity: 0 },
                    show: {
                        opacity: 1,
                        transition: {
                            staggerChildren: 0.018,
                            delayChildren: 0.02
                        }
                    }
                }}
            >
                {filteredTables.map(t => {
                    const tableNum = t.table_no;
                    const order = getTableOrder(tableNum);
                    const isBusy = !!order;
                    const allDelivered = isBusy && (order.items || []).length > 0 && order.items.every(i => i.status === 'delivered');
                    const isMyTable = currentUser?.role === 'waiter' && order && (order.waiter_id === currentUser.id || order.waiter_name === currentUser.name);
                    const itemCount = isBusy ? (order.items || []).reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) : 0;
                    const deliveredCount = isBusy ? (order.items || []).filter(it => it.status === 'delivered').reduce((acc, it) => acc + (Number(it.quantity) || 1), 0) : 0;

                    return (
                        <motion.div
                            key={t.id}
                            className={`modern-table-card table-card ${allDelivered ? 'delivered is-delivered' : (isBusy ? 'busy is-busy' : 'is-empty')}`}
                            id={`table-card-${tableNum}`}
                            variants={{
                                hidden: { opacity: 0, y: 12 },
                                show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.16, 1, 0.3, 1] } }
                            }}
                            whileHover={{ y: -3, transition: { duration: 0.12 } }}
                            onClick={() => {
                                if (isBusy) handleSelectReceipt(tableNum);
                                else handleOpenOrder(tableNum);
                            }}
                        >
                            {/* Top Color Accent Strip */}
                            <div className="card-top-strip" />

                            {/* Card Header: Table No & Status */}
                            <div className="card-head">
                                <div className="table-badge">
                                    <span className="table-title">Masa {tableNum}</span>
                                </div>
                                <div className={`status-pill ${allDelivered ? 'pill-delivered' : (isBusy ? 'pill-busy' : 'pill-empty')}`}>
                                    <span className="status-indicator-dot" />
                                    <span>{allDelivered ? 'Teslim Edildi' : (isBusy ? 'Teslim Edilmedi' : 'Boş')}</span>
                                </div>
                            </div>

                            {/* Card Body: Waiter Info / Item Count & Total */}
                            <div className="card-body">
                                {isBusy ? (
                                    <>
                                        <div className="busy-details">
                                            <span className="waiter-name-chip">
                                                👤 {order.waiter_name || 'Garson'}
                                                {isMyTable && <span className="my-table-tag">BENİM</span>}
                                            </span>
                                            <div className="items-badge-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                                                <span className="items-count-chip">
                                                    🍽️ {itemCount} Ürün
                                                </span>
                                                <span 
                                                    className="delivered-count-sub"
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: 700,
                                                        color: allDelivered ? '#10b981' : '#f59e0b',
                                                        letterSpacing: '-0.2px'
                                                    }}
                                                >
                                                    {deliveredCount}/{itemCount} Teslim Edildi
                                                </span>
                                            </div>
                                        </div>
                                        <div className="table-amount is-active-amount">
                                            {formatMoney(order.total)}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="empty-subtext">Masa Müsait</div>
                                        <div className="table-amount is-zero-amount">
                                            0,00 ₺
                                        </div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    );
                })}

                {filteredTables.length === 0 && (
                    <div className="tables-empty-state">
                        <span style={{ fontSize: '32px' }}>🔍</span>
                        <h3>Eşleşen masa bulunamadı</h3>
                        <p>Arama kriterinize veya filtrenize uygun masa bulunmuyor.</p>
                        <button
                            type="button"
                            onClick={() => { setFilter('all'); setSearchQuery(''); }}
                            className="btn-outline"
                            style={{ padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                        >
                            Filtreleri Temizle
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
