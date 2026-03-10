// Base API Client for SINGGLEBEE Frontend

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiResponse, RequestConfig } from '../types/api';
import { 
  ErrorHandler, 
  ApiError, 
  AuthError, 
  NetworkError,
  isNetworkError,
  isAuthError
} from '../utils/error-handler';

// API Configuration
const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL as string) || '/api/v1';
const API_TIMEOUT = 30000; // 30 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Token storage keys
const ACCESS_TOKEN_KEY = 'singglebee_access_token';
const REFRESH_TOKEN_KEY = 'singglebee_refresh_token';

// Token Management Utilities
class TokenManager {
  static getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  static setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  }

  static getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  static setRefreshToken(token: string): void {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  }

  static clearTokens(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  static isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true; // Invalid token
    }
  }
}

// Request Queue for Token Refresh
class RequestQueue {
  private static instance: RequestQueue;
  private isRefreshing: boolean = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  static getInstance(): RequestQueue {
    if (!RequestQueue.instance) {
      RequestQueue.instance = new RequestQueue();
    }
    return RequestQueue.instance;
  }

  addRequestToQueue(resolve: (token: string) => void, reject: (error: any) => void) {
    this.failedQueue.push({ resolve, reject });
  }

  processQueue(token: string) {
    this.failedQueue.forEach(({ resolve }) => resolve(token));
    this.failedQueue = [];
  }

  rejectQueue(error: any) {
    this.failedQueue.forEach(({ reject }) => reject(error));
    this.failedQueue = [];
  }

  setRefreshing(status: boolean) {
    this.isRefreshing = status;
  }

  getRefreshingStatus(): boolean {
    return this.isRefreshing;
  }
}

// Main API Client Class
class ApiClient {
  private axiosInstance: AxiosInstance;
  private requestQueue: RequestQueue;

