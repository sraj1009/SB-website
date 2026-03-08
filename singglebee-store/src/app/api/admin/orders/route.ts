import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import { auth } from "@/lib/auth/config";
import { orderStatusUpdateSchema } from "@/lib/validators/order";
import { sanitize } from "@/lib/utils/sanitize";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/admin/orders
 * Admin: List all orders with filtering.
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
        const status = searchParams.get("status");
        const skip = (page - 1) * limit;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: Record<string, any> = {};
        if (status) query.status = sanitize(status);

        const [orders, total] = await Promise.all([
            Order.find(query)
                .populate("user", "name email")
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Order.countDocuments(query),
        ]);

        return apiSuccess({
            orders,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch (error) {
        return handleApiError(error);
    }
}

/**
 * PUT /api/admin/orders
 * Admin: Update order status.
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
        const validated = orderStatusUpdateSchema.parse(sanitizedBody);

        if (validated.status === "cancelled") {
            const order = await Order.cancelOrder(validated.orderId, validated.note);
            if (!order) return apiError("Order not found or already cancelled", 404);
            return apiSuccess(order);
        }

        const order = await Order.findOne({ orderId: validated.orderId });
        if (!order) return apiError("Order not found", 404);

        order.status = validated.status;
        order.statusHistory.push({
            status: validated.status,
            timestamp: new Date(),
            note: validated.note || `Status updated to ${validated.status}`,
        });

        await order.save();
        return apiSuccess(order);
    } catch (error) {
        return handleApiError(error);
    }
}
