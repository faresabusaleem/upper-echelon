"use client";

import dynamic from "next/dynamic";
import type { GameKind } from "@/lib/games/catalog";
import { Skeleton } from "@/components/ui/skeleton";

const loading = () => <Skeleton className="min-h-[min(68svh,40rem)] w-full" />;

const COMPONENTS = {
  reaction: dynamic(() => import("./games/reaction").then((m) => m.ReactionGame), { loading }),
  sequence: dynamic(() => import("./games/sequence").then((m) => m.SequenceGame), { loading }),
  aim: dynamic(() => import("./games/aim").then((m) => m.AimGame), { loading }),
  number: dynamic(() => import("./games/number").then((m) => m.NumberGame), { loading }),
  verbal: dynamic(() => import("./games/verbal").then((m) => m.VerbalGame), { loading }),
  chimp: dynamic(() => import("./games/chimp").then((m) => m.ChimpGame), { loading }),
  visual: dynamic(() => import("./games/visual").then((m) => m.VisualGame), { loading }),
  typing: dynamic(() => import("./games/typing").then((m) => m.TypingGame), { loading }),
} satisfies Record<GameKind, React.ComponentType<{ isMember: boolean }>>;

export function GamePlayer({ kind, isMember }: { kind: GameKind; isMember: boolean }) {
  const Game = COMPONENTS[kind];
  return <Game isMember={isMember} />;
}
