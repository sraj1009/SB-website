/**
 * Progressive Web App 2.0 Advanced Features for SINGGLEBEE
 */

import { cacheConfigs, cacheManager } from './advanced-cache';

// Advanced PWA Manager
class AdvancedPWAManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstalled = false;
  private isOnline = navigator.onLine;
  private networkInfo: NetworkInformation | null = null;
  private storageQuota: StorageQuota | null = null;
  private backgroundSyncManager: BackgroundSyncManager;
  private pushNotificationManager: PushNotificationManager;
  private offlineManager: OfflineManager;

  constructor() {
    this.backgroundSyncManager = new BackgroundSyncManager();
    this.pushNotificationManager = new PushNotificationManager();
    this.offlineManager = new OfflineManager();
    
    this.setupEventListeners();
    this.initializeNetworkInfo();
    this.checkStorageQuota();
  }

  // PWA Installation
  async initialize(): Promise<void> {
    try {
      this.swRegistration = await this.registerServiceWorker();
      await this.checkInstallationStatus();
      this.setupBackgroundSync();
      this.setupPushNotifications();
    } catch (error) {
      console.error('PWA initialization failed:', error);
    }
  }

  private async registerServiceWorker(): Promise<ServiceWorkerRegistration> {
    if (!('serviceWorker' in navigator)) {
      throw new Error('Service Worker not supported');
    }

    return navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
  }

  // Installation Prompts
  async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      console.log('Install prompt not available');
      return false;
    }

    try {
      const result = await this.deferredPrompt.prompt();
      const outcome = await result.userChoice;
      
      if (outcome === 'accepted') {
        this.isInstalled = true;
        console.log('PWA installed successfully');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Install prompt failed:', error);
      return false;
    }
  }

  // Background Sync
  private setupBackgroundSync(): void {
    if (!this.swRegistration) return;

    this.backgroundSyncManager.initialize(this.swRegistration);
  }

  // Push Notifications
  async requestNotificationPermission(): Promise<boolean> {
    return this.pushNotificationManager.requestPermission();
  }

  async subscribeToNotifications(): Promise<PushSubscription | null> {
    if (!this.swRegistration) return null;
    
    return this.pushNotificationManager.subscribe(this.swRegistration);
  }

  async unsubscribeFromNotifications(): Promise<void> {
    return this.pushNotificationManager.unsubscribe();
  }

  // Offline Capabilities
  async enableOfflineMode(): Promise<void> {
    await this.offlineManager.enable();
  }

  async syncOfflineData(): Promise<void> {
    await this.offlineManager.syncAll();
  }

  // Storage Management
  async getStorageUsage(): Promise<StorageUsage> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        quota: estimate.quota || 0,
        usage: estimate.usage || 0,
        usageDetails: estimate.usageDetails || {},
        available: (estimate.quota || 0) - (estimate.usage || 0),
      };
    }
    
    return {
      quota: 0,
      usage: 0,
      usageDetails: {},
      available: 0,
    };
  }

  async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  }

  // Network Information
  private initializeNetworkInfo(): void {
    if ('connection' in navigator) {
      this.networkInfo = (navigator as any).connection;
      
      this.networkInfo.addEventListener('change', () => {
        this.handleNetworkChange();
      });
    }
  }

  private handleNetworkChange(): void {
    const isOnline = navigator.onLine;
    
    if (isOnline !== this.isOnline) {
      this.isOnline = isOnline;
      
      if (isOnline) {
        this.handleConnectionRestored();
      } else {
        this.handleConnectionLost();
      }
    }
  }

  private handleConnectionRestored(): void {
    // Sync offline data when connection is restored
    this.syncOfflineData();
    
    // Notify user they're back online
    this.showNotification('Back Online', 'Your connection has been restored');
  }

  private handleConnectionLost(): void {
    // Enable offline mode
    this.enableOfflineMode();
    
    // Notify user they're offline
    this.showNotification('Offline Mode', 'You are currently offline. Some features may be limited.');
  }

  // Advanced Features
  async enablePeriodicSync(period: number = 3600000): Promise<void> {
    if (!this.swRegistration) return;

    if ('periodicSync' in this.swRegistration) {
      try {
        await (this.swRegistration as any).periodicSync.register({
          tag: 'content-sync',
          minPeriod: period, // 1 hour default
        });
      } catch (error) {
        console.error('Periodic sync registration failed:', error);
      }
    }
  }

  async enableWebShareAPI(): Promise<boolean> {
    if (!('share' in navigator)) {
      return false;
    }
    return true;
  }

  async shareContent(data: ShareData): Promise<void> {
    if (!('share' in navigator)) {
      throw new Error('Web Share API not supported');
    }

    try {
      await navigator.share(data);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        throw error;
      }
    }
  }

  // Device Capabilities
  getDeviceCapabilities(): DeviceCapabilities {
    return {
      isPWA: this.isPWA(),
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      supportsBackgroundSync: 'serviceWorker' in navigator && 'sync' in ServiceWorker.prototype,
      supportsPushNotifications: 'PushManager' in window,
      supportsWebShare: 'share' in navigator,
      supportsPaymentRequest: 'PaymentRequest' in window,
      supportsWebBluetooth: 'bluetooth' in navigator,
      supportsWebUSB: 'usb' in navigator,
      supportsWebNFC: 'nfc' in navigator,
      supportsWakeLock: 'wakeLock' in navigator,
      supportsScreenWakeLock: 'screen' in navigator && 'wakeLock' in navigator.screen,
      supportsDeviceOrientation: 'DeviceOrientationEvent' in window,
      supportsDeviceMotion: 'DeviceMotionEvent' in window,
      supportsGeolocation: 'geolocation' in navigator,
      supportsCamera: 'mediaDevices' in navigator,
      supportsMicrophone: 'mediaDevices' in navigator,
      networkType: this.networkInfo?.effectiveType || 'unknown',
      networkSpeed: this.networkInfo?.downlink || 0,
    };
  }

  // Performance Monitoring
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    return {
      loadTime: navigation.loadEventEnd - navigation.fetchStart,
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
      firstPaint: this.getFirstPaint(),
      firstContentfulPaint: this.getFirstContentfulPaint(),
      largestContentfulPaint: await this.getLargestContentfulPaint(),
      cumulativeLayoutShift: await this.getCLS(),
      firstInputDelay: await this.getFID(),
      timeToInteractive: await this.getTTI(),
    };
  }

  // App Badging
  async setAppBadge(count?: number): Promise<void> {
    if ('setAppBadge' in navigator && 'clearAppBadge' in navigator) {
      try {
        if (count !== undefined && count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
      } catch (error) {
        console.error('Badge setting failed:', error);
      }
    }
  }

  // Screen Wake Lock
  async requestWakeLock(): Promise<WakeLockSentinel | null> {
    if ('wakeLock' in navigator) {
      try {
        return await (navigator as any).wakeLock.request('screen');
      } catch (error) {
        console.error('Wake lock request failed:', error);
        return null;
      }
    }
    return null;
  }

  // Private helper methods
  private setupEventListeners(): void {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
    });

    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      console.log('PWA was installed');
    });

    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleConnectionRestored();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleConnectionLost();
    });
  }

  private async checkInstallationStatus(): Promise<void> {
    if ('getInstalledRelatedApps' in navigator) {
      try {
        const relatedApps = await (navigator as any).getInstalledRelatedApps();
        this.isInstalled = relatedApps.some((app: any) => app.id === location.origin);
      } catch (error) {
        console.error('Failed to check installation status:', error);
      }
    }
  }

  private async checkStorageQuota(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        this.storageQuota = {
          quota: estimate.quota || 0,
          usage: estimate.usage || 0,
          usageDetails: estimate.usageDetails || {},
        };
      } catch (error) {
        console.error('Failed to check storage quota:', error);
      }
    }
  }

  private isPWA(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true ||
           document.referrer.includes('android-app://');
  }

  private showNotification(title: string, body: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
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

  private async getLargestContentfulPaint(): Promise<number> {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        resolve(lastEntry.startTime);
      }).observe({ entryTypes: ['largest-contentful-paint'] });
    });
  }

  private async getCLS(): Promise<number> {
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

  private async getFID(): Promise<number> {
    return new Promise((resolve) => {
      new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0];
        if (firstInput) {
          resolve(firstInput.processingStart - firstInput.startTime);
        }
      }).observe({ entryTypes: ['first-input'] });
    });
  }

  private async getTTI(): Promise<number> {
    // Simplified TTI calculation
    return new Promise((resolve) => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            observer.disconnect();
            resolve(entry.startTime + entry.duration);
            return;
          }
        }
      });
      
      observer.observe({ entryTypes: ['longtask'] });
      
      // Fallback if no long tasks are found
      setTimeout(() => {
        observer.disconnect();
        resolve(performance.now());
      }, 10000);
    });
  }
}

