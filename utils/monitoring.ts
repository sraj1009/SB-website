/**
 * Monitoring and Analytics for SINGGLEBEE
 */

import { useState, useEffect } from 'react';

// Performance monitoring
export const performanceMetrics = {
  // Core Web Vitals
  measureLCP: (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        resolve(lastEntry.startTime);
      });
      observer.observe({ entryTypes: ['largest-contentful-paint'] });
    });
  },

  measureFID: (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            resolve((entry as any).processingStart - entry.startTime);
          }
        });
      });
      observer.observe({ entryTypes: ['first-input'] });
    });
  },

  measureCLS: (): Promise<number> => {
    return new Promise((resolve) => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
      });
      observer.observe({ entryTypes: ['layout-shift'] });
      
      // Return value after page load
      setTimeout(() => resolve(clsValue), 5000);
    });
  },

  measureTTI: (): Promise<number> => {
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'longtask') {
            resolve(entry.startTime);
          }
        });
      });
      observer.observe({ entryTypes: ['longtask'] });
    });
  },
};

// Error tracking
class ErrorTrackerClass {
  private static instance: ErrorTrackerClass;
  private errors: Array<{
    message: string;
    stack: string;
    timestamp: number;
    url: string;
    userAgent: string;
  }> = [];

  static getInstance(): ErrorTrackerClass {
    if (!ErrorTrackerClass.instance) {
      ErrorTrackerClass.instance = new ErrorTrackerClass();
    }
    return ErrorTrackerClass.instance;
  }

  track(error: Error, context?: Record<string, any>): void {
    const errorData = {
      message: error.message,
      stack: error.stack || '',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      ...context,
    };

    this.errors.push(errorData);
    this.sendError(errorData);
  }

  private sendError(errorData: any): void {
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Replace with actual error tracking service
      console.error('Error tracked:', errorData);
      
      // Example: Send to Sentry, LogRocket, etc.
      // Sentry.captureException(errorData);
    }
  }

  getErrors(): typeof this.errors {
    return this.errors;
  }

  clearErrors(): void {
    this.errors = [];
  }
}

