import express from 'express';
import {
  getAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../../../controllers/addressController.js';
import { authenticate } from '../../../middleware/auth.js';
import validate from '../../../middleware/validate.js';
import Joi from 'joi';

const router = express.Router();

// All address routes require authentication
router.use(authenticate);

// Address validation schema
const addressSchema = Joi.object({
  label: Joi.string().trim().max(50).optional(),
  fullName: Joi.string().trim().required(),
  phone: Joi.string()
    .pattern(/^[0-9]{10}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone must be 10 digits',
    }),
  street: Joi.string().trim().required(),
  landmark: Joi.string().trim().optional(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  zipCode: Joi.string()
    .pattern(/^[0-9]{6}$/)
    .required()
    .messages({
      'string.pattern.base': 'ZIP code must be 6 digits',
    }),
  country: Joi.string().trim().default('India'),
  isDefault: Joi.boolean().optional(),
});

const updateAddressSchema = addressSchema.fork(
  ['fullName', 'phone', 'street', 'city', 'state', 'zipCode'],
  (schema) => schema.optional()
);

/**
 * @route   GET /api/v1/addresses
 * @desc    Get user's addresses
 * @access  Private
 */
router.get('/', getAddresses);

/**
 * @route   POST /api/v1/addresses
 * @desc    Add new address
 * @access  Private
 */
router.post('/', validate(addressSchema), addAddress);

/**
 * @route   PUT /api/v1/addresses/:addressId
 * @desc    Update address
 * @access  Private
 */
router.put('/:addressId', validate(updateAddressSchema), updateAddress);

/**
 * @route   DELETE /api/v1/addresses/:addressId
 * @desc    Delete address
 * @access  Private
 */
router.delete('/:addressId', deleteAddress);

/**
 * @route   PATCH /api/v1/addresses/:addressId/default
 * @desc    Set address as default
 * @access  Private
 */
router.patch('/:addressId/default', setDefaultAddress);

export default router;
