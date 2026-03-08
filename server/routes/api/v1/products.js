import express from 'express';
import {
    getProducts,
    getProduct,
    createProduct,
    updateProduct,
    adjustStock,
    deleteProduct
} from '../../../controllers/productController.js';
import { authenticate } from '../../../middleware/auth.js';
import isAdmin from '../../../middleware/admin.js';
import validate from '../../../middleware/validate.js';
import {
    createProductSchema,
    updateProductSchema,
    adjustStockSchema,
    productQuerySchema
} from '../../../validators/productValidators.js';
import { cacheMiddleware, clearCache } from '../../../middleware/cacheMiddleware.js';

const router = express.Router();

// Cache products for 5 minutes
const productCache = cacheMiddleware(300);

/**
 * @route   GET /api/v1/products
 * @desc    Get all products (with pagination, filtering, search)
 * @access  Public
 */
router.get('/', productCache, validate(productQuerySchema, 'query'), getProducts);

/**
 * @route   GET /api/v1/products/:id
 * @desc    Get single product by ID
 * @access  Public
 */
router.get('/:id', productCache, getProduct);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Admin
 */
router.post('/', authenticate, isAdmin, validate(createProductSchema), createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/:id', authenticate, isAdmin, validate(updateProductSchema), updateProduct);

/**
 * @route   PATCH /api/v1/products/:id/stock
 * @desc    Adjust product stock (+/-)
 * @access  Admin
 */
router.patch('/:id/stock', authenticate, isAdmin, validate(adjustStockSchema), adjustStock);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product (soft delete)
 * @access  Admin
 */
router.delete('/:id', authenticate, isAdmin, deleteProduct);

export default router;
