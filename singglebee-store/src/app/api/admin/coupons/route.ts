import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import Coupon from "@/lib/db/models/Coupon";
import { auth } from "@/lib/auth/config";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

/**
 * GET /api/admin/coupons
 * POST /api/admin/coupons
 */
export async function GET() {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        await dbConnect();
        const coupons = await Coupon.find().sort({ createdAt: -1 }).lean();
        return apiSuccess({ coupons });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        const body = await req.json();
        await dbConnect();

        const coupon = await Coupon.create(body);
        return apiSuccess({ coupon }, 201);
    } catch (error: unknown) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
            return apiError("Coupon code already exists", 400);
        }
        return handleApiError(error);
    }
}

/**
 * DELETE /api/admin/coupons?id=...
 * PUT /api/admin/coupons
 */
export async function DELETE(req: NextRequest) {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return apiError("Coupon ID required", 400);

        await dbConnect();
        await Coupon.findByIdAndDelete(id);

        return apiSuccess({ message: "Coupon deleted" });
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(req: NextRequest) {
    try {
        const session = await auth();
        if ((session?.user as { role?: string })?.role !== "admin") {
            return apiError("Unauthorized", 403);
        }

        const body = await req.json();
        const { id, ...updateData } = body;

        if (!id) return apiError("Coupon ID required", 400);

        await dbConnect();
        const coupon = await Coupon.findByIdAndUpdate(id, updateData, { new: true });

        if (!coupon) return apiError("Coupon not found", 404);

        return apiSuccess({ coupon });
    } catch (error) {
        return handleApiError(error);
    }
}
