
import React, { useEffect, useState } from 'react';
import { CartItem } from '../types';
import BeeCharacter from './BeeCharacter.tsx';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onRemove: (id: number) => void;
  onUpdateQuantity: (id: number, delta: number) => void;
  onCheckout: () => void;
  onStartCollecting: () => void;
}

const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onRemove,
  onUpdateQuantity,
  onCheckout,
  onStartCollecting
}) => {
  const [isRendered, setIsRendered] = useState(false);
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);
  const shippingFee = subtotal > 0 && subtotal < 1499 ? 50 : 0;
  const totalAmount = subtotal + shippingFee;

  // Handle staggered animation mounting
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setIsRendered(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsRendered(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-brand-black/60 backdrop-blur-md z-[100] transition-opacity duration-500 ease-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[440px] bg-brand-light z-[101] shadow-2xl flex flex-col transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) border-l-4 border-white overflow-hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Animated Background Decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 animate-float pointer-events-none" />

        {/* Header */}
        <div className="relative p-6 md:p-7 border-b border-brand-primary/10 flex justify-between items-center bg-white/80 backdrop-blur-xl z-20">
          <div>
            <h2 className="text-3xl font-black text-brand-black tracking-tight">Your Hive</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-brand-secondary animate-pulse"></span>
              <p className="text-[11px] font-bold text-brand-secondary uppercase tracking-[0.2em] opacity-80">{totalItems} Nectar items collected</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white hover:bg-brand-rose hover:text-white rounded-xl transition-all duration-300 shadow-sm active:scale-90 border border-gray-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-brand-primary outline-none"
            aria-label="Close Cart"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-grow overflow-y-auto p-5 md:p-6 space-y-5 custom-scrollbar relative z-100">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-8 px-6 animate-fade-in">
              <div className="w-32 h-32 bg-white rounded-[2.5rem] flex items-center justify-center shadow-honey hover:shadow-honey-hover transition-shadow duration-500 animate-float border-4 border-brand-primary/10 relative">
                <span className="text-6xl filter drop-shadow-sm flex items-center justify-center">
                  <BeeCharacter size="6rem" />
                </span>
                <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-brand-primary rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-white">🍯</div>
              </div>
              <div className="space-y-2">
                <p className="text-brand-black font-black text-2xl tracking-tight">The hive is quiet!</p>
                <p className="text-brand-black/50 font-medium text-base max-w-[220px] mx-auto leading-relaxed">Your honey basket is waiting to be filled with treats.</p>
              </div>
              <button
                onClick={onStartCollecting}
                className="group px-10 py-4 bg-brand-black text-brand-primary rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 transition-all shadow-xl border border-brand-primary/20 uppercase tracking-[0.15em] flex items-center gap-3"
              >
                Start Collecting <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
            </div>
          ) : (
            <>
              {/* Shipping Progress */}
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-brand-light">
                {subtotal < 1499 ? (
                  <div className="space-y-3">
                    <p className="text-xs font-bold text-gray-500">Add <span className="text-brand-secondary font-black">₹{(1499 - subtotal).toLocaleString('en-IN')}</span> more for <span className="text-brand-meadow font-black uppercase">Free Shipping</span>!</p>
                    <div className="w-full h-2 bg-brand-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-primary transition-all duration-700 ease-out"
                        style={{ width: `${Math.min(100, (subtotal / 1499) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 text-brand-meadow">
                    <div className="p-2 bg-brand-meadow/10 rounded-lg">
                      <span className="text-xl">🚛</span>
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest">Free Shipping Unlocked!</p>
                  </div>
                )}
              </div>

              {cart.map((item, idx) => (
                <div
                  key={item.id}
                  className={`bg-white p-4 rounded-[2rem] shadow-sm hover:shadow-honey transition-all duration-300 flex gap-5 group relative transform ${isRendered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${idx * 50}ms` }}
                >
                  <div className="w-24 h-28 rounded-2xl overflow-hidden bg-brand-light flex-shrink-0 relative group-hover:shadow-md transition-all">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  </div>

                  <div className="flex-grow flex flex-col justify-between py-1">
                    <div className="pr-10">
                      <h4 className="font-bold text-brand-black text-base leading-tight line-clamp-2 group-hover:text-brand-secondary transition-colors">{item.title}</h4>
                      <p className="text-brand-secondary/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">{item.category}</p>
                    </div>

                    <div className="flex items-end justify-between mt-2">
                      <div className="flex flex-col">
                        <p className="font-black text-lg text-brand-black tracking-tight">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-medium text-gray-400">₹{item.price} ea</p>
                      </div>

                      <div className="flex items-center gap-2 bg-brand-light rounded-xl p-1 border border-brand-primary/10">
                        <button
                          onClick={() => onUpdateQuantity(item.id, -1)}
                          className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center rounded-lg bg-white text-brand-black hover:bg-rose-50 hover:text-brand-rose transition-colors shadow-sm text-sm active:scale-95"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="text-sm font-bold text-brand-black w-6 text-center tabular-nums">{item.quantity}</span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, 1)}
                          className="w-8 h-8 md:w-7 md:h-7 flex items-center justify-center rounded-lg bg-white text-brand-black hover:bg-brand-primary/10 hover:text-brand-primary transition-colors shadow-sm text-sm active:scale-95"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => onRemove(item.id)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-transparent hover:bg-rose-50 flex items-center justify-center text-gray-300 hover:text-brand-rose transition-all"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="relative p-6 md:p-8 bg-white/95 backdrop-blur-xl border-t border-brand-light shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)] z-20">
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                <span>Subtotal</span>
                <span className="text-brand-black font-bold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                <span>Delivery</span>
                <span className={shippingFee === 0 ? "text-brand-meadow font-bold" : "text-brand-black font-bold"}>
                  {shippingFee === 0 ? 'FREE' : `₹${shippingFee.toLocaleString('en-IN')}`}
                </span>
              </div>
              <div className="flex justify-between items-end pt-2 border-t border-dashed border-gray-200">
                <span className="text-brand-black font-black text-base uppercase tracking-wider">Total</span>
                <span className="text-3xl font-black text-brand-black tracking-tighter">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <button
              onClick={onCheckout}
              className="group w-full bg-brand-black text-brand-primary py-5 rounded-2xl shadow-lg hover:shadow-brand-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-300 overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl group-hover:animate-buzz flex items-center justify-center">
                  <BeeCharacter size="1.5rem" />
                </span>
                <span className="text-lg font-black tracking-wide uppercase">Proceed to Checkout</span>
              </div>
            </button>

            <p className="text-center mt-4 text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em] flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span> 100% Secure Checkout
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
