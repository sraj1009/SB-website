import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import Order from "@/lib/db/models/Order";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/admin/customers
 * Returns list of customers with their order stats.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get("search") || "";

        await dbConnect();

        // 1. Fetch users (regular role)
        const query: Record<string, unknown> = { role: "user" };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { email: { $regex: search, $options: "i" } }
            ];
        }

        const users = await User.find(query)
            .select("name email image createdAt")
            .sort({ createdAt: -1 })
            .lean();

        // 2. Aggregate order stats for these users
        const customerStats = await Order.aggregate([
            { $match: { paymentStatus: "completed" } },
            {
                $group: {
                    _id: "$user",
                    orderCount: { $sum: 1 },
                    totalSpent: { $sum: "$totalAmount" },
                    lastOrderDate: { $max: "$createdAt" }
                }
            }
        ]);

        const statsMap = new Map(customerStats.map(s => [s._id.toString(), s]));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const formattedCustomers = users.map((user: any) => {
            const stats = statsMap.get(user._id.toString()) || { orderCount: 0, totalSpent: 0, lastOrderDate: null };
            return {
                ...user,
                orderCount: stats.orderCount,
                totalSpent: stats.totalSpent / 100,
                lastOrderDate: stats.lastOrderDate,
            };
        });

        return apiSuccess({ customers: formattedCustomers });
    } catch (error) {
        return handleApiError(error);
    }
}
