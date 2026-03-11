/**
 * Advanced Multi-Layer Caching Strategy for SINGGLEBEE
 */

// Cache configuration types
interface CacheConfig {
  strategy: 'cache-first' | 'network-first' | 'stale-while-revalidate' | 'cache-only' | 'network-only';
  maxAge: number; // in milliseconds
  staleWhileRevalidate?: number; // in milliseconds
  backgroundSync?: boolean;
  compression?: boolean;
  encryption?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  etag?: string;
  lastModified?: string;
  compressed?: boolean;
  encrypted?: boolean;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface CacheMetadata {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  oldestEntry?: number;
  newestEntry?: number;
  lastCleanup: number;
}

// Advanced Cache Manager
class AdvancedCacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private indexedDBCache: IDBDatabase | null = null;
  private metadata: CacheMetadata = {
    totalEntries: 0,
    totalSize: 0,
    hitRate: 0,
    missRate: 0,
    lastCleanup: Date.now(),
  };
  private hitCount = 0;
  private missCount = 0;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeIndexedDB();
    this.startCleanupInterval();
  }

  private async initializeIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('singglebee-cache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.indexedDBCache = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores for different cache types
        if (!db.objectStoreNames.contains('api-cache')) {
          db.createObjectStore('api-cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('image-cache')) {
          db.createObjectStore('image-cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('static-cache')) {
          db.createObjectStore('static-cache', { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', { keyPath: 'key' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Core caching methods
  async get<T>(key: string, config: CacheConfig): Promise<T | null> {
    const now = Date.now();
    
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > now) {
      this.hitCount++;
      memoryEntry.accessCount++;
      memoryEntry.lastAccessed = now;
      return memoryEntry.data;
    }

    // Try IndexedDB cache
    if (this.indexedDBCache) {
      try {
        const dbEntry = await this.getFromIndexedDB<T>(key, config);
        if (dbEntry) {
          this.hitCount++;
          
          // Promote to memory cache
          this.memoryCache.set(key, {
            ...dbEntry,
            accessCount: 1,
            lastAccessed: now,
          });
          
          return dbEntry.data;
        }
      } catch (error) {
        console.warn('IndexedDB cache read failed:', error);
      }
    }

    this.missCount++;
    return null;
  }

  async set<T>(key: string, data: T, config: CacheConfig): Promise<void> {
    const now = Date.now();
    const serializedData = JSON.stringify(data);
    const size = new Blob([serializedData]).size;
    
    let processedData = data;
    let compressed = false;
    let encrypted = false;

    // Apply compression if enabled
    if (config.compression && size > 1024) {
      processedData = await this.compressData(serializedData);
      compressed = true;
    }

    // Apply encryption if enabled
    if (config.encryption) {
      processedData = await this.encryptData(processedData);
      encrypted = true;
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: now,
      expiresAt: now + config.maxAge,
      accessCount: 0,
      lastAccessed: now,
      size: size,
      compressed,
      encrypted,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Store in IndexedDB for persistence
    if (this.indexedDBCache) {
      try {
        await this.setToIndexedDB(key, entry, config);
      } catch (error) {
        console.warn('IndexedDB cache write failed:', error);
      }
    }

    this.updateMetadata();
  }

  async invalidate(key: string): Promise<void> {
    this.memoryCache.delete(key);
    
    if (this.indexedDBCache) {
      try {
        await this.deleteFromIndexedDB(key);
      } catch (error) {
        console.warn('IndexedDB cache deletion failed:', error);
      }
    }
    
    this.updateMetadata();
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    
    // Remove from memory cache
    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
      }
    }
    
    // Remove from IndexedDB
    if (this.indexedDBCache) {
      try {
        const transaction = this.indexedDBCache.transaction(['api-cache', 'image-cache', 'static-cache'], 'readwrite');
        
        for (const storeName of ['api-cache', 'image-cache', 'static-cache']) {
          const store = transaction.objectStore(storeName);
          const request = store.openCursor();
          
          request.onsuccess = (event) => {
            const cursor = (event.target as IDBRequest).result;
            if (cursor) {
              if (regex.test(cursor.key as string)) {
                cursor.delete();
              }
              cursor.continue();
            }
          };
        }
      } catch (error) {
        console.warn('IndexedDB pattern deletion failed:', error);
      }
    }
    
    this.updateMetadata();
  }

  // Cache strategies
  async fetchWithCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<T> {
    const cached = await this.get<T>(key, config);
    
    if (cached) {
      // Background refresh for stale-while-revalidate
      if (config.strategy === 'stale-while-revalidate' && config.staleWhileRevalidate) {
        const now = Date.now();
        const entry = this.memoryCache.get(key);
        
        if (entry && (now - entry.timestamp) > config.staleWhileRevalidate) {
          // Refresh in background
          this.refreshInBackground(key, fetcher, config);
        }
      }
      
      return cached;
    }

    // No cache hit, fetch from network
    const data = await fetcher();
    await this.set(key, data, config);
    
    return data;
  }

  private async refreshInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    config: CacheConfig
  ): Promise<void> {
    try {
      const data = await fetcher();
      await this.set(key, data, config);
    } catch (error) {
      console.warn('Background refresh failed:', error);
    }
  }

  // IndexedDB operations
  private async getFromIndexedDB<T>(key: string, config: CacheConfig): Promise<CacheEntry<T> | null> {
    if (!this.indexedDBCache) return null;
    
    const storeName = this.getStoreName(config);
    const transaction = this.indexedDBCache.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result;
        if (entry && entry.expiresAt > Date.now()) {
          resolve(entry);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  }

  private async setToIndexedDB(key: string, entry: CacheEntry<any>, config: CacheConfig): Promise<void> {
    if (!this.indexedDBCache) return;
    
    const storeName = this.getStoreName(config);
    const transaction = this.indexedDBCache.transaction([storeName], 'readwrite');
    const store = transaction.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.put({ key, ...entry });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.indexedDBCache) return;
    
    const transaction = this.indexedDBCache.transaction(['api-cache', 'image-cache', 'static-cache'], 'readwrite');
    
    for (const storeName of ['api-cache', 'image-cache', 'static-cache']) {
      const store = transaction.objectStore(storeName);
      store.delete(key);
    }
  }

  private getStoreName(config: CacheConfig): string {
    if (config.priority === 'high') return 'api-cache';
    if (config.priority === 'medium') return 'image-cache';
    return 'static-cache';
  }

  // Utility methods
  private async compressData(data: string): Promise<string> {
    // Simple compression using built-in browser APIs
    if ('CompressionStream' in window) {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      const reader = stream.readable.getReader();
      
      writer.write(new TextEncoder().encode(data));
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      for (const chunk of chunks) {
        compressed.set(chunk, offset);
        offset += chunk.length;
      }
      
      return btoa(String.fromCharCode(...compressed));
    }
    
    return data; // Fallback
  }

  private async encryptData(data: string | Uint8Array): Promise<string> {
    // Simple encryption using Web Crypto API
    if (crypto.subtle) {
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        typeof data === 'string' ? new TextEncoder().encode(data) : data
      );
      
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    }
    
    return typeof data === 'string' ? data : btoa(String.fromCharCode(...data));
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    
    // Cleanup memory cache
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
      }
    }
    
    // Cleanup IndexedDB
    if (this.indexedDBCache) {
      for (const storeName of ['api-cache', 'image-cache', 'static-cache']) {
        const transaction = this.indexedDBCache.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.openCursor();
        
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            const entry = cursor.value;
            if (entry.expiresAt <= now) {
              cursor.delete();
            }
            cursor.continue();
          }
        };
      }
    }
    
    this.metadata.lastCleanup = now;
    this.updateMetadata();
  }

  private updateMetadata(): void {
    this.metadata.totalEntries = this.memoryCache.size;
    this.metadata.totalSize = Array.from(this.memoryCache.values()).reduce((sum, entry) => sum + entry.size, 0);
    
    const totalRequests = this.hitCount + this.missCount;
    this.metadata.hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    this.metadata.missRate = totalRequests > 0 ? this.missCount / totalRequests : 0;
    
    const timestamps = Array.from(this.memoryCache.values()).map(entry => entry.timestamp);
    if (timestamps.length > 0) {
      this.metadata.oldestEntry = Math.min(...timestamps);
      this.metadata.newestEntry = Math.max(...timestamps);
    }
  }

  // Public API methods
  getMetadata(): CacheMetadata {
    this.updateMetadata();
    return { ...this.metadata };
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.indexedDBCache) {
      for (const storeName of ['api-cache', 'image-cache', 'static-cache']) {
        const transaction = this.indexedDBCache.transaction([storeName], 'readwrite');
        transaction.objectStore(storeName).clear();
      }
    }
    
    this.hitCount = 0;
    this.missCount = 0;
    this.updateMetadata();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Predefined cache configurations
