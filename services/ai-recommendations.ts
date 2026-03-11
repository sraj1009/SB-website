/**
 * AI-Powered Features and Recommendations for SINGGLEBEE
 */

import { cacheConfigs, cacheManager } from '../utils/advanced-cache';
import { useCartStore, useUserStore } from '../store/advanced';
import type { Product, User, CartItem } from '../types';

// AI Recommendation Engine
class AIRecommendationEngine {
  private geminiAPIKey: string;
  private userBehaviorCache = new Map<string, UserBehaviorData>();
  
  constructor() {
    this.geminiAPIKey = import.meta.env.VITE_GEMINI_API_KEY || '';
  }

  // User behavior tracking
  trackUserBehavior(userId: string, action: UserAction): void {
    const existing = this.userBehaviorCache.get(userId) || {
      userId,
      views: [],
      purchases: [],
      searches: [],
      cartActions: [],
      timeSpent: {},
      preferences: {
        categories: {},
        priceRanges: {},
        languages: {},
        ageGroups: {},
      },
      sessionStart: Date.now(),
      lastActivity: Date.now(),
    };

    // Update behavior data
    switch (action.type) {
      case 'view':
        existing.views.push({
          productId: action.productId,
          timestamp: Date.now(),
          duration: action.duration || 0,
          source: action.source || 'search',
        });
        break;
        
      case 'purchase':
        existing.purchases.push({
          productId: action.productId,
          timestamp: Date.now(),
          quantity: action.quantity || 1,
          price: action.price || 0,
        });
        break;
        
      case 'search':
        existing.searches.push({
          query: action.query,
          timestamp: Date.now(),
          resultsCount: action.resultsCount || 0,
          clickedProducts: action.clickedProducts || [],
        });
        break;
        
      case 'cart':
        existing.cartActions.push({
          productId: action.productId,
          timestamp: Date.now(),
          action: action.action,
          quantity: action.quantity || 1,
        });
        break;
    }

    existing.lastActivity = Date.now();
    this.userBehaviorCache.set(userId, existing);
  }

  // Product recommendations based on user behavior
  async getPersonalizedRecommendations(
    userId: string,
    context: RecommendationContext = {}
  ): Promise<ProductRecommendation[]> {
    const cacheKey = `ai-recommendations-${userId}-${JSON.stringify(context)}`;
    
    return cacheManager.fetchWithCache(
      cacheKey,
      () => this.generateRecommendations(userId, context),
      cacheConfigs.api
    );
  }

  private async generateRecommendations(
    userId: string,
    context: RecommendationContext
  ): Promise<ProductRecommendation[]> {
    const userBehavior = this.userBehaviorCache.get(userId);
    if (!userBehavior) {
      return this.getFallbackRecommendations(context);
    }

    // Analyze user preferences
    const preferences = this.analyzeUserPreferences(userBehavior);
    
    // Get collaborative filtering recommendations
    const collaborativeRecs = await this.getCollaborativeFilteringRecommendations(
      userId,
      preferences
    );
    
    // Get content-based recommendations
    const contentRecs = await this.getContentBasedRecommendations(
      preferences,
      context
    );
    
    // Get trending recommendations
    const trendingRecs = await this.getTrendingRecommendations(preferences);
    
    // Combine and rank recommendations
    const combined = this.combineRecommendations([
      { recommendations: collaborativeRecs, weight: 0.4 },
      { recommendations: contentRecs, weight: 0.4 },
      { recommendations: trendingRecs, weight: 0.2 },
    ]);

    return combined.slice(0, context.limit || 10);
  }

  private analyzeUserPreferences(behavior: UserBehaviorData): UserPreferences {
    const preferences: UserPreferences = {
      categories: {},
      priceRanges: {},
      languages: {},
      ageGroups: {},
      avgSessionDuration: 0,
      preferredPriceRange: [0, 10000],
      favoriteCategories: [],
    };

    // Analyze category preferences
    behavior.views.forEach(view => {
      const product = this.getProductById(view.productId);
      if (product) {
        preferences.categories[product.category] = 
          (preferences.categories[product.category] || 0) + 1;
        
        // Price range analysis
        const priceRange = this.getPriceRange(product.price);
        preferences.priceRanges[priceRange] = 
          (preferences.priceRanges[priceRange] || 0) + 1;
        
        // Language preferences
        if (product.language) {
          preferences.languages[product.language] = 
            (preferences.languages[product.language] || 0) + 1;
        }
      }
    });

    // Calculate favorite categories
    preferences.favoriteCategories = Object.entries(preferences.categories)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);

