import { z } from 'zod';

// User registration schema
export const signupSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
  phone: z
    .string()
    .regex(/^[0-9]+$/, 'Phone must contain only numbers')
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone cannot exceed 15 digits')
    .optional(),
  address: z
    .object({
      street: z.string().trim().optional(),
      landmark: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      zipCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
});

// User sign-in schema
export const signinSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'Password is required'),
});

// Update profile schema
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters')
    .trim()
    .optional(),
  phone: z
    .string()
    .regex(/^[0-9]+$/, 'Phone must contain only numbers')
    .min(10, 'Phone must be at least 10 digits')
    .max(15, 'Phone cannot exceed 15 digits')
    .optional(),
  address: z
    .object({
      street: z.string().trim().optional(),
      landmark: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      zipCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase(),
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z
    .string()
    .min(1, 'Reset token is required'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/,
      'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    ),
});

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z
    .string()
    .min(1, 'Refresh token is required'),
});

// 2FA schemas
export const twoFactorSetupSchema = z.object({}); // No body required

export const twoFactorVerifySchema = z.object({
  token: z
    .string()
    .length(6, 'Token must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Token must contain only numbers'),
});

export const twoFactorDisableSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required'),
  token: z
    .string()
    .length(6, 'Token must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Token must contain only numbers'),
});

export const twoFactorLoginSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase(),
  token: z
    .string()
    .length(6, 'Token must be exactly 6 digits')
    .regex(/^[0-9]+$/, 'Token must contain only numbers'),
});
