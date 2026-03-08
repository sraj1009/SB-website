import React from 'react';
import { Product, User } from '../types';
import ProductCard from './ProductCard';

interface AutoScrollProductBandProps {
    title: string;
    products: Product[];
    onViewAll: () => void;
    onProductClick: (product: Product) => void;
    onAddToCart: (product: Product) => void;
    onQuickView: (product: Product) => void;
    wishlist: number[];
    toggleWishlist: (id: number) => void;
    bgColor?: string;
    direction?: 'left' | 'right';
    user?: User | null;
}

const AutoScrollProductBand: React.FC<AutoScrollProductBandProps> = ({
    title,
    products,
    onViewAll,
    onProductClick,
    onAddToCart,
    onQuickView,
    wishlist,
    toggleWishlist,
    bgColor = 'bg-transparent',
    direction = 'left',
    user
}) => {
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
                    className="flex gap-6 w-max animate-scroll hover:pause"
                    style={{
                        animationDirection: direction === 'right' ? 'reverse' : 'normal',
                        animationDuration: `${products.length * 10}s` // Dynamic speed
                    }}
                >
                    {displayProducts.map((product, index) => (
                        <div key={`${title}-${product.id}-${index}`} className="w-[260px] flex-shrink-0">
                            <ProductCard
                                product={product}
                                onAddToCart={onAddToCart}
                                onClick={onProductClick}
                                onQuickView={onQuickView}
                                isWishlisted={wishlist.includes(product.id)}
                                onToggleWishlist={() => toggleWishlist(product.id)}
                                user={user}
                            />
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
        .animate-scroll {
          animation: scroll linear infinite;
        }
        .hover\\:pause:hover {
          animation-play-state: paused;
        }
      `}</style>
        </div>
    );
};

export default AutoScrollProductBand;
