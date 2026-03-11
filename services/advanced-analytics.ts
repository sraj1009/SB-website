/**
 * Advanced Analytics and Personalization System for SINGGLEBEE
 */

import { cacheConfigs, cacheManager } from '../utils/advanced-cache';
import { useUserStore } from '../store/advanced';
import type { Product, User } from '../types';

// Advanced Analytics Engine
class AdvancedAnalyticsEngine {
  private eventQueue: AnalyticsEvent[] = [];
  private sessionData: SessionData;
  private userProfile: UserProfile | null = null;
  private isTracking = true;
  private batchInterval: NodeJS.Timeout | null = null;
  private config: AnalyticsConfig;

  constructor(config?: Partial<AnalyticsConfig>) {
    this.config = {
      endpoint: '/api/analytics',
      batchSize: 50,
      batchInterval: 5000, // 5 seconds
      enableRealTime: true,
      enablePersonalization: true,
      enableA/BTesting: true,
      enableHeatmap: true,
      enableScrollTracking: true,
      enableClickTracking: true,
      enablePerformanceTracking: true,
      ...config,
    };

    this.sessionData = this.initializeSession();
    this.setupEventListeners();
    this.startBatchProcessing();
  }

  // Core tracking methods
  track(event: AnalyticsEvent): void {
    if (!this.isTracking) return;

    const enrichedEvent = this.enrichEvent(event);
    this.eventQueue.push(enrichedEvent);

    if (this.config.enableRealTime) {
      this.sendEventImmediate(enrichedEvent);
    }
  }

  // E-commerce tracking
  trackProductView(product: Product, context?: ProductViewContext): void {
    this.track({
      type: 'product_view',
      timestamp: Date.now(),
      data: {
        productId: product.id,
        productName: product.name,
        category: product.category,
        price: product.price,
        language: product.language,
        rating: product.rating,
        inStock: product.inStock,
        context: context || {},
      },
    });

    // Update user profile
    this.updateUserProfile('product_views', {
      productId: product.id,
      category: product.category,
      price: product.price,
      timestamp: Date.now(),
    });
  }

  trackAddToCart(product: Product, quantity: number = 1, context?: AddToCartContext): void {
    this.track({
      type: 'add_to_cart',
      timestamp: Date.now(),
      data: {
        productId: product.id,
        productName: product.name,
        category: product.category,
        price: product.price,
        quantity,
        totalValue: product.price * quantity,
        context: context || {},
      },
    });

    this.updateUserProfile('cart_actions', {
      action: 'add',
      productId: product.id,
      quantity,
      timestamp: Date.now(),
    });
  }

  trackPurchase(order: PurchaseData): void {
    this.track({
      type: 'purchase',
      timestamp: Date.now(),
      data: {
        orderId: order.id,
        totalAmount: order.total,
        currency: order.currency,
        items: order.items,
        paymentMethod: order.paymentMethod,
        shippingMethod: order.shippingMethod,
        discountApplied: order.discountApplied,
        context: order.context || {},
      },
    });

    this.updateUserProfile('purchases', {
      orderId: order.id,
      totalAmount: order.total,
      items: order.items,
      timestamp: Date.now(),
    });
  }

  trackSearch(query: string, results: SearchResult[], context?: SearchContext): void {
    this.track({
      type: 'search',
      timestamp: Date.now(),
      data: {
        query,
        resultCount: results.length,
        clickedResults: results.filter(r => r.clicked).map(r => r.productId),
        context: context || {},
      },
    });

    this.updateUserProfile('searches', {
      query,
      resultCount: results.length,
      timestamp: Date.now(),
    });
  }

  // User behavior tracking
  trackPageView(page: string, referrer?: string): void {
    this.track({
      type: 'page_view',
      timestamp: Date.now(),
      data: {
        page,
        referrer,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        context: {
          loadTime: performance.now(),
        },
      },
    });
  }

