const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const Product = require('../../models/Product');
const EthicalProduct = require('../../models/EthicalProduct');
const User = require('../../models/User');

// Rate limiting for public API
const publicApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all public API routes
router.use(publicApiLimiter);

// API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_API_KEY',
        message: 'API key is required'
      }
    });
  }
  
  // In production, validate against database
  const validApiKeys = process.env.PUBLIC_API_KEYS?.split(',') || ['demo-key-12345'];
  
  if (!validApiKeys.includes(apiKey)) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key'
      }
    });
  }
  
  req.apiKey = apiKey;
  next();
};

// Apply API key validation to protected routes
router.use('/products', validateApiKey);
router.use('/orders', validateApiKey);
router.use('/inventory', validateApiKey);

// Error handling middleware
router.use((err, req, res, next) => {
  console.error('Public API Error:', err);
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred'
    }
  });
});

/**
 * @route   GET /api/v2/public/health
 * @desc    Health check for public API
 * @access   Public
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      endpoints: {
        products: '/products',
        orders: '/orders',
        inventory: '/inventory',
        webhooks: '/webhooks'
      }
    }
  });
});

/**
 * @route   GET /api/v2/public/products
 * @desc    Get public product catalog
 * @access   API Key Required
 * @query   page, limit, category, search, sort, min_price, max_price
 */
router.get('/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      search,
      sort = 'created_at',
      order = 'desc',
      min_price,
      max_price,
      ethical_only = false,
      fair_trade = false,
      organic = false,
      local = false
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build query
    let query = { status: 'active' };
    
    if (category) {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    
    if (min_price || max_price) {
      query.price = {};
      if (min_price) query.price.$gte = parseFloat(min_price);
      if (max_price) query.price.$lte = parseFloat(max_price);
    }

    // Build sort
    let sortQuery = {};
    switch (sort) {
      case 'price':
        sortQuery = { price: order === 'desc' ? -1 : 1 };
        break;
      case 'popularity':
        sortQuery = { 'ratings.count': order === 'desc' ? -1 : 1 };
        break;
      case 'rating':
        sortQuery = { 'ratings.average': order === 'desc' ? -1 : 1 };
        break;
      case 'created_at':
      default:
        sortQuery = { createdAt: order === 'desc' ? -1 : 1 };
        break;
    }

    // If ethical filters are requested, use EthicalProduct model
    let products;
    let total;
    
    if (ethical_only === 'true' || fair_trade === 'true' || organic === 'true' || local === 'true') {
      let ethicalQuery = {};
      
      if (fair_trade === 'true') {
        ethicalQuery['ethicalSourcing.isFairTrade'] = true;
      }
      if (organic === 'true') {
        ethicalQuery['ethicalSourcing.isOrganic'] = true;
      }
      if (local === 'true') {
        ethicalQuery['ethicalSourcing.isLocal'] = true;
      }
      
      const ethicalProducts = await EthicalProduct.find(ethicalQuery)
        .populate('productId')
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum);
      
      total = await EthicalProduct.countDocuments(ethicalQuery);
      
      // Transform to product format
      products = ethicalProducts.map(ep => ({
        ...ep.productId.toObject(),
        ethicalSourcing: ep.ethicalSourcing,
        traceability: ep.traceability,
        sustainability: ep.sustainability,
        socialImpact: ep.socialImpact,
        ethicalScore: ep.ethicalScore,
        traceabilityScore: ep.traceabilityScore,
        sustainabilityScore: ep.sustainabilityScore
      }));
    } else {
      products = await Product.find(query)
        .select('title description price category images stockQuantity sku ratings tags weight dimensions createdAt')
        .sort(sortQuery)
        .skip(skip)
        .limit(limitNum);
      
      total = await Product.countDocuments(query);
    }

    // Format response
    const formattedProducts = products.map(product => ({
      id: product._id,
      sku: product.sku,
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      images: product.images,
      stockQuantity: product.stockQuantity,
      weight: product.weight,
      dimensions: product.dimensions,
      tags: product.tags,
      ratings: product.ratings,
      ethicalSourcing: product.ethicalSourcing,
      traceability: product.traceability,
      sustainability: product.sustainability,
      socialImpact: product.socialImpact,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    }));

    res.json({
      success: true,
      data: {
        products: formattedProducts,
        pagination: {
          current_page: pageNum,
          per_page: limitNum,
          total: total,
          total_pages: Math.ceil(total / limitNum),
          has_next: pageNum * limitNum < total,
          has_prev: pageNum > 1
        },
        filters: {
          category,
          search,
          sort,
          order,
          price_range: {
            min: min_price,
            max: max_price
          },
          ethical_filters: {
            ethical_only,
            fair_trade,
            organic,
            local
          }
        }
      },
      meta: {
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        api_version: '2.0.0'
      }
    });

  } catch (error) {
    console.error('Products API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCTS_FETCH_ERROR',
        message: 'Failed to fetch products'
      }
    });
  }
});

