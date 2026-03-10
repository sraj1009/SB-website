import Joi from 'joi';

// Product creation validation schema
export const createProductSchema = Joi.object({
  title: Joi.string().required().min(1).max(200).messages({
    'string.empty': 'Product title is required',
    'string.max': 'Title cannot exceed 200 characters',
    'any.required': 'Product title is required',
  }),
  author: Joi.string().required().min(1).max(100).messages({
    'string.empty': 'Author is required',
    'any.required': 'Author is required',
  }),
  price: Joi.number().required().min(0).messages({
    'number.base': 'Price must be a number',
    'number.min': 'Price cannot be negative',
    'any.required': 'Price is required',
  }),
  category: Joi.string().required().valid('Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey').messages({
    'any.only': 'Invalid category selected',
    'any.required': 'Category is required',
  }),
  description: Joi.string().required().min(10).max(2000).messages({
    'string.empty': 'Description is required',
    'string.min': 'Description must be at least 10 characters',
    'string.max': 'Description cannot exceed 2000 characters',
    'any.required': 'Description is required',
  }),
  name: Joi.string().optional().max(200).allow(''),
  discount: Joi.number().optional().min(0).max(100).default(0),
  stockQuantity: Joi.number().required().min(0).messages({
    'number.base': 'Stock must be a number',
    'number.min': 'Stock cannot be negative',
    'any.required': 'Stock quantity is required',
  }),
  sku: Joi.string().optional().allow(''),
  language: Joi.string().required().valid('Tamil', 'English', 'Bilingual').messages({
    'any.only': 'Invalid language selected',
    'any.required': 'Language is required',
  }),
  pages: Joi.number().optional().min(1).allow(''),
  format: Joi.string().optional().valid('Hardcover', 'Paperback', 'Digital', 'Box', 'Pack', 'Jar', 'Set').allow(''),
  bestseller: Joi.boolean().optional().default(false),
  status: Joi.string().optional().valid('active', 'inactive', 'out_of_stock').default('active'),
  images: Joi.array().optional().items(
    Joi.object({
      url: Joi.string().required(),
      alt: Joi.string().optional().allow(''),
      isPrimary: Joi.boolean().optional().default(false),
    })
  ),
  image: Joi.string().optional().allow(''),
  adminNotes: Joi.string().optional().max(500).allow(''),
  costPrice: Joi.number().optional().min(0).allow(''),
});

// Product update validation schema
export const updateProductSchema = createProductSchema.fork(
  ['title', 'author', 'price', 'category', 'description', 'stockQuantity', 'language'],
  (schema) => schema.optional()
);

// Order verification validation schema
export const verifyOrderSchema = Joi.object({
  status: Joi.string().required().valid('verified', 'cancelled').messages({
    'any.only': 'Status must be either verified or cancelled',
    'any.required': 'Status is required',
  }),
  rejectionReason: Joi.when('status', {
    is: 'cancelled',
    then: Joi.string().required().min(5).max(500).messages({
      'string.empty': 'Rejection reason is required when cancelling order',
      'string.min': 'Rejection reason must be at least 5 characters',
      'any.required': 'Rejection reason is required',
    }),
    otherwise: Joi.string().optional().allow(''),
  }),
  adminNotes: Joi.string().optional().max(500).allow(''),
});

// Admin stats query validation
export const statsQuerySchema = Joi.object({
  period: Joi.string().optional().valid('today', 'week', 'month', 'year', 'all').default('month'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
});

// Product query validation for admin
export const adminProductQuerySchema = Joi.object({
  page: Joi.number().optional().min(1).default(1),
  limit: Joi.number().optional().min(1).max(100).default(20),
  search: Joi.string().optional().allow(''),
  category: Joi.string().optional().valid('Books', 'Poem Book', 'Story Book', 'Stationeries', 'Foods', 'Honey'),
  status: Joi.string().optional().valid('active', 'inactive', 'out_of_stock'),
  language: Joi.string().optional().valid('Tamil', 'English', 'Bilingual'),
  bestseller: Joi.boolean().optional(),
  sortBy: Joi.string().optional().valid('createdAt', 'title', 'price', 'stockQuantity', 'rating').default('createdAt'),
  sortOrder: Joi.string().optional().valid('asc', 'desc').default('desc'),
  includeDeleted: Joi.boolean().optional().default(false),
});

// Order query validation for admin
export const adminOrderQuerySchema = Joi.object({
  page: Joi.number().optional().min(1).default(1),
  limit: Joi.number().optional().min(1).max(100).default(20),
  status: Joi.string().optional().valid('pending', 'verified', 'shipped', 'delivered', 'cancelled'),
  paymentMethod: Joi.string().optional().valid('cashfree', 'upi_manual', 'cod'),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),
  search: Joi.string().optional().allow(''),
  sortBy: Joi.string().optional().valid('createdAt', 'total', 'status').default('createdAt'),
  sortOrder: Joi.string().optional().valid('asc', 'desc').default('desc'),
});

export default {
  createProductSchema,
  updateProductSchema,
  verifyOrderSchema,
  statsQuerySchema,
  adminProductQuerySchema,
  adminOrderQuerySchema,
};
