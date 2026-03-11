import React, { useState } from 'react';
import { ShoppingCart, Heart, Star, Eye } from 'lucide-react';
import BeeIcon from './BeeIcon';
import { Product } from '../types';

interface ProductCardGlassmorphicProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  onClick: (product: Product) => void;
  onQuickView?: (product: Product) => void;
  isWishlisted?: boolean;
  onToggleWishlist?: () => void;
  index?: number;
  className?: string;
}

interface RatingProps {
  rating: number;
  size?: 'sm' | 'md' | 'lg';
}

const Rating: React.FC<RatingProps> = ({ rating, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClasses[size]} ${
            star <= rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'
          }`}
          strokeWidth={2}
        />
      ))}
      <span className="text-sm text-gray-600 ml-1">({rating})</span>
    </div>
  );
};

const HoneycombClipPath: React.FC = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="honeycomb-card" clipPathUnits="objectBoundingBox">
        <path d="M 0.5 0 L 1 0.25 L 1 0.75 L 0.5 1 L 0 0.75 L 0 0.25 Z" />
      </clipPath>
    </defs>
  </svg>
);

const ProductCardGlassmorphic: React.FC<ProductCardGlassmorphicProps> = ({
  product,
  onAddToCart,
  onClick,
  onQuickView,
  isWishlisted = false,
  onToggleWishlist,
  index = 0,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(product);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleWishlist?.();
  };

  return (
    <div
      className={`
        relative group cursor-pointer transition-all duration-300 ease-out
        ${isHovered ? '-translate-y-1' : 'translate-y-0'}
        ${className}
      `}
      style={{
        animationDelay: `${index * 100}ms`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onClick(product)}
    >
      {/* Glassmorphic Card Container */}
      <div
        className={`
          relative overflow-hidden rounded-3xl transition-all duration-300
          bg-white/85 backdrop-blur-xl border border-gray-200
          ${isHovered ? 'shadow-2xl border-yellow-400/50 ring-4 ring-yellow-400/20' : 'shadow-lg'}
        `}
        style={{
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        {/* Honeycomb Pattern Overlay */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='52' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L52 15 L52 37 L30 52 L8 37 L8 15 Z' fill='none' stroke='%23FFA500' stroke-width='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: '60px 52px',
          }}
        />

        {/* Product Image Section - 4:5 Aspect Ratio */}
        <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-amber-50 to-orange-50">
          {/* Product Image */}
          {product.image && (
            <img
              src={product.image}
              alt={product.title}
              className={`
                w-full h-full object-cover transition-transform duration-500
                ${isHovered ? 'scale-110' : 'scale-100'}
              `}
              onLoad={() => setIsImageLoaded(true)}
              style={{
                opacity: isImageLoaded ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            />
          )}

          {/* Image Placeholder */}
          {!isImageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-amber-200 rounded-full flex items-center justify-center">
                <BeeIcon size={32} className="text-amber-600" />
              </div>
            </div>
          )}

          {/* Quick Actions Overlay */}
          <div
            className={`
            absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300
            ${isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2'}
          `}
          >
            {/* Wishlist Button */}
            <button
              onClick={handleToggleWishlist}
              className={`
                w-10 h-10 rounded-full backdrop-blur-md border border-white/30
                flex items-center justify-center transition-all duration-200
                ${
                  isWishlisted
                    ? 'bg-red-500 text-white'
                    : 'bg-white/20 text-gray-600 hover:bg-white/30'
                }
              `}
              aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
            </button>

            {/* Quick View Button */}
            {onQuickView && (
              <button
                onClick={handleQuickView}
                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-gray-600 hover:bg-white/30 flex items-center justify-center transition-all duration-200"
                aria-label="Quick view"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Product Badge */}
          {product.bestseller && (
            <div className="absolute top-3 left-3 px-3 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
              Bestseller
            </div>
          )}

          {/* Out of Stock Overlay */}
          {product.isOutOfStock && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <div className="text-white text-center">
                <div className="text-2xl font-bold mb-1">Out of Stock</div>
                <div className="text-sm opacity-80">Notify when available</div>
              </div>
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div className="p-6 space-y-4">
          {/* Category */}
          {product.category && (
            <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
              {product.category}
            </div>
          )}

          {/* Product Title */}
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-gray-900 leading-tight line-clamp-2">
              {product.title}
            </h3>
            {product.author && <p className="text-sm text-gray-600">by {product.author}</p>}
          </div>

          {/* Rating */}
          <Rating rating={product.rating || 4.5} size="sm" />

          {/* Price and Action */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-amber-600">₹{product.price}</div>
              {product.originalPrice && product.originalPrice > product.price && (
                <div className="text-sm text-gray-500 line-through">₹{product.originalPrice}</div>
              )}
            </div>

            {/* Add to Cart Button */}
            <button
              onClick={handleAddToCart}
              disabled={product.isOutOfStock}
              className={`
                relative overflow-hidden px-4 py-2 rounded-xl font-semibold text-sm
                transition-all duration-200 flex items-center gap-2 min-h-[44px]
                ${
                  product.isOutOfStock
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-amber-400 to-amber-500 text-white hover:from-amber-500 hover:to-amber-600 shadow-md hover:shadow-lg active:scale-95'
                }
              `}
              aria-label={product.isOutOfStock ? 'Out of stock' : 'Add to cart'}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{product.isOutOfStock ? 'Unavailable' : 'Add'}</span>

              {/* Shimmer Effect */}
              {!product.isOutOfStock && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              )}
            </button>
          </div>
        </div>

        {/* Hover Glow Effect */}
        <div
          className={`
            absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300 pointer-events-none
            ${isHovered ? 'opacity-100' : 'opacity-0'}
          `}
          style={{
            background:
              'linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%)',
            boxShadow: 'inset 0 0 30px rgba(255, 193, 7, 0.2)',
          }}
        />
      </div>
    </div>
  );
};

export default ProductCardGlassmorphic;