  constructor() {
    this.requestQueue = RequestQueue.getInstance();
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = TokenManager.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request ID for debugging
        config.headers['X-Request-ID'] = this.generateRequestId();

        // Log request in development
        if (import.meta.env.DEV) {
          console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
            data: config.data,
            params: config.params,
          });
        }

        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        // Log response in development
        if (import.meta.env.DEV) {
          console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
            status: response.status,
            data: response.data,
          });
        }

        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

        // Handle network errors
        if (!error.response) {
          if (import.meta.env.DEV) {
            console.error('❌ Network Error:', error.message);
          }
          return Promise.reject(ErrorHandler.handleApiError(error, 'network'));
        }

        // Handle 401 Unauthorized
        if (error.response.status === 401 && !originalRequest._retry) {
          if (!this.requestQueue.getRefreshingStatus()) {
            this.requestQueue.setRefreshing(true);
            originalRequest._retry = true;

            try {
              const newToken = await this.refreshToken();
              TokenManager.setAccessToken(newToken);
              this.requestQueue.processQueue(newToken);

              // Retry the original request with new token
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.axiosInstance(originalRequest);
            } catch (refreshError) {
              // Refresh failed, clear tokens and redirect to login
              TokenManager.clearTokens();
              this.requestQueue.rejectQueue(refreshError);
              
              // Redirect to login page
              if (typeof window !== 'undefined') {
                window.location.href = '/login';
              }
              
              return Promise.reject(refreshError);
            } finally {
              this.requestQueue.setRefreshing(false);
            }
          } else {
            // Add request to queue while refreshing
            return new Promise((resolve, reject) => {
              this.requestQueue.addRequestToQueue(
                (token) => {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                  resolve(this.axiosInstance(originalRequest));
                },
                reject
              );
            });
          }
        }

        // Handle other errors
        const apiError = ErrorHandler.handleApiError(error, originalRequest.url);
        
        // Log error in development
        if (import.meta.env.DEV) {
          console.error(`❌ API Error: ${originalRequest.method?.toUpperCase()} ${originalRequest.url}`, {
            status: error.response.status,
            data: error.response.data,
            error: apiError,
          });
        }

        return Promise.reject(apiError);
      }
    );
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = TokenManager.getRefreshToken();
    
    if (!refreshToken) {
      throw new AuthError('No refresh token available', 'NO_REFRESH_TOKEN');
    }

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/refresh`,
        { refreshToken },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      const { data } = response.data;
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      TokenManager.setAccessToken(newAccessToken);
      if (newRefreshToken) {
        TokenManager.setRefreshToken(newRefreshToken);
      }

      return newAccessToken;
    } catch (error) {
      throw new AuthError('Failed to refresh token', 'TOKEN_REFRESH_FAILED');
    }
  }

  private generateRequestId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // HTTP Methods with retry logic
  async get<T = any>(
    url: string, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url });
  }

  async post<T = any>(
    url: string, 
    data?: any, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, data });
  }

  async put<T = any>(
    url: string, 
    data?: any, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, data });
  }

  async patch<T = any>(
    url: string, 
    data?: any, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url, data });
  }

  async delete<T = any>(
    url: string, 
    config?: RequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>({ ...config, url });
  }

  // Generic request method with retry logic
  private async request<T = any>(
    config: RequestConfig & { url: string; method?: string }
  ): Promise<ApiResponse<T>> {
    const axiosConfig: AxiosRequestConfig = {
      method: config.method || 'GET',
      url: config.url,
      data: config.data,
      params: config.params,
      headers: config.headers,
      timeout: config.timeout || API_TIMEOUT,
    };

    // Apply retry logic for retryable errors
    const maxRetries = config.retries !== undefined ? config.retries : MAX_RETRIES;
    const retryDelay = config.retries !== undefined ? config.retries : RETRY_DELAY;

    return ErrorHandler.retryRequest(
      async () => {
        const response = await this.axiosInstance.request<ApiResponse<T>>(axiosConfig);
        return response.data;
      },
      `${config.method || 'GET'} ${config.url}`,
      maxRetries,
      retryDelay
    );
  }

  // Upload payment proof (orderId + proof file) to /payments/upload-proof
  async uploadPaymentProof(orderId: string, file: File, onProgress?: (progress: number) => void): Promise<ApiResponse<{ orderId: string; status: string }>> {
    const formData = new FormData();
    formData.append('orderId', orderId);
    formData.append('proof', file);

    const response = await this.axiosInstance.request({
      method: 'POST',
      url: '/payments/upload-proof',
      data: formData,
      timeout: 60000,
      onUploadProgress: onProgress ? (e) => onProgress(Math.round((e.loaded * 100) / (e.total || 1))) : undefined,
    });
    return response.data;
  }

  // File upload method (generic)
  async uploadFile(
    url: string,
    file: File,
    onProgress?: (progress: number) => void,
    config?: RequestConfig
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.request({
      ...config,
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: onProgress ? (progressEvent: { loaded: number; total?: number }) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / (progressEvent.total || 1)
        );
        onProgress(progress);
      } : undefined,
    } as RequestConfig & { url: string });
  }

  // Download method
  async download(
    url: string,
    filename?: string,
    config?: RequestConfig
  ): Promise<void> {
    const response = await this.axiosInstance.request({
      ...config,
      method: 'GET',
      url,
      responseType: 'blob',
    } as AxiosRequestConfig);

    // Create download link
    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch {
      return false;
    }
  }

  // Get base URL
  getBaseUrl(): string {
    return API_BASE_URL;
  }

  // Set base URL (useful for testing)
  setBaseUrl(url: string): void {
    this.axiosInstance.defaults.baseURL = url;
  }

  // Clear all tokens
  clearAuth(): void {
    TokenManager.clearTokens();
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    const token = TokenManager.getAccessToken();
    return token !== null && !TokenManager.isTokenExpired(token);
  }

  // Get current auth token
  getAuthToken(): string | null {
    return TokenManager.getAccessToken();
  }

  // Set auth tokens
  setAuthTokens(accessToken: string, refreshToken?: string): void {
    TokenManager.setAccessToken(accessToken);
    if (refreshToken) {
      TokenManager.setRefreshToken(refreshToken);
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export utilities
export { TokenManager, RequestQueue };

// Export default
export default apiClient;