  trackEngagement(type: 'click' | 'scroll' | 'hover' | 'form_interaction', data: EngagementData): void {
    this.track({
      type: 'engagement',
      timestamp: Date.now(),
      data: {
        engagementType: type,
        ...data,
      },
    });
  }

  // Performance tracking
  trackPerformance(metrics: PerformanceMetrics): void {
    if (!this.config.enablePerformanceTracking) return;

    this.track({
      type: 'performance',
      timestamp: Date.now(),
      data: {
        ...metrics,
        context: {
          userAgent: navigator.userAgent,
          connection: (navigator as any).connection?.effectiveType,
        },
      },
    });
  }

  // A/B Testing
  trackABTest(testName: string, variant: string, conversion?: boolean): void {
    if (!this.config.enableA/BTesting) return;

    this.track({
      type: 'ab_test',
      timestamp: Date.now(),
      data: {
        testName,
        variant,
        conversion,
        context: {
          sessionId: this.sessionData.id,
        },
      },
    });
  }

  // Personalization
  async getPersonalizedContent(contentType: string, context?: any): Promise<PersonalizedContent[]> {
    if (!this.config.enablePersonalization) return [];

    const cacheKey = `personalized-content-${contentType}-${JSON.stringify(context)}`;
    
    return cacheManager.fetchWithCache(
      cacheKey,
      () => this.generatePersonalizedContent(contentType, context),
      cacheConfigs.api
    );
  }

  // User profile building
  async buildUserProfile(userId: string): Promise<UserProfile> {
    const cacheKey = `user-profile-${userId}`;
    
    return cacheManager.fetchWithCache(
      cacheKey,
      () => this.generateUserProfile(userId),
      cacheConfigs.userPrefs
    );
  }

  // Analytics dashboard data
  async getAnalyticsData(timeRange: TimeRange, metrics: AnalyticsMetric[]): Promise<AnalyticsReport> {
    const cacheKey = `analytics-report-${timeRange.start}-${timeRange.end}-${metrics.join('-')}`;
    
    return cacheManager.fetchWithCache(
      cacheKey,
      () => this.fetchAnalyticsData(timeRange, metrics),
      cacheConfigs.api
    );
  }

  // Private methods
  private initializeSession(): SessionData {
    const sessionId = this.getSessionId();
    const userId = this.getUserId();
    
    return {
      id: sessionId,
      userId,
      startTime: Date.now(),
      startPage: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      device: this.detectDevice(),
      browser: this.detectBrowser(),
      location: await this.getUserLocation(),
    };
  }

