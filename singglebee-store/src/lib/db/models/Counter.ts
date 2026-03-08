import mongoose, { Schema, Model } from "mongoose";
import type { ICounter } from "@/types";

const CounterSchema = new Schema<ICounter>({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

/**
 * Atomically increments the counter for a given sequence name
 * and returns the new value. Used for generating sequential order IDs.
 *
 * @param sequenceName - The name of the sequence (e.g., "order")
 * @returns The next sequential number
 */
CounterSchema.statics.getNextSequence = async function (
    sequenceName: string
): Promise<number> {
    const counter = await this.findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

export interface CounterModel extends Model<ICounter> {
    getNextSequence(sequenceName: string): Promise<number>;
}

const Counter: CounterModel =
    (mongoose.models.Counter as unknown as CounterModel) ||
    mongoose.model<ICounter, CounterModel>("Counter", CounterSchema);

export default Counter;
