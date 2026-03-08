"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
    TrendingUp,
    Users,
    Package,
    ShoppingCart,
    ArrowUpRight,
    ArrowDownRight,
    Tag,
    BarChart3,
    ArrowRight,
    Loader2
} from "lucide-react";

// Lazy load heavy components
const ReportExportTools = dynamic(() => import("@/components/admin/ReportExportTools"), {
    loading: () => <div className="h-20 skeleton rounded-2xl" />,
    ssr: false
});

const ResponsiveContainer = dynamic(() => import("recharts").then(mod => mod.ResponsiveContainer), { ssr: false });
const AreaChart = dynamic(() => import("recharts").then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import("recharts").then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import("recharts").then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import("recharts").then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import("recharts").then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import("recharts").then(mod => mod.Tooltip), { ssr: false });

interface AnalyticsData {
    kpis: {
        revenue: number;
        orders: number;
        users: number;
        products: number;
    };
    recentSales: Array<{
        orderId: string;
        totalAmount: number;
        createdAt: string;
        status: string;
    }>;
    salesTrend: Array<{
        date: string;
        revenue: number;
        orders: number;
    }>;
}

export default function AdminDashboard() {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeframe, setTimeframe] = useState("30days");

    useEffect(() => {
        async function fetchAnalytics() {
            setLoading(true);
            try {
                const res = await fetch(`/api/admin/analytics?timeframe=${timeframe}`);
                const json = await res.json();
                if (json.success) setData(json.data);
            } catch (error) {
                console.error("Failed to fetch analytics:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchAnalytics();
    }, [timeframe]);

    const kpis = [
        {
            label: "Total Revenue",
            value: `₹${(data?.kpis.revenue || 0).toLocaleString()}`,
            icon: TrendingUp,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            trend: "+12.5%",
            isPositive: true
        },
        {
            label: "Total Orders",
            value: data?.kpis.orders || 0,
            icon: ShoppingCart,
            color: "text-amber-600",
            bg: "bg-amber-50",
            trend: "+5.2%",
            isPositive: true
        },
        {
            label: "Customers",
            value: data?.kpis.users || 0,
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
            trend: "+8.1%",
            isPositive: true
        },
        {
            label: "Active Products",
            value: data?.kpis.products || 0,
            icon: Package,
            color: "text-purple-600",
            bg: "bg-purple-50",
            trend: "Stable",
            isPositive: true
        },
    ];

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-700",
        paid: "bg-blue-100 text-blue-700",
        processing: "bg-indigo-100 text-indigo-700",
        shipped: "bg-purple-100 text-purple-700",
        delivered: "bg-green-100 text-green-700",
        cancelled: "bg-red-100 text-red-700",
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 pb-12 animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 tracking-tight">Executive Dashboard</h1>
                    <p className="text-gray-500 font-medium">Insights and store performance overview</p>
                </div>
                <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                    {["7days", "30days", "year"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTimeframe(t)}
                            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${timeframe === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            {t === "30days" ? "Last 30 Days" : t === "7days" ? "Last 7 Days" : "Last Year"}
                        </button>
                    ))}
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {loading ? (
                    Array(4).fill(0).map((_, i) => <div key={i} className="h-32 skeleton rounded-3xl" />)
                ) : (
                    kpis.map((kpi) => (
                        <div key={kpi.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`p-3 rounded-2xl ${kpi.bg} ${kpi.color} group-hover:scale-110 transition-transform`}>
                                    <kpi.icon className="w-6 h-6" />
                                </div>
                                <div className={`flex items-center gap-1 text-xs font-bold ${kpi.isPositive ? "text-emerald-600" : "text-red-600"}`}>
                                    {kpi.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {kpi.trend}
                                </div>
                            </div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">{kpi.label}</h3>
                            <p className="text-2xl font-black text-gray-900 mt-1">{kpi.value}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Revenue Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-black text-gray-900">Revenue Stream</h3>
                            <p className="text-sm text-gray-400 font-medium">Daily income tracking</p>
                        </div>
                        <div className="p-2 bg-gray-50 rounded-xl">
                            <BarChart3 className="w-5 h-5 text-gray-400" />
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {loading ? (
                            <div className="h-full w-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div>
                        ) : data && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.salesTrend}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 800 }}
                                        cursor={{ stroke: '#f59e0b', strokeWidth: 2 }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Quick Actions & Shortcut */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-gray-900 to-black p-8 rounded-3xl text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-2">Campaign Manager</h3>
                            <p className="text-gray-400 text-sm mb-6">Create limited-time offers and coupons to boost conversion.</p>
                            <Link href="/admin/coupons" className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:gap-4 transition-all group">
                                Manage Coupons
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                        <Tag className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5 -rotate-12 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="bg-amber-50 p-8 rounded-3xl border border-amber-100 group cursor-pointer hover:bg-amber-100 transition-colors">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white rounded-2xl">
                                <Package className="w-6 h-6 text-amber-600" />
                            </div>
                            <h3 className="font-black text-gray-900">Inventory Status</h3>
                        </div>
                        <p className="text-sm text-amber-800/70 font-medium mb-4">3 items are currently below safety stock levels. Restock now to avoid missed sales.</p>
                        <Link href="/admin/stock" className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-2">
                            View Stock Reports <ArrowRight className="w-3 h-3" />
                        </Link>
                    </div>
                </div>
            </div>

            {/* Reporting Section */}
            <div className="mb-12">
                <div className="mb-6">
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Financial & Inventory Logs</h2>
                    <p className="text-gray-500 font-medium font-sm">Audit-ready CSV exports for your records</p>
                </div>
                <ReportExportTools />
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Recent Transactions</h3>
                        <p className="text-sm text-gray-400 font-medium">Latest customer activity</p>
                    </div>
                    <Link href="/admin/orders" className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center gap-2 group">
                        View All Orders <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Order ID</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Amount</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i}><td colSpan={4} className="px-8 py-4"><div className="h-4 bg-gray-100 rounded-full animate-pulse" /></td></tr>
                                ))
                            ) : data?.recentSales.map((sale) => (
                                <tr key={sale.orderId} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-8 py-5 font-mono text-sm font-bold text-gray-900">{sale.orderId}</td>
                                    <td className="px-8 py-5 font-black text-gray-900">₹{(sale.totalAmount / 100).toFixed(2)}</td>
                                    <td className="px-8 py-5 text-sm text-gray-500 font-medium">{new Date(sale.createdAt).toLocaleDateString()}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${statusColors[sale.status] || "bg-gray-100"}`}>
                                            {sale.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
