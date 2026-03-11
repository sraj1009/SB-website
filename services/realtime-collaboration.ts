/**
 * Real-Time Collaboration Features for SINGGLEBEE
 */

import { io, Socket } from 'socket.io-client';
import { cacheConfigs, cacheManager } from '../utils/advanced-cache';
import { useCartStore, useUserStore } from '../store/advanced';
import type { Product, CartItem, User } from '../types';

// Real-time collaboration manager
class RealtimeCollaborationManager {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private collaborationRooms = new Set<string>();
  private stockSubscriptions = new Map<number, Set<(stock: number) => void>>();
  private priceSubscriptions = new Map<number, Set<(price: number) => void>>();
  private orderSubscriptions = new Map<string, Set<(status: string) => void>>();
  private syncQueue: SyncAction[] = [];
  private isOnline = navigator.onLine;

  constructor() {
    this.setupNetworkListeners();
  }

  // Initialize connection
  async connect(userId: string, token: string): Promise<void> {
    this.userId = userId;
    
    return new Promise((resolve, reject) => {
      this.socket = io(import.meta.env.VITE_REALTIME_URL || 'ws://localhost:5001', {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        console.log('Connected to real-time server');
        this.processSyncQueue();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('Disconnected from real-time server:', reason);
        this.handleDisconnection(reason);
      });

      this.socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        reject(error);
      });

      // Setup event listeners
      this.setupEventListeners();
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.userId = null;
    this.collaborationRooms.clear();
  }

  // Join collaboration room
  joinRoom(roomId: string, type: 'shopping-list' | 'wishlist' | 'study-group'): void {
    if (!this.socket || !this.userId) return;

    this.socket.emit('join-room', { roomId, type, userId: this.userId });
    this.collaborationRooms.add(roomId);
  }

  // Leave collaboration room
  leaveRoom(roomId: string): void {
    if (!this.socket) return;

    this.socket.emit('leave-room', { roomId, userId: this.userId });
    this.collaborationRooms.delete(roomId);
  }

