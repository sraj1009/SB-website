import mongoose from 'mongoose';

/**
 * Password Reset Token Model
 * For secure password reset flow
 */
const passwordResetSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 60 * 60 * 1000) // 1 hour
    },
    isUsed: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for token lookup and TTL
// passwordResetSchema.index({ token: 1 }, { unique: true }); // Already defined in schema path
passwordResetSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired
// passwordResetSchema.index({ user: 1 }); // Already defined in schema path

// Check if token is valid
passwordResetSchema.methods.isValid = function () {
    return !this.isUsed && this.expiresAt > new Date();
};

// Mark as used
passwordResetSchema.methods.markUsed = async function () {
    this.isUsed = true;
    await this.save();
};

// Static: Invalidate all tokens for a user
passwordResetSchema.statics.invalidateAllForUser = async function (userId) {
    await this.updateMany(
        { user: userId, isUsed: false },
        { isUsed: true }
    );
};

const PasswordReset = mongoose.model('PasswordReset', passwordResetSchema);

export default PasswordReset;
