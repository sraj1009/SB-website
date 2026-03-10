// Admin Service for SINGGLEBEE Admin Hive

import api from './api';
import {
  AdminStats,
  AdminProduct,
  ProductFormData,
  AdminOrder,
  OrderVerifyData,
  ProductQueryParams,
  OrderQueryParams,
  StatsQueryParams,
  AdminProductsResponse,
  AdminOrdersResponse,
  ProductImage,
} from '../types/admin';

class AdminService {
  private static instance: AdminService;

  static getInstance(): AdminService {
    if (!AdminService.instance) {
      AdminService.instance = new AdminService();
    }
    return AdminService.instance;
  }

  // ============ DASHBOARD ============

  // Get dashboard statistics
  async getDashboardStats(params: StatsQueryParams = {}): Promise<AdminStats> {
    try {
      const response = await api.get('/admin/stats', { params } as any);
      return (response as any).data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch dashboard stats');
    }
  }

  // ============ PRODUCTS ============

  // Get all products for admin
  async getProducts(params: ProductQueryParams = {}): Promise<AdminProductsResponse> {
    try {
      const response = await api.get('/admin/products', { params } as any);
      return (response as any).data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch products');
    }
  }

  // Get single product
  async getProduct(id: string): Promise<AdminProduct> {
    try {
      const response = await api.get(`/admin/products/${id}`);
      return (response as any).data.product;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch product');
    }
  }

  // Create new product
  async createProduct(productData: ProductFormData, imageFile?: File): Promise<AdminProduct> {
    try {
      const formData = new FormData();
      
      // Add all product fields to FormData
      Object.entries(productData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add image if provided
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch('/api/v1/admin/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${api.TokenManager.getAccessToken()}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create product');
      }

      return data.product;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to create product');
    }
  }

  // Update product
  async updateProduct(id: string, productData: Partial<ProductFormData>, imageFile?: File): Promise<AdminProduct> {
    try {
      const formData = new FormData();
      
      // Add all product fields to FormData
      Object.entries(productData).forEach(([key, value]) => {
        if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add image if provided
      if (imageFile) {
        formData.append('image', imageFile);
      }

      const response = await fetch(`/api/v1/admin/products/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${api.TokenManager.getAccessToken()}`,
        },
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to update product');
      }

      return data.product;
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update product');
    }
  }

  // Delete product (soft delete)
  async deleteProduct(id: string): Promise<void> {
    try {
      await (api as any).del(`/admin/products/${id}`);
      // Success is indicated by 204 status or success response
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to delete product');
    }
  }

  // ============ ORDERS ============

  // Get all orders for admin
  async getOrders(params: OrderQueryParams = {}): Promise<AdminOrdersResponse> {
    try {
      const response = await api.get('/admin/orders', { params } as any);
      return (response as any).data;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to fetch orders');
    }
  }

  // Verify or reject order
  async verifyOrder(id: string, verifyData: OrderVerifyData): Promise<AdminOrder> {
    try {
      const response = await api.put(`/admin/orders/${id}/verify`, verifyData);
      return (response as any).data.order;
    } catch (error: any) {
      throw new Error(error.response?.data?.error?.message || 'Failed to verify order');
    }
  }

  // ============ UTILITY METHODS ============

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
  getStatusBadgeColor(status: string): {
    color: string;
    bgColor: string;
    textColor: string;
  } {
    const colors: Record<string, { color: string; bgColor: string; textColor: string }> = {
      active: { color: 'border-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
      inactive: { color: 'border-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
      'out_of_stock': { color: 'border-red-500', bgColor: 'bg-red-100', textColor: 'text-red-800' },
      pending: { color: 'border-yellow-500', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
      verified: { color: 'border-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
      shipped: { color: 'border-blue-500', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
      delivered: { color: 'border-green-500', bgColor: 'bg-green-100', textColor: 'text-green-800' },
      cancelled: { color: 'border-red-500', bgColor: 'bg-red-100', textColor: 'text-red-800' },
    };

    return colors[status] || { color: 'border-gray-500', bgColor: 'bg-gray-100', textColor: 'text-gray-800' };
  }

  // Check if status is positive
  isPositiveStatus(status: string): boolean {
    const positiveStatuses = ['active', 'verified', 'delivered', 'shipped'];
    return positiveStatuses.includes(status);
  }

  // Check if status is negative
  isNegativeStatus(status: string): boolean {
    const negativeStatuses = ['inactive', 'out_of_stock', 'cancelled', 'banned', 'suspended'];
    return negativeStatuses.includes(status);
  }

  // Generate product SKU
  generateSKU(category: string): string {
    const prefix = category.substring(0, 3).toUpperCase();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `SB-${prefix}-${timestamp}${random}`;
  }

  // Validate product form data
  validateProductFormData(data: ProductFormData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push('Product title is required');
    }

    if (!data.author || data.author.trim().length === 0) {
      errors.push('Author is required');
    }

    if (!data.price || data.price <= 0) {
      errors.push('Price must be greater than 0');
    }

    if (!data.category) {
      errors.push('Category is required');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (data.stockQuantity < 0) {
      errors.push('Stock cannot be negative');
    }

    if (data.discount < 0 || data.discount > 100) {
      errors.push('Discount must be between 0 and 100');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Process image upload
  async processImageUpload(file: File): Promise<ProductImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        // In a real implementation, you would upload to server here
        // For now, return a placeholder
        const imageUrl = `/uploads/products/${Date.now()}-${file.name}`;
        
        resolve({
          url: imageUrl,
          alt: file.name,
          isPrimary: true,
        });
      };

      reader.onerror = () => {
        reject(new Error('Failed to process image'));
      };

      reader.readAsDataURL(file);
    });
  }

  // Export products to CSV
  async exportProducts(params: ProductQueryParams = {}): Promise<string> {
    try {
      const products = await this.getProducts({ ...params, limit: 1000 });
      
      // Create CSV content
      const headers = ['Title', 'Author', 'Category', 'Price', 'Stock', 'Status', 'SKU', 'Language'];
      const csvContent = [
        headers.join(','),
        ...products.products.map(product => [
          `"${product.title}"`,
          `"${product.author}"`,
          `"${product.category}"`,
          product.price,
          product.stockQuantity,
          `"${product.status}"`,
          `"${product.sku}"`,
          `"${product.language}"`
        ].join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      return url;
    } catch (error) {
      throw new Error('Failed to export products');
    }
  }

  // Export orders to CSV
  async exportOrders(params: OrderQueryParams = {}): Promise<string> {
    try {
      const orders = await this.getOrders({ ...params, limit: 1000 });
      
      // Create CSV content
      const headers = ['Order ID', 'Customer', 'Email', 'Total', 'Status', 'Payment Method', 'Date'];
      const csvContent = [
        headers.join(','),
        ...orders.orders.map(order => [
          `"${order.orderId}"`,
          `"${order.user.fullName}"`,
          `"${order.user.email}"`,
          order.total,
          `"${order.status}"`,
          `"${order.paymentMethod}"`,
          `"${this.formatDateTime(order.createdAt)}"`
        ].join(','))
      ].join('\n');

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      return url;
    } catch (error) {
      throw new Error('Failed to export orders');
    }
  }
}

// Export singleton instance
export const adminService = AdminService.getInstance();

// Export default
export default adminService;
