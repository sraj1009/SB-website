import mongoose from 'mongoose';

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    // For token rotation tracking
    replacedByToken: String,
    // Device/session info
    userAgent: String,
    ip: String
});

// Indexes
// refreshTokenSchema.index({ token: 1 }, { unique: true }); // Already defined in schema path
// refreshTokenSchema.index({ user: 1 }); // Already defined in schema path
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto delete expired

// Check if token is valid
refreshTokenSchema.methods.isValid = function () {
    return !this.isRevoked && this.expiresAt > new Date();
};

// Revoke token
refreshTokenSchema.methods.revoke = async function (replacedByToken = null) {
    this.isRevoked = true;
    if (replacedByToken) {
        this.replacedByToken = replacedByToken;
    }
    await this.save();
};

// Static: Revoke all tokens for a user (logout from all devices)
refreshTokenSchema.statics.revokeAllForUser = async function (userId) {
    await this.updateMany(
        { user: userId, isRevoked: false },
        { isRevoked: true }
    );
};

// Static: Clean up expired tokens (can be called periodically)
refreshTokenSchema.statics.cleanupExpired = async function () {
    const result = await this.deleteMany({
        expiresAt: { $lt: new Date() }
    });
    return result.deletedCount;
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;
