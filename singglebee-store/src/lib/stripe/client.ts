import Stripe from "stripe";

/**
 * Server-side Stripe SDK instance.
 * Uses a locked API version for stability.
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "dummy_key_for_build", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiVersion: "2024-12-18.acacia" as any,
    typescript: true,
});

export default stripe;
