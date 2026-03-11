// In-memory product controller for development without MongoDB
import logger from '../utils/logger.js';

// Mock products data
const mockProducts = [
  {
    _id: '1',
    title: 'Premium Honey Collection',
    author: 'SINGGLEBEE',
    price: 599,
    category: 'Honey',
    description: 'Pure organic honey from the Himalayan region',
    images: ['honey1.jpg'],
    stockQuantity: 50,
    rating: 4.5,
    reviews: 128,
    discount: 0,
    name: 'Premium Honey Collection'
  },
  {
    _id: '2',
    title: 'Educational Book Set',
    author: 'SINGGLEBEE',
    price: 1299,
    category: 'Books',
    description: 'Complete learning collection for children',
    images: ['books1.jpg'],
    stockQuantity: 30,
    rating: 4.8,
    reviews: 89,
    discount: 0,
    name: 'Educational Book Set'
  },
  {
    _id: '3',
    title: 'Stationery Premium Pack',
    author: 'SINGGLEBEE',
    price: 399,
    category: 'Stationeries',
    description: 'Complete stationery set for students',
    images: ['stationery1.jpg'],
    stockQuantity: 100,
    rating: 4.3,
    reviews: 67,
    discount: 0,
    name: 'Stationery Premium Pack'
  }
];

// Get all products
export const getProducts = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, category, search } = req.query;
    let filteredProducts = [...mockProducts];
    
    if (category) {
      filteredProducts = filteredProducts.filter(p => p.category.toLowerCase() === category.toLowerCase());
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
  } catch (error) {
    logger.error(`Get Products Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch products'
      }
    });
  }
};

// Get single product
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = mockProducts.find(p => p._id === id);
    
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
  } catch (error) {
    logger.error(`Get Product Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to fetch product'
      }
    });
  }
};

// Create product (admin only)
export const createProduct = async (req, res, next) => {
  try {
    const productData = req.body;
    const newProduct = {
      _id: Date.now().toString(),
      ...productData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    mockProducts.push(newProduct);
    
    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (error) {
    logger.error(`Create Product Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to create product'
      }
    });
  }
};

// Update product (admin only)
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const productIndex = mockProducts.findIndex(p => p._id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    mockProducts[productIndex] = {
      ...mockProducts[productIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      success: true,
      data: mockProducts[productIndex]
    });
  } catch (error) {
    logger.error(`Update Product Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to update product'
      }
    });
  }
};

// Delete product (admin only)
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const productIndex = mockProducts.findIndex(p => p._id === id);
    
    if (productIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Product not found'
        }
      });
    }
    
    mockProducts.splice(productIndex, 1);
    
    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    logger.error(`Delete Product Error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to delete product'
      }
    });
  }
};

export default {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
};
