// Centralized Error Handling for SINGGLEBEE API

// Custom Error Classes
export class ApiError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, code: string, statusCode: number = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

export class AuthError extends ApiError {
  constructor(message: string, code: string = 'AUTH_ERROR', details?: any) {
    super(message, code, 401, details);
    this.name = 'AuthError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, field?: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, { field, ...details });
    this.name = 'ValidationError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string = 'Network error occurred') {
    super(message, 'NETWORK_ERROR', 0);
    this.name = 'NetworkError';
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with id '${id}' not found` : `${resource} not found`;
    super(message, 'NOT_FOUND', 404, { resource, id });
    this.name = 'NotFoundError';
  }
}

export class PermissionError extends ApiError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = 'Too many requests', retryAfter?: number) {
    super(message, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

// Error Code Mapping
export const ERROR_CODES = {
  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',

  // Authentication Errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  NO_TOKEN: 'NO_TOKEN',
  TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED',

  // Validation Errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  REQUIRED_FIELD: 'REQUIRED_FIELD',

  // Resource Errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  RESOURCE_DELETED: 'RESOURCE_DELETED',

  // Permission Errors
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server Errors
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',

  // Business Logic Errors
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  ORDER_NOT_CANCELLABLE: 'ORDER_NOT_CANCELLABLE',
  COUPON_EXPIRED: 'COUPON_EXPIRED',
  COUPON_LIMIT_REACHED: 'COUPON_LIMIT_REACHED',

  // File Upload Errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
} as const;

// Error Message Mapping
export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: 'Network connection failed. Please check your internet connection.',
  [ERROR_CODES.TIMEOUT_ERROR]: 'Request timed out. Please try again.',
  [ERROR_CODES.CONNECTION_ERROR]: 'Unable to connect to the server. Please try again later.',
  
  [ERROR_CODES.UNAUTHORIZED]: 'You need to be logged in to access this resource.',
  [ERROR_CODES.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
  [ERROR_CODES.INVALID_TOKEN]: 'Invalid authentication token. Please log in again.',
  [ERROR_CODES.NO_TOKEN]: 'Authentication token is required.',
  [ERROR_CODES.TOKEN_REFRESH_FAILED]: 'Failed to refresh your session. Please log in again.',
  
  [ERROR_CODES.VALIDATION_ERROR]: 'Please check your input and try again.',
  [ERROR_CODES.INVALID_INPUT]: 'Invalid input provided.',
  [ERROR_CODES.REQUIRED_FIELD]: 'This field is required.',
  
  [ERROR_CODES.NOT_FOUND]: 'The requested resource was not found.',
  [ERROR_CODES.ALREADY_EXISTS]: 'This resource already exists.',
  [ERROR_CODES.RESOURCE_DELETED]: 'This resource has been deleted.',
  
  [ERROR_CODES.PERMISSION_DENIED]: 'You don\'t have permission to perform this action.',
  [ERROR_CODES.INSUFFICIENT_PERMISSIONS]: 'Insufficient permissions to access this resource.',
  
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please try again later.',
  
  [ERROR_CODES.INTERNAL_SERVER_ERROR]: 'An unexpected error occurred. Please try again.',
  [ERROR_CODES.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable. Please try again later.',
  [ERROR_CODES.DATABASE_ERROR]: 'Database error occurred. Please try again.',
  
  [ERROR_CODES.INSUFFICIENT_STOCK]: 'This product is out of stock.',
  [ERROR_CODES.PAYMENT_FAILED]: 'Payment failed. Please try again.',
  [ERROR_CODES.ORDER_NOT_CANCELLABLE]: 'This order cannot be cancelled.',
  [ERROR_CODES.COUPON_EXPIRED]: 'This coupon has expired.',
  [ERROR_CODES.COUPON_LIMIT_REACHED]: 'Coupon usage limit has been reached.',
  
  [ERROR_CODES.FILE_TOO_LARGE]: 'File size exceeds the maximum limit.',
  [ERROR_CODES.INVALID_FILE_TYPE]: 'Invalid file type.',
  [ERROR_CODES.UPLOAD_FAILED]: 'File upload failed. Please try again.',
} as const;

// Error Handler Class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private retryCount: Map<string, number> = new Map();
  private maxRetries: number = 3;
  private retryDelay: number = 1000; // 1 second base delay

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  // Handle API Response Errors
  static handleApiError(error: any, context?: string): ApiError {
    // Development logging
    if (import.meta.env.DEV) {
      console.error(`API Error [${context || 'Unknown'}]:`, error);
    }

    // Network errors
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return new NetworkError('Request timed out');
      }
      if (error.message === 'Network Error') {
        return new NetworkError('Network connection failed');
      }
      return new NetworkError(error.message || 'Unknown network error');
    }

    const { status, data } = error.response;
    const errorCode = data?.error?.code || 'UNKNOWN_ERROR';
    const errorMessage = data?.error?.message || 'An error occurred';
    const errorDetails = data?.error?.details;

    switch (status) {
      case 400:
        return new ValidationError(errorMessage, errorDetails?.field, errorDetails);
      
      case 401:
        if (errorCode === 'TOKEN_EXPIRED') {
          return new AuthError('Your session has expired. Please log in again.', errorCode);
        }
        return new AuthError(errorMessage, errorCode, errorDetails);
      
      case 403:
        return new PermissionError(errorMessage);
      
      case 404:
        return new NotFoundError('Resource', errorDetails?.resourceId);
      
      case 429:
        const retryAfter = error.response.headers['retry-after'];
        return new RateLimitError(errorMessage, retryAfter ? parseInt(retryAfter) : undefined);
      
      case 500:
      case 502:
      case 503:
      case 504:
        return new ApiError(errorMessage, errorCode, status, errorDetails);
      
      default:
        return new ApiError(errorMessage, errorCode, status, errorDetails);
    }
  }

  // Retry Logic with Exponential Backoff
  static async retryRequest<T>(
    requestFn: () => Promise<T>,
    context: string = 'request',
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    const handler = ErrorHandler.getInstance();
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;

        // Don't retry on certain errors
        if (error instanceof ValidationError || 
            error instanceof PermissionError || 
            error instanceof NotFoundError) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt);
        
        if (import.meta.env.DEV) {
          console.warn(`Retrying ${context} (attempt ${attempt + 1}/${maxRetries}) after ${delay}ms delay`);
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Throw the last error if all retries failed
    throw ErrorHandler.handleApiError(lastError, context);
  }

  // Get User-Friendly Error Message
  static getUserMessage(error: ApiError): string {
    // Return custom message if available
    if (error.message && !error.message.includes('undefined')) {
      return error.message;
    }

    // Return mapped message based on error code
    return ERROR_MESSAGES[error.code as keyof typeof ERROR_MESSAGES] || 
           'An unexpected error occurred. Please try again.';
  }

  // Check if Error is Retryable
  static isRetryable(error: ApiError): boolean {
    const retryableCodes = [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.TIMEOUT_ERROR,
      ERROR_CODES.CONNECTION_ERROR,
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      ERROR_CODES.SERVICE_UNAVAILABLE,
      ERROR_CODES.DATABASE_ERROR,
    ];

    return (retryableCodes as readonly string[]).includes(error.code);
  }

  // Log Error for Debugging
  static logError(error: ApiError, context?: string, additionalInfo?: any): void {
    if (import.meta.env.DEV) {
      console.group(`🚨 ${error.name} [${context || 'Unknown'}]`);
      console.error('Message:', error.message);
      console.error('Code:', error.code);
      console.error('Status:', error.statusCode);
      console.error('Details:', error.details);
      if (additionalInfo) {
        console.error('Additional Info:', additionalInfo);
      }
      console.error('Stack:', error.stack);
      console.groupEnd();
    }
  }

  // Create Error Toast Data
  static createToastData(error: ApiError): {
    type: 'error' | 'warning' | 'info';
    title: string;
    message: string;
  } {
    const message = this.getUserMessage(error);

    switch (error.code) {
      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
        return {
          type: 'warning',
          title: 'Slow Down!',
          message: error.details?.retryAfter 
            ? `Too many requests. Try again in ${error.details.retryAfter} seconds.`
            : 'Too many requests. Please try again later.'
        };
      
      case ERROR_CODES.TOKEN_EXPIRED:
        return {
          type: 'warning',
          title: 'Session Expired',
          message: 'Your session has expired. Please log in again.'
        };
      
      case ERROR_CODES.INSUFFICIENT_STOCK:
        return {
          type: 'error',
          title: 'Out of Stock',
          message: 'This product is currently out of stock.'
        };
      
      case ERROR_CODES.PAYMENT_FAILED:
        return {
          type: 'error',
          title: 'Payment Failed',
          message: 'Your payment could not be processed. Please try again.'
        };
      
      default:
        return {
          type: 'error',
          title: 'Error',
          message
        };
    }
  }

  // Clear Retry Counters
  static clearRetryCounters(): void {
    const handler = ErrorHandler.getInstance();
    handler.retryCount.clear();
  }
}

// Utility Functions
export const createError = (
  message: string, 
  code: string, 
  statusCode?: number, 
  details?: any
): ApiError => {
  return new ApiError(message, code, statusCode, details);
};

export const isNetworkError = (error: any): boolean => {
  return error instanceof NetworkError || 
         error.code === 'NETWORK_ERROR' || 
         error.code === 'ECONNABORTED' ||
         error.message === 'Network Error';
};

export const isAuthError = (error: any): boolean => {
  return error instanceof AuthError || 
         error.code === 'UNAUTHORIZED' || 
         error.code === 'TOKEN_EXPIRED' ||
         error.code === 'INVALID_TOKEN';
};

export const isValidationError = (error: any): boolean => {
  return error instanceof ValidationError || 
         error.code === 'VALIDATION_ERROR' ||
         error.code === 'INVALID_INPUT';
};

export const getErrorCode = (error: any): string => {
  return error.code || 'UNKNOWN_ERROR';
};

export const getErrorMessage = (error: any, fallback?: string): string => {
  return error.message || fallback || 'An error occurred';
};

// Export default instance
export default ErrorHandler;
