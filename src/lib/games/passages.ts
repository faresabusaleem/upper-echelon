/**
 * Typing passages, written for Upper Echelon. Plain ASCII punctuation so every keyboard can
 * reproduce them exactly.
 */
export const PASSAGES = [
  {
    id: "p01",
    text: "A good question is worth more than a quick answer. It narrows the world to the part that matters, and then it waits, patiently, for you to notice what you had not seen before.",
  },
  {
    id: "p02",
    text: "Measure twice, they say, and cut once. The same is true of thought: the careful mind checks its work before it speaks, and is rarely embarrassed by what it has said.",
  },
  {
    id: "p03",
    text: "The clock in the old laboratory could divide a second into a thousand parts. Its makers wanted to know how long it takes a person to see, to decide, and to move.",
  },
  {
    id: "p04",
    text: "Memory is not a vault but a workshop. Each time we recall something we rebuild it, and each rebuilding leaves a mark. Practice makes the paths familiar and the work light.",
  },
  {
    id: "p05",
    text: "Every map leaves something out. That is not its failure but its purpose. To understand a place, decide first what you are trying to find, then draw only what helps you find it.",
  },
  {
    id: "p06",
    text: "Patience is a kind of speed. The person who waits for the right moment often arrives before the one who rushes, because there is nothing to undo and nothing to repeat.",
  },
  {
    id: "p07",
    text: "In a quiet room the smallest sounds become clear: the turn of a page, a pencil on paper, the slow breath of someone close to a solution. Attention is the oldest instrument we own.",
  },
  {
    id: "p08",
    text: "A proof is a promise kept. It says that if you accept these few things, you must accept this one as well, and it leaves no gap through which a doubt can slip unnoticed.",
  },
  {
    id: "p09",
    text: "The best arguments are built to be attacked. State the strongest version of the view you reject, answer it fairly, and only then claim that you have earned your conclusion.",
  },
  {
    id: "p10",
    text: "Some problems yield to force and some to rest. When a puzzle refuses to move, walk away from it for an hour. You may find that it has quietly solved itself in your absence.",
  },
] as const;

export type PassageId = (typeof PASSAGES)[number]["id"];

export function passageById(id: string) {
  return PASSAGES.find((p) => p.id === id);
}
