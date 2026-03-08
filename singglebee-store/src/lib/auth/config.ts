import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/db/connect";
import User from "@/lib/db/models/User";
import { loginRateLimit } from "@/lib/utils/ratelimit";
import { headers } from "next/headers";
import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
        }),
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }

                // Apply Upstash Login Rate Limiting
                const ip = headers().get("x-forwarded-for") ?? "127.0.0.1";
                const { success } = await loginRateLimit.limit(ip);
                if (!success) {
                    throw new Error("Too many login attempts. Please try again later.");
                }

                await dbConnect();

                const user = await User.findOne({
                    email: (credentials.email as string).toLowerCase(),
                }).select("+passwordHash");

                if (!user || !user.passwordHash) {
                    throw new Error("Invalid email or password");
                }

                const isValid = await user.comparePassword(
                    credentials.password as string
                );
                if (!isValid) {
                    throw new Error("Invalid email or password");
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    image: user.image,
                };
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account?.provider === "google") {
                await dbConnect();

                const existingUser = await User.findOne({ email: user.email });
                if (!existingUser) {
                    await User.create({
                        name: user.name || "",
                        email: user.email || "",
                        image: user.image || "",
                        emailVerified: new Date(),
                        role: "customer",
                    });
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                await dbConnect();
                const dbUser = await User.findOne({ email: user.email });
                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.role = dbUser.role;
                    token.emailVerified = dbUser.emailVerified;
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).id = token.id;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).role = token.role;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (session.user as any).emailVerified = token.emailVerified;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        error: "/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    useSecureCookies: process.env.NODE_ENV === "production",
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" ? `__Secure-next-auth.session-token` : `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: "lax",
                path: "/",
                secure: process.env.NODE_ENV === "production",
            },
        },
    },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