/**
 * @route   GET /api/v2/public/products/:id
 * @desc    Get single product details
 * @access   API Key Required
 */
router.get('/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    let product = await Product.findById(id)
      .select('title description price category images stockQuantity sku ratings tags weight dimensions createdAt updatedAt');
    
    // Check for ethical product data
    const ethicalProduct = await EthicalProduct.findOne({ productId: id });
    
    if (ethicalProduct) {
      product = {
        ...product.toObject(),
        ethicalSourcing: ethicalProduct.ethicalSourcing,
        traceability: ethicalProduct.traceability,
        sustainability: ethicalProduct.sustainability,
        socialImpact: ethicalProduct.socialImpact,
        ethicalScore: ethicalProduct.ethicalScore,
        traceabilityScore: ethicalProduct.traceabilityScore,
        sustainabilityScore: ethicalProduct.sustainabilityScore
      };
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    res.json({
      success: true,
      data: {
        product: {
          id: product._id,
          sku: product.sku,
          title: product.title,
          description: product.description,
          price: product.price,
          category: product.category,
          images: product.images,
          stockQuantity: product.stockQuantity,
          weight: product.weight,
          dimensions: product.dimensions,
          tags: product.tags,
          ratings: product.ratings,
          ethicalSourcing: product.ethicalSourcing,
          traceability: product.traceability,
          sustainability: product.sustainability,
          socialImpact: product.socialImpact,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }
      },
      meta: {
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        api_version: '2.0.0'
      }
    });

  } catch (error) {
    console.error('Product Details API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PRODUCT_DETAILS_ERROR',
        message: 'Failed to fetch product details'
      }
    });
  }
});

/**
 * @route   POST /api/v2/public/orders
 * @desc    Create order through partner
 * @access   API Key Required
 * @body    order_data
 */
router.post('/orders', async (req, res) => {
  try {
    const {
      partner_order_id,
      customer_info,
      items,
      shipping_address,
      payment_info,
      notes
    } = req.body;

    // Validate required fields
    if (!partner_order_id || !customer_info || !items || !shipping_address) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Missing required fields'
        }
      });
    }

    // Generate SINGGLEBEE order ID
    const orderId = `SB-PARTNER-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    // Calculate order totals
    let subtotal = 0;
    let totalWeight = 0;

    for (const item of items) {
      const product = await Product.findById(item.product_id);
      if (!product) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: `Product ${item.product_id} not found`
          }
        });
      }

      if (product.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for product ${product.title}`
          }
        });
      }

      subtotal += product.price * item.quantity;
      totalWeight += (product.weight || 0.5) * item.quantity;
    }

    const shipping = calculateShipping(shipping_address, totalWeight);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + shipping.cost + tax;

    // Create order record
    const Order = require('../../models/Order');
    const order = new Order({
      orderId,
      partnerOrderId: partner_order_id,
      customerInfo: customer_info,
      items: items.map(item => ({
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price || (await Product.findById(item.product_id)).price,
        subtotal: item.price * item.quantity
      })),
      shippingAddress,
      paymentInfo: {
        method: payment_info.method,
        status: 'pending',
        partner_transaction_id: payment_info.transaction_id
      },
      pricing: {
        subtotal,
        shipping: shipping.cost,
        tax,
        total,
        currency: 'INR'
      },
      status: 'pending',
      source: 'partner_api',
      partnerInfo: {
        api_key: req.apiKey,
        partner_name: req.headers['x-partner-name'] || 'Unknown',
        ip_address: req.ip
      },
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await order.save();

    // Update product stock
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { stockQuantity: -item.quantity } }
      );
    }

    // Send webhook notification (in production)
    // await sendWebhook('order_created', order);

    res.status(201).json({
      success: true,
      data: {
        order: {
          id: order._id,
          orderId: order.orderId,
          partnerOrderId: order.partnerOrderId,
          status: order.status,
          pricing: order.pricing,
          created_at: order.createdAt
        }
      },
      meta: {
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        api_version: '2.0.0'
      }
    });

  } catch (error) {
    console.error('Create Order API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'ORDER_CREATE_ERROR',
        message: 'Failed to create order'
      }
    });
  }
});

