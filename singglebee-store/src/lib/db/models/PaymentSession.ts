/**
 * PaymentSession model - tracks temporary checkout state.
 */
import mongoose, { Document, Model, Schema } from "mongoose";

export interface IPaymentSession {
    sessionId: string;
    user: mongoose.Types.ObjectId;
    items: {
        product: mongoose.Types.ObjectId;
        name: string;
        price: number;
        quantity: number;
        image?: string;
    }[];
    shippingAddress: {
        fullName: string;
        phone: string;
        email: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postalCode: string;
        country: string;
    };
    pricing: {
        subtotal: number;
        shippingFee: number;
        tax: number;
        totalAmount: number;
    };
    gateway: "stripe" | "cashfree" | "upi_manual";
    status: "pending" | "completed" | "failed" | "expired";
    orderCreated: boolean;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface IPaymentSessionDocument extends IPaymentSession, Document { }

const paymentSessionSchema = new Schema<IPaymentSessionDocument>(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        items: [
            {
                product: {
                    type: Schema.Types.ObjectId,
                    ref: "Product",
                    required: true,
                },
                name: { type: String, required: true },
                price: { type: Number, required: true },
                quantity: { type: Number, required: true },
                image: String,
            },
        ],
        shippingAddress: {
            fullName: { type: String, required: true },
            phone: { type: String, required: true },
            email: { type: String, required: true },
            line1: { type: String, required: true },
            line2: String,
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
        },
        pricing: {
            subtotal: { type: Number, required: true },
            shippingFee: { type: Number, required: true },
            tax: { type: Number, required: true },
            totalAmount: { type: Number, required: true },
        },
        gateway: {
            type: String,
            enum: ["stripe", "cashfree", "upi_manual"],
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "completed", "failed", "expired"],
            default: "pending",
        },
        orderCreated: {
            type: Boolean,
            default: false,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: { expires: 0 }, // TTL index
        },
    },
    {
        timestamps: true,
    }
);

const PaymentSession: Model<IPaymentSessionDocument> =
    mongoose.models.PaymentSession ||
    mongoose.model<IPaymentSessionDocument>("PaymentSession", paymentSessionSchema);

export default PaymentSession;
