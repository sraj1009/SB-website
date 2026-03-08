import { Types } from "mongoose";

// ─── User Types ────────────────────────────────────────
export interface IAddress {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
}

export interface IUser {
    _id: Types.ObjectId;
    name: string;
    email: string;
    passwordHash?: string;
    role: "customer" | "admin";
    image?: string;
    emailVerified?: Date;
    verificationToken?: string;
    verificationTokenExpires?: Date;
    resetPasswordToken?: string;
    resetPasswordTokenExpires?: Date;
    addresses: IAddress[];
    createdAt: Date;
    updatedAt: Date;
}

// ─── Product Types ─────────────────────────────────────
export interface IProduct {
    _id: Types.ObjectId;
    name: string;
    slug: string;
    description: string;
    price: number; // stored in smallest currency unit (paisa/cents)
    compareAtPrice?: number;
    images: string[];
    category: string;
    tags: string[];
    isActive: boolean;
    isBestseller?: boolean;
    pages?: number;
    language?: string;
    format?: string;
    sku: string;
    title?: string; // Legacy alias for name
    stock?: number;
    stockQuantity?: number; // Legacy alias for stock
    rating?: number;
    reviewCount?: number;
    createdAt: Date;
    updatedAt: Date;
}

// ─── Stock Types ───────────────────────────────────────
export interface IStock {
    _id: Types.ObjectId;
    product: Types.ObjectId | IProduct;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    availableQuantity: number; // virtual
    createdAt: Date;
    updatedAt: Date;
}

// ─── Order Types ───────────────────────────────────────
export interface IOrderItem {
    product: Types.ObjectId | IProduct;
    name: string;
    price: number;
    quantity: number;
    image?: string;
}

export interface IStatusHistoryEntry {
    status: string;
    timestamp: Date;
    note?: string;
}

export type OrderStatus =
    | "pending"
    | "paid"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded";

export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";

export interface IOrder {
    _id: Types.ObjectId;
    orderId: string;
    user: Types.ObjectId | IUser;
    items: IOrderItem[];
    subtotal: number;
    tax: number;
    shippingCost: number;
    totalAmount: number;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    deliveryStatus?: string; // Alias for status
    stripeSessionId?: string;
    stripePaymentIntentId?: string;
    shippingAddress: IAddress;
    statusHistory: IStatusHistoryEntry[];
    createdAt: Date;
    updatedAt: Date;
}

// ─── Cart Types (Client-Side) ──────────────────────────
export interface CartItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    slug: string;
    maxQuantity: number;
}

export interface CartState {
    items: CartItem[];
    totalItems: number;
    totalPrice: number;
}

// ─── API Response Types ────────────────────────────────
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ─── Counter Types ─────────────────────────────────────
export interface ICounter {
    _id: string;
    seq: number;
}
