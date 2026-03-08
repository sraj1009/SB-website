import mongoose from "mongoose";


/**
 * Global cache for the Mongoose connection to prevent multiple connections
 * in serverless environments (Vercel / AWS Lambda).
 */
interface MongooseCache {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    // eslint-disable-next-line no-var
    var mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongooseCache ?? {
    conn: null,
    promise: null,
};

if (!global.mongooseCache) {
    global.mongooseCache = cached;
}

/**
 * Connect to MongoDB using Mongoose with connection pooling.
 * Uses a cached connection in serverless environments to avoid
 * exhausting database connections.
 */
async function dbConnect(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn;
    }

    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
        throw new Error(
            "Please define the MONGODB_URI environment variable inside .env.local"
        );
    }

    if (!cached.promise) {
        const opts: mongoose.ConnectOptions = {
            bufferCommands: false,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        cached.promise = mongoose
            .connect(MONGODB_URI!, opts)
            .then((mongooseInstance) => {
                console.log("✅ MongoDB connected successfully");
                return mongooseInstance;
            })
            .catch((error) => {
                cached.promise = null;
                console.error("❌ MongoDB connection error:", error);
                throw error;
            });
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default dbConnect;
