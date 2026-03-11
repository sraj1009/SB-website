import { analytics } from './analytics-client';
import { getStorageItem, setStorageItem } from '../utils/storage';

// Funnel step definitions
export enum FunnelStep {
  LANDING = 'landing',
  PRODUCT_VIEW = 'product_view',
  ADD_TO_CART = 'add_to_cart',
  CHECKOUT_START = 'checkout_start',
  PAYMENT = 'payment',
  PURCHASE_SUCCESS = 'purchase_success',
  SIGN_UP = 'sign_up',
  EMAIL_VERIFY = 'email_verify',
  FIRST_PURCHASE = 'first_purchase',
  REPEAT_PURCHASE = 'repeat_purchase',
}

// Funnel configuration
const FUNNELS = {
  PURCHASE: [
    FunnelStep.LANDING,
    FunnelStep.PRODUCT_VIEW,
    FunnelStep.ADD_TO_CART,
    FunnelStep.CHECKOUT_START,
    FunnelStep.PAYMENT,
    FunnelStep.PURCHASE_SUCCESS,
  ],
  USER_ACQUISITION: [
    FunnelStep.LANDING,
    FunnelStep.SIGN_UP,
    FunnelStep.EMAIL_VERIFY,
    FunnelStep.FIRST_PURCHASE,
  ],
  RETENTION: [FunnelStep.FIRST_PURCHASE, FunnelStep.REPEAT_PURCHASE],
};

// Baseline conversion rates (will be updated dynamically)
const BASELINE_RATES = {
  [FunnelStep.LANDING]: 100,
  [FunnelStep.PRODUCT_VIEW]: 45,
  [FunnelStep.ADD_TO_CART]: 12,
  [FunnelStep.CHECKOUT_START]: 8,
  [FunnelStep.PAYMENT]: 6,
  [FunnelStep.PURCHASE_SUCCESS]: 3,
  [FunnelStep.SIGN_UP]: 15,
  [FunnelStep.EMAIL_VERIFY]: 12,
  [FunnelStep.FIRST_PURCHASE]: 8,
  [FunnelStep.REPEAT_PURCHASE]: 35,
};

interface FunnelEvent {
  step: FunnelStep;
  timestamp: number;
  userId?: string;
  sessionId: string;
  properties?: Record<string, any>;
  funnelType: string;
}

interface FunnelMetrics {
  step: FunnelStep;
  visitors: number;
  conversions: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeToConvert: number;
  baselineDeviation: number;
}

