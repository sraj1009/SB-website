import mongoose from 'mongoose';

// Loyalty tier definitions
const LOYALTY_TIERS = {
  BRONZE: {
    name: 'Bronze',
    minSpend: 0,
    maxSpend: 4999,
    pointsMultiplier: 1,
    benefits: ['Basic points earning', 'Birthday rewards'],
    color: '#CD7F32'
  },
  SILVER: {
    name: 'Silver',
    minSpend: 5000,
    maxSpend: 14999,
    pointsMultiplier: 1.2,
    benefits: ['1.2x points', 'Free shipping on orders over ₹999', 'Early access to sales'],
    color: '#C0C0C0'
  },
  GOLD: {
    name: 'Gold',
    minSpend: 15000,
    maxSpend: 49999,
    pointsMultiplier: 1.5,
    benefits: ['1.5x points', 'Free shipping on all orders', 'Exclusive discounts', 'Priority support'],
    color: '#FFD700'
  },
  PLATINUM: {
    name: 'Platinum',
    minSpend: 50000,
    maxSpend: Infinity,
    pointsMultiplier: 2,
    benefits: ['2x points', 'Free shipping', 'Exclusive discounts', 'Priority support', 'Personal shopper', 'Annual gift'],
    color: '#E5E4E2'
  }
};

const loyaltyTransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['earn', 'redeem', 'expire', 'adjustment', 'bonus'],
    required: true
  },
  points: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  referenceId: {
    type: String, // Order ID, campaign ID, etc.
    required: false
  },
  referenceType: {
    type: String,
    enum: ['order', 'campaign', 'adjustment', 'bonus', 'birthday', 'referral'],
    required: false
  },
  expiresAt: {
    type: Date,
    required: false
  },
  balance: {
    type: Number,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

const loyaltyAccountSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  membershipNumber: {
    type: String,
    required: true,
    unique: true
  },
  tier: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'],
    default: 'BRONZE'
  },
  points: {
    current: {
      type: Number,
      default: 0,
      min: 0
    },
    earned: {
      type: Number,
      default: 0
    },
    redeemed: {
      type: Number,
      default: 0
    },
    expired: {
      type: Number,
      default: 0
    }
  },
  totalSpend: {
    type: Number,
    default: 0,
    min: 0
  },
  orderCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  tierUpgradedAt: {
    type: Date
  },
  birthday: {
    type: Date
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    }
  },
  rewards: {
    nextBirthdayReward: {
      type: Date
    },
    referralCount: {
      type: Number,
      default: 0
    },
    reviewsCount: {
      type: Number,
      default: 0
    }
  },
  subscription: {
    isActive: {
      type: Boolean,
      default: false
    },
    plan: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic'
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    },
    benefits: [{
      type: String
    }]
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'cancelled'],
    default: 'active'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for performance
loyaltyAccountSchema.index({ userId: 1 });
loyaltyAccountSchema.index({ membershipNumber: 1 });
loyaltyAccountSchema.index({ tier: 1 });
loyaltyAccountSchema.index({ 'points.current': 1 });
loyaltyAccountSchema.index({ totalSpend: 1 });
loyaltyAccountSchema.index({ lastActivityAt: 1 });

// Virtual fields
loyaltyAccountSchema.virtual('tierDetails').get(function() {
  return LOYALTY_TIERS[this.tier];
});

loyaltyAccountSchema.virtual('pointsToNextTier').get(function() {
  const currentTier = LOYALTY_TIERS[this.tier];
  if (this.tier === 'PLATINUM') return 0;
  
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tiers.indexOf(this.tier);
  const nextTier = tiers[currentIndex + 1];
  const nextTierDetails = LOYALTY_TIERS[nextTier];
  
  return Math.max(0, nextTierDetails.minSpend - this.totalSpend);
});

loyaltyAccountSchema.virtual('spendInCurrentTier').get(function() {
  const currentTier = LOYALTY_TIERS[this.tier];
  return this.totalSpend - currentTier.minSpend;
});

loyaltyAccountSchema.virtual('availablePoints').get(function() {
  return this.points.current;
});

loyaltyAccountSchema.virtual('memberSince').get(function() {
  return this.joinedAt;
});

// Methods
loyaltyAccountSchema.methods.addPoints = async function(points, description, referenceId = null, referenceType = 'order', metadata = {}) {
  const currentBalance = this.points.current;
  const newBalance = currentBalance + points;
  
  // Create transaction record
  const transaction = {
    type: 'earn',
    points,
    description,
    referenceId,
    referenceType,
    balance: newBalance,
    metadata
  };
  
  // Update account
  this.points.current = newBalance;
  this.points.earned += points;
  this.lastActivityAt = new Date();
  
  // Check for tier upgrade
  await this.checkTierUpgrade();
  
  return transaction;
};

loyaltyAccountSchema.methods.redeemPoints = async function(points, description, referenceId = null, referenceType = 'order', metadata = {}) {
  if (this.points.current < points) {
    throw new Error('Insufficient points balance');
  }
  
  const currentBalance = this.points.current;
  const newBalance = currentBalance - points;
  
  // Create transaction record
  const transaction = {
    type: 'redeem',
    points: -points,
    description,
    referenceId,
    referenceType,
    balance: newBalance,
    metadata
  };
  
  // Update account
  this.points.current = newBalance;
  this.points.redeemed += points;
  this.lastActivityAt = new Date();
  
  return transaction;
};

