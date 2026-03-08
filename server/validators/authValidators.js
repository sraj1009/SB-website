import Joi from 'joi';

// Password must have: 1 uppercase, 1 lowercase, 1 number, 1 special char, min 8 chars
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

/**
 * Signup validation schema
 */
export const signupSchema = Joi.object({
    fullName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Full name is required',
            'string.min': 'Full name must be at least 2 characters',
            'string.max': 'Full name cannot exceed 100 characters'
        }),

    email: Joi.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please enter a valid email address'
        }),

    password: Joi.string()
        .pattern(passwordPattern)
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.pattern.base': 'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character (@$!%*?&)'
        }),

    phone: Joi.string()
        .pattern(/^[0-9]{10}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Phone number must be exactly 10 digits'
        }),

    address: Joi.object({
        street: Joi.string().trim().max(200).optional(),
        landmark: Joi.string().trim().max(100).optional(),
        city: Joi.string().trim().max(50).optional(),
        state: Joi.string().trim().max(50).optional(),
        zipCode: Joi.string().pattern(/^[0-9]{6}$/).optional().messages({
            'string.pattern.base': 'ZIP code must be exactly 6 digits'
        }),
        country: Joi.string().trim().max(50).default('India')
    }).optional()
});

/**
 * Signin validation schema
 */
export const signinSchema = Joi.object({
    email: Joi.string()
        .email()
        .lowercase()
        .trim()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Please enter a valid email address'
        }),

    password: Joi.string()
        .min(8)
        .required()
        .messages({
            'string.empty': 'Password is required',
            'string.min': 'Password must be at least 8 characters'
        })
});

/**
 * Refresh token validation schema
 */
export const refreshTokenSchema = Joi.object({
    refreshToken: Joi.string()
        .required()
        .messages({
            'string.empty': 'Refresh token is required'
        })
});

/**
 * Logout validation schema
 */
export const logoutSchema = Joi.object({
    refreshToken: Joi.string()
        .optional()
});

/**
 * Update profile validation schema
 */
export const updateProfileSchema = Joi.object({
    fullName: Joi.string().trim().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^[0-9]{10}$/).optional().messages({
        'string.pattern.base': 'Phone number must be exactly 10 digits'
    }),
    address: Joi.object({
        street: Joi.string().trim().max(200).optional(),
        landmark: Joi.string().trim().max(100).optional(),
        city: Joi.string().trim().max(50).optional(),
        state: Joi.string().trim().max(50).optional(),
        zipCode: Joi.string().pattern(/^[0-9]{6}$/).optional(),
        country: Joi.string().trim().max(50).optional()
    }).optional()
});
