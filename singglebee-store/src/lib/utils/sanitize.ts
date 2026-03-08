/**
 * Sanitize user input to prevent NoSQL injection attacks.
 * Strips keys that start with "$" or contain "." from objects.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitize<T>(input: T): T {
    if (input === null || input === undefined) return input;

    if (typeof input === "string") {
        // Remove null bytes
        return input.replace(/\0/g, "") as unknown as T;
    }

    if (Array.isArray(input)) {
        return input.map((item) => sanitize(item)) as unknown as T;
    }

    if (typeof input === "object") {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
            // Skip keys starting with "$" (MongoDB operators)
            if (key.startsWith("$")) continue;
            // Skip keys containing "." (nested property access)
            if (key.includes(".")) continue;

            sanitized[key] = sanitize(value);
        }
        return sanitized as T;
    }

    return input;
}

/**
 * Sanitize a string for use in MongoDB regex queries.
 * Escapes special regex characters.
 */
export function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
