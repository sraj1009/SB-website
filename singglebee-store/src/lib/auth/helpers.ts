import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";

/**
 * Get the current authenticated session or return null.
 */
export async function getSession() {
    return await auth();
}

/**
 * Require authentication — throws 401 if not authenticated.
 */
export async function requireAuth() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Authentication required" },
            { status: 401 }
        );
    }
    return session;
}

/**
 * Require admin role — throws 403 if not admin.
 */
export async function requireAdmin() {
    const session = await auth();
    if (!session?.user) {
        return NextResponse.json(
            { success: false, error: "Authentication required" },
            { status: 401 }
        );
    }
    if ((session.user as Record<string, unknown>).role !== "admin") {
        return NextResponse.json(
            { success: false, error: "Admin access required" },
            { status: 403 }
        );
    }
    return session;
}
