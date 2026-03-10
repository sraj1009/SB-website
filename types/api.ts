// API Type Definitions for SINGGLEBEE Frontend

// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Authentication Types
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  address?: AddressBook;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'user' | 'admin';
  emailVerified: boolean;
  addresses: AddressBook[];
  wishlist: string[];
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Product Types
export interface ProductFilters {
  category?: string;
  priceMin?: number;
  priceMax?: number;
  rating?: number;
  language?: string;
  inStock?: boolean;
  bestseller?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'rating' | 'createdAt' | 'title' | 'bestseller';
  sortOrder?: 'asc' | 'desc';
}

export interface ProductResponse extends Product {
  relatedProducts?: Product[];
  reviews?: Review[];
  averageRating?: number;
  reviewCount?: number;
}

// Cart Types
export interface CartItem {
  id: string;
  product: {
    id: string;
    title: string;
    author: string;
    price: number;
    image: string;
    stock: number;
    format?: string;
  };
  quantity: number;
  subtotal: number;
  addedAt: string;
}

export interface CartResponse {
  items: CartItem[];
  itemCount: number;
  totalAmount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  coupon?: Coupon;
}

export interface AddToCartRequest {
  productId: string;
  quantity: number;
}

export interface UpdateCartRequest {
  quantity: number;
}

// Order Types
export type OrderStatus = 'pending' | 'verified' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned';

export type PaymentMethod = 'UPI' | 'GPay' | 'PhonePe' | 'COD' | 'Cashfree';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'processing';

export interface OrderItem {
  id: string;
  product: {
    id: string;
    title: string;
    author: string;
    price: number;
    image: string;
    format?: string;
  };
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CreateOrderRequest {
  items: {
    productId: string;
    quantity: number;
  }[];
  shippingAddress: AddressBook;
  billingAddress?: AddressBook;
  paymentMethod: PaymentMethod;
  couponCode?: string;
  notes?: string;
}

export interface Order {
  id: string;
  orderId: string;
  user: string;
  items: OrderItem[];
  totalAmount: number;
  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentSession?: {
    sessionId: string;
    paymentUrl?: string;
  };
  paymentReceipt?: {
    url: string;
    uploadedAt: string;
  };
  shippingAddress: AddressBook;
  billingAddress?: AddressBook;
  trackingNumber?: string;
  estimatedDelivery?: string;
  actualDelivery?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'totalAmount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderStatusUpdate {
  status: OrderStatus;
  trackingNumber?: string;
  notes?: string;
}

// Review Types
export interface CreateReviewRequest {
  rating: number;
  title?: string;
  comment: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  title?: string;
  comment?: string;
}

export interface Review {
  id: string;
  user: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  product: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  helpfulCount: number;
  isApproved: boolean;
  response?: {
    message: string;
    respondedAt: string;
    respondedBy: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Address Types
export interface AddressBook {
  id: string;
  street: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  isDefault: boolean;
  addressType: 'home' | 'work' | 'other';
}

export interface CreateAddressRequest {
  street: string;
  landmark?: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  isDefault?: boolean;
  addressType?: 'home' | 'work' | 'other';
}

// Coupon Types
export interface Coupon {
  id: string;
  code: string;
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'shipping';
  discountValue: number;
  minOrder: number;
  maxDiscount?: number;
  maxUses: number;
  usedCount: number;
  expiryDate: string;
  isActive: boolean;
  applicableCategories?: string[];
  applicableProducts?: string[];
}

// Admin Types
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  lowStockAlerts: number;
  pendingVerifications: number;
  recentOrders: Order[];
  topProducts: Product[];
  revenueChart: {
    date: string;
    revenue: number;
    orders: number;
  }[];
  categoryDistribution: {
    category: string;
    count: number;
    percentage: number;
  }[];
}

export interface CreateProductRequest {
  title: string;
  author: string;
  price: number;
  category: string;
  description: string;
  images: string[];
  stock: number;
  bestseller?: boolean;
  language: string;
  pages: number;
  format: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  weight?: number;
  dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  tags: string[];
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {
  isActive?: boolean;
}

export interface InventoryUpdateRequest {
  stock: number;
  lowStockThreshold?: number;
}

export interface AuditLog {
  id: string;
  action: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
  };
  resource: string;
  resourceId: string;
  changes?: {
    before: any;
    after: any;
  };
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  metadata?: any;
}

export interface AuditFilters {
  action?: string;
  resource?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'timestamp' | 'action' | 'resource';
  sortOrder?: 'asc' | 'desc';
}

// Payment Types
export interface PaymentSession {
  id: string;
  sessionId: string;
  paymentUrl?: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  createdAt: string;
  expiresAt: string;
}

export interface PaymentWebhook {
  eventId: string;
  type: string;
  data: any;
  timestamp: string;
  signature: string;
}

// File Upload Types
export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// Search Types
export interface SearchRequest {
  query: string;
  filters?: ProductFilters;
  limit?: number;
}

export interface SearchResponse {
  products: Product[];
  categories: string[];
  authors: string[];
  suggestions: string[];
  totalResults: number;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
}

// Wishlist Types
export interface WishlistItem {
  id: string;
  product: Product;
  addedAt: string;
}

// Error Types
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    field?: string;
  };
}

// HTTP Method Types
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

// Request Config Types
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
}

// Query Options Types
export interface QueryOptions {
  enabled?: boolean;
  retry?: number;
  retryDelay?: number;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
}

// Chart Data Types
export interface ChartDataPoint {
  label: string;
  value: number;
  date?: string;
}

export interface RevenueChartData {
  date: string;
  revenue: number;
  orders: number;
  customers: number;
}

export interface CategoryChartData {
  category: string;
  count: number;
  revenue: number;
  percentage: number;
}

// Export Types
export interface ExportRequest {
  type: 'orders' | 'products' | 'users' | 'reviews';
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
}

export interface ExportResponse {
  downloadUrl: string;
  filename: string;
  expiresAt: string;
}
