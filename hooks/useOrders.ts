// React Query hooks for Orders

import React from 'react';
import { useMutation, useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { orderService } from '../services/order.service';
import { CreateOrderRequest, OrderFilters, OrderStatusUpdate } from '../types/api';
import { toast } from 'react-toastify';

// Query keys
export const orderKeys = {
  all: ['orders'] as const,
  lists: () => [...orderKeys.all, 'list'] as const,
  list: (filters: OrderFilters) => [...orderKeys.lists(), { filters }] as const,
  details: () => [...orderKeys.all, 'detail'] as const,
  detail: (id: string) => [...orderKeys.details(), id] as const,
  tracking: (id: string) => [...orderKeys.detail(id), 'tracking'] as const,
  payment: (id: string) => [...orderKeys.detail(id), 'payment'] as const,
  analytics: () => [...orderKeys.all, 'analytics'] as const,
  stats: () => [...orderKeys.all, 'stats'] as const,
  invoices: (id: string) => [...orderKeys.detail(id), 'invoices'] as const,
};

// Get orders with filters
export function useOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => orderService.getOrders(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Get infinite orders
export function useInfiniteOrders(filters: OrderFilters = {}) {
  return useInfiniteQuery({
    queryKey: orderKeys.list(filters),
    queryFn: ({ pageParam = 1 }) => orderService.getOrders({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });
}

// Get single order by ID
export function useOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => orderService.getOrderById(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Create order mutation
export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderData: CreateOrderRequest) => orderService.createOrder(orderData),
    onSuccess: (data) => {
      toast.success(`Order ${orderService.formatOrderId(data.orderId)} created successfully! 🎉`);

      // Invalidate cart and orders queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });

      return data;
    },
    onError: (error) => {
      const message = error.message || 'Failed to create order';
      toast.error(message);
    },
  });
}

// Cancel order mutation
export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason?: string }) =>
      orderService.cancelOrder(orderId, reason),
    onSuccess: (data, variables) => {
      toast.success(`Order ${orderService.formatOrderId(variables.orderId)} cancelled`);

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to cancel order';
      toast.error(message);
    },
  });
}

// Upload payment receipt mutation
export function useUploadPaymentReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, file }: { orderId: string; file: File }) =>
      orderService.uploadPaymentReceipt(orderId, file),
    onSuccess: (data, variables) => {
      toast.success('Payment receipt uploaded successfully! 📄');

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to upload receipt';
      toast.error(message);
    },
  });
}

// Track order
export function useTrackOrder(id: string) {
  return useQuery({
    queryKey: orderKeys.tracking(id),
    queryFn: () => orderService.trackOrder(id),
    enabled: !!id,
    staleTime: 60 * 1000, // 1 minute
    retry: 2,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// Update order status (admin only)
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ orderId, statusUpdate }: { orderId: string; statusUpdate: OrderStatusUpdate }) =>
      orderService.updateOrderStatus(orderId, statusUpdate),
    onSuccess: (data, variables) => {
      toast.success(`Order status updated to ${variables.statusUpdate.status}`);

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update order status';
      toast.error(message);
    },
  });
}

// Verify order (admin only)
export function useVerifyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.verifyOrder(orderId),
    onSuccess: (data, variables) => {
      toast.success(`Order ${orderService.formatOrderId(variables.orderId)} verified ✅`);

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to verify order';
      toast.error(message);
    },
  });
}

// Process refund (admin only)
export function useProcessRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      amount,
      reason,
    }: {
      orderId: string;
      amount: number;
      reason: string;
    }) => orderService.processRefund(orderId, amount, reason),
    onSuccess: (data, variables) => {
      toast.success(`Refund of ₹${variables.amount} processed successfully`);

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: orderKeys.detail(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
    },
    onError: (error) => {
      const message = error.message || 'Failed to process refund';
      toast.error(message);
    },
  });
}

// Get payment session
export function usePaymentSession(orderId: string) {
  return useQuery({
    queryKey: orderKeys.payment(orderId),
    queryFn: () => orderService.getPaymentSession(orderId),
    enabled: !!orderId,
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
  });
}

// Create payment session
export function useCreatePaymentSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => orderService.createPaymentSession(orderId),
    onSuccess: (data, variables) => {
      // Payment session created, redirect to payment URL
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      }
    },
    onError: (error) => {
      const message = error.message || 'Failed to create payment session';
      toast.error(message);
    },
  });
}