loyaltyAccountSchema.methods.checkTierUpgrade = async function() {
  const currentTier = this.tier;
  const tiers = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const currentIndex = tiers.indexOf(currentTier);
  
  // Check if user qualifies for higher tier
  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tierName = tiers[i];
    const tierDetails = LOYALTY_TIERS[tierName];
    
    if (this.totalSpend >= tierDetails.minSpend) {
      this.tier = tierName;
      this.tierUpgradedAt = new Date();
      
      // Add bonus points for tier upgrade
      const bonusPoints = 100 * (i + 1); // 100, 200, 300, 400 points
      await this.addPoints(
        bonusPoints,
        `Tier upgrade bonus: ${tierName}`,
        null,
        'bonus',
        { previousTier: currentTier, newTier: tierName }
      );
      
      break;
    }
  }
};

loyaltyAccountSchema.methods.calculatePointsEarned = function(orderAmount) {
  const tierDetails = LOYALTY_TIERS[this.tier];
  const basePoints = Math.floor(orderAmount); // ₹1 = 1 point
  return Math.floor(basePoints * tierDetails.pointsMultiplier);
};

loyaltyAccountSchema.methods.updateFromOrder = async function(order) {
  const orderAmount = order.finalAmount || order.totalAmount;
  const pointsEarned = this.calculatePointsEarned(orderAmount);
  
  // Update spending and order count
  this.totalSpend += orderAmount;
  this.orderCount += 1;
  this.lastActivityAt = new Date();
  
  // Add points
  await this.addPoints(
    pointsEarned,
    `Points earned from order ${order.orderId}`,
    order._id,
    'order',
    { orderAmount, orderId: order.orderId }
  );
  
  // Check tier upgrade
  await this.checkTierUpgrade();
  
  return pointsEarned;
};

loyaltyAccountSchema.methods.processBirthdayReward = async function() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const birthdayThisYear = new Date(this.birthday);
  birthdayThisYear.setFullYear(thisYear);
  
  // Check if birthday has passed this year and reward hasn't been given
  if (now >= birthdayThisYear && (!this.rewards.nextBirthdayReward || this.rewards.nextBirthdayReward < birthdayThisYear)) {
    const birthdayPoints = 500; // 500 points birthday bonus
    
    await this.addPoints(
      birthdayPoints,
      'Happy Birthday! 🎉',
      null,
      'birthday',
      { birthdayDate: this.birthday }
    );
    
    this.rewards.nextBirthdayReward = birthdayThisYear;
    this.lastActivityAt = new Date();
    
    return birthdayPoints;
  }
  
  return 0;
};

loyaltyAccountSchema.methods.getAvailableRewards = function() {
  const tierDetails = LOYALTY_TIERS[this.tier];
  const availableRewards = [];
  
  // Points-based rewards
  if (this.points.current >= 500) {
    availableRewards.push({
      type: 'discount',
      name: '₹50 Off',
      pointsCost: 500,
      value: 50,
      description: 'Get ₹50 off your next order'
    });
  }
  
  if (this.points.current >= 1000) {
    availableRewards.push({
      type: 'discount',
      name: '₹100 Off',
      pointsCost: 1000,
      value: 100,
      description: 'Get ₹100 off your next order'
    });
  }
  
  if (this.points.current >= 2500) {
    availableRewards.push({
      type: 'free_shipping',
      name: 'Free Shipping',
      pointsCost: 2500,
      value: 99,
      description: 'Free shipping on your next order'
    });
  }
  
  // Tier-based rewards
  if (this.tier !== 'BRONZE') {
    availableRewards.push({
      type: 'tier_benefit',
      name: `${tierDetails.name} Exclusive Access`,
      pointsCost: 0,
      value: 0,
      description: 'Early access to sales and new products'
    });
  }
  
  return availableRewards;
};

loyaltyAccountSchema.methods.getLTV = function() {
  // Simple LTV calculation based on historical data
  const avgOrderValue = this.orderCount > 0 ? this.totalSpend / this.orderCount : 0;
  const monthsActive = Math.max(1, Math.floor((Date.now() - this.joinedAt.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const monthlyFrequency = this.orderCount / monthsActive;
  
  // Project 12-month LTV
  return avgOrderValue * monthlyFrequency * 12;
};

// Static methods
loyaltyAccountSchema.statics.generateMembershipNumber = function() {
  const prefix = 'SB';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${random}`.toUpperCase();
};

loyaltyAccountSchema.statics.getTierStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalSpend: { $sum: '$totalSpend' },
        avgSpend: { $avg: '$totalSpend' },
        totalPoints: { $sum: '$points.current' },
        avgPoints: { $avg: '$points.current' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  return stats;
};

loyaltyAccountSchema.statics.getTopCustomers = async function(limit = 100) {
  return this.find({ status: 'active' })
    .sort({ totalSpend: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

// Pre-save middleware
loyaltyAccountSchema.pre('save', function(next) {
  if (this.isModified('totalSpend')) {
    this.lastActivityAt = new Date();
  }
  next();
});

const LoyaltyAccount = mongoose.model('LoyaltyAccount', loyaltyAccountSchema);
const LoyaltyTransaction = mongoose.model('LoyaltyTransaction', loyaltyTransactionSchema);

export { LoyaltyAccount, LoyaltyTransaction, LOYALTY_TIERS };
