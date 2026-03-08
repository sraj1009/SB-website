"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/components/cart/CartProvider";

interface ProductCardProps {
    product: {
        _id: string;
        name: string;
        slug: string;
        price: number;
        compareAtPrice?: number;
        images: string[];
        category: string;
        stock: {
            available: number;
            isLowStock: boolean;
        };
    };
}

export default function ProductCard({ product }: ProductCardProps) {
    const { addItem } = useCart();
    const discount = product.compareAtPrice
        ? Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)
        : 0;

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        if (product.stock.available <= 0) return;

        addItem({
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image: product.images[0] || "/images/placeholder.png",
            slug: product.slug,
            maxQuantity: product.stock.available,
        });
    };

    return (
        <Link href={`/products/${product.slug}`} className="group">
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200 hover:-translate-y-1">
                {/* Image */}
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        {product.images[0] ? (
                            <Image
                                src={product.images[0]}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                        ) : (
                            <svg
                                className="w-16 h-16 text-gray-300"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1}
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        )}
                    </div>

                    {/* Badges */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2">
                        {discount > 0 && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                                -{discount}%
                            </span>
                        )}
                        {product.stock.isLowStock && product.stock.available > 0 && (
                            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-lg">
                                Low Stock
                            </span>
                        )}
                        {product.stock.available <= 0 && (
                            <span className="bg-gray-700 text-white text-xs font-bold px-2 py-1 rounded-lg">
                                Out of Stock
                            </span>
                        )}
                    </div>

                    {/* Quick Add */}
                    <button
                        onClick={handleAddToCart}
                        disabled={product.stock.available <= 0}
                        className="absolute bottom-3 right-3 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-amber-500 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                    </button>
                </div>

                {/* Info */}
                <div className="p-4">
                    <p className="text-xs text-amber-600 font-medium uppercase tracking-wider mb-1">
                        {product.category}
                    </p>
                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-amber-700 transition-colors">
                        {product.name}
                    </h3>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                            ₹{(product.price / 100).toFixed(2)}
                        </span>
                        {product.compareAtPrice && (
                            <span className="text-sm text-gray-400 line-through">
                                ₹{(product.compareAtPrice / 100).toFixed(2)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