  // Real-time stock updates
  subscribeToStock(productId: number, callback: (stock: number) => void): () => void {
    if (!this.stockSubscriptions.has(productId)) {
      this.stockSubscriptions.set(productId, new Set());
      
      if (this.socket) {
        this.socket.emit('subscribe-stock', { productId });
      }
    }

    this.stockSubscriptions.get(productId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.stockSubscriptions.get(productId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.stockSubscriptions.delete(productId);
          if (this.socket) {
            this.socket.emit('unsubscribe-stock', { productId });
          }
        }
      }
    };
  }

  // Real-time price updates
  subscribeToPrice(productId: number, callback: (price: number) => void): () => void {
    if (!this.priceSubscriptions.has(productId)) {
      this.priceSubscriptions.set(productId, new Set());
      
      if (this.socket) {
        this.socket.emit('subscribe-price', { productId });
      }
    }

    this.priceSubscriptions.get(productId)!.add(callback);

    return () => {
      const callbacks = this.priceSubscriptions.get(productId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.priceSubscriptions.delete(productId);
          if (this.socket) {
            this.socket.emit('unsubscribe-price', { productId });
          }
        }
      }
    };
  }

  // Order status updates
  subscribeToOrder(orderId: string, callback: (status: string) => void): () => void {
    if (!this.orderSubscriptions.has(orderId)) {
      this.orderSubscriptions.set(orderId, new Set());
      
      if (this.socket) {
        this.socket.emit('subscribe-order', { orderId });
      }
    }

    this.orderSubscriptions.get(orderId)!.add(callback);

    return () => {
      const callbacks = this.orderSubscriptions.get(orderId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.orderSubscriptions.delete(orderId);
          if (this.socket) {
            this.socket.emit('unsubscribe-order', { orderId });
          }
        }
      }
    };
  }

  // Collaborative shopping lists
  async createShoppingList(name: string, sharedWith: string[]): Promise<ShoppingList> {
    if (!this.socket || !this.userId) {
      throw new Error('Not connected to real-time server');
    }

    return new Promise((resolve, reject) => {
      this.socket!.emit('create-shopping-list', {
        name,
        createdBy: this.userId,
        sharedWith,
      });

      this.socket!.once('shopping-list-created', (list: ShoppingList) => {
        resolve(list);
      });

      this.socket!.once('error', (error: any) => {
        reject(error);
      });
    });
  }

  async addToShoppingList(listId: string, productId: number, quantity: number = 1): Promise<void> {
    if (!this.socket) return;

    this.socket.emit('add-to-shopping-list', {
      listId,
      productId,
      quantity,
      userId: this.userId,
    });
  }

  async updateShoppingListItem(listId: string, itemId: string, quantity: number): Promise<void> {
    if (!this.socket) return;

    this.socket.emit('update-shopping-list-item', {
      listId,
      itemId,
      quantity,
      userId: this.userId,
    });
  }

  async removeFromShoppingList(listId: string, itemId: string): Promise<void> {
    if (!this.socket) return;

    this.socket.emit('remove-from-shopping-list', {
      listId,
      itemId,
      userId: this.userId,
    });
  }

  // Real-time presence
  getUserPresence(roomId: string): Promise<UserPresence[]> {
    if (!this.socket) return Promise.resolve([]);

    return new Promise((resolve) => {
      this.socket!.emit('get-presence', { roomId });
      
      this.socket!.once('presence-data', (presence: UserPresence[]) => {
        resolve(presence);
      });
    });
  }

  // Live typing indicators
  startTyping(roomId: string, context: string): void {
    if (!this.socket) return;

    this.socket.emit('start-typing', {
      roomId,
      userId: this.userId,
      context,
    });
  }

  stopTyping(roomId: string, context: string): void {
    if (!this.socket) return;

    this.socket.emit('stop-typing', {
      roomId,
      userId: this.userId,
      context,
    });
  }

  // Real-time notifications
  sendNotification(recipientId: string, notification: NotificationData): void {
    if (!this.socket) return;

    this.socket.emit('send-notification', {
      recipientId,
      senderId: this.userId,
      notification,
    });
  }

  // Offline sync
  addToSyncQueue(action: SyncAction): void {
    if (this.isOnline && this.socket?.connected) {
      // Execute immediately if online
      this.executeSyncAction(action);
    } else {
      // Add to queue for when we're back online
      this.syncQueue.push(action);
    }
  }

  private processSyncQueue(): void {
    while (this.syncQueue.length > 0 && this.socket?.connected) {
      const action = this.syncQueue.shift()!;
      this.executeSyncAction(action);
    }
  }

  private executeSyncAction(action: SyncAction): void {
    if (!this.socket) return;

    switch (action.type) {
      case 'add-to-cart':
        this.socket.emit('sync-add-to-cart', action.data);
        break;
      case 'remove-from-cart':
        this.socket.emit('sync-remove-from-cart', action.data);
        break;
      case 'update-cart':
        this.socket.emit('sync-update-cart', action.data);
        break;
      case 'add-to-wishlist':
        this.socket.emit('sync-add-to-wishlist', action.data);
        break;
      case 'remove-from-wishlist':
        this.socket.emit('sync-remove-from-wishlist', action.data);
        break;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Stock updates
    this.socket.on('stock-update', (data: { productId: number; stock: number }) => {
      const callbacks = this.stockSubscriptions.get(data.productId);
      if (callbacks) {
        callbacks.forEach(callback => callback(data.stock));
      }
    });

    // Price updates
    this.socket.on('price-update', (data: { productId: number; price: number }) => {
      const callbacks = this.priceSubscriptions.get(data.productId);
      if (callbacks) {
        callbacks.forEach(callback => callback(data.price));
      }
    });

    // Order updates
    this.socket.on('order-update', (data: { orderId: string; status: string }) => {
      const callbacks = this.orderSubscriptions.get(data.orderId);
      if (callbacks) {
        callbacks.forEach(callback => callback(data.status));
      }
    });

    // Shopping list updates
    this.socket.on('shopping-list-updated', (list: ShoppingList) => {
      this.handleShoppingListUpdate(list);
    });

    // Presence updates
    this.socket.on('presence-updated', (data: { roomId: string; presence: UserPresence[] }) => {
      this.handlePresenceUpdate(data.roomId, data.presence);
    });

    // Typing indicators
    this.socket.on('user-typing', (data: { roomId: string; userId: string; context: string }) => {
      this.handleTypingIndicator(data.roomId, data.userId, data.context, true);
    });

    this.socket.on('user-stopped-typing', (data: { roomId: string; userId: string; context: string }) => {
      this.handleTypingIndicator(data.roomId, data.userId, data.context, false);
    });

    // Notifications
    this.socket.on('notification', (notification: NotificationData & { senderId: string }) => {
      this.handleNotification(notification);
    });

    // Sync confirmations
    this.socket.on('sync-confirmed', (data: { actionId: string; success: boolean }) => {
      this.handleSyncConfirmation(data);
    });
  }

  private handleDisconnection(reason: string): void {
    if (reason === 'io server disconnect') {
      // Server initiated disconnect, reconnect manually
      this.socket?.connect();
    }
    // Otherwise, socket will try to reconnect automatically
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      if (this.socket) {
        this.socket.connect();
      }
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private handleShoppingListUpdate(list: ShoppingList): void {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('shopping-list-updated', { detail: list }));
  }

  private handlePresenceUpdate(roomId: string, presence: UserPresence[]): void {
    window.dispatchEvent(new CustomEvent('presence-updated', { 
      detail: { roomId, presence } 
    }));
  }

  private handleTypingIndicator(roomId: string, userId: string, context: string, isTyping: boolean): void {
    window.dispatchEvent(new CustomEvent('typing-indicator', { 
      detail: { roomId, userId, context, isTyping } 
    }));
  }

  private handleNotification(notification: NotificationData & { senderId: string }): void {
    window.dispatchEvent(new CustomEvent('notification', { detail: notification }));
  }

  private handleSyncConfirmation(data: { actionId: string; success: boolean }): void {
    if (!data.success) {
      console.warn('Sync action failed:', data.actionId);
      // Could retry or notify user
    }
  }
}

