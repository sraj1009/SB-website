import mongoose from 'mongoose';

const ambassadorSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  ambassadorCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  tier: {
    type: String,
    enum: ['READER', 'ADVOCATE', 'LEADER', 'PARTNER'],
    default: 'READER'
  },
  status: {
    type: String,
    enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'TERMINATED'],
    default: 'PENDING'
  },
  
  // Performance metrics
  metrics: {
    totalReferrals: {
      type: Number,
      default: 0
    },
    activeReferrals: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    },
    totalSales: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    avgOrderValue: {
      type: Number,
      default: 0
    },
    socialShares: {
      type: Number,
      default: 0
    },
    contentCreated: {
      type: Number,
      default: 0
    }
  },
  
  // Earnings and commissions
  earnings: {
    currentBalance: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    totalWithdrawn: {
      type: Number,
      default: 0
    },
    pendingPayouts: {
      type: Number,
      default: 0
    },
    commissionRate: {
      type: Number,
      default: 15 // 15% base commission
    },
    bonusEarnings: {
      type: Number,
      default: 0
    }
  },
  
  // Tier requirements and benefits
  tierRequirements: {
    currentTier: {
      type: String,
      default: 'READER'
    },
    nextTierProgress: {
      type: Number,
      default: 0
    },
    requirementsMet: {
      referrals: Number,
      sales: Number,
      earnings: Number,
      content: Number,
      engagement: Number
    }
  },
  
  // Profile information
  profile: {
    displayName: {
      type: String,
      required: true
    },
    bio: {
      type: String,
      maxlength: 500
    },
    profileImage: {
      type: String
    },
    socialLinks: {
      instagram: String,
      youtube: String,
      twitter: String,
      blog: String,
      facebook: String
    },
    niche: {
      type: String,
      enum: ['Tamil Literature', 'Education', 'Parenting', 'Sustainable Living', 'Local Culture', 'Book Reviews']
    },
    audience: {
      size: Number,
      demographics: String,
      engagement: String
    }
  },
  
  // Marketing materials
  marketingKit: {
    referralLink: {
      type: String,
      required: true
    },
    discountCode: {
      type: String,
      required: true
    },
    customLinks: [{
      name: String,
      url: String,
      clicks: Number,
      conversions: Number
    }],
    brandedAssets: [{
      type: {
        type: String,
        enum: ['logo', 'banner', 'social_media_template', 'email_template']
      },
      url: String,
      description: String
    }],
    contentGuidelines: String
  },
  
  // Activity tracking
  activity: {
    lastLogin: {
      type: Date,
      default: Date.now
    },
    lastReferral: {
      type: Date
    },
    lastPayout: {
      type: Date
    },
    monthlyStats: [{
      month: String,
      year: Number,
      referrals: Number,
      sales: Number,
      earnings: Number,
      conversionRate: Number
    }]
  },
  
  // Benefits and rewards
  benefits: {
    earlyAccess: {
      type: Boolean,
      default: false
    },
    exclusiveEvents: {
      type: Boolean,
      default: false
    },
    higherCommission: {
      type: Boolean,
      default: false
    },
    personalManager: {
      type: Boolean,
      default: false
    },
    freeProducts: {
      type: Boolean,
      default: false
    },
    trainingAccess: {
      type: Boolean,
      default: false
    }
  },
  
  // Application details
  application: {
    submittedAt: {
      type: Date,
      default: Date.now
    },
    approvedAt: Date,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: String,
    notes: String
  },
  
  // Compliance and terms
  compliance: {
    termsAccepted: {
      type: Boolean,
      default: false
    },
    termsAcceptedAt: Date,
    taxInfoProvided: {
      type: Boolean,
      default: false
    },
    payoutMethod: {
      type: String,
      enum: ['bank_transfer', 'paypal', 'upi', 'gift_cards']
    },
    payoutDetails: {
      type: mongoose.Schema.Types.Mixed
    }
  }
}, {
  timestamps: true
});

// Tier definitions
const TIER_REQUIREMENTS = {
  READER: {
    name: 'Reader',
    minReferrals: 0,
    minSales: 0,
    minEarnings: 0,
    commissionRate: 15,
    benefits: ['Basic commission', 'Referral tracking']
  },
  ADVOCATE: {
    name: 'Advocate',
    minReferrals: 10,
    minSales: 5000,
    minEarnings: 750,
    commissionRate: 20,
    benefits: ['Higher commission', 'Early access', 'Monthly newsletter']
  },
  LEADER: {
    name: 'Leader',
    minReferrals: 50,
    minSales: 25000,
    minEarnings: 5000,
    commissionRate: 25,
    benefits: ['Premium commission', 'Exclusive events', 'Personal manager', 'Free products']
  },
  PARTNER: {
    name: 'Partner',
    minReferrals: 200,
    minSales: 100000,
    minEarnings: 25000,
    commissionRate: 30,
    benefits: ['Maximum commission', 'Co-branded products', 'Revenue sharing', 'Strategic input']
  }
};

