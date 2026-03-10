import React from 'react';
import ProductCardGlassmorphic from './ProductCardGlassmorphic';
import { Product } from '../types';

interface ProductGridGlassmorphicProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  isLoading?: boolean;
  className?: string;
}

const ProductGridGlassmorphic: React.FC<ProductGridGlassmorphicProps> = ({
  products,
  onAddToCart,
  onProductClick,
  onQuickView,
  isLoading = false,
  className = "",
}) => {
  if (isLoading) {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {[...Array(6)].map((_, index) => (
          <div key={index} className="animate-pulse">
            <div className="bg-white/85 backdrop-blur-xl border border-gray-200 rounded-3xl overflow-hidden shadow-lg">
              {/* Image Skeleton */}
              <div className="aspect-[4/5] bg-gradient-to-br from-gray-100 to-gray-50"></div>
              
              {/* Content Skeleton */}
              <div className="p-6 space-y-4">
                <div className="h-3 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-5 w-full bg-gray-200 rounded-lg"></div>
                <div className="h-5 w-2/3 bg-gray-200 rounded-lg"></div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-4 h-4 bg-gray-200 rounded-full"></div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="h-6 w-16 bg-gray-200 rounded-lg"></div>
                  <div className="h-10 w-20 bg-gray-200 rounded-xl"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={`text-center py-16 ${className}`}>
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">🐝</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
        <p className="text-gray-600">Try adjusting your filters or search terms</p>
      </div>
    );
  }

  return (
    <div 
      className={`
        grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
        ${className}
      `}
      style={{
        // 8pt grid system: 24px = 3 * 8pt gutters
        gap: '24px',
      }}
    >
      {products.map((product, index) => (
        <ProductCardGlassmorphic
          key={product.id}
          product={product}
          onAddToCart={onAddToCart}
          onClick={onProductClick}
          onQuickView={onQuickView}
          index={index}
          className="animate-fade-in-up"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        />
      ))}
    </div>
  );
};

export default ProductGridGlassmorphic;
