import { describe, expect, it } from "vitest";
import {
  CHIMP_MAX,
  aimTarget,
  checkSequenceInput,
  chimpLayout,
  extendSequence,
  mulberry32,
  nextVerbalWord,
  numberDisplayMs,
  randomDigits,
  reactionDelay,
  reactionScore,
  typingCorrect,
  typingStats,
  visualGridSize,
  visualPattern,
  visualTileCount,
} from "@/lib/games/engine";
import { WORDS } from "@/lib/games/words";

describe("reaction time", () => {
  it("waits between 1.5 and 4.5 seconds", () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 500; i++) {
      const d = reactionDelay(rng);
      expect(d).toBeGreaterThanOrEqual(1500);
      expect(d).toBeLessThanOrEqual(4500);
    }
  });
  it("scores the rounded average of the attempts", () => {
    expect(reactionScore([200, 210, 220, 230, 241])).toBe(220);
  });
});

describe("sequence memory", () => {
  it("grows by exactly one tile within the 3×3 grid", () => {
    const rng = mulberry32(7);
    let seq: number[] = [];
    for (let i = 1; i <= 20; i++) {
      seq = extendSequence(seq, rng);
      expect(seq).toHaveLength(i);
      expect(seq.at(-1)).toBeGreaterThanOrEqual(0);
      expect(seq.at(-1)).toBeLessThanOrEqual(8);
    }
  });
  it("judges inputs in order", () => {
    expect(checkSequenceInput([3, 1, 4], [3])).toBe("continue");
    expect(checkSequenceInput([3, 1, 4], [3, 1, 4])).toBe("complete");
    expect(checkSequenceInput([3, 1, 4], [3, 2])).toBe("wrong");
  });
});

describe("aim trainer", () => {
  it("keeps targets inside the field and away from the last one", () => {
    const rng = mulberry32(3);
    let prev: { x: number; y: number } | undefined;
    for (let i = 0; i < 200; i++) {
      const t = aimTarget(800, 500, 30, rng, prev);
      expect(t.x).toBeGreaterThanOrEqual(36);
      expect(t.x).toBeLessThanOrEqual(764);
      expect(t.y).toBeGreaterThanOrEqual(36);
      expect(t.y).toBeLessThanOrEqual(464);
      prev = t;
    }
  });
});

describe("number memory", () => {
  it("generates numbers of the requested length without a leading zero", () => {
    const rng = mulberry32(11);
    for (let n = 1; n <= 30; n++) {
      const s = randomDigits(n, rng);
      expect(s).toHaveLength(n);
      expect(s[0]).not.toBe("0");
      expect(s).toMatch(/^\d+$/);
    }
  });
  it("shows longer numbers for longer", () => {
    expect(numberDisplayMs(10)).toBeGreaterThan(numberDisplayMs(3));
  });
});

describe("verbal memory", () => {
  it("has a large pool of unique words", () => {
    expect(WORDS.length).toBeGreaterThan(400);
    expect(new Set(WORDS).size).toBe(WORDS.length);
  });
  it("offers only new words until three have been seen", () => {
    const rng = mulberry32(5);
    const seen: string[] = [];
    for (let i = 0; i < 3; i++) {
      const next = nextVerbalWord(WORDS, seen, seen.at(-1) ?? null, rng);
      expect(next.isSeen).toBe(false);
      expect(seen).not.toContain(next.word);
      seen.push(next.word);
    }
  });
  it("never repeats the previous word immediately and labels seen words honestly", () => {
    const rng = mulberry32(9);
    const seen: string[] = [];
    let last: string | null = null;
    for (let i = 0; i < 300; i++) {
      const next = nextVerbalWord(WORDS, seen, last, rng);
      expect(next.word).not.toBe(last);
      expect(next.isSeen).toBe(seen.includes(next.word));
      if (!next.isSeen) seen.push(next.word);
      last = next.word;
    }
  });
});

describe("chimp test", () => {
  it("places distinct numbers inside the field", () => {
    const rng = mulberry32(2);
    for (let n = 4; n <= CHIMP_MAX; n++) {
      const cells = chimpLayout(n, rng);
      expect(cells).toHaveLength(n);
      expect(new Set(cells).size).toBe(n);
      cells.forEach((c) => expect(c).toBeLessThan(CHIMP_MAX));
    }
  });
});

describe("visual memory", () => {
  it("starts with three tiles on a 3×3 grid and grows", () => {
    expect(visualGridSize(1)).toBe(3);
    expect(visualTileCount(1)).toBe(3);
    expect(visualGridSize(4)).toBe(4);
    expect(visualGridSize(100)).toBe(8);
  });
  it("lights the right number of distinct tiles", () => {
    const rng = mulberry32(4);
    for (let l = 1; l <= 30; l++) {
      const p = visualPattern(l, rng);
      expect(p.size).toBe(Math.min(visualTileCount(l), visualGridSize(l) ** 2));
      for (const c of p) expect(c).toBeLessThan(visualGridSize(l) ** 2);
    }
  });
});

describe("typing", () => {
  it("computes gross, accuracy and net words per minute", () => {
    // 300 characters in one minute = 60 gross WPM; 270 correct = 90% accuracy → 54 net.
    expect(typingStats(300, 270, 60_000)).toEqual({ grossWpm: 60, accuracy: 0.9, netWpm: 54 });
  });
  it("handles empty input", () => {
    expect(typingStats(0, 0, 1000).netWpm).toBe(0);
  });
  it("counts correct characters position by position", () => {
    expect(typingCorrect("hello world", "hellp world")).toBe(10);
  });
});
