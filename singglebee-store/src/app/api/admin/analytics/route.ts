import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import Product from "@/lib/db/models/Product";
import User from "@/lib/db/models/User";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";
import { withCache } from "@/lib/utils/cache";

/**
 * GET /api/admin/analytics
 * Returns aggregated data for the dashboard.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        const { searchParams } = new URL(req.url);
        const timeframe = searchParams.get("timeframe") || "30days"; // 7days, 30days, year

        const cacheKey = `admin:analytics:${timeframe}`;

        return await withCache(cacheKey, 900, async () => {
            await dbConnect();

            const now = new Date();
            const startDate = new Date();
            if (timeframe === "7days") startDate.setDate(now.getDate() - 7);
            else if (timeframe === "30days") startDate.setDate(now.getDate() - 30);
            else if (timeframe === "year") startDate.setFullYear(now.getFullYear() - 1);

            // 1. Key Performance Indicators (KPIs)
            const [
                totalRevenue,
                totalOrders,
                totalUsers,
                totalProducts,
                recentSales
            ] = await Promise.all([
                Order.aggregate([
                    { $match: { paymentStatus: "paid", createdAt: { $gte: startDate } } },
                    { $group: { _id: null, total: { $sum: "$totalAmount" } } }
                ]),
                Order.countDocuments({ createdAt: { $gte: startDate } }),
                User.countDocuments({ role: "user" }),
                Product.countDocuments(),
                Order.find({ paymentStatus: "paid" })
                    .sort({ createdAt: -1 })
                    .limit(10)
                    .select("orderId totalAmount createdAt status")
                    .lean()
            ]);

            // 2. Sales Trend (Chart data)
            const salesTrend = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: "paid",
                        createdAt: { $gte: startDate }
                    }
                },
                {
                    $group: {
                        _id: {
                            day: { $dayOfMonth: "$createdAt" },
                            month: { $month: "$createdAt" },
                            year: { $year: "$createdAt" }
                        },
                        revenue: { $sum: "$totalAmount" },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
            ]);

            // Format sales trend for Recharts
            const formattedTrend = salesTrend.map(item => ({
                date: `${item._id.day}/${item._id.month}`,
                revenue: item.revenue / 100,
                orders: item.count
            }));

            // 3. Category distribution
            const categoryDist = await Product.aggregate([
                { $group: { _id: "$category", count: { $sum: 1 } } }
            ]);

            return apiSuccess({
                kpis: {
                    revenue: (totalRevenue[0]?.total || 0) / 100,
                    orders: totalOrders,
                    users: totalUsers,
                    products: totalProducts
                },
                recentSales,
                salesTrend: formattedTrend,
                categoryDistribution: categoryDist.map(c => ({ name: c._id, value: c.count }))
            });
        });
    } catch (error) {
        return handleApiError(error);
    }
}
