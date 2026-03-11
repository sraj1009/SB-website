import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { fieldEncryption } from 'mongoose-field-encryption';
import { encryptionService } from '../services/encryption.service.js';

const loginHistorySchema = new mongoose.Schema(
  {
    timestamp: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    street: { type: String, trim: true, encrypt: true },
    landmark: { type: String, trim: true, encrypt: true },
    city: { type: String, trim: true, encrypt: true },
    state: { type: String, trim: true, encrypt: true },
    zipCode: { type: String, trim: true, encrypt: true },
    country: { type: String, default: 'India', trim: true, encrypt: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email'],
      encrypt: true, // Field-level encryption
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      match: [
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])/,
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      ],
      select: false, // Don't return password by default
    },
    phone: {
      type: String,
      trim: true,
      minlength: [10, 'Phone must be at least 10 digits'],
      match: [/^[0-9]+$/, 'Phone must contain only numbers'],
      encrypt: true, // Field-level encryption
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: 'Role must be either user or admin',
      },
      default: 'user',
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'banned', 'suspended'],
        message: 'Invalid status value',
      },
      default: 'active',
    },
    address: addressSchema,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    lastLogin: Date,
    loginHistory: {
      type: [loginHistorySchema],
      default: [],
      select: false, // Don't return by default
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      select: false, // Never return by default
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Apply field-level encryption plugin
userSchema.plugin(fieldEncryption, {
  fields: ['email', 'phone', 'address.street', 'address.landmark', 'address.city', 'address.state', 'address.zipCode', 'address.country'],
  secret: process.env.ENCRYPTION_SECRET || 'default-secret-key',
  saltLength: 16,
  encryptMethod: (data, secret) => {
    return encryptionService.encryptForMongoose(data);
  },
  decryptMethod: (data, secret) => {
    return encryptionService.decryptFromMongoose(data);
  },
});

// Alias: fullName -> name (for API compatibility)
userSchema.virtual('fullName').get(function () {
  return this.name;
});

// Indexes for performance
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ email: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();

  try {
    // Generate salt with 12 rounds (strong but not too slow)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Update login history
userSchema.methods.recordLogin = async function (ip, userAgent) {
  this.lastLogin = new Date();

  // Keep only last 10 login records
  if (this.loginHistory.length >= 10) {
    this.loginHistory.shift();
  }

  this.loginHistory.push({
    timestamp: new Date(),
    ip: ip || 'unknown',
    userAgent: userAgent || 'unknown',
  });

  await this.save();
};

// Check if user can login
userSchema.methods.canLogin = function () {
  return this.status === 'active';
};

// Static method to check if email exists
userSchema.statics.emailExists = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

const User = mongoose.model('User', userSchema);

export default User;
