import mongoose, { Schema, Model, Document, ClientSession } from "mongoose";
import Counter from "./Counter";
import Stock from "./Stock";
import type { IOrder, IOrderItem, IAddress, IStatusHistoryEntry } from "@/types";

// ─── Sub-Schemas ───────────────────────────────────────
const OrderItemSchema = new Schema<IOrderItem>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        name: { type: String, required: true },
        price: { type: Number, required: true, min: 0 },
        quantity: { type: Number, required: true, min: 1 },
        image: { type: String },
    },
    { _id: false }
);

const StatusHistorySchema = new Schema<IStatusHistoryEntry>(
    {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
    },
    { _id: false }
);

const ShippingAddressSchema = new Schema<IAddress>(
    {
        fullName: { type: String, required: true, trim: true },
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
    },
    { _id: false }
);

// ─── Order Document Interface ──────────────────────────
export interface IOrderDocument extends Omit<IOrder, "_id">, Document { }

// ─── Order Schema ──────────────────────────────────────
const OrderSchema = new Schema<IOrderDocument>(
    {
        orderId: {
            type: String,
            unique: true,
            index: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        items: {
            type: [OrderItemSchema],
            required: true,
            validate: {
                validator: (v: IOrderItem[]) => v.length > 0,
                message: "Order must contain at least one item",
            },
        },
        subtotal: { type: Number, required: true, min: 0 },
        tax: { type: Number, required: true, min: 0, default: 0 },
        shippingCost: { type: Number, required: true, min: 0, default: 0 },
        totalAmount: { type: Number, required: true, min: 0 },
        status: {
            type: String,
            enum: [
                "pending",
                "paid",
                "processing",
                "shipped",
                "delivered",
                "cancelled",
                "refunded",
            ],
            default: "pending",
            index: true,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
        },
        deliveryStatus: { // Alias for status
            type: String,
            default: "pending",
        },
        stripeSessionId: { type: String, index: true },
        stripePaymentIntentId: { type: String },
        shippingAddress: {
            type: ShippingAddressSchema,
            required: true,
        },
        statusHistory: {
            type: [StatusHistorySchema],
            default: [],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ───────────────────────────────────────────
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ stripeSessionId: 1 });

// ─── Order ID format helper ────────────────────────────
function formatOrderId(seq: number): string {
    return `ORD-${String(seq).padStart(6, "0")}`;
}

// ─── Static: Create order with transaction ─────────────
interface CreateOrderInput {
    userId: string;
    items: Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
        image?: string;
    }>;
    shippingAddress: IAddress;
    tax?: number;
    shippingCost?: number;
}

OrderSchema.statics.createOrderWithTransaction = async function (
    input: CreateOrderInput
): Promise<IOrderDocument> {
    const session: ClientSession = await mongoose.startSession();

    try {
        let order: IOrderDocument | null = null;

        await session.withTransaction(async () => {
            // 1. Generate sequential order ID
            const seq = await Counter.getNextSequence("order");
            const orderId = formatOrderId(seq);

            // 2. Verify and reserve stock for each item (atomic)
            for (const item of input.items) {
                const stockUpdate = await Stock.findOneAndUpdate(
                    {
                        product: new mongoose.Types.ObjectId(item.productId),
                        // Only succeed if enough stock is available
                        $expr: {
                            $gte: [
                                { $subtract: ["$quantity", "$reservedQuantity"] },
                                item.quantity,
                            ],
                        },
                    },
                    {
                        $inc: {
                            reservedQuantity: item.quantity,
                        },
                    },
                    { new: true, session }
                );

                if (!stockUpdate) {
                    throw new Error(
                        `Insufficient stock for product: ${item.name}. Please reduce quantity or remove from cart.`
                    );
                }
            }

            // 3. Calculate totals
            const subtotal = input.items.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
            );
            const tax = input.tax ?? Math.round(subtotal * 0.18); // 18% GST default
            const shippingCost = input.shippingCost ?? 0;
            const totalAmount = subtotal + tax + shippingCost;

            // 4. Create order document
            const [createdOrder] = await this.create(
                [
                    {
                        orderId,
                        user: new mongoose.Types.ObjectId(input.userId),
                        items: input.items.map((item) => ({
                            product: new mongoose.Types.ObjectId(item.productId),
                            name: item.name,
                            price: item.price,
                            quantity: item.quantity,
                            image: item.image,
                        })),
                        subtotal,
                        tax,
                        shippingCost,
                        totalAmount,
                        status: "pending",
                        paymentStatus: "pending",
                        shippingAddress: input.shippingAddress,
                        statusHistory: [
                            {
                                status: "pending",
                                timestamp: new Date(),
                                note: "Order created, awaiting payment",
                            },
                        ],
                    },
                ],
                { session }
            );

            order = createdOrder;
        });

        return order!;
    } finally {
        await session.endSession();
    }
};

/**
 * Static: Confirm payment — deduct reserved stock after successful payment
 */
OrderSchema.statics.confirmPayment = async function (
    orderId: string,
    stripePaymentIntentId: string
): Promise<IOrderDocument | null> {
    const session = await mongoose.startSession();

    try {
        let updatedOrder: IOrderDocument | null = null;

        await session.withTransaction(async () => {
            const order = await this.findOne({ orderId }).session(session);
            if (!order || order.paymentStatus === "completed") return;

            // Deduct reserved quantity from actual stock
            for (const item of order.items) {
                await Stock.findOneAndUpdate(
                    { product: item.product },
                    {
                        $inc: {
                            quantity: -item.quantity,
                            reservedQuantity: -item.quantity,
                        },
                    },
                    { session }
                );
            }

            // Update order status
            order.status = "paid";
            order.paymentStatus = "completed";
            order.stripePaymentIntentId = stripePaymentIntentId;
            order.statusHistory.push({
                status: "paid",
                timestamp: new Date(),
                note: "Payment confirmed via Stripe",
            });

            await order.save({ session });
            updatedOrder = order;
        });

        return updatedOrder;
    } finally {
        await session.endSession();
    }
};

/**
 * Static: Cancel order — release reserved stock
 */
OrderSchema.statics.cancelOrder = async function (
    orderId: string,
    reason: string = "Order cancelled"
): Promise<IOrderDocument | null> {
    const session = await mongoose.startSession();

    try {
        let updatedOrder: IOrderDocument | null = null;

        await session.withTransaction(async () => {
            const order = await this.findOne({ orderId }).session(session);
            if (!order || order.status === "cancelled") return;

            // Release reserved stock
            if (order.paymentStatus !== "completed") {
                for (const item of order.items) {
                    await Stock.findOneAndUpdate(
                        { product: item.product },
                        { $inc: { reservedQuantity: -item.quantity } },
                        { session }
                    );
                }
            }

            order.status = "cancelled";
            order.statusHistory.push({
                status: "cancelled",
                timestamp: new Date(),
                note: reason,
            });

            await order.save({ session });
            updatedOrder = order;
        });

        return updatedOrder;
    } finally {
        await session.endSession();
    }
};

export interface OrderModel extends Model<IOrderDocument> {
    createOrderWithTransaction(input: CreateOrderInput): Promise<IOrderDocument>;
    confirmPayment(
        orderId: string,
        stripePaymentIntentId: string
    ): Promise<IOrderDocument | null>;
    cancelOrder(
        orderId: string,
        reason?: string
    ): Promise<IOrderDocument | null>;
}

const Order: OrderModel =
    (mongoose.models.Order as OrderModel) ||
    mongoose.model<IOrderDocument, OrderModel>("Order", OrderSchema);

export default Order;
