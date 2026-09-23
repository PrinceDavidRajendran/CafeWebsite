import { z } from "zod";

const usernameField = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Invalid credentials")
  .max(50, "Invalid credentials");

const passwordField = z
  .string()
  .min(1, "Invalid credentials")
  .max(100, "Invalid credentials");

export const loginSchema = z.object({
  username: usernameField,
  password: passwordField,
});

export const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9._-]+$/, "Username contains invalid characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters"),
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be at most 60 characters"),
  role: z.enum(["admin", "waiter"]),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(60, "Name must be at most 60 characters")
    .optional(),
  role: z.enum(["admin", "waiter"]).optional(),
  active: z.boolean().optional(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be at most 100 characters")
    .optional(),
});

export function safeParse(schema, data) {
  return schema.safeParse(data);
}

export function safeParseLogin(data) {
  return loginSchema.safeParse(data);
}

export function safeParseCreateUser(data) {
  return createUserSchema.safeParse(data);
}

export function safeParseUpdateUser(data) {
  return updateUserSchema.safeParse(data);
}
