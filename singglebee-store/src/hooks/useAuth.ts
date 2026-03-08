"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
    const { data: session, status } = useSession();

    return {
        user: session?.user
            ? {
                id: (session.user as Record<string, unknown>).id as string,
                name: session.user.name,
                email: session.user.email,
                role: (session.user as Record<string, unknown>).role as string,
                image: session.user.image,
            }
            : null,
        isAuthenticated: status === "authenticated",
        isLoading: status === "loading",
        isAdmin:
            status === "authenticated" &&
            (session?.user as Record<string, unknown>)?.role === "admin",
    };
}
