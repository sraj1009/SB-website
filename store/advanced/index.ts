import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { CartItem, Product, User, Category } from '../../types';

// Export Category for use
export enum Category {
  ALL = 'ALL',
  BOOKS = 'BOOKS',
  FOOD = 'FOOD',
  STATIONERY = 'STATIONERY',
}

// Advanced Cart Store with Immer and migrations
interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  lastUpdated: Date;
  version: number;
  
  // Actions
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  
  // Computed values
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getSubtotal: () => number;
  getTax: () => number;
  getShippingFee: () => number;
  getTotalWithTax: () => number;
  getItemQuantity: (productId: number) => number;
  isInCart: (productId: number) => boolean;
  
  // Bulk operations
  addMultipleItems: (items: Product[]) => void;
  applyDiscountCode: (code: string) => boolean;
  removeDiscountCode: () => void;
  
  // Analytics
  getCartAnalytics: () => {
    totalItems: number;
    totalValue: number;
    averageItemPrice: number;
    mostExpensiveItem: CartItem | null;
    categories: Record<string, number>;
  };
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        items: [],
        isOpen: false,
        lastUpdated: new Date(),
        version: 1,
        
        addItem: (product: Product) => {
          set((state) => {
            const existingItem = state.items.find((item) => item.id === product.id);
            
            if (existingItem) {
              existingItem.quantity += 1;
              existingItem.lastAdded = new Date();
            } else {
              state.items.push({
                ...product,
                quantity: 1,
                addedAt: new Date(),
                lastAdded: new Date(),
              });
            }
            
            state.lastUpdated = new Date();
          });
        },
        
        removeItem: (productId: number) => {
          set((state) => {
            state.items = state.items.filter((item) => item.id !== productId);
            state.lastUpdated = new Date();
          });
        },
        
        updateQuantity: (productId: number, delta: number) => {
          set((state) => {
            const item = state.items.find((item) => item.id === productId);
            
            if (item) {
              item.quantity = Math.max(0, item.quantity + delta);
              item.lastAdded = new Date();
              
              if (item.quantity === 0) {
                state.items = state.items.filter((i) => i.id !== productId);
              }
            }
            
            state.lastUpdated = new Date();
          });
        },
        
        clearCart: () => {
          set((state) => {
            state.items = [];
            state.lastUpdated = new Date();
          });
        },
        
        toggleCart: () => {
          set((state) => {
            state.isOpen = !state.isOpen;
          });
        },
        
        setCartOpen: (open: boolean) => {
          set((state) => {
            state.isOpen = open;
          });
        },
        
        getTotalItems: () => {
          return get().items.reduce((acc, item) => acc + item.quantity, 0);
        },
        
        getTotalPrice: () => {
          return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        },
        
        getSubtotal: () => {
          return get().getTotalPrice();
        },
        
        getTax: () => {
          return Math.round(get().getSubtotal() * 0.08 * 100) / 100; // 8% tax
        },
        
        getShippingFee: () => {
          const subtotal = get().getSubtotal();
          return subtotal > 0 && subtotal < 1499 ? 50 : 0;
        },
        
        getTotalWithTax: () => {
          return get().getSubtotal() + get().getTax() + get().getShippingFee();
        },
        
        getItemQuantity: (productId: number) => {
          const item = get().items.find((item) => item.id === productId);
          return item?.quantity || 0;
        },
        
        isInCart: (productId: number) => {
          return get().items.some((item) => item.id === productId);
        },
        
        addMultipleItems: (products: Product[]) => {
          set((state) => {
            products.forEach((product) => {
              const existingItem = state.items.find((item) => item.id === product.id);
              
              if (existingItem) {
                existingItem.quantity += 1;
                existingItem.lastAdded = new Date();
              } else {
                state.items.push({
                  ...product,
                  quantity: 1,
                  addedAt: new Date(),
                  lastAdded: new Date(),
                });
              }
            });
            
            state.lastUpdated = new Date();
          });
        },
        
        applyDiscountCode: (code: string) => {
          // Implement discount logic
          const validCodes = {
            'SAVE10': 0.1,
            'SAVE20': 0.2,
            'WELCOME': 0.15,
          };
          
          const discount = validCodes[code as keyof typeof validCodes];
          if (discount) {
            set((state) => {
              (state as any).discountCode = code;
              (state as any).discountPercentage = discount;
            });
            return true;
          }
          
          return false;
        },
        
        removeDiscountCode: () => {
          set((state) => {
            delete (state as any).discountCode;
            delete (state as any).discountPercentage;
          });
        },
        
        getCartAnalytics: () => {
          const state = get();
          const totalItems = state.getTotalItems();
          const totalValue = state.getTotalPrice();
          const averageItemPrice = totalItems > 0 ? totalValue / totalItems : 0;
          const mostExpensiveItem = state.items.reduce((prev, current) => 
            (prev.price > current.price) ? prev : current, null
          );
          
          const categories = state.items.reduce((acc, item) => {
            const category = item.category || 'OTHER';
            acc[category] = (acc[category] || 0) + item.quantity;
            return acc;
          }, {} as Record<string, number>);
          
          return {
            totalItems,
            totalValue,
            averageItemPrice,
            mostExpensiveItem,
            categories,
          };
        },
      })),
      {
        name: 'cart-storage',
        version: 1,
        storage: createJSONStorage(() => localStorage),
        migrate: (persistedState: any, version: number) => {
          // Migration logic for future state changes
          if (version === 0) {
            // Migrate from old state format
            return {
              items: persistedState.items || [],
              isOpen: false,
              lastUpdated: new Date(),
              version: 1,
            };
          }
          
          return persistedState as CartStore;
        },
        partialize: (state) => ({
          items: state.items,
          isOpen: state.isOpen,
          lastUpdated: state.lastUpdated,
          version: state.version,
        }),
      }
    ),
    { name: 'cart' }
  )
);

