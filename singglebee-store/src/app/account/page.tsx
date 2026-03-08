"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

interface OrderData {
    orderId: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    items: Array<{ name: string; quantity: number; price: number }>;
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

export default function AccountPage() {
    const { user, isLoading } = useAuth();
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchOrders() {
            try {
                const res = await fetch("/api/orders");
                const data = await res.json();
                if (data.success) setOrders(data.data.orders);
            } catch (error) {
                console.error("Failed to fetch orders:", error);
            } finally {
                setLoading(false);
            }
        }
        if (!isLoading) fetchOrders();
    }, [isLoading]);

    if (isLoading) {
        return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>;
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            {/* Profile Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-8 mb-8 text-white">
                <h1 className="text-2xl font-bold">Hello, {user?.name} 👋</h1>
                <p className="text-amber-100 mt-1">{user?.email}</p>
            </div>

            {/* Orders */}
            <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Order History</h2>

                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 skeleton rounded-2xl"></div>
                        ))}
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                        <div className="text-5xl mb-3">📦</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">No orders yet</h3>
                        <p className="text-gray-500 mb-4">Start shopping to see your orders here.</p>
                        <Link href="/products" className="text-amber-600 font-semibold hover:underline">
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => (
                            <div
                                key={order.orderId}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{order.orderId}</h3>
                                        <p className="text-sm text-gray-500">
                                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3 mt-2 sm:mt-0">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                                            {order.status}
                                        </span>
                                        <span className="font-bold text-gray-900">
                                            ₹{(order.totalAmount / 100).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                                <div className="border-t border-gray-50 pt-3">
                                    <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                        {order.items.map((item, idx) => (
                                            <span key={idx}>
                                                {item.name} × {item.quantity}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
