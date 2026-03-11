// 📊 Google Analytics 4 Implementation for SINGGLEBEE

import React from 'react';

interface AnalyticsEvent {
  name: string;
  parameters: Record<string, any>;
}

interface UserProperties {
  user_id?: string;
  language?: string;
  age_group?: string;
  interests?: string[];
  location?: string;
  device_category?: string;
}

class AnalyticsManager {
  private measurementId: string;
  private isInitialized: boolean = false;

  constructor() {
    this.measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
  }

  // Initialize Google Analytics
  init() {
    if (typeof window === 'undefined' || this.isInitialized) return;

    // Load gtag script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag('js', new Date());
    window.gtag('config', this.measurementId, {
      debug_mode: process.env.NODE_ENV === 'development',
      custom_map: {
        custom_parameter_1: 'product_category',
        custom_parameter_2: 'user_engagement_level',
        custom_parameter_3: 'content_language',
      },
    });

    this.isInitialized = true;
  }

  // Track page views
  trackPageView(pagePath?: string, pageTitle?: string) {
    if (!this.isInitialized) return;

    window.gtag('config', this.measurementId, {
      page_path: pagePath || window.location.pathname,
      page_title: pageTitle || document.title,
    });
  }

  // Track custom events
  trackEvent(eventName: string, parameters: Record<string, any> = {}) {
    if (!this.isInitialized) return;

    window.gtag('event', eventName, {
      event_category: parameters.category || 'engagement',
      event_label: parameters.label || '',
      value: parameters.value || 0,
      ...parameters,
    });
  }

  // E-commerce events
  trackViewItem(item: any) {
    this.trackEvent('view_item', {
      currency: 'INR',
      value: item.price || 0,
      items: [
        {
          item_id: item.id,
          item_name: item.title,
          category: item.category,
          price: item.price || 0,
          quantity: 1,
        },
      ],
    });
  }

  trackAddToCart(item: any, quantity: number = 1) {
    this.trackEvent('add_to_cart', {
      currency: 'INR',
      value: (item.price || 0) * quantity,
      items: [
        {
          item_id: item.id,
          item_name: item.title,
          category: item.category,
          price: item.price || 0,
          quantity,
        },
      ],
    });
  }

  trackBeginCheckout(items: any[], value: number) {
    this.trackEvent('begin_checkout', {
      currency: 'INR',
      value,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.title,
        category: item.category,
        price: item.price || 0,
        quantity: item.quantity || 1,
      })),
    });
  }

  trackPurchase(transactionId: string, items: any[], value: number) {
    this.trackEvent('purchase', {
      transaction_id: transactionId,
      currency: 'INR',
      value,
      items: items.map((item) => ({
        item_id: item.id,
        item_name: item.title,
        category: item.category,
        price: item.price || 0,
        quantity: item.quantity || 1,
      })),
    });
  }

  // User engagement events
  trackSearch(searchTerm: string, resultsCount: number) {
    this.trackEvent('search', {
      search_term: searchTerm,
      results_count: resultsCount,
    });
  }

  trackShare(contentType: string, contentId: string, method: string) {
    this.trackEvent('share', {
      content_type: contentType,
      content_id: contentId,
      method: method,
    });
  }

  trackSignUp(method: string) {
    this.trackEvent('sign_up', {
      method,
    });
  }

  trackLogin(method: string) {
    this.trackEvent('login', {
      method,
    });
  }

  // Content engagement
  trackContentView(contentId: string, contentType: string, title: string) {
    this.trackEvent('content_view', {
      content_id: contentId,
      content_type: contentType,
      content_title: title,
    });
  }

  trackVideoPlay(videoName: string, videoUrl: string) {
    this.trackEvent('video_play', {
      video_name: videoName,
      video_url: videoUrl,
    });
  }

  trackVideoComplete(videoName: string, videoUrl: string) {
    this.trackEvent('video_complete', {
      video_name: videoName,
      video_url: videoUrl,
    });
  }

  // Error tracking
  trackError(error: Error, context?: string) {
    this.trackEvent('error', {
      error_message: error.message,
      error_stack: error.stack,
      context: context || 'unknown',
    });
  }

  // Set user properties
  setUserProperties(properties: UserProperties) {
    if (!this.isInitialized) return;

    window.gtag('config', this.measurementId, {
      user_id: properties.user_id,
      custom_map: {
        language: properties.language,
        age_group: properties.age_group,
        interests: properties.interests,
        location: properties.location,
        device_category: properties.device_category,
      },
    });
  }

  // Track user engagement time
  trackEngagementTime(duration: number) {
    this.trackEvent('user_engagement', {
      engagement_time_msec: duration,
    });
  }

  // Track form interactions
  trackFormSubmit(formName: string, success: boolean) {
    this.trackEvent('form_submit', {
      form_name: formName,
      success: success,
    });
  }

  // Track download events
  trackDownload(fileName: string, fileType: string) {
    this.trackEvent('download', {
      file_name: fileName,
      file_type: fileType,
    });
  }

  // Track outbound links
  trackOutboundLink(url: string, linkText: string) {
    this.trackEvent('outbound_link', {
      link_url: url,
      link_text: linkText,
    });
  }

  // Enhanced ecommerce
  trackProductClick(item: any, listName: string, listPosition: number) {
    this.trackEvent('select_item', {
      item_list_name: listName,
      items: [
        {
          item_id: item.id,
          item_name: item.title,
          category: item.category,
          price: item.price || 0,
          list_position: listPosition,
          quantity: 1,
        },
      ],
    });
  }

  trackProductImpression(items: any[], listName: string) {
    this.trackEvent('view_item_list', {
      item_list_name: listName,
      items: items.map((item, index) => ({
        item_id: item.id,
        item_name: item.title,
        category: item.category,
        price: item.price || 0,
        list_position: index + 1,
        quantity: 1,
      })),
    });
  }

  // Custom SINGGLEBEE events
  trackEducationalContent(
    contentType: 'book' | 'poem' | 'story',
    contentId: string,
    language: string
  ) {
    this.trackEvent('educational_content', {
      content_type: contentType,
      content_id: contentId,
      language: language,
    });
  }

  trackLanguageChange(fromLanguage: string, toLanguage: string) {
    this.trackEvent('language_change', {
      from_language: fromLanguage,
      to_language: toLanguage,
    });
  }

  trackAgeGroupSelection(ageGroup: string) {
    this.trackEvent('age_group_selection', {
      age_group: ageGroup,
    });
  }

  trackBookmarkAction(action: 'add' | 'remove', itemType: string, itemId: string) {
    this.trackEvent('bookmark_action', {
      action: action,
      item_type: itemType,
      item_id: itemId,
    });
  }

  // Performance tracking
  trackPageLoadTime(loadTime: number) {
    this.trackEvent('page_load_time', {
      load_time_ms: loadTime,
    });
  }

  trackCoreWebVitals(metrics: {
    lcp: number; // Largest Contentful Paint
    fid: number; // First Input Delay
    cls: number; // Cumulative Layout Shift
  }) {
    this.trackEvent('core_web_vitals', {
      lcp: metrics.lcp,
      fid: metrics.fid,
      cls: metrics.cls,
    });
  }
}

// Create singleton instance
const analytics = new AnalyticsManager();

// React Hook for analytics
export const useAnalytics = () => {
  React.useEffect(() => {
    analytics.init();
  }, []);

  return analytics;
};

// Export analytics instance
export default analytics;

// Type declarations for gtag
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}
