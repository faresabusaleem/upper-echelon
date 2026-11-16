"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type StageKey = "plate" | "arena" | "directory" | "forum" | "ladder";

const PLATES: Array<{ key: StageKey; src: string; alt: string; caption: string; contain?: boolean }> = [
  {
    key: "plate",
    src: "/brand/engraving-ivory.svg",
    alt: "The Upper Echelon mark: an engraved head cut by three anatomical planes.",
    caption: "The mark. A head, cut by the three planes of anatomy.",
    contain: true,
  },
  {
    key: "arena",
    src: "/images/archive/chronoscope.webp",
    alt: "A Hipp chronoscope from about 1890 under a glass dome, on a dark wooden stand.",
    caption: "Hipp chronoscope, c. 1890. It timed human reactions to a thousandth of a second.",
  },
  {
    key: "directory",
    src: "/images/archive/cardfile.webp",
    alt: "A wall of wooden card-catalogue drawers in a library.",
    caption: "A library card file. Every drawer points somewhere else.",
  },
  {
    key: "forum",
    src: "/images/archive/socrates.webp",
    alt: "A marble head of Socrates on a plain plinth.",
    caption: "Socrates, marble. He wrote nothing down and argued with everyone.",
  },
  {
    key: "ladder",
    src: "/images/archive/staircase.webp",
    alt: "A spiral staircase seen from below, its turns rising towards a skylight.",
    caption: "A spiral stair, seen from below. Each turn a rung higher.",
  },
];

/**
 * The fixed half of the split stage. It holds one picture at a time and crossfades to the one that
 * belongs to the section in the middle of the reading column.
 */
export function LandingStage() {
  const [active, setActive] = useState<StageKey>("plate");

  useEffect(() => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-stage]"));
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.getAttribute("data-stage") as StageKey);
      },
      { rootMargin: "-48% 0px -48% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  const current = PLATES.find((p) => p.key === active) ?? PLATES[0];
  return (
    <figure className="relative h-full w-full overflow-hidden bg-raised">
      {PLATES.map((p, i) => (
        <div
          key={p.key}
          aria-hidden={p.key !== active}
          className={cn(
            "absolute inset-0 transition-opacity duration-[1400ms] ease-[var(--ease-in-out-soft)]",
            p.key === active ? "opacity-100" : "opacity-0",
          )}
        >
          <div className={cn("absolute inset-0", p.key === active && "motion-safe:animate-[drift_26s_ease-in-out_infinite_alternate]")}>
            <Image
              src={p.src}
              alt={p.alt}
              fill
              sizes="(min-width: 1024px) 47vw, 100vw"
              // The first plate is the LCP element: fetch it first. The rest wait until shown.
              fetchPriority={i === 0 ? "high" : undefined}
              loading={i === 0 ? "eager" : "lazy"}
              unoptimized={p.src.endsWith(".svg")}
              className={p.contain ? "object-contain p-[9%]" : "object-cover"}
            />
          </div>
        </div>
      ))}
      <figcaption className="absolute bottom-0 left-0 max-w-[30rem] bg-ground px-4 py-3 text-micro text-ink-2" aria-live="polite">
        {current.caption}
      </figcaption>
    </figure>
  );
}
