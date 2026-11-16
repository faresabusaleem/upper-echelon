/**
 * Tiers and the Echelon score. The database computes the score (recompute_member in
 * supabase/migrations/20261117000700_progression.sql); this module mirrors the same formula for
 * display and tests. Documented in docs/scoring.md.
 */
export const TIERS = [
  { tier: 1, numeral: "I", name: "Initiate", threshold: 0, theme: "pewter" },
  { tier: 2, numeral: "II", name: "Associate", threshold: 100, theme: "bronze" },
  { tier: 3, numeral: "III", name: "Fellow", threshold: 250, theme: "silver" },
  { tier: 4, numeral: "IV", name: "Savant", threshold: 450, theme: "gold" },
  { tier: 5, numeral: "V", name: "Luminary", threshold: 650, theme: "platinum" },
  { tier: 6, numeral: "VI", name: "Laureate", threshold: 850, theme: "obsidian" },
] as const;

export type TierNumber = (typeof TIERS)[number]["tier"];
export type ProfileTheme = (typeof TIERS)[number]["theme"];

export const LOUNGE_TIER = 3;
export const MAX_SCORE = 1000;

export function tierInfo(tier: number) {
  return TIERS[Math.min(Math.max(Math.round(tier), 1), 6) - 1];
}

export function tierForScore(score: number): TierNumber {
  let t: TierNumber = 1;
  for (const row of TIERS) if (score >= row.threshold) t = row.tier;
  return t;
}

export function nextTier(tier: number) {
  return tier >= 6 ? null : TIERS[tier];
}

/** Mind (0–500): 5 × mean of best ratings across the eight games (unplayed games count as 0). */
export function mindScore(bestRatings: number[]): number {
  const sum = bestRatings.slice(0, 8).reduce((a, b) => a + Math.max(0, Math.min(100, b)), 0);
  return Math.round((5 * sum) / 8);
}

/** Practice (0–250): 2.5 per distinct practice day, capped at 100 days. */
export function practiceScore(days: number): number {
  return Math.round(2.5 * Math.min(Math.max(days, 0), 100));
}

/** Voice (0–250): reputation, capped. Reputation = 2 per upvote received + 15 per accepted answer. */
export function voiceScore(reputation: number): number {
  return Math.min(Math.max(reputation, 0), 250);
}

export function echelonScore(bestRatings: number[], days: number, reputation: number): number {
  return Math.min(mindScore(bestRatings) + practiceScore(days) + voiceScore(reputation), MAX_SCORE);
}

export const THEMES: Record<ProfileTheme, { label: string; accent: string; wash: string; unlock: TierNumber }> = {
  pewter: { label: "Pewter", accent: "#a7a59f", wash: "#151514", unlock: 1 },
  bronze: { label: "Bronze", accent: "#b8865b", wash: "#18130f", unlock: 2 },
  silver: { label: "Silver", accent: "#c9ccd1", wash: "#141516", unlock: 3 },
  gold: { label: "Gold", accent: "#c2a15f", wash: "#1a1610", unlock: 4 },
  platinum: { label: "Platinum", accent: "#e4e2dc", wash: "#171717", unlock: 5 },
  obsidian: { label: "Obsidian", accent: "#d6bb80", wash: "#050505", unlock: 6 },
};
