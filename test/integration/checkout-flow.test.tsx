import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { ChakraProvider } from '@chakra-ui/react';
import CheckoutFlow from '../../components/CheckoutFlow';
import { useCartStore } from '../../store/advanced';

// Mock server setup
const server = setupServer(
  rest.get('/api/products', (req, res, ctx) => {
    return res(
      ctx.json([
        { id: 1, name: 'Test Book', price: 10.99, category: 'BOOKS', stock: 10 },
        { id: 2, name: 'Test Stationery', price: 5.99, category: 'STATIONERY', stock: 5 },
      ])
    );
  }),
  
  rest.post('/api/orders', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 'order-123',
        status: 'pending',
        total: 16.98,
        items: [
          { id: 1, quantity: 1, price: 10.99 },
          { id: 2, quantity: 1, price: 5.99 },
        ],
      })
    );
  }),
  
  rest.post('/api/payment', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        paymentId: 'payment-123',
        status: 'completed',
      })
    );
  })
);

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ChakraProvider>
          {component}
        </ChakraProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock store
const mockCartStore = {
  items: [
    { id: 1, name: 'Test Book', price: 10.99, quantity: 1 },
    { id: 2, name: 'Test Stationery', price: 5.99, quantity: 1 },
  ],
  getTotalItems: () => 2,
  getTotalPrice: () => 16.98,
  clearCart: vi.fn(),
};

