"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/components/cart/CartProvider";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

export default function CheckoutPage() {
    const { items, totalPrice, clearCart } = useCart();
    const { isAuthenticated, isLoading } = useAuth();
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const [address, setAddress] = useState({
        fullName: "",
        line1: "",
        line2: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        phone: "",
    });

    if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>;

    if (!isAuthenticated) {
        return (
            <div className="max-w-lg mx-auto px-4 py-20 text-center">
                <h2 className="text-2xl font-bold mb-4">Please sign in to checkout</h2>
                <Link href="/login?callbackUrl=/checkout" className="inline-flex px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold">
                    Sign In
                </Link>
            </div>
        );
    }

    if (items.length === 0) {
        router.push("/cart");
        return null;
    }

    const tax = Math.round(totalPrice * 0.18);
    const grandTotal = totalPrice + tax;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError("");

        try {
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    items: items.map((item) => ({
                        productId: item.productId,
                        name: item.name,
                        price: item.price,
                        quantity: item.quantity,
                        image: item.image,
                    })),
                    shippingAddress: address,
                    tax,
                    shippingCost: 0,
                }),
            });

            const data = await res.json();

            if (!data.success) {
                setError(data.error || "Checkout failed");
                return;
            }

            clearCart();

            // Redirect to Stripe Checkout
            if (data.data.checkoutUrl) {
                window.location.href = data.data.checkoutUrl;
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    const updateAddress = (field: string, value: string) => {
        setAddress((prev) => ({ ...prev, [field]: value }));
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>

            <form onSubmit={handleSubmit}>
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Shipping Address */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Shipping Address</h2>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">
                                    {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                    <input
                                        type="text" required value={address.fullName}
                                        onChange={(e) => updateAddress("fullName", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                                    <input
                                        type="text" required value={address.line1}
                                        onChange={(e) => updateAddress("line1", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
                                    <input
                                        type="text" value={address.line2}
                                        onChange={(e) => updateAddress("line2", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                    <input
                                        type="text" required value={address.city}
                                        onChange={(e) => updateAddress("city", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                    <input
                                        type="text" required value={address.state}
                                        onChange={(e) => updateAddress("state", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                                    <input
                                        type="text" required value={address.postalCode}
                                        onChange={(e) => updateAddress("postalCode", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input
                                        type="tel" required value={address.phone}
                                        onChange={(e) => updateAddress("phone", e.target.value)}
                                        className="w-full px-4 py-2.5 bg-gray-50 rounded-xl border border-gray-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

                            <div className="space-y-3 mb-4">
                                {items.map((item) => (
                                    <div key={item.productId} className="flex justify-between text-sm">
                                        <span className="text-gray-600 truncate mr-2">
                                            {item.name} × {item.quantity}
                                        </span>
                                        <span className="font-medium text-gray-900 whitespace-nowrap">
                                            ₹{((item.price * item.quantity) / 100).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-gray-100 pt-3 space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>₹{(totalPrice / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>GST (18%)</span>
                                    <span>₹{(tax / 100).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    <span className="text-green-600 font-medium">Free</span>
                                </div>
                                <div className="border-t border-gray-100 pt-2 flex justify-between text-lg font-bold text-gray-900">
                                    <span>Total</span>
                                    <span>₹{(grandTotal / 100).toFixed(2)}</span>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-6 w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Processing...
                                    </span>
                                ) : (
                                    "Pay with Stripe"
                                )}
                            </button>

                            <p className="mt-3 text-xs text-gray-400 text-center">
                                🔒 Secure checkout powered by Stripe
                            </p>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}
