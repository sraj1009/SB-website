import { z } from "zod";

export const productCreateSchema = z.object({
    name: z
        .string()
        .min(1, "Product name is required")
        .max(200, "Name cannot exceed 200 characters")
        .trim(),
    description: z
        .string()
        .min(1, "Description is required")
        .max(5000, "Description cannot exceed 5000 characters")
        .trim(),
    price: z
        .number()
        .int("Price must be in smallest currency unit")
        .min(0, "Price cannot be negative"),
    compareAtPrice: z
        .number()
        .int()
        .min(0, "Compare-at price cannot be negative")
        .optional(),
    images: z
        .array(z.string().url("Each image must be a valid URL"))
        .max(10, "Maximum 10 images allowed")
        .default([]),
    category: z.string().min(1, "Category is required").trim(),
    tags: z.array(z.string().trim()).default([]),
    isActive: z.boolean().default(true),
    isBestseller: z.boolean().default(false),
    pages: z.number().int().min(0).optional(),
    language: z.string().trim().optional(),
    format: z.string().trim().optional(),
    sku: z
        .string()
        .min(1, "SKU is required")
        .max(50, "SKU cannot exceed 50 characters")
        .toUpperCase()
        .trim(),
});

export const productUpdateSchema = productCreateSchema.partial();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