    // Calculate preferred price range
    const prices = behavior.views
      .map(view => this.getProductById(view.productId)?.price)
      .filter((price): price is number => price !== undefined);
    
    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      preferences.preferredPriceRange = [min, max * 1.5]; // 50% buffer
    }

    return preferences;
  }

  private async getCollaborativeFilteringRecommendations(
    userId: string,
    preferences: UserPreferences
  ): Promise<ProductRecommendation[]> {
    // Find similar users based on behavior patterns
    const similarUsers = await this.findSimilarUsers(userId, preferences);
    
    // Get products liked by similar users
    const recommendations: ProductRecommendation[] = [];
    
    for (const similarUser of similarUsers) {
      const userBehavior = this.userBehaviorCache.get(similarUser.userId);
      if (userBehavior) {
        for (const purchase of userBehavior.purchases) {
          const product = this.getProductById(purchase.productId);
          if (product && !this.hasUserViewed(userId, product.id)) {
            recommendations.push({
              product,
              score: similarUser.similarity * (purchase.price / 1000), // Normalize by price
              reason: 'Users like you also bought',
              type: 'collaborative',
            });
          }
        }
      }
    }

    return recommendations.sort((a, b) => b.score - a.score);
  }

  private async getContentBasedRecommendations(
    preferences: UserPreferences,
    context: RecommendationContext
  ): Promise<ProductRecommendation[]> {
    const recommendations: ProductRecommendation[] = [];
    
    // Get all products
    const allProducts = await this.getAllProducts();
    
    // Score products based on user preferences
    for (const product of allProducts) {
      if (this.hasUserViewed(preferences.userId || '', product.id)) continue;
      
      let score = 0;
      let reasons: string[] = [];
      
      // Category matching
      if (preferences.favoriteCategories.includes(product.category)) {
        score += 0.3;
        reasons.push('Similar to your favorite categories');
      }
      
      // Price range matching
      if (product.price >= preferences.preferredPriceRange[0] && 
          product.price <= preferences.preferredPriceRange[1]) {
        score += 0.2;
        reasons.push('Within your preferred price range');
      }
      
      // Language matching
      if (product.language && preferences.languages[product.language]) {
        score += 0.2;
        reasons.push('In your preferred language');
      }
      
      // Rating bonus
      if (product.rating && product.rating > 4.0) {
        score += 0.1 * (product.rating / 5);
        reasons.push('Highly rated');
      }
      
      // New product bonus
      if (product.isNew) {
        score += 0.1;
        reasons.push('New arrival');
      }
      
      if (score > 0.3) { // Minimum threshold
        recommendations.push({
          product,
          score,
          reason: reasons.join(', '),
          type: 'content-based',
        });
      }
    }
    
    return recommendations.sort((a, b) => b.score - a.score);
  }

  private async getTrendingRecommendations(
    preferences: UserPreferences
  ): Promise<ProductRecommendation[]> {
    // Get trending products based on recent activity
    const trending = await this.getTrendingProducts();
    
    return trending
      .filter(product => !this.hasUserViewed(preferences.userId || '', product.id))
      .map(product => ({
        product,
        score: product.trendingScore || 0.5,
        reason: 'Trending now',
        type: 'trending',
      }))
      .sort((a, b) => b.score - a.score);
  }

  private combineRecommendations(
    weightedRecs: { recommendations: ProductRecommendation[]; weight: number }[]
  ): ProductRecommendation[]> {
    const combined = new Map<string, ProductRecommendation>();
    
    for (const { recommendations, weight } of weightedRecs) {
      for (const rec of recommendations) {
        const existing = combined.get(rec.product.id);
        if (existing) {
          existing.score = existing.score * 0.7 + rec.score * weight * 0.3; // Weighted average
          existing.reason = `${existing.reason}, ${rec.reason}`;
        } else {
          combined.set(rec.product.id, {
            ...rec,
            score: rec.score * weight,
          });
        }
      }
    }
    
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }

  // Smart search with AI
  async smartSearch(query: string, userId?: string): Promise<SmartSearchResult> {
    const cacheKey = `smart-search-${query}-${userId || 'anonymous'}`;
    
    return cacheManager.fetchWithCache(
      cacheKey,
      () => this.performSmartSearch(query, userId),
      cacheConfigs.search
    );
  }

  private async performSmartSearch(query: string, userId?: string): Promise<SmartSearchResult> {
    // Traditional search
    const traditionalResults = await this.traditionalSearch(query);
    
    // AI semantic search
    const semanticResults = await this.semanticSearch(query);
    
    // Personalized boost if user is provided
    if (userId) {
      const userBehavior = this.userBehaviorCache.get(userId);
      if (userBehavior) {
        const preferences = this.analyzeUserPreferences(userBehavior);
        
        // Boost results based on user preferences
        traditionalResults.forEach(result => {
          const product = result.product;
          let boost = 0;
          
          if (preferences.favoriteCategories.includes(product.category)) boost += 0.2;
          if (product.price >= preferences.preferredPriceRange[0] && 
              product.price <= preferences.preferredPriceRange[1]) boost += 0.1;
          if (product.language && preferences.languages[product.language]) boost += 0.1;
          
          result.score += boost;
        });
      }
    }
    
    // Merge and rank results
    const merged = this.mergeSearchResults(traditionalResults, semanticResults);
    
    return {
      query,
      results: merged,
      suggestions: await this.generateSearchSuggestions(query),
      didYouMean: await this.getSpellingSuggestions(query),
      totalResults: merged.length,
    };
  }

  // Dynamic pricing based on AI
  async getPersonalizedPrice(productId: number, userId?: string): Promise<PersonalizedPrice> {
    const product = this.getProductById(productId);
    if (!product) return { originalPrice: 0, personalizedPrice: 0, discount: 0, reason: 'Product not found' };

    let personalizedPrice = product.price;
    let discount = 0;
    let reason = 'Standard price';

    if (userId) {
      const userBehavior = this.userBehaviorCache.get(userId);
      if (userBehavior) {
        const preferences = this.analyzeUserPreferences(userBehavior);
        
        // Loyalty discount
        const purchaseCount = userBehavior.purchases.length;
        if (purchaseCount > 10) {
          discount = 0.15; // 15% for loyal customers
          reason = 'Loyalty discount';
        } else if (purchaseCount > 5) {
          discount = 0.10; // 10% for returning customers
          reason = 'Returning customer discount';
        }
        
        // Category preference discount
        if (preferences.favoriteCategories.includes(product.category)) {
          discount = Math.max(discount, 0.05); // At least 5%
          reason = 'Category preference discount';
        }
        
        // High-value customer discount
        const totalSpent = userBehavior.purchases.reduce((sum, p) => sum + (p.price * p.quantity), 0);
        if (totalSpent > 5000) {
          discount = Math.max(discount, 0.20); // 20% for high-value customers
          reason = 'VIP customer discount';
        }
      }
    }

    personalizedPrice = product.price * (1 - discount);

    return {
      originalPrice: product.price,
      personalizedPrice,
      discount,
      reason,
    };
  }

  // Utility methods
  private async findSimilarUsers(userId: string, preferences: UserPreferences): Promise<SimilarUser[]> {
    // Implementation would find users with similar behavior patterns
    // This is a placeholder for the actual algorithm
    return [];
  }

  private async getAllProducts(): Promise<Product[]> {
    // Fetch all products from API
    return [];
  }

  private getProductById(id: number): Product | null {
    // Fetch product by ID
    return null;
  }

  private hasUserViewed(userId: string, productId: number): boolean {
    const behavior = this.userBehaviorCache.get(userId);
    return behavior ? behavior.views.some(view => view.productId === productId) : false;
  }

  private getPriceRange(price: number): string {
    if (price < 100) return 'budget';
    if (price < 500) return 'mid-range';
    if (price < 1000) return 'premium';
    return 'luxury';
  }

  private getFallbackRecommendations(context: RecommendationContext): ProductRecommendation[]> {
    // Return popular products as fallback
    return [];
  }

  private async traditionalSearch(query: string): Promise<SearchResult[]> {
    // Implement traditional text search
    return [];
  }

  private async semanticSearch(query: string): Promise<SearchResult[]> {
    // Implement AI semantic search using embeddings
    return [];
  }

  private mergeSearchResults(traditional: SearchResult[], semantic: SearchResult[]): SearchResult[] {
    // Merge and deduplicate results
    return [];
  }

  private async generateSearchSuggestions(query: string): Promise<string[]> {
    // Generate search suggestions using AI
    return [];
  }

  private async getSpellingSuggestions(query: string): Promise<string[]> {
    // Get spelling corrections
    return [];
  }

  private async getTrendingProducts(): Promise<Product[]> {
    // Get trending products based on recent activity
    return [];
  }
}

