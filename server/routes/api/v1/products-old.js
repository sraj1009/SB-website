import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../../controllers/productController-memory.js';
import { authenticate } from '../../../middleware/auth.js';
import isAdmin from '../../../middleware/admin.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: {type: string}
 *       - in: query
 *         name: search
 *         schema: {type: string}
 *       - in: query
 *         name: page
 *         schema: {type: integer, default: 1}
 *       - in: query
 *         name: limit
 *         schema: {type: integer, default: 12}
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', productCache, validate(productQuerySchema, 'query'), getProducts);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 */
router.get('/:id', productCache, getProduct);

/**
 * @swagger
 * /api/v1/products/{id}/related:
 *   get:
 *     summary: Get related products
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: {type: string}
 *     responses:
 *       200:
 *         description: List of related products
 */
router.get('/:id/related', productCache, getRelatedProducts);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Admin
 */
router.post('/', authenticate, isAdmin, upload.single('image'), validate(createProductSchema), createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/:id', authenticate, isAdmin, upload.single('image'), validate(updateProductSchema), updateProduct);

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
