// Order Service for SINGGLEBEE Frontend

import apiClient from './api-client';
import { 
  ApiResponse, 
  PaginatedResponse, 
  Order, 
  CreateOrderRequest, 
  OrderFilters, 
  OrderStatusUpdate,
  PaymentSession,
  OrderStatus,
  PaymentMethod
} from '../types/api';
import { 
  NotFoundError, 
  ValidationError, 
  ErrorHandler,
  createError
} from '../utils/error-handler';

class OrderService {
  private static instance: OrderService;

  static getInstance(): OrderService {
    if (!OrderService.instance) {
      OrderService.instance = new OrderService();
    }
    return OrderService.instance;
  }

  // Create new order
  async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    try {
      this.validateCreateOrderRequest(orderData);

      const response = await apiClient.post<Order>('/orders', orderData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to create order',
          response.error?.code || 'ORDER_CREATE_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'createOrder');
    }
  }

  // Get orders with filters and pagination
  async getOrders(filters: OrderFilters = {}): Promise<PaginatedResponse<Order>> {
    try {
      const response = await apiClient.get<PaginatedResponse<Order>>('/orders', {
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
      throw ErrorHandler.handleApiError(error, 'getOrders');
    }
  }

  // Get single order by ID
  async getOrderById(id: string): Promise<Order> {
    try {
      if (!id) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.get<Order>(`/orders/${id}`);
      
      if (!response.success || !response.data) {
        throw new NotFoundError('Order', id);
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getOrderById');
    }
  }

  // Cancel order
  async cancelOrder(id: string, reason?: string): Promise<Order> {
    try {
      if (!id) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.post<Order>(`/orders/${id}/cancel`, {
        reason: reason || 'Customer requested cancellation'
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to cancel order',
          response.error?.code || 'ORDER_CANCEL_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'cancelOrder');
    }
  }

  // Upload payment receipt for COD orders
  async uploadPaymentReceipt(orderId: string, file: File): Promise<Order> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (!file) {
        throw new ValidationError('Receipt file is required');
      }

      // Validate file
      this.validateReceiptFile(file);

      const response = await apiClient.uploadFile(
        `/orders/${orderId}/receipt`,
        file,
        undefined,
        {
          timeout: 60000 // 1 minute for file upload
        }
      );
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to upload receipt',
          response.error?.code || 'RECEIPT_UPLOAD_FAILED',
          400
        );
      }

      // Get updated order
      return this.getOrderById(orderId);
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'uploadPaymentReceipt');
    }
  }

  // Track order status
  async trackOrder(id: string): Promise<{
    order: Order;
    statusHistory: {
      status: OrderStatus;
      timestamp: string;
      message?: string;
      location?: string;
    }[];
    estimatedDelivery?: string;
    trackingNumber?: string;
  }> {
    try {
      if (!id) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.get(`/orders/${id}/track`);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to track order',
          response.error?.code || 'ORDER_TRACK_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'trackOrder');
    }
  }

  // Update order status (admin only)
  async updateOrderStatus(orderId: string, statusUpdate: OrderStatusUpdate): Promise<Order> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      this.validateOrderStatusUpdate(statusUpdate);

      const response = await apiClient.patch<Order>(`/orders/${orderId}`, statusUpdate);
      
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

  // Verify order (admin only)
  async verifyOrder(orderId: string): Promise<Order> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.post<Order>(`/orders/${orderId}/verify`);
      
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

  // Process refund (admin only)
  async processRefund(orderId: string, amount: number, reason: string): Promise<Order> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      if (amount <= 0) {
        throw new ValidationError('Refund amount must be greater than 0');
      }