describe('Checkout Flow Integration Tests', () => {
  beforeAll(() => server.listen());
  afterEach(() => {
    server.resetHandlers();
    vi.clearAllMocks();
  });
  afterAll(() => server.close());

  beforeEach(() => {
    vi.mock('../../store/advanced', () => ({
      useCartStore: () => mockCartStore,
    }));
  });

  test('Complete checkout flow from cart to payment success', async () => {
    renderWithProviders(<CheckoutFlow />);

    // Step 1: Cart Summary
    expect(screen.getByText('Cart Summary')).toBeInTheDocument();
    expect(screen.getByText('Test Book')).toBeInTheDocument();
    expect(screen.getByText('Test Stationery')).toBeInTheDocument();
    expect(screen.getByText('16.98')).toBeInTheDocument();

    // Proceed to shipping
    fireEvent.click(screen.getByText('Proceed to Shipping'));

    // Step 2: Shipping Information
    await waitFor(() => {
      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    });

    // Fill shipping form
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 Test St' },
    });
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Test City' },
    });
    fireEvent.change(screen.getByLabelText('Postal Code'), {
      target: { value: '12345' },
    });

    // Proceed to payment
    fireEvent.click(screen.getByText('Proceed to Payment'));

    // Step 3: Payment Information
    await waitFor(() => {
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });

    // Fill payment form
    fireEvent.change(screen.getByLabelText('Card Number'), {
      target: { value: '4242424242424242' },
    });
    fireEvent.change(screen.getByLabelText('Expiry Date'), {
      target: { value: '12/25' },
    });
    fireEvent.change(screen.getByLabelText('CVV'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Cardholder Name'), {
      target: { value: 'JOHN DOE' },
    });

    // Submit payment
    fireEvent.click(screen.getByText('Complete Purchase'));

    // Step 4: Success
    await waitFor(() => {
      expect(screen.getByText('Order Confirmed!')).toBeInTheDocument();
      expect(screen.getByText('order-123')).toBeInTheDocument();
    });

    // Verify cart was cleared
    expect(mockCartStore.clearCart).toHaveBeenCalled();
  });

  test('Handles out-of-stock items during checkout', async () => {
    // Mock product with zero stock
    server.use(
      rest.get('/api/products/1', (req, res, ctx) => {
        return res(
          ctx.json({
            id: 1,
            name: 'Test Book',
            price: 10.99,
            category: 'BOOKS',
            stock: 0, // Out of stock
          })
        );
      })
    );

    renderWithProviders(<CheckoutFlow />);

    // Should show out-of-stock warning
    await waitFor(() => {
      expect(screen.getByText(/out of stock/i)).toBeInTheDocument();
      expect(screen.getByText('Remove from Cart')).toBeInTheDocument();
    });

    // Remove out-of-stock item
    fireEvent.click(screen.getByText('Remove from Cart'));

    // Should update cart and allow proceeding
    await waitFor(() => {
      expect(screen.queryByText(/out of stock/i)).not.toBeInTheDocument();
      expect(screen.getByText('Proceed to Shipping')).not.toBeDisabled();
    });
  });

  test('Validates form fields correctly', async () => {
    renderWithProviders(<CheckoutFlow />);

    // Proceed to shipping
    fireEvent.click(screen.getByText('Proceed to Shipping'));

    await waitFor(() => {
      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    });

    // Try to proceed without filling required fields
    fireEvent.click(screen.getByText('Proceed to Payment'));

    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('First name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Address is required')).toBeInTheDocument();
    });

    // Fill valid email but invalid format
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'invalid-email' },
    });

    fireEvent.click(screen.getByText('Proceed to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email')).toBeInTheDocument();
    });
  });

  test('Handles payment errors gracefully', async () => {
    // Mock payment failure
    server.use(
      rest.post('/api/payment', (req, res, ctx) => {
        return res(
          ctx.status(400),
          ctx.json({
            error: 'Payment declined',
            message: 'Insufficient funds',
          })
        );
      })
    );

    renderWithProviders(<CheckoutFlow />);

    // Complete first two steps
    fireEvent.click(screen.getByText('Proceed to Shipping'));
    
    await waitFor(() => {
      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    });

    // Fill shipping form (minimal valid data)
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 Test St' },
    });
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Test City' },
    });
    fireEvent.change(screen.getByLabelText('Postal Code'), {
      target: { value: '12345' },
    });

    fireEvent.click(screen.getByText('Proceed to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });

    // Fill payment form
    fireEvent.change(screen.getByLabelText('Card Number'), {
      target: { value: '4242424242424242' },
    });
    fireEvent.change(screen.getByLabelText('Expiry Date'), {
      target: { value: '12/25' },
    });
    fireEvent.change(screen.getByLabelText('CVV'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByLabelText('Cardholder Name'), {
      target: { value: 'JOHN DOE' },
    });

    // Submit payment
    fireEvent.click(screen.getByText('Complete Purchase'));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText('Payment declined')).toBeInTheDocument();
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  test('Saves shipping address for future use', async () => {
    renderWithProviders(<CheckoutFlow />);

    // Proceed to shipping and fill form
    fireEvent.click(screen.getByText('Proceed to Shipping'));
    
    await waitFor(() => {
      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    });

    // Fill shipping form
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Last Name'), {
      target: { value: 'Doe' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 Test St' },
    });
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Test City' },
    });
    fireEvent.change(screen.getByLabelText('Postal Code'), {
      target: { value: '12345' },
    });

    // Check "Save for future use"
    fireEvent.click(screen.getByLabelText('Save address for future use'));

    // Proceed to payment
    fireEvent.click(screen.getByText('Proceed to Payment'));

    // Mock successful address save
    server.use(
      rest.post('/api/addresses', (req, res, ctx) => {
        return res(
          ctx.json({
            id: 'address-123',
            message: 'Address saved successfully',
          })
        );
      })
    );

    await waitFor(() => {
      expect(screen.getByText('Address saved successfully')).toBeInTheDocument();
    });
  });

  test('Calculates shipping and tax correctly', async () => {
    renderWithProviders(<CheckoutFlow />);

    // Check initial calculations
    expect(screen.getByText('Subtotal: $16.98')).toBeInTheDocument();
    expect(screen.getByText('Tax: $1.36')).toBeInTheDocument(); // 8% of 16.98
    expect(screen.getByText('Shipping: $50.00')).toBeInTheDocument(); // Below $1499 threshold
    expect(screen.getByText('Total: $68.34')).toBeInTheDocument(); // 16.98 + 1.36 + 50.00

    // Add more items to test free shipping
    const highValueCart = {
      items: [
        { id: 1, name: 'Expensive Book', price: 1000, quantity: 2 },
      ],
      getTotalItems: () => 2,
      getTotalPrice: () => 2000,
      clearCart: vi.fn(),
    };

    vi.mock('../../store/advanced', () => ({
      useCartStore: () => highValueCart,
    }));

    renderWithProviders(<CheckoutFlow />);

    expect(screen.getByText('Subtotal: $2000.00')).toBeInTheDocument();
    expect(screen.getByText('Tax: $160.00')).toBeInTheDocument(); // 8% of 2000
    expect(screen.getByText('Shipping: FREE')).toBeInTheDocument(); // Above $1499 threshold
    expect(screen.getByText('Total: $2160.00')).toBeInTheDocument(); // 2000 + 160 + 0
  });

  test('Supports multiple payment methods', async () => {
    renderWithProviders(<CheckoutFlow />);

    // Proceed to payment
    fireEvent.click(screen.getByText('Proceed to Shipping'));
    
    await waitFor(() => {
      expect(screen.getByText('Shipping Information')).toBeInTheDocument();
    });

    // Fill minimal shipping form
    fireEvent.change(screen.getByLabelText('First Name'), {
      target: { value: 'John' },
    });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'john@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Address'), {
      target: { value: '123 Test St' },
    });
    fireEvent.change(screen.getByLabelText('City'), {
      target: { value: 'Test City' },
    });
    fireEvent.change(screen.getByLabelText('Postal Code'), {
      target: { value: '12345' },
    });

    fireEvent.click(screen.getByText('Proceed to Payment'));

    await waitFor(() => {
      expect(screen.getByText('Payment Information')).toBeInTheDocument();
    });

    // Test different payment methods
    fireEvent.click(screen.getByLabelText('Credit Card'));
    expect(screen.getByLabelText('Card Number')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('PayPal'));
    expect(screen.getByText('Continue with PayPal')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Cash on Delivery'));
    expect(screen.getByText('Pay on delivery')).toBeInTheDocument();
  });
});
