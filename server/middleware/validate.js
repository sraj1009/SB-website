/**
 * Validation middleware wrapper for Joi schemas
 */
const validate = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], {
            abortEarly: false, // Return all errors, not just the first
            stripUnknown: true, // Remove unknown fields
            convert: true // Convert types where possible
        });

        if (error) {
            const messages = error.details.map(detail => detail.message);
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: messages.join(', '),
                    details: error.details.map(d => ({
                        field: d.path.join('.'),
                        message: d.message
                    }))
                }
            });
        }

        // Replace request property with validated and sanitized value
        req[property] = value;
        next();
    };
};

export default validate;
