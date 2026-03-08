import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import PaymentSession from "@/lib/db/models/PaymentSession";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/checkout/status/[id]
 * Check status of a checkout session or order.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await auth();
        if (!session?.user) {
            return apiError("Authentication required", 401);
        }

        const userId = (session.user as Record<string, unknown>).id as string;
        const { id } = params;

        await dbConnect();

        // 1. Check if it's already a completed Order
        const order = await Order.findOne({
            $or: [
                { orderId: id },
                { stripeSessionId: id },
                { stripePaymentIntentId: id }
            ],
            user: userId
        }).lean();

        if (order) {
            return apiSuccess({
                status: "completed",
                type: "order",
                orderId: order.orderId,
                paymentStatus: order.paymentStatus
            });
        }

        // 2. Check if it's a PaymentSession
        const paymentSession = await PaymentSession.findOne({
            $or: [
                { sessionId: id },
                { gateway: "stripe" } // Stripe metadata search might be complex, sessionId is best
            ],
            user: userId
        }).lean();

        if (paymentSession) {
            return apiSuccess({
                status: paymentSession.status,
                type: "session",
                orderCreated: paymentSession.orderCreated,
                expiresAt: paymentSession.expiresAt
            });
        }

        return apiError("Checkout session not found", 404);
    } catch (error) {
        return handleApiError(error);
    }
}
