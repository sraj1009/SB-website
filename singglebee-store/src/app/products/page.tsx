"use client";

import { useState, useEffect, useCallback } from "react";
import ProductCard from "@/components/products/ProductCard";

interface ProductData {
    _id: string;
    name: string;
    slug: string;
    price: number;
    compareAtPrice?: number;
    images: string[];
    category: string;
    stock: { available: number; isLowStock: boolean };
}

export default function ProductsPage() {
    const [products, setProducts] = useState<ProductData[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState("");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState("createdAt");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const fetchProducts = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: "12", sort });
            if (category) params.set("category", category);
            if (search) params.set("search", search);

            const res = await fetch(`/api/products?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setProducts(data.data.products);
                setTotalPages(data.data.pagination.totalPages);
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
        } finally {
            setLoading(false);
        }
    }, [page, sort, category, search]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Shop All Products</h1>
                <p className="text-gray-500 mt-1">Discover our premium collection</p>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8 p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="flex-1">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none transition-all"
                    />
                </div>
                <select
                    value={category}
                    onChange={(e) => { setCategory(e.target.value); setPage(1); }}
                    className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 outline-none"
                >
                    <option value="">All Categories</option>
                    <option value="clothing">Clothing</option>
                    <option value="accessories">Accessories</option>
                    <option value="electronics">Electronics</option>
                    <option value="home">Home & Living</option>
                </select>
                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 outline-none"
                >
                    <option value="createdAt">Newest</option>
                    <option value="price">Price: Low to High</option>
                    <option value="-price">Price: High to Low</option>
                    <option value="name">Name: A-Z</option>
                </select>
            </div>

            {/* Product Grid */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="rounded-2xl overflow-hidden">
                            <div className="aspect-square skeleton"></div>
                            <div className="p-4 space-y-3">
                                <div className="h-3 skeleton rounded w-1/3"></div>
                                <div className="h-4 skeleton rounded w-3/4"></div>
                                <div className="h-5 skeleton rounded w-1/4"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
                    <p className="text-gray-500">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <ProductCard key={product._id} product={product} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12">
                    <button
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Previous
                    </button>
                    <span className="px-4 py-2 text-sm text-gray-500">
                        Page {page} of {totalPages}
                    </span>
                    <button
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:border-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
