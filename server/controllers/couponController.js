import Coupon from '../models/Coupon.js';
import logger from '../utils/logger.js';

/**
 * @desc    Validate a coupon code
 * @route   POST /api/v1/coupons/validate
 * @access  Private
 */
export const validateCoupon = async (req, res, next) => {
    try {
        const { code, orderAmount } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: { message: 'Coupon code is required' }
            });
        }

        const coupon = await Coupon.findOne({
            code: code.toUpperCase(),
            isActive: true,
            expiryDate: { $gt: new Date() }
        });

        if (!coupon) {
            return res.status(404).json({
                success: false,
                error: { code: 'INVALID_COUPON', message: 'Invalid or expired coupon code' }
            });
        }

        // Check usage limit
        if (coupon.usageLimit > 0 && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({
                success: false,
                error: { code: 'USAGE_LIMIT_REACHED', message: 'Coupon usage limit has been reached' }
            });
        }

        // Check minimum order amount
        if (orderAmount < coupon.minOrderAmount) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'MIN_AMOUNT_NOT_MET',
                    message: `This coupon requires a minimum order of ₹${coupon.minOrderAmount}`
                }
            });
        }

        // Calculate discount
        let discount = 0;
        if (coupon.discountType === 'percentage') {
            discount = (orderAmount * coupon.discountAmount) / 100;
            if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                discount = coupon.maxDiscountAmount;
            }
        } else {
            discount = coupon.discountAmount;
        }

        res.json({
            success: true,
            data: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountAmount: coupon.discountAmount,
                calculatedDiscount: Math.round(discount),
                finalAmount: Math.max(0, Math.round(orderAmount - discount))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all coupons (Admin only)
 * @route   GET /api/v1/coupons
 * @access  Admin
 */
export const getCoupons = async (req, res, next) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json({ success: true, data: { coupons } });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Create a new coupon
 * @route   POST /api/v1/coupons
 * @access  Admin
 */
export const createCoupon = async (req, res, next) => {
    try {
        const coupon = await Coupon.create(req.body);
        logger.info(`Coupon created: ${coupon.code}`);
        res.status(201).json({ success: true, data: { coupon } });
    } catch (error) {
        next(error);
    }
};
