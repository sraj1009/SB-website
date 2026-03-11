import express from 'express';

const router = express.Router();

// Mock products data for development
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
    reviews: 128
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
    reviews: 89
  }
];

// Get all products
router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        products: mockProducts,
        pagination: {
          page: 1,
          limit: 10,
          total: mockProducts.length,
          pages: 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error.message
      }
    });
  }
});

export default router;
