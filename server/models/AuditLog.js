import mongoose from 'mongoose';

/**
 * Audit Log Model
 * Tracks all admin actions for accountability and security
 */
const auditLogSchema = new mongoose.Schema({
    action: {
        type: String,
        required: true,
        enum: [
            // User actions
            'USER_CREATED', 'USER_UPDATED', 'USER_BANNED', 'USER_UNBANNED', 'USER_DELETED',
            // Product actions
            'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_DELETED', 'STOCK_ADJUSTED',
            // Order actions
            'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED', 'PAYMENT_MARKED_COMPLETE',
            // Admin actions
            'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'SETTINGS_UPDATED',
            // Security actions
            'SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED', 'INVALID_TOKEN_ATTEMPT'
        ]
    },
    actor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    actorEmail: {
        type: String,
        required: true
    },
    actorRole: {
        type: String,
        enum: ['user', 'admin'],
        required: true
    },
    targetType: {
        type: String,
        enum: ['User', 'Product', 'Order', 'Settings', 'System']
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId
    },
    targetIdentifier: {
        type: String // Human-readable identifier (email, orderId, SKU, etc.)
    },
    details: {
        type: mongoose.Schema.Types.Mixed, // Flexible object for action-specific data
        default: {}
    },
    previousValues: {
        type: mongoose.Schema.Types.Mixed // For tracking changes
    },
    newValues: {
        type: mongoose.Schema.Types.Mixed
    },
    ipAddress: String,
    userAgent: String,
    success: {
        type: Boolean,
        default: true
    },
    errorMessage: String
}, {
    timestamps: true,
    capped: { size: 104857600, max: 100000 } // 100MB cap, max 100k documents
});

// Indexes for querying
auditLogSchema.index({ action: 1 });
auditLogSchema.index({ actor: 1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ actorEmail: 1 });

// Static: Log an action
auditLogSchema.statics.log = async function ({
    action,
    actor,
    targetType = null,
    targetId = null,
    targetIdentifier = null,
    details = {},
    previousValues = null,
    newValues = null,
    req = null,
    success = true,
    errorMessage = null
}) {
    try {
        const logEntry = {
            action,
            actor: actor._id || actor,
            actorEmail: actor.email || 'system',
            actorRole: actor.role || 'admin',
            targetType,
            targetId,
            targetIdentifier,
            details,
            previousValues,
            newValues,
            success,
            errorMessage
        };

        if (req) {
            logEntry.ipAddress = req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
            logEntry.userAgent = req.headers['user-agent'];
        }

        await this.create(logEntry);
    } catch (error) {
        // Don't fail the main operation if logging fails
        console.error('Audit log error:', error.message);
    }
};

// Static: Get logs for a specific target
auditLogSchema.statics.getTargetHistory = function (targetType, targetId, limit = 50) {
    return this.find({ targetType, targetId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('actor', 'fullName email')
        .lean();
};

// Static: Get logs by actor
auditLogSchema.statics.getActorLogs = function (actorId, limit = 100) {
    return this.find({ actor: actorId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

// Static: Get recent admin actions
auditLogSchema.statics.getRecentAdminActions = function (limit = 50) {
    return this.find({ actorRole: 'admin' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('actor', 'fullName email')
        .lean();
};

// Static: Get security-related logs
auditLogSchema.statics.getSecurityLogs = function (limit = 100) {
    return this.find({
        action: { $in: ['SUSPICIOUS_ACTIVITY', 'RATE_LIMIT_EXCEEDED', 'INVALID_TOKEN_ATTEMPT', 'USER_BANNED'] }
    })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean();
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

export default AuditLog;
