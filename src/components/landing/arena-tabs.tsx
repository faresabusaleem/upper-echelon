"use client";

import Link from "next/link";
import { useState } from "react";
import { GAMES, type GameKind } from "@/lib/games/catalog";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ label: string; games: GameKind[]; note: string }> = [
  { label: "Speed", games: ["reaction", "aim", "typing"], note: "How fast a signal becomes an act." },
  { label: "Memory", games: ["sequence", "number", "verbal"], note: "How much you can hold, and for how long." },
  { label: "Space", games: ["visual", "chimp"], note: "Where things were, after they vanish." },
];

export function ArenaTabs() {
  const [i, setI] = useState(0);
  const g = GROUPS[i];
  return (
    <div>
      <div role="tablist" aria-label="Kinds of trial" className="flex gap-6 text-[1.125rem]">
        {GROUPS.map((group, idx) => (
          <button
            key={group.label}
            role="tab"
            id={`arena-tab-${idx}`}
            aria-selected={i === idx}
            aria-controls="arena-tabpanel"
            onClick={() => setI(idx)}
            className={cn(
              "pb-1 transition-colors duration-200",
              i === idx ? "text-ink underline decoration-gold decoration-2 underline-offset-[0.45em]" : "text-muted hover:text-ink",
            )}
          >
            {group.label}
          </button>
        ))}
      </div>
      <div id="arena-tabpanel" role="tabpanel" aria-labelledby={`arena-tab-${i}`} className="mt-6">
        <p className="text-ink-2">{g.note}</p>
        <ul className="mt-4 flex flex-col">
          {g.games.map((k) => (
            <li key={k}>
              <Link
                href={`/arena/${GAMES[k].slug}`}
                className="flex items-baseline justify-between gap-4 py-2 font-display text-[1.75rem] leading-tight text-ink hover:text-gold-bright"
              >
                {GAMES[k].name}
                <span className="font-sans text-small text-muted">{GAMES[k].line}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
