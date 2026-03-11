import { analytics } from '../analytics/analytics-client';

// Pricing rule types
export interface PricingRule {
  id: string;
  name: string;
  description: string;
  conditions: PricingCondition[];
  actions: PricingAction[];
  priority: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  minMargin?: number;
  maxDiscount?: number;
}

export interface PricingCondition {
  type:
    | 'demand'
    | 'inventory'
    | 'user_segment'
    | 'time'
    | 'category'
    | 'competitor_price'
    | 'quantity'
    | 'season';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'not_in';
  value: any;
  weight?: number;
}

export interface PricingAction {
  type: 'adjust_price' | 'apply_discount' | 'set_price' | 'add_fee';
  value: number;
  operator?: 'add' | 'subtract' | 'multiply' | 'percentage';
}

export interface ProductPricing {
  productId: string;
  basePrice: number;
  currentPrice: number;
  originalPrice: number;
  appliedRules: string[];
  margin: number;
  demand: number;
  inventory: number;
  lastUpdated: string;
}

export interface PricingContext {
  productId: string;
  userId?: string;
  userSegment?: string;
  quantity: number;
  category?: string;
  location?: string;
  timeOfDay?: number;
  dayOfWeek?: number;
  season?: string;
}

interface PricingMetrics {
  ruleId: string;
  ruleName: string;
  applications: number;
  revenueImpact: number;
  conversionImpact: number;
  marginImpact: number;
  lastApplied: string;
}

