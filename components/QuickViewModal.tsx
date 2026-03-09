import React, { useEffect } from 'react';
import { Product } from '../types';

interface QuickViewModalProps {
  product: Product | null;
  onClose: () => void;
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, onClose }) => {
  const [addStatus, setAddStatus] = React.useState<'idle' | 'loading' | 'success'>('idle');

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!product) return null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (addStatus !== 'idle') return;
    setAddStatus('loading');
    setTimeout(() => {
      // We'll need a way to trigger the actual add, for now we simulate
      // In a real app, this would come from a context or prop
      setAddStatus('success');
      setTimeout(() => setAddStatus('idle'), 1500);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-12 animate-fade-in">
      <div className="absolute inset-0 bg-brand-black/40 backdrop-blur-xl" onClick={onClose} />

      <div className="relative bg-white/90 backdrop-blur-md rounded-[3.5rem] shadow-[0_30px_100px_rgba(0,0,0,0.3)] overflow-hidden w-full max-w-5xl max-h-[90vh] flex flex-col md:flex-row animate-slide-up border border-white/50">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-8 right-8 z-50 w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center text-brand-black hover:bg-brand-primary transition-all active:scale-90 font-black"
        >
          ✕
        </button>

        {/* Left Column: Image Centerpiece */}
        <div className="md:w-1/2 p-8 md:p-16 flex items-center justify-center bg-gradient-to-br from-amber-50/80 to-orange-50/50 border-b md:border-b-0 md:border-r border-white/50 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full honeycomb-pattern opacity-[0.03] pointer-events-none"></div>
          <div className="relative w-full aspect-square flex items-center justify-center group">
            <div className="absolute inset-0 bg-brand-primary/15 honey-blob blur-3xl opacity-60 group-hover:scale-110 transition-transform duration-1000"></div>
            <img
              src={product.image}
              alt={product.title}
              className="max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.15)] relative z-10 transition-transform duration-700 hover:scale-105"
            />
          </div>
        </div>

        {/* Right Column: Information & Actions */}
        <div className="md:w-1/2 p-10 md:p-16 flex flex-col overflow-y-auto no-scrollbar">
          <div className="mb-auto">
            {/* Category & Rating */}
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black text-brand-secondary uppercase tracking-[0.3em] inline-block bg-brand-primary/10 px-4 py-2 rounded-full">
                {product.category === 'Books' ? 'Educational Book' : product.category}
              </span>
              <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-100/50">
                <span className="text-amber-500 text-sm">★</span>
                <span className="font-extrabold text-brand-black text-sm">{product.rating}</span>
              </div>
            </div>

            {/* Title & Author */}
            <h2 className="text-4xl lg:text-5xl font-black text-brand-black tracking-tighter leading-tight mb-4">
              {product.title}
            </h2>
            <p className="text-gray-400 font-bold text-xl mb-10 italic">
              by{' '}
              <span className="text-brand-black not-italic hover:text-brand-primary transition-colors cursor-pointer">
                {product.author}
              </span>
            </p>

            {/* Price */}
            <div className="flex items-baseline gap-2 mb-10">
              <span className="text-5xl font-black text-brand-black tracking-tighter">
                ₹{product.price.toLocaleString('en-IN')}
              </span>
              <span className="text-gray-400 text-sm font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded">
                Inclusive of all taxes
              </span>
            </div>

            {/* Description Snapshot */}
            <div className="space-y-4 mb-12">
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400">
                The Hive Snapshot
              </h4>
              <p className="text-gray-600 font-medium leading-relaxed text-lg line-clamp-4">
                {product.description}
              </p>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-10 border-t border-brand-primary/10 flex flex-col gap-4">
            <button
              onClick={handleAddToCart}
              disabled={addStatus !== 'idle'}
              className={`group/hive-modal flex items-center justify-center gap-4 w-full py-5 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.25em] shadow-[0_25px_60px_rgba(0,0,0,0.3)] transition-all transform hover:scale-[1.02] active:scale-95 border
                ${
                  addStatus === 'idle'
                    ? 'bg-brand-black text-brand-primary border-brand-primary/20 hover:bg-brand-primary hover:text-white hover:shadow-brand-primary/30'
                    : ''
                }
                ${addStatus === 'loading' ? 'bg-brand-dark/60 text-white cursor-wait border-white/10' : ''}
                ${addStatus === 'success' ? 'bg-brand-meadow text-white border-brand-meadow/50' : ''}
              `}
            >
              {addStatus === 'loading' ? (
                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : addStatus === 'success' ? (
                <span className="flex items-center gap-2">COLLECTED! 🍯</span>
              ) : (
                <>
                  <span className="relative w-5 h-5 transition-transform duration-500 group-hover/hive-modal:buzz">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                      <path
                        d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"
                        fillOpacity="0.3"
                      />
                      <path d="M12 4L6 18.5H18L12 4Z" />
                      <circle cx="12" cy="13" r="1.5" />
                    </svg>
                  </span>
                  <span>Add to Hive</span>
                </>
              )}
            </button>
            <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              🐝 Buzz: Ships in 3-5 Bee Days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
