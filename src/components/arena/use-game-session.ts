"use client";

import { useCallback, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/client";
import { type GameKind, isBetter } from "@/lib/games/catalog";
import { evaluate } from "@/lib/games/validate";

export type GameOutcome = {
  score: number;
  rating: number;
  percentile: number | null;
  population: number;
  saved: boolean;
  flagged: boolean;
  personalBest: boolean;
  previousBest: number | null;
  streak: number;
  isDaily: boolean;
  tierBefore: number | null;
  tier: number | null;
  details: Record<string, unknown>;
  error?: string;
  rateLimited?: boolean;
};

/**
 * Connects a game to the server. Members get a single-use session when a trial starts; the raw
 * observations are submitted when it ends and the server computes the official score. Guests play
 * the same game and see their percentile, but nothing is stored.
 */
export function useGameSession(kind: GameKind, isMember: boolean) {
  const sessionRef = useRef<string | null>(null);
  const startedAt = useRef<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const begin = useCallback(async () => {
    startedAt.current = performance.now();
    sessionRef.current = null;
    if (!isMember) return;
    try {
      const res = await fetch("/api/games/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game: kind }),
      });
      if (res.ok) sessionRef.current = (await res.json()).sessionId;
    } catch {
      sessionRef.current = null;
    }
  }, [isMember, kind]);

  const finish = useCallback(
    async (details: Record<string, unknown>, guestBest?: number | null): Promise<GameOutcome> => {
      setSubmitting(true);
      const elapsed = performance.now() - startedAt.current;
      const local = evaluate(kind, details, elapsed);
      const base: GameOutcome = {
        score: local.ok ? local.score : 0,
        rating: local.ok ? local.rating : 0,
        percentile: null,
        population: 0,
        saved: false,
        flagged: local.ok ? local.flagged : false,
        personalBest: false,
        previousBest: null,
        streak: 0,
        isDaily: false,
        tierBefore: null,
        tier: null,
        details: local.ok ? local.details : details,
      };
      try {
        if (isMember && sessionRef.current) {
          const res = await fetch("/api/games/submit", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ sessionId: sessionRef.current, game: kind, details }),
          });
          sessionRef.current = null;
          const body = await res.json().catch(() => ({}));
          if (res.ok && body.ok) {
            return {
              ...base,
              score: body.score,
              rating: body.rating,
              percentile: body.percentile,
              population: body.population,
              saved: true,
              flagged: body.flagged,
              personalBest: body.personalBest,
              previousBest: body.previousBest,
              streak: body.streak,
              isDaily: body.isDaily,
              tierBefore: body.tierBefore,
              tier: body.tier,
            };
          }
          base.error = body.message ?? "The result could not be saved.";
          base.rateLimited = res.status === 429;
        } else if (isMember) {
          base.error = "The connection dropped when the trial began, so this result could not be saved.";
        }
        const supabase = getBrowserClient();
        const [{ data: pct }, { data: pop }] = await Promise.all([
          supabase.rpc("game_percentile", { g: kind, s: base.score }),
          supabase.rpc("game_population", { g: kind }),
        ]);
        base.percentile = pct == null ? null : Number(pct);
        base.population = pop ?? 0;
        if (!isMember) base.personalBest = isBetter(kind, base.score, guestBest ?? null) && guestBest != null;
      } catch {
        // Offline: the local score still stands.
      } finally {
        setSubmitting(false);
      }
      return base;
    },
    [isMember, kind],
  );

  return { begin, finish, submitting };
}
