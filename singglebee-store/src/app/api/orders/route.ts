import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/orders
 * Get orders for the authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return apiError("Authentication required", 401);
        }

        await dbConnect();

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
        const skip = (page - 1) * limit;

        const userId = (session.user as Record<string, unknown>).id as string;

        const [orders, total] = await Promise.all([
            Order.find({ user: userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments({ user: userId }),
        ]);

        return apiSuccess({
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        return handleApiError(error);
    }
}
