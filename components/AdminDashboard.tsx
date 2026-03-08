
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import BeeCharacter from './BeeCharacter.tsx';

interface AdminDashboardProps {
    onClose: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'products'>('stats');
    const [stats, setStats] = useState<any>(null);
    const [orders, setOrders] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (activeTab === 'stats') {
                const data = await api.admin.getStats();
                setStats(data);
            } else if (activeTab === 'orders') {
                const data = await api.admin.getOrders();
                setOrders(data.orders);
            } else if (activeTab === 'products') {
                const data = await api.admin.getProducts();
                setProducts(data.products);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch hive data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId: string, status: string) => {
        try {
            await api.admin.updateOrderStatus(orderId, status);
            fetchData(); // Refresh
        } catch (err: any) {
            alert('Error updating status: ' + err.message);
        }
    };

    const handleVerifyPayment = async (orderId: string) => {
        try {
            await api.admin.markPaymentComplete(orderId);
            fetchData(); // Refresh
        } catch (err: any) {
            alert('Error verifying payment: ' + err.message);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] bg-brand-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-10 animate-fade-in overflow-hidden">
            <div className="bg-white rounded-[3rem] w-full max-w-7xl h-full flex flex-col shadow-2xl border-[8px] border-brand-accent animate-slide-up overflow-hidden relative">

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/5 rounded-full blur-3xl -ml-48 -mb-48 pointer-events-none" />

                {/* Header */}
                <div className="px-10 py-8 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/50 backdrop-blur-md relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-14 h-14 bg-brand-black rounded-2xl flex items-center justify-center shadow-lg group relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/20 to-transparent"></div>
                            <BeeCharacter size="2rem" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-brand-black tracking-tighter">Queen Bee Dashboard</h2>
                            <p className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.4em] mt-1 opacity-60">Hive Management Protocol</p>
                        </div>
                    </div>