// User behavior analytics
class UserAnalyticsClass {
  private static instance: UserAnalyticsClass;
  private events: Array<{
    type: string;
    data: any;
    timestamp: number;
    sessionId: string;
  }> = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupEventListeners();
  }

  static getInstance(): UserAnalyticsClass {
    if (!UserAnalyticsClass.instance) {
      UserAnalyticsClass.instance = new UserAnalyticsClass();
    }
    return UserAnalyticsClass.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  track(event: string, data?: any): void {
    const eventData = {
      type: event,
      data,
      timestamp: Date.now(),
      sessionId: this.sessionId,
    };

    this.events.push(eventData);
    this.sendEvent(eventData);
  }

  private sendEvent(eventData: any): void {
    if (process.env.NODE_ENV === 'production') {
      // Send to analytics service
      console.log('Analytics event:', eventData);
      
      // Example: Send to Google Analytics, Mixpanel, etc.
      // gtag('event', eventData.type, eventData.data);
    }
  }

  private setupEventListeners(): void {
    // Page visibility changes
    document.addEventListener('visibilitychange', () => {
      this.track(document.hidden ? 'page_hidden' : 'page_visible');
    });

    // Page unload
    window.addEventListener('beforeunload', () => {
      this.track('page_unload');
    });

    // Error events
    window.addEventListener('error', (event) => {
      ErrorTrackerClass.getInstance().track(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      ErrorTrackerClass.getInstance().track(new Error(event.reason), {
        type: 'unhandled_promise_rejection',
      });
    });
  }

  getEvents(): typeof this.events {
    return this.events;
  }

  clearEvents(): void {
    this.events = [];
  }
}

// Performance monitoring hook
export const usePerformanceMonitoring = () => {
  const [metrics, setMetrics] = useState({
    lcp: 0,
    fid: 0,
    cls: 0,
    tti: 0,
  });

  useEffect(() => {
    const measureMetrics = async () => {
      const [lcp, fid, cls, tti] = await Promise.all([
        performanceMetrics.measureLCP(),
        performanceMetrics.measureFID(),
        performanceMetrics.measureCLS(),
        performanceMetrics.measureTTI(),
      ]);

      setMetrics({ lcp, fid, cls, tti });

      // Track performance metrics
      UserAnalyticsClass.getInstance().track('performance_metrics', {
        lcp,
        fid,
        cls,
        tti,
      });
    };

    // Wait for page load
    if (document.readyState === 'complete') {
      measureMetrics();
    } else {
      window.addEventListener('load', measureMetrics);
    }

    return () => {
      window.removeEventListener('load', measureMetrics);
    };
  }, []);

  return metrics;
};

// Custom analytics hook
export const useAnalytics = () => {
  const analytics = UserAnalyticsClass.getInstance();

  const trackEvent = (event: string, data?: any) => {
    analytics.track(event, data);
  };

  const trackPageView = (path?: string) => {
    analytics.track('page_view', {
      path: path || window.location.pathname,
      title: document.title,
    });
  };

  const trackUserInteraction = (action: string, element: string, data?: any) => {
    analytics.track('user_interaction', {
      action,
      element,
      ...data,
    });
  };

  const trackConversion = (type: string, value?: number, currency?: string) => {
    analytics.track('conversion', {
      type,
      value,
      currency,
    });
  };

  return {
    trackEvent,
    trackPageView,
    trackUserInteraction,
    trackConversion,
  };
};

// Health monitoring
class HealthMonitorClass {
  private static instance: HealthMonitorClass;
  private checks: Map<string, () => Promise<boolean>> = new Map();
  private status: Map<string, boolean> = new Map();

  static getInstance(): HealthMonitorClass {
    if (!HealthMonitorClass.instance) {
      HealthMonitorClass.instance = new HealthMonitorClass();
    }
    return HealthMonitorClass.instance;
  }

  addCheck(name: string, checkFn: () => Promise<boolean>): void {
    this.checks.set(name, checkFn);
  }

  async runChecks(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    for (const [name, checkFn] of this.checks) {
      try {
        const result = await checkFn();
        results[name] = result;
        this.status.set(name, result);
      } catch (error) {
        results[name] = false;
        this.status.set(name, false);
      }
    }

    return results;
  }

  getStatus(): Record<string, boolean> {
    return Object.fromEntries(this.status);
  }

  isHealthy(): boolean {
    return Array.from(this.status.values()).every(status => status);
  }
}

// Default health checks
export const defaultHealthChecks = {
  api: async (): Promise<boolean> => {
    try {
      await fetch('/api/health');
      return true;
    } catch {
      return false;
    }
  },

  storage: async (): Promise<boolean> => {
    try {
      localStorage.setItem('health_check', 'test');
      localStorage.removeItem('health_check');
      return true;
    } catch {
      return false;
    }
  },

  network: async (): Promise<boolean> => {
    try {
      await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
      });
      return true;
    } catch {
      return false;
    }
  },
};

// Initialize monitoring
export const initializeMonitoring = () => {
  // Initialize error tracking
  window.addEventListener('error', (event) => {
    ErrorTrackerClass.getInstance().track(event.error);
  });

  // Initialize analytics
  const analytics = UserAnalyticsClass.getInstance();
  analytics.track('session_start', {
    userAgent: navigator.userAgent,
    language: navigator.language,
    screenResolution: `${screen.width}x${screen.height}`,
  });

  // Initialize health monitoring
  const healthMonitor = HealthMonitorClass.getInstance();
  healthMonitor.addCheck('api', defaultHealthChecks.api);
  healthMonitor.addCheck('storage', defaultHealthChecks.storage);
  healthMonitor.addCheck('network', defaultHealthChecks.network);

  // Run health checks periodically
  setInterval(async () => {
    const health = await healthMonitor.runChecks();
    analytics.track('health_check', health);
  }, 60000); // Every minute
};

// Export for use in components
export const ErrorTracker = ErrorTrackerClass.getInstance();
export const UserAnalytics = UserAnalyticsClass.getInstance();
export const HealthMonitor = HealthMonitorClass.getInstance();
