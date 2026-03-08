import mongoose, { Schema, Model, Document } from "mongoose";
import bcrypt from "bcryptjs";
import type { IUser, IAddress } from "@/types";

// ─── Address Sub-Schema ────────────────────────────────
const AddressSchema = new Schema<IAddress>(
    {
        fullName: { type: String, required: true, trim: true },
        line1: { type: String, required: true, trim: true },
        line2: { type: String, trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        postalCode: { type: String, required: true, trim: true },
        country: { type: String, required: true, trim: true },
        phone: { type: String, required: true, trim: true },
    },
    { _id: false }
);

export { AddressSchema };

// ─── User Schema ───────────────────────────────────────
export interface IUserDocument extends Omit<IUser, "_id">, Document {
    comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUserDocument>(
    {
        name: {
            type: String,
            required: [true, "Name is required"],
            trim: true,
            maxlength: [100, "Name cannot exceed 100 characters"],
        },
        email: {
            type: String,
            required: [true, "Email is required"],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"],
        },
        passwordHash: {
            type: String,
            select: false, // Never returned in queries by default
        },
        role: {
            type: String,
            enum: ["customer", "admin"],
            default: "customer",
        },
        image: { type: String },
        emailVerified: { type: Date },
        verificationToken: { type: String, select: false },
        verificationTokenExpires: { type: Date, select: false },
        resetPasswordToken: { type: String, select: false },
        resetPasswordTokenExpires: { type: Date, select: false },
        addresses: {
            type: [AddressSchema],
            default: [],
            validate: {
                validator: (v: IAddress[]) => v.length <= 5,
                message: "Cannot have more than 5 saved addresses",
            },
        },
    },
    {
        timestamps: true,
        toJSON: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            transform(_doc, ret: any) {
                delete ret.passwordHash;
                delete ret.verificationToken;
                delete ret.verificationTokenExpires;
                delete ret.resetPasswordToken;
                delete ret.resetPasswordTokenExpires;
                delete ret.__v;
                return ret;
            },
        },
    }
);

// ─── Indexes ───────────────────────────────────────────
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

// ─── Instance Methods ──────────────────────────────────
UserSchema.methods.comparePassword = async function (
    candidatePassword: string
): Promise<boolean> {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidatePassword, this.passwordHash);
};

// ─── Static helper: hash password before save ──────────
UserSchema.statics.hashPassword = async function (
    password: string
): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
};

export interface UserModel extends Model<IUserDocument> {
    hashPassword(password: string): Promise<string>;
}

const User: UserModel =
    (mongoose.models.User as UserModel) ||
    mongoose.model<IUserDocument, UserModel>("User", UserSchema);

export default User;
