import mongoose, { Schema, Model, Document } from "mongoose";
import slugify from "slugify";
import type { IProduct } from "@/types";

export interface IProductDocument extends Omit<IProduct, "_id">, Document { }

const ProductSchema = new Schema<IProductDocument>(
    {
        name: {
            type: String,
            required: [true, "Product name is required"],
            trim: true,
            maxlength: [200, "Product name cannot exceed 200 characters"],
        },
        title: { type: String }, // Legacy alias
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            index: true,
        },
        description: {
            type: String,
            required: [true, "Product description is required"],
            maxlength: [5000, "Description cannot exceed 5000 characters"],
        },
        price: {
            type: Number,
            required: [true, "Price is required"],
            min: [0, "Price cannot be negative"],
        },
        compareAtPrice: {
            type: Number,
            min: [0, "Compare-at price cannot be negative"],
        },
        images: {
            type: [String],
            default: [],
            validate: {
                validator: (v: string[]) => v.length <= 10,
                message: "Cannot have more than 10 images",
            },
        },
        category: {
            type: String,
            required: [true, "Category is required"],
            trim: true,
            index: true,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        isBestseller: {
            type: Boolean,
            default: false,
            index: true,
        },
        pages: {
            type: Number,
            min: [0, "Pages cannot be negative"],
        },
        language: {
            type: String,
            trim: true,
        },
        format: {
            type: String,
            trim: true,
        },
        stock: {
            type: Number,
            required: [true, "Stock is required"],
            min: [0, "Stock cannot be negative"],
            default: 0,
        },
        stockQuantity: { type: Number }, // Legacy alias
        sku: {
            type: String,
            required: [true, "SKU is required"],
            unique: true,
            uppercase: true,
            trim: true,
        },
        rating: { type: Number, default: 0 },
        reviewCount: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ─── Indexes ───────────────────────────────────────────
ProductSchema.index({ name: "text", description: "text", tags: "text" });
ProductSchema.index({ category: 1, isActive: 1 });
ProductSchema.index({ price: 1 });

// ─── Pre-save: Sync aliases and auto-generate slug ───
// eslint-disable-next-line @typescript-eslint/no-explicit-any
ProductSchema.pre("save", async function (this: any) {
    // Sync name/title
    if (this.name && !this.title) this.title = this.name;
    if (this.title && !this.name) this.name = this.title;

    // Sync stock/stockQuantity
    if (this.stock !== undefined) this.stockQuantity = this.stock;
    if (this.stockQuantity !== undefined && this.stock === undefined) this.stock = this.stockQuantity;

    let nameSlug = slugify(this.name, { lower: true, strict: true });

    // If title-based slug is problematic (short, numeric, empty), use SKU
    if (!nameSlug || nameSlug.length < 3 || /^\d+$/.test(nameSlug)) {
        this.slug = slugify(this.sku, { lower: true });
    } else {
        this.slug = nameSlug;
    }
});

// ─── Virtual: formatted price ──────────────────────────
ProductSchema.virtual("formattedPrice").get(function () {
    return `₹${(this.price / 100).toFixed(2)}`;
});

const Product: Model<IProductDocument> =
    mongoose.models.Product ||
    mongoose.model<IProductDocument>("Product", ProductSchema);

export default Product;