// Virtual fields
ambassadorSchema.virtual('tierDetails').get(function() {
  return TIER_REQUIREMENTS[this.tier];
});

ambassadorSchema.virtual('tierProgress').get(function() {
  const currentTier = TIER_REQUIREMENTS[this.tier];
  const nextTierKeys = Object.keys(TIER_REQUIREMENTS);
  const currentIndex = nextTierKeys.indexOf(this.tier);
  
  if (currentIndex >= nextTierKeys.length - 1) {
    return { progress: 100, nextTier: null };
  }
  
  const nextTier = TIER_REQUIREMENTS[nextTierKeys[currentIndex + 1]];
  const progress = Math.min(100, (
    (this.metrics.totalReferrals / nextTier.minReferrals) * 25 +
    (this.metrics.totalSales / nextTier.minSales) * 25 +
    (this.metrics.totalEarnings / nextTier.minEarnings) * 50
  ));
  
  return { progress, nextTier: nextTierKeys[currentIndex + 1] };
});

ambassadorSchema.virtual('performanceScore').get(function() {
  const referralScore = Math.min(100, (this.metrics.totalReferrals / 10) * 100);
  const salesScore = Math.min(100, (this.metrics.totalSales / 10000) * 100);
  const earningsScore = Math.min(100, (this.metrics.totalEarnings / 1000) * 100);
  const engagementScore = Math.min(100, (this.metrics.socialShares / 50) * 100);
  
  return (referralScore + salesScore + earningsScore + engagementScore) / 4;
});

// Methods
ambassadorSchema.methods.generateReferralCode = function() {
  if (!this.ambassadorCode) {
    const prefix = 'SB';
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    this.ambassadorCode = `${prefix}${random}`;
  }
  return this.ambassadorCode;
};

ambassadorSchema.methods.generateReferralLink = function() {
  const baseUrl = process.env.FRONTEND_URL || 'https://singglebee.com';
  return `${baseUrl}/ref/${this.ambassadorCode}`;
};

ambassadorSchema.methods.generateDiscountCode = function() {
  if (!this.marketingKit.discountCode) {
    this.marketingKit.discountCode = `${this.ambassadorCode}10`; // 10% discount
  }
  return this.marketingKit.discountCode;
};

ambassadorSchema.methods.addReferral = function(referralData) {
  this.metrics.totalReferrals += 1;
  
  if (referralData.converted) {
    this.metrics.activeReferrals += 1;
    this.metrics.totalSales += referralData.orderAmount;
    
    const commission = referralData.orderAmount * (this.earnings.commissionRate / 100);
    this.earnings.currentBalance += commission;
    this.earnings.totalEarned += commission;
  }
  
  this.activity.lastReferral = new Date();
  return this.save();
};

ambassadorSchema.methods.updateTier = function() {
  const tiers = ['READER', 'ADVOCATE', 'LEADER', 'PARTNER'];
  const currentIndex = tiers.indexOf(this.tier);
  
  for (let i = currentIndex + 1; i < tiers.length; i++) {
    const tierName = tiers[i];
    const requirements = TIER_REQUIREMENTS[tierName];
    
    if (this.metrics.totalReferrals >= requirements.minReferrals &&
        this.metrics.totalSales >= requirements.minSales &&
        this.metrics.totalEarnings >= requirements.minEarnings) {
      
      this.tier = tierName;
      this.earnings.commissionRate = requirements.commissionRate;
      
      // Add tier upgrade bonus
      const bonusAmount = this.earnings.totalEarned * 0.05; // 5% bonus
      this.earnings.bonusEarnings += bonusAmount;
      this.earnings.currentBalance += bonusAmount;
      
      // Update benefits
      this.benefits = {
        earlyAccess: requirements.benefits.includes('Early access'),
        exclusiveEvents: requirements.benefits.includes('Exclusive events'),
        higherCommission: requirements.benefits.includes('Higher commission'),
        personalManager: requirements.benefits.includes('Personal manager'),
        freeProducts: requirements.benefits.includes('Free products'),
        trainingAccess: requirements.benefits.includes('Training access')
      };
      
      break;
    }
  }
  
  return this.save();
};

ambassadorSchema.methods.processPayout = function(amount) {
  if (amount > this.earnings.currentBalance) {
    throw new Error('Insufficient balance for payout');
  }
  
  this.earnings.currentBalance -= amount;
  this.earnings.totalWithdrawn += amount;
  this.earnings.pendingPayouts += amount;
  this.activity.lastPayout = new Date();
  
  return this.save();
};

