import { describe, expect, it } from "vitest";
import { echelonScore, mindScore, nextTier, practiceScore, tierForScore, tierInfo, voiceScore, TIERS } from "@/lib/tiers";
import { safeNext, slugify, timeAgo, ordinal, initials } from "@/lib/utils";
import { toActionError } from "@/lib/errors";

describe("Echelon score", () => {
  it("weights Mind as 5 × the mean best rating across eight games", () => {
    expect(mindScore([100, 100, 100, 100, 100, 100, 100, 100])).toBe(500);
    expect(mindScore([80])).toBe(50);
    expect(mindScore([])).toBe(0);
  });
  it("caps Practice at 100 days and Voice at 250", () => {
    expect(practiceScore(10)).toBe(25);
    expect(practiceScore(500)).toBe(250);
    expect(voiceScore(1000)).toBe(250);
    expect(voiceScore(-5)).toBe(0);
  });
  it("sums to at most 1000", () => {
    expect(echelonScore(Array(8).fill(100), 100, 250)).toBe(1000);
    expect(echelonScore(Array(8).fill(50), 10, 0)).toBe(275);
  });
  it("maps scores to the six tiers at the documented thresholds", () => {
    expect(tierForScore(0)).toBe(1);
    expect(tierForScore(99)).toBe(1);
    expect(tierForScore(100)).toBe(2);
    expect(tierForScore(250)).toBe(3);
    expect(tierForScore(449)).toBe(3);
    expect(tierForScore(450)).toBe(4);
    expect(tierForScore(650)).toBe(5);
    expect(tierForScore(850)).toBe(6);
    expect(tierForScore(1000)).toBe(6);
    expect(TIERS.map((t) => t.name)).toEqual(["Initiate", "Associate", "Fellow", "Savant", "Luminary", "Laureate"]);
  });
  it("knows the next tier", () => {
    expect(nextTier(1)?.name).toBe("Associate");
    expect(nextTier(6)).toBeNull();
    expect(tierInfo(9).name).toBe("Laureate");
  });
});

describe("utilities", () => {
  it("only allows same-site redirects", () => {
    expect(safeNext("/forum")).toBe("/forum");
    expect(safeNext("//evil.example")).toBe("/home");
    expect(safeNext("https://evil.example")).toBe("/home");
    expect(safeNext("/\\evil")).toBe("/home");
    expect(safeNext(null, "/x")).toBe("/x");
  });
  it("slugifies titles", () => {
    expect(slugify("Is IQ Stable Across a Lifetime?")).toBe("is-iq-stable-across-a-lifetime");
    expect(slugify("Ünïcödé — Tést")).toBe("unicode-test");
    expect(slugify("???")).toBe("thread");
  });
  it("describes time and ordinals", () => {
    const now = Date.UTC(2026, 10, 17, 12);
    expect(timeAgo(new Date(now - 10_000), now)).toBe("just now");
    expect(timeAgo(new Date(now - 3 * 3600_000), now)).toBe("3 hours ago");
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(23)).toBe("23rd");
    expect(initials("Ada Lovelace")).toBe("AL");
  });
  it("maps database errors to calm messages", () => {
    expect(toActionError({ code: "UE429", message: "rate_limited", hint: "600" })).toMatchObject({
      kind: "rate_limited",
      message: expect.stringContaining("10 minutes"),
    });
    expect(toActionError({ code: "UE403", message: "This thread is locked." }).message).toBe("This thread is locked.");
    expect(toActionError({ code: "42501", message: "permission denied for table x" }).kind).toBe("forbidden");
    expect(toActionError({ code: "XX000", message: "internal detail" }).message).not.toContain("internal");
  });
});
