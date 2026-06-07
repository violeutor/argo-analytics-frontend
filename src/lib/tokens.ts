// ─────────────────────────────────────────────────────────────────────────────
// Argo Design Tokens — Single Source of Truth (GLOBALS-MIGRATION-01, S59)
//
// Referenz-Design: MarketingLanding.tsx. Diese Datei hält die Navy-Graphite-Palette
// + Archivo / Manrope / IBM Plex Mono an EINER Stelle. page.tsx und ResultState.tsx
// beziehen Farben + Fonts ausschließlich hieraus — kein zweites :root, kein zweites
// C-Objekt mehr. Damit driften die App-Shell und die Company-Detail-Ansicht nicht
// mehr auseinander.
//
//   • ResultState.tsx  → import { C }            (camelCase, für Inline-Styles)
//   • page.tsx         → import { ROOT_VARS, FONT_IMPORT }  (für den :root-Block)
//   • layout.tsx       → import { C }            (Body-Hintergrund)
//
// Werte sind byte-identisch zu MarketingLandings --ml-* Palette, damit alle drei
// Flächen exakt gleich aussehen. (Folge-Ticket: MarketingLanding selbst auf diese
// SSOT umstellen — derzeit hält sie ihre eigene .ml-root-Kopie mit denselben Werten.)
// ─────────────────────────────────────────────────────────────────────────────

// ── Geteilte Skalar-Palette (jeder Wert genau einmal definiert) ───────────────
const PALETTE = {
  bg:      "#0D1117",   // --ml-bg
  bgCard:  "#161B22",   // --ml-card
  bgHover: "#1F242C",   // --ml-elev
  border:  "#262C36",   // --ml-border  (vorher rgba(45,51,59,…) → an ML angeglichen)
  teal:    "#00C2D1",   // --ml-cyan  (Primär-Akzent)
  blue:    "#3B82F6",   // --ml-blue
  emerald: "#10B981",   // --ml-emerald  (NEU: ML-Erfolgs-/Positiv-Akzent)
  amber:   "#F59E0B",   // --ml-amber
  red:     "#EF4444",   // --ml-vermillion
  purple:  "#9B6EF0",   // App-spezifisch (19× genutzt) — in ML nicht vorhanden, bleibt
  t1:      "#E6EDF3",   // --ml-text   (vorher #E6EAF0)
  t2:      "#8B949E",   // --ml-dim    (vorher #9BA3B4)
  t3:      "#5A6573",   // --ml-mute   (vorher #5A6270)
} as const;

export const FONTS = {
  display: "'Archivo',sans-serif",        // vorher Plus Jakarta Sans
  body:    "'Manrope',sans-serif",         // vorher DM Sans
  mono:    "'IBM Plex Mono',monospace",    // vorher DM Sans (es gab nie eine echte Mono)
} as const;

export const RADII = { rSm: "6px", rMd: "10px", rLg: "14px" } as const;

// Ein einziger @import — identisch zu MarketingLanding.
export const FONT_IMPORT =
  "@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Manrope:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');";

// ── C — Token-Objekt für ResultState.tsx (Inline-Styles, camelCase) ───────────
// Behält alle bisherigen Keys (inkl. der rgba-Dim-/Border-Varianten), damit die
// 679 Inline-Styles unverändert weiterlaufen. Nur Werte ziehen aus PALETTE/FONTS.
export const C = {
  bg: PALETTE.bg, bgCard: PALETTE.bgCard, bgHover: PALETTE.bgHover,
  border: PALETTE.border, borderMd: PALETTE.border,
  teal: PALETTE.teal, tealDim: "rgba(0,194,209,0.08)", tealBorder: "rgba(0,194,209,0.22)",
  blue: PALETTE.blue, blueDim: "rgba(59,130,246,0.10)",
  emerald: PALETTE.emerald, emeraldDim: "rgba(16,185,129,0.10)",
  amber: PALETTE.amber, amberDim: "rgba(245,158,11,0.10)",
  red: PALETTE.red, redDim: "rgba(239,68,68,0.10)",
  purple: PALETTE.purple, purpleDim: "rgba(155,110,240,0.10)",
  t1: PALETTE.t1, t2: PALETTE.t2, t3: PALETTE.t3,
  mono: FONTS.mono,
  display: FONTS.display,
  body: FONTS.body,
  rSm: RADII.rSm, rMd: RADII.rMd, rLg: RADII.rLg,
  fsBody: 13,
} as const;

// ── ROOT_VARS — :root-String für page.tsx (Legacy-CSS-Var-Namen, neue Werte) ──
// Reproduziert exakt den bisherigen Variablensatz von page.tsx, damit die
// ~130 var(--…)-Referenzen + CSS-Klassen (.nav, .hero, …) unverändert greifen.
export const ROOT_VARS = `
  --bg:${PALETTE.bg};--bg-card:${PALETTE.bgCard};--bg-hover:${PALETTE.bgHover};
  --border:${PALETTE.border};--border-md:${PALETTE.border};
  --teal:${PALETTE.teal};--teal-dim:#009BAA;--teal-bg:rgba(0,194,209,0.08);
  --blue:${PALETTE.blue};--blue-bg:rgba(59,130,246,0.10);
  --emerald:${PALETTE.emerald};--emerald-bg:rgba(16,185,129,0.10);
  --amber:${PALETTE.amber};--amber-bg:rgba(245,158,11,0.10);
  --red:${PALETTE.red};--red-bg:rgba(239,68,68,0.10);
  --purple:${PALETTE.purple};--purple-bg:rgba(155,110,240,0.10);
  --t1:${PALETTE.t1};--t2:${PALETTE.t2};--t3:${PALETTE.t3};
  --font-d:${FONTS.display};--font-b:${FONTS.body};--font-m:${FONTS.mono};
  --r-sm:${RADII.rSm};--r-md:${RADII.rMd};--r-lg:${RADII.rLg};
`;
