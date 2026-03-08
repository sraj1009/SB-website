import { z } from "zod";

export const userRegisterSchema = z.object({
    name: z
        .string()
        .min(1, "Name is required")
        .max(100, "Name cannot exceed 100 characters")
        .trim(),
    email: z
        .string()
        .min(1, "Email is required")
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password cannot exceed 128 characters")
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            "Password must contain at least one uppercase letter, one lowercase letter, and one number"
        ),
});

export const userLoginSchema = z.object({
    email: z
        .string()
        .min(1, "Email is required")
        .email("Invalid email address")
        .toLowerCase()
        .trim(),
    password: z.string().min(1, "Password is required"),
});

export type UserRegisterInput = z.infer<typeof userRegisterSchema>;
export type UserLoginInput = z.infer<typeof userLoginSchema>;
