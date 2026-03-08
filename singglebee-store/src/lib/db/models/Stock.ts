import mongoose, { Schema, Model, Document } from "mongoose";
import type { IStock } from "@/types";

export interface IStockDocument extends Omit<IStock, "_id" | "availableQuantity">, Document {
    availableQuantity: number;
}

const StockSchema = new Schema<IStockDocument>(
    {
        product: {
            type: Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true,
            index: true,
        },
        quantity: {
            type: Number,
            required: [true, "Quantity is required"],
            min: [0, "Quantity cannot be negative"],
            default: 0,
        },
        reservedQuantity: {
            type: Number,
            default: 0,
            min: [0, "Reserved quantity cannot be negative"],
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: [0, "Threshold cannot be negative"],
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Virtual: Available Quantity ────────────────────────
StockSchema.virtual("availableQuantity").get(function () {
    return this.quantity - this.reservedQuantity;
});

// ─── Virtual: Is Low Stock ─────────────────────────────
StockSchema.virtual("isLowStock").get(function () {
    return this.quantity - this.reservedQuantity <= this.lowStockThreshold;
});

// ─── Indexes ───────────────────────────────────────────
StockSchema.index({ product: 1 }, { unique: true });
StockSchema.index({ quantity: 1, lowStockThreshold: 1 });

const Stock: Model<IStockDocument> =
    mongoose.models.Stock ||
    mongoose.model<IStockDocument>("Stock", StockSchema);

export default Stock;
