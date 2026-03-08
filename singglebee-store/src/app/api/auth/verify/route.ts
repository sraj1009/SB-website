import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const token = searchParams.get("token");

        if (!token) {
            return apiError("Verification token is missing", 400);
        }

        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpires: { $gt: new Date() },
        });

        if (!user) {
            return apiError("Verification link is invalid or has expired", 400);
        }

        user.emailVerified = new Date();
        user.verificationToken = undefined;
        user.verificationTokenExpires = undefined;
        await user.save();

        return apiSuccess({ message: "Email verification successful" }, 200);
    } catch (error) {
        return handleApiError(error);
    }
}
