export const DIFFICULTY: Record<string, string> = {
  moderate: "Moderate",
  hard: "Hard",
  very_hard: "Very hard",
  extreme: "Extreme",
};

export const SCALES: Record<string, string> = {
  iq15: "IQ, SD 15",
  iq16: "IQ, SD 16",
  iq24: "IQ, SD 24",
  raw: "Raw score",
  percentile: "Percentile",
};

export function defaultScale(scoreScale: string): keyof typeof SCALES {
  const s = scoreScale.toLowerCase();
  if (s.includes("raw")) return "raw";
  if (s.includes("24")) return "iq24";
  if (s.includes("16")) return "iq16";
  return "iq15";
}