// Get order statistics
export function useOrderStats(
  filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  } = {}
) {
  return useQuery({
    queryKey: orderKeys.stats(),
    queryFn: () => orderService.getOrderStats(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get order analytics
export function useOrderAnalytics() {
  return useQuery({
    queryKey: orderKeys.analytics(),
    queryFn: () => orderService.getOrderAnalytics(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Export orders
export function useExportOrders() {
  return useMutation({
    mutationFn: (filters: OrderFilters & { format: 'csv' | 'excel' | 'pdf' }) =>
      orderService.exportOrders(filters),
    onSuccess: (data) => {
      toast.success('Orders exported successfully! Download will start shortly.');

      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onError: (error) => {
      const message = error.message || 'Failed to export orders';
      toast.error(message);
    },
  });
}

// Get order invoices
export function useOrderInvoices(orderId: string) {
  return useQuery({
    queryKey: orderKeys.invoices(orderId),
    queryFn: () => orderService.getOrderInvoices(orderId),
    enabled: !!orderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Download invoice
export function useDownloadInvoice() {
  return useMutation({
    mutationFn: ({ orderId, invoiceId }: { orderId: string; invoiceId: string }) =>
      orderService.downloadInvoice(orderId, invoiceId),
    onSuccess: () => {
      toast.success('Invoice downloaded successfully! 📄');
    },
    onError: (error) => {
      const message = error.message || 'Failed to download invoice';
      toast.error(message);
    },
  });
}

// Custom hook for order management
export function useOrderManager() {
  const queryClient = useQueryClient();

  const createOrder = useCreateOrder();
  const cancelOrder = useCancelOrder();
  const uploadReceipt = useUploadPaymentReceipt();
  const updateStatus = useUpdateOrderStatus();
  const verifyOrder = useVerifyOrder();
  const processRefund = useProcessRefund();
  const createPaymentSession = useCreatePaymentSession();

  return {
    // Mutations
    createOrder: createOrder.mutateAsync,
    cancelOrder: cancelOrder.mutateAsync,
    uploadReceipt: uploadReceipt.mutateAsync,
    updateStatus: updateStatus.mutateAsync,
    verifyOrder: verifyOrder.mutateAsync,
    processRefund: processRefund.mutateAsync,
    createPaymentSession: createPaymentSession.mutateAsync,

    // Loading states
    isCreating: createOrder.isPending,
    isCancelling: cancelOrder.isPending,
    isUploading: uploadReceipt.isPending,
    isUpdating: updateStatus.isPending,
    isVerifying: verifyOrder.isPending,
    isRefunding: processRefund.isPending,
    isCreatingPayment: createPaymentSession.isPending,

    // Error states
    createError: createOrder.error,
    cancelError: cancelOrder.error,
    uploadError: uploadReceipt.error,
    updateError: updateStatus.error,
    verifyError: verifyOrder.error,
    refundError: processRefund.error,
    paymentError: createPaymentSession.error,
  };
}

// Custom hook for order filters
export function useOrderFilters(initialFilters: OrderFilters = {}) {
  const [filters, setFilters] = React.useState<OrderFilters>(initialFilters);

  const updateFilter = React.useCallback((key: keyof OrderFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters({});
  }, []);

  const resetFilters = React.useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    resetFilters,
  };
}

// Custom hook for order actions
export function useOrderActions(orderId: string) {
  const queryClient = useQueryClient();
  const order = useOrder(orderId);

  const cancelOrder = useCancelOrder();
  const uploadReceipt = useUploadPaymentReceipt();
  const trackOrder = useTrackOrder(orderId);

  const canCancel = order.data ? orderService.canCancelOrder(order.data) : false;
  const canReturn = order.data ? orderService.canReturnOrder(order.data) : false;

  const handleCancel = React.useCallback(
    (reason?: string) => {
      if (window.confirm('Are you sure you want to cancel this order?')) {
        cancelOrder.mutate({ orderId, reason });
      }
    },
    [orderId, cancelOrder]
  );

  const handleUploadReceipt = React.useCallback(
    (file: File) => {
      uploadReceipt.mutate({ orderId, file });
    },
    [orderId, uploadReceipt]
  );

  return {
    order: order.data,
    isLoading: order.isLoading,
    canCancel,
    canReturn,
    tracking: trackOrder.data,
    isTracking: trackOrder.isLoading,

    // Actions
    cancel: handleCancel,
    uploadReceipt: handleUploadReceipt,

    // Loading states
    isCancelling: cancelOrder.isPending,
    isUploading: uploadReceipt.isPending,

    // Error states
    cancelError: cancelOrder.error,
    uploadError: uploadReceipt.error,

    // Refetch
    refetch: order.refetch,
  };
}

// Custom hook for order status management
export function useOrderStatusManagement() {
  const queryClient = useQueryClient();

  const updateStatus = useUpdateOrderStatus();
  const verifyOrder = useVerifyOrder();

  const handleStatusUpdate = React.useCallback(
    (orderId: string, status: string, data?: any) => {
      updateStatus.mutate({
        orderId,
        statusUpdate: { status: status as any, ...data },
      });
    },
    [updateStatus]
  );

  const handleVerify = React.useCallback(
    (orderId: string) => {
      verifyOrder.mutate(orderId);
    },
    [verifyOrder]
  );

  return {
    updateStatus: handleStatusUpdate,
    verifyOrder: handleVerify,
    isUpdating: updateStatus.isPending,
    isVerifying: verifyOrder.isPending,
    updateError: updateStatus.error,
    verifyError: verifyOrder.error,
  };
}

// Custom hook for order analytics dashboard
export function useOrderDashboard() {
  const stats = useOrderStats();
  const analytics = useOrderAnalytics();

  return {
    stats: stats.data,
    analytics: analytics.data,
    isLoading: stats.isLoading || analytics.isLoading,
    error: stats.error || analytics.error,
    refetch: () => {
      stats.refetch();
      analytics.refetch();
    },
  };
}

// Custom hook for order search
export function useOrderSearch() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filters, setFilters] = React.useState<OrderFilters>({});

  const debouncedQuery = useDebounce(searchQuery, 300);

  const orders = useOrders({
    ...filters,
    search: debouncedQuery,
  });

  return {
    searchQuery,
    setSearchQuery,
    filters,
    setFilters,
    orders: orders.data,
    isLoading: orders.isLoading,
    error: orders.error,
    refetch: orders.refetch,
  };
}

// Utility hook for debouncing
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Custom hook for order notifications
export function useOrderNotifications() {
  const orders = useOrders({ status: 'pending' });

  // Check for new pending orders and show notification
  React.useEffect(() => {
    if (orders.data?.data && orders.data.data.length > 0) {
      const pendingCount = orders.data.data.length;
      if (pendingCount > 0) {
        // You could implement a notification system here
        console.log(`You have ${pendingCount} pending orders to process`);
      }
    }
  }, [orders.data]);

  return {
    pendingOrders: orders.data?.data || [],
    pendingCount: orders.data?.data?.length || 0,
    isLoading: orders.isLoading,
  };
}
