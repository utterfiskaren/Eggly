import type { ReactNode } from "react";

/**
 * Landskapet bakom stigen i varje värld på Matteön. Allt ritas som enkla SVG-former i märkets
 * mjuka färger, och slumpen är fast per värld, så att kartan ser likadan ut varje gång.
 */

export type Kind = "tree" | "pine" | "bush" | "flower" | "cloud" | "star" | "crystal" | "mushroom" | "heart" | "bubble" | "flame" | "ghost" | "planet" | "rock" | "palm" | "sun";

export interface Theme {
  name: string;
  /** Himlens färg överst och nederst. */
  sky: [string, string];
  ground: string;
  dark: boolean;
  /** Det som växer eller svävar i världen. */
  decor: Kind[];
  c1: string;
  c2: string;
}

/** Ordningen är äggnivåernas id (TIERS-index), inte kartans ordning. */
export const THEMES: Theme[] = [
  { name: "äng", sky: ["#d8f3ff", "#e6f8d4"], ground: "#9fdc8a", dark: false, decor: ["tree", "bush", "flower", "cloud", "flower", "mushroom"], c1: "#5cbf6a", c2: "#ff8fb8" },
  { name: "is", sky: ["#e9f6ff", "#cfe8fb"], ground: "#bfe0f5", dark: false, decor: ["pine", "crystal", "cloud", "star", "pine", "rock"], c1: "#8cc9e8", c2: "#ffffff" },
  { name: "öken", sky: ["#fff3c9", "#ffdf8a"], ground: "#f4c95c", dark: false, decor: ["palm", "rock", "sun", "bush", "palm", "cloud"], c1: "#6fb760", c2: "#d79a2a" },
  { name: "himmel", sky: ["#e3f9ff", "#c4ecfa"], ground: "#bfe9f3", dark: false, decor: ["cloud", "cloud", "star", "crystal", "cloud", "bubble"], c1: "#8fd6ea", c2: "#ffffff" },
  { name: "regnbåge", sky: ["#ffe1ef", "#fff6c9"], ground: "#ffd0e4", dark: false, decor: ["cloud", "flower", "heart", "star", "cloud", "flower"], c1: "#ff7fb0", c2: "#a8d8ff" },
  { name: "slott", sky: ["#ffe6f5", "#ffc9e8"], ground: "#ffb6dd", dark: false, decor: ["heart", "tree", "star", "flower", "heart", "cloud"], c1: "#f160b5", c2: "#fff0fa" },
  { name: "natt", sky: ["#3a2a66", "#1d1338"], ground: "#2c1e4a", dark: true, decor: ["star", "pine", "star", "star", "mushroom", "rock"], c1: "#6f46bd", c2: "#ffe27a" },
  { name: "dimma", sky: ["#eef8fc", "#cfe6f0"], ground: "#d6eef8", dark: false, decor: ["ghost", "cloud", "ghost", "star", "pine", "cloud"], c1: "#a7d3e6", c2: "#ffffff" },
  { name: "vulkan", sky: ["#ffd9a0", "#ff9a5a"], ground: "#e2552a", dark: false, decor: ["flame", "rock", "flame", "rock", "star", "cloud"], c1: "#ff7a1a", c2: "#ffe27a" },
  { name: "hav", sky: ["#fffbb8", "#ffe86e"], ground: "#ffe44d", dark: false, decor: ["bubble", "bubble", "flower", "bush", "star", "bubble"], c1: "#7fdcc8", c2: "#ff9ec2" },
  { name: "djungel", sky: ["#e2f8c8", "#b9e88f"], ground: "#7fcf5e", dark: false, decor: ["palm", "bush", "tree", "mushroom", "palm", "flower"], c1: "#4e9e3a", c2: "#f6a53a" },
  { name: "godis", sky: ["#fff0fb", "#e6d8ff"], ground: "#ffcfee", dark: false, decor: ["heart", "star", "cloud", "flower", "heart", "crystal"], c1: "#c58af0", c2: "#ffb8e8" },
  { name: "himlen", sky: ["#ffffff", "#fff3c8"], ground: "#fff0b8", dark: false, decor: ["cloud", "star", "cloud", "sun", "star", "cloud"], c1: "#ffe08a", c2: "#ffffff" },
  { name: "rymd", sky: ["#4a22b0", "#120833"], ground: "#241257", dark: true, decor: ["star", "planet", "star", "star", "crystal", "planet"], c1: "#8a5cff", c2: "#ffd23f" },
];

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Item { kind: Kind; x: number; y: number; s: number; delay: number; alt: boolean }

