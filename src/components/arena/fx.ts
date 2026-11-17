"use client";

import { useMemo, useRef } from "react";
import { sfx } from "@/lib/games/sound";

/**
 * Visual feedback on the playing field, drawn with the Web Animations API so nothing re-renders:
 * a shake for a mistake, a single soft flash for a level or a lost life, and gold sparks for a
 * best. Motion is skipped when the member (or the OS) asks for reduced motion; flashes stay low in
 * intensity and never repeat rapidly.
 */
function reduced() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
}

export function shake(el: HTMLElement | null, strength = 1) {
  if (!el || reduced()) return;
  const d = 10 * strength;
  el.animate(
    [
      { transform: "translateX(0)" },
      { transform: `translateX(${-d}px)` },
      { transform: `translateX(${d * 0.85}px)` },
      { transform: `translateX(${-d * 0.55}px)` },
      { transform: `translateX(${d * 0.3}px)` },
      { transform: "translateX(0)" },
    ],
    { duration: 360, easing: "cubic-bezier(.36,.07,.19,.97)" },
  );
}

export function flash(el: HTMLElement | null, color: string, peak = 0.3, duration = 460) {
  if (!el) return;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  Object.assign(layer.style, { position: "absolute", inset: "0", background: color, pointerEvents: "none", zIndex: "5", opacity: "0" });
  el.appendChild(layer);
  const anim = layer.animate([{ opacity: 0 }, { opacity: reduced() ? peak * 0.5 : peak, offset: 0.25 }, { opacity: 0 }], { duration, easing: "ease-out" });
  anim.onfinish = () => layer.remove();
}

export function pulse(el: HTMLElement | null) {
  if (!el || reduced()) return;
  el.animate([{ transform: "scale(1)" }, { transform: "scale(1.012)" }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out" });
}

export function sparks(el: HTMLElement | null, color: string, count = 18) {
  if (!el || reduced()) return;
  const box = el.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const dot = document.createElement("span");
    dot.setAttribute("aria-hidden", "true");
    const size = 4 + Math.random() * 5;
    Object.assign(dot.style, {
      position: "absolute",
      left: `${box.width / 2}px`,
      top: `${box.height / 2}px`,
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "999px",
      background: color,
      boxShadow: `0 0 10px ${color}`,
      pointerEvents: "none",
      zIndex: "6",
    });
    el.appendChild(dot);
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * Math.min(box.width, box.height) * 0.42;
    const anim = dot.animate(
      [
        { transform: "translate(-50%, -50%) scale(1)", opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(angle) * dist}px), calc(-50% + ${Math.sin(angle) * dist}px)) scale(0.3)`, opacity: 0 },
      ],
      { duration: 650 + Math.random() * 450, easing: "cubic-bezier(.2,.8,.3,1)" },
    );
    anim.onfinish = () => dot.remove();
  }
}

/** The stage ref and the feedback a trial calls at its moments: hit, miss, a lost life, a level, the end. */
export function useArena(tint: string) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fx = useMemo(
    () => ({
      tap: () => sfx.tap(),
      tile: (i: number) => sfx.tile(i),
      hit: () => sfx.hit(),
      go: () => sfx.go(),
      start: () => sfx.start(),
      miss: () => {
        sfx.miss();
        shake(stageRef.current, 0.6);
      },
      life: () => {
        sfx.life();
        shake(stageRef.current, 1);
        flash(stageRef.current, "#c8573f", 0.3);
      },
      level: () => {
        sfx.level();
        flash(stageRef.current, tint, 0.18, 520);
        pulse(stageRef.current);
        sparks(stageRef.current, tint, 14);
      },
      over: () => {
        sfx.over();
        flash(stageRef.current, "#000000", 0.45, 700);
      },
      best: () => {
        sfx.best();
        sparks(stageRef.current, "#e7c97f", 34);
      },
      /** The trial is over: a celebration for a personal best, otherwise the closing bell. */
      end: (o: { personalBest?: boolean; invalid?: string }) => {
        if (o.personalBest && !o.invalid) {
          sfx.best();
          sparks(stageRef.current, "#e7c97f", 34);
        } else {
          sfx.over();
        }
      },
    }),
    [tint],
  );
  return { stageRef, fx };
}
