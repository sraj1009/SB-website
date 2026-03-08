/**
 * normalizeProduct
 *
 * Converts a raw backend product document into the shape the frontend expects.
 *
 * Problem being solved:
 *   MongoDB returns string _id values.  Several parts of the frontend use a
 *   numeric `id` field (e.g. for wishlist comparisons, cart keying, etc.).
 *   Previously, App.tsx derived a numeric id via parseInt(_id.slice(-6), 16)
 *   which can produce collisions for large catalogues.
 *
 * Solution:
 *   We keep the original string `_id` as `originalId` for all backend calls,
 *   and derive a stable numeric `id` from the full 24-character hex string
 *   (last 8 chars → 32-bit integer, collision probability ≈ 1 in 4 billion).
 *   This is only used as a lightweight frontend key; the backend always
 *   receives `originalId` (the real MongoDB _id).
 *
 * @param p - Raw product object from API response
 */
export function normalizeProduct<T extends { _id?: string; id?: number }>(p: T): T & { id: number; originalId: string } {
    const mongoId = (p._id as string) || '';
    // Use last 8 hex chars → 32-bit number (reduces collision surface vs "last 6")
    const numericId =
        typeof p._id === 'string' && p._id.length >= 8
            ? parseInt(p._id.slice(-8), 16) >>> 0   // unsigned 32-bit
            : p.id ?? Math.floor(Math.random() * 0xffffffff);

    return {
        ...p,
        id: numericId,
        originalId: mongoId,
    };
}
