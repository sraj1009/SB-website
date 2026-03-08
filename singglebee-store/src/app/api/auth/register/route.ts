import { NextRequest } from "next/server";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { userRegisterSchema } from "@/lib/validators/user";
import { sanitize } from "@/lib/utils/sanitize";
import { apiSuccess, apiError, handleApiError } from "@/lib/utils/errors";
import { signupRateLimit } from "@/lib/utils/ratelimit";
import { sendVerificationEmail } from "@/lib/email/resend";
import crypto from "crypto";

/**
 * POST /api/auth/register
 * Register a new user with email and password.
 */
export async function POST(req: NextRequest) {
    try {
        const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
        const { success } = await signupRateLimit.limit(ip);

        if (!success) {
            return apiError("Too many registration attempts. Please try again later.", 429);
        }

        await dbConnect();

        const body = await req.json();
        const sanitizedBody = sanitize(body);
        const validated = userRegisterSchema.parse(sanitizedBody);

        // Check for existing user
        const existingUser = await User.findOne({ email: validated.email });
        if (existingUser) {
            return apiError("An account with this email already exists", 409);
        }

        // Hash password and create user
        const passwordHash = await User.hashPassword(validated.password);

        // Generate Secure Verification Token (valid for 1 Hour)
        const verificationToken = crypto.randomBytes(32).toString("hex");
        const verificationTokenExpires = new Date(Date.now() + 3600000);

        const user = await User.create({
            name: validated.name,
            email: validated.email,
            passwordHash,
            verificationToken,
            verificationTokenExpires,
            role: "customer",
        });

        // Dispatch Email asynchronously
        void sendVerificationEmail(user.email, verificationToken);

        return apiSuccess(
            {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role,
            },
            201
        );
    } catch (error) {
        return handleApiError(error);
    }
}
