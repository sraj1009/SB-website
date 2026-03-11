import React, { useState } from 'react';
import { Product, Review } from '../types';
import BeeCharacter from './BeeCharacter.tsx';
import ProductCard from './ProductCard';

export const ProductDetailsSkeleton: React.FC = () => {
  return (
    <div className="animate-pulse pb-20 pt-6 max-w-[1400px] mx-auto px-4 md:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
        <div className="h-8 w-24 bg-gray-200 rounded-lg"></div>
      </div>

      <div className="bg-white rounded-[2.5rem] lg:rounded-[3.5rem] border border-gray-100 overflow-hidden mb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="p-8 lg:p-14 bg-gray-50 flex items-center justify-center min-h-[400px] lg:min-h-[600px]">
            <div className="w-full max-w-sm aspect-[4/5] bg-gray-200 rounded-3xl"></div>
          </div>
          <div className="p-8 lg:p-14 flex flex-col justify-center">
            <div className="max-w-lg w-full space-y-6">
              <div className="space-y-3">
                <div className="h-4 w-20 bg-gray-200 rounded-full"></div>
                <div className="h-10 w-3/4 bg-gray-200 rounded-xl"></div>
                <div className="h-6 w-1/2 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="h-20 w-full bg-gray-100 rounded-2xl"></div>
              <div className="h-14 w-full bg-gray-200 rounded-2xl"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ProductDetailsProps {
  product: Product;
  allProducts: Product[];
  onBack: () => void;
  onAddToCart: (product: Product) => void;
  onProductClick: (product: Product) => void;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
  wishlistIds: number[];
  onToggleWishlistId: (id: number) => void;
}

const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  allProducts,
  onBack,
  onAddToCart,
  onProductClick,
  isWishlisted,
  onToggleWishlist,
  wishlistIds,
  onToggleWishlistId,
}) => {
  const [addStatus, setAddStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  if (relatedProducts.length < 3) {
    const fillers = allProducts
      .filter((p) => p.id !== product.id && p.category !== product.category && p.bestseller)
      .slice(0, 4 - relatedProducts.length);
    relatedProducts.push(...fillers);
  }
  const [reviews, setReviews] = useState<Review[]>(product.reviews || []);

  React.useEffect(() => {
    setReviews(product.reviews || []);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [product.reviews, product.id]);

  const [reviewForm, setReviewForm] = useState({ name: '', rating: 5, comment: '' });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewForm.name || !reviewForm.comment) return;

    setIsReviewSubmitting(true);
    try {
      await fetch('https://formspree.io/f/mlggdqro', {
        method: 'POST',
        body: JSON.stringify({
          name: reviewForm.name,
          rating: reviewForm.rating,
          comment: reviewForm.comment,
          product_title: product.title,
          _subject: `🐝 New Hive Review for ${product.title}`,
        }),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const newReview: Review = {
        id: Date.now(),
        userName: reviewForm.name,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        date: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };
      setReviews([newReview, ...reviews]);
      setReviewForm({ name: '', rating: 5, comment: '' });
    } catch (err) {
      console.error('Review submission error:', err);
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const handleAddToCart = () => {
    if (addStatus !== 'idle') return;
    setAddStatus('loading');
    // Remove artificial delay for local cart
    onAddToCart(product);
    setAddStatus('success');
    setTimeout(() => setAddStatus('idle'), 2000);
  };

  return (
    <div className="animate-fade-in pb-20 pt-6 max-w-[1400px] mx-auto px-4 md:px-8">
      {/* Navigation & Breadcrumbs */}
      <div className="mb-8 flex items-center justify-between animate-slide-down relative z-20">
        <button
          onClick={onBack}
          className="flex items-center gap-2.5 px-5 py-2.5 bg-white text-brand-black text-[10px] font-black uppercase tracking-[0.18em] rounded-xl shadow-sm border border-brand-light/40 hover:bg-brand-black hover:text-brand-primary transition-all group"
        >
          <span className="group-hover:-translate-x-1.2 transition-transform duration-300">←</span>
          <span>Back to Hive</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em] bg-brand-primary/10 px-3.5 py-1.5 rounded-lg">
            {product.category === 'Books' ? 'Educational Book' : product.category}
          </span>
        </div>
      </div>

      {/* Main Showcase Grid */}
      <div className="bg-white rounded-[2.5rem] lg:rounded-[3.5rem] shadow-[0_30px_60px_rgba(0,0,0,0.05)] border border-gray-100/50 overflow-hidden mb-16 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left Column: Focused Image Showcase */}
          <div className="p-8 lg:p-14 bg-gradient-to-br from-amber-50/40 via-white to-orange-50/20 flex items-center justify-center relative min-h-[400px] lg:min-h-[600px] border-b lg:border-b-0 lg:border-r border-gray-100/30 overflow-hidden group/showcase">
            <div className="absolute inset-0 honeycomb-pattern opacity-[0.02] pointer-events-none"></div>

            {/* Status Floating Badge */}
            {/* Status Floating Badge */}
            {(product.bestseller || product.isOutOfStock || product.isComingSoon) && (
              <div className="absolute top-8 left-8 z-20">
                {product.isOutOfStock ? (
                  <span className="bg-zinc-800 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 uppercase tracking-widest border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Out of Stock
                  </span>
                ) : product.isComingSoon ? (
                  <span className="bg-indigo-500 text-white text-[9px] font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 uppercase tracking-widest border border-white/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    Coming Soon
                  </span>
                ) : (
                  <span className="bg-brand-black text-brand-primary text-[9px] font-black px-4 py-2 rounded-full shadow-lg flex items-center gap-2 uppercase tracking-widest border border-brand-primary/10">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse" />
                    Hive Favorite
                  </span>
                )}
              </div>
            )}

            {/* Featured Image - Compact & Sharp */}
            <div className="relative w-full max-w-sm aspect-[4/5] flex items-center justify-center">
              <div className="absolute inset-0 bg-brand-primary/5 honey-blob blur-[80px] opacity-30 group-hover/showcase:opacity-50 transition-opacity duration-1000 scale-110"></div>
              <img
                src={product.image}
                alt={product.title}
                className="w-full h-full object-contain drop-shadow-[0_25px_50px_rgba(0,0,0,0.08)] relative z-10 transition-transform duration-700 group-hover/showcase:scale-[1.02]"
              />
            </div>
          </div>

          {/* Right Column: Clean Product Details */}
          <div className="p-8 lg:p-14 flex flex-col justify-center bg-white">
            <div className="max-w-lg w-full">
              {/* Product Header */}
              <div className="flex justify-between items-start gap-6 mb-8">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex bg-amber-50/80 px-2.5 py-1 rounded-lg items-center gap-1.5 border border-amber-100/30">
                      <span className="text-amber-500 text-xs">★</span>
                      <span className="text-brand-black font-black text-xs">{product.rating}</span>
                    </div>
                    <span className="text-gray-300 font-bold text-[9px] uppercase tracking-widest">
                      {product.reviewCount + reviews.length} Buzzes
                    </span>
                  </div>
                  <h1 className="text-3xl lg:text-4xl font-black text-brand-black leading-tight tracking-tight">
                    {product.title}
                  </h1>
                  <p className="text-gray-400 font-bold text-base flex items-center gap-2">
                    by{' '}
                    <span className="text-brand-black font-black hover:text-brand-primary transition-colors cursor-pointer decoration-brand-primary/20 underline underline-offset-4 decoration-1">
                      {product.author}
                    </span>
                  </p>
                </div>

                {/* Compact Wishlist */}
                <button
                  onClick={onToggleWishlist}
                  className={`group/wish p-4 rounded-2xl shadow-sm transition-all duration-300 active:scale-95 flex-shrink-0 border 
                    ${
                      isWishlisted
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-white text-gray-400 border-gray-100 hover:text-rose-500 hover:border-rose-100'
                    }`}
                >
                  <svg
                    className={`w-5 h-5 transition-all duration-300 ${isWishlisted ? 'fill-current' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>
              </div>

              {/* Price & Status */}
              <div className="mb-8 pb-8 border-b border-gray-100/60 flex flex-wrap items-end justify-between gap-6">
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl lg:text-5xl font-black text-brand-black tracking-tight">
                      ₹{product.price.toLocaleString('en-IN')}
                    </span>
                    <span className="text-gray-300 font-black text-base">.00</span>
                  </div>
                  <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-2 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-meadow" />
                    Bestseller • Ships from Hive
                  </p>
                </div>

                {product.format && (
                  <div className="bg-brand-light/30 px-4 py-2.5 rounded-xl border border-brand-primary/5 text-center">
                    <span className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                      Format
                    </span>
                    <span className="text-xs font-black text-brand-black">{product.format}</span>
                  </div>
                )}
              </div>

              {/* Precise Description */}
              <div className="mb-10">
                <h3 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.15em] mb-3">
                  Product Story
                </h3>
                <p className="text-gray-500 font-medium leading-relaxed text-sm">
                  {product.description}
                </p>
              </div>

              {/* Add to Hive Action - Clean & Professional */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={addStatus !== 'idle' || product.isOutOfStock || product.isComingSoon}
                  className={`group/hive relative w-full font-black py-4 sm:py-5 rounded-2xl shadow-lg transition-all duration-500 flex items-center justify-center gap-4 text-xs sm:text-sm uppercase tracking-[0.15em] overflow-hidden
                     ${
                       product.isOutOfStock || product.isComingSoon
                         ? 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
                         : addStatus === 'idle'
                           ? 'bg-gradient-to-r from-zinc-900 via-gray-800 to-zinc-900 text-amber-400 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]'
                           : ''
                     }
                     ${addStatus === 'loading' ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-white cursor-wait' : ''}
                     ${addStatus === 'success' ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-white scale-[1.02]' : ''}
                   `}
                >
                  {/* Subtle Glow Effect */}
                  {!(product.isOutOfStock || product.isComingSoon) && (
                    <div
                      className={`absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-400/15 to-amber-500/0 transition-opacity duration-500 ${addStatus === 'idle' ? 'opacity-0 group-hover/hive:opacity-100' : 'opacity-0'}`}
                    />
                  )}

                  {/* Shimmer Effect */}
                  {!(product.isOutOfStock || product.isComingSoon) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/hive:translate-x-full transition-transform duration-700 ease-out" />
                  )}

                  {/* Button Content */}
                  <div className="relative z-10 flex items-center gap-3 sm:gap-4">
                    {product.isOutOfStock ? (
                      <span className="text-sm tracking-wider">OUT OF STOCK</span>
                    ) : product.isComingSoon ? (
                      <span className="text-sm tracking-wider">COMING SOON</span>
                    ) : addStatus === 'loading' ? (
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <BeeCharacter size="1rem" />
                          </div>
                        </div>
                        <span className="text-sm tracking-wider">ADDING...</span>
                      </div>
                    ) : addStatus === 'success' ? (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-sm tracking-wider flex items-center gap-2">
                          COLLECTED! <BeeCharacter size="1.2rem" />
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 sm:gap-4">
                        {/* Bee Icon */}
                        <div className="relative w-9 h-9 sm:w-10 sm:h-10 bg-amber-400/10 rounded-xl flex items-center justify-center group-hover/hive:bg-amber-400/20 transition-all duration-300">
                          <div className="group-hover/hive:animate-buzz">
                            <BeeCharacter size="2rem" />
                          </div>
                        </div>

                        {/* Text */}
                        <span className="text-sm sm:text-base tracking-[0.1em] group-hover/hive:tracking-[0.14em] transition-all duration-300">
                          ADD TO HIVE
                        </span>

                        {/* Arrow */}
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-amber-400/10 rounded-xl flex items-center justify-center group-hover/hive:bg-amber-400 transition-all duration-300">
                          <svg
                            className="w-4 h-4 text-amber-400 group-hover/hive:text-zinc-900 group-hover/hive:translate-x-0.5 transition-all duration-300"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bottom Accent */}
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-amber-300 via-amber-400 to-amber-300 group-hover/hive:w-3/4 transition-all duration-500 rounded-full" />
                </button>

                {/* Trust Badge */}
                <p className="text-center text-[9px] sm:text-[10px] text-gray-400 font-medium flex items-center justify-center gap-1.5">
                  <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Free shipping on orders over ₹1499
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start">
        <div className="lg:col-span-5 lg:sticky lg:top-36">
          <div className="relative group/form">
            <div className="absolute -inset-4 bg-brand-primary/5 rounded-[2.5rem] blur-2xl opacity-0 group-hover/form:opacity-100 transition-opacity duration-1000"></div>

            <div className="relative">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-primary/10 rounded-full mb-6 border border-brand-primary/10">
                <BeeCharacter size="1.2rem" />
                <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.2em]">
                  Collective Wisdom
                </span>
              </div>

              <h2 className="text-4xl font-black text-brand-black mb-4 tracking-tighter">
                Share your <span className="text-brand-primary">Buzz</span>
              </h2>

              <p className="text-gray-500 font-medium text-sm leading-relaxed mb-10 max-w-sm">
                Your experience helps our Hive grow. Tell us what you think about this creation.
              </p>

              <form onSubmit={handleReviewSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-black uppercase tracking-widest ml-1">
                    Your Name
                  </label>
                  <input
                    required
                    type="text"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                    className="w-full bg-white border-2 border-brand-light/40 rounded-2xl px-6 py-4 text-sm font-bold focus:border-brand-primary outline-none transition-all shadow-sm focus:shadow-brand-primary/10"
                    placeholder="e.g. Busy Bee"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-brand-black uppercase tracking-widest ml-1">
                    Rating
                  </label>
                  <div className="flex gap-2 p-3 bg-gradient-to-r from-amber-50/50 to-orange-50/30 rounded-2xl border border-amber-100/30">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className={`group/star relative w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 font-black text-2xl overflow-hidden
                        ${
                          reviewForm.rating >= star
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-[0_8px_24px_rgba(251,191,36,0.4)] scale-105 -rotate-3'
                            : 'bg-white text-gray-300 hover:text-amber-400 hover:bg-amber-50 hover:scale-110 border border-gray-100 shadow-sm'
                        }`}
                      >
                        <span
                          className={`relative z-10 transition-transform duration-300 ${reviewForm.rating >= star ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]' : 'group-hover/star:scale-125'}`}
                        >
                          ★
                        </span>
                        {reviewForm.rating >= star && (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
                            <div className="absolute -inset-1 bg-amber-400/20 blur-xl animate-pulse" />
                          </>
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold ml-1">
                    {reviewForm.rating === 5
                      ? '🌟 Perfect! Buzzing with joy!'
                      : reviewForm.rating === 4
                        ? '✨ Great experience!'
                        : reviewForm.rating === 3
                          ? '👍 Good, but could be better'
                          : reviewForm.rating === 2
                            ? '😐 Needs improvement'
                            : '🤔 Tell us what went wrong'}
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-brand-black uppercase tracking-widest ml-1">
                    Thoughts
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    className="w-full bg-white border-2 border-brand-light/40 rounded-2xl px-6 py-5 text-sm font-bold focus:border-brand-primary outline-none transition-all shadow-sm focus:shadow-brand-primary/10 resize-none"
                    placeholder="What did you love most?"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  disabled={isReviewSubmitting}
                  className="w-full bg-brand-black text-brand-primary font-black py-5 rounded-2xl hover:bg-brand-primary hover:text-white transition-all duration-500 shadow-2xl disabled:opacity-50 uppercase tracking-[0.25em] text-[11px] flex items-center justify-center gap-4 group/btn"
                >
                  {isReviewSubmitting ? (
                    'Buzzing to Hive...'
                  ) : (
                    <>
                      <span>Post Review</span>
                      <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center group-hover/btn:bg-white/20 transition-colors">
                        →
                      </div>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <div className="bg-brand-light/10 rounded-[3rem] p-10 lg:p-14 border border-brand-light/30">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h3 className="text-2xl font-black text-brand-black tracking-tight mb-1">
                  Hive Feedback
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex text-brand-primary text-xs">
                    {[...Array(5)].map((_, i) => (
                      <span
                        key={i}
                        className={
                          i <
                          Math.round(
                            reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0
                          )
                            ? 'text-brand-primary'
                            : 'text-gray-300'
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">
                    Collective Score
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white border border-brand-primary/10 px-6 py-3 rounded-2xl shadow-sm">
                <BeeCharacter size="2.2rem" />
                <span className="font-black text-brand-black text-2xl tracking-tighter">
                  {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length || 0).toFixed(1)}
                </span>
              </div>
            </div>

            <div className="space-y-6">
              {reviews.length > 0 ? (
                reviews.map((review) => (
                  <div
                    key={review.id}
                    className="bg-white p-8 rounded-3xl border border-brand-light hover:border-brand-primary/30 hover:shadow-xl transition-all duration-500 group/item"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-secondary font-black text-lg shadow-inner group-hover/item:bg-brand-primary group-hover/item:text-white transition-colors duration-500">
                          {review.userName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-black text-brand-black text-base">
                            {review.userName}
                          </h4>
                          <div className="flex text-brand-primary text-[11px] gap-0.5 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={
                                  i < review.rating ? 'text-brand-primary' : 'text-gray-200'
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-brand-light/20 px-3 py-1.5 rounded-lg border border-brand-light/50">
                        {review.date}
                      </span>
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed text-sm italic">
                      "{review.comment}"
                    </p>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center opacity-30">
                  <BeeCharacter size="4rem" />
                  <p className="mt-4 font-black text-gray-400 uppercase tracking-widest text-[9px]">
                    Be the first to buzz!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Products - Neat Grid */}
      <div className="mt-20 pt-16 border-t border-brand-light/40">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h3 className="text-2xl font-black text-brand-black tracking-tight mb-1">
              Related for your Hive
            </h3>
            <p className="text-gray-400 font-bold text-xs">Based on your selection</p>
          </div>
          <button
            onClick={onBack}
            className="hidden sm:block text-brand-secondary font-black text-[9px] uppercase tracking-widest hover:text-brand-black transition-colors"
          >
            View All Collection →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {relatedProducts.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onAddToCart={onAddToCart}
              onClick={onProductClick}
              onQuickView={() => {}}
              isWishlisted={wishlistIds.includes(p.id)}
              onToggleWishlist={() => onToggleWishlistId(p.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductDetails;
