import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Book, Heart, Star, Sparkles, ChevronRight } from 'lucide-react';

interface HeroGlassmorphicProps {
  onShopNow: () => void;
}

const HoneycombPattern: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={`absolute inset-0 w-full h-full ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    width="100%"
    height="100%"
  >
    <defs>
      <pattern
        id="honeycomb"
        x="0"
        y="0"
        width="60"
        height="52"
        patternUnits="userSpaceOnUse"
        patternTransform="scale(1.2)"
      >
        <path
          d="M30 0 L52 15 L52 37 L30 52 L8 37 L8 15 Z"
          fill="none"
          stroke="#FFA500"
          strokeWidth="0.5"
          opacity="0.15"
        />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#honeycomb)" />
  </svg>
);

const FloatingCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
}> = ({ children, className = "", delay = 0 }) => (
  <div
    className={`absolute backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 animate-float ${className}`}
    style={{
      animationDelay: `${delay}ms`,
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    }}
  >
    {children}
  </div>
);

const HeroGlassmorphic: React.FC<HeroGlassmorphicProps> = ({ onShopNow }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [scrollY, setScrollY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
        setMousePosition({ x, y });
      }
    };

    const handleScroll = () => setScrollY(window.scrollY);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50"
      style={{
        fontFamily: '"Inter", "Poppins", system-ui, sans-serif',
      }}
    >
      {/* Honeycomb Background Pattern */}
      <HoneycombPattern className="opacity-15" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute w-[800px] h-[800px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, #FFA500 0%, transparent 70%)',
            left: '-200px',
            top: '-200px',
            filter: 'blur(100px)',
            transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full opacity-25"
          style={{
            background: 'radial-gradient(circle, #2D5016 0%, transparent 70%)',
            right: '-150px',
            bottom: '-150px',
            filter: 'blur(80px)',
            transform: `translate(${-mousePosition.x * 0.3}px, ${-mousePosition.y * 0.3}px)`,
            transition: 'transform 0.3s ease-out',
          }}
        />
      </div>

      {/* Floating Product Cards */}
      <div className="absolute inset-0 pointer-events-none">
        <FloatingCard delay={0} className="top-20 left-10 lg:top-32 lg:left-20">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-200 to-amber-300 rounded-2xl flex items-center justify-center shadow-lg">
              <Book className="w-12 h-12 text-amber-800" />
            </div>
            <div className="text-center">
              <h4 className="font-bold text-amber-900">Premium Books</h4>
              <p className="text-sm text-amber-700">Educational & Fun</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard delay={200} className="top-40 right-10 lg:top-48 lg:right-32">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-orange-200 to-orange-300 rounded-2xl flex items-center justify-center shadow-lg">
              <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-center">
              <h4 className="font-bold text-orange-900">Artisan Honey</h4>
              <p className="text-sm text-orange-700">Pure & Natural</p>
            </div>
          </div>
        </FloatingCard>

        <FloatingCard delay={400} className="bottom-32 left-1/4 lg:bottom-48 lg:left-1/3">
          <div className="flex items-center space-x-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="w-6 h-6 text-yellow-500 fill-yellow-500"
                  strokeWidth={2}
                />
              ))}
            </div>
            <div>
              <p className="font-bold text-amber-900">5.0 Rating</p>
              <p className="text-sm text-amber-700">2,000+ Reviews</p>
            </div>
          </div>
        </FloatingCard>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen px-6 lg:px-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          {/* Left Content */}
          <div className="text-center lg:text-left space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-full px-6 py-3">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <span className="text-amber-900 font-semibold">Premium Quality Assured</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-4">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black leading-tight">
                <span className="text-gray-900">Learn &</span>
                <br />
                <span className="relative inline-block">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">
                    Buzz
                  </span>
                  <div className="absolute -bottom-2 left-0 w-full h-4 bg-gradient-to-r from-amber-200/50 to-orange-200/50 rounded-full blur-xl" />
                </span>
              </h1>
              <p className="text-xl sm:text-2xl lg:text-3xl text-gray-700 font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
                Discover premium educational books, artisan honey, and nature-inspired learning supplies
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button
                onClick={onShopNow}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 min-h-[48px]"
                style={{
                  background: 'linear-gradient(135deg, #FFB347 0%, #FFA500 100%)',
                  boxShadow: '0 10px 30px -10px rgba(255, 165, 0, 0.5)',
                }}
              >
                <ShoppingCart className="w-5 h-5 mr-3" />
                Start Shopping
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              </button>
              
              <button
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-amber-700 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl transition-all duration-300 hover:bg-white/30 hover:scale-105 active:scale-95 min-h-[48px]"
              >
                <Heart className="w-5 h-5 mr-3" />
                Browse Collection
              </button>
            </div>

            {/* Social Proof */}
            <div className="flex items-center justify-center lg:justify-start space-x-8 pt-8">
              <div className="text-center">
                <p className="text-3xl font-black text-gray-900">10K+</p>
                <p className="text-sm text-gray-600">Happy Customers</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-gray-900">500+</p>
                <p className="text-sm text-gray-600">Products</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-black text-gray-900">4.9★</p>
                <p className="text-sm text-gray-600">Average Rating</p>
              </div>
            </div>
          </div>

          {/* Right Content - Hero Image Placeholder */}
          <div className="relative">
            <div
              className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl p-8 lg:p-12"
              style={{
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                transform: `perspective(1000px) rotateY(${mousePosition.x}deg) rotateX(${-mousePosition.y}deg)`,
                transition: 'transform 0.3s ease-out',
              }}
            >
              <div className="aspect-square bg-gradient-to-br from-amber-100/50 to-orange-100/50 rounded-2xl flex items-center justify-center">
                <div className="text-center space-y-6">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl">
                    <span className="text-6xl">🐝</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to SINGGLEBEE</h3>
                    <p className="text-gray-700 max-w-md mx-auto">
                      Your premium destination for educational excellence and natural goodness
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Elements Around Card */}
            <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-200 rounded-full opacity-60 animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-16 h-16 bg-orange-200 rounded-full opacity-60 animate-pulse delay-1000" />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-sm text-gray-600 mb-2 font-medium">Scroll to explore</p>
        <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-bounce" />
        </div>
      </div>
    </section>
  );
};

export default HeroGlassmorphic;
