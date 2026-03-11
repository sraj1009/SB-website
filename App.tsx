import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import Navbar from './components/Navbar.tsx';
import ProductCard, { ProductSkeleton } from './components/ProductCard.tsx';
import ProductDetails, { ProductDetailsSkeleton } from './components/ProductDetails.tsx';
import CartDrawer from './components/CartDrawer.tsx';
const CheckoutModal = React.lazy(() => import('./components/CheckoutModal.tsx'));
const QuickViewModal = React.lazy(() => import('./components/QuickViewModal.tsx'));
import FilterSidebar from './components/FilterSidebar.tsx';
import Hero from './components/Hero.tsx';
import Footer from './components/Footer.tsx';
import SupportPage, { SupportPageType } from './components/SupportPage.tsx';
const AuthModal = React.lazy(() => import('./components/AuthModal.tsx'));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard.tsx'));
const AdminHive = React.lazy(() => import('./components/AdminHive.tsx'));
const AdminHiveTest = React.lazy(() => import('./components/AdminHiveTest.tsx'));
import CookieConsent from './components/CookieConsent.tsx';
import Assistant from './components/Assistant.tsx';
import InteractiveParticles from './components/InteractiveParticles.tsx';
import RoamingBee from './components/RoamingBee.tsx';
import AutoScrollProductBand from './components/AutoScrollProductBand';
import TestimonialMarquee from './components/TestimonialMarquee';
import api from './services/api';
import { MOCK_PRODUCTS } from './constants.ts';
import { Category, Product, CartItem, User } from './types.ts';
import BeeCharacter from './components/BeeCharacter.tsx';
import { useProducts, useProductFilter } from './hooks/useProducts.ts';

// NoResults component for better UX
const NoResults: React.FC<{ searchQuery: string; onClearFilters: () => void }> = ({
  searchQuery,
  onClearFilters,
}) => (
  <div className="flex flex-col items-center justify-center py-24 px-6 text-center bg-white rounded-[4rem] shadow-honey border-4 border-dashed border-brand-primary/20 max-w-2xl mx-auto">
    <div className="text-8xl mb-6 animate-float flex justify-center">🐝</div>
    <h3 className="text-3xl font-black text-brand-black mb-4">No products found</h3>
    <p className="text-gray-500 font-bold mb-8 max-w-md">
      Our bees couldn't find anything matching "{searchQuery}". Try different keywords or clear your
      filters.
    </p>
    <button
      onClick={onClearFilters}
      className="bg-brand-black text-brand-primary px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-lg"
    >
      <span>🔄</span> Clear Filters
    </button>
  </div>
);

