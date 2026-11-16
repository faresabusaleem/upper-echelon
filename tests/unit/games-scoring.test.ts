import { describe, expect, it } from "vitest";
import { GAME_KINDS, GAMES, dailyGame, formatScore, gameBySlug, isBetter, rateScore } from "@/lib/games/catalog";
import { evaluate, minimumDurationMs } from "@/lib/games/validate";
import { PASSAGES } from "@/lib/games/passages";
import { REACTION_CEILING } from "@/lib/games/engine";

describe("catalogue", () => {
  it("defines all eight games with unique slugs", () => {
    expect(GAME_KINDS).toHaveLength(8);
    const slugs = GAME_KINDS.map((k) => GAMES[k].slug);
    expect(new Set(slugs).size).toBe(8);
    for (const s of slugs) expect(gameBySlug(s)?.slug).toBe(s);
  });
  it("has monotonic rating anchors from 0 to 100", () => {
    for (const k of GAME_KINDS) {
      const a = GAMES[k].anchors;
      for (let i = 1; i < a.length; i++) expect(a[i][0]).toBeGreaterThan(a[i - 1][0]);
      const ratings = a.map(([, r]) => r);
      const sorted = GAMES[k].lowerIsBetter ? [...ratings].sort((x, y) => y - x) : [...ratings].sort((x, y) => x - y);
      expect(ratings).toEqual(sorted);
      expect(Math.min(...ratings)).toBe(0);
      expect(Math.max(...ratings)).toBe(100);
    }
  });
  it("rates by interpolation and clamps", () => {
    expect(rateScore("reaction", 100)).toBe(100);
    expect(rateScore("reaction", 9999)).toBe(0);
    expect(rateScore("reaction", 237.5)).toBe(65);
    expect(rateScore("number", 8)).toBe(52);
    expect(rateScore("typing", 0)).toBe(0);
  });
  it("knows which direction is better", () => {
    expect(isBetter("reaction", 200, 250)).toBe(true);
    expect(isBetter("reaction", 260, 250)).toBe(false);
    expect(isBetter("sequence", 12, 11)).toBe(true);
    expect(isBetter("sequence", 12, null)).toBe(true);
  });
  it("formats scores with units", () => {
    expect(formatScore("reaction", 231.4)).toBe("231 ms");
    expect(formatScore("typing", 88)).toBe("88 wpm");
  });
  it("rotates the daily game through all eight, matching the database", () => {
    expect(dailyGame(new Date(Date.UTC(2026, 0, 1)))).toBe("reaction");
    expect(dailyGame(new Date(Date.UTC(2026, 0, 2)))).toBe("sequence");
    expect(dailyGame(new Date(Date.UTC(2026, 0, 9)))).toBe("reaction");
    expect(dailyGame(new Date(Date.UTC(2025, 11, 31)))).toBe("typing");
    const week = new Set(Array.from({ length: 8 }, (_, i) => dailyGame(new Date(Date.UTC(2026, 10, 1 + i)))));
    expect(week.size).toBe(8);
  });
});

describe("anti-cheat evaluation", () => {
  const slow = 10 * 60_000;

  it("recomputes the reaction score from raw attempts", () => {
    const r = evaluate("reaction", { times: [220, 230, 240, 250, 260] }, slow);
    expect(r).toMatchObject({ ok: true, score: 240, flagged: false });
  });
  it("flags impossible reaction attempts", () => {
    const r = evaluate("reaction", { times: [60, 70, 80, 90, 95] }, slow);
    expect(r.ok && r.flagged).toBe(true);
  });
  it("flags a run that finished faster than the trial can physically run", () => {
    const r = evaluate("reaction", { times: [220, 230, 240, 250, 260] }, 2000);
    expect(r.ok && r.flagged).toBe(true);
    expect(r.ok && r.reason).toContain("faster than the trial");
  });
  it("rejects reaction attempts over the ceiling, which the game voids before they are kept", () => {
    expect(evaluate("reaction", { times: [220, 230, 240, 250, REACTION_CEILING] }, slow).ok).toBe(true);
    expect(evaluate("reaction", { times: [220, 230, 240, 250, REACTION_CEILING + 1] }, slow).ok).toBe(false);
  });
  it("rejects malformed payloads", () => {
    expect(evaluate("reaction", { times: [200, 200] }, slow).ok).toBe(false);
    expect(evaluate("sequence", { level: -1 }, slow).ok).toBe(false);
    expect(evaluate("chimp", { numbers: 999 }, slow).ok).toBe(false);
    expect(evaluate("aim", "nonsense", slow).ok).toBe(false);
  });
  it("flags implausibly long memory spans", () => {
    const r = evaluate("number", { digits: 80 }, 60 * 60_000);
    expect(r.ok && r.flagged).toBe(true);
  });
  it("accepts an ordinary sequence run with enough elapsed time", () => {
    const level = 12;
    const r = evaluate("sequence", { level }, minimumDurationMs("sequence", { level }) + 5000);
    expect(r).toMatchObject({ ok: true, score: 12, flagged: false });
  });
  it("scores typing as net WPM from raw counts", () => {
    const p = PASSAGES[0];
    const r = evaluate("typing", { passageId: p.id, typed: p.text.length, correct: p.text.length, durationMs: 40_000 }, 45_000);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.score).toBe(Math.round(p.text.length / 5 / (40 / 60)));
      expect(r.flagged).toBe(false);
    }
  });
  it("rejects typing results that do not match the passage", () => {
    const p = PASSAGES[0];
    expect(evaluate("typing", { passageId: "nope", typed: 100, correct: 100, durationMs: 30_000 }, 40_000).ok).toBe(false);
    expect(evaluate("typing", { passageId: p.id, typed: 50, correct: 60, durationMs: 30_000 }, 40_000).ok).toBe(false);
  });
  it("flags superhuman typing", () => {
    const p = PASSAGES[0];
    const r = evaluate("typing", { passageId: p.id, typed: p.text.length, correct: p.text.length, durationMs: 4000 }, 5000);
    expect(r.ok && r.flagged).toBe(true);
  });
});
