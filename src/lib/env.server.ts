import "server-only";
import { z } from "zod";

/** Server-only secrets. Never import this file from a Client Component. */
const serverSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(10),
  TURNSTILE_SECRET_KEY: z.string().default("1x0000000000000000000000000000000AA"),
  CRON_SECRET: z.string().min(16).optional(),
  IP_HASH_SALT: z.string().min(8).default("upper-echelon-local-salt"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.enum(["true", "false"]).optional(),
  EMAIL_FROM: z.string().default("Upper Echelon <no-reply@localhost>"),
  CONTACT_EMAIL: z.string().optional(),
});

export const serverEnv = serverSchema.parse({
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  TURNSTILE_SECRET_KEY: process.env.TURNSTILE_SECRET_KEY || undefined,
  CRON_SECRET: process.env.CRON_SECRET || undefined,
  IP_HASH_SALT: process.env.IP_HASH_SALT || undefined,
  SMTP_HOST: process.env.SMTP_HOST || undefined,
  SMTP_PORT: process.env.SMTP_PORT || undefined,
  SMTP_USER: process.env.SMTP_USER || undefined,
  SMTP_PASS: process.env.SMTP_PASS || undefined,
  SMTP_SECURE: process.env.SMTP_SECURE || undefined,
  EMAIL_FROM: process.env.EMAIL_FROM || undefined,
  CONTACT_EMAIL: process.env.CONTACT_EMAIL || undefined,
});
