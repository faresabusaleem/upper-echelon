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

type ServerEnv = z.infer<typeof serverSchema>;
type Key = keyof ServerEnv;
const cache = new Map<Key, unknown>();

/** Names other tools use for the same value (the Supabase–Vercel integration may sync the older one). */
const ALIASES: Partial<Record<Key, string>> = { SUPABASE_SECRET_KEY: "SUPABASE_SERVICE_ROLE_KEY" };

function read(key: Key): unknown {
  if (!cache.has(key)) {
    const alias = ALIASES[key];
    // Empty strings count as unset, so defaults apply when a variable exists but is blank.
    const raw = process.env[key] || (alias ? process.env[alias] : undefined) || undefined;
    cache.set(key, serverSchema.shape[key].parse(raw));
  }
  return cache.get(key);
}

/**
 * Each secret is validated on first use, one at a time: builds and public pages work before every
 * secret is configured, and a missing key only fails the code that actually needs it.
 */
export const serverEnv = new Proxy({} as ServerEnv, {
  get: (_target, key) => (typeof key === "string" && key in serverSchema.shape ? read(key as Key) : undefined),
});
