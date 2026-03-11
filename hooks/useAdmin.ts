// React Query hooks for Admin functionality

import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { adminService } from '../services/admin.service';
import {
  CreateProductRequest,
  UpdateProductRequest,
  OrderStatus,
  AuditFilters,
  ProductFilters,
} from '../types/api';
import { toast } from 'react-toastify';

// Query keys
export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  products: () => [...adminKeys.all, 'products'] as const,
  product: (id: string) => [...adminKeys.products(), id] as const,
  orders: () => [...adminKeys.all, 'orders'] as const,
  order: (id: string) => [...adminKeys.orders(), id] as const,
  users: () => [...adminKeys.all, 'users'] as const,
  user: (id: string) => [...adminKeys.users(), id] as const,
  auditLogs: () => [...adminKeys.all, 'audit-logs'] as const,
  health: () => [...adminKeys.all, 'health'] as const,
  analytics: () => [...adminKeys.all, 'analytics'] as const,
  settings: () => [...adminKeys.all, 'settings'] as const,
  stats: () => [...adminKeys.all, 'stats'] as const,
};

// Get dashboard statistics
export function useDashboardStats() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: () => adminService.getDashboardStats(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Get all products (admin view)
export function useAdminProducts(filters: ProductFilters = {}) {
  return useQuery({
    queryKey: adminKeys.products(),
    queryFn: () => adminService.getAllProducts(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Create product mutation
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (productData: CreateProductRequest) => adminService.createProduct(productData),
    onSuccess: (data) => {
      toast.success(`Product "${data.title}" created successfully! 📚`);

      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to create product';
      toast.error(message);
    },
  });
}

// Update product mutation
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, productData }: { id: string; productData: UpdateProductRequest }) =>
      adminService.updateProduct(id, productData),
    onSuccess: (data, variables) => {
      toast.success(`Product "${data.title}" updated successfully!`);

      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.product(variables.id) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update product';
      toast.error(message);
    },
  });
}

// Delete product mutation
export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminService.deleteProduct(id),
    onSuccess: () => {
      toast.success('Product deleted successfully');

      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to delete product';
      toast.error(message);
    },
  });
}

// Update inventory mutation
export function useUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, stockData }: { productId: string; stockData: any }) =>
      adminService.updateInventory(productId, stockData),
    onSuccess: (data, variables) => {
      toast.success(`Inventory updated for "${data.title}"`);

      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminKeys.product(variables.productId) });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update inventory';
      toast.error(message);
    },
  });
}

// Bulk update inventory mutation
export function useBulkUpdateInventory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: Array<{ productId: string; stock: number; lowStockThreshold?: number }>
    ) => adminService.bulkUpdateInventory(updates),
    onSuccess: (data) => {
      toast.success(`Bulk inventory update completed for ${data.length} products! 📦`);

      // Invalidate products queries
      queryClient.invalidateQueries({ queryKey: adminKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to bulk update inventory';
      toast.error(message);
    },
  });
}

// Get all orders (admin view)
export function useAdminOrders(
  filters: {
    status?: OrderStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  return useQuery({
    queryKey: adminKeys.orders(),
    queryFn: () => adminService.getAllOrders(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: 2,
  });
}

// Verify order mutation
export function useVerifyOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => adminService.verifyOrder(orderId),
    onSuccess: (data, variables) => {
      toast.success(`Order ${adminService.formatOrderId(variables.orderId)} verified ✅`);

      // Invalidate orders queries
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.order(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to verify order';
      toast.error(message);
    },
  });
}

// Update order status mutation
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orderId,
      status,
      data,
    }: {
      orderId: string;
      status: OrderStatus;
      data?: { trackingNumber?: string; notes?: string; estimatedDelivery?: string };
    }) => adminService.updateOrderStatus(orderId, status, data),
    onSuccess: (data, variables) => {
      toast.success(`Order status updated to ${variables.status}`);

      // Invalidate orders queries
      queryClient.invalidateQueries({ queryKey: adminKeys.orders() });
      queryClient.invalidateQueries({ queryKey: adminKeys.order(variables.orderId) });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update order status';
      toast.error(message);
    },
  });
}

