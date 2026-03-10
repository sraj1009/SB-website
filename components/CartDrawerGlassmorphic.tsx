import React, { useEffect, useState } from 'react';
import { X, Plus, Minus, Trash2, Smartphone, CreditCard, Lock } from 'lucide-react';
import BeeIcon from './BeeIcon';
import { CartItem } from '../types';

interface CartDrawerGlassmorphicProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: number) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
  onCheckout: () => void;
  onStartCollecting?: () => void;
}

const CartDrawerGlassmorphic: React.FC<CartDrawerGlassmorphicProps> = ({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  onStartCollecting,
}) => {
  // React useState hooks annotation for Figma
  const [isAnimating, setIsAnimating] = useState(false); // Controls drawer animation state
  const [isRendered, setIsRendered] = useState(false); // Controls content rendering
  const [quantities, setQuantities] = useState<{[key: number]: number}>({}); // Local quantity state

  // Calculate order summary
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.18); // 18% GST
  const deliveryFee = subtotal > 0 && subtotal < 1499 ? 50 : 0;
  const totalAmount = subtotal + tax + deliveryFee;

  // Initialize quantities from cart
  useEffect(() => {
    const newQuantities: {[key: number]: number} = {};
    cart.forEach(item => {
      newQuantities[item.id] = item.quantity;
    });
    setQuantities(newQuantities);
  }, [cart]);

  // Handle drawer animation lifecycle
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsRendered(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle quantity updates with local state
  const handleQuantityChange = (id: number, delta: number) => {
    const currentQty = quantities[id] || 1;
    const newQty = Math.max(1, Math.min(10, currentQty + delta));
    setQuantities(prev => ({ ...prev, [id]: newQty }));
    onUpdateQuantity(id, delta);
  };

  // Handle item removal
  const handleRemove = (id: number) => {
    onRemove(id);
    setQuantities(prev => {
      const newQuantities = { ...prev };
      delete newQuantities[id];
      return newQuantities;
    });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]
          transition-opacity duration-300 ease-out
          ${isRendered ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full max-w-md bg-white/95
          backdrop-blur-xl shadow-2xl z-[110]
          transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{
          WebkitBackdropFilter: 'blur(20px)',
          backdropFilter: 'blur(20px)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BeeIcon size={24} className="text-amber-500" />
            Shopping Cart ({cart.length})
          </h2>
          
          {/* Close Button - iOS compliant 44px touch target */}
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center rounded-full
                     bg-gray-100 hover:bg-gray-200 active:bg-gray-300
                     transition-colors duration-200"
            aria-label="Close cart"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Cart Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          {cart.length === 0 ? (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-16 px-6">
              <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                <BeeIcon size={48} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Your hive is empty
              </h3>
              <p className="text-gray-600 text-center mb-6">
                Start adding some delicious books and honey products to your cart!
              </p>
              {onStartCollecting && (
                <button
                  onClick={() => {
                    onStartCollecting();
                    onClose();
                  }}
                  className="px-6 py-3 bg-amber-500 text-white rounded-xl
                           font-semibold hover:bg-amber-600 active:scale-95
                           transition-all duration-200"
                >
                  Start Shopping
                </button>
              )}
            </div>
          ) : (
            /* Cart Items */
            <div className="p-6 space-y-4">
              {cart.map((item, index) => (
                <div
                  key={item.id}
                  className={`
                    bg-white/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-100
                    transition-all duration-300
                    ${isRendered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                  `}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    WebkitBackdropFilter: 'blur(10px)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  {/* Horizontal Card Layout */}
                  <div className="flex gap-4">
                    {/* Product Thumbnail - 80x80px */}
                    <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                          <BeeIcon size={32} className="text-amber-500" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate mb-1">
                        {item.title}
                      </h4>
                      <p className="text-sm text-gray-600 mb-3">
                        ₹{item.price} each
                      </p>

                      {/* Quantity Stepper */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {/* Decrement Button */}
                          <button
                            onClick={() => handleQuantityChange(item.id, -1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 
                                     active:bg-gray-300 flex items-center justify-center
                                     transition-colors duration-200"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-4 h-4 text-gray-600" />
                          </button>

                          {/* Quantity Display */}
                          <span className="w-8 text-center font-semibold text-gray-900">
                            {quantities[item.id] || 1}
                          </span>

                          {/* Increment Button */}
                          <button
                            onClick={() => handleQuantityChange(item.id, 1)}
                            className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 
                                     active:bg-gray-300 flex items-center justify-center
                                     transition-colors duration-200"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 
                                   active:bg-red-200 flex items-center justify-center
                                   transition-colors duration-200"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Item Total */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <span className="font-semibold text-gray-900">
                      ₹{item.price * (quantities[item.id] || 1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Summary - Fixed Bottom */}
        {cart.length > 0 && (
          <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 p-6">
            {/* Summary Details */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium text-gray-900">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tax (18%)</span>
                <span className="font-medium text-gray-900">₹{tax}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium text-gray-900">
                  {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-gray-900">Total</span>
                <span className="text-amber-600" style={{ color: '#FFA500' }}>
                  ₹{totalAmount}
                </span>
              </div>
            </div>

            {/* Checkout Button - 56px height for thumb-friendly tap */}
            <button
              onClick={() => {
                onCheckout();
                onClose();
              }}
              className="w-full h-14 bg-gradient-to-r from-amber-400 to-amber-500 
                       text-white font-bold rounded-xl flex items-center justify-center gap-3
                       hover:from-amber-500 hover:to-amber-600 active:scale-95
                       transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <BeeIcon size={20} />
              Proceed to Checkout
            </button>

            {/* Secure Badge Icons */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Smartphone className="w-4 h-4" />
                <span>UPI</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <CreditCard className="w-4 h-4" />
                <span>GPay</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Lock className="w-4 h-4" />
                <span>SSL Secured</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawerGlassmorphic;
