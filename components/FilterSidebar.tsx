import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FilterSidebarProps {
  priceRange: [number, number];
  setPriceRange: (range: [number, number]) => void;
  minRating: number | null;
  setMinRating: (rating: number | null) => void;
  onClear: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  priceRange,
  setPriceRange,
  minRating,
  setMinRating,
  onClear,
  isOpenMobile = false,
  onCloseMobile = () => {},
}) => {
  const minPrice = priceRange[0];
  const maxPrice = priceRange[1];
  const onPriceChange = (min: number, max: number) => setPriceRange([min, max]);
  const onRatingChange = setMinRating;

  const [localMin, setLocalMin] = useState(minPrice.toString());
  const [localMax, setLocalMax] = useState(maxPrice.toString());
  const [expandedSections, setExpandedSections] = useState({
    price: true,
    rating: true,
  });

  useEffect(() => {
    setLocalMin(minPrice.toString());
    setLocalMax(maxPrice.toString());
  }, [minPrice, maxPrice]);

  const handleApplyPrice = () => {
    const min = parseFloat(localMin) || 0;
    const max = parseFloat(localMax) || 5000;
    onPriceChange(min, max);
  };

  const handlePresetPrice = (min: number, max: number) => {
    setLocalMin(min.toString());
    setLocalMax(max.toString());
    onPriceChange(min, max);
  };

  const toggleSection = (section: 'price' | 'rating') => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const hasActiveFilters = minPrice > 0 || maxPrice < 5000 || minRating !== null;

  const content = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <svg
              className="w-5 h-5 text-amber-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <p className="text-[10px] text-amber-600 font-medium leading-none mt-0.5">Active</p>
            )}
          </div>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Active Filters */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          {(minPrice > 0 || maxPrice < 5000) && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
              ₹{minPrice} - ₹{maxPrice}
              <button
                onClick={() => {
                  onPriceChange(0, 5000);
                  setLocalMin('0');
                  setLocalMax('5000');
                }}
                className="hover:text-amber-900"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
          {minRating && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full">
              {minRating}+ Stars
              <button onClick={() => onRatingChange(null)} className="hover:text-amber-900">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}

      {/* Price Range Section */}
      <div className="bg-gray-50/50 rounded-xl p-3">
        <button
          onClick={() => toggleSection('price')}
          className="flex items-center justify-between w-full mb-3"
        >
          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
            <span>💰</span> Price Range
          </h4>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.price ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.price && (
          <div className="space-y-4 animate-fade-in">
            {/* Preset Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handlePresetPrice(0, 500)}
                className={`text-[10px] font-bold px-2 py-2 rounded-lg transition-all ${
                  minPrice === 0 && maxPrice === 500
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-100 hover:border-amber-200'
                }`}
              >
                Under ₹500
              </button>
              <button
                onClick={() => handlePresetPrice(500, 1000)}
                className={`text-xs font-medium px-3 py-2.5 rounded-xl transition-all ${
                  minPrice === 500 && maxPrice === 1000
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-100 hover:border-amber-200'
                }`}
              >
                ₹500 - ₹1000
              </button>
              <button
                onClick={() => handlePresetPrice(1000, 2000)}
                className={`text-xs font-medium px-3 py-2.5 rounded-xl transition-all ${
                  minPrice === 1000 && maxPrice === 2000
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-100 hover:border-amber-200'
                }`}
              >
                ₹1000 - ₹2000
              </button>
              <button
                onClick={() => handlePresetPrice(2000, 5000)}
                className={`text-xs font-medium px-3 py-2.5 rounded-xl transition-all ${
                  minPrice === 2000 && maxPrice === 5000
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white text-gray-500 border border-gray-100 hover:border-amber-200'
                }`}
              >
                ₹2000+
              </button>
            </div>

            {/* Custom Range */}
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                  ₹
                </span>
                <input
                  type="number"
                  value={localMin}
                  onChange={(e) => setLocalMin(e.target.value)}
                  className="w-full pl-5 pr-1 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-medium focus:border-amber-500 outline-none transition-all"
                  placeholder="Min"
                />
              </div>
              <span className="text-gray-300 text-[10px]">/</span>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">
                  ₹
                </span>
                <input
                  type="number"
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  className="w-full pl-5 pr-1 py-1.5 bg-white border border-gray-100 rounded-lg text-xs font-medium focus:border-amber-500 outline-none transition-all"
                  placeholder="Max"
                />
              </div>
            </div>
            <button
              onClick={handleApplyPrice}
              className="w-full py-2 bg-gray-900 text-white text-[11px] font-bold rounded-lg hover:bg-gray-800 transition-all active:scale-[0.98]"
            >
              Apply
            </button>
          </div>
        )}
      </div>

      {/* Rating Section */}
      <div className="bg-gray-50/50 rounded-xl p-3">
        <button
          onClick={() => toggleSection('rating')}
          className="flex items-center justify-between w-full mb-3"
        >
          <h4 className="text-xs font-bold text-gray-900 flex items-center gap-2 uppercase tracking-wider">
            <span>⭐</span> Rating
          </h4>
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${expandedSections.rating ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {expandedSections.rating && (
          <div className="space-y-2 animate-fade-in">
            {[4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => onRatingChange(minRating === rating ? null : rating)}
                className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-lg transition-all ${
                  minRating === rating
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-white border border-gray-100 hover:border-amber-200'
                }`}
              >
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className={`w-3 h-3 ${i < rating ? (minRating === rating ? 'text-white' : 'text-amber-500') : 'text-gray-200'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span
                  className={`text-[10px] font-bold ${minRating === rating ? 'text-white' : 'text-gray-500'}`}
                >
                  {rating}+
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Clear All Button */}
      {hasActiveFilters && (
        <button
          onClick={onClear}
          className="w-full py-2 text-[10px] text-gray-400 hover:text-rose-500 font-bold transition-colors flex items-center justify-center gap-1.5 border border-gray-100 rounded-lg hover:border-rose-100 hover:bg-rose-50/50"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Clear Filters
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-60 flex-shrink-0 sticky top-36 h-fit">
        <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white shadow-soft p-4">
          {content}
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpenMobile &&
        createPortal(
          <div className="fixed inset-0 z-[500] lg:hidden" style={{ touchAction: 'none' }}>
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={onCloseMobile}
            />
            {/* Drawer Panel */}
            <div
              className="absolute inset-y-0 left-0 w-[85vw] max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-left"
              style={{
                paddingTop: 'env(safe-area-inset-top)',
                paddingBottom: 'env(safe-area-inset-bottom)',
              }}
            >
              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-5 overscroll-contain">{content}</div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};

export default FilterSidebar;