// Get all users
export function useAdminUsers(
  filters: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'banned' | 'suspended';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}
) {
  return useQuery({
    queryKey: adminKeys.users(),
    queryFn: () => adminService.getAllUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Update user status mutation
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: 'active' | 'banned' | 'suspended';
      reason?: string;
    }) => adminService.updateUserStatus(userId, status, reason),
    onSuccess: (data, variables) => {
      toast.success(`User status updated to ${variables.status}`);

      // Invalidate users queries
      queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminKeys.user(variables.userId) });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update user status';
      toast.error(message);
    },
  });
}

// Get audit logs
export function useAuditLogs(filters: AuditFilters = {}) {
  return useQuery({
    queryKey: adminKeys.auditLogs(),
    queryFn: () => adminService.getAuditLogs(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get system health
export function useSystemHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: () => adminService.getSystemHealth(),
    staleTime: 30 * 1000, // 30 seconds
    retry: 2,
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Get analytics data
export function useAdminAnalytics(
  filters: {
    startDate?: string;
    endDate?: string;
    type?: 'revenue' | 'orders' | 'users' | 'products';
  } = {}
) {
  return useQuery({
    queryKey: adminKeys.analytics(),
    queryFn: () => adminService.getAnalytics(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}

// Get settings
export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings(),
    queryFn: () => adminService.getSettings(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
  });
}

// Update settings mutation
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: any) => adminService.updateSettings(settings),
    onSuccess: () => {
      toast.success('Settings updated successfully! ⚙️');

      // Invalidate settings query
      queryClient.invalidateQueries({ queryKey: adminKeys.settings() });
    },
    onError: (error) => {
      const message = error.message || 'Failed to update settings';
      toast.error(message);
    },
  });
}

// Export data mutation
export function useExportData() {
  return useMutation({
    mutationFn: ({
      type,
      filters,
    }: {
      type: 'orders' | 'products' | 'users' | 'reviews';
      filters?: any;
    }) => adminService.exportData(type, filters),
    onSuccess: (data) => {
      toast.success('Data exported successfully! Download will start shortly.');

      // Trigger download
      const link = document.createElement('a');
      link.href = data.downloadUrl;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    onError: (error) => {
      const message = error.message || 'Failed to export data';
      toast.error(message);
    },
  });
}

// Custom hook for admin dashboard
export function useAdminDashboard() {
  const dashboard = useDashboardStats();
  const health = useSystemHealth();
  const orders = useAdminOrders({ limit: 10 });

  return {
    dashboard: dashboard.data,
    health: health.data,
    recentOrders: orders.data?.data || [],
    isLoading: dashboard.isLoading || health.isLoading || orders.isLoading,
    error: dashboard.error || health.error || orders.error,
    refetch: () => {
      dashboard.refetch();
      health.refetch();
      orders.refetch();
    },
  };
}

// Custom hook for product management
export function useProductManagement() {
  const queryClient = useQueryClient();

  const products = useAdminProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateInventory = useUpdateInventory();
  const bulkUpdateInventory = useBulkUpdateInventory();

  return {
    products: products.data?.data || [],
    pagination: products.data
      ? {
          page: products.data.page,
          limit: products.data.limit,
          total: products.data.total,
          totalPages: products.data.totalPages,
        }
      : null,

    isLoading: products.isLoading,
    error: products.error,

    // Mutations
    createProduct: createProduct.mutateAsync,
    updateProduct: updateProduct.mutateAsync,
    deleteProduct: deleteProduct.mutateAsync,
    updateInventory: updateInventory.mutateAsync,
    bulkUpdateInventory: bulkUpdateInventory.mutateAsync,

    // Loading states
    isCreating: createProduct.isPending,
    isUpdating: updateProduct.isPending,
    isDeleting: deleteProduct.isPending,
    isUpdatingInventory: updateInventory.isPending,
    isBulkUpdating: bulkUpdateInventory.isPending,

    // Error states
    createError: createProduct.error,
    updateError: updateProduct.error,
    deleteError: deleteProduct.error,
    inventoryError: updateInventory.error,
    bulkInventoryError: bulkUpdateInventory.error,

    // Refetch
    refetch: products.refetch,
  };
}

// Custom hook for order management
export function useOrderManagement() {
  const queryClient = useQueryClient();

  const orders = useAdminOrders();
  const verifyOrder = useVerifyOrder();
  const updateStatus = useUpdateOrderStatus();

  return {
    orders: orders.data?.data || [],
    pagination: orders.data
      ? {
          page: orders.data.page,
          limit: orders.data.limit,
          total: orders.data.total,
          totalPages: orders.data.totalPages,
        }
      : null,

    isLoading: orders.isLoading,
    error: orders.error,

    // Mutations
    verifyOrder: verifyOrder.mutateAsync,
    updateStatus: updateStatus.mutateAsync,

    // Loading states
    isVerifying: verifyOrder.isPending,
    isUpdating: updateStatus.isPending,

    // Error states
    verifyError: verifyOrder.error,
    updateError: updateStatus.error,

    // Refetch
    refetch: orders.refetch,
  };
}

// Custom hook for user management
export function useUserManagement() {
  const queryClient = useQueryClient();

  const users = useAdminUsers();
  const updateStatus = useUpdateUserStatus();

  return {
    users: users.data?.data || [],
    pagination: users.data
      ? {
          page: users.data.page,
          limit: users.data.limit,
          total: users.data.total,
          totalPages: users.data.totalPages,
        }
      : null,

    isLoading: users.isLoading,
    error: users.error,

    // Mutations
    updateStatus: updateStatus.mutateAsync,

    // Loading states
    isUpdating: updateStatus.isPending,

    // Error states
    updateError: updateStatus.error,

    // Refetch
    refetch: users.refetch,
  };
}

// Custom hook for analytics dashboard
export function useAnalyticsDashboard() {
  const analytics = useAdminAnalytics();
  const stats = useOrderStats();

  return {
    analytics: analytics.data,
    stats: stats.data,
    isLoading: analytics.isLoading || stats.isLoading,
    error: analytics.error || stats.error,
    refetch: () => {
      analytics.refetch();
      stats.refetch();
    },
  };
}

// Custom hook for system monitoring
export function useSystemMonitoring() {
  const health = useSystemHealth();

  const systemStatus = React.useMemo(() => {
    if (!health.data) return null;

    const { status, services, metrics } = health.data;

    return {
      overall: status,
      database: services.database.status,
      redis: services.redis.status,
      storage: services.storage.status,
      uptime: metrics.uptime,
      memoryUsage: metrics.memoryUsage,
      cpuUsage: metrics.cpuUsage,
      activeConnections: metrics.activeConnections,
    };
  }, [health.data]);

  return {
    systemStatus,
    health: health.data,
    isLoading: health.isLoading,
    error: health.error,
    refetch: health.refetch,
  };
}

// Custom hook for admin settings
export function useAdminSettingsManager() {
  const settings = useAdminSettings();
  const updateSettings = useUpdateSettings();

  return {
    settings: settings.data,
    isLoading: settings.isLoading,
    error: settings.error,
    updateSettings: updateSettings.mutateAsync,
    isUpdating: updateSettings.isPending,
    updateError: updateSettings.error,
    refetch: settings.refetch,
  };
}

// Custom hook for data export
export function useDataExport() {
  const exportData = useExportData();

  return {
    exportData: exportData.mutateAsync,
    isExporting: exportData.isPending,
    exportError: exportData.error,
  };
}

// Custom hook for audit trail
export function useAuditTrail(filters: AuditFilters = {}) {
  const auditLogs = useAuditLogs(filters);

  return {
    logs: auditLogs.data?.data || [],
    pagination: auditLogs.data
      ? {
          page: auditLogs.data.page,
          limit: auditLogs.data.limit,
          total: auditLogs.data.total,
          totalPages: auditLogs.data.totalPages,
        }
      : null,
    isLoading: auditLogs.isLoading,
    error: auditLogs.error,
    refetch: auditLogs.refetch,
  };
}

// Custom hook for quick stats
export function useQuickStats() {
  const dashboard = useDashboardStats();

  const quickStats = React.useMemo(() => {
    if (!dashboard.data) return null;

    return {
      totalOrders: dashboard.data.totalOrders,
      totalRevenue: dashboard.data.totalRevenue,
      totalUsers: dashboard.data.totalUsers,
      totalProducts: dashboard.data.totalProducts,
      lowStockAlerts: dashboard.data.lowStockAlerts,
      pendingVerifications: dashboard.data.pendingVerifications,
    };
  }, [dashboard.data]);

  return {
    stats: quickStats,
    isLoading: dashboard.isLoading,
    error: dashboard.error,
  };
}
