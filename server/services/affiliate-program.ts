// 🎯 Affiliate/Referral Program for SINGGLEBEE

interface Affiliate {
  id: string;
  userId: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'active' | 'suspended' | 'inactive';
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  commissionRate: number; // percentage
  customCommissionRate?: number;
  minimumPayout: number;
  paymentMethod: 'bank' | 'upi' | 'paypal';
  paymentDetails: {
    bankAccount?: {
      accountNumber: string;
      ifscCode: string;
      accountName: string;
    };
    upi?: {
      upiId: string;
      upiName: string;
    };
    paypal?: {
      email: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
  lastPayoutDate?: Date;
  totalEarnings: number;
  currentBalance: number;
  totalReferrals: number;
  activeReferrals: number;
  conversionRate: number;
  promoMaterials?: string[];
}

interface Referral {
  id: string;
  affiliateId: string;
  referredUserId?: string;
  referralCode: string;
  referredEmail?: string;
  referredPhone?: string;
  status: 'pending' | 'registered' | 'converted' | 'expired';
  conversionDate?: Date;
  registrationDate?: Date;
  expiryDate: Date;
  commissionEarned: number;
  firstOrderAmount?: number;
  trackingParams?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface Commission {
  id: string;
  affiliateId: string;
  referralId: string;
  orderId: string;
  orderAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'pending' | 'confirmed' | 'paid' | 'cancelled';
  payoutId?: string;
  createdAt: Date;
  confirmedAt?: Date;
  paidAt?: Date;
  cancelledAt?: Date;
  notes?: string;
}

interface Payout {
  id: string;
  affiliateId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod: string;
  paymentReference?: string;
  transactionId?: string;
  commissionIds: string[];
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  notes?: string;
}

interface AffiliateTier {
  name: string;
  minReferrals: number;
  minRevenue: number;
  commissionRate: number;
  benefits: string[];
  customCommissionRate?: boolean;
}

interface AffiliateStats {
  totalReferrals: number;
  activeReferrals: number;
  pendingReferrals: number;
  convertedReferrals: number;
  totalEarnings: number;
  currentBalance: number;
  pendingCommissions: number;
  paidCommissions: number;
  conversionRate: number;
  averageOrderValue: number;
  topPerformingProducts: Array<{
    productId: string;
    productName: string;
    sales: number;
    commission: number;
  }>;
  monthlyEarnings: Array<{
    month: string;
    earnings: number;
    referrals: number;
  }>;
}

class AffiliateProgramService {
  private affiliates: Map<string, Affiliate> = new Map();
  private referrals: Map<string, Referral> = new Map();
  private commissions: Map<string, Commission> = new Map();
  private payouts: Map<string, Payout> = new Map();
  
  private readonly tiers: Record<Affiliate['tier'], AffiliateTier> = {
    bronze: {
      name: 'Bronze',
      minReferrals: 0,
      minRevenue: 0,
      commissionRate: 5,
      benefits: ['Basic dashboard', 'Standard commission rate'],
      customCommissionRate: false
    },
    silver: {
      name: 'Silver',
      minReferrals: 10,
      minRevenue: 5000,
      commissionRate: 7,
      benefits: ['Advanced dashboard', 'Higher commission rate', 'Monthly reports'],
      customCommissionRate: false
    },
    gold: {
      name: 'Gold',
      minReferrals: 25,
      minRevenue: 15000,
      commissionRate: 10,
      benefits: ['Premium dashboard', 'Highest commission rate', 'Weekly reports', 'Personal manager'],
      customCommissionRate: true
    },
    platinum: {
      name: 'Platinum',
      minReferrals: 50,
      minRevenue: 50000,
      commissionRate: 12,
      benefits: ['VIP dashboard', 'Maximum commission rate', 'Real-time reports', 'Dedicated support', 'Custom terms'],
      customCommissionRate: true
    }
  };

  constructor() {
    this.loadAffiliates();
    this.loadReferrals();
    this.loadCommissions();
    this.loadPayouts();
  }

  // Load data from database
  private async loadAffiliates(): Promise<void> {
    try {
      // In production, load from database
      console.log('Affiliates loaded');
    } catch (error) {
      console.error('Failed to load affiliates:', error);
    }
  }

  private async loadReferrals(): Promise<void> {
    try {
      console.log('Referrals loaded');
    } catch (error) {
      console.error('Failed to load referrals:', error);
    }
  }

  private async loadCommissions(): Promise<void> {
    try {
      console.log('Commissions loaded');
    } catch (error) {
      console.error('Failed to load commissions:', error);
    }
  }

  private async loadPayouts(): Promise<void> {
    try {
      console.log('Payouts loaded');
    } catch (error) {
      console.error('Failed to load payouts:', error);
    }
  }

  // Generate unique referral code
  generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  // Register new affiliate
  async registerAffiliate(userData: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    paymentMethod: 'bank' | 'upi' | 'paypal';
    paymentDetails: any;
  }): Promise<Affiliate> {
    const affiliate: Affiliate = {
      id: 'aff_' + Math.random().toString(36).substr(2, 9),
      userId: userData.userId,
      code: this.generateReferralCode(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      status: 'pending',
      tier: 'bronze',
      commissionRate: this.tiers.bronze.commissionRate,
      minimumPayout: 500,
      paymentMethod: userData.paymentMethod,
      paymentDetails: userData.paymentDetails,
      createdAt: new Date(),
      updatedAt: new Date(),
      totalEarnings: 0,
      currentBalance: 0,
      totalReferrals: 0,
      activeReferrals: 0,
      conversionRate: 0
    };

    this.affiliates.set(affiliate.id, affiliate);
    
    // In production, save to database
    console.log('Affiliate registered:', affiliate.id);
    
    return affiliate;
  }

  // Create referral
  async createReferral(data: {
    affiliateId: string;
    referralCode: string;
    referredEmail?: string;
    referredPhone?: string;
    trackingParams?: Record<string, any>;
  }): Promise<Referral> {
    const affiliate = this.affiliates.get(data.affiliateId);
    if (!affiliate || affiliate.status !== 'active') {
      throw new Error('Invalid or inactive affiliate');
    }

    const referral: Referral = {
      id: 'ref_' + Math.random().toString(36).substr(2, 9),
      affiliateId: data.affiliateId,
      referralCode: data.referralCode,
      referredEmail: data.referredEmail,
      referredPhone: data.referredPhone,
      status: 'pending',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      commissionEarned: 0,
      trackingParams: data.trackingParams,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.referrals.set(referral.id, referral);
    
    // Update affiliate stats
    affiliate.totalReferrals++;
    affiliate.updatedAt = new Date();
    
    console.log('Referral created:', referral.id);
    
    return referral;
  }

  // Convert referral (when user registers)
  async convertReferral(referralId: string, userId: string): Promise<void> {
    const referral = this.referrals.get(referralId);
    if (!referral || referral.status !== 'pending') {
      throw new Error('Invalid referral');
    }

    referral.referredUserId = userId;
    referral.status = 'registered';
    referral.registrationDate = new Date();
    referral.updatedAt = new Date();

    const affiliate = this.affiliates.get(referral.affiliateId);
    if (affiliate) {
      affiliate.activeReferrals++;
      affiliate.updatedAt = new Date();
    }

    console.log('Referral converted:', referralId);
  }

  // Track conversion (when user makes first purchase)
  async trackConversion(referralId: string, orderId: string, orderAmount: number): Promise<void> {
    const referral = this.referrals.get(referralId);
    if (!referral || referral.status !== 'registered') {
      throw new Error('Invalid referral');
    }

    const affiliate = this.affiliates.get(referral.affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Calculate commission
    const commissionRate = affiliate.customCommissionRate || affiliate.commissionRate;
    const commissionAmount = (orderAmount * commissionRate) / 100;

    // Create commission record
    const commission: Commission = {
      id: 'com_' + Math.random().toString(36).substr(2, 9),
      affiliateId: referral.affiliateId,
      referralId: referral.id,
      orderId,
      orderAmount,
      commissionRate,
      commissionAmount,
      status: 'pending',
      createdAt: new Date()
    };

    this.commissions.set(commission.id, commission);

    // Update referral
    referral.status = 'converted';
    referral.conversionDate = new Date();
    referral.firstOrderAmount = orderAmount;
    referral.commissionEarned = commissionAmount;
    referral.updatedAt = new Date();

    // Update affiliate
    affiliate.totalEarnings += commissionAmount;
    affiliate.currentBalance += commissionAmount;
    affiliate.updatedAt = new Date();

    // Check for tier upgrade
    this.checkTierUpgrade(affiliate);

    console.log('Conversion tracked:', referralId, 'Commission:', commissionAmount);
  }

  // Check and upgrade affiliate tier
  private checkTierUpgrade(affiliate: Affiliate): void {
    const currentTier = this.tiers[affiliate.tier];
    let newTier: Affiliate['tier'] | null = null;

    // Check from highest to lowest tier
    if (affiliate.totalReferrals >= this.tiers.platinum.minReferrals && 
        affiliate.totalEarnings >= this.tiers.platinum.minRevenue) {
      newTier = 'platinum';
    } else if (affiliate.totalReferrals >= this.tiers.gold.minReferrals && 
               affiliate.totalEarnings >= this.tiers.gold.minRevenue) {
      newTier = 'gold';
    } else if (affiliate.totalReferrals >= this.tiers.silver.minReferrals && 
               affiliate.totalEarnings >= this.tiers.silver.minRevenue) {
      newTier = 'silver';
    }

    if (newTier && newTier !== affiliate.tier) {
      affiliate.tier = newTier;
      affiliate.commissionRate = this.tiers[newTier].commissionRate;
      affiliate.updatedAt = new Date();
      
      console.log(`Affiliate ${affiliate.id} upgraded to ${newTier}`);
    }
  }

  // Get affiliate stats
  getAffiliateStats(affiliateId: string): AffiliateStats {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const affiliateReferrals = Array.from(this.referrals.values())
      .filter(r => r.affiliateId === affiliateId);

    const affiliateCommissions = Array.from(this.commissions.values())
      .filter(c => c.affiliateId === affiliateId);

    const pendingReferrals = affiliateReferrals.filter(r => r.status === 'pending').length;
    const convertedReferrals = affiliateReferrals.filter(r => r.status === 'converted').length;
    const pendingCommissions = affiliateCommissions.filter(c => c.status === 'pending')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
    const paidCommissions = affiliateCommissions.filter(c => c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);

    const conversionRate = affiliate.totalReferrals > 0 
      ? (convertedReferrals / affiliate.totalReferrals) * 100 
      : 0;

    const averageOrderValue = convertedReferrals > 0
      ? affiliateReferrals
          .filter(r => r.status === 'converted' && r.firstOrderAmount)
          .reduce((sum, r) => sum + (r.firstOrderAmount || 0), 0) / convertedReferrals
      : 0;

    return {
      totalReferrals: affiliate.totalReferrals,
      activeReferrals: affiliate.activeReferrals,
      pendingReferrals,
      convertedReferrals,
      totalEarnings: affiliate.totalEarnings,
      currentBalance: affiliate.currentBalance,
      pendingCommissions,
      paidCommissions,
      conversionRate,
      averageOrderValue,
      topPerformingProducts: [], // Would be calculated from order data
      monthlyEarnings: [] // Would be calculated from commission data
    };
  }

  // Request payout
  async requestPayout(affiliateId: string): Promise<Payout> {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    if (affiliate.currentBalance < affiliate.minimumPayout) {
      throw new Error('Insufficient balance for payout');
    }

    // Get pending commissions
    const pendingCommissions = Array.from(this.commissions.values())
      .filter(c => c.affiliateId === affiliateId && c.status === 'pending');

    if (pendingCommissions.length === 0) {
      throw new Error('No pending commissions to payout');
    }

    const totalAmount = pendingCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);

    const payout: Payout = {
      id: 'pay_' + Math.random().toString(36).substr(2, 9),
      affiliateId,
      amount: totalAmount,
      status: 'pending',
      paymentMethod: affiliate.paymentMethod,
      commissionIds: pendingCommissions.map(c => c.id),
      createdAt: new Date()
    };

    this.payouts.set(payout.id, payout);

    // Update commissions
    pendingCommissions.forEach(commission => {
      commission.status = 'confirmed';
      commission.payoutId = payout.id;
      commission.confirmedAt = new Date();
    });

    // Update affiliate
    affiliate.currentBalance -= totalAmount;
    affiliate.lastPayoutDate = new Date();
    affiliate.updatedAt = new Date();

    console.log('Payout requested:', payout.id, 'Amount:', totalAmount);

    return payout;
  }

  // Process payout
  async processPayout(payoutId: string, transactionId?: string): Promise<void> {
    const payout = this.payouts.get(payoutId);
    if (!payout || payout.status !== 'pending') {
      throw new Error('Invalid payout');
    }

    payout.status = 'processing';
    payout.processedAt = new Date();

    // Simulate payment processing
    setTimeout(() => {
      payout.status = 'completed';
      payout.completedAt = new Date();
      payout.transactionId = transactionId || 'txn_' + Math.random().toString(36).substr(2, 9);
      
      console.log('Payout completed:', payoutId);
    }, 5000);
  }

  // Get affiliate by code
  getAffiliateByCode(code: string): Affiliate | null {
    for (const affiliate of this.affiliates.values()) {
      if (affiliate.code === code && affiliate.status === 'active') {
        return affiliate;
      }
    }
    return null;
  }

  // Get affiliate by user ID
  getAffiliateByUserId(userId: string): Affiliate | null {
    for (const affiliate of this.affiliates.values()) {
      if (affiliate.userId === userId) {
        return affiliate;
      }
    }
    return null;
  }

  // Get all affiliates
  getAllAffiliates(): Affiliate[] {
    return Array.from(this.affiliates.values());
  }

  // Get affiliate referrals
  getAffiliateReferrals(affiliateId: string): Referral[] {
    return Array.from(this.referrals.values())
      .filter(r => r.affiliateId === affiliateId);
  }

  // Get affiliate commissions
  getAffiliateCommissions(affiliateId: string): Commission[] {
    return Array.from(this.commissions.values())
      .filter(c => c.affiliateId === affiliateId);
  }

  // Get affiliate payouts
  getAffiliatePayouts(affiliateId: string): Payout[] {
    return Array.from(this.payouts.values())
      .filter(p => p.affiliateId === affiliateId);
  }

  // Generate affiliate dashboard data
  generateDashboardData(affiliateId: string): {
    stats: AffiliateStats;
    referrals: Referral[];
    commissions: Commission[];
    payouts: Payout[];
    tier: AffiliateTier;
  } {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    return {
      stats: this.getAffiliateStats(affiliateId),
      referrals: this.getAffiliateReferrals(affiliateId),
      commissions: this.getAffiliateCommissions(affiliateId),
      payouts: this.getAffiliatePayouts(affiliateId),
      tier: this.tiers[affiliate.tier]
    };
  }

  // Generate promo materials
  generatePromoMaterials(affiliateId: string): {
    referralLink: string;
    qrCode: string;
    banners: string[];
    socialPosts: string[];
  } {
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const baseUrl = process.env.FRONTEND_URL || 'https://singglebee.com';
    const referralLink = `${baseUrl}?ref=${affiliate.code}`;

    return {
      referralLink,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(referralLink)}`,
      banners: [
        `${baseUrl}/banners/affiliate-${affiliate.code}-1.png`,
        `${baseUrl}/banners/affiliate-${affiliate.code}-2.png`,
        `${baseUrl}/banners/affiliate-${affiliate.code}-3.png`
      ],
      socialPosts: [
        `🎉 Discover amazing Tamil educational content for kids at SINGGLEBEE! Use my referral code ${affiliate.code} for special discounts! ${referralLink}`,
        `📚 Looking for quality educational books and poems for your children? Check out SINGGLEBEE! Referral code: ${affiliate.code} ${referralLink}`,
        `🌟 Give your kids the gift of learning with SINGGLEBEE's premium educational content. Use code ${affiliate.code} at checkout! ${referralLink}`
      ]
    };
  }
}

export default AffiliateProgramService;