// React hooks for real-time features
export const useRealtimeCollaboration = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<UserPresence[]>([]);
  const [typingUsers, setTypingUsers] = useState<Map<string, Set<string>>>(new Map());
  const [notifications, setNotifications] = useState<NotificationData[]>([]);

  useEffect(() => {
    const handleConnectionChange = () => {
      setIsConnected(realtimeManager.socket?.connected || false);
    };

    const handlePresenceUpdate = (event: CustomEvent) => {
      const { roomId, presence } = event.detail;
      setOnlineUsers(prev => [...prev.filter(p => p.roomId !== roomId), ...presence]);
    };

    const handleTypingIndicator = (event: CustomEvent) => {
      const { roomId, userId, context, isTyping } = event.detail;
      setTypingUsers(prev => {
        const roomTyping = prev.get(roomId) || new Set();
        if (isTyping) {
          roomTyping.add(`${userId}:${context}`);
        } else {
          roomTyping.delete(`${userId}:${context}`);
        }
        return new Map(prev.set(roomId, roomTyping));
      });
    };

    const handleNotification = (event: CustomEvent) => {
      setNotifications(prev => [event.detail, ...prev.slice(0, 9)]);
    };

    // Add event listeners
    window.addEventListener('shopping-list-updated', handleConnectionChange);
    window.addEventListener('presence-updated', handlePresenceUpdate);
    window.addEventListener('typing-indicator', handleTypingIndicator);
    window.addEventListener('notification', handleNotification);

    return () => {
      window.removeEventListener('shopping-list-updated', handleConnectionChange);
      window.removeEventListener('presence-updated', handlePresenceUpdate);
      window.removeEventListener('typing-indicator', handleTypingIndicator);
      window.removeEventListener('notification', handleNotification);
    };
  }, []);

  const connect = useCallback(async (userId: string, token: string) => {
    try {
      await realtimeManager.connect(userId, token);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to connect:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    realtimeManager.disconnect();
    setIsConnected(false);
  }, []);

  const joinRoom = useCallback((roomId: string, type: 'shopping-list' | 'wishlist' | 'study-group') => {
    realtimeManager.joinRoom(roomId, type);
  }, []);

  const leaveRoom = useCallback((roomId: string) => {
    realtimeManager.leaveRoom(roomId);
  }, []);

  return {
    isConnected,
    onlineUsers,
    typingUsers,
    notifications,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
  };
};

