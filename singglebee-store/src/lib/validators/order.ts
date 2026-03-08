import { z } from "zod";

const addressSchema = z.object({
    fullName: z.string().min(1, "Full name is required").max(100).trim(),
    line1: z.string().min(1, "Address line 1 is required").max(200).trim(),
    line2: z.string().max(200).trim().optional(),
    city: z.string().min(1, "City is required").max(100).trim(),
    state: z.string().min(1, "State is required").max(100).trim(),
    postalCode: z.string().min(1, "Postal code is required").max(20).trim(),
    country: z.string().min(1, "Country is required").max(100).trim(),
    phone: z
        .string()
        .min(1, "Phone is required")
        .max(20)
        .regex(/^[+\d\s()-]+$/, "Invalid phone number format")
        .trim(),
});

const orderItemSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    name: z.string().min(1),
    price: z.number().int().min(0),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),
    image: z.string().optional(),
});

export const orderCreateSchema = z.object({
    items: z
        .array(orderItemSchema)
        .min(1, "At least one item is required")
        .max(50, "Maximum 50 items per order"),
    shippingAddress: addressSchema,
    tax: z.number().int().min(0).optional(),
    shippingCost: z.number().int().min(0).optional(),
});

export const orderStatusUpdateSchema = z.object({
    orderId: z.string().min(1, "Order ID is required"),
    status: z.enum([
        "pending",
        "paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
    ]),
    note: z.string().max(500).optional(),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
