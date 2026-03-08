import mongoose, { Document, Model, Schema } from "mongoose";

export interface ICoupon {
    code: string;
    discountType: "percentage" | "fixed";
    discountAmount: number;
    minOrderAmount: number;
    maxDiscountAmount?: number;
    expiryDate: Date;
    usageLimit: number;
    usageCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface ICouponDocument extends ICoupon, Document { }

const couponSchema = new Schema<ICouponDocument>(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            index: true,
        },
        discountType: {
            type: String,
            enum: ["percentage", "fixed"],
            required: true,
        },
        discountAmount: {
            type: Number,
            required: true,
        },
        minOrderAmount: {
            type: Number,
            default: 0,
        },
        maxDiscountAmount: {
            type: Number,
        },
        expiryDate: {
            type: Date,
            required: true,
        },
        usageLimit: {
            type: Number,
            default: 100,
        },
        usageCount: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

const Coupon: Model<ICouponDocument> =
    mongoose.models.Coupon ||
    mongoose.model<ICouponDocument>("Coupon", couponSchema);

export default Coupon;
