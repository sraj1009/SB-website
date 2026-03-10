// Authentication Service for SINGGLEBEE Frontend

import apiClient, { TokenManager } from './api-client';
import { 
  ApiResponse, 
  RegisterRequest, 
  LoginRequest, 
  AuthResponse, 
  TokenResponse, 
  UserProfile,
  ChangePasswordRequest,
  PasswordResetRequest,
  ResetPasswordRequest
} from '../types/api';
import { 
  AuthError, 
  ValidationError, 
  ErrorHandler,
  createError
} from '../utils/error-handler';

class AuthService {
  private static instance: AuthService;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signup', userData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Registration failed',
          response.error?.code || 'REGISTRATION_FAILED',
          400
        );
      }

      // Store tokens
      const { user, accessToken, refreshToken } = response.data;
      apiClient.setAuthTokens(accessToken, refreshToken);

      // Store user in localStorage for easy access
      localStorage.setItem('singglebee_user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'register');
    }
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/signin', credentials);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Login failed',
          response.error?.code || 'LOGIN_FAILED',
          401
        );
      }

      // Store tokens
      const { user, accessToken, refreshToken } = response.data;
      apiClient.setAuthTokens(accessToken, refreshToken);

      // Store user in localStorage for easy access
      localStorage.setItem('singglebee_user', JSON.stringify(user));

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'login');
    }
  }

  // Logout user
  async logout(): Promise<void> {
    try {
      // Call logout endpoint to invalidate refresh token on server
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Log error but don't throw - logout should always succeed locally
      if (import.meta.env?.DEV) {
        console.warn('Logout API call failed:', error);
      }
    } finally {
      // Clear local storage regardless of API call success
      this.clearLocalAuth();
    }
  }

  // Refresh access token
  async refreshToken(): Promise<TokenResponse> {
    try {
      const refreshToken = TokenManager.getRefreshToken();
      
      if (!refreshToken) {
        throw new AuthError('No refresh token available', 'NO_REFRESH_TOKEN');
      }

      const response = await apiClient.post<TokenResponse>('/auth/refresh', {
        refreshToken
      });
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Token refresh failed',
          response.error?.code || 'TOKEN_REFRESH_FAILED',
          401
        );
      }

      // Update access token
      const { accessToken, refreshToken: newRefreshToken } = response.data;
      apiClient.setAuthTokens(accessToken, newRefreshToken);

      return response.data;
    } catch (error) {
      // Clear tokens on refresh failure
      this.clearLocalAuth();
      throw ErrorHandler.handleApiError(error, 'refreshToken');
    }
  }

  // Get current user profile
  async getCurrentUser(): Promise<UserProfile> {
    try {
      const response = await apiClient.get<UserProfile>('/auth/me');
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to get user profile',
          response.error?.code || 'PROFILE_FETCH_FAILED',
          401
        );
      }

      // Update stored user data
      localStorage.setItem('singglebee_user', JSON.stringify(response.data));

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'getCurrentUser');
    }
  }

  // Update user profile
  async updateProfile(userData: Partial<UserProfile>): Promise<UserProfile> {
    try {
      const response = await apiClient.put<UserProfile>('/auth/me', userData);
      
      if (!response.success || !response.data) {
        throw createError(
          response.error?.message || 'Failed to update profile',
          response.error?.code || 'PROFILE_UPDATE_FAILED',
          400
        );
      }

      // Update stored user data
      localStorage.setItem('singglebee_user', JSON.stringify(response.data));

      return response.data;
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'updateProfile');
    }
  }

  // Change password
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post('/auth/change-password', passwordData);
      
      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to change password',
          response.error?.code || 'PASSWORD_CHANGE_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'changePassword');
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      
      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to request password reset',
          response.error?.code || 'PASSWORD_RESET_REQUEST_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'requestPasswordReset');
    }
  }

  // Reset password with token
  async resetPassword(resetData: ResetPasswordRequest): Promise<void> {
    try {
      const response = await apiClient.post('/auth/reset-password', resetData);
      
      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to reset password',
          response.error?.code || 'PASSWORD_RESET_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'resetPassword');
    }
  }

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    try {
      const response = await apiClient.post('/auth/verify-email', { token });
      
      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to verify email',
          response.error?.code || 'EMAIL_VERIFICATION_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'verifyEmail');
    }
  }

  // Resend verification email
  async resendVerificationEmail(): Promise<void> {
    try {
      const response = await apiClient.post('/auth/resend-verification');
      
      if (!response.success) {
        throw createError(
          response.error?.message || 'Failed to resend verification email',
          response.error?.code || 'VERIFICATION_EMAIL_RESEND_FAILED',
          400
        );
      }
    } catch (error) {
      throw ErrorHandler.handleApiError(error, 'resendVerificationEmail');
    }
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  // Get stored user data
  getStoredUser(): UserProfile | null {
    try {
      const userStr = localStorage.getItem('singglebee_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  // Get user role
  getUserRole(): 'user' | 'admin' | null {
    const user = this.getStoredUser();
    return user?.role || null;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.getUserRole() === 'admin';
  }

  // Check if email is verified
  isEmailVerified(): boolean {
    const user = this.getStoredUser();
    return user?.emailVerified || false;
  }

  // Clear local authentication data
  private clearLocalAuth(): void {
    apiClient.clearAuth();
    localStorage.removeItem('singglebee_user');
  }

  // Initialize authentication from stored tokens
  initializeAuth(): UserProfile | null {
    if (this.isAuthenticated()) {
      return this.getStoredUser();
    }
    return null;
  }

  // Validate user input
  private validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private validatePassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private validatePhone(phone: string): boolean {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(phone);
  }

  // Validate registration data
  validateRegistrationData(userData: RegisterRequest): void {
    const errors: string[] = [];

    if (!userData.fullName || userData.fullName.trim().length < 2) {
      errors.push('Full name must be at least 2 characters long');
    }

    if (!userData.email || !this.validateEmail(userData.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!userData.password || !this.validatePassword(userData.password)) {
      errors.push('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
    }

    if (userData.phone && !this.validatePhone(userData.phone)) {
      errors.push('Phone number must be exactly 10 digits');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate login data
  validateLoginData(credentials: LoginRequest): void {
    const errors: string[] = [];

    if (!credentials.email || !this.validateEmail(credentials.email)) {
      errors.push('Please enter a valid email address');
    }

    if (!credentials.password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Validate password change data
  validatePasswordChangeData(passwordData: ChangePasswordRequest): void {
    const errors: string[] = [];

    if (!passwordData.currentPassword) {
      errors.push('Current password is required');
    }

    if (!passwordData.newPassword || !this.validatePassword(passwordData.newPassword)) {
      errors.push('New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.push('New password must be different from current password');
    }

    if (errors.length > 0) {
      throw new ValidationError(errors.join(', '));
    }
  }

  // Update user data in localStorage
  updateStoredUser(userData: Partial<UserProfile>): void {
    const currentUser = this.getStoredUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...userData };
      localStorage.setItem('singglebee_user', JSON.stringify(updatedUser));
    }
  }

  // Get auth headers for external requests
  getAuthHeaders(): Record<string, string> {
    const token = TokenManager.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Handle authentication state changes
  onAuthStateChange(callback: (user: UserProfile | null) => void): () => void {
    // Initial check
    callback(this.getStoredUser());

    // Listen for storage changes (for multi-tab support)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'singglebee_user') {
        callback(this.getStoredUser());
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Return cleanup function
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }
}

// Export singleton instance
export const authService = AuthService.getInstance();

// Export default
export default authService;