// Background Sync Manager
class BackgroundSyncManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private syncQueue: SyncAction[] = [];

  initialize(swRegistration: ServiceWorkerRegistration): void {
    this.swRegistration = swRegistration;
    this.setupSyncEventListeners();
  }

  private setupSyncEventListeners(): void {
    if (!this.swRegistration) return;

    this.swRegistration.addEventListener('message', (event) => {
      if (event.data.type === 'sync-completed') {
        this.handleSyncCompleted(event.data.syncId);
      }
    });
  }

  async registerSync(action: SyncAction): Promise<void> {
    if (!this.swRegistration) return;

    this.syncQueue.push(action);

    if ('serviceWorker' in navigator && 'sync' in ServiceWorker.prototype) {
      try {
        await (this.swRegistration as any).sync.register(action.type);
      } catch (error) {
        console.error('Background sync registration failed:', error);
      }
    }
  }

  private handleSyncCompleted(syncId: string): void {
    this.syncQueue = this.syncQueue.filter(action => action.id !== syncId);
  }
}

// Push Notification Manager
class PushNotificationManager {
  private subscription: PushSubscription | null = null;

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribe(swRegistration: ServiceWorkerRegistration): Promise<PushSubscription | null> {
    if (!('PushManager' in window)) {
      console.log('Push notifications not supported');
      return null;
    }

    try {
      const subscription = await swRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY),
      });

      this.subscription = subscription;
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Push subscription failed:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.subscription) return;

    try {
      await this.subscription.unsubscribe();
      await this.removeSubscriptionFromServer(this.subscription);
      this.subscription = null;
    } catch (error) {
      console.error('Push unsubscribe failed:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
  }

  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
  }
}

