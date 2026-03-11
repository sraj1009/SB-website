import { z } from 'zod';

// Base validation schemas
export const baseSchemas = {
  // ObjectId validation
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),

  // Email validation with strict rules
  email: z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase(),

  // Password validation with security requirements
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // Phone number validation (Indian format)
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),

  // Name validation
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // Pagination validation
  pagination: z.object({
    page: z.coerce
      .number()
      .min(1, 'Page must be at least 1')
      .max(1000, 'Page cannot exceed 1000')
      .default(1),
    limit: z.coerce
      .number()
      .min(1, 'Limit must be at least 1')
      .max(100, 'Limit cannot exceed 100')
      .default(20),
  }),

  // Sort validation
  sort: z.object({
    sortBy: z
      .enum(['createdAt', 'updatedAt', 'name', 'price', 'rating'], 'Invalid sort field')
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc'], 'Invalid sort order').default('desc'),
  }),
};

// Authentication validation schemas
export const authSchemas = {
  // User registration
  register: z
    .object({
      name: baseSchemas.name,
      email: baseSchemas.email,
      password: baseSchemas.password,
      phone: baseSchemas.phone.optional(),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),

  // User login
  login: z.object({
    email: baseSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().default(false),
  }),

  // Password reset request
  forgotPassword: z.object({
    email: baseSchemas.email,
  }),

  // Password reset
  resetPassword: z
    .object({
      token: z.string().min(1, 'Reset token is required'),
      password: baseSchemas.password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),

  // Change password
  changePassword: z
    .object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: baseSchemas.password,
      confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }),

  // Refresh token
  refreshToken: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),
};

// Product validation schemas
export const productSchemas = {
  // Create product
  createProduct: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be less than 200 characters')
      .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Title contains invalid characters'),

    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(200, 'Name must be less than 200 characters'),

    author: z
      .string()
      .min(2, 'Author name must be at least 2 characters')
      .max(100, 'Author name must be less than 100 characters'),

    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must be less than 2000 characters'),

    price: z.number().min(0, 'Price cannot be negative').max(999999, 'Price cannot exceed 999,999'),

    category: z.enum(
      ['Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey'],
      'Invalid category'
    ),

    language: z
      .string()
      .min(2, 'Language must be at least 2 characters')
      .max(50, 'Language must be less than 50 characters'),

    stockQuantity: z
      .number()
      .min(0, 'Stock quantity cannot be negative')
      .max(10000, 'Stock quantity cannot exceed 10,000'),

    isbn: z
      .string()
      .regex(
        /^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/,
        'Invalid ISBN format'
      )
      .optional(),

    tags: z
      .array(z.string().max(50, 'Tag must be less than 50 characters'))
      .max(10, 'Maximum 10 tags allowed')
      .optional(),

    status: z.enum(['active', 'inactive', 'out_of_stock']).default('active'),

    bestseller: z.boolean().default(false),

    images: z
      .array(
        z.object({
          url: baseSchemas.url,
          alt: z.string().max(200, 'Alt text must be less than 200 characters'),
          isPrimary: z.boolean().default(false),
        })
      )
      .max(5, 'Maximum 5 images allowed')
      .optional(),
  }),

  // Update product
  updateProduct: z.object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title must be less than 200 characters')
      .optional(),

    name: z
      .string()
      .min(3, 'Name must be at least 3 characters')
      .max(200, 'Name must be less than 200 characters')
      .optional(),

    author: z
      .string()
      .min(2, 'Author name must be at least 2 characters')
      .max(100, 'Author name must be less than 100 characters')
      .optional(),

    description: z
      .string()
      .min(10, 'Description must be at least 10 characters')
      .max(2000, 'Description must be less than 2000 characters')
      .optional(),

    price: z
      .number()
      .min(0, 'Price cannot be negative')
      .max(999999, 'Price cannot exceed 999,999')
      .optional(),

    category: z
      .enum(['Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey'])
      .optional(),

    language: z
      .string()
      .min(2, 'Language must be at least 2 characters')
      .max(50, 'Language must be less than 50 characters')
      .optional(),

    stockQuantity: z
      .number()
      .min(0, 'Stock quantity cannot be negative')
      .max(10000, 'Stock quantity cannot exceed 10,000')
      .optional(),

    status: z.enum(['active', 'inactive', 'out_of_stock']).optional(),
    bestseller: z.boolean().optional(),
  }),

  // Product query parameters
  productQuery: z.object({
    ...baseSchemas.pagination.shape,
    ...baseSchemas.sort.shape,
    search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
    category: z
      .enum(['Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey'])
      .optional(),
    status: z.enum(['active', 'inactive', 'out_of_stock']).optional(),
    language: z.string().max(50, 'Language filter must be less than 50 characters').optional(),
    bestseller: z.coerce.boolean().optional(),
    minPrice: z.number().min(0, 'Minimum price cannot be negative').optional(),
    maxPrice: z.number().min(0, 'Maximum price cannot be negative').optional(),
  }),
};

