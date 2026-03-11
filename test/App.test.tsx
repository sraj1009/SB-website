import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from '../App';

// Mock the API service completely
vi.mock('../services/api', () => ({
  default: {
    products: {
      getAll: vi.fn().mockResolvedValue({ products: [] }),
      getByCategory: vi.fn().mockResolvedValue({ products: [] }),
      getProducts: vi.fn().mockResolvedValue({ products: [] }),
    },
    admin: {
      getStats: vi.fn().mockResolvedValue({ stats: {} }),
      getOrders: vi.fn().mockResolvedValue({ orders: [] }),
      getProducts: vi.fn().mockResolvedValue({ products: [] }),
      getUsers: vi.fn().mockResolvedValue({ users: [] }),
    },
  },
}));

// Mock the hooks that use the API
vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({
    products: [],
    isLoading: false,
    error: null,
    filteredProducts: [],
    categories: [],
    selectedCategory: 'all',
    setSelectedCategory: vi.fn(),
    setSearchQuery: vi.fn(),
    setPriceRange: vi.fn(),
    setMinRating: vi.fn(),
  }),
  useProductFilter: () => ({
    filteredProducts: [],
    filters: {
      category: 'all',
      priceRange: [0, 1000],
      minRating: 0,
    },
    updateFilters: vi.fn(),
    clearFilters: vi.fn(),
  }),
}));

// Mock the components that might cause issues
vi.mock('../components/InteractiveParticles', () => ({
  default: () => <div data-testid="interactive-particles">Particles</div>,
}));

vi.mock('../components/RoamingBee', () => ({
  default: () => <div data-testid="roaming-bee">Bee</div>,
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    // Look for any element that would indicate the app loaded
    expect(document.body).toBeInTheDocument();
  });

  it('displays navigation elements', () => {
    render(<App />);
    // Check for navigation elements
    expect(document.querySelector('nav')).toBeInTheDocument();
  });
});
