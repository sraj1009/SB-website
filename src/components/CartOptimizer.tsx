import React, { useState, useEffect } from 'react';
import { analytics } from '../analytics/analytics-client';
import { trackAddToCart } from '../analytics/funnel-tracker';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
  image: string;
}

interface OptimizationData {
  freeShippingThreshold: number;
  currentTotal: number;
  amountForFreeShipping: number;
  recommendedProducts: CartItem[];
  bundleDiscounts: BundleDiscount[];
  timeLimitedOffer?: TimeLimitedOffer;
  smartUpsell: UpsellItem[];
}

interface BundleDiscount {
  id: string;
  name: string;
  description: string;
  requiredItems: string[];
  discountPercentage: number;
  discountAmount: number;
  applicable: boolean;
  savings: number;
}

interface TimeLimitedOffer {
  id: string;
  discountPercentage: number;
  expiresAt: Date;
  message: string;
  isActive: boolean;
}

interface UpsellItem {
  product: CartItem;
  reason: string;
  confidence: number;
}

interface CartOptimizerProps {
  items: CartItem[];
  onAddItem: (item: CartItem) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateQuantity: (itemId: string, quantity: number) => void;
}

const CartOptimizer: React.FC<CartOptimizerProps> = ({
  items,
  onAddItem,
  onRemoveItem,
  onUpdateQuantity,
}) => {
  const [optimizationData, setOptimizationData] = useState<OptimizationData | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [showUpsell, setShowUpsell] = useState(false);
  const [showBundle, setShowBundle] = useState(false);

  const FREE_SHIPPING_THRESHOLD = 1499; // ₹1499 for free shipping
  const BUNDLE_DISCOUNT_THRESHOLD = 3; // 3 items for bundle discount

  useEffect(() => {
    calculateOptimizations();
  }, [items]);

  useEffect(() => {
    if (optimizationData?.timeLimitedOffer?.isActive) {
      const timer = setInterval(() => {
        updateTimeLeft();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [optimizationData]);

  const calculateOptimizations = () => {
    const currentTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const amountForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - currentTotal);

    // Generate recommendations
    const recommendedProducts = generateRecommendations(items);
    const bundleDiscounts = calculateBundleDiscounts(items);
    const timeLimitedOffer = generateTimeLimitedOffer(currentTotal);
    const smartUpsell = generateSmartUpsell(items);

    setOptimizationData({
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      currentTotal,
      amountForFreeShipping,
      recommendedProducts,
      bundleDiscounts,
      timeLimitedOffer,
      smartUpsell,
    });

    // Track cart optimization calculation
    analytics.track('cart_optimization_calculated', {
      cart_value: currentTotal,
      items_count: items.length,
      free_shipping_progress: (currentTotal / FREE_SHIPPING_THRESHOLD) * 100,
      bundle_applicable: bundleDiscounts.some((b) => b.applicable),
      time_offer_active: timeLimitedOffer?.isActive || false,
    });
  };

  const generateRecommendations = (cartItems: CartItem[]): CartItem[] => {
    // In production, use recommendation engine
    const allProducts: CartItem[] = [
      {
        id: 'book-004',
        productId: 'book-004',
        name: 'Advanced Tamil Grammar',
        price: 599,
        quantity: 1,
        category: 'books',
        image: '/images/book-004.jpg',
      },
      {
        id: 'stationery-003',
        productId: 'stationery-003',
        name: 'Premium Notebook Set',
        price: 299,
        quantity: 1,
        category: 'stationery',
        image: '/images/notebook-set.jpg',
      },
      {
        id: 'book-005',
        productId: 'book-005',
        name: 'Tamil Children Stories Collection',
        price: 449,
        quantity: 1,
        category: 'books',
        image: '/images/book-005.jpg',
      },
    ];

    // Filter out items already in cart and recommend based on categories
    const cartCategories = cartItems.map((item) => item.category);
    const cartProductIds = cartItems.map((item) => item.productId);

    return allProducts
      .filter((product) => !cartProductIds.includes(product.productId))
      .filter((product) => cartCategories.includes(product.category)) // Same category preference
      .slice(0, 3);
  };

  const calculateBundleDiscounts = (cartItems: CartItem[]): BundleDiscount[] => {
    const bundles: BundleDiscount[] = [
      {
        id: 'book-bundle',
        name: 'Book Lover Bundle',
        description: 'Buy 3 books, get 15% off',
        requiredItems: ['books'],
        discountPercentage: 15,
        discountAmount: 0,
        applicable: false,
        savings: 0,
      },
      {
        id: 'stationery-bundle',
        name: 'Stationery Bundle',
        description: 'Buy 3 stationery items, get 10% off',
        requiredItems: ['stationery'],
        discountPercentage: 10,
        discountAmount: 0,
        applicable: false,
        savings: 0,
      },
      {
        id: 'mixed-bundle',
        name: 'Mixed Bundle',
        description: 'Buy any 5 items, get 20% off',
        requiredItems: ['books', 'stationery'],
        discountPercentage: 20,
        discountAmount: 0,
        applicable: false,
        savings: 0,
      },
    ];

    // Check bundle applicability
    bundles.forEach((bundle) => {
      const eligibleItems = cartItems.filter((item) =>
        bundle.requiredItems.includes(item.category)
      );

      if (bundle.id === 'mixed-bundle') {
        bundle.applicable = cartItems.length >= 5;
      } else {
        bundle.applicable = eligibleItems.length >= 3;
      }

      if (bundle.applicable) {
        const eligibleTotal = eligibleItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );
        bundle.savings = eligibleTotal * (bundle.discountPercentage / 100);
        bundle.discountAmount = bundle.savings;
      }
    });

    return bundles;
  };

  const generateTimeLimitedOffer = (currentTotal: number): TimeLimitedOffer | undefined => {
    // Generate time-limited offer based on cart value and time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    // Only show offer if cart has value
    if (currentTotal > 0 && currentTotal < 2000) {
      return {
        id: 'checkout-speed',
        discountPercentage: 5,
        expiresAt,
        message: 'Complete checkout in 10 min for 5% off!',
        isActive: true,
      };
    }

    return undefined;
  };

  const generateSmartUpsell = (cartItems: CartItem[]): UpsellItem[] => {
    // Generate upsell items based on cart contents
    const upsellItems: UpsellItem[] = [];

    cartItems.forEach((item) => {
      if (item.category === 'books') {
        upsellItems.push({
          product: {
            id: 'bookmark-set',
            productId: 'bookmark-set',
            name: 'Premium Bookmark Set',
            price: 99,
            quantity: 1,
            category: 'stationery',
            image: '/images/bookmarks.jpg',
          },
          reason: 'Customers who bought this book also loved these bookmarks',
          confidence: 0.85,
        });
      }

      if (item.category === 'stationery') {
        upsellItems.push({
          product: {
            id: 'pen-set',
            productId: 'pen-set',
            name: 'Premium Pen Set',
            price: 199,
            quantity: 1,
            category: 'stationery',
            image: '/images/pen-set.jpg',
          },
          reason: 'Complete your stationery collection',
          confidence: 0.78,
        });
      }
    });

    return upsellItems.slice(0, 2);
  };

  const updateTimeLeft = () => {
    if (!optimizationData?.timeLimitedOffer) return;

    const now = new Date();
    const expiresAt = optimizationData.timeLimitedOffer.expiresAt;
    const timeDiff = expiresAt.getTime() - now.getTime();

    if (timeDiff <= 0) {
      setTimeLeft('Expired');
      return;
    }

    const minutes = Math.floor(timeDiff / (1000 * 60));
    const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);
    setTimeLeft(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  };

  const handleAddRecommendedItem = (item: CartItem) => {
    onAddItem(item);

    analytics.track('recommended_item_added', {
      product_id: item.productId,
      product_name: item.name,
      price: item.price,
      source: 'cart_optimizer',
    });

    trackAddToCart(item.productId, item.price, item.quantity);
  };

  const handleApplyBundleDiscount = (bundle: BundleDiscount) => {
    // In production, apply bundle discount to cart
    analytics.track('bundle_discount_applied', {
      bundle_id: bundle.id,
      bundle_name: bundle.name,
      discount_percentage: bundle.discountPercentage,
      savings: bundle.savings,
    });
  };

  const freeShippingProgress =
    ((optimizationData?.currentTotal || 0) / FREE_SHIPPING_THRESHOLD) * 100;

  if (!optimizationData) {
    return <div>Loading cart optimizations...</div>;
  }

  return (
    <div className="cart-optimizer space-y-4">
      {/* Free Shipping Progress Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-800">Free Shipping Progress</h3>
          <span className="text-sm text-gray-600">
            ₹{optimizationData.currentTotal} / ₹{FREE_SHIPPING_THRESHOLD}
          </span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(freeShippingProgress, 100)}%` }}
          />
        </div>

        {optimizationData.amountForFreeShipping > 0 ? (
          <p className="text-sm text-orange-600 font-medium">
            Add ₹{optimizationData.amountForFreeShipping} more for FREE shipping! 🚚
          </p>
        ) : (
          <p className="text-sm text-green-600 font-medium">
            🎉 You've qualified for FREE shipping!
          </p>
        )}
      </div>

      {/* Time-Limited Offer */}
      {optimizationData.timeLimitedOffer?.isActive && (
        <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">⏰ Limited Time Offer!</h3>
              <p className="text-sm">{optimizationData.timeLimitedOffer.message}</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{timeLeft}</div>
              <div className="text-xs">Time Left</div>
            </div>
          </div>
        </div>
      )}

      {/* Bundle Discounts */}
      {optimizationData.bundleDiscounts.some((b) => b.applicable) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            💰 Bundle Discounts Available
          </h3>
          {optimizationData.bundleDiscounts
            .filter((bundle) => bundle.applicable)
            .map((bundle) => (
              <div key={bundle.id} className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium text-blue-700">{bundle.name}</p>
                  <p className="text-sm text-blue-600">{bundle.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">Save ₹{bundle.savings}</p>
                  <button
                    onClick={() => handleApplyBundleDiscount(bundle)}
                    className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                  >
                    Apply
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Smart Upsell */}
      {optimizationData.smartUpsell.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-purple-800">🎯 Perfect for You</h3>
            <button
              onClick={() => setShowUpsell(!showUpsell)}
              className="text-sm text-purple-600 hover:text-purple-800"
            >
              {showUpsell ? 'Hide' : 'Show'}
            </button>
          </div>

          {showUpsell && (
            <div className="space-y-2">
              {optimizationData.smartUpsell.map((upsell, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-3 rounded">
                  <div className="flex items-center space-x-3">
                    <img
                      src={upsell.product.image}
                      alt={upsell.product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div>
                      <p className="font-medium text-gray-800">{upsell.product.name}</p>
                      <p className="text-sm text-gray-600">{upsell.reason}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">₹{upsell.product.price}</p>
                    <button
                      onClick={() => handleAddRecommendedItem(upsell.product)}
                      className="text-sm bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                    >
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recommended Products */}
      {optimizationData.recommendedProducts.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-green-800">🌟 You Might Also Like</h3>
            <button
              onClick={() => setShowBundle(!showBundle)}
              className="text-sm text-green-600 hover:text-green-800"
            >
              {showBundle ? 'Hide' : 'Show'}
            </button>
          </div>

          {showBundle && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {optimizationData.recommendedProducts.map((product) => (
                <div key={product.id} className="flex items-center space-x-3 bg-white p-3 rounded">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-sm text-gray-600">{product.category}</p>
                    <p className="font-bold text-green-600">₹{product.price}</p>
                  </div>
                  <button
                    onClick={() => handleAddRecommendedItem(product)}
                    className="bg-green-500 text-white px-3 py-2 rounded hover:bg-green-600"
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cart Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Order Summary</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>Subtotal ({items.length} items)</span>
            <span>₹{optimizationData.currentTotal}</span>
          </div>
          {optimizationData.amountForFreeShipping > 0 && (
            <div className="flex justify-between text-orange-600">
              <span>Shipping</span>
              <span>₹99</span>
            </div>
          )}
          {optimizationData.amountForFreeShipping === 0 && (
            <div className="flex justify-between text-green-600">
              <span>Shipping</span>
              <span>FREE</span>
            </div>
          )}
          <div className="border-t pt-2 flex justify-between font-bold text-lg">
            <span>Total</span>
            <span>
              ₹
              {optimizationData.amountForFreeShipping > 0
                ? optimizationData.currentTotal + 99
                : optimizationData.currentTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartOptimizer;