export const cacheConfigs = {
  // API responses with intelligent invalidation
  api: {
    strategy: 'stale-while-revalidate' as const,
    maxAge: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: 60 * 60 * 1000, // 1 hour
    backgroundSync: true,
    priority: 'high' as const,
  },
  
  // Product images with long-term caching
  images: {
    strategy: 'cache-first' as const,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    compression: true,
    priority: 'medium' as const,
  },
  
  // User preferences with instant sync
  userPrefs: {
    strategy: 'network-first' as const,
    maxAge: 0, // Always fresh
    encryption: true,
    priority: 'high' as const,
  },
  
  // Static assets with version-based invalidation
  static: {
    strategy: 'cache-first' as const,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    compression: true,
    priority: 'low' as const,
  },
  
  // Search results with medium-term caching
  search: {
    strategy: 'stale-while-revalidate' as const,
    maxAge: 15 * 60 * 1000, // 15 minutes
    staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
    priority: 'medium' as const,
  },
  
  // Session data with short-term caching
  session: {
    strategy: 'cache-first' as const,
    maxAge: 30 * 60 * 1000, // 30 minutes
    encryption: true,
    priority: 'high' as const,
  },
};

// Global cache manager instance
export const cacheManager = new AdvancedCacheManager();

// React hooks for caching
export const useCache = () => {
  const get = <T>(key: string, config: CacheConfig) => cacheManager.get<T>(key, config);
  const set = <T>(key: string, data: T, config: CacheConfig) => cacheManager.set(key, data, config);
  const invalidate = (key: string) => cacheManager.invalidate(key);
  const invalidatePattern = (pattern: string) => cacheManager.invalidatePattern(pattern);
  const fetchWithCache = <T>(key: string, fetcher: () => Promise<T>, config: CacheConfig) => 
    cacheManager.fetchWithCache(key, fetcher, config);
  
  return {
    get,
    set,
    invalidate,
    invalidatePattern,
    fetchWithCache,
    metadata: cacheManager.getMetadata(),
  };
};

// Cache-aware API client
export class CacheAwareAPIClient {
  constructor(private baseURL: string) {}
  
  async get<T>(endpoint: string, config: CacheConfig = cacheConfigs.api): Promise<T> {
    const key = `${this.baseURL}${endpoint}`;
    
    return cacheManager.fetchWithCache(
      key,
      () => fetch(key).then(res => res.json()),
      config
    );
  }
  
  async post<T>(endpoint: string, data: any, config: CacheConfig = cacheConfigs.api): Promise<T> {
    const key = `${this.baseURL}${endpoint}`;
    
    return cacheManager.fetchWithCache(
      key,
      () => fetch(key, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json()),
      config
    );
  }
  
  invalidateEndpoint(endpoint: string): void {
    const pattern = `${this.baseURL}${endpoint}`;
    cacheManager.invalidatePattern(pattern);
  }
}

// Export the API client instance
export const apiClient = new CacheAwareAPIClient('/api');
