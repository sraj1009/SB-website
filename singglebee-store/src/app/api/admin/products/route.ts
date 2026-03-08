import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Stock from "@/lib/db/models/Stock";
import { auth } from "@/lib/auth/config";
import { productCreateSchema, productUpdateSchema } from "@/lib/validators/product";
import { sanitize } from "@/lib/utils/sanitize";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";
import { invalidateCache } from "@/lib/utils/cache";

/**
 * Verify admin access
 */
async function verifyAdmin() {
    const session = await auth();
    if (!session?.user) return null;
    if ((session.user as Record<string, unknown>).role !== "admin") return null;
    return session;
}

/**
 * GET /api/admin/products
 * Admin: List ALL products (including inactive).
 */
export async function GET(req: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return apiError("Admin access required", 403);
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
        const skip = (page - 1) * limit;

        const [products, total] = await Promise.all([
            Product.find()
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Product.countDocuments(),
        ]);

        // Fetch stock info
        const productIds = products.map((p) => p._id);
        const stocks = await Stock.find({ product: { $in: productIds } }).lean();
        const stockMap = new Map(stocks.map((s) => [s.product.toString(), s]));

        const productsWithStock = products.map((p) => ({
            ...p,
            stock: stockMap.get(p._id.toString()) || null,
        }));

        return apiSuccess({
            products: productsWithStock,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * POST /api/admin/products
 * Admin: Create a new product with initial stock.
 */
export async function POST(req: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return apiError("Admin access required", 403);
        }

        await dbConnect();

        const body = await req.json();
        const sanitizedBody = sanitize(body);
        const validated = productCreateSchema.parse(sanitizedBody);

        // Check for duplicate SKU
        const existingProduct = await Product.findOne({ sku: validated.sku });
        if (existingProduct) {
            return apiError("A product with this SKU already exists", 409);
        }

        const product = await Product.create(validated);

        // Create initial stock entry
        await Stock.create({
            product: product._id,
            quantity: (sanitizedBody as Record<string, unknown>).initialStock
                ? Number((sanitizedBody as Record<string, unknown>).initialStock)
                : 0,
            lowStockThreshold: (sanitizedBody as Record<string, unknown>).lowStockThreshold
                ? Number((sanitizedBody as Record<string, unknown>).lowStockThreshold)
                : 10,
        });

        // Invalidate products cache
        await invalidateCache("products:*");

        return apiSuccess(product, 201);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * PUT /api/admin/products
 * Admin: Update a product.
 */
export async function PUT(req: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return apiError("Admin access required", 403);
        }

        await dbConnect();

        const body = await req.json();
        const sanitizedBody = sanitize(body) as Record<string, unknown>;
        const productId = sanitizedBody.id as string;

        if (!productId) {
            return apiError("Product ID is required", 400);
        }

        const validated = productUpdateSchema.parse(sanitizedBody);
        const product = await Product.findByIdAndUpdate(
            productId,
            { $set: validated },
            { new: true, runValidators: true }
        );

        if (!product) {
            return apiError("Product not found", 404);
        }

        // Invalidate products cache
        await invalidateCache("products:*");

        return apiSuccess(product);
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * DELETE /api/admin/products
 * Admin: Soft-delete a product (set isActive = false).
 */
export async function DELETE(req: NextRequest) {
    try {
        if (!(await verifyAdmin())) {
            return apiError("Admin access required", 403);
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const productId = searchParams.get("id");

        if (!productId) {
            return apiError("Product ID is required", 400);
        }

        const product = await Product.findById(productId);

        if (!product) {
            return apiError("Product not found", 404);
        }

        // Hard delete if specifically requested, otherwise soft delete
        const hardDelete = searchParams.get("hard") === "true";
        if (hardDelete) {
            await Promise.all([
                product.deleteOne(),
                Stock.deleteOne({ product: productId })
            ]);
            // Invalidate products cache
            await invalidateCache("products:*");
            return apiSuccess({ message: "Product and stock deleted permanently" });
        }

        product.isActive = false;
        await product.save();

        // Invalidate products cache
        await invalidateCache("products:*");

        return apiSuccess({ message: "Product deactivated successfully" });
    } catch (error) {
        return handleApiError(error);
    }
}