                    <div className="flex bg-gray-100 p-1.5 rounded-2xl gap-2">
                        {(['stats', 'orders', 'products'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-white text-brand-black shadow-honey-hover scale-105' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-rose-500 hover:text-white transition-all active:scale-90 font-black">✕</button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-10 custom-scrollbar relative z-0">
                    {isLoading ? (
                        <div className="animate-pulse space-y-6">
                            {activeTab === 'stats' && (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {[...Array(4)].map((_, i) => (
                                            <div key={i} className="bg-white p-10 rounded-[3rem] border-4 border-brand-light">
                                                <div className="w-10 h-10 bg-gray-100 rounded-2xl mb-6" />
                                                <div className="h-3 bg-gray-100 rounded-full w-2/3 mb-3" />
                                                <div className="h-8 bg-gray-100 rounded-full w-1/2" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="col-span-4 bg-white p-10 rounded-[3rem] border-4 border-brand-light">
                                        <div className="h-4 bg-gray-100 rounded-full w-48 mb-8" />
                                        <div className="grid grid-cols-4 gap-4">
                                            {[...Array(4)].map((_, i) => (
                                                <div key={i} className="bg-brand-light p-8 rounded-[2.5rem] border-4 border-white">
                                                    <div className="h-3 bg-white rounded-full w-3/4 mb-4" />
                                                    <div className="h-8 bg-white rounded-full w-1/2" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                            {activeTab === 'orders' && (
                                <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
                                    <div className="bg-gray-50/50 border-b border-gray-100 px-8 py-6 grid grid-cols-6 gap-4">
                                        {[...Array(6)].map((_, i) => <div key={i} className="h-3 bg-gray-100 rounded-full" />)}
                                    </div>
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="px-8 py-6 border-b border-gray-50 grid grid-cols-6 gap-4 items-center">
                                            <div className="space-y-2"><div className="h-4 bg-gray-100 rounded-full w-3/4" /><div className="h-3 bg-gray-50 rounded-full w-1/2" /></div>
                                            <div className="space-y-2"><div className="h-4 bg-gray-100 rounded-full" /><div className="h-3 bg-gray-50 rounded-full w-2/3" /></div>
                                            <div className="h-5 bg-gray-100 rounded-full w-16" />
                                            <div className="h-6 bg-gray-100 rounded-full w-20" />
                                            <div className="h-6 bg-gray-100 rounded-full w-16" />
                                            <div className="h-8 bg-gray-100 rounded-xl" />
                                        </div>
                                    ))}
                                </div>
                            )}
                            {activeTab === 'products' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="bg-white p-8 rounded-[3rem] border-2 border-brand-light">
                                            <div className="flex gap-6">
                                                <div className="w-24 h-24 bg-gray-100 rounded-2xl shrink-0" />
                                                <div className="flex-grow space-y-3">
                                                    <div className="h-5 bg-gray-100 rounded-full w-3/4" />
                                                    <div className="h-3 bg-gray-50 rounded-full w-1/2" />
                                                    <div className="flex justify-between">
                                                        <div className="h-5 bg-gray-100 rounded-full w-16" />
                                                        <div className="h-5 bg-gray-100 rounded-full w-20" />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-gray-50 flex gap-3">
                                                <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                                                <div className="flex-1 h-10 bg-gray-100 rounded-xl" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : error ? (
                        <div className="bg-rose-50 border-2 border-brand-rose/10 p-10 rounded-[3rem] text-center">
                            <p className="text-brand-rose font-black text-xl mb-4">🚨 BUZZ ERROR</p>
                            <p className="text-gray-600 font-bold">{error}</p>
                            <button onClick={fetchData} className="mt-8 bg-brand-rose text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs">Try Re-Syncing</button>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            {activeTab === 'stats' && stats && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <StatCard label="Total Revenue" value={`₹${stats.totalRevenue.toLocaleString('en-IN')}`} icon="💰" color="brand-meadow" />
                                    <StatCard label="Total Orders" value={stats.totalOrders} icon="📦" color="brand-primary" />
                                    <StatCard label="Total Customers" value={stats.totalUsers} icon="👤" color="brand-secondary" />
                                    <StatCard label="Active Stock" value={stats.lowStockProducts.length > 0 ? 'Low Stock Alert' : 'Healthy'} icon="🍯" color={stats.lowStockProducts.length > 0 ? 'brand-rose' : 'brand-meadow'} />

                                    <div className="col-span-1 md:col-span-2 lg:col-span-4 mt-10">
                                        <h3 className="text-2xl font-black text-brand-black mb-8 px-2">Order Distribution</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {Object.entries(stats.ordersByStatus).map(([status, count]: any) => (
                                                <div key={status} className="bg-brand-light p-8 rounded-[2.5rem] border-4 border-white text-center shadow-sm">
                                                    <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{status}</span>
                                                    <span className="text-3xl font-black text-brand-black">{count}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'orders' && (
                                <div className="space-y-6">
                                    {orders.length === 0 ? (
                                        <EmptyState message="No orders in the hive yet." />
                                    ) : (
                                        <div className="bg-white rounded-[3rem] border border-gray-100 overflow-hidden shadow-sm">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</th>
                                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</th>
                                                        <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {orders.map(order => (
                                                        <tr key={order._id} className="hover:bg-brand-light/30 transition-colors group">
                                                            <td className="px-8 py-6">
                                                                <span className="font-black text-brand-black">#{order.orderId}</span>
                                                                <span className="block text-[10px] text-gray-400 font-bold mt-1">{new Date(order.createdAt).toLocaleDateString()}</span>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <span className="font-bold text-gray-600 block">{order.shippingAddress.fullName}</span>
                                                                <span className="text-[10px] text-gray-400">{order.shippingAddress.phone}</span>
                                                            </td>
                                                            <td className="px-8 py-6 font-black text-brand-black">₹{order.pricing.total.toLocaleString('en-IN')}</td>
                                                            <td className="px-8 py-6">
                                                                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusStyle(order.status)}`}>
                                                                    {order.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-8 py-6">
                                                                <div className="flex flex-col items-start gap-1">
                                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${order.payment?.status === 'success' ? 'bg-brand-meadow/20 text-brand-meadow' : order.payment?.method === 'upi_manual' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                                                                        {order.payment?.status || 'unknown'}
                                                                    </span>
                                                                    {order.payment?.method === 'upi_manual' && order.payment?.status !== 'success' && (
                                                                        <button
                                                                            onClick={() => handleVerifyPayment(order._id)}
                                                                            className="text-[9px] font-black text-brand-primary bg-brand-black px-2 py-1 rounded hover:scale-105 transition-transform"
                                                                        >
                                                                            Verify UPI
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="px-8 py-6 text-right">
                                                                <select
                                                                    value={order.status}
                                                                    onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                                                    className="bg-gray-100 border-none rounded-xl text-xs font-black uppercase tracking-wider py-2 pl-4 pr-10 focus:ring-2 ring-brand-primary outline-none appearance-none cursor-pointer"
                                                                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                                                                >
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
                                    )}
                                </div>
                            )}

                            {activeTab === 'products' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {products.map(product => (
                                        <div key={product._id} className="bg-white p-8 rounded-[3rem] border-2 border-brand-light hover:border-brand-primary transition-all group relative overflow-hidden shadow-sm">
                                            <div className="flex gap-6">
                                                <div className="w-24 h-24 bg-brand-light rounded-2xl overflow-hidden shrink-0 border border-gray-100">
                                                    <img src={product.images?.[0] || 'https://via.placeholder.com/150'} alt={product.title} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-grow min-w-0">
                                                    <h4 className="font-black text-brand-black truncate text-lg">{product.title}</h4>
                                                    <p className="text-xs font-bold text-gray-500 mb-4">{product.category}</p>
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-brand-secondary font-black">₹{product.price}</span>
                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${(product.stock ?? product.stockQuantity ?? 0) < 5 ? 'text-brand-rose' : 'text-brand-meadow'}`}>
                                                            Stock: {product.stock ?? product.stockQuantity ?? 0}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-8 pt-8 border-t border-gray-50 flex gap-3">
                                                <button className="flex-1 bg-gray-100 text-gray-600 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-brand-primary hover:text-white transition-all">Edit</button>
                                                <button className="flex-1 bg-gray-100 text-brand-rose/60 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-brand-rose hover:text-white transition-all">Disable</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper Components
const StatCard = ({ label, value, icon, color }: any) => (
    <div className="bg-white p-10 rounded-[3rem] shadow-honey border-4 border-brand-light relative overflow-hidden group hover:scale-[1.02] transition-all">
        <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}/10 rounded-full blur-3xl -mr-16 -mt-16`} />
        <div className="text-4xl mb-6 relative z-10">{icon}</div>
        <span className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-2">{label}</span>
        <span className="text-4xl font-black text-brand-black tracking-tighter">{value}</span>
    </div>
);

const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-40 bg-brand-light/30 rounded-[4rem] border-4 border-white">
        <div className="text-6xl mb-8 animate-buzz inline-block">🐝</div>
        <p className="text-gray-500 font-black text-xl italic">{message}</p>
    </div>
);

const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
        case 'pending': return 'bg-amber-100 text-amber-600';
        case 'processing': return 'bg-cyan-100 text-cyan-600';
        case 'shipped': return 'bg-indigo-100 text-indigo-600';
        case 'delivered': return 'bg-brand-meadow/20 text-brand-meadow';
        case 'cancelled': return 'bg-rose-100 text-rose-600';
        default: return 'bg-gray-100 text-gray-600';
    }
};

export default AdminDashboard;
