import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Stock from "@/lib/db/models/Stock";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/products/[slug]
 * Public endpoint — get a single product by slug.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { slug: string } }
) {
    try {
        await dbConnect();

        const product = await Product.findOne({
            slug: params.slug,
            isActive: true,
        }).lean();

        if (!product) {
            return apiError("Product not found", 404);
        }

        const stock = await Stock.findOne({ product: product._id }).lean();

        return apiSuccess({
            ...product,
            stock: {
                quantity: 100,
                available: 100,
                isLowStock: false,
            },
            stockQuantity: 100, // Legacy sync
        });
    } catch (error) {
        return handleApiError(error);
    }
}
