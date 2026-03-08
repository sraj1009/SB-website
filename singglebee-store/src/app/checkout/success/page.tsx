"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function CheckoutSuccessContent() {
    const searchParams = useSearchParams();
    const sessionId = searchParams.get("session_id");
    const paymentSessionId = searchParams.get("sess_id");
    const [status, setStatus] = useState<"loading" | "success" | "pending" | "error">("loading");
    const [orderId, setOrderId] = useState<string | null>(null);

    useEffect(() => {
        const idToCheck = sessionId || paymentSessionId;
        if (!idToCheck) {
            setStatus("error");
            return;
        }

        let pollCount = 0;
        const maxPolls = 15; // 30 seconds total

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/checkout/status/${idToCheck}`);
                const data = await res.json();

                if (data.success && (data.data.status === "completed" || data.data.orderCreated)) {
                    setStatus("success");
                    setOrderId(data.data.orderId);
                } else if (pollCount < maxPolls) {
                    pollCount++;
                    setTimeout(checkStatus, 2000);
                } else {
                    setStatus("pending"); // Still waiting but stopped polling
                }
            } catch (err) {
                console.error("Status check error:", err);
                setStatus("error");
            }
        };

        checkStatus();
    }, [sessionId, paymentSessionId]);

    if (status === "loading") {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                    <svg className="w-10 h-10 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying Your Payment...</h1>
                <p className="text-gray-500">Please wait while we finalize your order. This should only take a few seconds.</p>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-3">Something went wrong</h1>
                <p className="text-gray-500 mb-8">We couldn&apos;t verify your order status. Please check your account dashboard.</p>
                <Link href="/account" className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold">
                    Go to Account
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-lg mx-auto px-4 py-20 text-center animate-fadeIn">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {status === "success" ? "Order Confirmed!" : "Payment Received!"}
            </h1>
            <p className="text-gray-500 mb-2">
                {status === "success"
                    ? `Order ${orderId || ""} has been successfully placed.`
                    : "Your payment was successful. We are still processing your order details."}
            </p>
            <p className="text-sm text-gray-400 mb-8">
                A confirmation email will be sent shortly.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                    href="/account"
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-black transition-all group"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    View My Orders
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </Link>
                <Link
                    href="/products"
                    className="px-6 py-3 bg-white text-gray-900 rounded-xl font-semibold border border-gray-200 hover:border-amber-300 transition-all"
                >
                    Continue Shopping
                </Link>
            </div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <svg className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-6" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <h1 className="text-2xl font-bold text-gray-900 mb-3">Loading Success Page...</h1>
            </div>
        }>
            <CheckoutSuccessContent />
        </Suspense>
    );
}