// Advanced User Store with authentication and preferences
interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'system';
    language: 'en' | 'ta' | 'hi';
    notifications: boolean;
    emailMarketing: boolean;
    analytics: boolean;
  };
  session: {
    token: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
  };
  
  // Actions
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  updatePreferences: (preferences: Partial<UserStore['preferences']>) => void;
  setSession: (token: string, refreshToken: string, expiresAt: Date) => void;
  clearSession: () => void;
  
  // Computed
  isSessionValid: () => boolean;
  getTimeUntilExpiration: () => number;
  hasPermission: (permission: string) => boolean;
}

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        preferences: {
          theme: 'system',
          language: 'en',
          notifications: true,
          emailMarketing: false,
          analytics: true,
        },
        session: {
          token: null,
          refreshToken: null,
          expiresAt: null,
        },
        
        setUser: (user: User) => {
          set((state) => {
            state.user = user;
            state.isAuthenticated = true;
            state.isLoading = false;
          });
        },
        
        setLoading: (isLoading: boolean) => {
          set((state) => {
            state.isLoading = isLoading;
          });
        },
        
        logout: () => {
          set((state) => {
            state.user = null;
            state.isAuthenticated = false;
            state.session = {
              token: null,
              refreshToken: null,
              expiresAt: null,
            };
          });
        },
        
        updatePreferences: (preferences: Partial<UserStore['preferences']>) => {
          set((state) => {
            state.preferences = { ...state.preferences, ...preferences };
          });
        },
        
        setSession: (token: string, refreshToken: string, expiresAt: Date) => {
          set((state) => {
            state.session = { token, refreshToken, expiresAt };
          });
        },
        
        clearSession: () => {
          set((state) => {
            state.session = {
              token: null,
              refreshToken: null,
              expiresAt: null,
            };
          });
        },
        
        isSessionValid: () => {
          const { session } = get();
          if (!session.token || !session.expiresAt) return false;
          return new Date() < session.expiresAt;
        },
        
        getTimeUntilExpiration: () => {
          const { session } = get();
          if (!session.expiresAt) return 0;
          return session.expiresAt.getTime() - Date.now();
        },
        
        hasPermission: (permission: string) => {
          const { user } = get();
          if (!user) return false;
          return user.permissions?.includes(permission) || user.role === 'admin';
        },
      })),
      {
        name: 'user-storage',
        version: 1,
        storage: createJSONStorage(() => localStorage),
        migrate: (persistedState: any, version: number) => {
          if (version === 0) {
            return {
              ...persistedState,
              preferences: {
                theme: 'system',
                language: 'en',
                notifications: true,
                emailMarketing: false,
                analytics: true,
              },
            };
          }
          return persistedState;
        },
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          preferences: state.preferences,
          session: state.session,
        }),
      }
    ),
    { name: 'user' }
  )
);

