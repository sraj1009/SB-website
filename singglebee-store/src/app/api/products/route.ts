import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Product from "@/lib/db/models/Product";
import Stock from "@/lib/db/models/Stock";
import { sanitize, escapeRegex } from "@/lib/utils/sanitize";
import { apiSuccess, handleApiError } from "@/lib/utils/errors";
import { withCache } from "@/lib/utils/cache";

/**
 * GET /api/products
 * Public endpoint — list active products with filtering, pagination, and search.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        // Generate a cache key based on query parameters
        const cacheKey = `products:${searchParams.toString() || 'default'}`;

        return await withCache(cacheKey, 600, async () => {
            await dbConnect();

            const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
            const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "12")));
            const category = searchParams.get("category");
            const search = searchParams.get("search");
            const sort = searchParams.get("sort") || "createdAt";
            const order = searchParams.get("order") === "asc" ? 1 : -1;
            const minPrice = searchParams.get("minPrice");
            const maxPrice = searchParams.get("maxPrice");

            // Build query — only active products for public endpoint
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: Record<string, any> = { isActive: true };

            if (category) {
                query.category = sanitize(category);
            }

            if (search) {
                const escaped = escapeRegex(sanitize(search) as string);
                query.$or = [
                    { name: { $regex: escaped, $options: "i" } },
                    { description: { $regex: escaped, $options: "i" } },
                    { tags: { $regex: escaped, $options: "i" } },
                ];
            }

            if (minPrice || maxPrice) {
                query.price = {};
                if (minPrice) query.price.$gte = parseInt(minPrice);
                if (maxPrice) query.price.$lte = parseInt(maxPrice);
            }

            const skip = (page - 1) * limit;

            const [products, total] = await Promise.all([
                Product.find(query)
                    .sort({ [sort]: order })
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Product.countDocuments(query),
            ]);

            // Fetch stock for each product
            const productIds = products.map((p) => p._id);
            const stocks = await Stock.find({ product: { $in: productIds } }).lean();
            const stockMap = new Map(
                stocks.map((s) => [s.product.toString(), s])
            );

            const productsWithStock = products.map((p) => {
                const stockItem = stockMap.get(p._id.toString());

                // Prioritize joined Stock model, fallback to embedded stock number
                const qty = stockItem?.quantity ?? p.stockQuantity ?? p.stock ?? 0;
                const reserved = stockItem?.reservedQuantity ?? 0;
                const available = qty - reserved;

                return {
                    ...p,
                    stock: {
                        quantity: qty,
                        available: available,
                        isLowStock: available <= (stockItem?.lowStockThreshold ?? 10),
                    },
                    stockQuantity: available, // Legacy sync
                };
            });

            return apiSuccess({
                products: productsWithStock,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasMore: page * limit < total,
                },
            });
        });
    } catch (error) {
        return handleApiError(error);
    }
}
