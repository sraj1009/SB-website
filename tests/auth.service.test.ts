// Unit Tests for Authentication Service

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../services/auth.service';
import { apiClient } from '../services/api-client';
import { AuthError, ValidationError } from '../utils/error-handler';

// Mock the api client
vi.mock('../services/api-client', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
    setAuthTokens: vi.fn(),
    clearAuth: vi.fn(),
    isAuthenticated: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!',
        phone: '9876543210',
      };

      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            fullName: 'Test User',
            email: 'test@example.com',
            phone: '9876543210',
            role: 'user',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.register(userData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signup', userData);
      expect(apiClient.setAuthTokens).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'singglebee_user',
        JSON.stringify(mockResponse.data.user)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle registration errors', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const mockError = new Error('Email already exists');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.register(userData)).rejects.toThrow('Email already exists');
    });

    it('should validate registration data', async () => {
      const invalidUserData = {
        fullName: '', // Invalid
        email: 'invalid-email', // Invalid
        password: '123', // Invalid
      };

      await expect(authService.register(invalidUserData)).rejects.toThrow(ValidationError);
    });
  });

  describe('login', () => {
    it('should successfully login a user', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const mockResponse = {
        success: true,
        data: {
          user: {
            id: '1',
            fullName: 'Test User',
            email: 'test@example.com',
            role: 'user',
          },
          accessToken: 'mock-access-token',
          refreshToken: 'mock-refresh-token',
        },
      };

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.login(credentials);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/signin', credentials);
      expect(apiClient.setAuthTokens).toHaveBeenCalledWith(
        'mock-access-token',
        'mock-refresh-token'
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'singglebee_user',
        JSON.stringify(mockResponse.data.user)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle login errors', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const mockError = new Error('Invalid credentials');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid credentials');
    });

    it('should validate login credentials', async () => {
      const invalidCredentials = {
        email: 'invalid-email',
        password: '',
      };

      await expect(authService.login(invalidCredentials)).rejects.toThrow(ValidationError);
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/logout');
      expect(apiClient.clearAuth).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('singglebee_user');
    });

    it('should clear local data even if API call fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('API Error'));

      await authService.logout();

      expect(apiClient.clearAuth).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('singglebee_user');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user profile', async () => {
      const mockResponse = {
        success: true,
        data: {
          id: '1',
          fullName: 'Test User',
          email: 'test@example.com',
          role: 'user',
        },
      };

      vi.mocked(apiClient.get).mockResolvedValue(mockResponse);

      const result = await authService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/auth/me');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'singglebee_user',
        JSON.stringify(mockResponse.data)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle get current user errors', async () => {
      const mockError = new Error('Unauthorized');
      vi.mocked(apiClient.get).mockRejectedValue(mockError);

      await expect(authService.getCurrentUser()).rejects.toThrow('Unauthorized');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const updateData = {
        fullName: 'Updated Name',
        phone: '9876543210',
      };

      const mockResponse = {
        success: true,
        data: {
          id: '1',
          fullName: 'Updated Name',
          email: 'test@example.com',
          phone: '9876543210',
          role: 'user',
        },
      };

      vi.mocked(apiClient.put).mockResolvedValue(mockResponse);

      const result = await authService.updateProfile(updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/auth/me', updateData);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'singglebee_user',
        JSON.stringify(mockResponse.data)
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle update profile errors', async () => {
      const updateData = { fullName: 'Updated Name' };
      const mockError = new Error('Update failed');
      vi.mocked(apiClient.put).mockRejectedValue(mockError);

      await expect(authService.updateProfile(updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('changePassword', () => {
    it('should successfully change password', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.changePassword(passwordData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/change-password', passwordData);
    });

    it('should handle change password errors', async () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
      };

      const mockError = new Error('Current password is incorrect');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.changePassword(passwordData)).rejects.toThrow(
        'Current password is incorrect'
      );
    });

    it('should validate password change data', async () => {
      const invalidPasswordData = {
        currentPassword: '',
        newPassword: '123', // Invalid
      };

      await expect(authService.changePassword(invalidPasswordData)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('requestPasswordReset', () => {
    it('should successfully request password reset', async () => {
      const email = 'test@example.com';
      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.requestPasswordReset(email);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/forgot-password', { email });
    });

    it('should handle password reset request errors', async () => {
      const email = 'nonexistent@example.com';
      const mockError = new Error('Email not found');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.requestPasswordReset(email)).rejects.toThrow('Email not found');
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const resetData = {
        token: 'reset-token',
        newPassword: 'NewPass123!',
      };

      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.resetPassword(resetData);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/reset-password', resetData);
    });

    it('should handle reset password errors', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'NewPass123!',
      };

      const mockError = new Error('Invalid token');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.resetPassword(resetData)).rejects.toThrow('Invalid token');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token', async () => {
      const mockResponse = {
        success: true,
        data: {
          accessToken: 'new-access-token',
          refreshToken: 'new-refresh-token',
        },
      };

      localStorageMock.getItem.mockReturnValue('old-refresh-token');
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      const result = await authService.refreshToken();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/refresh', {
        refreshToken: 'old-refresh-token',
      });
      expect(apiClient.setAuthTokens).toHaveBeenCalledWith('new-access-token', 'new-refresh-token');
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle refresh token errors', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      vi.mocked(apiClient.post).mockRejectedValue(new Error('No refresh token'));

      await expect(authService.refreshToken()).rejects.toThrow(AuthError);
      expect(apiClient.clearAuth).toHaveBeenCalled();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('singglebee_user');
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email', async () => {
      const token = 'verification-token';
      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.verifyEmail(token);

      expect(apiClient.post).toHaveBeenCalledWith('/auth/verify-email', { token });
    });

    it('should handle email verification errors', async () => {
      const token = 'invalid-token';
      const mockError = new Error('Invalid token');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.verifyEmail(token)).rejects.toThrow('Invalid token');
    });
  });

  describe('resendVerificationEmail', () => {
    it('should successfully resend verification email', async () => {
      const mockResponse = { success: true };
      vi.mocked(apiClient.post).mockResolvedValue(mockResponse);

      await authService.resendVerificationEmail();

      expect(apiClient.post).toHaveBeenCalledWith('/auth/resend-verification');
    });

    it('should handle resend verification errors', async () => {
      const mockError = new Error('Failed to resend');
      vi.mocked(apiClient.post).mockRejectedValue(mockError);

      await expect(authService.resendVerificationEmail()).rejects.toThrow('Failed to resend');
    });
  });

  describe('utility methods', () => {
    it('should return stored user', () => {
      const mockUser = {
        id: '1',
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = authService.getStoredUser();

      expect(localStorageMock.getItem).toHaveBeenCalledWith('singglebee_user');
      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid stored user', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json');

      const result = authService.getStoredUser();

      expect(result).toBeNull();
    });

    it('should return user role', () => {
      const mockUser = {
        id: '1',
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'admin',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = authService.getUserRole();

      expect(result).toBe('admin');
    });

    it('should check if user is admin', () => {
      const mockUser = {
        id: '1',
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'admin',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = authService.isAdmin();

      expect(result).toBe(true);
    });

    it('should check if email is verified', () => {
      const mockUser = {
        id: '1',
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'user',
        emailVerified: true,
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));

      const result = authService.isEmailVerified();

      expect(result).toBe(true);
    });

    it('should check authentication status', () => {
      vi.mocked(apiClient.isAuthenticated).mockReturnValue(true);

      const result = authService.isAuthenticated();

      expect(result).toBe(true);
    });

    it('should initialize auth from stored tokens', () => {
      const mockUser = {
        id: '1',
        fullName: 'Test User',
        email: 'test@example.com',
        role: 'user',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser));
      vi.mocked(apiClient.isAuthenticated).mockReturnValue(true);

      const result = authService.initializeAuth();

      expect(result).toEqual(mockUser);
    });
  });

  describe('validation methods', () => {
    it('should validate email correctly', () => {
      expect((authService as any).validateEmail('test@example.com')).toBe(true);
      expect((authService as any).validateEmail('invalid-email')).toBe(false);
      expect((authService as any).validateEmail('')).toBe(false);
    });

    it('should validate password correctly', () => {
      expect((authService as any).validatePassword('TestPass123!')).toBe(true);
      expect((authService as any).validatePassword('weak')).toBe(false);
      expect((authService as any).validatePassword('')).toBe(false);
    });

    it('should validate phone correctly', () => {
      expect((authService as any).validatePhone('9876543210')).toBe(true);
      expect((authService as any).validatePhone('123')).toBe(false);
      expect((authService as any).validatePhone('')).toBe(true); // Optional field
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const networkError = new Error('Network Error');
      networkError.name = 'NetworkError';
      vi.mocked(apiClient.post).mockRejectedValue(networkError);

      await expect(authService.register(userData)).rejects.toThrow('Network Error');
    });

    it('should handle API errors with proper error codes', async () => {
      const userData = {
        fullName: 'Test User',
        email: 'test@example.com',
        password: 'TestPass123!',
      };

      const apiError = {
        response: {
          data: {
            success: false,
            error: {
              code: 'EMAIL_EXISTS',
              message: 'Email already exists',
            },
          },
        },
      };

      vi.mocked(apiClient.post).mockRejectedValue(apiError);

      await expect(authService.register(userData)).rejects.toThrow('Email already exists');
    });
  });
});