      const response = await apiClient.post<Order>(`/orders/${orderId}/refund`, {
        amount,
        reason
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to process refund',
          response.error?.code || 'REFUND_PROCESS_FAILED',
          400
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'processRefund');
    }
  }

  // Get payment session
  async getPaymentSession(orderId: string): Promise<PaymentSession> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.get<PaymentSession>(`/orders/${orderId}/payment-session`);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to get payment session',
          response.error?.code || 'PAYMENT_SESSION_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getPaymentSession');
    }
  }

  // Create payment session
  async createPaymentSession(orderId: string): Promise<PaymentSession> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.post<PaymentSession>(`/orders/${orderId}/payment-session`);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to create payment session',
          response.error?.code || 'PAYMENT_SESSION_CREATE_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'createPaymentSession');
    }
  }

  // Get order statistics
  async getOrderStats(filters: {
    startDate?: string;
    endDate?: string;
    status?: OrderStatus;
  } = {}): Promise<{
    totalOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
    ordersByStatus: Record<OrderStatus, number>;
    ordersByPaymentMethod: Record<PaymentMethod, number>;
    revenueByDay: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
  }> {
    try {
      const response = await apiClient.get('/orders/stats', {
        params: filters
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch order statistics',
          response.error?.code || 'ORDER_STATS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getOrderStats');
    }
  }

  // Get order analytics
  async getOrderAnalytics(): Promise<{
    monthlyRevenue: Array<{
      month: string;
      revenue: number;
      orders: number;
    }>;
    topProducts: Array<{
      productId: string;
      title: string;
      quantity: number;
      revenue: number;
    }>;
    customerMetrics: {
      newCustomers: number;
      returningCustomers: number;
      averageOrdersPerCustomer: number;
    };
    paymentMethods: Array<{
      method: PaymentMethod;
      count: number;
      percentage: number;
      revenue: number;
    }>;
  }> {
    try {
      const response = await apiClient.get('/orders/analytics');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch order analytics',
          response.error?.code || 'ORDER_ANALYTICS_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getOrderAnalytics');
    }
  }

  // Export orders
  async exportOrders(filters: OrderFilters & {
    format: 'csv' | 'excel' | 'pdf';
  }): Promise<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }> {
    try {
      const response = await apiClient.post('/orders/export', filters);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to export orders',
          response.error?.code || 'ORDERS_EXPORT_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'exportOrders');
    }
  }

  // Get order invoices
  async getOrderInvoices(orderId: string): Promise<Array<{
    id: string;
    type: 'invoice' | 'receipt';
    url: string;
    filename: string;
    createdAt: string;
  }>> {
    try {
      if (!orderId) {
        throw new ValidationError('Order ID is required');
      }

      const response = await apiClient.get(`/orders/${orderId}/invoices`);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to fetch order invoices',
          response.error?.code || 'ORDER_INVOICES_FETCH_FAILED',
          500
        );
      }

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getOrderInvoices');
    }
  }

  // Download invoice
  async downloadInvoice(orderId: string, invoiceId: string): Promise<void> {
    try {
      if (!orderId || !invoiceId) {
        throw new ValidationError('Order ID and Invoice ID are required');
      }

      await apiClient.download(`/orders/${orderId}/invoices/${invoiceId}/download`);
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'downloadInvoice');
    }
  }

  // Validate create order request
  private validateCreateOrderRequest(orderData: CreateOrderRequest): void {
    const errors: string[] = [];

    if (!orderData.items || orderData.items.length === 0) {
      errors.push('Order must contain at least one item');
    }

    orderData.items?.forEach((item, index) => {
      if (!item.productId) {
        errors.push(`Item ${index + 1}: Product ID is required`);
      }
      
      if (!item.quantity || item.quantity < 1) {
        errors.push(`Item ${index + 1}: Quantity must be at least 1`);
      }
    });

    if (!orderData.shippingAddress) {
      errors.push('Shipping address is required');
    } else {
      if (!orderData.shippingAddress.street) {
        errors.push('Shipping address street is required');
      }
      if (!orderData.shippingAddress.city) {
        errors.push('Shipping address city is required');
      }
      if (!orderData.shippingAddress.state) {
        errors.push('Shipping address state is required');
      }
      if (!orderData.shippingAddress.zipCode) {
        errors.push('Shipping address ZIP code is required');
      }
    }

    if (!orderData.paymentMethod) {
      errors.push('Payment method is required');
    }

    const validPaymentMethods: PaymentMethod[] = ['UPI', 'GPay', 'PhonePe', 'COD', 'Cashfree'];
    if (orderData.paymentMethod && !validPaymentMethods.includes(orderData.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate order status update
  private validateOrderStatusUpdate(statusUpdate: OrderStatusUpdate): void {
    const errors: string[] = [];

    if (!statusUpdate.status) {
      errors.push('Status is required');
    }

    const validStatuses: OrderStatus[] = ['pending', 'verified', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'];
    if (statusUpdate.status && !validStatuses.includes(statusUpdate.status)) {
      errors.push('Invalid order status');
    }

    if (statusUpdate.status === 'shipped' && !statusUpdate.trackingNumber) {
      errors.push('Tracking number is required when status is shipped');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate receipt file
  private validateReceiptFile(file: File): void {
    const errors: string[] = [];

    // File size check (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      errors.push('Receipt file size must be less than 5MB');
    }

    // File type check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Receipt file must be an image (JPEG, PNG) or PDF');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Build query parameters for orders
  private buildOrderQueryParams(filters: OrderFilters): Record<string, any> {
    const params: Record<string, any> = {};

    if (filters.status) params.status = filters.status;
    if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus;
    if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    if (filters.page) params.page = Math.max(1, filters.page);
    if (filters.limit) params.limit = Math.min(50, Math.max(1, filters.limit));
    if (filters.sortBy) params.sortBy = filters.sortBy;
    if (filters.sortOrder) params.sortOrder = filters.sortOrder;

    return params;
  }

  // Check if order can be cancelled
  canCancelOrder(order: Order): boolean {
    const cancellableStatuses: OrderStatus[] = ['pending', 'verified'];
    return cancellableStatuses.includes(order.status);
  }

  // Check if order can be returned
  canReturnOrder(order: Order): boolean {
    if (order.status !== 'delivered') return false;
    
    const deliveredDate = order.actualDelivery ? new Date(order.actualDelivery) : null;
    if (!deliveredDate) return false;
    
    // Return window: 7 days after delivery
    const returnWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const now = new Date();
    const timeSinceDelivery = now.getTime() - deliveredDate.getTime();
    
    return timeSinceDelivery <= returnWindow;
  }

  // Get order status color
  getStatusColor(status: OrderStatus): string {
    const colors: Record<OrderStatus, string> = {
      pending: '#F59E0B',      // amber
      verified: '#10B981',    // green
      processing: '#3B82F6',  // blue
      shipped: '#8B5CF6',     // purple
      delivered: '#059669',   // green
      cancelled: '#EF4444',   // red
      returned: '#F97316'     // orange
    };
    
    return colors[status] || '#6B7280';
  }

  // Get payment method display name
  getPaymentMethodDisplayName(method: PaymentMethod): string {
    const names: Record<PaymentMethod, string> = {
      UPI: 'UPI',
      GPay: 'Google Pay',
      PhonePe: 'PhonePe',
      COD: 'Cash on Delivery',
      Cashfree: 'Cashfree Payment Gateway'
    };
    
    return names[method] || method;
  }

  // Format order ID for display
  formatOrderId(orderId: string): string {
    return orderId.toUpperCase();
  }

  // Get estimated delivery date
  getEstimatedDeliveryDate(order: Order): string | null {
    if (order.estimatedDelivery) {
      return new Date(order.estimatedDelivery).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      });
    }
    
    // Default estimation based on status
    if (order.status === 'pending') {
      const date = new Date();
      date.setDate(date.getDate() + 3);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    }
    
    return null;
  }
}

// Export singleton instance
export const orderService = OrderService.getInstance();

// Export default
export default orderService;
