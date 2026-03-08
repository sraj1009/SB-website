import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import PaymentSession from "@/lib/db/models/PaymentSession";
import stripe from "@/lib/stripe/client";

/**
 * POST /api/webhooks/stripe
 * Stripe webhook handler — processes payment events.
 *
 * IMPORTANT: This route must NOT use the body parser.
 * We read the raw body to verify the webhook signature.
 */
export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
        return NextResponse.json(
            { error: "Missing stripe-signature header" },
            { status: 400 }
        );
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error(`⚠️ Webhook signature verification failed: ${message}`);
        return NextResponse.json(
            { error: `Webhook Error: ${message}` },
            { status: 400 }
        );
    }

    await dbConnect();

    try {
        switch (event.type) {
            case "checkout.session.completed": {
                const session = event.data.object as Stripe.Checkout.Session;
                const paymentSessionId = session.metadata?.paymentSessionId;

                if (paymentSessionId) {
                    const paymentSession = await PaymentSession.findOne({ sessionId: paymentSessionId });

                    if (paymentSession && !paymentSession.orderCreated) {
                        // Create the final order using the atomic stock reservation method
                        const order = await Order.createOrderWithTransaction({
                            userId: paymentSession.user.toString(),
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            items: paymentSession.items.map((item: any) => ({
                                productId: item.product.toString(),
                                name: item.name,
                                price: item.price,
                                quantity: item.quantity,
                                image: item.image
                            })),
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            shippingAddress: paymentSession.shippingAddress as any,
                            tax: paymentSession.pricing.tax,
                            shippingCost: paymentSession.pricing.shippingFee
                        });

                        // Mark order as paid
                        await Order.confirmPayment(order.orderId, session.payment_intent as string);

                        // Update payment session
                        paymentSession.orderCreated = true;
                        paymentSession.status = "completed";
                        await paymentSession.save();

                        console.log(`✅ Order ${order.orderId} created and paid via webhook from session ${paymentSessionId}`);
                    }
                }
                break;
            }

            case "checkout.session.expired": {
                const session = event.data.object as Stripe.Checkout.Session;
                const paymentSessionId = session.metadata?.paymentSessionId;

                if (paymentSessionId) {
                    const paymentSession = await PaymentSession.findOne({ sessionId: paymentSessionId });
                    if (paymentSession) {
                        paymentSession.status = "expired";
                        await paymentSession.save();
                        console.log(`⏰ Checkout session expired for session: ${paymentSessionId}`);
                    }
                }
                break;
            }

            case "payment_intent.payment_failed": {
                const paymentIntent = event.data.object as Stripe.PaymentIntent;
                console.error(`❌ Payment failed for payment intent: ${paymentIntent.id}`);

                // Stripe doesn't directly link payment intent to metadata in this specific event 
                // but we can find the session if needed. For now, we'll log it.
                // In a real scenario, you'd find the PaymentSession and mark it failed.
                break;
            }

            default:
                console.log(`ℹ️ Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error("Webhook handler error:", error);
        // Return 200 to prevent Stripe from retrying
        return NextResponse.json(
            { error: "Webhook handler failed" },
            { status: 200 }
        );
    }

    return NextResponse.json({ received: true });
}
