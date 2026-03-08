import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db/connect";
import Order from "@/lib/db/models/Order";
import Product from "@/lib/db/models/Product";
import { auth } from "@/lib/auth/config";
import { apiError } from "@/lib/utils/errors";

/**
 * GET /api/admin/reports
 * Exports CSV reports for Sales or Inventory.
 */
export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type") || "sales"; // sales, inventory
        const timeframe = searchParams.get("timeframe") || "30days";

        await dbConnect();

        let csvContent = "";
        let fileName = "";

        if (type === "sales") {
            const now = new Date();
            const startDate = new Date();
            if (timeframe === "7days") startDate.setDate(now.getDate() - 7);
            else if (timeframe === "30days") startDate.setDate(now.getDate() - 30);
            else if (timeframe === "year") startDate.setFullYear(now.getFullYear() - 1);

            const orders = await Order.find({
                paymentStatus: "completed",
                createdAt: { $gte: startDate }
            }).populate("user", "name email").sort({ createdAt: -1 });

            csvContent = "Order ID,Customer,Email,Total Amount (INR),Status,Date\n";
            orders.forEach(order => {
                const customerName = (order.user as { name?: string })?.name || "N/A";
                const customerEmail = (order.user as { email?: string })?.email || "N/A";
                csvContent += `${order.orderId},"${customerName}",${customerEmail},${(order.totalAmount / 100).toFixed(2)},${order.status},${order.createdAt.toISOString()}\n`;
            });
            fileName = `sales-report-${timeframe}-${now.toISOString().split('T')[0]}.csv`;
        } else if (type === "inventory") {
            const products = await Product.find().populate({
                path: 'stock',
                select: 'quantity reservedQuantity'
            }).lean();

            csvContent = "Product Name,SKU,Category,Price (INR),Stock,Reserved,Available\n";
            products.forEach((p) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const stock = (p as any).stock || { quantity: 0, reservedQuantity: 0 };
                csvContent += `"${p.name}",${p.sku},${p.category},${(p.price / 100).toFixed(2)},${stock.quantity},${stock.reservedQuantity},${stock.quantity - stock.reservedQuantity}\n`;
            });
            fileName = `inventory-report-${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            return apiError("Invalid report type", 400);
        }

        return new NextResponse(csvContent, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename=${fileName}`,
            },
        });

    } catch (error) {
        console.error("Report export failed:", error);
        return apiError("Export failed", 500);
    }
}