ambassadorSchema.methods.trackSocialShare = function(platform, content) {
  this.metrics.socialShares += 1;
  this.activity.lastLogin = new Date();
  
  // In production, track actual social media engagement
  return this.save();
};

ambassadorSchema.methods.getMonthlyStats = function(month, year) {
  const monthlyStat = this.activity.monthlyStats.find(stat => 
    stat.month === month && stat.year === year
  );
  
  if (!monthlyStat) {
    const newStat = {
      month,
      year,
      referrals: 0,
      sales: 0,
      earnings: 0,
      conversionRate: 0
    };
    this.activity.monthlyStats.push(newStat);
    return newStat;
  }
  
  return monthlyStat;
};

ambassadorSchema.methods.updateMonthlyStats = function(month, year, stats) {
  const monthlyStat = this.getMonthlyStats(month, year);
  
  Object.assign(monthlyStat, stats);
  
  // Calculate conversion rate
  if (this.metrics.totalReferrals > 0) {
    monthlyStat.conversionRate = (monthlyStat.referrals / this.metrics.totalReferrals) * 100;
  }
  
  return this.save();
};

// Static methods
ambassadorSchema.statics.generateAmbassadorCode = function() {
  const prefix = 'SB';
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

ambassadorSchema.statics.getTopPerformers = async function(limit = 10, timeframe = 'monthly') {
  const dateFilter = new Date();
  
  if (timeframe === 'monthly') {
    dateFilter.setMonth(dateFilter.getMonth() - 1);
  } else if (timeframe === 'quarterly') {
    dateFilter.setMonth(dateFilter.getMonth() - 3);
  } else if (timeframe === 'yearly') {
    dateFilter.setFullYear(dateFilter.getFullYear() - 1);
  }
  
  return this.find({ 
    status: 'ACTIVE',
    'activity.lastReferral': { $gte: dateFilter }
  })
  .sort({ 'earnings.totalEarned': -1 })
  .limit(limit)
  .populate('userId', 'name email profileImage')
  .select('userId profile.displayName tier metrics earnings');
};

ambassadorSchema.statics.getTierStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$tier',
        count: { $sum: 1 },
        totalEarnings: { $sum: '$earnings.totalEarned' },
        totalReferrals: { $sum: '$metrics.totalReferrals' },
        totalSales: { $sum: '$metrics.totalSales' },
        avgEarnings: { $avg: '$earnings.totalEarned' }
      }
    },
    {
      $sort: { _id: 1 }
    }
  ]);
  
  return stats.map(stat => ({
    tier: stat._id,
    details: TIER_REQUIREMENTS[stat._id],
    count: stat.count,
        totalEarnings: stat.totalEarnings,
        totalReferrals: stat.totalReferrals,
        totalSales: stat.totalSales,
        avgEarnings: stat.avgEarnings
  }));
};

ambassadorSchema.statics.getProgramStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalAmbassadors: { $sum: 1 },
        activeAmbassadors: {
          $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
        },
        totalEarnings: { $sum: '$earnings.totalEarned' },
        totalReferrals: { $sum: '$metrics.totalReferrals' },
        totalSales: { $sum: '$metrics.totalSales' },
        avgPerformanceScore: { $avg: { $add: [
          { $multiply: [{ $divide: ['$metrics.totalReferrals', 10] }, 25] },
          { $multiply: [{ $divide: ['$metrics.totalSales', 10000] }, 25] },
          { $multiply: [{ $divide: ['$earnings.totalEarned', 1000] }, 50] }
        ]}}
      }
    }
  ]);
  
  return stats[0] || {
    totalAmbassadors: 0,
    activeAmbassadors: 0,
    totalEarnings: 0,
    totalReferrals: 0,
    totalSales: 0,
    avgPerformanceScore: 0
  };
};

// Pre-save middleware
ambassadorSchema.pre('save', function(next) {
  if (!this.ambassadorCode) {
    this.generateReferralCode();
  }
  
  if (!this.marketingKit.referralLink) {
    this.generateReferralLink();
  }
  
  if (!this.marketingKit.discountCode) {
    this.generateDiscountCode();
  }
  
  // Update tier based on performance
  if (this.isModified('metrics.totalReferrals') || 
      this.isModified('metrics.totalSales') || 
      this.isModified('earnings.totalEarned')) {
    this.updateTier();
  }
  
  next();
});

const Ambassador = mongoose.model('Ambassador', ambassadorSchema);

export { Ambassador, TIER_REQUIREMENTS };