// React hooks for AI features
export const useAIRecommendations = (userId?: string) => {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = useCallback(async (context?: RecommendationContext) => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const recs = await aiEngine.getPersonalizedRecommendations(userId, context);
      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    recommendations,
    loading,
    error,
    getRecommendations,
  };
};

export const useSmartSearch = (userId?: string) => {
  const [searchResults, setSearchResults] = useState<SmartSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const results = await aiEngine.smartSearch(query, userId);
      setSearchResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    searchResults,
    loading,
    error,
    search,
  };
};

export const usePersonalizedPricing = (userId?: string) => {
  const [prices, setPrices] = useState<Map<number, PersonalizedPrice>>(new Map());
  const [loading, setLoading] = useState(false);

  const getPersonalizedPrice = useCallback(async (productId: number) => {
    if (prices.has(productId)) return prices.get(productId)!;
    
    setLoading(true);
    
    try {
      const price = await aiEngine.getPersonalizedPrice(productId, userId);
      setPrices(prev => new Map(prev.set(productId, price)));
      return price;
    } catch (error) {
      console.error('Failed to get personalized price:', error);
      return { originalPrice: 0, personalizedPrice: 0, discount: 0, reason: 'Error' };
    } finally {
      setLoading(false);
    }
  }, [userId, prices]);

  return {
    prices,
    loading,
    getPersonalizedPrice,
  };
};

