// 📱 Progressive Web App Utilities for SINGGLEBEE

import { useState, useEffect } from 'react';

interface ServiceWorkerMessage {
  type: string;
  payload?: any;
}

interface CacheConfig {
  name: string;
  urls: string[];
  strategy: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate';
}

class PWAManager {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeEventListeners();
  }

  // Initialize PWA features
  async initialize(): Promise<void> {
    try {
      // Register service worker
      await this.registerServiceWorker();

      // Request notification permission
      await this.requestNotificationPermission();

      // Install prompt handler
      this.setupInstallPrompt();

      // Background sync setup
      this.setupBackgroundSync();

      console.log('PWA initialized successfully');
    } catch (error) {
      console.error('PWA initialization failed:', error);
    }
  }

  // Register service worker
  async registerServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        this.swRegistration = registration;

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New content is available
                this.showUpdateNotification();
              }
            });
          }
        });

        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Request notification permission
  async requestNotificationPermission(): Promise<boolean> {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Notification permission request failed:', error);
        return false;
      }
    }
    return false;
  }

  // Show notification
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        await new Notification(title, {
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'singglebee-notification',
          requireInteraction: false,
          ...(options as NotificationOptions),
        } as NotificationOptions);
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    }
  }

  // Setup install prompt
  private setupInstallPrompt(): void {
    let deferredPrompt: any;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;

      // Show install button or banner
      this.showInstallPrompt(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.showNotification('SINGGLEBEE Installed!', {
        body: 'Thank you for installing our app. Enjoy offline access to your favorite educational content!',
        actions: [
          {
            action: 'open',
            title: 'Open App',
            icon: '/pwa-192x192.png',
          },
        ],
      } as NotificationOptions);
    });
  }

  // Show install prompt
  private showInstallPrompt(deferredPrompt: any): void {
    // Create install prompt UI
    const installButton = document.createElement('button');
    installButton.textContent = 'Install App';
    installButton.className =
      'fixed bottom-4 right-4 bg-yellow-500 text-black px-4 py-2 rounded-lg shadow-lg z-50';
    installButton.onclick = async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;

        if (outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }

        installButton.remove();
      }
    };

    document.body.appendChild(installButton);
  }

  // Setup background sync
  private setupBackgroundSync(): void {
    if ('serviceWorker' in navigator && 'sync' in window) {
      navigator.serviceWorker.ready
        .then((registration) => {
          // Register sync events
          return (registration as any).sync.register('background-sync');
        })
        .catch((error) => {
          console.log('Background sync registration failed:', error);
        });
    }
  }

  // Initialize event listeners
  private initializeEventListeners(): void {
    // Online/offline status
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showNotification('Back Online', {
        body: 'Your connection has been restored',
      });
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showNotification('Offline Mode', {
        body: 'You are currently offline. Some features may be limited.',
      });
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const message = event.data as ServiceWorkerMessage;
      this.handleServiceWorkerMessage(message);
    });
  }

  // Handle service worker messages
  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    switch (message.type) {
      case 'CACHE_UPDATED':
        this.showCacheUpdatedNotification();
        break;
      case 'SYNC_COMPLETED':
        this.showSyncCompletedNotification(message.payload);
        break;
      case 'PUSH_NOTIFICATION':
        this.handlePushNotification(message.payload);
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Show update notification
  private showUpdateNotification(): void {
    const updateButton = document.createElement('div');
    updateButton.className =
      'fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    updateButton.innerHTML = `
      <div class="flex items-center gap-2">
        <span>New version available!</span>
        <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-white hover:text-gray-200">×</button>
      </div>
      <button onclick="window.location.reload()" class="mt-2 bg-white text-blue-500 px-3 py-1 rounded text-sm">Update</button>
    `;
    document.body.appendChild(updateButton);
  }

  // Show cache updated notification
  private showCacheUpdatedNotification(): void {
    this.showNotification('Content Updated', {
      body: 'Latest educational content is now available offline',
    });
  }

  // Show sync completed notification
  private showSyncCompletedNotification(payload: any): void {
    this.showNotification('Sync Completed', {
      body: `${payload.synced} items have been synchronized`,
    });
  }

  // Handle push notification
  private handlePushNotification(payload: any): void {
    this.showNotification(payload.title, {
      body: payload.body,
      data: payload.data,
      actions: payload.actions,
    } as NotificationOptions);
  }

  // Sync offline data
  private async syncOfflineData(): Promise<void> {
    if (this.swRegistration) {
      try {
        // Note: sync is not part of standard ServiceWorkerRegistration
        // This would need a custom service worker implementation
        console.log('Background sync placeholder - custom service worker required');
      } catch (error) {
        console.error('Failed to register sync:', error);
      }
    }
  }

  // Cache management
  async cacheData(config: CacheConfig): Promise<void> {
    if ('caches' in window) {
      try {
        const cache = await caches.open(config.name);
        await cache.addAll(config.urls);
        console.log(`Cached ${config.urls.length} URLs in ${config.name}`);
      } catch (error) {
        console.error('Failed to cache data:', error);
      }
    }
  }

  // Get cached data
  async getCachedData(url: string, cacheName: string): Promise<Response | null> {
    if ('caches' in window) {
      try {
        const cache = await caches.open(cacheName);
        return await cache.match(url);
      } catch (error) {
        console.error('Failed to get cached data:', error);
        return null;
      }
    }
    return null;
  }

  // Clear cache
  async clearCache(cacheName: string): Promise<void> {
    if ('caches' in window) {
      try {
        await caches.delete(cacheName);
        console.log(`Cache ${cacheName} cleared`);
      } catch (error) {
        console.error('Failed to clear cache:', error);
      }
    }
  }

  // Get network status
  getNetworkStatus(): boolean {
    return this.isOnline;
  }

  // Check if PWA is installed
  isPWAInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  }

  // Get app version
  async getAppVersion(): Promise<string> {
    try {
      const response = await fetch('/version.json');
      const data = await response.json();
      return data.version;
    } catch (error) {
      console.error('Failed to get app version:', error);
      return 'unknown';
    }
  }

  // Share content
  async shareContent(data: ShareData): Promise<void> {
    if ('share' in navigator) {
      try {
        await navigator.share(data);
      } catch (error) {
        console.error('Failed to share content:', error);
      }
    }
  }

  // Add to home screen (manual trigger)
  async addToHomeScreen(): Promise<boolean> {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // This would trigger the install prompt if available
        const promptEvent = new Event('beforeinstallprompt');
        window.dispatchEvent(promptEvent);
        return true;
      } catch (error) {
        console.error('Failed to trigger install prompt:', error);
        return false;
      }
    }
    return false;
  }

  // Get storage usage
  async getStorageUsage(): Promise<{ used: number; quota: number; percentage: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (used / quota) * 100 : 0;

        return { used, quota, percentage };
      } catch (error) {
        console.error('Failed to get storage usage:', error);
        return { used: 0, quota: 0, percentage: 0 };
      }
    }
    return { used: 0, quota: 0, percentage: 0 };
  }

  // Clear all data
  async clearAllData(): Promise<void> {
    try {
      // Clear caches
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));

      // Clear local storage
      localStorage.clear();

      // Clear session storage
      sessionStorage.clear();

      console.log('All app data cleared');
    } catch (error) {
      console.error('Failed to clear app data:', error);
    }
  }
}

// React Hook for PWA features
export const usePWA = () => {
  const [pwaManager] = useState(() => new PWAManager());
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [storageUsage, setStorageUsage] = useState({ used: 0, quota: 0, percentage: 0 });

  useEffect(() => {
    // Initialize PWA
    pwaManager.initialize();

    // Check if installed and get storage usage asynchronously
    const checkPWAStatus = async () => {
      setIsInstalled(pwaManager.isPWAInstalled());
      const usage = await pwaManager.getStorageUsage();
      setStorageUsage(usage);
    };

    checkPWAStatus();

    // Listen for online/offline changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pwaManager]);

  return {
    isOnline,
    isInstalled,
    storageUsage,
    showNotification: pwaManager.showNotification.bind(pwaManager),
    shareContent: pwaManager.shareContent.bind(pwaManager),
    addToHomeScreen: pwaManager.addToHomeScreen.bind(pwaManager),
    clearAllData: pwaManager.clearAllData.bind(pwaManager),
    getAppVersion: pwaManager.getAppVersion.bind(pwaManager),
  };
};

export default PWAManager;
