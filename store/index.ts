import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { CartItem, Product, User } from '../types';

// Export Category for use
export enum Category {
  ALL = 'ALL',
  BOOKS = 'BOOKS',
  FOOD = 'FOOD',
  STATIONERY = 'STATIONERY',
}

// Cart Store
interface CartStore {
  items: CartItem[];
  isOpen: boolean;
  addItem: (product: Product) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, delta: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  setCartOpen: (open: boolean) => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getShippingFee: () => number;
}

export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        isOpen: false,
        
        addItem: (product: Product) => {
          set((state) => {
            const existing = state.items.find((item) => item.id === product.id);
            if (existing) {
              return {
                items: state.items.map((item) =>
                  item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                ),
              };
            }
            return { items: [...state.items, { ...product, quantity: 1 }] };
          });
        },
        
        removeItem: (productId: number) => {
          set((state) => ({
            items: state.items.filter((item) => item.id !== productId),
          }));
        },
        
        updateQuantity: (productId: number, delta: number) => {
          set((state) => ({
            items: state.items
              .map((item) => {
                if (item.id === productId) {
                  const newQty = Math.max(0, item.quantity + delta);
                  return { ...item, quantity: newQty };
                }
                return item;
              })
              .filter((item) => item.quantity > 0),
          }));
        },
        
        clearCart: () => set({ items: [] }),
        
        toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),
        
        setCartOpen: (open: boolean) => set({ isOpen: open }),
        
        getTotalItems: () => {
          return get().items.reduce((acc, item) => acc + item.quantity, 0);
        },
        
        getTotalPrice: () => {
          return get().items.reduce((acc, item) => acc + item.price * item.quantity, 0);
        },
        
        getShippingFee: () => {
          const subtotal = get().getTotalPrice();
          return subtotal > 0 && subtotal < 1499 ? 50 : 0;
        },
      }),
      {
        name: 'cart-storage',
        partialize: (state) => ({ items: state.items }),
      }
    ),
    { name: 'cart' }
  )
);

// User Store
interface UserStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        
        setUser: (user: User | null) => 
          set({ user, isAuthenticated: !!user }),
        
        setLoading: (isLoading: boolean) => set({ isLoading }),
        
        logout: () => set({ user: null, isAuthenticated: false }),
      }),
      {
        name: 'user-storage',
        partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      }
    ),
    { name: 'user' }
  )
);

// Wishlist Store
interface WishlistStore {
  items: number[];
  addItem: (productId: number) => void;
  removeItem: (productId: number) => void;
  toggleItem: (productId: number) => void;
  clearWishlist: () => void;
  isInWishlist: (productId: number) => boolean;
}

export const useWishlistStore = create<WishlistStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        
        addItem: (productId: number) => {
          set((state) => ({
            items: state.items.includes(productId) 
              ? state.items 
              : [...state.items, productId]
          }));
        },
        
        removeItem: (productId: number) => {
          set((state) => ({
            items: state.items.filter((id) => id !== productId),
          }));
        },
        
        toggleItem: (productId: number) => {
          const { isInWishlist, addItem, removeItem } = get();
          if (isInWishlist(productId)) {
            removeItem(productId);
          } else {
            addItem(productId);
          }
        },
        
        clearWishlist: () => set({ items: [] }),
        
        isInWishlist: (productId: number) => {
          return get().items.includes(productId);
        },
      }),
      {
        name: 'wishlist-storage',
      }
    ),
    { name: 'wishlist' }
  )
);

// UI Store
interface UIStore {
  theme: 'light' | 'dark';
  language: 'en' | 'ta' | 'hi';
  sidebarOpen: boolean;
  searchQuery: string;
  selectedCategory: Category;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (language: 'en' | 'ta' | 'hi') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (category: Category) => void;
}

export const useUIStore = create<UIStore>()(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        language: 'en',
        sidebarOpen: false,
        searchQuery: '',
        selectedCategory: Category.ALL,
        
        setTheme: (theme: 'light' | 'dark') => set({ theme }),
        
        setLanguage: (language: 'en' | 'ta' | 'hi') => set({ language }),
        
        toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
        
        setSidebarOpen: (sidebarOpen: boolean) => set({ sidebarOpen }),
        
        setSearchQuery: (searchQuery: string) => set({ searchQuery }),
        
        setSelectedCategory: (selectedCategory: Category) => set({ selectedCategory }),
      }),
      {
        name: 'ui-storage',
        partialize: (state) => ({
          theme: state.theme,
          language: state.language,
        }),
      }
    ),
    { name: 'ui' }
  )
);
