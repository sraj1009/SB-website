// 🚀 Advanced Caching Strategies for SINGGLEBEE
import React, { useState, useEffect } from 'react';

interface CacheConfig {
  name: string;
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only';
  maxAge: number; // in seconds
  maxEntries: number;
  version: string;
}

interface CacheEntry {
  url: string;
  response: Response;
  timestamp: number;
  hits: number;
  lastAccessed: number;
  etag?: string;
  lastModified?: string;
}

interface CacheStats {
  name: string;
  entries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  oldestEntry: Date;
  newestEntry: Date;
}

class AdvancedCacheManager {
  private caches: Map<string, CacheConfig> = new Map();
  private cacheEntries: Map<string, CacheEntry[]> = new Map();
  private stats: Map<string, CacheStats> = new Map();
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initializeDefaultCaches();
    this.setupEventListeners();
    this.startPeriodicCleanup();
  }

  // Initialize default cache configurations
  private initializeDefaultCaches(): void {
    const defaultConfigs: CacheConfig[] = [
      {
        name: 'static-assets',
        strategy: 'cache-first',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        maxEntries: 100,
        version: 'v1'
      },
      {
        name: 'api-responses',
        strategy: 'stale-while-revalidate',
        maxAge: 5 * 60, // 5 minutes
        maxEntries: 50,
        version: 'v1'
      },
      {
        name: 'product-data',
        strategy: 'cache-first',
        maxAge: 30 * 60, // 30 minutes
        maxEntries: 200,
        version: 'v1'
      },
      {
        name: 'user-preferences',
        strategy: 'cache-first',
        maxAge: 24 * 60 * 60, // 24 hours
        maxEntries: 10,
        version: 'v1'
      },
      {
        name: 'images',
        strategy: 'cache-first',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        maxEntries: 500,
        version: 'v1'
      }
    ];

    defaultConfigs.forEach(config => {
      this.caches.set(config.name, config);
      this.cacheEntries.set(config.name, []);
      this.stats.set(config.name, {
        name: config.name,
        entries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        oldestEntry: new Date(),
        newestEntry: new Date()
      });
    });
  }

  // Setup event listeners
  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.refreshStaleCaches();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Start periodic cleanup
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Get cached response
  async get(cacheName: string, url: string): Promise<Response | null> {
    const config = this.caches.get(cacheName);
    if (!config) return null;

    const entries = this.cacheEntries.get(cacheName) || [];
    const entry = entries.find(e => e.url === url);

    if (!entry) {
      this.updateStats(cacheName, 'miss');
      return null;
    }

    // Check if entry is expired
    const now = Date.now();
    const age = (now - entry.timestamp) / 1000; // in seconds

    if (age > config.maxAge) {
      // Entry is expired, but return stale content if strategy allows
      if (config.strategy === 'stale-while-revalidate') {
        this.updateStats(cacheName, 'hit');
        entry.lastAccessed = now;
        entry.hits++;
        this.revalidateInBackground(cacheName, url);
        return entry.response.clone();
      }
      
      // Remove expired entry
      this.removeEntry(cacheName, url);
      this.updateStats(cacheName, 'miss');
      return null;
    }

    this.updateStats(cacheName, 'hit');
    entry.lastAccessed = now;
    entry.hits++;
    return entry.response.clone();
  }

  // Put response in cache
  async put(cacheName: string, url: string, response: Response): Promise<void> {
    const config = this.caches.get(cacheName);
    if (!config) return;

    const entries = this.cacheEntries.get(cacheName) || [];
    
    // Check if entry already exists
    const existingIndex = entries.findIndex(e => e.url === url);
    
    const entry: CacheEntry = {
      url,
      response: response.clone(),
      timestamp: Date.now(),
      hits: existingIndex >= 0 ? entries[existingIndex].hits : 0,
      lastAccessed: Date.now(),
      etag: response.headers.get('etag') || undefined,
      lastModified: response.headers.get('last-modified') || undefined
    };

    if (existingIndex >= 0) {
      entries[existingIndex] = entry;
    } else {
      entries.push(entry);
      // Enforce max entries limit
      if (entries.length > config.maxEntries) {
        this.evictLeastUsed(cacheName);
      }
    }

    this.cacheEntries.set(cacheName, entries);
    this.updateStats(cacheName, 'store');
  }

  // Remove entry from cache
  private removeEntry(cacheName: string, url: string): void {
    const entries = this.cacheEntries.get(cacheName) || [];
    const filteredEntries = entries.filter(e => e.url !== url);
    this.cacheEntries.set(cacheName, filteredEntries);
  }

  // Evict least used entry
  private evictLeastUsed(cacheName: string): void {
    const entries = this.cacheEntries.get(cacheName) || [];
    if (entries.length === 0) return;

    // Sort by last accessed time (LRU)
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    entries.shift(); // Remove the least recently used entry
    this.cacheEntries.set(cacheName, entries);
  }

  // Revalidate in background
  private async revalidateInBackground(cacheName: string, url: string): Promise<void> {
    try {
      const response = await fetch(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        await this.put(cacheName, url, response);
      }
    } catch (error) {
      console.warn('Background revalidation failed:', error);
    }
  }

  // Request with caching strategy
  async request(cacheName: string, url: string, options?: RequestInit): Promise<Response> {
    const config = this.caches.get(cacheName);
    if (!config) {
      return fetch(url, options);
    }

    switch (config.strategy) {
      case 'cache-first':
        return this.cacheFirst(cacheName, url, options);
      case 'network-first':
        return this.networkFirst(cacheName, url, options);
      case 'stale-while-revalidate':
        return this.staleWhileRevalidate(cacheName, url, options);
      case 'cache-only':
        return this.cacheOnly(cacheName, url);
      case 'network-only':
        return this.networkOnly(url, options);
      default:
        return fetch(url, options);
    }
  }

  // Cache-first strategy
  private async cacheFirst(cacheName: string, url: string, options?: RequestInit): Promise<Response> {
    const cached = await this.get(cacheName, url);
    if (cached) {
      return cached;
    }

    try {
      const response = await fetch(url, options);
      if (response.ok) {
        await this.put(cacheName, url, response);
      }
      return response;
    } catch (error) {
      throw new Error(`Network request failed and no cache available: ${error}`);
    }
  }

  // Network-first strategy
  private async networkFirst(cacheName: string, url: string, options?: RequestInit): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        await this.put(cacheName, url, response);
      }
      return response;
    } catch (error) {
      const cached = await this.get(cacheName, url);
      if (cached) {
        return cached;
      }
      throw new Error(`Network request failed and no cache available: ${error}`);
    }
  }

  // Stale-while-revalidate strategy
  private async staleWhileRevalidate(cacheName: string, url: string, options?: RequestInit): Promise<Response> {
    const cached = await this.get(cacheName, url);
    
    // Always try to fetch fresh data
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        await this.put(cacheName, url, response);
        return response;
      }
    } catch (error) {
      // If network fails and we have cached data, return it
      if (cached) {
        return cached;
      }
      throw error;
    }

    // If network fails and no cache, return cached if available
    return cached || new Response('Network error', { status: 503 });
  }

  // Cache-only strategy
  private async cacheOnly(cacheName: string, url: string): Promise<Response> {
    const cached = await this.get(cacheName, url);
    if (cached) {
      return cached;
    }
    return new Response('No cache available', { status: 504 });
  }

  // Network-only strategy
  private async networkOnly(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, options);
  }

  // Refresh stale caches
  private async refreshStaleCaches(): Promise<void> {
    const cacheNames = Array.from(this.caches.keys());
    
    for (const cacheName of cacheNames) {
      const config = this.caches.get(cacheName);
      if (!config || config.strategy !== 'stale-while-revalidate') continue;

      const entries = this.cacheEntries.get(cacheName) || [];
      const now = Date.now();
      
      for (const entry of entries) {
        const age = (now - entry.timestamp) / 1000;
        if (age > config.maxAge / 2) { // Refresh if older than half max age
          this.revalidateInBackground(cacheName, entry.url);
        }
      }
    }
  }

  // Cleanup expired entries
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    for (const [cacheName, config] of this.caches) {
      const entries = this.cacheEntries.get(cacheName) || [];
      const validEntries = entries.filter(entry => {
        const age = (now - entry.timestamp) / 1000;
        return age <= config.maxAge;
      });
      
      this.cacheEntries.set(cacheName, validEntries);
    }
  }

  // Update statistics
  private updateStats(cacheName: string, action: 'hit' | 'miss' | 'store'): void {
    const stats = this.stats.get(cacheName);
    if (!stats) return;

    const entries = this.cacheEntries.get(cacheName) || [];
    stats.entries = entries.length;
    
    // Calculate total size (approximate)
    stats.totalSize = entries.reduce((total, entry) => {
      // Approximate response size
      const size = JSON.stringify(entry.response).length;
      return total + size;
    }, 0);

    // Update hit/miss rates
    if (action === 'hit' || action === 'miss') {
      const total = stats.hitRate + stats.missRate;
      if (action === 'hit') {
        stats.hitRate = total > 0 ? (stats.hitRate + 1) : 1;
      } else {
        stats.missRate = total > 0 ? (stats.missRate + 1) : 1;
      }
    }

    // Update oldest/newest entries
    if (entries.length > 0) {
      const timestamps = entries.map(e => e.timestamp);
      stats.oldestEntry = new Date(Math.min(...timestamps));
      stats.newestEntry = new Date(Math.max(...timestamps));
    }
  }

  // Get cache statistics
  getStats(cacheName?: string): CacheStats[] {
    if (cacheName) {
      const stats = this.stats.get(cacheName);
      return stats ? [stats] : [];
    }
    return Array.from(this.stats.values());
  }

  // Clear cache
  async clearCache(cacheName: string): Promise<void> {
    this.cacheEntries.set(cacheName, []);
    const stats = this.stats.get(cacheName);
    if (stats) {
      stats.entries = 0;
      stats.totalSize = 0;
      stats.hitRate = 0;
      stats.missRate = 0;
    }
  }

  // Clear all caches
  async clearAllCaches(): Promise<void> {
    for (const cacheName of this.caches.keys()) {
      await this.clearCache(cacheName);
    }
  }

  // Preload resources
  async preloadResources(cacheName: string, urls: string[]): Promise<void> {
    const config = this.caches.get(cacheName);
    if (!config) return;

    const promises = urls.map(async (url) => {
      try {
        const response = await fetch(url);
        if (response.ok) {
          await this.put(cacheName, url, response);
        }
      } catch (error) {
        console.warn(`Failed to preload ${url}:`, error);
      }
    });

    await Promise.all(promises);
  }

  // Create cache warming strategy
  createCacheWarmingStrategy(cacheName: string, urls: string[], priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const delay = priority === 'high' ? 0 : priority === 'medium' ? 1000 : 5000;
    
    setTimeout(() => {
      this.preloadResources(cacheName, urls);
    }, delay);
  }

  // Get cache health
  getCacheHealth(): {
    overall: 'healthy' | 'warning' | 'critical';
    details: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
    }>;
  } {
    const details: Array<{
      name: string;
      status: 'healthy' | 'warning' | 'critical';
      issues: string[];
    }> = [];

    for (const [cacheName, config] of this.caches) {
      const stats = this.stats.get(cacheName);
      const entries = this.cacheEntries.get(cacheName) || [];
      
      const issues: string[] = [];
      let status: 'healthy' | 'warning' | 'critical' = 'healthy';

      // Check hit rate
      const totalRequests = stats.hitRate + stats.missRate;
      const hitRate = totalRequests > 0 ? (stats.hitRate / totalRequests) * 100 : 0;
      
      if (hitRate < 50) {
        issues.push('Low hit rate');
        status = 'critical';
      } else if (hitRate < 70) {
        issues.push('Moderate hit rate');
        status = 'warning';
      }

      // Check cache size
      if (entries.length > config.maxEntries * 0.9) {
        issues.push('Cache nearing capacity');
        if (status === 'healthy') status = 'warning';
      }

      // Check for expired entries
      const now = Date.now();
      const expiredCount = entries.filter(entry => {
        const age = (now - entry.timestamp) / 1000;
        return age > config.maxAge;
      }).length;

      if (expiredCount > entries.length * 0.3) {
        issues.push('Many expired entries');
        if (status === 'healthy') status = 'warning';
      }

      details.push({
        name: cacheName,
        status,
        issues
      });
    }

    const overall = details.some(d => d.status === 'critical') 
      ? 'critical' 
      : details.some(d => d.status === 'warning') 
      ? 'warning' 
      : 'healthy';

    return { overall, details };
  }

  // Export cache data
  exportCacheData(): {
    version: string;
    timestamp: string;
    caches: Record<string, any>;
  } {
    const data: Record<string, any> = {};
    
    for (const [cacheName, entries] of this.cacheEntries) {
      data[cacheName] = entries.map(entry => ({
        url: entry.url,
        timestamp: entry.timestamp,
        hits: entry.hits,
        lastAccessed: entry.lastAccessed,
        etag: entry.etag,
        lastModified: entry.lastModified
        // Note: Response is not serialized for size reasons
      }));
    }

    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      caches: data
    };
  }

  // Import cache data
  async importCacheData(data: any): Promise<void> {
    // Implementation would reconstruct cache entries from exported data
    console.log('Cache data import not fully implemented');
  }
}

