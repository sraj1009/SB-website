import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";
import { z } from "zod";

const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required"),
    password: z.string().min(8, "Password must be at least 8 characters long")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
});

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();
        const { token, password } = resetPasswordSchema.parse(body);

        // Find user where reset token hasn't expired yet
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordTokenExpires: { $gt: new Date() },
        });

        if (!user) {
            return apiError("Your password reset link is invalid or has expired. Please request a new one.", 400);
        }

        // Hash new password and clear out tokens
        const passwordHash = await User.hashPassword(password);

        user.passwordHash = passwordHash;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpires = undefined;
        await user.save();

        return apiSuccess({ message: "Your password has been successfully reset. You can now login." }, 200);
    } catch (error) {
        return handleApiError(error);
    }
}
