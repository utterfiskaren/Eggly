"use client";

import { useEffect } from "react";

/** Rullar kartan så att steget barnet är på syns direkt. */
export function ScrollToCurrent() {
  useEffect(() => {
    const el = document.getElementById("steg-nu");
    if (el) el.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, []);
  return null;
}