  private setupEventListeners(): void {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.track({
          type: 'session_pause',
          timestamp: Date.now(),
          data: { sessionId: this.sessionData.id },
        });
      } else {
        this.track({
          type: 'session_resume',
          timestamp: Date.now(),
          data: { sessionId: this.sessionData.id },
        });
      }
    });

    // Scroll tracking
    if (this.config.enableScrollTracking) {
      let maxScroll = 0;
      const trackScroll = () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        maxScroll = Math.max(maxScroll, scrollPercent);
        
        this.trackEngagement('scroll', {
          scrollDepth: scrollPercent,
          maxScrollDepth: maxScroll,
          element: 'page',
        });
      };
      
      window.addEventListener('scroll', this.debounce(trackScroll, 100));
    }

    // Click tracking
    if (this.config.enableClickTracking) {
      document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        this.trackEngagement('click', {
          element: target.tagName.toLowerCase(),
          elementId: target.id,
          elementClass: target.className,
          coordinates: { x: event.clientX, y: event.clientY },
          text: target.textContent?.slice(0, 50),
        });
      });
    }

    // Performance monitoring
    if (this.config.enablePerformanceTracking) {
      this.trackPageLoadPerformance();
    }
  }

  private trackPageLoadPerformance(): void {
    if ('performance' in window) {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      this.trackPerformance({
        loadTime: navigation.loadEventEnd - navigation.fetchStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
        largestContentfulPaint: this.getLargestContentfulPaint(),
        cumulativeLayoutShift: this.getCLS(),
        firstInputDelay: this.getFID(),
      });
    }
  }

  private enrichEvent(event: AnalyticsEvent): AnalyticsEvent {
    return {
      ...event,
      sessionId: this.sessionData.id,
      userId: this.sessionData.userId,
      timestamp: event.timestamp || Date.now(),
      context: {
        ...event.context,
        userAgent: navigator.userAgent,
        viewport: this.sessionData.viewport,
        device: this.sessionData.device,
        browser: this.sessionData.browser,
        location: this.sessionData.location,
      },
    };
  }

  private updateUserProfile(activity: string, data: any): void {
    if (!this.userProfile) return;

    switch (activity) {
      case 'product_views':
        this.userProfile.behavior.productViews.push(data);
        this.updateCategoryPreferences(data.category);
        break;
      case 'cart_actions':
        this.userProfile.behavior.cartActions.push(data);
        break;
      case 'purchases':
        this.userProfile.behavior.purchases.push(data);
        this.updatePurchaseHistory(data);
        break;
      case 'searches':
        this.userProfile.behavior.searches.push(data);
        break;
    }

    this.userProfile.lastActivity = Date.now();
  }

  private updateCategoryPreferences(category: string): void {
    if (!this.userProfile) return;
    
    const current = this.userProfile.preferences.categories[category] || 0;
    this.userProfile.preferences.categories[category] = current + 1;
  }

  private updatePurchaseHistory(purchase: any): void {
    if (!this.userProfile) return;
    
    this.userProfile.demographics.totalSpent += purchase.totalAmount;
    this.userProfile.demographics.purchaseCount += 1;
    this.userProfile.demographics.avgOrderValue = 
      this.userProfile.demographics.totalSpent / this.userProfile.demographics.purchaseCount;
  }

  private startBatchProcessing(): void {
    this.batchInterval = setInterval(() => {
      this.processBatch();
    }, this.config.batchInterval);
  }

  private async processBatch(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.config.batchSize);
    
    try {
      await this.sendBatch(batch);
    } catch (error) {
      console.error('Failed to send analytics batch:', error);
      // Re-add events to queue for retry
      this.eventQueue.unshift(...batch);
    }
  }

  private async sendBatch(events: AnalyticsEvent[]): Promise<void> {
    await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });
  }

  private sendEventImmediate(event: AnalyticsEvent): void {
    // Send immediately for real-time events
    fetch(`${this.config.endpoint}/realtime`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }).catch(error => {
      console.error('Failed to send real-time event:', error);
    });
  }

  private debounce(func: Function, wait: number): Function {
    let timeout: NodeJS.Timeout;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Utility methods
  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    return sessionId;
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id') || null;
  }

  private detectDevice(): DeviceType {
    const userAgent = navigator.userAgent;
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) return 'tablet';
    if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  private detectBrowser(): string {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Chrome')) return 'chrome';
    if (userAgent.includes('Firefox')) return 'firefox';
    if (userAgent.includes('Safari')) return 'safari';
    if (userAgent.includes('Edge')) return 'edge';
    return 'unknown';
  }

  private async getUserLocation(): Promise<LocationData> {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      return {
        country: data.country_name,
        city: data.city,
        region: data.region,
        timezone: data.timezone,
      };
    } catch {
      return {
        country: 'unknown',
        city: 'unknown',
        region: 'unknown',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }
  }

  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  private getLargestContentfulPaint(): number {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  }

  private getCLS(): number {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        resolve(clsValue);
      }).observe({ entryTypes: ['layout-shift'] });
    });
  }

  private getFID(): number {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        if (firstInput) {
          resolve(firstInput.processingStart - firstInput.startTime);
        }
      }).observe({ entryTypes: ['first-input'] });
    });
  }

  private async generatePersonalizedContent(contentType: string, context?: any): Promise<PersonalizedContent[]> {
    // Implementation would use ML models to generate personalized content
    return [];
  }

  private async generateUserProfile(userId: string): Promise<UserProfile> {
    // Implementation would build comprehensive user profile
    return {
      userId,
      behavior: {
        productViews: [],
        cartActions: [],
        purchases: [],
        searches: [],
        sessionDuration: 0,
        pageViews: 0,
      },
      preferences: {
        categories: {},
        priceRanges: {},
        languages: {},
        brands: {},
      },
      demographics: {
        age: null,
        gender: null,
        location: null,
        totalSpent: 0,
        purchaseCount: 0,
        avgOrderValue: 0,
        loyaltyScore: 0,
      },
      segments: [],
      lastActivity: Date.now(),
      createdAt: Date.now(),
    };
  }

  private async fetchAnalyticsData(timeRange: TimeRange, metrics: AnalyticsMetric[]): Promise<AnalyticsReport> {
    // Implementation would fetch analytics data from backend
    return {
      timeRange,
      metrics: {},
      insights: [],
      recommendations: [],
    };
  }

  // Public API methods
  enableTracking(): void {
    this.isTracking = true;
  }

  disableTracking(): void {
    this.isTracking = false;
  }

  getSessionData(): SessionData {
    return { ...this.sessionData };
  }

  destroy(): void {
    if (this.batchInterval) {
      clearInterval(this.batchInterval);
    }
    
    // Process remaining events
    this.processBatch();
  }
}

