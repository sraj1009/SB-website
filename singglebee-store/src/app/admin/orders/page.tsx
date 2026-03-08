"use client";

import { useState, useEffect, useCallback } from "react";

interface OrderData {
    orderId: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number }>;
    user?: { name: string; email: string };
    createdAt: string;
}

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    paid: "bg-blue-100 text-blue-700",
    processing: "bg-indigo-100 text-indigo-700",
    shipped: "bg-purple-100 text-purple-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    refunded: "bg-gray-100 text-gray-700",
};

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");

    const fetchOrders = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "50" });
            if (filter) params.set("status", filter);
            const res = await fetch(`/api/admin/orders?${params.toString()}`);
            const data = await res.json();
            if (data.success) setOrders(data.data.orders);
        } catch (error) {
            console.error("Failed to fetch orders:", error);
        } finally {
            setLoading(false);
        }
    }, [filter]);

    useEffect(() => { fetchOrders(); }, [fetchOrders]);

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        try {
            await fetch("/api/admin/orders", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId, status: newStatus }),
            });
            fetchOrders();
        } catch (error) {
            console.error("Status update failed:", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
                <p className="text-gray-500 mt-1">View and manage customer orders</p>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="px-4 py-2.5 bg-white rounded-xl border border-gray-200 focus:border-amber-400 outline-none"
                >
                    <option value="">All Orders</option>
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                </select>
            </div>

            {/* Orders Table */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-16 skeleton rounded-xl" />)}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50">
                                    <th className="text-left p-4 font-semibold text-gray-600">Order ID</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Customer</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Items</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Total</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Date</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {orders.map((order) => (
                                    <tr key={order.orderId} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono font-semibold text-gray-900">{order.orderId}</td>
                                        <td className="p-4">
                                            <p className="font-medium text-gray-900">{order.user?.name || "N/A"}</p>
                                            <p className="text-xs text-gray-500">{order.user?.email || ""}</p>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {order.items.map((i) => `${i.name}×${i.quantity}`).join(", ").substring(0, 40)}
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">₹{(order.totalAmount / 100).toFixed(2)}</td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${statusColors[order.status] || "bg-gray-100"}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 text-xs">
                                            {new Date(order.createdAt).toLocaleDateString("en-IN")}
                                        </td>
                                        <td className="p-4">
                                            <select
                                                value=""
                                                onChange={(e) => {
                                                    if (e.target.value) handleStatusUpdate(order.orderId, e.target.value);
                                                }}
                                                className="text-xs px-2 py-1 border border-gray-200 rounded-lg outline-none focus:border-amber-400"
                                            >
                                                <option value="">Update...</option>
                                                <option value="processing">Processing</option>
                                                <option value="shipped">Shipped</option>
                                                <option value="delivered">Delivered</option>
                                                <option value="cancelled">Cancel</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {orders.length === 0 && (
                        <div className="p-12 text-center text-gray-400">No orders found</div>
                    )}
                </div>
            )}
        </div>
    );
}
