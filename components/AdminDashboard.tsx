
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface AdminDashboardProps {
    onClose: () => void;
}

type TabType = 'overview' | 'orders' | 'products' | 'customers';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const [stats, setStats] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Filters
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (activeTab === 'overview') {
                const data = await api.admin.getStats();
                setStats({
                    ...(data.stats || {}),
                    ordersByStatus: data.ordersByStatus || {},
                    recentOrders: data.recentOrders || [],
                    lowStockProducts: data.lowStockProducts || [],
                });
            } else if (activeTab === 'orders') {
                const data = await api.admin.getOrders();
                setOrders(data.orders || []);
            } else if (activeTab === 'products') {
                const data = await api.admin.getProducts();
                setProducts(data.products || []);
            } else if (activeTab === 'customers') {
                const data = await api.admin.getUsers();
                setCustomers(data.users || []);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
        try {
            await api.admin.updateOrderStatus(orderId, status);
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleVerifyPayment = async (orderId: string) => {
        try {
            await api.admin.markPaymentComplete(orderId);
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const handleUpdateUserStatus = async (userId: string, status: 'active' | 'banned' | 'suspended') => {
        if (!confirm(`Are you sure you want to ${status === 'banned' ? 'ban' : status === 'suspended' ? 'suspend' : 'activate'} this user?`)) return;
        try {
            await api.admin.updateUserStatus(userId, status);
            fetchData();
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    // Filter orders
    const filteredOrders = orders.filter(order => {
        if (orderStatusFilter !== 'all' && order.status !== orderStatusFilter) return false;
        if (paymentFilter === 'paid' && order.payment?.status !== 'success') return false;
        if (paymentFilter === 'unpaid' && order.payment?.status === 'success') return false;
        return true;
    });

    const navItems: { id: TabType; label: string; icon: string }[] = [
        { id: 'overview', label: 'Overview', icon: '📊' },
        { id: 'orders', label: 'Orders', icon: '📦' },
        { id: 'products', label: 'Products', icon: '🍯' },
        { id: 'customers', label: 'Customers', icon: '👥' },
    ];

    return (
        <div className="fixed inset-0 z-[200] flex overflow-hidden" style={{ fontFamily: '"Plus Jakarta Sans", "Quicksand", system-ui, sans-serif' }}>
            {/* SIDEBAR */}
            <aside
                className={`${sidebarCollapsed ? 'w-20' : 'w-72'} shrink-0 flex flex-col transition-all duration-300 ease-in-out relative z-10`}
                style={{ background: 'linear-gradient(180deg, #1F120F 0%, #2D1B18 50%, #1a0e0b 100%)' }}
            >
                <div className="p-5 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                            style={{ background: 'linear-gradient(135deg, #FFC107, #E65100)' }}>🐝</div>
                        {!sidebarCollapsed && (
                            <div className="overflow-hidden">
                                <h1 className="text-white font-black text-sm tracking-tight truncate">SINGGLEBEE</h1>
                                <p className="text-amber-500/60 text-[9px] font-bold uppercase tracking-[0.2em]">Admin Console</p>
                            </div>
                        )}
                    </div>
                </div>
                <nav className="flex-1 py-4 px-3 space-y-1">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${activeTab === item.id ? 'bg-amber-500/15 text-amber-400' : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}>
                            <span className="text-lg shrink-0">{item.icon}</span>
                            {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                            {activeTab === item.id && !sidebarCollapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                        </button>
                    ))}
                </nav>
                <div className="p-3 border-t border-white/5 space-y-2">
                    <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-gray-600 hover:text-gray-400 hover:bg-white/5 transition-all font-bold">
                        <span className="text-base shrink-0">{sidebarCollapsed ? '→' : '←'}</span>
                        {!sidebarCollapsed && <span>Collapse</span>}
                    </button>
                    <button onClick={onClose}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/10 transition-all font-bold">
                        <span className="text-base shrink-0">✕</span>
                        {!sidebarCollapsed && <span>Exit Dashboard</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN */}
            <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
                <header className="h-16 shrink-0 bg-white border-b border-gray-100 flex items-center justify-between px-8">
                    <div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight capitalize">{activeTab === 'overview' ? 'Dashboard Overview' : activeTab}</h2>
                        <p className="text-[10px] text-gray-400 font-bold">
                            {currentTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchData} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-all text-sm" title="Refresh">🔄</button>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white" style={{ background: 'linear-gradient(135deg, #FFC107, #E65100)' }}>A</div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6 lg:p-8">
                    {isLoading ? <LoadingState tab={activeTab} /> : error ? <ErrorState error={error} onRetry={fetchData} /> : (
                        <>
                            {activeTab === 'overview' && stats && <OverviewTab stats={stats} />}
                            {activeTab === 'orders' && (
                                <OrdersTab
                                    orders={filteredOrders}
                                    allOrders={orders}
                                    onUpdateStatus={handleUpdateOrderStatus}
                                    onVerifyPayment={handleVerifyPayment}
                                    statusFilter={orderStatusFilter}
                                    paymentFilter={paymentFilter}
                                    onStatusFilterChange={setOrderStatusFilter}
                                    onPaymentFilterChange={setPaymentFilter}
                                />
                            )}
                            {activeTab === 'products' && <ProductsTab products={products} />}
                            {activeTab === 'customers' && <CustomersTab customers={customers} onUpdateStatus={handleUpdateUserStatus} />}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

/* ═══════════ OVERVIEW ═══════════ */
const OverviewTab = ({ stats }: { stats: any }) => (
    <div className="space-y-8 animate-fade-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <KPICard label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toLocaleString('en-IN')}`} icon="💰" gradient="from-emerald-500 to-teal-600" trend="+12.5%" trendUp={true} />
            <KPICard label="Total Orders" value={stats.totalOrders || 0} icon="📦" gradient="from-amber-500 to-orange-600" trend={`${stats.pendingOrders || 0} pending`} trendUp={null} />
            <KPICard label="Customers" value={stats.totalUsers || 0} icon="👥" gradient="from-violet-500 to-purple-600" trend="Active" trendUp={true} />
            <KPICard label="Products" value={stats.totalProducts || 0} icon="🍯" gradient="from-rose-500 to-pink-600" trend={stats.lowStockProducts?.length > 0 ? `${stats.lowStockProducts.length} low stock` : 'All healthy'} trendUp={stats.lowStockProducts?.length === 0} />
        </div>

        {/* Order Pipeline */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>Order Pipeline
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats.ordersByStatus && Object.entries(stats.ordersByStatus).map(([status, count]: any) => (
                    <div key={status} className="bg-gray-50 rounded-xl p-4 text-center hover:bg-amber-50 transition-colors group">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest mb-2 ${getStatusColor(status)}`}>{status}</span>
                        <p className="text-2xl font-black text-gray-900 group-hover:text-amber-600 transition-colors">{count}</p>
                    </div>
                ))}
                {(!stats.ordersByStatus || Object.keys(stats.ordersByStatus).length === 0) && (
                    <p className="text-gray-400 text-sm col-span-full text-center py-4">No orders yet</p>
                )}
            </div>
        </div>

        {/* Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>Recent Orders
                </h3>
                {stats.recentOrders?.length > 0 ? (
                    <div className="space-y-3">
                        {stats.recentOrders.map((order: any) => (
                            <div key={order._id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-xs">📦</div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">#{order.orderId}</p>
                                        <p className="text-[10px] text-gray-400">{order.user?.fullName || 'Guest'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-gray-900">₹{order.pricing?.total?.toLocaleString('en-IN') || '0'}</p>
                                    <span className={`text-[9px] font-bold uppercase ${getStatusColor(order.status)}`}>{order.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : <EmptyMini message="No recent orders" />}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
                <h3 className="text-sm font-black text-gray-900 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>Stock Alerts
                </h3>
                {stats.lowStockProducts?.length > 0 ? (
                    <div className="space-y-3">
                        {stats.lowStockProducts.map((product: any) => (
                            <div key={product._id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-xs">⚠️</div>
                                    <p className="text-xs font-bold text-gray-700 truncate max-w-[180px]">{product.title}</p>
                                </div>
                                <span className="text-xs font-black text-rose-500 bg-rose-50 px-2.5 py-1 rounded-lg">{product.stockQuantity ?? product.stock ?? 0} left</span>
                            </div>
                        ))}
                    </div>
                ) : <EmptyMini message="All products well-stocked 🎉" />}
            </div>
        </div>
    </div>
);

/* ═══════════ ORDERS TAB (ENHANCED) ═══════════ */
const OrdersTab = ({ orders, allOrders, onUpdateStatus, onVerifyPayment, statusFilter, paymentFilter, onStatusFilterChange, onPaymentFilterChange }: {
    orders: any[]; allOrders: any[];
    onUpdateStatus: (id: string, status: string) => void; onVerifyPayment: (id: string) => void;
    statusFilter: string; paymentFilter: string;
    onStatusFilterChange: (f: string) => void; onPaymentFilterChange: (f: string) => void;
}) => {
    const paidCount = allOrders.filter(o => o.payment?.status === 'success').length;
    const unpaidCount = allOrders.length - paidCount;

    return (
        <div className="space-y-5 animate-fade-in">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                    <p className="text-xl font-black text-gray-900">{allOrders.length}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => onPaymentFilterChange(paymentFilter === 'paid' ? 'all' : 'paid')}>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Paid ✓</p>
                    <p className="text-xl font-black text-emerald-700">{paidCount}</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 text-center cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => onPaymentFilterChange(paymentFilter === 'unpaid' ? 'all' : 'unpaid')}>
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Unpaid ✗</p>
                    <p className="text-xl font-black text-amber-700">{unpaidCount}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Filtered</p>
                    <p className="text-xl font-black text-gray-900">{orders.length}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">Status:</span>
                {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(s => (
                    <button key={s} onClick={() => onStatusFilterChange(s)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${statusFilter === s ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'
                            }`}>{s}</button>
                ))}
                <span className="text-gray-200 mx-1">|</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider mr-1">Payment:</span>
                {['all', 'paid', 'unpaid'].map(p => (
                    <button key={p} onClick={() => onPaymentFilterChange(p)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${paymentFilter === p ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:border-gray-400'
                            }`}>{p}</button>
                ))}
            </div>

            {/* Table */}
            {orders.length === 0 ? (
                <EmptyState message="No orders match filters." />
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left min-w-[750px]">
                            <thead>
                                <tr className="border-b border-gray-100">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.map(order => (
                                    <tr key={order._id} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-gray-900">#{order.orderId}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-gray-700">{order.shippingAddress?.fullName || '—'}</p>
                                            <p className="text-[10px] text-gray-400">{order.shippingAddress?.phone || ''}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-black text-gray-900">₹{(order.pricing?.total || 0).toLocaleString('en-IN')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusColor(order.status)}`}>{order.status}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-block w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase ${order.payment?.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                                                    order.payment?.method === 'upi_manual' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
                                                    }`}>{order.payment?.status || 'pending'}</span>
                                                {order.payment?.method === 'upi_manual' && order.payment?.status !== 'success' && (
                                                    <button onClick={() => onVerifyPayment(order._id)} className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded hover:bg-amber-100 transition-colors w-fit">✓ Verify UPI</button>
                                                )}
                                                {order.payment?.status !== 'success' && (
                                                    <button onClick={() => onVerifyPayment(order._id)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors w-fit">💳 Mark Paid</button>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <select value={order.status} onChange={(e) => onUpdateStatus(order._id, e.target.value)}
                                                className="bg-gray-50 border border-gray-200 rounded-lg text-[10px] font-bold py-1.5 pl-2.5 pr-7 focus:ring-2 ring-amber-300 outline-none cursor-pointer appearance-none"
                                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', backgroundSize: '12px' }}>
                                                <option value="pending">Pending</option>
                                                <option value="processing">Processing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ═══════════ PRODUCTS TAB ═══════════ */
const ProductsTab = ({ products }: { products: any[] }) => (
    <div className="space-y-5 animate-fade-in">
        <h3 className="text-sm font-black text-gray-900">{products.length} Products</h3>
        {products.length === 0 ? <EmptyState message="No products in inventory." /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map(product => {
                    const stock = product.stock ?? product.stockQuantity ?? 0;
                    return (
                        <div key={product._id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:border-amber-200 hover:shadow-md transition-all">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-xl bg-gray-50 overflow-hidden shrink-0 border border-gray-100">
                                    <img src={product.images?.[0] || '/assets/bee-character.png'} alt={product.title} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-black text-gray-900 truncate">{product.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{product.category} • {product.language || 'N/A'}</p>
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-sm font-black text-amber-600">₹{product.price}</span>
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stock <= 5 ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>{stock} in stock</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-50">
                                <span className="flex-1 text-center bg-gray-50 text-gray-500 font-bold py-2 rounded-lg text-[10px]">★ {product.rating || '—'}</span>
                                <span className="flex-1 text-center bg-gray-50 text-gray-500 font-bold py-2 rounded-lg text-[10px]">{product.reviewCount || 0} reviews</span>
                                <span className={`flex-1 text-center font-bold py-2 rounded-lg text-[10px] uppercase ${product.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{product.status || 'active'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
);

/* ═══════════ CUSTOMERS TAB (ENHANCED) ═══════════ */
const CustomersTab = ({ customers, onUpdateStatus }: { customers: any[]; onUpdateStatus: (id: string, status: 'active' | 'banned' | 'suspended') => void }) => (
    <div className="space-y-5 animate-fade-in">
        <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900">{customers.length} Customers</h3>
            <div className="flex gap-2 text-[10px] font-bold text-gray-400">
                <span className="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Active: {customers.filter(c => c.status === 'active').length}</span>
                <span className="bg-rose-50 text-rose-600 px-2 py-1 rounded">Banned: {customers.filter(c => c.status === 'banned').length}</span>
                <span className="bg-amber-50 text-amber-600 px-2 py-1 rounded">Suspended: {customers.filter(c => c.status === 'suspended').length}</span>
            </div>
        </div>
        {customers.length === 0 ? <EmptyState message="No customers registered yet." /> : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[800px]">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Activity</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {customers.map(customer => {
                                const joinedDate = new Date(customer.createdAt);
                                const lastLogin = customer.lastLoginAt ? new Date(customer.lastLoginAt) : null;
                                const daysSinceJoin = Math.floor((Date.now() - joinedDate.getTime()) / (1000 * 60 * 60 * 24));
                                const loginCount = customer.loginHistory?.length || customer.loginCount || 0;

                                return (
                                    <tr key={customer._id} className="hover:bg-amber-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: 'linear-gradient(135deg, #FFC107, #E65100)' }}>
                                                    {(customer.fullName || customer.name || customer.email || '?')[0].toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">{customer.fullName || customer.name || 'Unknown'}</p>
                                                    <p className="text-[10px] text-gray-400">{customer.phone || 'No phone'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="text-[9px] bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500">{customer._id}</code>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-500">{customer.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${customer.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>{customer.role === 'admin' ? 'Admin' : 'Customer'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${customer.status === 'active' ? 'bg-emerald-100 text-emerald-600' :
                                                customer.status === 'suspended' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'
                                                }`}>{customer.status}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-0.5">
                                                <p className="text-[10px] text-gray-500">Joined <span className="font-bold text-gray-700">{daysSinceJoin}d ago</span></p>
                                                {lastLogin && <p className="text-[10px] text-gray-400">Last seen: {lastLogin.toLocaleDateString('en-IN')}</p>}
                                                {loginCount > 0 && <p className="text-[10px] text-gray-400">{loginCount} logins</p>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {customer.role !== 'admin' && (
                                                <div className="flex gap-1 justify-end">
                                                    {customer.status !== 'active' && (
                                                        <button onClick={() => onUpdateStatus(customer._id, 'active')} className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 transition-colors">Activate</button>
                                                    )}
                                                    {customer.status !== 'suspended' && (
                                                        <button onClick={() => onUpdateStatus(customer._id, 'suspended')} className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded hover:bg-amber-100 transition-colors">Suspend</button>
                                                    )}
                                                    {customer.status !== 'banned' && (
                                                        <button onClick={() => onUpdateStatus(customer._id, 'banned')} className="text-[9px] font-black text-rose-600 bg-rose-50 border border-rose-200 px-2 py-1 rounded hover:bg-rose-100 transition-colors">Ban</button>
                                                    )}
                                                </div>
                                            )}
                                            {customer.role === 'admin' && <span className="text-[9px] text-gray-400 italic">Protected</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </div>
);

/* ═══════════ SHARED COMPONENTS ═══════════ */
const KPICard = ({ label, value, icon, gradient, trend, trendUp }: { label: string; value: any; icon: string; gradient: string; trend: string; trendUp: boolean | null }) => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
        <div className={`absolute top-0 right-0 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-5 -mr-6 -mt-6 group-hover:opacity-10 transition-opacity`}></div>
        <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{icon}</span>
            {trend && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${trendUp === true ? 'bg-emerald-50 text-emerald-600' : trendUp === false ? 'bg-rose-50 text-rose-600' : 'bg-gray-50 text-gray-500'}`}>{trend}</span>}
        </div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
);

const EmptyState = ({ message }: { message: string }) => (<div className="text-center py-20 bg-white rounded-2xl border border-gray-100"><div className="text-4xl mb-4">🐝</div><p className="text-gray-400 font-bold text-sm">{message}</p></div>);
const EmptyMini = ({ message }: { message: string }) => (<div className="text-center py-10"><p className="text-gray-400 font-bold text-xs">{message}</p></div>);

const LoadingState = ({ tab }: { tab: string }) => (
    <div className="space-y-5 animate-pulse">
        {tab === 'overview' && (<><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">{[...Array(4)].map((_, i) => (<div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-32"><div className="w-8 h-8 bg-gray-100 rounded-lg mb-3"></div><div className="h-3 bg-gray-100 rounded w-24 mb-2"></div><div className="h-6 bg-gray-100 rounded w-16"></div></div>))}</div><div className="bg-white rounded-2xl border border-gray-100 p-6 h-48"></div></>)}
        {(tab === 'orders' || tab === 'customers') && (<div className="bg-white rounded-2xl border border-gray-100 p-6">{[...Array(5)].map((_, i) => (<div key={i} className="flex gap-4 py-4 border-b border-gray-50"><div className="w-20 h-4 bg-gray-100 rounded"></div><div className="w-32 h-4 bg-gray-100 rounded"></div><div className="w-16 h-4 bg-gray-100 rounded"></div></div>))}</div>)}
        {tab === 'products' && (<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => (<div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 h-40"></div>))}</div>)}
    </div>
);

const ErrorState = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-8 text-center">
        <p className="text-rose-600 font-black text-sm mb-2">Connection Error</p>
        <p className="text-rose-400 text-xs mb-4">{error}</p>
        <button onClick={onRetry} className="bg-rose-600 text-white px-5 py-2 rounded-xl text-xs font-black hover:bg-rose-700 transition-colors">Retry</button>
    </div>
);

const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
        case 'pending': return 'bg-amber-100 text-amber-700';
        case 'processing': return 'bg-cyan-100 text-cyan-700';
        case 'shipped': return 'bg-indigo-100 text-indigo-700';
        case 'delivered': return 'bg-emerald-100 text-emerald-700';
        case 'cancelled': return 'bg-rose-100 text-rose-700';
        case 'paid': return 'bg-emerald-100 text-emerald-700';
        default: return 'bg-gray-100 text-gray-500';
    }
};

export default AdminDashboard;
