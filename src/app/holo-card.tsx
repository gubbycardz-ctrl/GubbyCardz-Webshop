"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";

/**
 * Tilts towards the mouse and lets a holographic shine follow it (styles: `.holo-card` in globals.css).
 * Touch screens and "reduce motion" settings get a still card, so nothing moves without being asked to.
 */
export function HoloCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  function follow(event: PointerEvent<HTMLDivElement>) {
    const card = ref.current;
    if (!card || event.pointerType !== "mouse") return;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty("--rx", `${((0.5 - y) * 10).toFixed(2)}deg`);
    card.style.setProperty("--ry", `${((x - 0.5) * 12).toFixed(2)}deg`);
    card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  }

  function release() {
    const card = ref.current;
    if (!card) return;
    for (const name of ["--rx", "--ry", "--mx", "--my"]) card.style.removeProperty(name);
  }

  return (
    <div ref={ref} onPointerMove={follow} onPointerLeave={release} className={`holo-card ${className}`}>
      {children}
    </div>
  );
}
