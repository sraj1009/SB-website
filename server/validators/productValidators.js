import Joi from 'joi';

const categories = ['Fiction', 'Self-Help', 'Technology', 'Sci-Fi', 'Business', 'Mystery',
    'Biography', 'Foods', 'Stationeries', 'Books', 'Poem Book', 'Story Book', 'All'];

const formats = ['Hardcover', 'Paperback', 'Kindle', 'Box', 'Pack', 'Jar', 'Set'];

/**
 * Create product validation schema
 */
export const createProductSchema = Joi.object({
    title: Joi.string()
        .trim()
        .max(200)
        .required()
        .messages({
            'string.empty': 'Product title is required',
            'string.max': 'Title cannot exceed 200 characters'
        }),

    description: Joi.string()
        .trim()
        .max(2000)
        .optional()
        .messages({
            'string.max': 'Description cannot exceed 2000 characters'
        }),

    author: Joi.string()
        .trim()
        .default('SINGGLEBEE'),

    price: Joi.number()
        .positive()
        .required()
        .messages({
            'number.base': 'Price must be a number',
            'number.positive': 'Price must be positive',
            'any.required': 'Price is required'
        }),

    discount: Joi.number()
        .min(0)
        .max(100)
        .default(0)
        .messages({
            'number.min': 'Discount cannot be negative',
            'number.max': 'Discount cannot exceed 100%'
        }),

    stockQuantity: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'Stock quantity must be a number',
            'number.min': 'Stock cannot be negative',
            'any.required': 'Stock quantity is required'
        }),

    sku: Joi.string()
        .uppercase()
        .trim()
        .optional(),

    category: Joi.string()
        .valid(...categories)
        .required()
        .messages({
            'any.only': 'Invalid category',
            'any.required': 'Category is required'
        }),

    images: Joi.array()
        .items(Joi.string().uri())
        .default([]),

    status: Joi.string()
        .valid('active', 'out_of_stock', 'disabled')
        .default('active'),

    bestseller: Joi.boolean().default(false),
    isComingSoon: Joi.boolean().default(false),

    language: Joi.string().trim().optional(),
    pages: Joi.number().integer().positive().optional(),
    format: Joi.string().valid(...formats).optional(),

    rating: Joi.number().min(0).max(5).default(0),
    reviewCount: Joi.number().integer().min(0).default(0),

    reviews: Joi.array().items(
        Joi.object({
            userName: Joi.string().required(),
            rating: Joi.number().min(1).max(5).required(),
            comment: Joi.string().trim().optional(),
            date: Joi.date().optional()
        })
    ).default([])
});

/**
 * Update product validation schema
 */
export const updateProductSchema = Joi.object({
    title: Joi.string().trim().max(200).optional(),
    description: Joi.string().trim().max(2000).optional(),
    author: Joi.string().trim().optional(),
    price: Joi.number().positive().optional(),
    discount: Joi.number().min(0).max(100).optional(),
    stockQuantity: Joi.number().integer().min(0).optional(),
    category: Joi.string().valid(...categories).optional(),
    images: Joi.array().items(Joi.string().uri()).optional(),
    status: Joi.string().valid('active', 'out_of_stock', 'disabled').optional(),
    bestseller: Joi.boolean().optional(),
    isComingSoon: Joi.boolean().optional(),
    language: Joi.string().trim().optional(),
    pages: Joi.number().integer().positive().optional(),
    format: Joi.string().valid(...formats).optional()
}).min(1).messages({
    'object.min': 'At least one field is required to update'
});

/**
 * Stock adjustment validation schema
 */
export const adjustStockSchema = Joi.object({
    quantity: Joi.number()
        .integer()
        .required()
        .messages({
            'number.base': 'Quantity must be a number',
            'any.required': 'Quantity is required'
        }),
    reason: Joi.string().trim().optional()
});

/**
 * Product query validation schema (for listing/filtering)
 */
export const productQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    category: Joi.string().valid(...categories).optional(),
    status: Joi.string().valid('active', 'out_of_stock', 'disabled').optional(),
    bestseller: Joi.boolean().optional(),
    search: Joi.string().trim().max(100).optional(),
    sortBy: Joi.string().valid('price', 'createdAt', 'title', 'rating').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    language: Joi.string().optional()
});
