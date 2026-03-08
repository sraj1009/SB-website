import { NextResponse } from "next/server";
import { ZodError } from "zod";

/**
 * Standard API error response builder.
 */
export function apiError(message: string, status: number = 500) {
    return NextResponse.json(
        { success: false, error: message },
        { status }
    );
}

/**
 * Standard API success response builder.
 */
export function apiSuccess<T>(data: T, status: number = 200) {
    return NextResponse.json(
        { success: true, data },
        { status }
    );
}

/**
 * Handle Zod validation errors — returns a clean 400 response.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function handleValidationError(error: any) {
    const messages = error.errors.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e: any) => `${e.path.join(".")}: ${e.message}`
    );
    return apiError(`Validation failed: ${messages.join(", ")}`, 400);
}

/**
 * Generic error handler for API routes.
 */
export function handleApiError(error: unknown) {
    console.error("API Error:", error);

    if (error instanceof ZodError) {
        return handleValidationError(error);
    }

    if (error instanceof Error) {
        // Don't leak internal error details in production
        const message =
            process.env.NODE_ENV === "development"
                ? error.message
                : "An internal server error occurred";
        return apiError(message, 500);
    }

    return apiError("An unexpected error occurred", 500);
}