class PricingEngine {
  private rules: Map<string, PricingRule> = new Map();
  private productPricing: Map<string, ProductPricing> = new Map();
  private metrics: Map<string, PricingMetrics> = new Map();
  private demandTracker: Map<string, number[]> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.loadPricingData();
    this.startDemandTracking();
  }

  private initializeDefaultRules(): void {
    const defaultRules: PricingRule[] = [
      {
        id: 'high_demand_low_stock',
        name: 'High Demand + Low Stock Price Increase',
        description: 'Increase price by 5% when demand is high and stock is low',
        conditions: [
          { type: 'demand', operator: 'gt', value: 80 },
          { type: 'inventory', operator: 'lt', value: 20 },
        ],
        actions: [{ type: 'adjust_price', value: 1.05, operator: 'multiply' }],
        priority: 1,
        isActive: true,
        minMargin: 15,
        maxDiscount: 0,
      },
      {
        id: 'low_demand_high_stock',
        name: 'Low Demand + High Stock Discount',
        description: 'Apply 10% discount when demand is low and stock is high',
        conditions: [
          { type: 'demand', operator: 'lt', value: 30 },
          { type: 'inventory', operator: 'gt', value: 80 },
        ],
        actions: [{ type: 'apply_discount', value: 10, operator: 'percentage' }],
        priority: 2,
        isActive: true,
        minMargin: 10,
        maxDiscount: 15,
      },
      {
        id: 'vip_pricing',
        name: 'VIP Customer Exclusive Pricing',
        description: 'Apply 5% discount for VIP customers',
        conditions: [{ type: 'user_segment', operator: 'eq', value: 'vip' }],
        actions: [{ type: 'apply_discount', value: 5, operator: 'percentage' }],
        priority: 3,
        isActive: true,
        minMargin: 5,
        maxDiscount: 10,
      },
      {
        id: 'weekend_premium',
        name: ' Weekend Premium Pricing',
        description: 'Increase price by 3% on weekends',
        conditions: [
          { type: 'time', operator: 'in', value: [6, 0] }, // Saturday, Sunday
        ],
        actions: [{ type: 'adjust_price', value: 1.03, operator: 'multiply' }],
        priority: 4,
        isActive: true,
        minMargin: 12,
        maxDiscount: 0,
      },
      {
        id: 'bulk_discount',
        name: 'Bulk Purchase Discount',
        description: 'Apply tiered discounts for bulk purchases',
        conditions: [{ type: 'quantity', operator: 'gte', value: 5 }],
        actions: [{ type: 'apply_discount', value: 10, operator: 'percentage' }],
        priority: 5,
        isActive: true,
        minMargin: 8,
        maxDiscount: 20,
      },
      {
        id: 'seasonal_adjustment',
        name: 'Seasonal Price Adjustment',
        description: 'Adjust prices based on seasonality',
        conditions: [{ type: 'season', operator: 'in', value: ['summer', 'winter'] }],
        actions: [{ type: 'adjust_price', value: 1.02, operator: 'multiply' }],
        priority: 6,
        isActive: true,
        minMargin: 10,
        maxDiscount: 0,
      },
    ];

    defaultRules.forEach((rule) => {
      this.rules.set(rule.id, rule);
    });
  }

  private loadPricingData(): void {
    try {
      // In production, load from database
      const stored = localStorage.getItem('pricing_engine_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.productPricing = new Map(data.productPricing || []);
        this.metrics = new Map(data.metrics || []);
        this.demandTracker = new Map(data.demandTracker || []);
      }
    } catch (error) {
      console.warn('Failed to load pricing data:', error);
    }
  }

  private savePricingData(): void {
    try {
      const data = {
        productPricing: Array.from(this.productPricing.entries()),
        metrics: Array.from(this.metrics.entries()),
        demandTracker: Array.from(this.demandTracker.entries()),
      };
      localStorage.setItem('pricing_engine_data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save pricing data:', error);
    }
  }

  private startDemandTracking(): void {
    // Track demand patterns every hour
    setInterval(
      () => {
        this.updateDemandMetrics();
      },
      60 * 60 * 1000
    );
  }

  private updateDemandMetrics(): void {
    this.demandTracker.forEach((demandData, productId) => {
      // Keep only last 24 hours of data
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const recentData = demandData.filter((timestamp) => timestamp > cutoff);
      this.demandTracker.set(productId, recentData);
    });
  }

  // Calculate dynamic price for a product
  calculatePrice(context: PricingContext): ProductPricing {
    const { productId, userId, userSegment, quantity, category, location } = context;

    // Get or create product pricing
    let productPricing = this.productPricing.get(productId);
    if (!productPricing) {
      productPricing = {
        productId,
        basePrice: this.getBasePrice(productId),
        currentPrice: this.getBasePrice(productId),
        originalPrice: this.getBasePrice(productId),
        appliedRules: [],
        margin: 30, // Default margin
        demand: this.calculateDemand(productId),
        inventory: this.getInventoryLevel(productId),
        lastUpdated: new Date().toISOString(),
      };
      this.productPricing.set(productId, productPricing);
    }

    // Update current metrics
    productPricing.demand = this.calculateDemand(productId);
    productPricing.inventory = this.getInventoryLevel(productId);

    // Apply pricing rules
    const applicableRules = this.getApplicableRules(context, productPricing);
    let adjustedPrice = productPricing.basePrice;
    const appliedRules: string[] = [];

    // Sort rules by priority (lower number = higher priority)
    applicableRules.sort((a, b) => a.priority - b.priority);

    for (const rule of applicableRules) {
      const priceBefore = adjustedPrice;
      adjustedPrice = this.applyRule(adjustedPrice, rule, context);

      if (adjustedPrice !== priceBefore) {
        appliedRules.push(rule.id);
        this.trackRuleApplication(rule.id, productId, userId);
      }
    }

    // Ensure minimum margin is maintained
    const cost = productPricing.basePrice * (1 - productPricing.margin / 100);
    const minPrice = cost * (1 + productPricing.margin / 100);
    adjustedPrice = Math.max(adjustedPrice, minPrice);

    // Update product pricing
    productPricing.currentPrice = adjustedPrice;
    productPricing.appliedRules = appliedRules;
    productPricing.lastUpdated = new Date().toISOString();

    this.savePricingData();

    // Track pricing event
    analytics.track('price_calculated', {
      product_id: productId,
      base_price: productPricing.basePrice,
      current_price: adjustedPrice,
      applied_rules: appliedRules,
      user_id: userId,
      context,
    });

    return productPricing;
  }

  private getBasePrice(productId: string): number {
    // In production, fetch from database
    const basePrices: Record<string, number> = {
      'book-001': 499,
      'book-002': 399,
      'book-003': 299,
      'stationery-001': 199,
      'stationery-002': 149,
    };
    return basePrices[productId] || 299;
  }

  private calculateDemand(productId: string): number {
    const demandData = this.demandTracker.get(productId) || [];
    const recentViews = demandData.length;

    // Calculate demand score (0-100)
    const maxExpectedViews = 100;
    return Math.min((recentViews / maxExpectedViews) * 100, 100);
  }

  private getInventoryLevel(productId: string): number {
    // In production, fetch from inventory system
    const inventoryLevels: Record<string, number> = {
      'book-001': 15,
      'book-002': 85,
      'book-003': 45,
      'stationery-001': 120,
      'stationery-002': 8,
    };
    return inventoryLevels[productId] || 50;
  }

  private getApplicableRules(
    context: PricingContext,
    productPricing: ProductPricing
  ): PricingRule[] {
    const applicable: PricingRule[] = [];

    this.rules.forEach((rule) => {
      if (!rule.isActive) return;

      // Check date range
      if (rule.startDate && new Date() < new Date(rule.startDate)) return;
      if (rule.endDate && new Date() > new Date(rule.endDate)) return;

      // Check all conditions
      const conditionsMet = rule.conditions.every((condition) =>
        this.evaluateCondition(condition, context, productPricing)
      );

      if (conditionsMet) {
        applicable.push(rule);
      }
    });

    return applicable;
  }

  private evaluateCondition(
    condition: PricingCondition,
    context: PricingContext,
    productPricing: ProductPricing
  ): boolean {
    let actualValue: any;

    switch (condition.type) {
      case 'demand':
        actualValue = productPricing.demand;
        break;
      case 'inventory':
        actualValue = productPricing.inventory;
        break;
      case 'user_segment':
        actualValue = context.userSegment;
        break;
      case 'time':
        actualValue = new Date().getDay();
        break;
      case 'quantity':
        actualValue = context.quantity;
        break;
      case 'category':
        actualValue = context.category;
        break;
      case 'season':
        actualValue = context.season;
        break;
      default:
        return false;
    }

    return this.compareValues(actualValue, condition.operator, condition.value);
  }

  private compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'gt':
        return actual > expected;
      case 'gte':
        return actual >= expected;
      case 'lt':
        return actual < expected;
      case 'lte':
        return actual <= expected;
      case 'eq':
        return actual === expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      default:
        return false;
    }
  }

  private applyRule(currentPrice: number, rule: PricingRule, context: PricingContext): number {
    let newPrice = currentPrice;

    rule.actions.forEach((action) => {
      switch (action.type) {
        case 'adjust_price':
          if (action.operator === 'multiply') {
            newPrice *= action.value;
          } else if (action.operator === 'add') {
            newPrice += action.value;
          } else if (action.operator === 'subtract') {
            newPrice -= action.value;
          }
          break;

        case 'apply_discount':
          if (action.operator === 'percentage') {
            newPrice *= 1 - action.value / 100;
          } else {
            newPrice -= action.value;
          }
          break;

        case 'set_price':
          newPrice = action.value;
          break;

        case 'add_fee':
          newPrice += action.value;
          break;
      }
    });

    return Math.max(newPrice, 0);
  }

  private trackRuleApplication(ruleId: string, productId: string, userId?: string): void {
    let metrics = this.metrics.get(ruleId);
    if (!metrics) {
      const rule = this.rules.get(ruleId);
      metrics = {
        ruleId,
        ruleName: rule?.name || 'Unknown',
        applications: 0,
        revenueImpact: 0,
        conversionImpact: 0,
        marginImpact: 0,
        lastApplied: new Date().toISOString(),
      };
      this.metrics.set(ruleId, metrics);
    }

    metrics.applications++;
    metrics.lastApplied = new Date().toISOString();

    this.savePricingData();
  }

  // Track product view for demand calculation
  trackProductView(productId: string): void {
    if (!this.demandTracker.has(productId)) {
      this.demandTracker.set(productId, []);
    }

    const demandData = this.demandTracker.get(productId)!;
    demandData.push(Date.now());

    // Keep only last 24 hours
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const recentData = demandData.filter((timestamp) => timestamp > cutoff);
    this.demandTracker.set(productId, recentData);
  }

  // Add new pricing rule
  addRule(rule: PricingRule): void {
    this.rules.set(rule.id, rule);
    this.savePricingData();

    analytics.track('pricing_rule_added', {
      rule_id: rule.id,
      rule_name: rule.name,
      priority: rule.priority,
    });
  }

  // Update pricing rule
  updateRule(ruleId: string, updates: Partial<PricingRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      Object.assign(rule, updates);
      this.savePricingData();

      analytics.track('pricing_rule_updated', {
        rule_id: ruleId,
        updates: Object.keys(updates),
      });
    }
  }

  // Delete pricing rule
  deleteRule(ruleId: string): void {
    this.rules.delete(ruleId);
    this.metrics.delete(ruleId);
    this.savePricingData();

    analytics.track('pricing_rule_deleted', { rule_id: ruleId });
  }

  // Get pricing metrics
  getPricingMetrics(): PricingMetrics[] {
    return Array.from(this.metrics.values());
  }

  // Get rule performance analysis
  getRulePerformance(): Array<{
    ruleId: string;
    ruleName: string;
    applications: number;
    revenueImpact: number;
    roi: number;
    recommendation: string;
  }> {
    const performance = [];

    this.metrics.forEach((metrics, ruleId) => {
      const rule = this.rules.get(ruleId);
      if (!rule) return;

      // Simplified ROI calculation
      const roi =
        metrics.revenueImpact > 0 ? (metrics.revenueImpact / metrics.applications) * 100 : 0;

      let recommendation = 'Keep running';
      if (roi < 0) {
        recommendation = 'Consider pausing - negative ROI';
      } else if (roi < 5) {
        recommendation = 'Monitor closely - low ROI';
      } else if (roi > 20) {
        recommendation = 'Consider expanding - high ROI';
      }

      performance.push({
        ruleId,
        ruleName: metrics.ruleName,
        applications: metrics.applications,
        revenueImpact: metrics.revenueImpact,
        roi,
        recommendation,
      });
    });

    return performance.sort((a, b) => b.roi - a.roi);
  }

  // Export pricing data
  exportData(): {
    rules: PricingRule[];
    productPricing: ProductPricing[];
    metrics: PricingMetrics[];
  } {
    return {
      rules: Array.from(this.rules.values()),
      productPricing: Array.from(this.productPricing.values()),
      metrics: Array.from(this.metrics.values()),
    };
  }
}

// Singleton instance
export const pricingEngine = new PricingEngine();

// Helper functions for common pricing operations
export const getProductPrice = (
  productId: string,
  userId?: string,
  quantity: number = 1,
  userSegment?: string
): ProductPricing => {
  const context: PricingContext = {
    productId,
    userId,
    quantity,
    userSegment,
    timeOfDay: new Date().getHours(),
    dayOfWeek: new Date().getDay(),
    season: getCurrentSeason(),
  };

  return pricingEngine.calculatePrice(context);
};

export const trackProductInteraction = (
  productId: string,
  action: 'view' | 'add_to_cart' | 'purchase'
) => {
  if (action === 'view') {
    pricingEngine.trackProductView(productId);
  }

  analytics.track('product_interaction', {
    product_id: productId,
    action,
    timestamp: new Date().toISOString(),
  });
};

const getCurrentSeason = (): string => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
};
