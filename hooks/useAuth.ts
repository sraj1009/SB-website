// React Query hooks for Authentication

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authService } from '../services/auth.service';
import {
  RegisterRequest,
  LoginRequest,
  UserProfile,
  ChangePasswordRequest,
  PasswordResetRequest,
  ResetPasswordRequest,
} from '../types/api';
import { toast } from 'react-toastify';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
  current: () => [...authKeys.user(), 'current'] as const,
};

// Get current user
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.current(),
    queryFn: () => authService.getCurrentUser(),
    enabled: authService.isAuthenticated(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// Register mutation
export function useRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authService.register(userData),
    onSuccess: (data) => {
      toast.success('Account created successfully! Welcome to SINGGLEBEE! 🐝');
      queryClient.setQueryData(authKeys.current(), data.user);
    },
    onError: (error) => {
      const message = error.message || 'Registration failed';
      toast.error(message);
    },
  });
}

// Login mutation
export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      toast.success(`Welcome back, ${data.user.fullName}! 🐝`);
      queryClient.setQueryData(authKeys.current(), data.user);
    },
    onError: (error) => {
      const message = error.message || 'Login failed';
      toast.error(message);
    },
  });
}

// Logout mutation
export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      toast.success('Logged out successfully');
      queryClient.setQueryData(authKeys.current(), null);
      // Clear all query cache
      queryClient.clear();
    },
    onError: (error) => {
      const message = error.message || 'Logout failed';
      toast.error(message);
    },
  });
}

// Refresh token mutation
export function useRefreshToken() {
  return useMutation({
    mutationFn: () => authService.refreshToken(),
    onError: (error) => {
      const message = error.message || 'Token refresh failed';
      toast.error(message);
    },
  });
}

// Update profile mutation
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: Partial<UserProfile>) => authService.updateProfile(userData),
    onSuccess: (updatedUser) => {
      toast.success('Profile updated successfully!');
      queryClient.setQueryData(authKeys.current(), updatedUser);
    },
    onError: (error) => {
      const message = error.message || 'Profile update failed';
      toast.error(message);
    },
  });
}

// Change password mutation
export function useChangePassword() {
  return useMutation({
    mutationFn: (passwordData: ChangePasswordRequest) => authService.changePassword(passwordData),
    onSuccess: () => {
      toast.success('Password changed successfully!');
    },
    onError: (error) => {
      const message = error.message || 'Password change failed';
      toast.error(message);
    },
  });
}

// Request password reset mutation
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => authService.requestPasswordReset(email),
    onSuccess: () => {
      toast.success('Password reset instructions sent to your email!');
    },
    onError: (error) => {
      const message = error.message || 'Password reset request failed';
      toast.error(message);
    },
  });
}

// Reset password mutation
export function useResetPassword() {
  return useMutation({
    mutationFn: (resetData: ResetPasswordRequest) =>
      authService.resetPassword(resetData.token, resetData.newPassword),
    onSuccess: () => {
      toast.success('Password reset successfully! You can now login with your new password.');
    },
    onError: (error) => {
      const message = error.message || 'Password reset failed';
      toast.error(message);
    },
  });
}

// Verify email mutation
export function useVerifyEmail() {
  return useMutation({
    mutationFn: (token: string) => authService.verifyEmail(token),
    onSuccess: () => {
      toast.success('Email verified successfully! 🎉');
    },
    onError: (error) => {
      const message = error.message || 'Email verification failed';
      toast.error(message);
    },
  });
}

// Resend verification email mutation
export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: () => authService.resendVerificationEmail(),
    onSuccess: () => {
      toast.success('Verification email sent! Please check your inbox.');
    },
    onError: (error) => {
      const message = error.message || 'Failed to resend verification email';
      toast.error(message);
    },
  });
}

// Custom hook for authentication state
export function useAuth() {
  const queryClient = useQueryClient();
  const userQuery = useCurrentUser();
  const logoutMutation = useLogout();

  const isAuthenticated = authService.isAuthenticated();
  const user = userQuery.data || authService.getStoredUser();
  const isAdmin = authService.isAdmin();
  const isEmailVerified = authService.isEmailVerified();

  const login = useLogin();
  const register = useRegister();
  const updateProfile = useUpdateProfile();

  return {
    // State
    user,
    isAuthenticated,
    isAdmin,
    isEmailVerified,
    isLoading: userQuery.isLoading,

    // Mutations
    login: login.mutateAsync,
    register: register.mutateAsync,
    logout: logoutMutation.mutateAsync,
    updateProfile: updateProfile.mutateAsync,

    // Query state
    isPending: login.isPending || register.isPending || logoutMutation.isPending,
    isError: login.isError || register.isError || logoutMutation.isError,
    error: login.error || register.error || logoutMutation.error,

    // Refetch
    refetch: userQuery.refetch,
  };
}

// Initialize auth on app start
export function useAuthInitializer() {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: authKeys.current(),
    queryFn: () => {
      const user = authService.initializeAuth();
      return user;
    },
    staleTime: Infinity,
    retry: false,
  });
}
