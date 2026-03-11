// � Performance Monitoring for SINGGLEBEE

import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte

  // Network metrics
  dns: number; // DNS lookup time
  tcp: number; // TCP connection time
  ssl: number; // SSL handshake time
  ttl: number; // Time to last byte

  // Resource metrics
  resourceCount: number;
  totalSize: number;
  cachedResources: number;

  // User experience metrics
  renderTime: number;
  hydrationTime: number;
  interactionTime: number;

  // Custom metrics
  apiResponseTime: number;
  bundleSize: number;
  memoryUsage: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical' | 'info';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  message: string;
  timestamp: Date;
}

interface PerformanceThresholds {
  lcp: { warning: 2500; critical: 4000 };
  fid: { warning: 100; critical: 300 };
  cls: { warning: 0.1; critical: 0.25 };
  fcp: { warning: 1800; critical: 3000 };
  ttfb: { warning: 800; critical: 1800 };
  apiResponseTime: { warning: 1000; critical: 2000 };
  bundleSize: { warning: 1048576; critical: 2097152 }; // 1MB, 2MB
  memoryUsage: { warning: 50; critical: 80 }; // MB
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {
    lcp: 0,
    fid: 0,
    cls: 0,
    fcp: 0,
    ttfb: 0,
    dns: 0,
    tcp: 0,
    ssl: 0,
    ttl: 0,
    resourceCount: 0,
    totalSize: 0,
    cachedResources: 0,
    renderTime: 0,
    hydrationTime: 0,
    interactionTime: 0,
    apiResponseTime: 0,
    bundleSize: 0,
    memoryUsage: 0,
  };

  private thresholds: PerformanceThresholds = {
    lcp: { warning: 2500, critical: 4000 },
    fid: { warning: 100, critical: 300 },
    cls: { warning: 0.1, critical: 0.25 },
    fcp: { warning: 1800, critical: 3000 },
    ttfb: { warning: 800, critical: 1800 },
    apiResponseTime: { warning: 1000, critical: 2000 },
    bundleSize: { warning: 1048576, critical: 2097152 },
    memoryUsage: { warning: 50, critical: 80 },
  };

  private alerts: PerformanceAlert[] = [];
  private observers: PerformanceObserver[] = [];
  private startTime: number = Date.now();
  private isMonitoring: boolean = false;

  constructor() {
    this.initializeMonitoring();
  }

  // Initialize performance monitoring
  private initializeMonitoring(): void {
    if (typeof window === 'undefined') return;

    this.startTime = performance.now();
    this.isMonitoring = true;

    // Core Web Vitals
    this.observeWebVitals();

    // Resource timing
    this.observeResources();

    // Navigation timing
    this.observeNavigation();

    // Memory usage
    this.observeMemory();

    // Custom metrics
    this.observeCustomMetrics();
  }

  // Observe Core Web Vitals
  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    // Largest Contentful Paint (LCP)
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.lcp = lastEntry.startTime;
        this.checkThreshold('lcp', this.metrics.lcp);
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // First Input Delay (FID)
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-input') {
            this.metrics.fid = (entry as any).processingStart - entry.startTime;
            this.checkThreshold('fid', this.metrics.fid);
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Cumulative Layout Shift (CLS)
    try {
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        this.metrics.cls = clsValue;
        this.checkThreshold('cls', this.metrics.cls);
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }

