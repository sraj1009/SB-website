import express from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../../controllers/productController.js';
import { authenticate } from '../../../middleware/auth.js';
import isAdmin from '../../../middleware/admin.js';

const router = express.Router();

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', getProducts);

/**
 * @swagger
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get single product
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
router.get('/:id', getProduct);

/**
 * @route   POST /api/v1/products
 * @desc    Create new product
 * @access  Admin
 */
router.post('/', authenticate, isAdmin, createProduct);

/**
 * @route   PUT /api/v1/products/:id
 * @desc    Update product
 * @access  Admin
 */
router.put('/:id', authenticate, isAdmin, updateProduct);

/**
 * @route   DELETE /api/v1/products/:id
 * @desc    Delete product
 * @access  Admin
 */
router.delete('/:id', authenticate, isAdmin, deleteProduct);

export default router;
