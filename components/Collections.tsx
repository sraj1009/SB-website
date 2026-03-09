import React from 'react';
import { Product, Category } from '../types';
import ProductCard from './ProductCard';

interface CollectionsProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  // Added onQuickView prop to satisfy ProductCard's required props
  onQuickView: (product: Product) => void;
  wishlistIds: number[];
  onToggleWishlist: (id: number) => void;
  onBack: () => void;
}

const Collections: React.FC<CollectionsProps> = ({
  products,
  onProductClick,
  onAddToCart,
  onQuickView,
  wishlistIds,
  onToggleWishlist,
  onBack,
}) => {
  const collections = [
    {
      id: 'bestsellers',
      title: 'Bestselling Books',
      subtitle: 'The most popular reads of the season.',
      items: products.filter((p) => p.bestseller || p.rating > 4.5).slice(0, 3),
      color: 'from-orange-100 to-amber-50',
      accent: 'text-amber-600',
    },
    {
      id: 'self-help',
      title: 'Mindful Living',
      subtitle: 'Discover books that help you build better habits and a focused life.',
      items: products.filter((p) => p.category === Category.SELF_HELP).slice(0, 3),
      color: 'from-emerald-100 to-green-50',
      accent: 'text-emerald-600',
    },
    {
      id: 'tech',
      title: 'Tech Innovation',
      subtitle: 'Explore deep insights into software craftsmanship and future technologies.',
      items: products.filter((p) => p.category === Category.TECH).slice(0, 3),
      color: 'from-indigo-100 to-blue-50',
      accent: 'text-indigo-600',
    },
  ];

  return (
    <div className="animate-fade-in pb-20">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-brand-primary mb-6 group transition-colors"
        >
          <span className="p-1 rounded-full bg-gray-100 group-hover:bg-brand-primary/10 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </span>
          Back to Home
        </button>

        <div className="bg-gradient-to-r from-brand-primary to-brand-secondary p-8 md:p-12 rounded-3xl text-white shadow-xl relative overflow-hidden mb-12">
          <div className="relative z-10">
            <span className="inline-block py-1 px-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-xs font-bold uppercase tracking-widest mb-4">
              Exclusive
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">Curated Collections</h1>
            <p className="text-lg text-white/90 max-w-xl leading-relaxed">
              Discover hand-picked items organized by theme, mood, and lifestyle. Updated weekly by
              our expert curators to bring you the best of SinggleBee.
            </p>
          </div>

          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>
        </div>
      </div>

      <div className="space-y-16">
        {collections.map((collection) => (
          <div key={collection.id} className="relative group">
            <div
              className={`absolute inset-0 bg-gradient-to-r ${collection.color} opacity-40 rounded-3xl -z-10 transform transition-transform duration-500 group-hover:scale-[1.01] group-hover:-rotate-1`}
            ></div>

            <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-100 shadow-sm backdrop-blur-sm bg-opacity-90">
              <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                <div>
                  <span
                    className={`font-bold tracking-wider text-xs uppercase mb-2 block ${collection.accent}`}
                  >
                    Featured Collection
                  </span>
                  <h2 className="text-3xl font-bold text-gray-900">{collection.title}</h2>
                  <p className="text-gray-500 mt-2 text-lg">{collection.subtitle}</p>
                </div>
                <button
                  className={`text-sm font-bold ${collection.accent} hover:opacity-80 flex items-center gap-1 transition-opacity`}
                >
                  View All Items
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 8l4 4m0 0l-4 4m4-4H3"
                    />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collection.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAddToCart={onAddToCart}
                    onClick={onProductClick}
                    // Pass the required onQuickView prop to ProductCard
                    onQuickView={onQuickView}
                    isWishlisted={wishlistIds.includes(product.id)}
                    onToggleWishlist={() => onToggleWishlist(product.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Collections;