/** Strör ut saker på sidan av stigen där det finns plats. `pathX(y)` ger stigens läge på höjden y. */
export function scatter(theme: Theme, seed: number, w: number, h: number, pathX: (y: number) => number): Item[] {
  const r = rng(seed * 7919 + 13);
  const out: Item[] = [];
  const n = Math.round(h / 58);
  for (let i = 0; i < n; i++) {
    const kind = theme.decor[Math.floor(r() * theme.decor.length)];
    const y = 40 + r() * (h - 80);
    const px = pathX(y);
    const sky = kind === "cloud" || kind === "star" || kind === "sun" || kind === "planet" || kind === "ghost" || kind === "bubble";
    const right = px < w / 2;
    const room = right ? w - px - 78 : px - 78;
    if (room < 30) continue;
    const off = 56 + r() * Math.max(0, room - 30);
    const x = right ? px + off + 16 : px - off - 16;
    out.push({ kind, x: Math.max(24, Math.min(w - 24, x)), y, s: (sky ? 0.9 : 0.8) + r() * 0.7, delay: r() * 4, alt: r() > 0.5 });
  }
  return out;
}

/** Stora mjuka kullar långt bak, så att ytan inte är platt. */
export function hills(theme: Theme, seed: number, w: number, h: number): ReactNode {
  const r = rng(seed * 31 + 5);
  const n = Math.max(3, Math.round(h / 420));
  return Array.from({ length: n }, (_, i) => {
    const cy = ((i + 0.5) / n) * h + (r() - 0.5) * 80;
    const rx = 120 + r() * 120, ry = 60 + r() * 50, cx = r() * w;
    return <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} fill={theme.ground} opacity={theme.dark ? 0.55 : 0.4} />;
  });
}

function Star({ s, c }: { s: number; c: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2, rad = i % 2 ? 4 : 10;
    return `${Math.cos(a) * rad * s},${Math.sin(a) * rad * s}`;
  }).join(" ");
  return <polygon points={pts} fill={c} />;
}

