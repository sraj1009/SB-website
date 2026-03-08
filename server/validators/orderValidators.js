import Joi from 'joi';

/**
 * Create order validation schema
 */
export const createOrderSchema = Joi.object({
    items: Joi.array()
        .items(
            Joi.object({
                productId: Joi.string().required().messages({
                    'any.required': 'Product ID is required for each item'
                }),
                quantity: Joi.number().integer().min(1).required().messages({
                    'number.min': 'Quantity must be at least 1',
                    'any.required': 'Quantity is required'
                })
            })
        )
        .min(1)
        .required()
        .messages({
            'array.min': 'Order must have at least one item',
            'any.required': 'Items are required'
        }),

    shippingAddress: Joi.object({
        fullName: Joi.string().trim().required().messages({
            'any.required': 'Full name is required'
        }),
        phone: Joi.string().pattern(/^[0-9]{10}$/).required().messages({
            'string.pattern.base': 'Phone must be 10 digits',
            'any.required': 'Phone is required'
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Valid email is required',
            'any.required': 'Email is required'
        }),
        street: Joi.string().trim().required().messages({
            'any.required': 'Street address is required'
        }),
        landmark: Joi.string().trim().optional(),
        city: Joi.string().trim().required().messages({
            'any.required': 'City is required'
        }),
        state: Joi.string().trim().required().messages({
            'any.required': 'State is required'
        }),
        zipCode: Joi.string().pattern(/^[0-9]{6}$/).required().messages({
            'string.pattern.base': 'ZIP code must be 6 digits',
            'any.required': 'ZIP code is required'
        }),
        country: Joi.string().trim().default('India')
    }).required(),

    paymentMethod: Joi.string()
        .valid('cashfree', 'upi_manual')
        .default('upi_manual'),

    notes: Joi.string().trim().max(500).optional()
});

/**
 * Update order status validation schema (admin only)
 */
export const updateOrderStatusSchema = Joi.object({
    status: Joi.string()
        .valid('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled')
        .required()
        .messages({
            'any.only': 'Invalid order status',
            'any.required': 'Status is required'
        }),

    trackingNumber: Joi.string().trim().optional(),
    notes: Joi.string().trim().max(500).optional()
});

/**
 * Cancel order validation schema
 */
export const cancelOrderSchema = Joi.object({
    reason: Joi.string().trim().max(500).optional()
});

/**
 * Order query validation schema
 */
export const orderQuerySchema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled').optional(),
    paymentStatus: Joi.string().valid('pending', 'success', 'failed').optional(),
    sortBy: Joi.string().valid('createdAt', 'total', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    startDate: Joi.date().optional(),
    endDate: Joi.date().optional()
});

/**
 * Mark payment as complete (for manual verification)
 */
export const markPaymentSchema = Joi.object({
    transactionId: Joi.string().trim().optional(),
    proofUploaded: Joi.boolean().default(true)
});
