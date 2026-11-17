import type { GameKind } from "./catalog";

/**
 * Each trial has its own colour: `tint` for tiles and accents, `stage` for the playing field.
 * Chosen for Upper Echelon; every tint keeps at least 4.5:1 contrast against its stage.
 */
export const GAME_THEMES: Record<GameKind, { tint: string; stage: string; glow: string; sigil: string }> = {
  reaction: { tint: "#e8b84a", stage: "#24150f", glow: "rgba(232,184,74,0.5)", sigil: "bolt" },
  sequence: { tint: "#8f9cf4", stage: "#151a34", glow: "rgba(143,156,244,0.45)", sigil: "path" },
  aim: { tint: "#5cc9ae", stage: "#0e2724", glow: "rgba(92,201,174,0.45)", sigil: "target" },
  number: { tint: "#cf97ec", stage: "#22142c", glow: "rgba(207,151,236,0.45)", sigil: "hash" },
  verbal: { tint: "#ee8aa4", stage: "#2a121b", glow: "rgba(238,138,164,0.45)", sigil: "scroll" },
  chimp: { tint: "#8ccf75", stage: "#132412", glow: "rgba(140,207,117,0.45)", sigil: "dice" },
  visual: { tint: "#67b9ef", stage: "#0f1f2e", glow: "rgba(103,185,239,0.45)", sigil: "grid" },
  typing: { tint: "#e2ddcf", stage: "#1c1c22", glow: "rgba(226,221,207,0.35)", sigil: "keys" },
};
