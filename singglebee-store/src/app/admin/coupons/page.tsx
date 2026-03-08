"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Edit2, Calendar, Tag, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

interface CouponData {
    _id: string;
    code: string;
    discountType: "percentage" | "fixed";
    discountAmount: number;
    minOrderAmount: number;
    maxDiscountAmount?: number;
    expiryDate: string;
    usageLimit: number;
    usageCount: number;
    isActive: boolean;
}

const INITIAL_FORM: Omit<CouponData, "_id" | "expiryDate" | "usageCount"> & { expiryDate: string } = {
    code: "",
    discountType: "percentage",
    discountAmount: 0,
    minOrderAmount: 0,
    maxDiscountAmount: 0,
    expiryDate: "",
    usageLimit: 100,
    isActive: true,
};

export default function AdminCouponsPage() {
    const [coupons, setCoupons] = useState<CouponData[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<CouponData | null>(null);
    const [form, setForm] = useState(INITIAL_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const fetchCoupons = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/coupons");
            const data = await res.json();
            if (data.success) setCoupons(data.data.coupons || []);
        } catch (err) {
            console.error("Failed to fetch coupons:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

    const handleEdit = (coupon: CouponData) => {
        setEditingCoupon(coupon);
        setForm({
            code: coupon.code,
            discountType: coupon.discountType as "percentage" | "fixed",
            discountAmount: coupon.discountAmount,
            minOrderAmount: coupon.minOrderAmount / 100,
            maxDiscountAmount: (coupon.maxDiscountAmount || 0) / 100,
            expiryDate: new Date(coupon.expiryDate).toISOString().split("T")[0],
            usageLimit: coupon.usageLimit,
            isActive: coupon.isActive,
        });
        setShowForm(true);
    };

    const handleToggleStatus = async (coupon: CouponData) => {
        try {
            await fetch("/api/admin/coupons", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: coupon._id, isActive: !coupon.isActive }),
            });
            fetchCoupons();
        } catch (err) {
            console.error("Status toggle failed:", err);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon?")) return;
        try {
            await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
            fetchCoupons();
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError("");

        const payload = {
            ...form,
            minOrderAmount: Math.round(form.minOrderAmount * 100),
            maxDiscountAmount: form.maxDiscountAmount ? Math.round(form.maxDiscountAmount * 100) : undefined,
            id: editingCoupon?._id
        };

        try {
            const res = await fetch("/api/admin/coupons", {
                method: editingCoupon ? "PUT" : "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!data.success) {
                setError(data.error || "Failed to save coupon");
                return;
            }
            setShowForm(false);
            setEditingCoupon(null);
            setForm(INITIAL_FORM);
            fetchCoupons();
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Coupons</h1>
                    <p className="text-gray-500 mt-1">Manage discount codes and promotions</p>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold hover:shadow-lg transition-all scale-100 hover:scale-105 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create Coupon
                    </button>
                )}
            </div>

            {showForm && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-8 animate-slideDown">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-900">{editingCoupon ? "Edit Coupon" : "New Coupon"}</h2>
                        <button onClick={() => { setShowForm(false); setEditingCoupon(null); setForm(INITIAL_FORM); }} className="text-gray-400 hover:text-gray-600 text-sm font-semibold">Cancel</button>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 animate-pulse">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-semibold text-sm">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="md:col-span-2 lg:col-span-1">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Coupon Code</label>
                            <input
                                required
                                value={form.code}
                                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-400 outline-none transition-all font-mono tracking-widest"
                                placeholder="SUMMER2026"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Discount Type</label>
                            <select
                                value={form.discountType}
                                onChange={(e) => setForm({ ...form, discountType: e.target.value as "percentage" | "fixed" })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-400 outline-none transition-all"
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed Amount (₹)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Discount Amount</label>
                            <input
                                type="number"
                                required
                                value={form.discountAmount}
                                onChange={(e) => setForm({ ...form, discountAmount: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-400 outline-none transition-all"
                                placeholder={form.discountType === "percentage" ? "10" : "500"}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Min Order (₹)</label>
                            <input
                                type="number"
                                value={form.minOrderAmount}
                                onChange={(e) => setForm({ ...form, minOrderAmount: parseFloat(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-400 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Expiry Date</label>
                            <input
                                type="date"
                                required
                                value={form.expiryDate}
                                onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-400 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Usage Limit</label>
                            <input
                                type="number"
                                required
                                value={form.usageLimit}
                                onChange={(e) => setForm({ ...form, usageLimit: parseInt(e.target.value) })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-400 outline-none transition-all"
                            />
                        </div>

                        <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-4">
                            <button
                                disabled={saving}
                                type="submit"
                                className="px-12 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {editingCoupon ? "Update Coupon" : "Save Coupon"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-48 skeleton rounded-2xl" />)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {coupons.map((coupon) => (
                        <div key={coupon._id} className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl transition-all hover:border-amber-200 relative overflow-hidden">
                            {!coupon.isActive && <div className="absolute top-0 right-0 p-2"><span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-bold uppercase">Disabled</span></div>}

                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
                                    <Tag className="w-6 h-6" />
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEdit(coupon)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleToggleStatus(coupon)} className={`p-2 rounded-lg ${coupon.isActive ? "text-orange-500 hover:bg-orange-50" : "text-green-500 hover:bg-green-50"}`} title={coupon.isActive ? "Disable" : "Enable"}>
                                        <ShieldCheck className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(coupon._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>

                            <h3 className="text-xl font-black text-gray-900 tracking-widest font-mono mb-1">{coupon.code}</h3>
                            <p className="text-2xl font-bold text-amber-600 mb-4">
                                {coupon.discountType === "percentage" ? `${coupon.discountAmount}% OFF` : `₹${coupon.discountAmount} OFF`}
                            </p>

                            <div className="space-y-2 mb-6">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <Calendar className="w-4 h-4" />
                                    Expires: {new Date(coupon.expiryDate).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="w-4 h-1 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400"
                                            style={{ width: `${(coupon.usageCount / coupon.usageLimit) * 100}%` }}
                                        />
                                    </div>
                                    {coupon.usageCount} / {coupon.usageLimit} uses
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-50 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                                Min Order: ₹{(coupon.minOrderAmount / 100).toFixed(0)}
                            </div>
                        </div>
                    ))}
                    {coupons.length === 0 && (
                        <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center">
                            <Tag className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-gray-900">No coupons active</h3>
                            <p className="text-gray-400">Create your first discount code to boost sales!</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