// React Hook for advanced caching
export const useAdvancedCache = () => {
  const [cacheManager] = useState(() => new AdvancedCacheManager());
  const [stats, setStats] = useState<CacheStats[]>([]);
  const [health, setHealth] = useState(cacheManager.getCacheHealth());

  useEffect(() => {
    const updateStats = () => {
      setStats(cacheManager.getStats());
      setHealth(cacheManager.getCacheHealth());
    };

    // Update stats every 10 seconds
    const interval = setInterval(updateStats, 10000);
    updateStats(); // Initial update

    return () => clearInterval(interval);
  }, [cacheManager]);

  const request = async (cacheName: string, url: string, options?: RequestInit) => {
    return cacheManager.request(cacheName, url, options);
  };

  const preload = async (cacheName: string, urls: string[]) => {
    return cacheManager.preloadResources(cacheName, urls);
  };

  const clearCache = async (cacheName: string) => {
    return cacheManager.clearCache(cacheName);
  };

  const clearAll = async () => {
    return cacheManager.clearAllCaches();
  };

  return {
    stats,
    health,
    request,
    preload,
    clearCache,
    clearAll,
    getStats: cacheManager.getStats.bind(cacheManager),
    getHealth: cacheManager.getCacheHealth.bind(cacheManager)
  };
};

export default AdvancedCacheManager;