// Advanced Wishlist Store with analytics
interface WishlistStore {
  items: number[];
  lastUpdated: Date;
  analytics: {
    totalAdded: number;
    totalRemoved: number;
    mostRecentAdd: Date | null;
    categories: Record<string, number>;
  };
  
  // Actions
  addItem: (productId: number) => void;
  removeItem: (productId: number) => void;
  toggleItem: (productId: number) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: number) => boolean;
  getAnalytics: () => WishlistStore['analytics'];
}

export const useWishlistStore = create<WishlistStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        items: [],
        lastUpdated: new Date(),
        analytics: {
          totalAdded: 0,
          totalRemoved: 0,
          mostRecentAdd: null,
          categories: {},
        },
        
        addItem: (productId: number) => {
          set((state) => {
            if (!state.items.includes(productId)) {
              state.items.push(productId);
              state.lastUpdated = new Date();
              state.analytics.totalAdded += 1;
              state.analytics.mostRecentAdd = new Date();
            }
          });
        },
        
        removeItem: (productId: number) => {
          set((state) => {
            if (state.items.includes(productId)) {
              state.items = state.items.filter((id) => id !== productId);
              state.lastUpdated = new Date();
              state.analytics.totalRemoved += 1;
            }
          });
        },
        
        toggleItem: (productId: number) => {
          const { isInWishlist, addItem, removeItem } = get();
          if (isInWishlist(productId)) {
            removeItem(productId);
          } else {
            addItem(productId);
          }
        },
        
        clearWishlist: () => {
          set((state) => {
            state.items = [];
            state.lastUpdated = new Date();
          });
        },
        
        isInWishlist: (productId: number) => {
          return get().items.includes(productId);
        },
        
        getAnalytics: () => {
          return get().analytics;
        },
      })),
      {
        name: 'wishlist-storage',
        version: 1,
        partialize: (state) => ({
          items: state.items,
          lastUpdated: state.lastUpdated,
          analytics: state.analytics,
        }),
      }
    ),
    { name: 'wishlist' }
  )
);

