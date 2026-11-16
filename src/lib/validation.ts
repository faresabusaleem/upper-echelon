import { z } from "zod";

export const INTERESTS = [
  "Psychometrics",
  "Mathematics",
  "Logic",
  "Puzzles",
  "Philosophy",
  "Physics",
  "Biology",
  "Neuroscience",
  "Psychology",
  "Computer science",
  "Economics",
  "History",
  "Literature",
  "Languages",
  "Writing",
  "Chess",
  "Strategy games",
  "Memory sports",
  "Music",
  "Art",
] as const;

export const MIN_AGE = 13;

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "At least 3 characters.")
  .max(20, "At most 20 characters.")
  .regex(/^[A-Za-z0-9_]+$/, "Letters, numbers and underscores only.");

export const displayNameSchema = z.string().trim().min(1, "Choose a name to be known by.").max(40, "At most 40 characters.");

export const emailSchema = z.email("Enter a valid email address.").max(254);

export const passwordSchema = z
  .string()
  .min(10, "At least 10 characters.")
  .max(72, "At most 72 characters.")
  .regex(/[A-Za-z]/, "Include at least one letter.")
  .regex(/\d/, "Include at least one number.");

/** Age in whole years on `today` (UTC). */
export function ageOn(dob: Date, today = new Date()): number {
  let age = today.getUTCFullYear() - dob.getUTCFullYear();
  const m = today.getUTCMonth() - dob.getUTCMonth();
  if (m < 0 || (m === 0 && today.getUTCDate() < dob.getUTCDate())) age--;
  return age;
}

export const dobSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth.")
  .refine((v) => {
    const d = new Date(`${v}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.getUTCFullYear() >= 1900 && d.getTime() < Date.now();
  }, "Enter a real date of birth.")
  .refine((v) => ageOn(new Date(`${v}T00:00:00Z`)) >= MIN_AGE, `Members must be at least ${MIN_AGE} years old.`);

export const interestsSchema = z.array(z.enum(INTERESTS)).max(12, "Choose up to twelve.");

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    out[key] ??= issue.message;
  }
  return out;
}
