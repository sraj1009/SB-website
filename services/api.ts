/**
 * SINGGLEBEE API Service
 * Handles all HTTP requests to the backend
 */

// API base URL - set VITE_API_URL in .env for cross-origin (e.g. https://api.singglebee.com/api/v1)
// Relative /api/v1 works when frontend is served with backend proxy (same origin)
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) ||
  (typeof window !== 'undefined' && (window as any).__SINGGLEBEE_API__) ||
  '/api/v1';

// Token storage keys
const ACCESS_TOKEN_KEY = 'singglebee_access_token';
const REFRESH_TOKEN_KEY = 'singglebee_refresh_token';

/**
 * Token management utilities
 */
export const TokenManager = {
  getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),
  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens: (accessToken: string, refreshToken: string) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  },

  clearTokens: () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  isLoggedIn: () => !!localStorage.getItem(ACCESS_TOKEN_KEY),
};

/**
 * API Error class
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Singleton refresh promise — all concurrent 401s share this one promise.
// Prevents duplicate /auth/refresh calls and guarantees no request is dropped.
let refreshPromise: Promise<boolean> | null = null;

/**
 * Make authenticated API request
 */
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Attach access token to headers if available
  const accessToken = TokenManager.getAccessToken();
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    let response = await fetch(url, { ...options, headers, credentials: 'include' });

    // If 401, try to refresh token (using cookies)
    if (response.status === 401 && endpoint !== '/auth/refresh') {
      // All parallel 401s await the SAME singleton promise — no duplicates
      if (!refreshPromise) {
        refreshPromise = refreshAccessToken().finally(() => {
          refreshPromise = null; // Reset after completion (success or fail)
        });
      }

      const refreshed = await refreshPromise;

      if (refreshed) {
        // Retry original request with new token if available
        const newAccessToken = TokenManager.getAccessToken();
        if (newAccessToken) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${newAccessToken}`;
        }
        response = await fetch(url, { ...options, headers, credentials: 'include' });
      }
    }

    let data: any;
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    try {
      if (isJson) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new ApiError(
          `Server returned non-JSON response: ${text.substring(0, 150)}...`,
          'INVALID_RESPONSE',
          response.status
        );
      }
    } catch (parseError) {
      if (parseError instanceof ApiError) throw parseError;
      throw new ApiError(
        'Failed to parse server response. The hive might be down.',
        'PARSE_ERROR',
        response.status
      );
    }

    if (!response.ok) {
      throw new ApiError(
        data.error?.message || data.message || 'Request failed',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError((error as Error).message || 'Network error', 'NETWORK_ERROR', 0);
  }
}

/**
 * Refresh access token
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: TokenManager.getRefreshToken() }), // Also send in body as fallback
      credentials: 'include',
    });

    if (!response.ok) {
      TokenManager.clearTokens();
      return false;
    }

    // If backend returns new tokens in response data, store them
    const data = await response.json().catch(() => null);
    if (data?.data?.tokens) {
      TokenManager.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken);
    }

    return true;
  } catch {
    TokenManager.clearTokens();
    return false;
  }
}

// ============ AUTH API ============

export const AuthAPI = {
  /**
   * Sign up new user
   */
  signup: async (userData: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => {
    const response: any = await apiRequest<{
      success: boolean;
      data: {
        user: any;
        tokens?: { accessToken: string; refreshToken: string };
      };
    }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.data?.tokens) {
      TokenManager.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response.data.user;
  },

  /**
   * Sign in user
   */
  signin: async (email: string, password: string) => {
    const response: any = await apiRequest<{
      success: boolean;
      data: {
        user: any;
        tokens?: { accessToken: string; refreshToken: string };
      };
    }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.tokens) {
      TokenManager.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response.data.user;
  },

  /**
   * Logout
   */
  logout: async () => {
    try {
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    } catch {
      // Ignore errors on logout
    }
    TokenManager.clearTokens(); // Should clear local state/user info
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const response = await apiRequest<{
      success: boolean;
      data: { user: any };
    }>('/auth/me');
    return response.data.user;
  },

  /**
   * Update user profile
   */
  updateProfile: async (data: { fullName?: string; phone?: string; address?: any }) => {
    const response = await apiRequest<{
      success: boolean;
      data: { user: any };
    }>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response.data.user;
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (email: string) => {
    await apiRequest<{ success: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Reset password with token from email
   */
  resetPassword: async (token: string, password: string) => {
    await apiRequest<{ success: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },

  /**
   * Change password (logged-in users)
   */
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await apiRequest<{
      success: boolean;
      data: { tokens: { accessToken: string; refreshToken: string } };
    }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });
    if (response.data?.tokens) {
      TokenManager.setTokens(response.data.tokens.accessToken, response.data.tokens.refreshToken);
    }
    return response;
  },
};

// ============ PRODUCTS API ============

export const ProductsAPI = {
  /**
   * Get all products
   */
  getProducts: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    bestseller?: boolean;
    language?: string;
    minPrice?: number;
    maxPrice?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.set(key, String(value));
      });
    }

    const response = await apiRequest<{
      success: boolean;
      data: {
        products: any[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };
    }>(`/products?${queryParams.toString()}`);

    return response.data;
  },

  /**
   * Get single product
   */
  getProduct: async (id: string) => {
    const response = await apiRequest<{
      success: boolean;
      data: { product: any };
    }>(`/products/${id}`);
    return response.data.product;
  },
};

// ============ ORDERS API ============

export const OrdersAPI = {
  /**
   * Create order
   */
  createOrder: async (orderData: {
    items: Array<{ productId: string; quantity: number }>;
    shippingAddress: {
      fullName: string;
      phone: string;
      email: string;
      street: string;
      landmark?: string;
      city: string;
      state: string;
      zipCode: string;
    };
    paymentMethod?: 'cashfree' | 'upi_manual';
    notes?: string;
  }) => {
    const response = await apiRequest<{
      success: boolean;
      data: { order: any };
    }>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
    return response.data.order;
  },

  /**
   * Get my orders
   */
  getMyOrders: async (params?: { page?: number; limit?: number; status?: string }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.set(key, String(value));
      });
    }

    const response = await apiRequest<{
      success: boolean;
      data: { orders: any[]; pagination: any };
    }>(`/orders?${queryParams.toString()}`);

    return response.data;
  },

  /**
   * Get single order
   */
  getOrder: async (id: string) => {
    const response = await apiRequest<{
      success: boolean;
      data: { order: any };
    }>(`/orders/${id}`);
    return response.data.order;
  },

  /**
   * Cancel order
   */
  cancelOrder: async (id: string, reason?: string) => {
    const response = await apiRequest<{
      success: boolean;
      data: { order: any };
    }>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return response.data.order;
  },
};

// ============ PAYMENTS API ============

export const PaymentsAPI = {
  /**
   * Create payment session
   */
  createSession: async (payload: any) => {
    const response: any = await apiRequest<{
      success: boolean;
      data: any;
    }>('/payments/create-session', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  /**
   * Get payment status
   */
  getStatus: async (orderId: string) => {
    const response = await apiRequest<{
      success: boolean;
      data: {
        orderId: string;
        sessionId?: string;
        orderStatus: string;
        paymentStatus: string;
        paymentMethod: string;
        total: number;
        status?: string;
        type?: string;
        orderCreated?: boolean;
      };
    }>(`/payments/status/${orderId}`);
    return response.data;
  },

  /**
   * Upload proof image for manual UPI
   */
  uploadProof: async (formData: FormData) => {
    const response = await apiRequest<{
      success: boolean;
      message: string;
    }>('/payments/upload-proof', {
      method: 'POST',
      // Omit Content-Type so the browser sets it to multipart/form-data with boundary
      headers: {
        'Content-Type': undefined as any, // This gets filtered/overridden securely
      },
      body: formData as any,
    });
    return response;
  },
};

// ============ WISHLIST API ============

export const WishlistAPI = {
  getWishlist: async () => {
    const response = await apiRequest<{
      success: boolean;
      data: { wishlist: { items: any[] } };
    }>('/wishlist');
    return response.data.wishlist;
  },

  addToWishlist: async (productId: string) => {
    const response = await apiRequest<{ success: boolean; message: string }>(
      '/wishlist/' + productId,
      {
        method: 'POST',
      }
    );
    return response;
  },

  removeFromWishlist: async (productId: string) => {
    const response = await apiRequest<{ success: boolean; message: string }>(
      '/wishlist/' + productId,
      {
        method: 'DELETE',
      }
    );
    return response;
  },

  checkWishlist: async (productId: string) => {
    const response = await apiRequest<{ success: boolean; data: { inWishlist: boolean } }>(
      '/wishlist/check/' + productId
    );
    return response.data.inWishlist;
  },
};

// ============ REVIEWS API ============

export const ReviewsAPI = {
  getProductReviews: async (productId: string) => {
    const response = await apiRequest<{ success: boolean; data: { reviews: any[] } }>(
      `/reviews/${productId}`
    );
    return response.data.reviews;
  },

  addReview: async (productId: string, reviewData: { rating: number; comment: string }) => {
    const response = await apiRequest<{ success: boolean; message: string }>(
      `/reviews/${productId}`,
      {
        method: 'POST',
        body: JSON.stringify(reviewData),
      }
    );
    return response;
  },
};

// ============ ACCOUNT / ADDRESS API ============

export const AccountAPI = {
  getAddresses: async () => {
    const response = await apiRequest<{ success: boolean; data: { addresses: any[] } }>(
      '/addresses'
    );
    return response.data.addresses;
  },

  addAddress: async (addressData: any) => {
    const response = await apiRequest<{ success: boolean; data: { address: any } }>('/addresses', {
      method: 'POST',
      body: JSON.stringify(addressData),
    });
    return response.data.address;
  },
};

// ============ ADMIN API ============

export const AdminAPI = {
  getStats: async () => {
    const response = await apiRequest<{ success: boolean; data: any }>('/admin/stats');
    return response.data;
  },

  getUsers: async (params?: any) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiRequest<{
      success: boolean;
      data: { users: any[]; pagination: any };
    }>(`/admin/users?${queryParams}`);
    return response.data;
  },

  getProducts: async (params?: any) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiRequest<{
      success: boolean;
      data: { products: any[]; pagination: any };
    }>(`/admin/products?${queryParams}`);
    return response.data;
  },

  getOrders: async (params?: any) => {
    const queryParams = new URLSearchParams(params).toString();
    const response = await apiRequest<{
      success: boolean;
      data: { orders: any[]; pagination: any };
    }>(`/admin/orders?${queryParams}`);
    return response.data;
  },

  getOrder: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: { order: any } }>(
      `/admin/orders/${id}`
    );
    return response.data.order;
  },

  updateOrderStatus: async (id: string, status: string) => {
    const response = await apiRequest<{ success: boolean; data: { order: any } }>(
      `/admin/orders/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return response.data.order;
  },

  markPaymentComplete: async (id: string, transactionId?: string) => {
    const response = await apiRequest<{ success: boolean; data: { order: any } }>(
      `/admin/orders/${id}/payment`,
      {
        method: 'PATCH',
        body: JSON.stringify({ transactionId }),
      }
    );
    return response.data.order;
  },

  updateUserStatus: async (id: string, status: 'active' | 'banned' | 'suspended') => {
    const response = await apiRequest<{ success: boolean; data: { user: any } }>(
      `/admin/users/${id}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }
    );
    return response.data.user;
  },

  getUser: async (id: string) => {
    const response = await apiRequest<{ success: boolean; data: { user: any } }>(
      `/admin/users/${id}`
    );
    return response.data.user;
  },
};

// ============ COUPONS API ============

export const CouponsAPI = {
  validate: async (code: string, orderAmount: number) => {
    const response = await apiRequest<{
      success: boolean;
      data: {
        code: string;
        discountType: 'percentage' | 'fixed';
        discountAmount: number;
        calculatedDiscount: number;
        finalAmount: number;
      };
    }>('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount }),
    });
    return response.data;
  },
};

export default {
  auth: AuthAPI,
  products: ProductsAPI,
  orders: OrdersAPI,
  payments: PaymentsAPI,
  wishlist: WishlistAPI,
  reviews: ReviewsAPI,
  account: AccountAPI,
  admin: AdminAPI,
  coupons: CouponsAPI,
  TokenManager,
  // Generic methods
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: any, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(endpoint: string, options?: RequestInit) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
