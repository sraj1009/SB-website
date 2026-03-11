// React Query hooks for Cart

import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cartService } from '../services/cart.service';
import { toast } from 'react-toastify';

// Query keys
export const cartKeys = {
  all: ['cart'] as const,
  items: () => [...cartKeys.all, 'items'] as const,
  summary: () => [...cartKeys.all, 'summary'] as const,
};

// Get cart
export function useCart() {
  return useQuery({
    queryKey: cartKeys.items(),
    queryFn: () => cartService.getCart(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
    refetchOnWindowFocus: false,
  });
}

// Get cart summary
export function useCartSummary() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: cartKeys.summary(),
    queryFn: () => cartService.getCartSummary(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 1,
    refetchOnWindowFocus: false,
    initialData: () => cartService.getCartSummary(),
  });
}

// Add to cart mutation
export function useAddToCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartService.addToCart(productId, quantity),
    onMutate: async ({ productId, quantity }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: cartKeys.all });

      // Snapshot the previous value
      const previousCart = queryClient.getQueryData(cartKeys.items());

      // Optimistically update the cart
      const currentCart = cartService.getCartFromStorage();
      if (currentCart) {
        cartService.addItemLocally({ id: productId }, quantity);
        queryClient.setQueryData(cartKeys.items(), currentCart);
        queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
      }

      return { previousCart };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.items(), context.previousCart);
        queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
      }

      const message = err.message || 'Failed to add item to cart';
      toast.error(message);
    },
    onSuccess: (data, variables) => {
      // Update cache with server response
      queryClient.setQueryData(cartKeys.items(), data);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());

      const productName = variables.productId; // You might want to pass the product name
      toast.success(`${productName} added to cart! 🛒`);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Update quantity mutation
export function useUpdateQuantity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartService.updateQuantity(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all });

      const previousCart = queryClient.getQueryData(cartKeys.items());
      const currentCart = cartService.getCartFromStorage();

      if (currentCart) {
        // Find the product ID for optimistic update
        const item = currentCart.items.find((item) => item.id === itemId);
        if (item) {
          cartService.updateItemQuantityLocally(item.product.id, quantity);
          queryClient.setQueryData(cartKeys.items(), currentCart);
          queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
        }
      }

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.items(), context.previousCart);
        queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
      }

      const message = err.message || 'Failed to update cart';
      toast.error(message);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.items(), data);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());

      if (data) {
        const itemCount = data.itemCount;
        toast.success('Cart updated successfully!');
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Remove from cart mutation
export function useRemoveFromCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: string) => cartService.removeFromCart(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: cartKeys.all });

      const previousCart = queryClient.getQueryData(cartKeys.items());
      const currentCart = cartService.getCartFromStorage();

      if (currentCart) {
        // Find the product ID for optimistic update
        const item = currentCart.items.find((item) => item.id === itemId);
        if (item) {
          cartService.removeItemLocally(item.product.id);
          queryClient.setQueryData(cartKeys.items(), currentCart);
          queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
        }
      }

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(cartKeys.items(), context.previousCart);
        queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
      }

      const message = err.message || 'Failed to remove item from cart';
      toast.error(message);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.items(), data);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());

      toast.success('Item removed from cart');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Clear cart mutation
export function useClearCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.clearCart(),
    onSuccess: () => {
      queryClient.setQueryData(cartKeys.items(), null);
      queryClient.setQueryData(cartKeys.summary(), null);

      toast.success('Cart cleared successfully');
    },
    onError: (err) => {
      const message = err.message || 'Failed to clear cart';
      toast.error(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Apply coupon mutation
export function useApplyCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (couponCode: string) => cartService.applyCoupon(couponCode),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.items(), data);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());

      if (data?.coupon) {
        toast.success(`Coupon "${data.coupon.code}" applied successfully! 🎉`);
      }
    },
    onError: (err) => {
      const message = err.message || 'Failed to apply coupon';
      toast.error(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Remove coupon mutation
export function useRemoveCoupon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.removeCoupon(),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.items(), data);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());

      toast.success('Coupon removed');
    },
    onError: (err) => {
      const message = err.message || 'Failed to remove coupon';
      toast.error(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Sync cart with backend mutation
export function useSyncCart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => cartService.syncCartWithBackend(),
    onSuccess: (data) => {
      queryClient.setQueryData(cartKeys.items(), data);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());

      // Only show toast if there were changes
      const localCart = cartService.getCartFromStorage();
      if (localCart && data && JSON.stringify(localCart) !== JSON.stringify(data)) {
        toast.success('Cart synchronized successfully');
      }
    },
    onError: (err) => {
      const message = err.message || 'Failed to sync cart';
      toast.error(message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: cartKeys.all });
    },
  });
}