export const useRealtimeStock = (productId: number) => {
  const [stock, setStock] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribe = () => {
      unsubscribe = realtimeManager.subscribeToStock(productId, (newStock) => {
        setStock(newStock);
      });
      setIsSubscribed(true);
    };

    if (productId) {
      subscribe();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsSubscribed(false);
      }
    };
  }, [productId]);

  return { stock, isSubscribed };
};

export const useRealtimePrice = (productId: number) => {
  const [price, setPrice] = useState<number | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const subscribe = () => {
      unsubscribe = realtimeManager.subscribeToPrice(productId, (newPrice) => {
        setPrice(newPrice);
      });
      setIsSubscribed(true);
    };

    if (productId) {
      subscribe();
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
        setIsSubscribed(false);
      }
    };
  }, [productId]);

  return { price, isSubscribed };
};

export const useCollaborativeShoppingList = (listId: string) => {
  const [list, setList] = useState<ShoppingList | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { joinRoom, leaveRoom } = useRealtimeCollaboration();

  useEffect(() => {
    joinRoom(listId, 'shopping-list');

    const handleUpdate = (event: CustomEvent) => {
      if (event.detail.id === listId) {
        setList(event.detail);
      }
    };

    window.addEventListener('shopping-list-updated', handleUpdate);

    return () => {
      window.removeEventListener('shopping-list-updated', handleUpdate);
      leaveRoom(listId);
    };
  }, [listId, joinRoom, leaveRoom]);

  const addItem = useCallback(async (productId: number, quantity: number = 1) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await realtimeManager.addToShoppingList(listId, productId, quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  const updateItem = useCallback(async (itemId: string, quantity: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await realtimeManager.updateShoppingListItem(listId, itemId, quantity);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update item');
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  const removeItem = useCallback(async (itemId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await realtimeManager.removeFromShoppingList(listId, itemId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item');
    } finally {
      setIsLoading(false);
    }
  }, [listId]);

  return {
    list,
    isLoading,
    error,
    addItem,
    updateItem,
    removeItem,
  };
};

export const useOfflineSync = () => {
  const cartStore = useCartStore();
  const { isConnected } = useRealtimeCollaboration();

  useEffect(() => {
    // Sync cart actions when coming back online
    if (isConnected) {
      const syncCartActions = () => {
        // Get current cart state and sync with server
        const currentCart = cartStore.items;
        currentCart.forEach(item => {
          realtimeManager.addToSyncQueue({
            type: 'add-to-cart',
            data: { productId: item.id, quantity: item.quantity },
            timestamp: Date.now(),
          });
        });
      };

      syncCartActions();
    }
  }, [isConnected, cartStore.items]);

  const addToCartOffline = useCallback((productId: number, quantity: number = 1) => {
    // Add to local cart immediately
    const product = { id: productId, name: '', price: 0 } as Product; // Would get full product
    cartStore.addItem(product);
    
    // Add to sync queue
    realtimeManager.addToSyncQueue({
      type: 'add-to-cart',
      data: { productId, quantity },
      timestamp: Date.now(),
    });
  }, [cartStore]);

  return {
    addToCartOffline,
    isConnected,
  };
};

// Types
interface ShoppingList {
  id: string;
  name: string;
  createdBy: string;
  sharedWith: string[];
  items: ShoppingListItem[];
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}

interface ShoppingListItem {
  id: string;
  productId: number;
  quantity: number;
  addedBy: string;
  addedAt: Date;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date;
}

interface UserPresence {
  userId: string;
  name: string;
  avatar?: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: Date;
  roomId: string;
  isTyping?: boolean;
  typingContext?: string;
}

interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

interface SyncAction {
  type: 'add-to-cart' | 'remove-from-cart' | 'update-cart' | 'add-to-wishlist' | 'remove-from-wishlist';
  data: any;
  timestamp: number;
  actionId?: string;
}

// Global instance
export const realtimeManager = new RealtimeCollaborationManager();
