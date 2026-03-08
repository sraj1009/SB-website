"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailLogic() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [status, setStatus] = useState<"loading" | "success" | "error" | "missing">("loading");
    const [message, setMessage] = useState("");

    useEffect(() => {
        if (!token) {
            setStatus("missing");
            return;
        }

        const verify = async () => {
            try {
                const res = await fetch(`/api/auth/verify?token=${token}`, { method: "POST" });
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || "Verification failed");
                }

                setStatus("success");
                setMessage("Your email has been successfully verified! You can now access your account.");

                setTimeout(() => {
                    router.push("/login"); // Direct them to login after verification
                }, 3000);
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (error: any) {
                setStatus("error");
                setMessage(error.message);
            }
        };

        verify();
    }, [token, router]);

    if (status === "loading") {
        return (
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <h1 className="text-xl font-bold text-gray-900">Verifying Email...</h1>
                <p className="text-gray-500 mt-2">Please wait while we confirm your email address.</p>
            </div>
        );
    }

    if (status === "missing") {
        return (
            <div className="text-center">
                <h1 className="text-xl font-bold text-gray-900 mb-2">Check Your Email</h1>
                <p className="text-gray-500 mb-6">
                    A verification link was sent to your email address during registration. Please click that link to activate your account.
                </p>
                <Link href="/login" className="text-amber-600 font-semibold hover:underline">
                    Go to Login
                </Link>
            </div>
        );
    }

    return (
        <div className="text-center">
            <div className={`mb-4 inline-flex items-center justify-center w-16 h-16 rounded-full ${status === "success" ? "bg-green-100 text-green-500" : "bg-red-100 text-red-500"}`}>
                {status === "success" ? (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                ) : (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                )}
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {status === "success" ? "Email Verified" : "Verification Failed"}
            </h1>

            <p className={`mb-6 ${status === "success" ? "text-green-700" : "text-red-600"}`}>
                {message}
            </p>

            <Link
                href="/login"
                className="inline-block w-full py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all"
            >
                Continue to Login
            </Link>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 animate-fadeIn bg-gray-50/50">
            <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
                <Suspense fallback={<div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />}>
                    <VerifyEmailLogic />
                </Suspense>
            </div>
        </div>
    );
}