function Piece({ it, t }: { it: Item; t: Theme }) {
  const { kind, s } = it, c1 = t.c1, c2 = t.c2;
  const light = t.dark ? "#ffffff" : "#ffffff";
  switch (kind) {
    case "tree":
      return <g><rect x={-4 * s} y={-2 * s} width={8 * s} height={20 * s} rx={3} fill="#9a6a3f" /><circle cx={0} cy={-12 * s} r={18 * s} fill={c1} /><circle cx={-10 * s} cy={-4 * s} r={11 * s} fill={c1} /><circle cx={10 * s} cy={-4 * s} r={11 * s} fill={c1} /><circle cx={-5 * s} cy={-16 * s} r={5 * s} fill="#fff" opacity=".25" /></g>;
    case "pine":
      return <g><rect x={-3 * s} y={10 * s} width={6 * s} height={12 * s} fill="#8a6a4f" /><path d={`M0 ${-26 * s}L${14 * s} 0H${-14 * s}ZM0 ${-14 * s}L${18 * s} ${14 * s}H${-18 * s}Z`} fill={t.dark ? "#4a3a7a" : c1} /><path d={`M0 ${-26 * s}L${5 * s} ${-14 * s}H${-5 * s}Z`} fill="#fff" opacity=".7" /></g>;
    case "bush":
      return <g><circle cx={-9 * s} cy={0} r={10 * s} fill={c1} /><circle cx={8 * s} cy={1 * s} r={11 * s} fill={c1} /><circle cx={0} cy={-6 * s} r={11 * s} fill={c1} /><circle cx={-3 * s} cy={-9 * s} r={3 * s} fill="#fff" opacity=".3" /></g>;
    case "flower":
      return <g><rect x={-1.5} y={0} width={3} height={14 * s} fill="#5cbf6a" />{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={Math.cos((a * Math.PI) / 180) * 6 * s} cy={Math.sin((a * Math.PI) / 180) * 6 * s} r={5 * s} fill={c2} />)}<circle r={4 * s} fill="#ffd23f" /></g>;
    case "cloud":
      return <g className={it.alt ? "kl-moln" : "kl-moln kl-moln--b"} style={{ animationDelay: `${-it.delay}s` }}><ellipse cx={0} cy={0} rx={30 * s} ry={13 * s} fill={light} opacity=".92" /><circle cx={-12 * s} cy={-8 * s} r={13 * s} fill={light} opacity=".92" /><circle cx={9 * s} cy={-11 * s} r={16 * s} fill={light} opacity=".92" /></g>;
    case "star":
      return <g className="kl-blink" style={{ animationDelay: `${-it.delay}s` }}><Star s={s} c={t.dark ? "#ffe27a" : "#ffd23f"} /></g>;
    case "crystal":
      return <g><path d={`M0 ${-26 * s}L${10 * s} ${-6 * s}L${6 * s} ${12 * s}H${-6 * s}L${-10 * s} ${-6 * s}Z`} fill={c1} opacity=".9" /><path d={`M0 ${-26 * s}L${3 * s} ${-6 * s}L0 ${12 * s}L${-4 * s} ${-6 * s}Z`} fill="#fff" opacity=".45" /></g>;
    case "mushroom":
      return <g><rect x={-4 * s} y={0} width={8 * s} height={12 * s} rx={3} fill="#fff3e0" /><path d={`M${-14 * s} 2A${14 * s} ${14 * s} 0 0 1 ${14 * s} 2Z`} fill={t.dark ? c2 : "#ff7a8a"} /><circle cx={-5 * s} cy={-4 * s} r={2.5 * s} fill="#fff" /><circle cx={5 * s} cy={-6 * s} r={2 * s} fill="#fff" /></g>;
    case "heart":
      return <g className="kl-hopp" style={{ animationDelay: `${-it.delay}s` }}><path d={`M0 ${8 * s}C${-18 * s} ${-4 * s} ${-10 * s} ${-16 * s} 0 ${-7 * s}C${10 * s} ${-16 * s} ${18 * s} ${-4 * s} 0 ${8 * s}Z`} fill={c1} opacity=".85" /></g>;
    case "bubble":
      return <g className="kl-hopp" style={{ animationDelay: `${-it.delay}s` }}><circle r={10 * s} fill="#fff" opacity=".35" stroke={c1} strokeWidth="2" /><circle cx={-3 * s} cy={-3 * s} r={2.5 * s} fill="#fff" /></g>;
    case "flame":
      return <g className="kl-blink" style={{ animationDelay: `${-it.delay}s` }}><path d={`M0 ${-24 * s}C${10 * s} ${-12 * s} ${14 * s} ${-2 * s} ${8 * s} ${8 * s}C${4 * s} ${14 * s} ${-4 * s} ${14 * s} ${-8 * s} ${8 * s}C${-14 * s} ${-2 * s} ${-6 * s} ${-12 * s} 0 ${-24 * s}Z`} fill="#ff7a1a" /><path d={`M0 ${-10 * s}C${5 * s} ${-4 * s} ${6 * s} ${2 * s} 0 ${8 * s}C${-6 * s} ${2 * s} ${-5 * s} ${-4 * s} 0 ${-10 * s}Z`} fill="#ffe27a" /></g>;
    case "ghost":
      return <g className="kl-hopp" style={{ animationDelay: `${-it.delay}s` }} opacity=".85"><path d={`M${-12 * s} ${12 * s}V${-4 * s}A${12 * s} ${14 * s} 0 0 1 ${12 * s} ${-4 * s}V${12 * s}L${6 * s} ${7 * s}L0 ${12 * s}L${-6 * s} ${7 * s}Z`} fill="#fff" /><circle cx={-4 * s} cy={-3 * s} r={1.8 * s} fill="#4a3a55" /><circle cx={4 * s} cy={-3 * s} r={1.8 * s} fill="#4a3a55" /></g>;
    case "planet":
      return <g className="kl-hopp" style={{ animationDelay: `${-it.delay}s` }}><circle r={12 * s} fill={c1} /><ellipse rx={20 * s} ry={4.5 * s} fill="none" stroke={c2} strokeWidth="3" transform="rotate(-18)" /><circle cx={-4 * s} cy={-4 * s} r={3 * s} fill="#fff" opacity=".35" /></g>;
    case "rock":
      return <g><path d={`M${-14 * s} 8L${-8 * s} ${-6 * s}L${4 * s} ${-9 * s}L${14 * s} 8Z`} fill={t.dark ? "#4a3a7a" : "#b8aebd"} /><path d={`M${-8 * s} ${-6 * s}L${4 * s} ${-9 * s}L${2 * s} 0Z`} fill="#fff" opacity=".35" /></g>;
    case "palm":
      return <g><path d={`M0 ${14 * s}Q${4 * s} 0 ${2 * s} ${-18 * s}`} stroke="#9a6a3f" strokeWidth={5 * s} fill="none" strokeLinecap="round" />{[-60, -20, 20, 60, 100].map((a) => <ellipse key={a} cx={Math.cos(((a - 90) * Math.PI) / 180) * 12 * s + 2 * s} cy={Math.sin(((a - 90) * Math.PI) / 180) * 8 * s - 18 * s} rx={13 * s} ry={4.5 * s} fill={c1} transform={`rotate(${a - 90} ${2 * s} ${-18 * s})`} />)}</g>;
    case "sun":
      return <g className="kl-blink" style={{ animationDelay: `${-it.delay}s` }}><circle r={13 * s} fill="#ffd23f" />{Array.from({ length: 8 }, (_, i) => <rect key={i} x={-1.5} y={-22 * s} width={3} height={6 * s} rx={1.5} fill="#ffd23f" transform={`rotate(${i * 45})`} />)}</g>;
  }
}

export function Scenery({ theme, seed, w, h, pathX }: { theme: Theme; seed: number; w: number; h: number; pathX: (y: number) => number }) {
  const items = scatter(theme, seed, w, h, pathX);
  return (
    <>
      {hills(theme, seed, w, h)}
      {items.map((it, i) => <g key={i} transform={`translate(${it.x} ${it.y})`}><Piece it={it} t={theme} /></g>)}
    </>
  );
}
