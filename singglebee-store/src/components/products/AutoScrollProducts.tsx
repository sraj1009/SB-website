"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Product {
    _id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
}

export default function AutoScrollProducts() {
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        async function fetchProducts() {
            try {
                const res = await fetch("/api/products");
                const data = await res.json();
                if (data.success && data.data.products) {
                    // Shuffle or just take top 8
                    setProducts(data.data.products.slice(0, 8));
                }
            } catch (error) {
                console.error("Failed to fetch products for auto-scroll:", error);
            }
        }
        fetchProducts();
    }, []);

    if (products.length === 0) return null;

    return (
        <section className="py-16 bg-gray-50 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 mb-10 text-center">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Editor&apos;s Picks</h2>
                <p className="text-gray-500">Curated collection of our most loved educational books.</p>
            </div>

            <div className="relative flex">
                <div className="flex animate-marquee hover:pause whitespace-nowrap gap-6">
                    {[...products, ...products].map((product, idx) => (
                        <Link
                            key={`${product._id}-${idx}`}
                            href={`/products/${product.slug}`}
                            className="inline-block w-64 bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300"
                        >
                            <div className="relative aspect-[3/4] rounded-xl overflow-hidden mb-4 bg-gray-50">
                                {product.images?.[0] ? (
                                    <Image
                                        src={product.images[0]}
                                        alt={product.name}
                                        fill
                                        className="object-cover"
                                        sizes="256px"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                                        SB
                                    </div>
                                )}
                            </div>
                            <h3 className="font-bold text-gray-900 truncate mb-1">{product.name}</h3>
                            <p className="text-amber-600 font-bold">₹{(product.price / 100).toFixed(2)}</p>
                        </Link>
                    ))}
                </div>
            </div>

            <style jsx>{`
        .hover\:pause:hover {
          animation-play-state: paused;
        }
      `}</style>
        </section>
    );
}