// React hooks for analytics
export const useAdvancedAnalytics = () => {
  const [analytics] = useState(() => new AdvancedAnalyticsEngine());

  useEffect(() => {
    // Track page view on mount
    analytics.trackPageView(window.location.pathname, document.referrer);

    return () => {
      analytics.destroy();
    };
  }, [analytics]);

  return {
    trackProductView: analytics.trackProductView.bind(analytics),
    trackAddToCart: analytics.trackAddToCart.bind(analytics),
    trackPurchase: analytics.trackPurchase.bind(analytics),
    trackSearch: analytics.trackSearch.bind(analytics),
    trackEngagement: analytics.trackEngagement.bind(analytics),
    trackABTest: analytics.trackABTest.bind(analytics),
    getPersonalizedContent: analytics.getPersonalizedContent.bind(analytics),
    buildUserProfile: analytics.buildUserProfile.bind(analytics),
    getAnalyticsData: analytics.getAnalyticsData.bind(analytics),
  };
};

export const usePersonalization = (userId?: string) => {
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const analytics = useAdvancedAnalytics();

  useEffect(() => {
    if (userId) {
      loadUserProfile();
    }
  }, [userId]);

  const loadUserProfile = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const profile = await analytics.buildUserProfile(userId);
      setUserProfile(profile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPersonalizedContent = async (contentType: string, context?: any) => {
    setLoading(true);
    try {
      const content = await analytics.getPersonalizedContent(contentType, context);
      setPersonalizedContent(content);
      return content;
    } catch (error) {
      console.error('Failed to get personalized content:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  return {
    personalizedContent,
    userProfile,
    loading,
    getPersonalizedContent,
    refreshProfile: loadUserProfile,
  };
};

export const useABTesting = () => {
  const [variants, setVariants] = useState<Map<string, string>>(new Map());
  const analytics = useAdvancedAnalytics();

  const getVariant = useCallback((testName: string): string => {
    if (variants.has(testName)) {
      return variants.get(testName)!;
    }

    // Simple A/B test assignment (in production, use more sophisticated logic)
    const variant = Math.random() < 0.5 ? 'A' : 'B';
    setVariants(new Map(variants.set(testName, variant)));
    
    analytics.trackABTest(testName, variant);
    
    return variant;
  }, [analytics, variants]);

  const trackConversion = useCallback((testName: string, conversion: boolean = true) => {
    const variant = variants.get(testName);
    if (variant) {
      analytics.trackABTest(testName, variant, conversion);
    }
  }, [analytics, variants]);

  return {
    getVariant,
    trackConversion,
    variants,
  };
};

// Types
interface AnalyticsEvent {
  type: string;
  timestamp: number;
  data: any;
  sessionId?: string;
  userId?: string;
  context?: any;
}

interface SessionData {
  id: string;
  userId: string | null;
  startTime: number;
  startPage: string;
  referrer: string;
  userAgent: string;
  viewport: { width: number; height: number };
  device: DeviceType;
  browser: string;
  location: LocationData;
}

interface UserProfile {
  userId: string;
  behavior: {
    productViews: ProductViewEvent[];
    cartActions: CartActionEvent[];
    purchases: PurchaseEvent[];
    searches: SearchEvent[];
    sessionDuration: number;
    pageViews: number;
  };
  preferences: {
    categories: Record<string, number>;
    priceRanges: Record<string, number>;
    languages: Record<string, number>;
    brands: Record<string, number>;
  };
  demographics: {
    age: number | null;
    gender: string | null;
    location: LocationData | null;
    totalSpent: number;
    purchaseCount: number;
    avgOrderValue: number;
    loyaltyScore: number;
  };
  segments: string[];
  lastActivity: number;
  createdAt: number;
}

interface PersonalizedContent {
  id: string;
  type: string;
  title: string;
  content: any;
  relevanceScore: number;
  reason: string;
}

interface AnalyticsReport {
  timeRange: TimeRange;
  metrics: Record<string, any>;
  insights: AnalyticsInsight[];
  recommendations: AnalyticsRecommendation[];
}

interface AnalyticsInsight {
  type: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  data: any;
}

interface AnalyticsRecommendation {
  type: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expectedImpact: string;
}

// Supporting types
type DeviceType = 'desktop' | 'mobile' | 'tablet';
type AnalyticsMetric = 'page_views' | 'sessions' | 'users' | 'conversion_rate' | 'revenue' | 'engagement';

interface TimeRange {
  start: number;
  end: number;
}

interface LocationData {
  country: string;
  city: string;
  region: string;
  timezone: string;
}

interface AnalyticsConfig {
  endpoint: string;
  batchSize: number;
  batchInterval: number;
  enableRealTime: boolean;
  enablePersonalization: boolean;
  enableA/BTesting: boolean;
  enableHeatmap: boolean;
  enableScrollTracking: boolean;
  enableClickTracking: boolean;
  enablePerformanceTracking: boolean;
}

interface ProductViewContext {
  source?: string;
  position?: number;
  listId?: string;
}

interface AddToCartContext {
  source?: string;
  listId?: string;
  position?: number;
}

interface SearchContext {
  source?: string;
  filters?: any;
  sortBy?: string;
}

interface PurchaseData {
  id: string;
  total: number;
  currency: string;
  items: any[];
  paymentMethod: string;
  shippingMethod: string;
  discountApplied?: number;
  context?: any;
}

interface SearchResult {
  productId: number;
  clicked: boolean;
  position?: number;
}

interface EngagementData {
  element: string;
  elementId?: string;
  elementClass?: string;
  coordinates?: { x: number; y: number };
  text?: string;
  scrollDepth?: number;
  maxScrollDepth?: number;
}

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface ProductViewEvent {
  productId: number;
  category: string;
  price: number;
  timestamp: number;
}

interface CartActionEvent {
  action: 'add' | 'remove';
  productId: number;
  quantity: number;
  timestamp: number;
}

interface PurchaseEvent {
  orderId: string;
  totalAmount: number;
  items: any[];
  timestamp: number;
}

interface SearchEvent {
  query: string;
  resultCount: number;
  timestamp: number;
}

// Global instance
export const analyticsEngine = new AdvancedAnalyticsEngine();
