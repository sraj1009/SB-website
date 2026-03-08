import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Next.js Middleware — Runs on every matched request (Edge Runtime).
 *
 * Uses getToken() instead of auth() to avoid importing Mongoose
 * in the Edge bundle.
 */
export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Security headers
    const response = NextResponse.next();
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set(
        "Permissions-Policy",
        "camera=(), microphone=(), geolocation=()"
    );
    response.headers.set(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
    );
    // Cache-Control for static assets and public APIs
    if (pathname.includes("/assets/") || pathname.match(/\.(png|jpg|jpeg|gif|webp|ico|svg|css|js)$/)) {
        response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else if (pathname.startsWith("/api/products")) {
        response.headers.set("Cache-Control", "public, s-maxage=600, stale-while-revalidate=300");
    }

    // Basic CSP to force HTTPS in production
    if (process.env.NODE_ENV === "production") {
        response.headers.set(
            "Content-Security-Policy",
            "upgrade-insecure-requests"
        );
    }

    // Get JWT token (does NOT require database/Mongoose)
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const isAuthenticated = !!token;

    const userRole = token?.role as string | undefined;
    const isEmailVerified = !!token?.emailVerified;

    // Protect admin routes
    if (pathname.startsWith("/admin")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(new URL("/login?callbackUrl=/admin", req.url));
        }
        if (userRole !== "admin") {
            return NextResponse.redirect(new URL("/?error=unauthorized", req.url));
        }
    }

    // Protect account routes
    if (pathname.startsWith("/account")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(
                new URL(`/login?callbackUrl=${pathname}`, req.url)
            );
        }
        if (!isEmailVerified) {
            return NextResponse.redirect(new URL("/verify-email", req.url));
        }
    }

    // Protect checkout route
    if (pathname.startsWith("/checkout")) {
        if (!isAuthenticated) {
            return NextResponse.redirect(
                new URL(`/login?callbackUrl=${pathname}`, req.url)
            );
        }
    }

    if (pathname === "/login" || pathname === "/register" || pathname === "/forgot-password" || pathname === "/reset-password") {
        if (isAuthenticated) {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    return response;
}

export const config = {
    matcher: [
        "/admin/:path*",
        "/account/:path*",
        "/checkout/:path*",
        "/login",
        "/register",
    ],
};