// Custom hook for cart management
export function useCartManager() {
  const queryClient = useQueryClient();
  const cart = useCart();
  const cartSummary = useCartSummary();

  const addToCart = useAddToCart();
  const updateQuantity = useUpdateQuantity();
  const removeFromCart = useRemoveFromCart();
  const clearCart = useClearCart();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const syncCart = useSyncCart();

  // Check if cart needs sync
  const needsSync = cartService.needsSync();

  // Auto-sync if needed
  React.useEffect(() => {
    if (needsSync && !cart.isLoading && !syncCart.isPending) {
      syncCart.mutate();
    }
  }, [needsSync, cart.isLoading, syncCart.isPending]);

  // Optimistic helpers
  const addProduct = React.useCallback(
    (productId: string, quantity: number = 1) => {
      addToCart.mutate({ productId, quantity });
    },
    [addToCart]
  );

  const updateItemQuantity = React.useCallback(
    (itemId: string, quantity: number) => {
      if (quantity === 0) {
        removeFromCart.mutate(itemId);
      } else {
        updateQuantity.mutate({ itemId, quantity });
      }
    },
    [updateQuantity, removeFromCart]
  );

  const removeItem = React.useCallback(
    (itemId: string) => {
      removeFromCart.mutate(itemId);
    },
    [removeFromCart]
  );

  const clearAllItems = React.useCallback(() => {
    if (window.confirm('Are you sure you want to clear your entire cart?')) {
      clearCart.mutate();
    }
  }, [clearCart]);

  const applyCouponCode = React.useCallback(
    (couponCode: string) => {
      if (!couponCode.trim()) {
        toast.error('Please enter a coupon code');
        return;
      }
      applyCoupon.mutate(couponCode.trim());
    },
    [applyCoupon]
  );

  const removeAppliedCoupon = React.useCallback(() => {
    removeCoupon.mutate();
  }, [removeCoupon]);

  return {
    // Data
    cart: cart.data,
    summary: cartSummary.data,

    // Loading states
    isLoading: cart.isLoading,
    isAdding: addToCart.isPending,
    isUpdating: updateQuantity.isPending,
    isRemoving: removeFromCart.isPending,
    isClearing: clearCart.isPending,
    isApplyingCoupon: applyCoupon.isPending,
    isRemovingCoupon: removeCoupon.isPending,
    isSyncing: syncCart.isPending,

    // Error states
    error: cart.error,
    addError: addToCart.error,
    updateError: updateQuantity.error,
    removeError: removeFromCart.error,
    clearError: clearCart.error,
    couponError: applyCoupon.error || removeCoupon.error,

    // Actions
    addProduct,
    updateItemQuantity,
    removeItem,
    clearAllItems,
    applyCouponCode,
    removeAppliedCoupon,

    // Utilities
    itemCount: cartSummary.data?.itemCount || 0,
    totalAmount: cartSummary.data?.totalAmount || 0,
    subtotal: cartSummary.data?.subtotal || 0,
    tax: cartSummary.data?.tax || 0,
    shipping: cartSummary.data?.shipping || 0,
    discount: cartSummary.data?.discount || 0,
    coupon: cartSummary.data?.coupon,
    freeShippingEligible: cartSummary.data?.freeShippingEligible || false,
    estimatedDelivery: cartSummary.data?.estimatedDelivery,

    // Refetch
    refetch: cart.refetch,
  };
}

// Custom hook for cart item count
export function useCartItemCount() {
  const cartSummary = useCartSummary();

  return {
    itemCount: cartSummary.data?.itemCount || 0,
    isLoading: cartSummary.isLoading,
  };
}

// Custom hook for cart total
export function useCartTotal() {
  const cartSummary = useCartSummary();

  return {
    total: cartSummary.data?.totalAmount || 0,
    subtotal: cartSummary.data?.subtotal || 0,
    tax: cartSummary.data?.tax || 0,
    shipping: cartSummary.data?.shipping || 0,
    discount: cartSummary.data?.discount || 0,
    isLoading: cartSummary.isLoading,
  };
}

// Custom hook for cart validation
export function useCartValidation() {
  const cart = useCart();

  const isValid = React.useMemo(() => {
    if (!cart.data) return false;

    return (
      cart.data.items.length > 0 &&
      cart.data.items.every((item) => item.quantity > 0 && item.product.stock >= item.quantity)
    );
  }, [cart.data]);

  const validationErrors = React.useMemo(() => {
    const errors: string[] = [];

    if (!cart.data) return errors;

    cart.data.items.forEach((item, index) => {
      if (item.quantity <= 0) {
        errors.push(`Item ${index + 1}: Invalid quantity`);
      }
      if (item.product.stock < item.quantity) {
        errors.push(`Item ${index + 1}: Insufficient stock`);
      }
    });

    return errors;
  }, [cart.data]);

  return {
    isValid,
    validationErrors,
    hasErrors: validationErrors.length > 0,
  };
}

// Custom hook for cart persistence
export function useCartPersistence() {
  const queryClient = useQueryClient();

  // Listen for cart changes in other tabs
  React.useEffect(() => {
    const unsubscribe = cartService.onCartChange((cart) => {
      queryClient.setQueryData(cartKeys.items(), cart);
      queryClient.setQueryData(cartKeys.summary(), cartService.getCartSummary());
    });

    return unsubscribe;
  }, [queryClient]);

  // Save cart on unmount
  React.useEffect(() => {
    return () => {
      const cart = queryClient.getQueryData(cartKeys.items());
      if (cart) {
        cartService.saveCartToStorage(cart);
      }
    };
  }, [queryClient]);
}
