"use client";

import React from 'react';
import ProductCard from '../products/ProductCard';

interface Product {
    _id: string;
    name: string;
    slug: string;
    price: number;
    images: string[];
    category: string;
    language?: string;
    bestseller?: boolean;
    isComingSoon?: boolean;
    isOutOfStock?: boolean;
    rating?: number;
    reviewCount?: number;
    stock: {
        available: number;
        isLowStock: boolean;
    };
}

interface AutoScrollProductBandProps {
    title: string;
    products: Product[];
    onViewAll: () => void;
    bgColor?: string;
    direction?: 'left' | 'right';
}

const AutoScrollProductBand: React.FC<AutoScrollProductBandProps> = ({
    title,
    products,
    onViewAll,
    bgColor = 'bg-transparent',
    direction = 'left',
}) => {
    // If no products, don't render
    if (!products.length) return null;

    // Triple the products to ensure smooth infinite scroll without gaps
    const displayProducts = [...products, ...products, ...products];

    return (
        <div className={`py-12 ${bgColor} overflow-hidden`}>
            <div className="max-w-7xl mx-auto px-6 mb-8 flex items-center justify-between">
                <h2 className="text-2xl sm:text-3xl font-black text-brand-black tracking-tighter">{title}</h2>
                <button
                    onClick={onViewAll}
                    className="text-brand-primary font-bold text-sm hover:underline uppercase tracking-wider"
                >
                    View All
                </button>
            </div>

            <div className="relative w-full group">
                {/* Gradient Masks for fade effect */}
                <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-r from-brand-light to-transparent z-10 pointer-events-none" />
                <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-16 bg-gradient-to-l from-brand-light to-transparent z-10 pointer-events-none" />

                <div
                    className="flex gap-6 w-max animate-marquee group-hover:pause"
                    style={{
                        animationDirection: direction === 'right' ? 'reverse' : 'normal',
                        animationDuration: `${Math.max(products.length * 10, 30)}s` // Dynamic speed
                    }}
                >
                    {displayProducts.map((product, index) => (
                        <div key={`${title}-${product._id}-${index}`} className="w-[260px] flex-shrink-0">
                            <ProductCard
                                product={product}
                            />
                        </div>
                    ))}
                </div>
            </div>

        </div>
    );
};

export default AutoScrollProductBand;
