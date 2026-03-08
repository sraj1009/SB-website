import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { forgotPasswordRateLimit } from "@/lib/utils/ratelimit";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";
import { z } from "zod";
import crypto from "crypto";

const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export async function POST(req: NextRequest) {
    try {
        // Enforce strict rate limits to prevent email spam
        const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const { success } = await forgotPasswordRateLimit.limit(ip);

        if (!success) {
            return apiError("Too many password reset requests. Please try again later.", 429);
        }

        await dbConnect();
        const body = await req.json();
        const { email } = forgotPasswordSchema.parse(body);

        const user = await User.findOne({ email: email.toLowerCase() });

        // Generic response prevents User Enumeration Attacks
        if (!user) {
            return apiSuccess({ message: "If an account exists, a reset link has been sent." }, 200);
        }

        const resetToken = crypto.randomBytes(32).toString("hex");

        // Token valid for 1 hour
        user.resetPasswordToken = resetToken;
        user.resetPasswordTokenExpires = new Date(Date.now() + 3600000);
        await user.save();

        void sendPasswordResetEmail(user.email, resetToken);

        return apiSuccess({ message: "If an account exists, a reset link has been sent." }, 200);
    } catch (error) {
        return handleApiError(error);
    }
}
