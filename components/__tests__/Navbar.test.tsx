import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Navbar from '../Navbar';
import { useCartStore } from '@store/index';

// Mock the store
vi.mock('@store/index', () => ({
  useCartStore: vi.fn(),
  useUserStore: vi.fn(),
  useUIStore: vi.fn(),
}));

const mockUseCartStore = vi.mocked(useCartStore);

describe('Navbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCartStore.mockReturnValue({
      items: [],
      isOpen: false,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      toggleCart: vi.fn(),
      setCartOpen: vi.fn(),
      getTotalItems: () => 0,
      getTotalPrice: () => 0,
      getShippingFee: () => 0,
    });
  });

  const renderNavbar = () => {
    return render(
      <BrowserRouter>
        <Navbar
          cartCount={0}
          onCartClick={vi.fn()}
          onSearch={vi.fn()}
          onCategorySelect={vi.fn()}
          onNavigateHome={vi.fn()}
          onNavigateTestimonials={vi.fn()}
          onNavigateAbout={vi.fn()}
          onNavigateTerms={vi.fn()}
          onNavigateContact={vi.fn()}
          onNavigateWishlist={vi.fn()}
          user={null}
          onSignInClick={vi.fn()}
          onSignOutClick={vi.fn()}
          onNavbarSearch={vi.fn()}
        />
      </BrowserRouter>
    );
  };

  it('renders the logo', () => {
    renderNavbar();
    const logo = screen.getByAltText('SINGGLEBEE Logo');
    expect(logo).toBeInTheDocument();
  });

  it('displays cart count when items are in cart', () => {
    mockUseCartStore.mockReturnValue({
      items: [{ id: 1, name: 'Test Product', price: 10, quantity: 2 }],
      isOpen: false,
      addItem: vi.fn(),
      removeItem: vi.fn(),
      updateQuantity: vi.fn(),
      clearCart: vi.fn(),
      toggleCart: vi.fn(),
      setCartOpen: vi.fn(),
      getTotalItems: () => 2,
      getTotalPrice: () => 20,
      getShippingFee: () => 0,
    });

    renderNavbar();
    const cartBadge = screen.getByText('2');
    expect(cartBadge).toBeInTheDocument();
  });

  it('calls onCartClick when cart button is clicked', () => {
    const mockOnCartClick = vi.fn();
    renderNavbar();
    
    const cartButton = screen.getByLabelText('Open Cart');
    fireEvent.click(cartButton);
    
    expect(mockOnCartClick).toHaveBeenCalled();
  });

  it('updates search input when typing', async () => {
    const mockOnSearch = vi.fn();
    renderNavbar();
    
    const searchInput = screen.getByPlaceholderText('Search SinggleBee.com');
    fireEvent.change(searchInput, { target: { value: 'test search' } });
    
    await waitFor(() => {
      expect(searchInput).toHaveValue('test search');
    });
  });
});
