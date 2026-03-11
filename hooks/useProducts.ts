import { useState, useEffect, useMemo, useCallback } from 'react';
import { Category, Product } from '../types';
import api from '../services/api';
import { MOCK_PRODUCTS } from '../constants';

interface UseProductFilterProps {
  selectedCategory: Category;
  searchQuery: string;
  priceRange: [number, number];
  minRating: number | null;
  sortBy: 'default' | 'price-low' | 'price-high' | 'rating' | 'newest';
  selectedLanguage: string | null;
  products: Product[];
}

export const useProductFilter = ({
  selectedCategory,
  searchQuery,
  priceRange,
  minRating,
  sortBy,
  selectedLanguage,
  products,
}: UseProductFilterProps) => {
  // Simple relevance scoring for search
  const calculateRelevance = useCallback((product: Product, query: string): number => {
    const q = query.toLowerCase();
    const title = product.title.toLowerCase();
    const author = product.author?.toLowerCase() || '';
    const desc = product.description.toLowerCase();
    let score = 0;

    // Exact matches (Highest priority)
    if (title === q) score += 100;
    if (title.includes(q)) score += 50;
    if (author.includes(q)) score += 40;
    if (desc.includes(q)) score += 20;

    // Word matching
    const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
    const titleWords = title.split(/\s+/);
    const authorWords = author.split(/\s+/);

    for (const qWord of queryWords) {
      // Check if any title word starts with query word
      if (titleWords.some((tw) => tw.startsWith(qWord))) score += 15;
      // Check if any title word includes query word
      if (titleWords.some((tw) => tw.includes(qWord))) score += 8;
      // Check author words
      if (authorWords.some((aw) => aw.startsWith(qWord))) score += 10;
      if (authorWords.some((aw) => aw.includes(qWord))) score += 5;

      // Check language
      if (product.language?.toLowerCase().includes(qWord.toLowerCase())) score += 60; // High priority for explicit language search
    }

    // Levenshtein-like similarity for short queries (catch typos)
    if (q.length >= 3 && q.length <= 10) {
      // Check if any word in title is similar to query
      for (const tw of titleWords) {
        if (tw.length >= 3) {
          // Simple similarity: count matching characters
          let matches = 0;
          const shorter = q.length < tw.length ? q : tw;
          const longer = q.length >= tw.length ? q : tw;
          for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) matches++;
          }
          const similarity = matches / longer.length;
          if (similarity >= 0.6) score += Math.round(similarity * 10);
        }
      }
    }

    return score;
  }, []);

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    let result = products;

    // Strict Language Filter (overrides search if active, or works with it)
    if (selectedLanguage) {
      result = result.filter((p) => p.language === selectedLanguage);
    }

    // Books category groups BOOKS, POEM_BOOK, and STORY_BOOK
    const booksCategories = [Category.BOOKS, Category.POEM_BOOK, Category.STORY_BOOK];

    // Category Filter
    if (selectedCategory !== Category.ALL) {
      result = result.filter((product) => {
        if (selectedCategory === Category.BOOKS) {
          return booksCategories.includes(product.category);
        }
        return product.category === selectedCategory;
      });
    }

    // Price Range Filter
    result = result.filter(
      (product) => product.price >= priceRange[0] && product.price <= priceRange[1]
    );

    // Minimum Rating Filter
    if (minRating !== null) {
      result = result.filter((product) => product.rating >= minRating);
    }

    // Apply fuzzy search with relevance scoring
    if (searchQuery.trim()) {
      const scoredProducts = result.map((product) => ({
        product,
        score: calculateRelevance(product, searchQuery),
      }));

      // Filter to only products with some relevance, then sort by score
      result = scoredProducts
        .filter((sp) => sp.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((sp) => sp.product);
    }

    // Apply sorting (only if not searching, as search already sorts by relevance)
    if (!searchQuery.trim()) {
      switch (sortBy) {
        case 'price-low':
          result = [...result].sort((a, b) => a.price - b.price);
          break;
        case 'price-high':
          result = [...result].sort((a, b) => b.price - a.price);
          break;
        case 'rating':
          result = [...result].sort((a, b) => b.rating - a.rating);
          break;
        case 'newest':
          result = [...result].sort((a, b) => b.id - a.id);
          break;
        default:
          result = [...result].sort((a, b) => a.id - b.id);
          break;
      }
    }

    // Always sort unavailable products (Coming Soon / Out of Stock) to the bottom
    result = [...result].sort((a, b) => {
      const aUnavailable = a.isComingSoon || a.isOutOfStock;
      const bUnavailable = b.isComingSoon || b.isOutOfStock;
      if (aUnavailable === bUnavailable) return 0;
      return aUnavailable ? 1 : -1;
    });

    return result;
  }, [
    products,
    selectedCategory,
    searchQuery,
    priceRange,
    minRating,
    sortBy,
    selectedLanguage,
    calculateRelevance,
  ]);

  return { filteredProducts, calculateRelevance };
};

interface UseProductsProps {
  selectedCategory: Category;
  searchQuery: string;
  sortBy: 'default' | 'price-low' | 'price-high' | 'rating' | 'newest';
  priceRange: [number, number];
  selectedLanguage: string | null;
}

export const useProducts = ({
  selectedCategory,
  searchQuery,
  sortBy,
  priceRange,
  selectedLanguage,
}: UseProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Data Fetching
  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      // Map sort types
      let mappedSortBy: string = 'createdAt';
      let sortOrder: 'asc' | 'desc' = 'desc';

      if (sortBy === 'price-low') {
        mappedSortBy = 'price';
        sortOrder = 'asc';
      } else if (sortBy === 'price-high') {
        mappedSortBy = 'price';
        sortOrder = 'desc';
      } else if (sortBy === 'rating') {
        mappedSortBy = 'rating';
        sortOrder = 'desc';
      }

      const response = await api.products.getProducts({
        category: selectedCategory === Category.ALL ? undefined : selectedCategory,
        search: searchQuery,
        sortBy: mappedSortBy,
        sortOrder,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        language: selectedLanguage || undefined,
        limit: 100, // Fetch enough for current UI needs
      });

      // Map backend products to frontend types if needed (e.g., _id vs id)
      const mappedProducts = response.products.map((p: any) => ({
        ...p,
        id: p._id || p.id,
      }));

      setProducts(mappedProducts);
    } catch (err) {
      console.error('Failed to fetch products:', err);
      // Fallback to MOCK_PRODUCTS in case of total failure for UX stability during migration
      if (products.length === 0) setProducts(MOCK_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, searchQuery, sortBy, priceRange, selectedLanguage]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, isLoading, fetchProducts };
};
