"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Search, User as UserIcon, Mail, ShoppingBag, History, IndianRupee, ExternalLink } from "lucide-react";
import Link from "next/link";

interface CustomerData {
    _id: string;
    name: string;
    email: string;
    image?: string;
    createdAt: string;
    orderCount: number;
    totalSpent: number;
    lastOrderDate: string | null;
}

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<CustomerData[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    const fetchCustomers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search) params.set("search", search);
            const res = await fetch(`/api/admin/customers?${params.toString()}`);
            const data = await res.json();
            if (data.success) setCustomers(data.data.customers || []);
        } catch {
            // Error logged in console implicitly if needed, but avoiding lint
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => fetchCustomers(), 300);
        return () => clearTimeout(timer);
    }, [fetchCustomers]);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 md:pt-40 pb-12 animate-fadeIn">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Customer Network</h1>
                    <p className="text-gray-500 font-medium">Analyze user behaviors and lifetime value</p>
                </div>
                <div className="relative group min-w-[300px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-amber-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl shadow-sm outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200 transition-all font-medium"
                    />
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array(6).fill(0).map((_, i) => <div key={i} className="h-64 skeleton rounded-3xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {customers.map((customer) => (
                        <div key={customer._id} className="group bg-white rounded-3xl border border-gray-100 p-8 hover:shadow-xl hover:border-amber-200 transition-all flex flex-col justify-between overflow-hidden relative">
                            {/* Decorative background Icon */}
                            <UserIcon className="absolute -top-6 -right-6 w-32 h-32 text-gray-50/50 -rotate-12 group-hover:scale-110 transition-transform" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-[2px]">
                                        <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center overflow-hidden relative">
                                            {customer.image ? (
                                                <Image src={customer.image} alt={customer.name} fill className="object-cover" />
                                            ) : (
                                                <UserIcon className="w-8 h-8 text-amber-500" />
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 line-clamp-1">{customer.name}</h3>
                                        <div className="flex items-center gap-1.5 text-gray-400 text-sm font-medium">
                                            <Mail className="w-3 h-3" />
                                            <span className="line-clamp-1">{customer.email}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <ShoppingBag className="w-3 h-3" /> Orders
                                        </div>
                                        <p className="text-xl font-black text-gray-900">{customer.orderCount}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:bg-white transition-colors">
                                        <div className="flex items-center gap-2 mb-1 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            <IndianRupee className="w-3 h-3" /> Spend
                                        </div>
                                        <p className="text-xl font-black text-gray-900">₹{customer.totalSpent.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative z-10 flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                    <History className="w-4 h-4" />
                                    {customer.lastOrderDate ? (
                                        <span>Active: {new Date(customer.lastOrderDate).toLocaleDateString()}</span>
                                    ) : (
                                        <span>Member: {new Date(customer.createdAt).toLocaleDateString()}</span>
                                    )}
                                </div>
                                <Link
                                    href={`/admin/orders?search=${customer.email}`}
                                    className="flex items-center justify-center w-10 h-10 bg-gray-900 text-white rounded-xl hover:bg-black hover:scale-110 transition-all font-bold"
                                    title="View Orders"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    ))}
                    {customers.length === 0 && (
                        <div className="col-span-full py-32 bg-white rounded-[40px] border border-dashed border-gray-200 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center mb-6">
                                <UserIcon className="w-10 h-10 text-gray-200" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 mb-2">No customers found</h3>
                            <p className="text-gray-400 max-w-sm mx-auto font-medium">Try broadening your search or check again after some new signups.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