class FunnelTracker {
  private sessionId: string;
  private userId?: string;
  private funnelProgress: Map<string, FunnelEvent[]> = new Map();
  private lastStepTimestamp: Map<FunnelStep, number> = new Map();

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadStoredProgress();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadStoredProgress(): void {
    try {
      const stored = getStorageItem('funnel_progress');
      if (stored) {
        this.funnelProgress = new Map(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to load funnel progress:', error);
    }
  }

  private saveProgress(): void {
    try {
      setStorageItem('funnel_progress', JSON.stringify(Array.from(this.funnelProgress.entries())));
    } catch (error) {
      console.warn('Failed to save funnel progress:', error);
    }
  }

  // Track a funnel step
  trackStep(
    step: FunnelStep,
    properties?: Record<string, any>,
    funnelType: string = 'PURCHASE'
  ): void {
    const event: FunnelEvent = {
      step,
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      properties,
      funnelType,
    };

    // Store event
    if (!this.funnelProgress.has(funnelType)) {
      this.funnelProgress.set(funnelType, []);
    }
    this.funnelProgress.get(funnelType)!.push(event);
    this.lastStepTimestamp.set(step, event.timestamp);

    // Send to analytics
    analytics.track('funnel_step_completed', {
      step,
      funnel_type: funnelType,
      session_id: this.sessionId,
      user_id: this.userId,
      ...properties,
    });

    // Check for significant drop-offs
    this.checkDropOffAlert(step, funnelType);

    // Save progress
    this.saveProgress();
  }

  // Check for significant drop-offs and alert
  private checkDropOffAlert(currentStep: FunnelStep, funnelType: string): void {
    const funnel = FUNNELS[funnelType as keyof typeof FUNNELS];
    const stepIndex = funnel.indexOf(currentStep);

    if (stepIndex === 0) return; // First step, no previous step to compare

    const previousStep = funnel[stepIndex - 1];
    const metrics = this.calculateFunnelMetrics(funnelType);

    const currentStepMetrics = metrics.find((m) => m.step === currentStep);
    const previousStepMetrics = metrics.find((m) => m.step === previousStep);

    if (currentStepMetrics && previousStepMetrics) {
      const baseline = BASELINE_RATES[currentStep];
      const deviation = ((baseline - currentStepMetrics.conversionRate) / baseline) * 100;

      // Alert if drop-off is >20% below baseline
      if (deviation > 20) {
        this.sendDropOffAlert(currentStep, currentStepMetrics.conversionRate, baseline, deviation);
      }
    }
  }

  private sendDropOffAlert(
    step: FunnelStep,
    currentRate: number,
    baseline: number,
    deviation: number
  ): void {
    const alert = {
      type: 'funnel_drop_off',
      step,
      current_rate: currentRate,
      baseline_rate: baseline,
      deviation_percent: deviation,
      timestamp: new Date().toISOString(),
      session_id: this.sessionId,
    };

    // Send alert to monitoring system
    console.warn('🚨 Funnel Drop-off Alert:', alert);

    // In production, send to Slack/PagerDuty
    if (process.env.NODE_ENV === 'production') {
      // await sendAlert(alert);
    }
  }

  // Calculate funnel metrics
  calculateFunnelMetrics(funnelType: string): FunnelMetrics[] {
    const events = this.funnelProgress.get(funnelType) || [];
    const funnel = FUNNELS[funnelType as keyof typeof FUNNELS];
    const metrics: FunnelMetrics[] = [];

    // Group events by step
    const stepEvents = new Map<FunnelStep, FunnelEvent[]>();
    funnel.forEach((step) => {
      stepEvents.set(
        step,
        events.filter((e) => e.step === step)
      );
    });

    // Calculate metrics for each step
    funnel.forEach((step, index) => {
      const stepData = stepEvents.get(step) || [];
      const uniqueVisitors = new Set(stepData.map((e) => e.sessionId)).size;

      // Calculate conversions (people who reached this step)
      const conversions = uniqueVisitors;

      // Calculate conversion rate
      const totalVisitors = stepEvents.get(funnel[0])?.length || 1;
      const conversionRate = (conversions / totalVisitors) * 100;

      // Calculate drop-off rate
      const dropOffRate =
        index > 0
          ? ((metrics[index - 1].conversions - conversions) / metrics[index - 1].conversions) * 100
          : 0;

      // Calculate average time to convert
      const avgTimeToConvert = this.calculateAvgTimeToConvert(stepData);

      // Calculate baseline deviation
      const baseline = BASELINE_RATES[step];
      const baselineDeviation = ((baseline - conversionRate) / baseline) * 100;

      metrics.push({
        step,
        visitors: uniqueVisitors,
        conversions,
        conversionRate,
        dropOffRate,
        avgTimeToConvert,
        baselineDeviation,
      });
    });

    return metrics;
  }

  private calculateAvgTimeToConvert(events: FunnelEvent[]): number {
    if (events.length === 0) return 0;

    const times = events.map((e) => {
      const firstEvent = this.funnelProgress.get('PURCHASE')?.[0];
      return firstEvent ? e.timestamp - firstEvent.timestamp : 0;
    });

    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }

  // Get user's current position in funnel
  getCurrentPosition(funnelType: string = 'PURCHASE'): FunnelStep | null {
    const events = this.funnelProgress.get(funnelType) || [];
    if (events.length === 0) return null;

    const funnel = FUNNELS[funnelType as keyof typeof FUNNELS];

    // Find the furthest step reached
    for (let i = funnel.length - 1; i >= 0; i--) {
      if (events.some((e) => e.step === funnel[i])) {
        return funnel[i];
      }
    }

    return null;
  }

  // Get time spent in each step
  getTimeInSteps(funnelType: string = 'PURCHASE'): Record<FunnelStep, number> {
    const events = this.funnelProgress.get(funnelType) || [];
    const funnel = FUNNELS[funnelType as keyof typeof FUNNELS];
    const timeInSteps: Record<string, number> = {} as Record<FunnelStep, number>;

    funnel.forEach((step, index) => {
      const stepEvents = events.filter((e) => e.step === step);
      if (stepEvents.length === 0) {
        timeInSteps[step] = 0;
        return;
      }

      // Calculate average time spent in this step
      const times: number[] = [];
      stepEvents.forEach((event) => {
        const nextStepIndex = funnel.indexOf(event.step) + 1;
        if (nextStepIndex < funnel.length) {
          const nextStep = funnel[nextStepIndex];
          const nextEvent = events.find(
            (e) => e.sessionId === event.sessionId && e.step === nextStep
          );
          if (nextEvent) {
            times.push(nextEvent.timestamp - event.timestamp);
          }
        }
      });

      timeInSteps[step] =
        times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0;
    });

    return timeInSteps;
  }

  // Set user ID (when user logs in)
  setUserId(userId: string): void {
    this.userId = userId;

    // Update all existing events with user ID
    this.funnelProgress.forEach((events) => {
      events.forEach((event) => {
        if (!event.userId) {
          event.userId = userId;
        }
      });
    });

    this.saveProgress();

    // Track user identification
    analytics.track('user_identified', {
      user_id: userId,
      session_id: this.sessionId,
    });
  }

  // Reset funnel progress (for new session)
  resetFunnel(funnelType?: string): void {
    if (funnelType) {
      this.funnelProgress.delete(funnelType);
    } else {
      this.funnelProgress.clear();
    }
    this.saveProgress();
  }

  // Export funnel data for analysis
  exportData(): Record<string, FunnelEvent[]> {
    return Object.fromEntries(this.funnelProgress);
  }

  // Get funnel completion rate
  getCompletionRate(funnelType: string = 'PURCHASE'): number {
    const metrics = this.calculateFunnelMetrics(funnelType);
    const lastStep = metrics[metrics.length - 1];
    return lastStep ? lastStep.conversionRate : 0;
  }
}

// Singleton instance
export const funnelTracker = new FunnelTracker();

// Helper functions for common funnel tracking
export const trackLandingPage = (source?: string) => {
  funnelTracker.trackStep(FunnelStep.LANDING, { source });
};

export const trackProductView = (productId: string, category?: string) => {
  funnelTracker.trackStep(FunnelStep.PRODUCT_VIEW, {
    product_id: productId,
    category,
  });
};

export const trackAddToCart = (productId: string, price: number, quantity: number) => {
  funnelTracker.trackStep(FunnelStep.ADD_TO_CART, {
    product_id: productId,
    price,
    quantity,
    total_value: price * quantity,
  });
};

export const trackCheckoutStart = (cartValue: number, itemCount: number) => {
  funnelTracker.trackStep(FunnelStep.CHECKOUT_START, {
    cart_value: cartValue,
    item_count: itemCount,
  });
};

export const trackPayment = (paymentMethod: string, amount: number) => {
  funnelTracker.trackStep(FunnelStep.PAYMENT, {
    payment_method: paymentMethod,
    amount,
  });
};

export const trackPurchaseSuccess = (orderId: string, amount: number, itemCount: number) => {
  funnelTracker.trackStep(FunnelStep.PURCHASE_SUCCESS, {
    order_id: orderId,
    amount,
    item_count: itemCount,
  });
};

export const trackSignUp = (method: string) => {
  funnelTracker.trackStep(FunnelStep.SIGN_UP, { method }, 'USER_ACQUISITION');
};

export const trackEmailVerify = () => {
  funnelTracker.trackStep(FunnelStep.EMAIL_VERIFY, {}, 'USER_ACQUISITION');
};

export const trackFirstPurchase = (orderId: string, amount: number) => {
  funnelTracker.trackStep(
    FunnelStep.FIRST_PURCHASE,
    {
      order_id: orderId,
      amount,
    },
    'USER_ACQUISITION'
  );
};

export const trackRepeatPurchase = (orderId: string, amount: number, daysSinceFirst: number) => {
  funnelTracker.trackStep(
    FunnelStep.REPEAT_PURCHASE,
    {
      order_id: orderId,
      amount,
      days_since_first_purchase: daysSinceFirst,
    },
    'RETENTION'
  );
};
