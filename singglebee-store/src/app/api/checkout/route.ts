import { NextRequest } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db/connect";
import PaymentSession from "@/lib/db/models/PaymentSession";
import stripe from "@/lib/stripe/client";
import { auth } from "@/lib/auth/config";
import { orderCreateSchema } from "@/lib/validators/order";
import { sanitize } from "@/lib/utils/sanitize";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * POST /api/checkout
 * Create an order with stock reservation and a Stripe checkout session.
 * Requires authentication.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return apiError("Authentication required", 401);
        }

        await dbConnect();

        const body = await req.json();
        const sanitizedBody = sanitize(body);
        const validated = orderCreateSchema.parse(sanitizedBody);

        const userId = (session.user as Record<string, unknown>).id as string;

        // Create a temporary Payment Session instead of an Order
        const paymentSessionDoc = await PaymentSession.create({
            sessionId: `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            user: new mongoose.Types.ObjectId(userId),
            items: validated.items.map(item => ({
                product: new mongoose.Types.ObjectId(item.productId),
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                image: item.image
            })),
            shippingAddress: validated.shippingAddress,
            pricing: {
                subtotal: validated.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
                shippingFee: validated.shippingCost ?? 0,
                tax: validated.tax ?? 0,
                totalAmount: (validated.items.reduce((sum, i) => sum + i.price * i.quantity, 0)) + (validated.tax ?? 0) + (validated.shippingCost ?? 0)
            },
            gateway: "stripe",
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        });

        // Create Stripe Checkout Session
        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer_email: session.user.email ?? undefined,
            metadata: {
                paymentSessionId: paymentSessionDoc.sessionId,
                userId: userId,
            },
            line_items: validated.items.map((item) => ({
                price_data: {
                    currency: "inr",
                    product_data: {
                        name: item.name,
                        images: item.image ? [item.image] : [],
                    },
                    unit_amount: item.price, // Already in paisa
                },
                quantity: item.quantity,
            })),
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}&sess_id=${paymentSessionDoc.sessionId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/cart?cancelled=true`,
        });

        return apiSuccess({
            sessionId: stripeSession.id,
            checkoutUrl: stripeSession.url,
        });
    } catch (error) {
        if (error instanceof Error && error.message.includes("Insufficient stock")) {
            return apiError(error.message, 409);
        }
        return handleApiError(error);
    }
}
