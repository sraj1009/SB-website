"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export default function CartPage() {
    const { items, totalItems, totalPrice, removeItem, updateQuantity, clearCart } = useCart();

    if (items.length === 0) {
        return (
            <div className="max-w-7xl mx-auto px-4 py-20 text-center animate-fadeIn">
                <div className="text-6xl mb-4">🛒</div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
                <p className="text-gray-500 mb-8">Looks like you haven&apos;t added anything yet.</p>
                <Link
                    href="/products"
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
                >
                    Continue Shopping
                </Link>
            </div>
        );
    }

    const tax = Math.round(totalPrice * 0.18);
    const grandTotal = totalPrice + tax;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Shopping Cart ({totalItems})</h1>
                <button
                    onClick={clearCart}
                    className="text-sm text-red-500 hover:text-red-600 font-medium"
                >
                    Clear Cart
                </button>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Cart Items */}
                <div className="lg:col-span-2 space-y-4">
                    {items.map((item) => (
                        <div
                            key={item.productId}
                            className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                        >
                            <div className="relative w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
                                {item.image ? (
                                    <Image
                                        src={item.image}
                                        alt={item.name}
                                        fill
                                        sizes="80px"
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-100"></div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <Link
                                    href={`/products/${item.slug}`}
                                    className="font-semibold text-gray-900 hover:text-amber-600 transition-colors truncate block"
                                >
                                    {item.name}
                                </Link>
                                <p className="text-amber-600 font-bold mt-1">
                                    ₹{(item.price / 100).toFixed(2)}
                                </p>
                            </div>

                            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                                >
                                    −
                                </button>
                                <span className="px-3 py-1.5 font-semibold text-sm">{item.quantity}</span>
                                <button
                                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                    className="px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                                >
                                    +
                                </button>
                            </div>

                            <p className="font-bold text-gray-900 w-24 text-right">
                                ₹{((item.price * item.quantity) / 100).toFixed(2)}
                            </p>

                            <button
                                onClick={() => removeItem(item.productId)}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-24">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal ({totalItems} items)</span>
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
                            <div className="border-t border-gray-100 pt-3 flex justify-between text-lg font-bold text-gray-900">
                                <span>Total</span>
                                <span>₹{(grandTotal / 100).toFixed(2)}</span>
                            </div>
                        </div>

                        <Link
                            href="/checkout"
                            className="mt-6 block w-full text-center py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-amber-200/50 transition-all hover:-translate-y-0.5"
                        >
                            Proceed to Checkout
                        </Link>

                        <Link
                            href="/products"
                            className="mt-3 block text-center text-sm text-amber-600 hover:underline"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