/**
 * @route   GET /api/v2/public/inventory
 * @desc    Get inventory levels for dropshipping partners
 * @access   API Key Required
 * @query   product_ids, category
 */
router.get('/inventory', async (req, res) => {
  try {
    const { product_ids, category } = req.query;
    
    let query = { status: 'active' };
    
    if (product_ids) {
      const ids = product_ids.split(',').map(id => id.trim());
      query._id = { $in: ids };
    }
    
    if (category) {
      query.category = category;
    }

    const products = await Product.find(query)
      .select('sku title price stockQuantity category weight dimensions')
      .sort({ stockQuantity: -1 });

    const inventory = products.map(product => ({
      product_id: product._id,
      sku: product.sku,
      title: product.title,
      price: product.price,
      category: product.category,
      stock_quantity: product.stockQuantity,
      weight: product.weight,
      dimensions: product.dimensions,
      availability: product.stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
      last_updated: product.updatedAt
    }));

    res.json({
      success: true,
      data: {
        inventory,
        summary: {
          total_products: inventory.length,
          in_stock: inventory.filter(item => item.availability === 'in_stock').length,
          out_of_stock: inventory.filter(item => item.availability === 'out_of_stock').length,
          total_value: inventory.reduce((sum, item) => sum + (item.price * item.stock_quantity), 0)
        }
      },
      meta: {
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        api_version: '2.0.0'
      }
    });

  } catch (error) {
    console.error('Inventory API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INVENTORY_FETCH_ERROR',
        message: 'Failed to fetch inventory'
      }
    });
  }
});

/**
 * @route   POST /api/v2/public/webhooks
 * @desc    Handle webhook callbacks from partners
 * @access   API Key Required
 */
router.post('/webhooks', async (req, res) => {
  try {
    const {
      event_type,
      event_data,
      signature,
      timestamp
    } = req.body;

    // Verify webhook signature (in production)
    // const isValidSignature = verifyWebhookSignature(signature, req.body, req.apiKey);
    // if (!isValidSignature) {
    //   return res.status(401).json({
    //     success: false,
    //     error: { code: 'INVALID_SIGNATURE', message: 'Invalid webhook signature' }
    //   });
    // }

    // Process webhook event
    switch (event_type) {
      case 'order_status_update':
        await handleOrderStatusUpdate(event_data);
        break;
      case 'payment_confirmation':
        await handlePaymentConfirmation(event_data);
        break;
      case 'inventory_update':
        await handleInventoryUpdate(event_data);
        break;
      default:
        console.warn('Unknown webhook event type:', event_type);
    }

    res.json({
      success: true,
      message: 'Webhook received successfully'
    });

  } catch (error) {
    console.error('Webhook Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Failed to process webhook'
      }
    });
  }
});

// Helper functions
function calculateShipping(address, weight) {
  // Simplified shipping calculation
  const baseCost = 40;
  const weightCost = Math.ceil(weight) * 10;
  const distanceCost = address.city === 'Chennai' ? 0 : 50;
  
  return {
    cost: baseCost + weightCost + distanceCost,
    method: 'standard',
    estimated_delivery: '3-5 business days'
  };
}

async function handleOrderStatusUpdate(data) {
  // Update order status in database
  console.log('Order status update:', data);
}

async function handlePaymentConfirmation(data) {
  // Confirm payment and update order status
  console.log('Payment confirmation:', data);
}

async function handleInventoryUpdate(data) {
  // Update inventory levels from partner
  console.log('Inventory update:', data);
}

module.exports = router;
