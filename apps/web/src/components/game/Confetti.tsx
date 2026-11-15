"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#ff6fa5", "#ffc93c", "#3cc6a0", "#6c8cff", "#b57cff", "#ff8a4c"];

/** Konfetti över skärmen i ett par sekunder. Hoppas över om barnet valt «minska rörelse». */
export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const w = (cv.width = window.innerWidth), h = (cv.height = window.innerHeight);
    const bits = Array.from({ length: 90 }, (_, i) => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.3, y: h * 0.35,
      vx: (Math.random() - 0.5) * 11, vy: -Math.random() * 11 - 3,
      s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COLORS[i % COLORS.length],
    }));
    let frame = 0, raf = 0;
    const tick = () => {
      g.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.vy += 0.32; b.x += b.vx; b.y += b.vy; b.r += b.vr; b.vx *= 0.99;
        g.save(); g.translate(b.x, b.y); g.rotate(b.r); g.fillStyle = b.c; g.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); g.restore();
      }
      if (++frame < 150) raf = requestAnimationFrame(tick); else g.clearRect(0, 0, w, h);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-full w-full" />;
}