    // First Contentful Paint (FCP)
    try {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            this.metrics.fcp = entry.startTime;
            this.checkThreshold('fcp', this.metrics.fcp);
          }
        });
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);
    } catch (error) {
      console.warn('FCP observer not supported:', error);
    }
  }

  // Observe resource timing
  private observeResources(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.metrics.resourceCount = entries.length;

        let totalSize = 0;
        let cachedCount = 0;

        entries.forEach((entry) => {
          const resource = entry as PerformanceResourceTiming;

          // Calculate resource size
          if (resource.transferSize) {
            totalSize += resource.transferSize;
          }

          // Check if cached
          if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
            cachedCount++;
          }
        });

        this.metrics.totalSize = totalSize;
        this.metrics.cachedResources = cachedCount;
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  // Observe navigation timing
  private observeNavigation(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;

            this.metrics.ttfb = navEntry.responseStart - navEntry.requestStart;
            this.metrics.dns = navEntry.domainLookupEnd - navEntry.domainLookupStart;
            this.metrics.tcp = navEntry.connectEnd - navEntry.connectStart;
            this.metrics.ssl =
              navEntry.secureConnectionStart > 0
                ? navEntry.connectEnd - navEntry.secureConnectionStart
                : 0;
            this.metrics.ttl = navEntry.responseEnd - navEntry.requestStart;

            this.checkThreshold('ttfb', this.metrics.ttfb);
          }
        });
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }
  }

  // Observe memory usage
  private observeMemory(): void {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      if (memory) {
        this.metrics.memoryUsage = memory.usedJSHeapSize / (1024 * 1024); // Convert to MB
        this.checkThreshold('memoryUsage', this.metrics.memoryUsage);
      }
    };

    // Check memory every 5 seconds
    setInterval(checkMemory, 5000);
    checkMemory(); // Initial check
  }

  // Observe custom metrics
  private observeCustomMetrics(): void {
    // Track render time
    const renderTime = performance.now() - this.startTime;
    this.metrics.renderTime = renderTime;

    // Track bundle size (if available)
    if (window.performance && (window.performance as any).getEntriesByType) {
      const entries = (window.performance as any).getEntriesByType('resource');
      const jsEntries = entries.filter((entry: any) => entry.name.includes('.js'));
      const totalJSSize = jsEntries.reduce((total: number, entry: any) => {
        return total + (entry.transferSize || 0);
      }, 0);
      this.metrics.bundleSize = totalJSSize;
      this.checkThreshold('bundleSize', this.metrics.bundleSize);
    }
  }

  // Check threshold and create alert
  private checkThreshold(metric: keyof PerformanceMetrics, value: number): void {
    const threshold = this.thresholds[metric];
    if (!threshold) return;

    let alertType: 'warning' | 'critical' | 'info';
    let thresholdValue: number;

    if (value >= threshold.critical) {
      alertType = 'critical';
      thresholdValue = threshold.critical;
    } else if (value >= threshold.warning) {
      alertType = 'warning';
      thresholdValue = threshold.warning;
    } else {
      return; // No alert needed
    }

    const alert: PerformanceAlert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: alertType,
      metric,
      value,
      threshold: thresholdValue,
      message: this.generateAlertMessage(metric, value, thresholdValue, alertType),
      timestamp: new Date(),
    };

    this.alerts.push(alert);
    this.handleAlert(alert);
  }

  // Generate alert message
  private generateAlertMessage(
    metric: keyof PerformanceMetrics,
    value: number,
    threshold: number,
    type: 'warning' | 'critical' | 'info'
  ): string {
    const metricNames: Record<keyof PerformanceMetrics, string> = {
      lcp: 'Largest Contentful Paint',
      fid: 'First Input Delay',
      cls: 'Cumulative Layout Shift',
      fcp: 'First Contentful Paint',
      ttfb: 'Time to First Byte',
      dns: 'DNS Lookup Time',
      tcp: 'TCP Connection Time',
      ssl: 'SSL Handshake Time',
      ttl: 'Time to Last Byte',
      resourceCount: 'Resource Count',
      totalSize: 'Total Page Size',
      cachedResources: 'Cached Resources',
      renderTime: 'Render Time',
      hydrationTime: 'Hydration Time',
      interactionTime: 'Interaction Time',
      apiResponseTime: 'API Response Time',
      bundleSize: 'Bundle Size',
      memoryUsage: 'Memory Usage',
    };

    const units: Partial<Record<keyof PerformanceMetrics, string>> = {
      lcp: 'ms',
      fid: 'ms',
      cls: '',
      fcp: 'ms',
      ttfb: 'ms',
      dns: 'ms',
      tcp: 'ms',
      ssl: 'ms',
      ttl: 'ms',
      totalSize: 'bytes',
      renderTime: 'ms',
      apiResponseTime: 'ms',
      bundleSize: 'bytes',
      memoryUsage: 'MB',
    };

    const metricName = metricNames[metric];
    const unit = units[metric] || '';

    return `${metricName} is ${type === 'critical' ? 'critically' : 'slightly'} high: ${value}${unit} (threshold: ${threshold}${unit})`;
  }

  // Handle alert
  private handleAlert(alert: PerformanceAlert): void {
    console.warn(`Performance Alert [${alert.type.toUpperCase()}]: ${alert.message}`);

    // In production, send to monitoring service
    if (alert.type === 'critical') {
      // Send immediate notification
      this.sendAlertNotification(alert);
    }
  }

  // Send alert notification
  private sendAlertNotification(alert: PerformanceAlert): void {
    // In production, integrate with notification service
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        type: 'performance_alert',
        alert,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      });

      navigator.sendBeacon('/api/v1/performance/alerts', data);
    }
  }

  // Track API response time
  trackApiResponseTime(endpoint: string, duration: number): void {
    this.metrics.apiResponseTime = duration;
    this.checkThreshold('apiResponseTime', duration);
  }

  // Track user interaction time
  trackInteractionTime(interactionType: string, duration: number): void {
    this.metrics.interactionTime = duration;
  }

  // Get current metrics
  getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Get alerts
  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  // Clear alerts
  clearAlerts(): void {
    this.alerts = [];
  }

  // Get performance score
  getPerformanceScore(): number {
    const weights = {
      lcp: 0.25,
      fid: 0.25,
      cls: 0.25,
      fcp: 0.15,
      ttfb: 0.1,
    };

    let score = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([metric, weight]) => {
      const value = this.metrics[metric as keyof PerformanceMetrics];
      const threshold = this.thresholds[metric as keyof PerformanceThresholds] as
        | { warning: number; critical: number }
        | undefined;

      if (threshold && value > 0) {
        const normalizedScore = Math.max(
          0,
          100 - ((value - threshold.warning) / (threshold.critical - threshold.warning)) * 100
        );
        score += normalizedScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(score / totalWeight) : 0;
  }

  // Generate performance report
  generateReport(): {
    metrics: PerformanceMetrics;
    score: number;
    alerts: PerformanceAlert[];
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    const score = this.getPerformanceScore();
    const alerts = this.getAlerts();
    const recommendations = this.generateRecommendations(alerts);

    return {
      metrics,
      score,
      alerts,
      recommendations,
    };
  }

  // Generate recommendations
  private generateRecommendations(alerts: PerformanceAlert[]): string[] {
    const recommendations: string[] = [];
    const alertMetrics = new Set(alerts.map((a) => a.metric));

    if (alertMetrics.has('lcp')) {
      recommendations.push('Optimize images and reduce server response time to improve LCP');
    }

    if (alertMetrics.has('fid')) {
      recommendations.push(
        'Reduce JavaScript execution time and break up long tasks to improve FID'
      );
    }

    if (alertMetrics.has('cls')) {
      recommendations.push(
        'Ensure images have dimensions and avoid inserting content above existing content to reduce CLS'
      );
    }

    if (alertMetrics.has('ttfb')) {
      recommendations.push('Optimize server performance and use CDN to reduce TTFB');
    }

    if (alertMetrics.has('bundleSize')) {
      recommendations.push('Implement code splitting and tree shaking to reduce bundle size');
    }

    if (alertMetrics.has('memoryUsage')) {
      recommendations.push('Optimize memory usage and implement proper cleanup in components');
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is optimal! Keep monitoring for improvements.');
    }

    return recommendations;
  }

  // Stop monitoring
  stopMonitoring(): void {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.isMonitoring = false;
  }

  // Resume monitoring
  resumeMonitoring(): void {
    if (!this.isMonitoring) {
      this.initializeMonitoring();
    }
  }
}

// React Hook for performance monitoring
export const usePerformanceMonitor = () => {
  const [monitor] = useState(() => new PerformanceMonitor());
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [score, setScore] = useState<number>(0);
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);

  useEffect(() => {
    const updateMetrics = () => {
      setMetrics(monitor.getCurrentMetrics());
      setScore(monitor.getPerformanceScore());
      setAlerts(monitor.getAlerts());
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [monitor]);

  const trackApiResponse = (endpoint: string, duration: number) => {
    monitor.trackApiResponseTime(endpoint, duration);
  };

  const trackInteraction = (interactionType: string, duration: number) => {
    monitor.trackInteractionTime(interactionType, duration);
  };

  const generateReport = () => {
    return monitor.generateReport();
  };

  const clearAlerts = () => {
    monitor.clearAlerts();
    setAlerts([]);
  };

  return {
    metrics,
    score,
    alerts,
    trackApiResponse,
    trackInteraction,
    generateReport,
    clearAlerts,
  };
};

export default PerformanceMonitor;
