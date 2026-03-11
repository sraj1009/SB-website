import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, X, Sparkles, TrendingUp, Clock, Star } from 'lucide-react';

interface SearchFilters {
  category: string[];
  ageGroup: string[];
  priceRange: [number, number];
  language: string[];
  rating: number;
  inStock: boolean;
  freeShipping: boolean;
}

interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  ageGroup: string;
  language: string;
  inStock: boolean;
  freeShipping: boolean;
  image: string;
  tags: string[];
}

interface SearchSuggestion {
  text: string;
  type: 'product' | 'category' | 'author' | 'trending';
  count?: number;
}

interface AdvancedSearchProps {
  onSearch: (query: string, filters: SearchFilters) => void;
  onProductClick: (product: Product) => void;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({ onSearch, onProductClick }) => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    category: [],
    ageGroup: [],
    priceRange: [0, 5000],
    language: [],
    rating: 0,
    inStock: false,
    freeShipping: false,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Categories
  const categories = [
    'Books',
    'Poems',
    'Rhymes',
    'Stories',
    'Educational Toys',
    'Art Supplies',
    'Flash Cards',
  ];

  // Age groups
  const ageGroups = ['0-2 years', '3-5 years', '6-8 years', '9-12 years', '13+ years'];

  // Languages
  const languages = ['Tamil', 'English', 'Bilingual', 'Hindi'];

  // Load trending searches and recent searches
  useEffect(() => {
    loadTrendingSearches();
    loadRecentSearches();
  }, []);

  // Get search suggestions based on query
  useEffect(() => {
    if (query.length > 2) {
      debouncedGetSuggestions(query);
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Get AI recommendations based on search history
  useEffect(() => {
    if (query.length > 0) {
      getAIRecommendations(query);
    }
  }, [query]);

  const debouncedGetSuggestions = useCallback(
    debounce(async (searchQuery: string) => {
      try {
        const response = await fetch(
          `/api/v1/search/suggestions?q=${encodeURIComponent(searchQuery)}`
        );
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        }
      } catch (error) {
        console.error('Failed to get suggestions:', error);
      }
    }, 300),
    []
  );

  const getAIRecommendations = async (searchQuery: string) => {
    try {
      const response = await fetch('/api/v1/search/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          query: searchQuery,
          userHistory: recentSearches,
          preferences: filters,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (error) {
      console.error('Failed to get AI recommendations:', error);
    }
  };

  const loadTrendingSearches = async () => {
    try {
      const response = await fetch('/api/v1/search/trending');
      if (response.ok) {
        const data = await response.json();
        setTrendingSearches(data.trending || []);
      }
    } catch (error) {
      console.error('Failed to load trending searches:', error);
    }
  };

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (searchTerm: string) => {
    const updated = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 10);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

  const handleSearch = () => {
    if (query.trim()) {
      saveRecentSearch(query.trim());
      onSearch(query.trim(), filters);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch();
  };

  const handleFilterChange = (filterType: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({
      category: [],
      ageGroup: [],
      priceRange: [0, 5000],
      language: [],
      rating: 0,
      inStock: false,
      freeShipping: false,
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  // Debounce utility
  function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }

  const hasActiveFilters = Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (Array.isArray(value) && value.length === 2) return value[0] > 0 || value[1] < 5000;
    return value !== false && value !== 0;
  });

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Search Bar */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for books, poems, rhymes, stories..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-lg border transition-colors ${
              hasActiveFilters
                ? 'bg-yellow-500 text-black border-yellow-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
            }`}
          >
            <Filter className="w-5 h-5" />
            {hasActiveFilters && (
              <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {
                  Object.values(filters).filter((v) =>
                    Array.isArray(v) ? v.length > 0 : v !== false && v !== 0
                  ).length
                }
              </span>
            )}
          </button>

          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Search
          </button>
        </div>

        {/* Search Suggestions Dropdown */}
        {showSuggestions &&
          (suggestions.length > 0 || recentSearches.length > 0 || trendingSearches.length > 0) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Suggestions</h3>
                  {suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-gray-400" />
                        <span>{suggestion.text}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {suggestion.type === 'trending' && (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        )}
                        {suggestion.count && (
                          <span className="text-xs text-gray-500">{suggestion.count} results</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Recent Searches</h3>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick({ text: search, type: 'product' })}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Trending Searches */}
              {trendingSearches.length > 0 && (
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Trending Searches</h3>
                  {trendingSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick({ text: search, type: 'trending' })}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded flex items-center gap-2"
                    >
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span>{search}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Filters</h3>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Categories */}
            <div>
              <h4 className="font-medium mb-3">Categories</h4>
              <div className="space-y-2">
                {categories.map((category) => (
                  <label key={category} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.category.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('category', [...filters.category, category]);
                        } else {
                          handleFilterChange(
                            'category',
                            filters.category.filter((c) => c !== category)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Age Groups */}
            <div>
              <h4 className="font-medium mb-3">Age Group</h4>
              <div className="space-y-2">
                {ageGroups.map((age) => (
                  <label key={age} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.ageGroup.includes(age)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('ageGroup', [...filters.ageGroup, age]);
                        } else {
                          handleFilterChange(
                            'ageGroup',
                            filters.ageGroup.filter((a) => a !== age)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm">{age}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Languages */}
            <div>
              <h4 className="font-medium mb-3">Language</h4>
              <div className="space-y-2">
                {languages.map((language) => (
                  <label key={language} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={filters.language.includes(language)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('language', [...filters.language, language]);
                        } else {
                          handleFilterChange(
                            'language',
                            filters.language.filter((l) => l !== language)
                          );
                        }
                      }}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                    <span className="text-sm">{language}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div className="md:col-span-2 lg:col-span-3">
              <h4 className="font-medium mb-3">Price Range</h4>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  value={filters.priceRange[0]}
                  onChange={(e) =>
                    handleFilterChange('priceRange', [
                      parseInt(e.target.value) || 0,
                      filters.priceRange[1],
                    ])
                  }
                  placeholder="Min"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="number"
                  value={filters.priceRange[1]}
                  onChange={(e) =>
                    handleFilterChange('priceRange', [
                      filters.priceRange[0],
                      parseInt(e.target.value) || 5000,
                    ])
                  }
                  placeholder="Max"
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            {/* Additional Filters */}
            <div className="md:col-span-2 lg:col-span-3">
              <h4 className="font-medium mb-3">Additional Filters</h4>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                    className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm">In Stock Only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.freeShipping}
                    onChange={(e) => handleFilterChange('freeShipping', e.target.checked)}
                    className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                  />
                  <span className="text-sm">Free Shipping</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Min Rating:</span>
                  <select
                    value={filters.rating}
                    onChange={(e) => handleFilterChange('rating', parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value={0}>Any</option>
                    <option value={1}>1+</option>
                    <option value={2}>2+</option>
                    <option value={3}>3+</option>
                    <option value={4}>4+</option>
                    <option value={5}>5</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-medium">AI Recommendations</h3>
            <span className="text-sm text-gray-600">Based on your search</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.map((product) => (
              <div
                key={product.id}
                onClick={() => onProductClick(product)}
                className="bg-white rounded-lg p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <img
                  src={product.image}
                  alt={product.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
                <h4 className="font-medium text-sm mb-1 line-clamp-2">{product.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-yellow-500">₹{product.price}</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{product.rating}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
