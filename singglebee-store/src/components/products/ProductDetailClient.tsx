"use client";

import { useState } from "react";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";
import Link from "next/link";

interface ProductDetailProps {
    product: {
        _id: string;
        name: string;
        slug: string;
        description: string;
        price: number;
        compareAtPrice?: number;
        images: string[];
        category: string;
        tags: string[];
        sku: string;
        stock: { available: number; isLowStock: boolean };
    };
}

export default function ProductDetailClient({ product }: ProductDetailProps) {
    const { addItem } = useCart();
    const [quantity, setQuantity] = useState(1);
    const [added, setAdded] = useState(false);

    const handleAddToCart = () => {
        if (!product || product.stock.available <= 0) return;
        addItem({
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity,
            image: product.images[0] || "",
            slug: product.slug,
            maxQuantity: product.stock.available,
        });
        setAdded(true);
        setTimeout(() => setAdded(false), 2000);
    };

    const discount = product.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            {/* Breadcrumb */}
            <nav className="mb-6 text-sm text-gray-400">
                <Link href="/" className="hover:text-amber-600">Home</Link>
                {" / "}
                <Link href="/products" className="hover:text-amber-600">Shop</Link>
                {" / "}
                <span className="text-gray-700">{product.name}</span>
            </nav>

            <div className="grid md:grid-cols-2 gap-12">
                {/* Image Gallery */}
                <div className="space-y-4">
                    <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                        {product.images[0] ? (
                            <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                priority
                                className="object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        )}
                    </div>
                    {product.images.length > 1 && (
                        <div className="grid grid-cols-4 gap-3">
                            {product.images.slice(0, 4).map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100 cursor-pointer hover:border-amber-300 transition-colors">
                                    <Image
                                        src={img}
                                        alt=""
                                        fill
                                        sizes="100px"
                                        className="object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Product Info */}
                <div>
                    <span className="text-sm text-amber-600 font-medium uppercase tracking-wider">
                        {product.category}
                    </span>
                    <h1 className="text-3xl font-bold text-gray-900 mt-2 mb-4">{product.name}</h1>

                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl font-bold text-gray-900">
                            ₹{(product.price / 100).toFixed(2)}
                        </span>
                        {product.compareAtPrice && (
                            <>
                                <span className="text-xl text-gray-400 line-through">
                                    ₹{(product.compareAtPrice / 100).toFixed(2)}
                                </span>
                                <span className="px-2 py-0.5 bg-red-100 text-red-600 text-sm font-semibold rounded-lg">
                                    -{discount}% OFF
                                </span>
                            </>
                        )}
                    </div>

                    <p className="text-gray-600 leading-relaxed mb-6">{product.description}</p>

                    {/* Stock Status */}
                    <div className="mb-6">
                        {product.stock.available > 0 ? (
                            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${product.stock.isLowStock ? "text-amber-600" : "text-green-600"}`}>
                                <span className={`w-2 h-2 rounded-full ${product.stock.isLowStock ? "bg-amber-500" : "bg-green-500"}`}></span>
                                {product.stock.isLowStock
                                    ? `Only ${product.stock.available} left!`
                                    : "In Stock"}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                Out of Stock
                            </span>
                        )}
                    </div>

                    {/* Quantity + Add to Cart */}
                    <div className="flex items-center gap-4 mb-8">
                        <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                            <button
                                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                −
                            </button>
                            <span className="px-4 py-3 font-semibold text-gray-900 min-w-[3rem] text-center">
                                {quantity}
                            </span>
                            <button
                                onClick={() => setQuantity((q) => Math.min(product.stock.available, q + 1))}
                                className="px-4 py-3 text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                +
                            </button>
                        </div>
                        <button
                            onClick={handleAddToCart}
                            disabled={product.stock.available <= 0}
                            className={`flex-1 py-3.5 rounded-xl font-semibold text-lg transition-all ${added
                                ? "bg-green-500 text-white"
                                : "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:shadow-lg hover:shadow-amber-200/50 hover:-translate-y-0.5"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {added ? "✓ Added to Cart!" : "Add to Cart"}
                        </button>
                    </div>

                    {/* Meta */}
                    <div className="border-t border-gray-100 pt-6 space-y-2 text-sm text-gray-500">
                        <p><span className="font-medium text-gray-700">SKU:</span> {product.sku}</p>
                        {product.tags.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-gray-700">Tags:</span>
                                {product.tags.map((tag) => (
                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 rounded-md text-xs">{tag}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