// Types
interface UserBehaviorData {
  userId: string;
  views: ProductView[];
  purchases: ProductPurchase[];
  searches: SearchQuery[];
  cartActions: CartAction[];
  timeSpent: Record<string, number>;
  preferences: {
    categories: Record<string, number>;
    priceRanges: Record<string, number>;
    languages: Record<string, number>;
    ageGroups: Record<string, number>;
  };
  sessionStart: number;
  lastActivity: number;
}

interface UserPreferences {
  categories: Record<string, number>;
  priceRanges: Record<string, number>;
  languages: Record<string, number>;
  ageGroups: Record<string, number>;
  avgSessionDuration: number;
  preferredPriceRange: [number, number];
  favoriteCategories: string[];
  userId?: string;
}

interface ProductRecommendation {
  product: Product;
  score: number;
  reason: string;
  type: 'collaborative' | 'content-based' | 'trending';
}

interface RecommendationContext {
  limit?: number;
  category?: string;
  priceRange?: [number, number];
  excludePurchased?: boolean;
}

interface SmartSearchResult {
  query: string;
  results: SearchResult[];
  suggestions: string[];
  didYouMean: string[];
  totalResults: number;
}

interface SearchResult {
  product: Product;
  score: number;
  matchType: 'exact' | 'partial' | 'semantic';
}

interface PersonalizedPrice {
  originalPrice: number;
  personalizedPrice: number;
  discount: number;
  reason: string;
}

interface SimilarUser {
  userId: string;
  similarity: number;
}

type UserAction = 
  | { type: 'view'; productId: number; duration?: number; source?: string }
  | { type: 'purchase'; productId: number; quantity?: number; price?: number }
  | { type: 'search'; query: string; resultsCount?: number; clickedProducts?: number[] }
  | { type: 'cart'; productId: number; action: 'add' | 'remove'; quantity?: number };

interface ProductView {
  productId: number;
  timestamp: number;
  duration: number;
  source: string;
}

interface ProductPurchase {
  productId: number;
  timestamp: number;
  quantity: number;
  price: number;
}

interface SearchQuery {
  query: string;
  timestamp: number;
  resultsCount: number;
  clickedProducts: number[];
}

interface CartAction {
  productId: number;
  timestamp: number;
  action: 'add' | 'remove';
  quantity: number;
}

// Global AI engine instance
export const aiEngine = new AIRecommendationEngine();
