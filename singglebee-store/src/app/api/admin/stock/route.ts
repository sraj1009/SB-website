import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Stock from "@/lib/db/models/Stock";
import { auth } from "@/lib/auth/config";
import { sanitize } from "@/lib/utils/sanitize";
import { z } from "zod";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

const stockUpdateSchema = z.object({
    productId: z.string().min(1, "Product ID is required"),
    quantity: z.number().int().min(0, "Quantity cannot be negative").optional(),
    lowStockThreshold: z.number().int().min(0).optional(),
});

/**
 * GET /api/admin/stock
 * Admin: List all stock entries with product info.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
            return apiError("Admin access required", 403);
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(100, parseInt(searchParams.get("limit") || "20"));
        const lowStockOnly = searchParams.get("lowStock") === "true";

        const skip = (page - 1) * limit;

        let query = Stock.find();
        if (lowStockOnly) {
            query = Stock.find({
                $expr: {
                    $lte: [
                        { $subtract: ["$quantity", "$reservedQuantity"] },
                        "$lowStockThreshold",
                    ],
                },
            });
        }

        const [stocks, total] = await Promise.all([
            query
                .populate("product", "name sku images isActive")
                .sort({ quantity: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            lowStockOnly
                ? Stock.countDocuments({
                    $expr: {
                        $lte: [
                            { $subtract: ["$quantity", "$reservedQuantity"] },
                            "$lowStockThreshold",
                        ],
                    },
                })
                : Stock.countDocuments(),
        ]);

        return apiSuccess({
            stocks,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * PUT /api/admin/stock
 * Admin: Update stock quantity for a product.
 */
export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user || (session.user as Record<string, unknown>).role !== "admin") {
            return apiError("Admin access required", 403);
        }

        await dbConnect();

        const body = await req.json();
        const sanitizedBody = sanitize(body);
        const validated = stockUpdateSchema.parse(sanitizedBody);

        const updateFields: Record<string, unknown> = {};
        if (validated.quantity !== undefined) updateFields.quantity = validated.quantity;
        if (validated.lowStockThreshold !== undefined)
            updateFields.lowStockThreshold = validated.lowStockThreshold;

        const stock = await Stock.findOneAndUpdate(
            { product: validated.productId },
            updateFields,
            { new: true, runValidators: true }
        ).populate("product", "name sku");

        if (!stock) {
            return apiError("Stock entry not found for this product", 404);
        }

        return apiSuccess(stock);
    } catch (error) {
        return handleApiError(error);
    }
}