// Order validation schemas
export const orderSchemas = {
  // Create order
  createOrder: z.object({
    items: z
      .array(
        z.object({
          productId: baseSchemas.objectId,
          quantity: z
            .number()
            .min(1, 'Quantity must be at least 1')
            .max(10, 'Quantity cannot exceed 10'),
          price: z.number().min(0, 'Price cannot be negative'),
        })
      )
      .min(1, 'At least one item is required')
      .max(50, 'Maximum 50 items allowed'),

    shippingAddress: z.object({
      street: z.string().min(5, 'Street address must be at least 5 characters').max(200),
      city: z.string().min(2, 'City must be at least 2 characters').max(50),
      state: z.string().min(2, 'State must be at least 2 characters').max(50),
      postalCode: z.string().regex(/^\d{6}$/, 'Invalid postal code'),
      country: z.string().min(2, 'Country must be at least 2 characters').max(50),
      phone: baseSchemas.phone,
    }),

    paymentMethod: z.enum(['cashfree', 'cod'], 'Invalid payment method'),

    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  }),

  // Order query parameters
  orderQuery: z.object({
    ...baseSchemas.pagination.shape,
    ...baseSchemas.sort.shape,
    status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
    startDate: z.string().datetime('Invalid start date').optional(),
    endDate: z.string().datetime('Invalid end date').optional(),
  }),

  // Order verification (admin)
  verifyOrder: z.object({
    status: z.enum(['processing', 'shipped', 'delivered', 'cancelled'], 'Invalid status'),
    rejectionReason: z
      .string()
      .max(500, 'Rejection reason must be less than 500 characters')
      .optional(),
    adminNotes: z.string().max(1000, 'Admin notes must be less than 1000 characters').optional(),
    trackingNumber: z
      .string()
      .max(100, 'Tracking number must be less than 100 characters')
      .optional(),
  }),
};

// User validation schemas
export const userSchemas = {
  // Update user profile
  updateProfile: z.object({
    name: baseSchemas.name.optional(),
    phone: baseSchemas.phone.optional(),
    email: baseSchemas.email.optional(),
  }),

  // User query parameters
  userQuery: z.object({
    ...baseSchemas.pagination.shape,
    ...baseSchemas.sort.shape,
    search: z.string().max(100, 'Search query must be less than 100 characters').optional(),
    role: z.enum(['user', 'admin']).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
  }),
};

// Payment validation schemas
export const paymentSchemas = {
  // Cashfree payment initiation
  initiatePayment: z.object({
    orderId: baseSchemas.objectId,
    amount: z
      .number()
      .min(1, 'Amount must be at least 1')
      .max(999999, 'Amount cannot exceed 999,999'),
    currency: z.enum(['INR'], 'Invalid currency').default('INR'),
    customerEmail: baseSchemas.email,
    customerPhone: baseSchemas.phone,
    customerName: baseSchemas.name,
  }),

  // Webhook verification
  webhookEvent: z.object({
    type: z.string(),
    data: z.object({
      orderId: baseSchemas.objectId,
      paymentId: z.string(),
      status: z.string(),
      amount: z.number(),
      currency: z.string(),
      timestamp: z.string(),
      signature: z.string(),
    }),
  }),
};

// Admin validation schemas
export const adminSchemas = {
  // Admin stats query
  statsQuery: z.object({
    period: z.enum(['day', 'week', 'month', 'quarter', 'year'], 'Invalid period').default('month'),
    startDate: z.string().datetime('Invalid start date').optional(),
    endDate: z.string().datetime('Invalid end date').optional(),
  }),
};

// Export all schemas
export const validationSchemas = {
  base: baseSchemas,
  auth: authSchemas,
  product: productSchemas,
  order: orderSchemas,
  user: userSchemas,
  payment: paymentSchemas,
  admin: adminSchemas,
};

export default validationSchemas;