const App: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  const [showShop, setShowShop] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.ALL);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [activeSupportPage, setActiveSupportPage] = useState<SupportPageType | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showAdminHive, setShowAdminHive] = useState(false);
  const [showAdminTest, setShowAdminTest] = useState(false);
  const isInitialRender = useRef(true);
  const lastGoodProducts = useRef<Product[]>([]);
  const testimonialRef = useRef<HTMLDivElement>(null);
  const allProductsRef = useRef<HTMLDivElement>(null);

  const [wishlist, setWishlist] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('singglebee_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [showWishlist, setShowWishlist] = useState(false);
  const [sortBy, setSortBy] = useState<
    'default' | 'price-low' | 'price-high' | 'rating' | 'newest'
  >('default');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isAllProductsInView, setIsAllProductsInView] = useState(false);

  // Use custom hooks for products and filtering
  const { products, isLoading } = useProducts({
    selectedCategory,
    searchQuery,
    sortBy,
    priceRange,
    selectedLanguage,
  });

  const { filteredProducts } = useProductFilter({
    selectedCategory,
    searchQuery,
    priceRange,
    minRating,
    sortBy,
    selectedLanguage,
    products,
  });

  // Data Fetching - now handled by useProducts hook

  useEffect(() => {
    const verifySession = async () => {
      try {
        const userData = await api.auth.getProfile();
        setUser(userData);
        // Optionally sync with localStorage for offline fallback
        localStorage.setItem('singglebee_user', JSON.stringify(userData));
      } catch (e) {
        // Clear invalid session data
        setUser(null);
        localStorage.removeItem('singglebee_user');
      }
    };

    verifySession();
  }, []);

  // Auto-scroll testimonials for mobile
  useEffect(() => {
    const scrollContainer = testimonialRef.current;
    if (!scrollContainer) return;

    let interval: NodeJS.Timeout;
    const startAutoScroll = () => {
      interval = setInterval(() => {
        if (!scrollContainer) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainer;

        // If we're at the end, snap back to start
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollContainer.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainer.scrollBy({ left: 320, behavior: 'smooth' }); // Approximate card width + gap
        }
      }, 4000);
    };

    startAutoScroll();

    const handleInteraction = () => {
      clearInterval(interval);
      // Resume after 8s of inactivity
      setTimeout(startAutoScroll, 8000);
    };

    scrollContainer.addEventListener('touchstart', handleInteraction);
    scrollContainer.addEventListener('wheel', handleInteraction);

    return () => {
      clearInterval(interval);
      if (scrollContainer) {
        scrollContainer.removeEventListener('touchstart', handleInteraction);
        scrollContainer.removeEventListener('wheel', handleInteraction);
      }
    };
  }, []);

  // Intersection Observer for All Products section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsAllProductsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.1, rootMargin: '-100px 0px 0px 0px' }
    );

    if (allProductsRef.current) {
      observer.observe(allProductsRef.current);
    }

    return () => {
      if (allProductsRef.current) {
        observer.unobserve(allProductsRef.current);
      }
    };
  }, [showShop]);

  // Simple relevance scoring for search - now handled by useProductFilter hook
  // calculateRelevance is available from useProductFilter if needed

  // Filtering Simulation with Staggered Exit
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      lastGoodProducts.current = filteredProducts;
      return;
    }

    setIsExiting(true);

    const exitTimer = window.setTimeout(() => {
      setIsExiting(false);
      setIsFiltering(true);

      const filterTimer = window.setTimeout(() => {
        setIsFiltering(false);
        lastGoodProducts.current = filteredProducts;
      }, 400);

      return () => window.clearTimeout(filterTimer);
    }, 300);

    return () => window.clearTimeout(exitTimer);
  }, [selectedCategory, searchQuery, priceRange, minRating, filteredProducts, selectedLanguage]);

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory(Category.ALL);
    setSelectedLanguage(null);
    setPriceRange([0, 5000]);
    setMinRating(null);
  };

  const handleLoginSuccess = (userData: User) => {
    setUser(userData);
    localStorage.setItem('singglebee_user', JSON.stringify(userData));
  };

  const handleSignOut = () => {
    setUser(null);
    localStorage.removeItem('singglebee_user');
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: number) => setCart((prev) => prev.filter((item) => item.id !== id));
  const updateQuantity = (id: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = Math.max(0, item.quantity + delta);
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const toggleWishlist = (productId: number) => {
    setWishlist((prev) => {
      const newWishlist = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem('singglebee_wishlist', JSON.stringify(newWishlist));
      return newWishlist;
    });
  };

  const resetToHome = () => {
    setShowShop(false);
    setSelectedCategory(Category.ALL);
    setSearchQuery('');
    setSelectedLanguage(null);
    setActiveSupportPage(null);
    setSelectedProduct(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const morphScrollToGrid = () => {
    // Small delay to ensure the DOM is updated if we just switched to shop view
    setTimeout(() => {
      if (allProductsRef.current) {
        allProductsRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else {
        window.scrollTo({ top: 800, behavior: 'smooth' }); // Fallback if ref isn't ready
      }
    }, 100);
  };

  const goToShop = (category: Category = Category.ALL) => {
    setSelectedProduct(null);
    setActiveSupportPage(null);
    setShowWishlist(false);
    setShowShop(true);
    setSearchQuery('');
    setSelectedCategory(category);
    // Reset language filter ONLY if we are not explicitly navigating to BOOKS via the language bands
    // But since this function is general, we might need a separate way to set language.
    // Actually, we'll clear language here to be safe for general navigation.
    // The View All handlers will set language AFTER calling this or handle state updates manually.
    if (category !== Category.BOOKS || !selectedLanguage) {
      setSelectedLanguage(null);
    }

    // If already in shop, morph scroll to grid
    if (showShop) {
      morphScrollToGrid();
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToWishlist = () => {
    setSelectedProduct(null);
    setActiveSupportPage(null);
    setShowShop(false);
    setShowWishlist(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const moveWishlistToCart = () => {
    const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

    setCart((prev) => {
      const newCart = [...prev];
      wishlistProducts.forEach((product) => {
        const existingInfo = newCart.find((item) => item.id === product.id);
        if (existingInfo) {
          existingInfo.quantity += 1;
        } else {
          newCart.push({ ...product, quantity: 1 });
        }
      });
      return newCart;
    });

    // Clear wishlist
    setWishlist([]);
    localStorage.setItem('singglebee_wishlist', JSON.stringify([]));
    setIsCartOpen(true);
  };

  const navigateToSupport = (page: SupportPageType) => {
    setSelectedProduct(null);
    setShowShop(false);
    setShowWishlist(false);
    setActiveSupportPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToTestimonials = () => {
    resetToHome();
    setTimeout(() => {
      const testSection = document.getElementById('testimonials-section');
      if (testSection) testSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shippingFee = cartSubtotal > 0 && cartSubtotal < 1499 ? 50 : 0;
  const cartTotal = cartSubtotal + shippingFee;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-brand-light font-sans selection:bg-brand-primary selection:text-brand-black relative">
        <div className="fixed inset-0 honeycomb-pattern pointer-events-none -z-10"></div>

        <InteractiveParticles />
        <RoamingBee isCheckoutOpen={isCheckoutOpen} />

        <Navbar
          cartCount={cartCount}
          onCartClick={() => setIsCartOpen(true)}
          onNavbarSearch={(term) => {
            setSearchQuery(term);
            setSelectedLanguage(null); // Clear language filter on manual search
            setShowShop(true);
            setSelectedProduct(null);
            setActiveSupportPage(null);
          }}
          onCategorySelect={goToShop}
          onNavigateHome={resetToHome}
          onNavigateTestimonials={scrollToTestimonials}
          onNavigateAbout={() => navigateToSupport('about')}
          onNavigateTerms={() => navigateToSupport('terms')}
          onNavigateContact={() => navigateToSupport('contact')}
          onNavigateWishlist={goToWishlist}
          user={user}
          onSignInClick={() => setIsAuthOpen(true)}
          onSignOutClick={handleSignOut}
        />

        <main className="flex-grow w-full max-w-7xl mx-auto pt-48 px-6 relative z-10">
          {selectedProduct ? (
            isLoading ? (
              <ProductDetailsSkeleton />
            ) : (
              <ProductDetails
                product={selectedProduct}
                allProducts={products}
                onBack={() => setSelectedProduct(null)}
                onAddToCart={addToCart}
                onProductClick={setSelectedProduct}
                isWishlisted={wishlist.includes(selectedProduct.id)}
                onToggleWishlist={() => toggleWishlist(selectedProduct.id)}
                wishlistIds={wishlist}
                onToggleWishlistId={toggleWishlist}
              />
            )
          ) : activeSupportPage ? (
            <SupportPage
              page={activeSupportPage}
              onBack={() => setActiveSupportPage(null)}
              onNavigate={setActiveSupportPage}
            />
          ) : showWishlist ? (
            <div className="animate-fade-in min-h-[60vh]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-black text-brand-black tracking-tighter">
                  Your Honey Pot 🍯
                </h2>
                {wishlist.length > 0 && (
                  <button
                    onClick={moveWishlistToCart}
                    className="bg-brand-primary text-brand-black px-6 py-3 rounded-2xl font-black shadow-honey hover:scale-105 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center gap-2"
                  >
                    <span>🚀</span> Move All to Hive
                  </button>
                )}
              </div>

              {wishlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
                  {products
                    .filter((p) => wishlist.includes(p.id))
                    .map((p, idx) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onAddToCart={addToCart}
                        onClick={setSelectedProduct}
                        onQuickView={setQuickViewProduct}
                        isWishlisted={true}
                        onToggleWishlist={() => toggleWishlist(p.id)}
                        index={idx}
                      />
                    ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center bg-white rounded-[4rem] shadow-honey border-4 border-dashed border-brand-primary/20">
                  <div className="text-8xl mb-6 animate-float flex justify-center">
                    <BeeCharacter size="12rem" />
                  </div>
                  <h3 className="text-3xl font-black text-brand-black mb-4">
                    Your Honey Pot is Empty!
                  </h3>
                  <p className="text-gray-500 font-bold mb-8 max-w-md">
                    Our busy bees haven't found any favorites yet. Buzz around the shop to find
                    something sweet!
                  </p>
                  <button
                    onClick={() => goToShop(Category.ALL)}
                    className="bg-brand-black text-brand-primary px-8 py-4 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 text-lg"
                  >
                    <span>🍯</span> Go to Shop
                  </button>
                </div>
              )}
            </div>
          ) : !showShop ? (
            <>
              <Hero onShopNow={() => goToShop(Category.ALL)} />

              {/* Tamil Books Band */}
              <AutoScrollProductBand
                title="Tamil Books"
                products={products.filter((p) => p.language === 'Tamil')}
                onViewAll={() => {
                  setSearchQuery(''); // Clear manual search
                  setSelectedLanguage('Tamil'); // Set strict language filter
                  setSelectedCategory(Category.BOOKS);
                  setShowShop(true);
                  morphScrollToGrid();
                }}
                onProductClick={setSelectedProduct}
                onAddToCart={addToCart}
                onQuickView={setQuickViewProduct}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
                bgColor="bg-white"
              />

              {/* English Books Band */}
              <AutoScrollProductBand
                title="English Books"
                products={products.filter((p) => p.language === 'English')}
                onViewAll={() => {
                  setSearchQuery(''); // Clear manual search
                  setSelectedLanguage('English'); // Set strict language filter
                  setSelectedCategory(Category.BOOKS);
                  setShowShop(true);
                  morphScrollToGrid();
                }}
                onProductClick={setSelectedProduct}
                onAddToCart={addToCart}
                onQuickView={setQuickViewProduct}
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
                bgColor="bg-brand-light"
                direction="right"
              />

              {/* Testimonials Band */}
              <TestimonialMarquee />
            </>
          ) : (
            /* ==================== SHOP VIEW ==================== */
            <div className="pb-24">
              {/* Category Pills & Sort Controls - Single Row */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
                {/* Category Pills */}
                <div className="overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex gap-2.5 sm:gap-3 w-max sm:w-auto">
                    {[Category.ALL, Category.BOOKS, Category.FOOD, Category.STATIONERY].map(
                      (cat) => {
                        // For the "All" button, only show active state when All Products section is in view
                        const isAllButtonActive =
                          cat === Category.ALL
                            ? selectedCategory === Category.ALL && isAllProductsInView
                            : selectedCategory === cat;

                        return (
                          <button
                            key={cat}
                            onClick={() => {
                              setSelectedCategory(cat);
                              morphScrollToGrid();
                            }}
                            className={`group relative px-5 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-black transition-all duration-300 overflow-hidden shadow-sm
                        ${
                          isAllButtonActive
                            ? 'bg-zinc-900 text-white shadow-honey scale-105'
                            : 'bg-white/70 backdrop-blur-md text-gray-500 border border-white/50 hover:bg-white hover:text-brand-black hover:border-brand-primary hover:shadow-md'
                        }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-2.5 relative z-10 transition-transform group-hover:scale-105">
                              <span
                                className={`text-base sm:text-lg ${isAllButtonActive ? 'scale-110' : 'grayscale group-hover:grayscale-0'} transition-all duration-300`}
                              >
                                {cat === Category.ALL
                                  ? '🏠'
                                  : cat === Category.BOOKS
                                    ? '📚'
                                    : cat === Category.FOOD
                                      ? '🍯'
                                      : '✏️'}
                              </span>
                              <span className="tracking-widest uppercase">
                                {cat === Category.ALL ? 'All' : cat}
                              </span>
                            </div>

                            {/* Interactive Accent Line */}
                            {isAllButtonActive && (
                              <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-primary" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Sort Control */}
                <div className="relative shrink-0">
                  <button
                    onClick={() => setIsSortOpen(!isSortOpen)}
                    className="flex items-center justify-between gap-3 px-5 py-3 bg-white border border-gray-100 shadow-sm rounded-xl hover:border-brand-primary/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="bg-brand-light p-1.5 rounded-lg text-brand-black group-hover:bg-brand-primary/20 transition-colors">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
                          />
                        </svg>
                      </span>
                      <span className="font-bold text-sm text-gray-700">
                        {sortBy === 'default' && 'Sort By'}
                        {sortBy === 'price-low' && 'Price: Low to High'}
                        {sortBy === 'price-high' && 'Price: High to Low'}
                        {sortBy === 'rating' && 'Top Rated'}
                        {sortBy === 'newest' && 'Newest Arrivals'}
                      </span>
                    </div>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform ${isSortOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isSortOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 animate-scale-in origin-top-right">
                      {[
                        {
                          value: 'default',
                          label: 'Recommended',
                          icon: '✨',
                          desc: 'Curated for you',
                        },
                        {
                          value: 'newest',
                          label: 'Newest Arrivals',
                          icon: '🆕',
                          desc: 'Fresh from the hive',
                        },
                        {
                          value: 'rating',
                          label: 'Top Rated',
                          icon: '⭐',
                          desc: 'Community favorites',
                        },
                        {
                          value: 'price-low',
                          label: 'Price: Low to High',
                          icon: '💰',
                          desc: 'Budget friendly',
                        },
                        {
                          value: 'price-high',
                          label: 'Price: High to Low',
                          icon: '💎',
                          desc: 'Premium selection',
                        },
                      ].map((option, idx) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value as any);
                            setIsSortOpen(false);
                            morphScrollToGrid();
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors group/option
                          ${sortBy === option.value ? 'bg-brand-primary/10' : 'hover:bg-gray-50'}
                          ${idx !== 4 ? 'border-b border-gray-50' : ''}
                        `}
                          style={{ animationDelay: `${idx * 50}ms` }}
                        >
                          <span
                            className={`text-xl transition-transform duration-300 ${sortBy === option.value ? 'scale-125' : 'group-hover/option:scale-110'}`}
                          >
                            {option.icon}
                          </span>
                          <div className="flex-1">
                            <p
                              className={`text-sm font-bold ${sortBy === option.value ? 'text-amber-700' : 'text-gray-800'}`}
                            >
                              {option.label}
                            </p>
                            <p className="text-[10px] text-gray-400 font-medium">{option.desc}</p>
                          </div>
                          {sortBy === option.value && (
                            <div className="w-5 h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center animate-scale-in">
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={3}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-12 sm:gap-16">
                {/* Featured Bands - Only visible when not searching and viewing ALL */}
                {!searchQuery.trim() && selectedCategory === Category.ALL && (
                  <div className="space-y-12 sm:space-y-16">
                    {/* New Arrivals Band */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl animate-bounce">✨</span>
                          <h2 className="text-2xl sm:text-3xl font-black text-brand-black tracking-tighter">
                            New Arrivals
                          </h2>
                        </div>
                        <button
                          onClick={() => setSortBy('newest')}
                          className="text-brand-primary font-bold text-sm hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {products
                          .filter((p) => !p.isComingSoon && !p.isOutOfStock) // Only available products in New Arrivals
                          .slice()
                          .sort((a, b) => b.id - a.id)
                          .slice(0, 4)
                          .map((p, idx) => (
                            <ProductCard
                              key={`new-${p.id}`}
                              product={p}
                              onAddToCart={addToCart}
                              onClick={setSelectedProduct}
                              onQuickView={setQuickViewProduct}
                              isWishlisted={wishlist.includes(p.id)}
                              onToggleWishlist={() => toggleWishlist(p.id)}
                              index={idx}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Best Sellers Band */}
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl animate-pulse">🏆</span>
                          <h2 className="text-2xl sm:text-3xl font-black text-brand-black tracking-tighter">
                            Best Sellers
                          </h2>
                        </div>
                        <button
                          onClick={() => setSortBy('rating')}
                          className="text-brand-primary font-bold text-sm hover:underline"
                        >
                          View All
                        </button>
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {products
                          .filter((p) => p.bestseller && !p.isComingSoon && !p.isOutOfStock) // Only available bestsellers
                          .slice(0, 4)
                          .map((p, idx) => (
                            <ProductCard
                              key={`best-${p.id}`}
                              product={p}
                              onAddToCart={addToCart}
                              onClick={setSelectedProduct}
                              onQuickView={setQuickViewProduct}
                              isWishlisted={wishlist.includes(p.id)}
                              onToggleWishlist={() => toggleWishlist(p.id)}
                              index={idx}
                            />
                          ))}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="relative py-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t-2 border-dashed border-brand-black/10"></div>
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-brand-light px-4 text-sm font-black text-brand-black/40 uppercase tracking-widest">
                          All Products
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main Product Grid */}
                <div
                  ref={allProductsRef}
                  className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 min-h-[400px] sm:min-h-[500px] scroll-mt-48"
                >
                  {isLoading || isFiltering ? (
                    [...Array(6)].map((_, i) => <ProductSkeleton key={`skeleton-${i}`} />)
                  ) : isExiting ? (
                    lastGoodProducts.current.map((p, idx) => (
                      <ProductCard
                        key={`exiting-${p.id}`}
                        product={p}
                        onAddToCart={addToCart}
                        onClick={setSelectedProduct}
                        onQuickView={setQuickViewProduct}
                        isWishlisted={wishlist.includes(p.id)}
                        onToggleWishlist={() => toggleWishlist(p.id)}
                        index={idx}
                        isExiting={true}
                      />
                    ))
                  ) : filteredProducts.length > 0 ? (
                    filteredProducts.map((p, idx) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        onAddToCart={addToCart}
                        onClick={setSelectedProduct}
                        onQuickView={setQuickViewProduct}
                        isWishlisted={wishlist.includes(p.id)}
                        onToggleWishlist={() => toggleWishlist(p.id)}
                        index={idx}
                      />
                    ))
                  ) : searchQuery.trim() ||
                    selectedCategory !== Category.ALL ||
                    selectedLanguage ||
                    minRating !== null ||
                    priceRange[0] > 0 ||
                    priceRange[1] < 5000 ? (
                    <NoResults
                      searchQuery={searchQuery || 'filtered products'}
                      onClearFilters={clearAllFilters}
                    />
                  ) : (
                    <div className="col-span-full py-32 text-center animate-fade-in bg-white rounded-[4rem] shadow-honey border-4 border-dashed border-brand-primary/20">
                      <div className="text-6xl mb-6 animate-buzz inline-flex justify-center">
                        <BeeCharacter size="8rem" />
                      </div>
                      <h3 className="text-3xl font-black text-brand-black mb-3">
                        Oh Honey, it's empty!
                      </h3>
                      <p className="text-gray-500 font-bold">
                        Try searching for something else in the hive.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        <Footer
          onNavigateShop={() => goToShop()}
          onNavigateSupport={navigateToSupport}
          onNavigateHome={resetToHome}
          onNavigateWishlist={goToWishlist}
        />

        <CartDrawer
          isOpen={isCartOpen}
          onClose={() => setIsCartOpen(false)}
          cart={cart}
          onRemove={removeFromCart}
          onUpdateQuantity={updateQuantity}
          onCheckout={() => {
            setIsCartOpen(false);
            setIsCheckoutOpen(true);
          }}
          onStartCollecting={() => {
            setIsCartOpen(false);
            goToShop();
          }}
        />
        <React.Suspense fallback={null}>
          <CheckoutModal
            isOpen={isCheckoutOpen}
            onClose={() => setIsCheckoutOpen(false)}
            subtotal={cartSubtotal}
            shippingFee={shippingFee}
            total={cartTotal}
            cart={cart}
            onSuccess={() => setCart([])}
            user={user}
          />
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
            onLoginSuccess={handleLoginSuccess}
          />
          <QuickViewModal product={quickViewProduct} onClose={() => setQuickViewProduct(null)} />
        </React.Suspense>
        <Assistant products={products} />

        {user?.role === 'admin' && (
          <>
            <button
              onClick={() => setShowAdmin(true)}
              className="fixed bottom-6 left-6 z-50 w-14 h-14 bg-brand-black text-brand-primary rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-2xl border-2 border-brand-primary/20 hover:shadow-honey"
              aria-label="Admin Dashboard"
            >
              👑
            </button>
            <button
              onClick={() => setShowAdminHive(true)}
              className="fixed bottom-6 left-24 z-50 w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-xl border-2 border-amber-300/20 hover:shadow-honey"
              aria-label="Admin Hive"
            >
              🐝
            </button>
            <button
              onClick={() => setShowAdminTest(true)}
              className="fixed bottom-6 left-44 z-50 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center text-xl border-2 border-blue-300/20 hover:shadow-honey"
              aria-label="Admin Test"
            >
              🧪
            </button>
          </>
        )}

        {showAdmin && (
          <React.Suspense fallback={null}>
            <AdminDashboard onClose={() => setShowAdmin(false)} />
          </React.Suspense>
        )}
        {showAdminHive && (
          <React.Suspense fallback={null}>
            <AdminHive onClose={() => setShowAdminHive(false)} />
          </React.Suspense>
        )}
        {showAdminTest && (
          <React.Suspense fallback={null}>
            <AdminHiveTest />
          </React.Suspense>
        )}
        <CookieConsent />
      </div>
    </ErrorBoundary>
  );
};

export default App;
