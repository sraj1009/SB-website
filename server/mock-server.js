import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

const app = express();
const PORT = 5000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'SINGGLEBEE API is running',
    timestamp: new Date().toISOString(),
    environment: 'development',
    version: '1.0.0'
  });
});

// Mock products
const mockProducts = [
  {
    _id: '1',
    title: 'Premium Honey Collection',
    description: 'Pure organic honey from the Himalayas',
    price: 599,
    images: ['honey1.jpg'],
    category: 'honey',
    stockQuantity: 50,
    rating: 4.5,
    reviews: 128,
    discountedPrice: 599
  },
  {
    _id: '2', 
    title: 'Educational Book Set',
    description: 'Complete learning collection for kids',
    price: 1299,
    images: ['books1.jpg'],
    category: 'books',
    stockQuantity: 30,
    rating: 4.8,
    reviews: 89,
    discountedPrice: 1299
  },
  {
    _id: '3',
    title: 'Stationery Premium Pack',
    description: 'Complete stationery set for students',
    price: 399,
    images: ['stationery1.jpg'],
    category: 'stationery',
    stockQuantity: 100,
    rating: 4.3,
    reviews: 67,
    discountedPrice: 399
  }
];

// Mock users
const mockUsers = [
  {
    _id: 'user123',
    email: 'test@singglebee.com',
    name: 'Test User',
    role: 'user'
  },
  {
    _id: 'admin123',
    email: 'admin@singglebee.com',
    name: 'Admin User',
    role: 'admin'
  }
];

// Mock orders
let mockOrders = [];

// Product routes
app.get('/api/v1/products', (req, res) => {
  const { page = 1, limit = 10, category, search } = req.query;
  let filteredProducts = [...mockProducts];
  
  if (category) {
    filteredProducts = filteredProducts.filter(p => p.category === category);
  }
  
  if (search) {
    filteredProducts = filteredProducts.filter(p => 
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + parseInt(limit);
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: {
      products: paginatedProducts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredProducts.length,
        pages: Math.ceil(filteredProducts.length / limit)
      }
    }
  });
});

app.get('/api/v1/products/:id', (req, res) => {
  const product = mockProducts.find(p => p._id === req.params.id);
  
  if (!product) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Product not found'
      }
    });
  }

  res.json({
    success: true,
    data: product
  });
});

// Auth routes (mock)
app.post('/api/v1/auth/signin', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Email and password are required'
      }
    });
  }
  
  const user = mockUsers.find(u => u.email === email);
  
  if (!user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }
  
  // Mock JWT token
  const token = 'mock-jwt-token-' + Date.now();
  
  res.json({
    success: true,
    data: {
      user,
      token,
      refreshToken: 'mock-refresh-token-' + Date.now()
    }
  });
});

app.post('/api/v1/auth/signup', (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'All fields are required'
      }
    });
  }
  
  const existingUser = mockUsers.find(u => u.email === email);
  if (existingUser) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'USER_EXISTS',
        message: 'User already exists'
      }
    });
  }
  
  const newUser = {
    _id: 'user' + Date.now(),
    email,
    name,
    role: 'user'
  };
  
  mockUsers.push(newUser);
  
  const token = 'mock-jwt-token-' + Date.now();
  
  res.status(201).json({
    success: true,
    data: {
      user: newUser,
      token,
      refreshToken: 'mock-refresh-token-' + Date.now()
    }
  });
});

// Order routes
app.get('/api/v1/orders', (req, res) => {
  res.json({
    success: true,
    data: {
      orders: mockOrders,
      pagination: {
        page: 1,
        limit: 10,
        total: mockOrders.length,
        pages: 1
      }
    }
  });
});

app.post('/api/v1/orders', (req, res) => {
  const { items, shippingAddress, totalAmount } = req.body;
  
  if (!items || !shippingAddress) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Items and shipping address are required'
      }
    });
  }
  
  // Calculate total amount if not provided
  const calculatedTotal = totalAmount || items.reduce((sum, item) => {
    const product = mockProducts.find(p => p._id === item.productId);
    return sum + (product ? product.price * item.quantity : 0);
  }, 0);
  
  const newOrder = {
    _id: 'order' + Date.now(),
    items,
    shippingAddress,
    totalAmount: calculatedTotal,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  mockOrders.push(newOrder);
  
  res.status(201).json({
    success: true,
    data: newOrder
  });
});

// Payment routes (mock with Cashfree integration)
app.post('/api/v1/payments/create-order', (req, res) => {
  const { orderId, amount, customerDetails } = req.body;
  
  if (!orderId || !amount) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Order ID and amount are required'
      }
    });
  }
  
  // Mock Cashfree order creation
  const paymentOrder = {
    orderId: 'CF_ORDER_' + Date.now(),
    orderAmount: amount,
    orderCurrency: 'INR',
    customerDetails: customerDetails || {
      customerId: 'cust_' + Date.now(),
      customerEmail: 'test@singglebee.com',
      customerPhone: '9999999999'
    },
    orderSession: {
      paymentSessionId: 'cf_session_' + Date.now(),
      paymentLink: `https://payments.cashfree.com/order/${Date.now()}`,
      expiryTime: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      paymentMethods: ['upi', 'card', 'netbanking', 'wallet']
    }
  };
  
  res.json({
    success: true,
    data: paymentOrder
  });
});

app.post('/api/v1/payments/verify', (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  
  // Mock payment verification - always success for testing
  res.json({
    success: true,
    data: {
      orderId,
      paymentId: paymentId || 'cf_payment_' + Date.now(),
      status: 'SUCCESS',
      amount: 1299,
      currency: 'INR',
      paymentTime: new Date().toISOString(),
      paymentMethod: 'upi',
      transactionId: 'TXN_' + Date.now()
    }
  });
});

// Mock Cashfree webhook endpoint
app.post('/api/v1/payments/webhook/cashfree', (req, res) => {
  const { type, data } = req.body;
  
  console.log('Cashfree webhook received:', { type, data });
  
  // Always return 200 for webhook
  res.status(200).json({ success: true });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: 'Internal server error'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🐝 SINGGLEBEE Mock API Server running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Environment: development`);
});