// Offline Manager
class OfflineManager {
  private offlineQueue: OfflineAction[] = [];
  private isEnabled = false;

  async enable(): Promise<void> {
    this.isEnabled = true;
    await this.cacheCriticalResources();
  }

  async syncAll(): Promise<void> {
    if (!this.isEnabled) return;

    for (const action of this.offlineQueue) {
      try {
        await this.executeAction(action);
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
    
    this.offlineQueue = [];
  }

  queueAction(action: OfflineAction): void {
    if (this.isEnabled) {
      this.offlineQueue.push(action);
    }
  }

  private async cacheCriticalResources(): Promise<void> {
    if ('caches' in window) {
      const cache = await caches.open('critical-resources');
      
      const criticalUrls = [
        '/',
        '/manifest.json',
        '/favicon.ico',
        '/api/products',
      ];
      
      await cache.addAll(criticalUrls);
    }
  }

  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'add_to_cart':
        await fetch('/api/cart/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });
        break;
      case 'update_profile':
        await fetch('/api/user/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action.data),
        });
        break;
    }
  }
}

// React hooks for PWA features
export const useAdvancedPWA = () => {
  const [pwaManager] = useState(() => new AdvancedPWAManager());
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);

  useEffect(() => {
    pwaManager.initialize().then(() => {
      setIsInstalled(pwaManager.getDeviceCapabilities().isInstalled);
      setCapabilities(pwaManager.getDeviceCapabilities());
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pwaManager]);

  const showInstallPrompt = useCallback(async () => {
    const installed = await pwaManager.showInstallPrompt();
    setIsInstalled(installed);
    return installed;
  }, [pwaManager]);

  const requestNotificationPermission = useCallback(async () => {
    return pwaManager.requestNotificationPermission();
  }, [pwaManager]);

  const subscribeToNotifications = useCallback(async () => {
    return pwaManager.subscribeToNotifications();
  }, [pwaManager]);

  const refreshStorageUsage = useCallback(async () => {
    const usage = await pwaManager.getStorageUsage();
    setStorageUsage(usage);
    return usage;
  }, [pwaManager]);

  return {
    isInstalled,
    isOnline,
    capabilities,
    storageUsage,
    showInstallPrompt,
    requestNotificationPermission,
    subscribeToNotifications,
    refreshStorageUsage,
    getPerformanceMetrics: pwaManager.getPerformanceMetrics.bind(pwaManager),
    setAppBadge: pwaManager.setAppBadge.bind(pwaManager),
    requestWakeLock: pwaManager.requestWakeLock.bind(pwaManager),
    shareContent: pwaManager.shareContent.bind(pwaManager),
    clearCache: pwaManager.clearCache.bind(pwaManager),
  };
};

export const useOfflineSync = () => {
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [syncQueue, setSyncQueue] = useState<OfflineAction[]>([]);

  const addToCartOffline = useCallback((productId: number, quantity: number) => {
    const action: OfflineAction = {
      id: Math.random().toString(36).substr(2, 9),
      type: 'add_to_cart',
      data: { productId, quantity },
      timestamp: Date.now(),
    };
    
    setSyncQueue(prev => [...prev, action]);
    // Also add to PWA manager's queue
    // pwaManager.offlineManager.queueAction(action);
  }, []);

  const syncOfflineData = useCallback(async () => {
    // Execute all queued actions
    for (const action of syncQueue) {
      try {
        // Execute action
        setSyncQueue(prev => prev.filter(a => a.id !== action.id));
      } catch (error) {
        console.error('Failed to sync action:', error);
      }
    }
  }, [syncQueue]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineMode(false);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOfflineMode(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOfflineMode(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncOfflineData]);

  return {
    isOfflineMode,
    syncQueue,
    addToCartOffline,
    syncOfflineData,
  };
};

// Types
interface DeviceCapabilities {
  isPWA: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  supportsBackgroundSync: boolean;
  supportsPushNotifications: boolean;
  supportsWebShare: boolean;
  supportsPaymentRequest: boolean;
  supportsWebBluetooth: boolean;
  supportsWebUSB: boolean;
  supportsWebNFC: boolean;
  supportsWakeLock: boolean;
  supportsScreenWakeLock: boolean;
  supportsDeviceOrientation: boolean;
  supportsDeviceMotion: boolean;
  supportsGeolocation: boolean;
  supportsCamera: boolean;
  supportsMicrophone: boolean;
  networkType: string;
  networkSpeed: number;
}

interface StorageUsage {
  quota: number;
  usage: number;
  usageDetails: Record<string, number>;
  available: number;
}

interface StorageQuota {
  quota: number;
  usage: number;
  usageDetails: Record<string, number>;
}

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  timeToInteractive: number;
}

interface SyncAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
}

interface OfflineAction {
  id: string;
  type: 'add_to_cart' | 'update_profile' | 'submit_review';
  data: any;
  timestamp: number;
}

interface NetworkInformation {
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  addEventListener: (event: string, handler: () => void) => void;
}

// Global instance
export const advancedPWA = new AdvancedPWAManager();
