"use client";

import { useState, useEffect, useCallback } from "react";

interface StockData {
    _id: string;
    product: { _id: string; name: string; sku: string; isActive: boolean } | null;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
}

export default function AdminStockPage() {
    const [stocks, setStocks] = useState<StockData[]>([]);
    const [loading, setLoading] = useState(true);
    const [lowStockOnly, setLowStockOnly] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editQty, setEditQty] = useState("");

    const fetchStocks = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ limit: "100" });
            if (lowStockOnly) params.set("lowStock", "true");
            const res = await fetch(`/api/admin/stock?${params.toString()}`);
            const data = await res.json();
            if (data.success) setStocks(data.data.stocks);
        } catch (error) {
            console.error("Failed to fetch stock:", error);
        } finally {
            setLoading(false);
        }
    }, [lowStockOnly]);

    useEffect(() => { fetchStocks(); }, [fetchStocks]);

    const handleUpdate = async (productId: string) => {
        try {
            await fetch("/api/admin/stock", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, quantity: parseInt(editQty) }),
            });
            setEditingId(null);
            fetchStocks();
        } catch (error) {
            console.error("Stock update failed:", error);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 animate-fadeIn">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
                <p className="text-gray-500 mt-1">Monitor and update inventory levels</p>
            </div>

            {/* Filter */}
            <div className="mb-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={lowStockOnly}
                        onChange={(e) => setLowStockOnly(e.target.checked)}
                        className="w-4 h-4 text-amber-500 rounded border-gray-300 focus:ring-amber-400"
                    />
                    <span className="text-sm font-medium text-gray-700">Show low stock only</span>
                </label>
            </div>

            {/* Stock Table */}
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
                                    <th className="text-left p-4 font-semibold text-gray-600">Product</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">SKU</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Quantity</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Reserved</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Available</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Status</th>
                                    <th className="text-left p-4 font-semibold text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {stocks.map((stock) => {
                                    const available = stock.quantity - stock.reservedQuantity;
                                    const isLow = available <= stock.lowStockThreshold;
                                    return (
                                        <tr key={stock._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 font-medium text-gray-900">{stock.product?.name || "Unknown"}</td>
                                            <td className="p-4 text-gray-600 font-mono text-xs">{stock.product?.sku || "—"}</td>
                                            <td className="p-4">
                                                {editingId === stock._id ? (
                                                    <input
                                                        type="number"
                                                        value={editQty}
                                                        onChange={(e) => setEditQty(e.target.value)}
                                                        className="w-20 px-2 py-1 border border-amber-300 rounded-lg outline-none text-center"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span className="font-semibold">{stock.quantity}</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-gray-500">{stock.reservedQuantity}</td>
                                            <td className="p-4">
                                                <span className={`font-bold ${isLow ? "text-red-600" : "text-green-600"}`}>
                                                    {available}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                {available <= 0 ? (
                                                    <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Out of Stock</span>
                                                ) : isLow ? (
                                                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-semibold">Low Stock</span>
                                                ) : (
                                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">In Stock</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                {editingId === stock._id ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleUpdate(stock.product?._id || "")} className="text-xs font-medium text-green-600 hover:underline">Save</button>
                                                        <button onClick={() => setEditingId(null)} className="text-xs font-medium text-gray-400 hover:underline">Cancel</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => { setEditingId(stock._id); setEditQty(String(stock.quantity)); }}
                                                        className="text-xs font-medium text-amber-600 hover:underline"
                                                    >
                                                        Edit Qty
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {stocks.length === 0 && (
                        <div className="p-12 text-center text-gray-400">No stock entries found</div>
                    )}
                </div>
            )}
        </div>
    );
}