// Advanced UI Store with responsive design
interface UIStore {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'ta' | 'hi';
  sidebarOpen: boolean;
  searchQuery: string;
  selectedCategory: Category;
  viewMode: 'grid' | 'list';
  sortBy: 'price-low' | 'price-high' | 'name' | 'rating' | 'newest';
  filters: {
    priceRange: [number, number];
    inStock: boolean;
    onSale: boolean;
    ratings: number[];
  };
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    message: string;
    timestamp: Date;
    read: boolean;
  }>;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLanguage: (language: 'en' | 'ta' | 'hi') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: Category) => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sortBy: UIStore['sortBy']) => void;
  setFilters: (filters: Partial<UIStore['filters']>) => void;
  addNotification: (notification: Omit<UIStore['notifications'][0], 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Computed
  getUnreadCount: () => number;
  getActiveFiltersCount: () => number;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        theme: 'system',
        language: 'en',
        sidebarOpen: false,
        searchQuery: '',
        selectedCategory: Category.ALL,
        viewMode: 'grid',
        sortBy: 'name',
        filters: {
          priceRange: [0, 10000],
          inStock: false,
          onSale: false,
          ratings: [],
        },
        notifications: [],
        
        setTheme: (theme: 'light' | 'dark' | 'system') => {
          set((state) => {
            state.theme = theme;
          });
        },
        
        setLanguage: (language: 'en' | 'ta' | 'hi') => {
          set((state) => {
            state.language = language;
          });
        },
        
        toggleSidebar: () => {
          set((state) => {
            state.sidebarOpen = !state.sidebarOpen;
          });
        },
        
        setSidebarOpen: (sidebarOpen: boolean) => {
          set((state) => {
            state.sidebarOpen = sidebarOpen;
          });
        },
        
        setSearchQuery: (searchQuery: string) => {
          set((state) => {
            state.searchQuery = searchQuery;
          });
        },
        
        setSelectedCategory: (selectedCategory: Category) => {
          set((state) => {
            state.selectedCategory = selectedCategory;
          });
        },
        
        setViewMode: (viewMode: 'grid' | 'list') => {
          set((state) => {
            state.viewMode = viewMode;
          });
        },
        
        setSortBy: (sortBy: UIStore['sortBy']) => {
          set((state) => {
            state.sortBy = sortBy;
          });
        },
        
        setFilters: (filters: Partial<UIStore['filters']>) => {
          set((state) => {
            state.filters = { ...state.filters, ...filters };
          });
        },
        
        addNotification: (notification) => {
          set((state) => {
            const newNotification = {
              ...notification,
              id: Math.random().toString(36).substr(2, 9),
              timestamp: new Date(),
              read: false,
            };
            state.notifications.unshift(newNotification);
            
            // Keep only last 50 notifications
            if (state.notifications.length > 50) {
              state.notifications = state.notifications.slice(0, 50);
            }
          });
        },
        
        markNotificationRead: (id: string) => {
          set((state) => {
            const notification = state.notifications.find((n) => n.id === id);
            if (notification) {
              notification.read = true;
            }
          });
        },
        
        clearNotifications: () => {
          set((state) => {
            state.notifications = [];
          });
        },
        
        getUnreadCount: () => {
          return get().notifications.filter((n) => !n.read).length;
        },
        
        getActiveFiltersCount: () => {
          const { filters } = get();
          let count = 0;
          
          if (filters.priceRange[0] > 0 || filters.priceRange[1] < 10000) count++;
          if (filters.inStock) count++;
          if (filters.onSale) count++;
          if (filters.ratings.length > 0) count++;
          
          return count;
        },
      })),
      {
        name: 'ui-storage',
        version: 1,
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
          viewMode: state.viewMode,
          sortBy: state.sortBy,
          filters: state.filters,
        }),
      }
    ),
    { name: 'ui' }
  )
);

// Store hooks for easy access
export const useStore = {
  cart: useCartStore,
  user: useUserStore,
  wishlist: useWishlistStore,
  ui: useUIStore,
};

// Store selectors for optimized re-renders
export const cartSelectors = {
  totalItems: (state: CartStore) => state.getTotalItems(),
  totalPrice: (state: CartStore) => state.getTotalPrice(),
  itemCount: (state: CartStore) => state.items.length,
  isEmpty: (state: CartStore) => state.items.length === 0,
};

export const userSelectors = {
  isAuthenticated: (state: UserStore) => state.isAuthenticated,
  userName: (state: UserStore) => state.user?.name || '',
  userRole: (state: UserStore) => state.user?.role || 'guest',
  hasValidSession: (state: UserStore) => state.isSessionValid(),
};

export const wishlistSelectors = {
  itemCount: (state: WishlistStore) => state.items.length,
  isEmpty: (state: WishlistStore) => state.items.length === 0,
  analytics: (state: WishlistStore) => state.getAnalytics(),
};

export const uiSelectors = {
  unreadNotifications: (state: UIStore) => state.getUnreadCount(),
  activeFiltersCount: (state: UIStore) => state.getActiveFiltersCount(),
  hasSearchQuery: (state: UIStore) => state.searchQuery.length > 0,
};
