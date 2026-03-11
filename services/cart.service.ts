// Cart Service for SINGGLEBEE Frontend

import apiClient from './api-client';
import {
  ApiResponse,
  CartResponse,
  CartItem,
  AddToCartRequest,
  UpdateCartRequest,
  Coupon,
} from '../types/api';
import { NotFoundError, ValidationError, ErrorHandler, createError } from '../utils/error-handler';

class CartService {
  private static instance: CartService;
  private readonly CART_STORAGE_KEY = 'singglebee_cart';
  private readonly CART_SYNC_KEY = 'singglebee_cart_sync';

  static getInstance(): CartService {
    if (!CartService.instance) {
      CartService.instance = new CartService();
    }
    return CartService.instance;
  }

  // Get cart from API
  async getCart(): Promise<CartResponse> {
    try {
      const response = await apiClient.get<CartResponse>('/cart');

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch cart',
          response.error?.code || 'CART_FETCH_FAILED',
          500
        );
      }

      // Sync with localStorage
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      // If API fails, return cart from localStorage
      const localCart = this.getCartFromStorage();
      if (localCart) {
        return localCart;
      }
      throw ErrorHandler.handleApiError(error, 'getCart');
    }
  }

  // Add item to cart
  async addToCart(productId: string, quantity: number): Promise<CartResponse> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      if (quantity < 1) {
        throw new ValidationError('Quantity must be at least 1');
      }

      const request: AddToCartRequest = {
        productId,
        quantity,
      };

      const response = await apiClient.post<CartResponse>('/cart/add', request);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to add item to cart',
          response.error?.code || 'CART_ADD_FAILED',
          400
        );
      }

      // Sync with localStorage
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'addToCart');
    }
  }

  // Update item quantity
  async updateQuantity(itemId: string, quantity: number): Promise<CartResponse> {
    try {
      if (!itemId) {
        throw new ValidationError('Item ID is required');
      }

      if (quantity < 0) {
        throw new ValidationError('Quantity cannot be negative');
      }

      const request: UpdateCartRequest = {
        quantity,
      };

      const response = await apiClient.patch<CartResponse>(`/cart/items/${itemId}`, request);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update cart item',
          response.error?.code || 'CART_UPDATE_FAILED',
          400
        );
      }

      // Sync with localStorage
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateQuantity');
    }
  }

  // Remove item from cart
  async removeFromCart(itemId: string): Promise<CartResponse> {
    try {
      if (!itemId) {
        throw new ValidationError('Item ID is required');
      }

      const response = await apiClient.delete<CartResponse>(`/cart/items/${itemId}`);

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to remove item from cart',
          response.error?.code || 'CART_REMOVE_FAILED',
          400
        );
      }

      // Sync with localStorage
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'removeFromCart');
    }
  }

  // Clear entire cart
  async clearCart(): Promise<void> {
    try {
      const response = await apiClient.delete('/cart');

      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to clear cart',
          response.error?.code || 'CART_CLEAR_FAILED',
          500
        );
      }

      // Clear localStorage
      this.clearCartStorage();
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'clearCart');
    }
  }

  // Apply coupon code
  async applyCoupon(couponCode: string): Promise<CartResponse> {
    try {
      if (!couponCode || couponCode.trim().length === 0) {
        throw new ValidationError('Coupon code is required');
      }

      const response = await apiClient.post<CartResponse>('/cart/coupon', {
        couponCode: couponCode.trim().toUpperCase(),
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to apply coupon',
          response.error?.code || 'COUPON_APPLY_FAILED',
          400
        );
      }

      // Sync with localStorage
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'applyCoupon');
    }
  }

  // Remove coupon
  async removeCoupon(): Promise<CartResponse> {
    try {
      const response = await apiClient.delete<CartResponse>('/cart/coupon');

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to remove coupon',
          response.error?.code || 'COUPON_REMOVE_FAILED',
          400
        );
      }

      // Sync with localStorage
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'removeCoupon');
    }
  }

  // Sync cart with backend (merge localStorage with API)
  async syncCartWithBackend(): Promise<CartResponse> {
    try {
      const localCart = this.getCartFromStorage();

      if (!localCart || localCart.items.length === 0) {
        // No local cart to sync, just get from API
        return this.getCart();
      }

      // Send local cart to backend for merging
      const response = await apiClient.post<CartResponse>('/cart/sync', {
        items: localCart.items.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      });

      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to sync cart',
          response.error?.code || 'CART_SYNC_FAILED',
          500
        );
      }

      // Update localStorage with synced cart
      this.saveCartToStorage(response.data);

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'syncCartWithBackend');
    }
  }

  // Get cart item count
  getItemCount(): number {
    const cart = this.getCartFromStorage();
    return cart ? cart.itemCount : 0;
  }

  // Get cart total amount
  getTotalAmount(): number {
    const cart = this.getCartFromStorage();
    return cart ? cart.totalAmount : 0;
  }

  // Check if product is in cart
  isProductInCart(productId: string): boolean {
    const cart = this.getCartFromStorage();
    if (!cart) return false;

    return cart.items.some((item) => item.product.id === productId);
  }

  // Get item quantity for product
  getItemQuantity(productId: string): number {
    const cart = this.getCartFromStorage();
    if (!cart) return 0;

    const item = cart.items.find((item) => item.product.id === productId);
    return item ? item.quantity : 0;
  }

  // Update cart item quantity locally (optimistic update)
  updateItemQuantityLocally(productId: string, quantity: number): void {
    const cart = this.getCartFromStorage();
    if (!cart) return;

    const itemIndex = cart.items.findIndex((item) => item.product.id === productId);

    if (itemIndex === -1) return;

    if (quantity === 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].subtotal = cart.items[itemIndex].product.price * quantity;
    }

    // Recalculate totals
    this.recalculateCartTotals(cart);

    // Save to storage
    this.saveCartToStorage(cart);
  }

  // Remove item locally (optimistic update)
  removeItemLocally(productId: string): void {
    const cart = this.getCartFromStorage();
    if (!cart) return;

    cart.items = cart.items.filter((item) => item.product.id !== productId);

    // Recalculate totals
    this.recalculateCartTotals(cart);

    // Save to storage
    this.saveCartToStorage(cart);
  }

  // Add item locally (optimistic update)
  addItemLocally(product: any, quantity: number): void {
    const cart = this.getCartFromStorage() || {
      items: [],
      itemCount: 0,
      totalAmount: 0,
      subtotal: 0,
      tax: 0,
      shipping: 0,
      discount: 0,
    };

    const existingItemIndex = cart.items.findIndex((item) => item.product.id === product.id);

    if (existingItemIndex !== -1) {
      // Update existing item
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].subtotal =
        cart.items[existingItemIndex].product.price * cart.items[existingItemIndex].quantity;
    } else {
      // Add new item
      cart.items.push({
        id: `temp_${Date.now()}`,
        product: {
          id: product.id,
          title: product.title,
          author: product.author,
          price: product.price,
          image: product.image,
          stock: product.stock,
          format: product.format,
        },
        quantity,
        subtotal: product.price * quantity,
        addedAt: new Date().toISOString(),
      });
    }

    // Recalculate totals
    this.recalculateCartTotals(cart);

    // Save to storage
    this.saveCartToStorage(cart);
  }

  // Validate cart data
  validateCart(cart: CartResponse): void {
    const errors: string[] = [];

    if (!cart.items || !Array.isArray(cart.items)) {
      errors.push('Cart items must be an array');
    }

    cart.items?.forEach((item, index) => {
      if (!item.product || !item.product.id) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }

      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Quantity must be at least 1`);
      }

      if (!item.product.price || item.product.price < 0) {
        errors.push(`Item ${index + 1}: Product price is invalid`);
      }
    });

    if (cart.totalAmount < 0) {
      errors.push('Total amount cannot be negative');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Get estimated delivery time
  getEstimatedDelivery(): string {
    const cart = this.getCartFromStorage();
    if (!cart || cart.items.length === 0) {
      return '';
    }

    // Simple logic: 3-5 business days for standard delivery
    const today = new Date();
    const deliveryDate = new Date(today);
    deliveryDate.setDate(today.getDate() + 5);

    return deliveryDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  // Check if cart is eligible for free shipping
  isEligibleForFreeShipping(): boolean {
    const cart = this.getCartFromStorage();
    if (!cart) return false;

    const FREE_SHIPPING_THRESHOLD = 500; // ₹500
    return cart.subtotal >= FREE_SHIPPING_THRESHOLD;
  }

  // Get shipping cost
  getShippingCost(): number {
    if (this.isEligibleForFreeShipping()) {
      return 0;
    }

    const cart = this.getCartFromStorage();
    if (!cart || cart.items.length === 0) {
      return 0;
    }

    // Simple shipping logic: ₹50 for orders below ₹500
    return 50;
  }

  // Calculate estimated tax
  calculateTax(subtotal: number): number {
    // 18% GST for books (simplified)
    const GST_RATE = 0.18;
    return Math.round(subtotal * GST_RATE);
  }

  // Recalculate cart totals
  private recalculateCartTotals(cart: CartResponse): void {
    cart.subtotal = cart.items.reduce((sum, item) => sum + item.subtotal, 0);
    cart.itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    cart.tax = this.calculateTax(cart.subtotal);
    cart.shipping = this.getShippingCost();
    cart.discount = cart.coupon ? this.calculateDiscount(cart.subtotal, cart.coupon) : 0;
    cart.totalAmount = cart.subtotal + cart.tax + cart.shipping - cart.discount;
  }

  // Calculate discount amount
  private calculateDiscount(subtotal: number, coupon: Coupon): number {
    if (subtotal < coupon.minOrder) {
      return 0;
    }

    let discount = 0;

    switch (coupon.discountType) {
      case 'percentage':
        discount = subtotal * (coupon.discountValue / 100);
        break;
      case 'fixed':
        discount = coupon.discountValue;
        break;
      case 'shipping':
        discount = this.getShippingCost();
        break;
    }

    // Apply max discount limit if specified
    if (coupon.maxDiscount && discount > coupon.maxDiscount) {
      discount = coupon.maxDiscount;
    }

    return Math.min(discount, subtotal);
  }

  // Save cart to localStorage
  private saveCartToStorage(cart: CartResponse): void {
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cart));
      localStorage.setItem(this.CART_SYNC_KEY, new Date().toISOString());
    } catch (error) {
      console.warn('Failed to save cart to localStorage:', error);
    }
  }

  // Get cart from localStorage
  private getCartFromStorage(): CartResponse | null {
    try {
      const cartStr = localStorage.getItem(this.CART_STORAGE_KEY);
      return cartStr ? JSON.parse(cartStr) : null;
    } catch (error) {
      console.warn('Failed to load cart from localStorage:', error);
      return null;
    }
  }

  // Clear cart from localStorage
  private clearCartStorage(): void {
    try {
      localStorage.removeItem(this.CART_STORAGE_KEY);
      localStorage.removeItem(this.CART_SYNC_KEY);
    } catch (error) {
      console.warn('Failed to clear cart from localStorage:', error);
    }
  }

  // Check if cart needs sync with backend
  needsSync(): boolean {
    try {
      const lastSync = localStorage.getItem(this.CART_SYNC_KEY);
      if (!lastSync) return true;

      const syncTime = new Date(lastSync);
      const now = new Date();
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

      return syncTime < fiveMinutesAgo;
    } catch {
      return true;
    }
  }

  // Get cart summary for checkout
  getCartSummary(): {
    itemCount: number;
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    totalAmount: number;
    coupon?: Coupon;
    estimatedDelivery: string;
    freeShippingEligible: boolean;
  } | null {
    const cart = this.getCartFromStorage();
    if (!cart) return null;

    return {
      itemCount: cart.itemCount,
      subtotal: cart.subtotal,
      tax: cart.tax,
      shipping: cart.shipping,
      discount: cart.discount,
      totalAmount: cart.totalAmount,
      coupon: cart.coupon,
      estimatedDelivery: this.getEstimatedDelivery(),
      freeShippingEligible: this.isEligibleForFreeShipping(),
    };
  }

  // Listen for cart changes (multi-tab support)
  onCartChange(callback: (cart: CartResponse | null) => void): () => void {
    // Initial call
    callback(this.getCartFromStorage());

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.CART_STORAGE_KEY) {
        callback(this.getCartFromStorage());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}

// Export singleton instance
export const cartService = CartService.getInstance();

// Export default
export default cartService;
