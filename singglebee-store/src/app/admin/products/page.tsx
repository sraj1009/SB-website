"use client";

import { useState, useEffect, useCallback } from "react";

interface ProductData {
    _id: string;
    name: string;
    description: string;
    sku: string;
    price: number;
    compareAtPrice?: number;
    category: string;
    isActive: boolean;
    isBestseller: boolean;
    pages?: number;
    language?: string;
    format?: string;
    tags: string[];
    images: string[];
    stock: { _id: string; quantity: number; reservedQuantity: number } | null;
}

const INITIAL_FORM = {
    _id: "",
    name: "",
    description: "",
    price: "",
    compareAtPrice: "",
    category: "",
    sku: "",
    tags: "",
    initialStock: "0",
    images: "",
    isBestseller: false,
    pages: "",
    language: "",
    format: "",
};

export default function AdminProductsPage() {
    const [products, setProducts] = useState<ProductData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingProduct, setEditingProduct] = useState<ProductData | null>(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [stockUpdating, setStockUpdating] = useState<string | null>(null);

    const fetchProducts = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/products?limit=100");
            const data = await res.json();
            if (data.success) setProducts(data.data.products);
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProducts(); }, [fetchProducts]);

    const handleEdit = (product: ProductData) => {
        setEditingProduct(product);
        setForm({
            _id: product._id,
            name: product.name,
            description: product.description,
            price: (product.price / 100).toString(),
            compareAtPrice: product.compareAtPrice ? (product.compareAtPrice / 100).toString() : "",
            category: product.category,
            sku: product.sku,
            tags: product.tags.join(", "),
            initialStock: product.stock?.quantity.toString() || "0",
            images: product.images.join(", "),
            isBestseller: product.isBestseller || false,
            pages: product.pages?.toString() || "",
            language: product.language || "",
            format: product.format || "",
        });
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError("");

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const body: any = {
            name: form.name,
            description: form.description,
            price: Math.round(parseFloat(form.price) * 100),
            compareAtPrice: form.compareAtPrice ? Math.round(parseFloat(form.compareAtPrice) * 100) : undefined,
            category: form.category,
            sku: form.sku,
            tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
            images: form.images ? form.images.split(",").map((i) => i.trim()).filter(Boolean) : [],
            isBestseller: form.isBestseller,
            pages: form.pages ? parseInt(form.pages) : undefined,
            language: form.language,
            format: form.format,
        };

        if (!editingProduct) {
            body.initialStock = parseInt(form.initialStock) || 0;
        } else {
            body.id = editingProduct._id;
        }

        try {
            const res = await fetch("/api/admin/products", {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                method: (editingProduct as any) ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!data.success) { setFormError(data.error || "Operation failed"); return; }

            setShowForm(false);
            setEditingProduct(null);
            setForm(INITIAL_FORM);
            fetchProducts();
        } catch {
            setFormError(`Failed to ${editingProduct ? "update" : "create"} product`);
        } finally {
            setSaving(false);
        }
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await fetch(isActive ? `/api/admin/products?id=${id}` : "/api/admin/products", {
                method: isActive ? "DELETE" : "PUT",
                headers: isActive ? {} : { "Content-Type": "application/json" },
                body: isActive ? null : JSON.stringify({ id, isActive: true }),
            });
            fetchProducts();
        } catch (error) { console.error("Toggle failed:", error); }
    };

    const handleDeletePermanent = async (id: string) => {
        if (!confirm("Are you sure? This will permanently delete the product and its stock history.")) return;
        try {
            await fetch(`/api/admin/products?id=${id}&hard=true`, { method: "DELETE" });
            fetchProducts();
        } catch (error) { console.error("Delete failed:", error); }
    };

    const handleStockAdjustment = async (productId: string, currentQty: number, adjustment: number) => {
        setStockUpdating(productId);
        try {
            const newQty = Math.max(0, currentQty + adjustment);
            await fetch("/api/admin/stock", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ productId, quantity: newQty }),
            });
            fetchProducts();
        } catch (error) {
            console.error("Stock adjustment failed:", error);
        } finally {
            setStockUpdating(null);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">{editingProduct ? "Edit Product" : "Products"}</h1>
                    <p className="text-gray-500 mt-1">Manage your premium product catalog</p>
                </div>
                <button
                    onClick={() => {
                        setShowForm(!showForm);
                        if (showForm) { setEditingProduct(null); setForm(INITIAL_FORM); }
                    }}
                    className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${showForm ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg"}`}
                >
                    {showForm ? "Cancel" : "+ Add Product"}
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8 animate-slideDown">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">{editingProduct ? `Editing: ${editingProduct.name}` : "New Product"}</h2>
                    {formError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{formError}</div>}
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name</label>
                            <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none transition-all" placeholder="e.g. Premium Silk Scarf" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
                            <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none resize-none transition-all" placeholder="Tell the story of this product..." />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price (₹)</label>
                            <input type="number" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Compare At Price (₹)</label>
                            <input type="number" step="0.01" value={form.compareAtPrice} onChange={(e) => setForm({ ...form, compareAtPrice: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">SKU</label>
                            <input type="text" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none uppercase" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
                            <input type="text" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                        </div>
                        {!editingProduct && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Initial Stock</label>
                                <input type="number" value={form.initialStock} onChange={(e) => setForm({ ...form, initialStock: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                            </div>
                        )}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Pages (for Books)</label>
                            <input type="number" value={form.pages} onChange={(e) => setForm({ ...form, pages: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Language</label>
                            <input type="text" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Format</label>
                            <input type="text" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" />
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <input type="checkbox" id="isBestseller" checked={form.isBestseller} onChange={(e) => setForm({ ...form, isBestseller: e.target.checked })} className="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-400 cursor-pointer" />
                            <label htmlFor="isBestseller" className="text-sm font-semibold text-gray-700 cursor-pointer">Mark as Bestseller</label>
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tags (comma separated)</label>
                            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" placeholder="e.g. handmade, luxury, silk" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Image URLs (comma separated)</label>
                            <input type="text" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:bg-white outline-none" placeholder="/assets/prod-1.jpg, /assets/prod-2.jpg" />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-4 border-t border-gray-50 mt-2">
                            <button type="button" onClick={() => { setShowForm(false); setEditingProduct(null); setForm(INITIAL_FORM); }} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                            <button type="submit" disabled={saving} className="px-8 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold border-b-4 border-orange-800 active:border-b-0 active:translate-y-1 hover:shadow-lg transition-all disabled:opacity-50 min-w-[160px]">
                                {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Products List */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-20 skeleton rounded-2xl" />)}
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-fadeIn">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/50">
                                    <th className="text-left p-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Product</th>
                                    <th className="text-left p-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">SKU / Cat</th>
                                    <th className="text-left p-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Price</th>
                                    <th className="text-left p-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Stock</th>
                                    <th className="text-left p-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Status</th>
                                    <th className="text-right p-5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {products.map((product) => (
                                    <tr key={product._id} className="hover:bg-amber-50/30 transition-colors group">
                                        <td className="p-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex-shrink-0 group-hover:scale-105 transition-transform">
                                                    {product.images[0] ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gray-50 flex items-center justify-center text-gray-300">🖼️</div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-gray-900 block truncate max-w-[240px]">{product.name}</span>
                                                    {product.isBestseller && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Bestseller</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block mb-1">{product.sku}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase">{product.category}</div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-black text-gray-900 text-base">₹{(product.price / 100).toFixed(2)}</div>
                                            {product.compareAtPrice && <div className="text-xs text-gray-400 line-through">₹{(product.compareAtPrice / 100).toFixed(2)}</div>}
                                        </td>
                                        <td className="p-5">
                                            <div className="flex items-center gap-3">
                                                <button
                                                    disabled={stockUpdating === product._id || (product.stock?.quantity ?? 0) === 0}
                                                    onClick={() => handleStockAdjustment(product._id, product.stock?.quantity ?? 0, -1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 transition-colors font-bold"
                                                >
                                                    -
                                                </button>
                                                <span className={`w-8 text-center font-black text-sm ${(product.stock?.quantity ?? 0) <= 10 ? "text-red-600" : "text-gray-900"}`}>
                                                    {stockUpdating === product._id ? "..." : product.stock?.quantity ?? 0}
                                                </span>
                                                <button
                                                    disabled={stockUpdating === product._id}
                                                    onClick={() => handleStockAdjustment(product._id, product.stock?.quantity ?? 0, 1)}
                                                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 disabled:opacity-30 transition-colors font-bold"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${product.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                                                {product.isActive ? "Active" : "Inactive"}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(product)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Product"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActive(product._id, product.isActive)}
                                                    className={`p-2 rounded-lg transition-colors ${product.isActive ? "text-orange-500 hover:bg-orange-50" : "text-green-500 hover:bg-green-50"}`}
                                                    title={product.isActive ? "Deactivate" : "Activate"}
                                                >
                                                    {product.isActive ? "🚫" : "✅"}
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePermanent(product._id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Permanently Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {products.length === 0 && (
                        <div className="p-20 text-center">
                            <div className="text-4xl mb-4">🍯</div>
                            <h3 className="text-lg font-bold text-gray-900">Your hive is empty</h3>
                            <p className="text-gray-400 mt-1">Add your first premium product to get started.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
