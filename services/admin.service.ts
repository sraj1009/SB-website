// Admin Service for SINGGLEBEE Frontend

import apiClient from './api-client';
import { 
  ApiResponse, 
  PaginatedResponse, 
  DashboardStats, 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest, 
  Order, 
  OrderStatus,
  AuditLog,
  AuditFilters,
  InventoryUpdateRequest,
  ProductFilters
} from '../types/api';
import { 
  NotFoundError, 
  ValidationError, 
  PermissionError, 
  ErrorHandler,
  createError
} from '../utils/error-handler';

class AdminService {
  private static instance: AdminService;

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // Get dashboard statistics
  async getDashboardStats(): Promise<DashboardStats> {
    try {
      const response = await apiClient.get<DashboardStats>('/admin/dashboard');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch dashboard statistics',
          response.error?.code || 'DASHBOARD_STATS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getDashboardStats');
    }
  }

  // Get all products (admin view)
  async getAllProducts(filters: ProductFilters = {}): Promise<PaginatedResponse<Product>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Product>>('/admin/products', {
        params: this.buildProductQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch products',
          response.error?.code || 'PRODUCTS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getAllProducts');
    }
  }

  // Create new product
  async createProduct(productData: CreateProductRequest): Promise<Product> {
    try {
      this.validateCreateProductRequest(productData);

      const response = await apiClient.post<Product>('/admin/products', productData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to create product',
          response.error?.code || 'PRODUCT_CREATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'createProduct');
    }
  }

  // Update existing product
  async updateProduct(id: string, productData: UpdateProductRequest): Promise<Product> {
    try {
      if (!id) {
        throw new ValidationError('Product ID is required');
      }

      this.validateUpdateProductRequest(productData);

      const response = await apiClient.put<Product>(`/admin/products/${id}`, productData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update product',
          response.error?.code || 'PRODUCT_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateProduct');
    }
  }

  // Delete product
  async deleteProduct(id: string): Promise<void> {
    try {
      if (!id) {
        throw new ValidationError('Product ID is required');
      }

      const response = await apiClient.delete(`/admin/products/${id}`);
      
      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to delete product',
          response.error?.code || 'PRODUCT_DELETE_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'deleteProduct');
    }
  }

  // Update product inventory
  async updateInventory(productId: string, stockData: InventoryUpdateRequest): Promise<Product> {
    try {
      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      this.validateInventoryUpdate(stockData);

      const response = await apiClient.patch<Product>(`/admin/products/${productId}/inventory`, stockData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update inventory',
          response.error?.code || 'INVENTORY_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateInventory');
    }
  }

  // Bulk update inventory
  async bulkUpdateInventory(updates: Array<{
    productId: string;
    stock: number;
    lowStockThreshold?: number;
  }>): Promise<Product[]> {
    try {
      if (!updates || updates.length === 0) {
        throw new ValidationError('Updates array is required');
      }

      // Validate each update
      updates.forEach((update, index) => {
        if (!update.productId) {
          throw new ValidationError(`Product ID is required for update ${index + 1}`);
        }
        if (update.stock < 0) {
          throw new ValidationError(`Stock cannot be negative for update ${index + 1}`);
        }
      });

      const response = await apiClient.post<Product[]>('/admin/products/bulk-inventory', {
        updates
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to bulk update inventory',
          response.error?.code || 'BULK_INVENTORY_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'bulkUpdateInventory');
    }
  }

  // Get all orders (admin view)
  async getAllOrders(filters: {
    status?: OrderStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<Order>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Order>>('/admin/orders', {
        params: this.buildOrderQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch orders',
          response.error?.code || 'ORDERS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getAllOrders');
    }
  }

  // Verify order
  async verifyOrder(orderId: string): Promise<Order> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.post<Order>(`/admin/orders/${orderId}/verify`);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to verify order',
          response.error?.code || 'ORDER_VERIFY_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'verifyOrder');
    }
  }

  // Update order status
  async updateOrderStatus(orderId: string, status: OrderStatus, data?: {
    trackingNumber?: string;
    notes?: string;
    estimatedDelivery?: string;
  }): Promise<Order> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (!status) {
        throw new ValidationError('Order status is required');
      }

      const validStatuses: OrderStatus[] = ['pending', 'verified', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid order status');
      }

      const requestData: any = { status };
      
      if (data?.trackingNumber) requestData.trackingNumber = data.trackingNumber;
      if (data?.notes) requestData.notes = data.notes;
      if (data?.estimatedDelivery) requestData.estimatedDelivery = data.estimatedDelivery;

      const response = await apiClient.patch<Order>(`/admin/orders/${orderId}`, requestData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update order status',
          response.error?.code || 'ORDER_STATUS_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateOrderStatus');
    }
  }

  // Get all users
  async getAllUsers(filters: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'user' | 'admin';
    status?: 'active' | 'banned' | 'suspended';
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<PaginatedResponse<any>> {
    try {
      const response = await apiClient.get<PaginatedResponse<any>>('/admin/users', {
        params: this.buildUserQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch users',
          response.error?.code || 'USERS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getAllUsers');
    }
  }

  // Update user status
  async updateUserStatus(userId: string, status: 'active' | 'banned' | 'suspended', reason?: string): Promise<any> {
    try {
      if (!userId) {
        throw new ValidationError('User ID is required');
      }

      const validStatuses = ['active', 'banned', 'suspended'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError('Invalid user status');
      }

      const requestData: any = { status };
      if (reason) requestData.reason = reason;

      const response = await apiClient.patch<any>(`/admin/users/${userId}`, requestData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update user status',
          response.error?.code || 'USER_STATUS_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateUserStatus');
    }
  }

  // Get audit logs
  async getAuditLogs(filters: AuditFilters = {}): Promise<PaginatedResponse<AuditLog>> {
    try {
      const response = await apiClient.get<PaginatedResponse<AuditLog>>('/admin/audit-logs', {
        params: this.buildAuditQueryParams(filters)
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch audit logs',
          response.error?.code || 'AUDIT_LOGS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getAuditLogs');
    }
  }

  // Get system health
  async getSystemHealth(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    services: {
      database: {
        status: 'up' | 'down';
        responseTime: number;
      };
      redis: {
        status: 'up' | 'down';
        responseTime: number;
      };
      storage: {
        status: 'up' | 'down';
        usedSpace: number;
        totalSpace: number;
      };
    };
    metrics: {
      uptime: number;
      memoryUsage: number;
      cpuUsage: number;
      activeConnections: number;
    };
  }> {
    try {
      const response = await apiClient.get('/admin/health');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch system health',
          response.error?.code || 'SYSTEM_HEALTH_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getSystemHealth');
    }
  }

  // Get analytics data
  async getAnalytics(filters: {
    startDate?: string;
    endDate?: string;
    type?: 'revenue' | 'orders' | 'users' | 'products';
  } = {}): Promise<{
    revenue: Array<{
      date: string;
      amount: number;
      orders: number;
    }>;
    orders: Array<{
      date: string;
      count: number;
      status: OrderStatus;
    }>;
    users: Array<{
      date: string;
      count: number;
      newUsers: number;
      returningUsers: number;
    }>;
    products: Array<{
      productId: string;
      title: string;
      sales: number;
      revenue: number;
      views: number;
    }>;
    summary: {
      totalRevenue: number;
      totalOrders: number;
      totalUsers: number;
      conversionRate: number;
      averageOrderValue: number;
    };
  }> {
    try {
      const response = await apiClient.get('/admin/analytics', {
        params: filters
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch analytics',
          response.error?.code || 'ANALYTICS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getAnalytics');
    }
  }

  // Export data
  async exportData(type: 'orders' | 'products' | 'users' | 'reviews', filters: any = {}): Promise<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }> {
    try {
      if (!type) {
        throw new ValidationError('Export type is required');
      }

      const validTypes = ['orders', 'products', 'users', 'reviews'];
      if (!validTypes.includes(type)) {
        throw new ValidationError('Invalid export type');
      }

      const response = await apiClient.post('/admin/export', {
        type,
        filters
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to export data',
          response.error?.code || 'DATA_EXPORT_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'exportData');
    }
  }

  // Get settings
  async getSettings(): Promise<{
    site: {
      name: string;
      description: string;
      logo: string;
      favicon: string;
    };
    payment: {
      cashfree: {
        enabled: boolean;
        appId: string;
        environment: 'sandbox' | 'production';
      };
    };
    email: {
      smtp: {
        host: string;
        port: number;
        secure: boolean;
      };
    };
    shipping: {
      freeShippingThreshold: number;
      standardShippingCost: number;
    };
  }> {
    try {
      const response = await apiClient.get('/admin/settings');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch settings',
          response.error?.code || 'SETTINGS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getSettings');
    }
  }

  // Update settings
  async updateSettings(settings: any): Promise<any> {
    try {
      const response = await apiClient.put('/admin/settings', settings);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update settings',
          response.error?.code || 'SETTINGS_UPDATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateSettings');
    }
  }

  // Build query parameters for products
  private buildProductQueryParams(filters: ProductFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.category) params.category = filters.category;
    if (filters.search) params.search = filters.search;
    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(100, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  // Build query parameters for orders
  private buildOrderQueryParams(filters: any): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.status) params.status = filters.status;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(100, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  // Build query parameters for users
  private buildUserQueryParams(filters: any): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.search) params.search = filters.search;
    if (filters.role) params.role = filters.role;
    if (filters.status) params.status = filters.status;
    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(100, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  // Build query parameters for audit logs
  private buildAuditQueryParams(filters: AuditFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.action) params.action = filters.action;
    if (filters.resource) params.resource = filters.resource;
    if (filters.userId) params.userId = filters.userId;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(100, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  // Validate create product request
  private validateCreateProductRequest(productData: CreateProductRequest): void {
    const errors: string[] = [];

    if (!productData.title || productData.title.trim().length === 0) {
      errors.push('Product title is required');
    }

    if (!productData.author || productData.author.trim().length === 0) {
      errors.push('Product author is required');
    }

    if (!productData.price || productData.price <= 0) {
      errors.push('Product price must be greater than 0');
    }

    if (!productData.category) {
      errors.push('Product category is required');
    }

    if (!productData.description || productData.description.trim().length === 0) {
      errors.push('Product description is required');
    }

    if (!productData.images || productData.images.length === 0) {
      errors.push('At least one product image is required');
    }

    if (productData.stock < 0) {
      errors.push('Product stock cannot be negative');
    }

    if (productData.pages <= 0) {
      errors.push('Number of pages must be greater than 0');
    }

    if (!productData.format) {
      errors.push('Product format is required');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate update product request
  private validateUpdateProductRequest(productData: UpdateProductRequest): void {
    const errors: string[] = [];

    if (productData.price !== undefined && productData.price <= 0) {
      errors.push('Product price must be greater than 0');
    }

    if (productData.stock !== undefined && productData.stock < 0) {
      errors.push('Product stock cannot be negative');
    }

    if (productData.pages !== undefined && productData.pages <= 0) {
      errors.push('Number of pages must be greater than 0');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate inventory update
  private validateInventoryUpdate(stockData: InventoryUpdateRequest): void {
    const errors: string[] = [];

    if (stockData.stock < 0) {
      errors.push('Stock cannot be negative');
    }

    if (stockData.lowStockThreshold !== undefined && stockData.lowStockThreshold < 0) {
      errors.push('Low stock threshold cannot be negative');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Check if user has admin permissions
  private checkAdminPermissions(): void {
    // This could check user role from auth service
    // For now, we'll rely on the API to handle authorization
  }

  // Format currency
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  // Format percentage
  formatPercentage(value: number): string {
    return `${value.toFixed(1)}%`;
  }

  // Format date
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Format date time
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Get status badge color
  getStatusBadgeColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'green',
      banned: 'red',
      suspended: 'orange',
      pending: 'yellow',
      verified: 'green',
      processing: 'blue',
      shipped: 'purple',
      delivered: 'green',
      cancelled: 'red',
      returned: 'orange',
    };

    return colors[status] || 'gray';
  }

  // Check if status is positive
  isPositiveStatus(status: string): boolean {
    const positiveStatuses = ['active', 'verified', 'delivered', 'shipped'];
    return positiveStatuses.includes(status);
  }

  // Check if status is negative
  isNegativeStatus(status: string): boolean {
    const negativeStatuses = ['banned', 'suspended', 'cancelled', 'returned'];
    return negativeStatuses.includes(status);
  }
}

// Export singleton instance
export const adminService = AdminService.getInstance();

// Export default
export default adminService;
