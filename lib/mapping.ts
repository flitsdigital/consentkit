import { parse, formatHex, oklch, wcagContrast, interpolate, type Color } from "culori";

export type Extracted = {
  variables: { name: string; value: string }[];
  colors: { value: string; count: number }[];
  radii: { value: string; count: number }[];
  fontSizes: { body?: string; p?: string; h2?: string; h3?: string };
  body: { color?: string; background?: string };
};

// Exact namen en volgorde uit webflow/custom.css. Geen --cb-font-family (banner erft site-font).
export const DEFAULTS = {
  "--cb-color": "#1b020d",
  "--cb-color-background": "#fff",
  "--cb-color-surface": "#f6f1f1",
  "--cb-color-accent": "#ec4d94",
  "--cb-color-accent-text": "#1b020d",
  "--cb-color-switch-off": "#d9cfd3",
  "--cb-color-focus": "#1b020d",
  "--cb-font-size": "15px",
  "--cb-font-size-small": "13px",
  "--cb-font-size-title": "20px",
  "--cb-padding": "24px",
  "--cb-offset": "16px",
  "--cb-max-width": "560px",
  "--cb-border-radius": "12px",
  "--cb-button-radius": "8px",
  "--cb-shadow": "0 12px 40px rgba(27, 2, 13, 0.18)",
  "--cb-switch-width": "44px",
  "--cb-switch-height": "24px",
  "--cb-switch-padding": "3px",
  "--cb-z-index": "9999",
  "--cb-ease": "cubic-bezier(0.32, 0.72, 0, 1)",
} as const;

export type VarName = keyof typeof DEFAULTS;
export type Vars = Record<VarName, string>;
export const VAR_NAMES = Object.keys(DEFAULTS) as VarName[];
export const COLOR_VARS = VAR_NAMES.filter((n) => n.startsWith("--cb-color"));

export function contrast(a: string, b: string): number | undefined {
  const ca = parse(a);
  const cb = parse(b);
  return ca && cb ? Math.round(wcagContrast(ca, cb) * 100) / 100 : undefined;
}

/** Mengt `a` voor `p` (0–1) in `b`; alle waarden concreet (DialKit-kleurcontrols verstaan geen color-mix()). */
const mix = (a: string, b: string, p: number) => formatHex(interpolate([parse(b)!, parse(a)!], "rgb")(p));

/** "16px" → 16, ".5rem" → 8; undefined voor alles wat niet naar px te vertalen is. */
export function toPx(value: string): number | undefined {
  const m = value.trim().match(/^([\d.]+)(px|rem|em)?$/);
  if (!m) return;
  const n = parseFloat(m[1]);
  return Math.round(m[2] && m[2] !== "px" ? n * 16 : n);
}

const L = (c: Color) => oklch(c)?.l ?? 0;
const C = (c: Color) => oklch(c)?.c ?? 0;
const hex = (v: string) => {
  const c = parse(v);
  return c && (c.alpha ?? 1) === 1 ? formatHex(c) : undefined;
};

export function mapToVars(x: Extracted): Vars {
  const vars: Vars = { ...DEFAULTS };
  const colors = x.colors
    .map((c) => ({ ...c, parsed: parse(c.value) }))
    .filter((c): c is typeof c & { parsed: Color } => !!c.parsed && (c.parsed.alpha ?? 1) === 1)
    .sort((a, b) => b.count - a.count);

  // --cb-color: body color, anders donkerste veelvoorkomende kleur
  const common = colors.filter((c) => c.count >= 2);
  const darkest = (common.length ? common : colors).slice().sort((a, b) => L(a.parsed) - L(b.parsed))[0];
  vars["--cb-color"] = hex(x.body.color ?? "") ?? (darkest ? formatHex(darkest.parsed) : DEFAULTS["--cb-color"]);
  vars["--cb-color-background"] = hex(x.body.background ?? "") ?? "#fff";

  // accent: Webflow-variabele met primary/accent/brand, anders meest voorkomende verzadigde kleur
  const brandVar = x.variables.find((v) => /primary|accent|brand/i.test(v.name) && !v.name.startsWith("--cb-") && hex(v.value) && C(parse(v.value)!) > 0.04);
  const saturated = colors.find((c) => C(c.parsed) > 0.04 && L(c.parsed) > 0.2 && L(c.parsed) < 0.9);
  vars["--cb-color-accent"] = (brandVar && hex(brandVar.value)) ?? (saturated ? formatHex(saturated.parsed) : DEFAULTS["--cb-color-accent"]);

  // accent-text: wit als ≥4.5:1, anders --cb-color als die het haalt, anders wat het hoogst scoort
  const white = contrast("#fff", vars["--cb-color-accent"]) ?? 0;
  const dark = contrast(vars["--cb-color"], vars["--cb-color-accent"]) ?? 0;
  vars["--cb-color-accent-text"] = white >= 4.5 ? "#fff" : dark >= 4.5 ? vars["--cb-color"] : white >= dark ? "#fff" : vars["--cb-color"];

  // surface: lichtste grijs/tint (niet wit), anders color-mix
  const bgL = L(parse(vars["--cb-color-background"])!);
  const surface = colors
    .filter((c) => C(c.parsed) < 0.05 && L(c.parsed) > 0.85 && Math.abs(L(c.parsed) - bgL) > 0.01)
    .sort((a, b) => L(b.parsed) - L(a.parsed))[0];
  vars["--cb-color-surface"] = surface ? formatHex(surface.parsed) : mix(vars["--cb-color"], vars["--cb-color-background"], 0.06);
  vars["--cb-color-switch-off"] = mix(vars["--cb-color"], vars["--cb-color-background"], 0.18);
  vars["--cb-color-focus"] = vars["--cb-color"];

  // radius: meest voorkomende > 0, tweede als button-radius
  const radii = x.radii.map((r) => ({ px: toPx(r.value), count: r.count })).filter((r): r is { px: number; count: number } => !!r.px).sort((a, b) => b.count - a.count);
  if (radii[0]) vars["--cb-border-radius"] = `${radii[0].px}px`;
  vars["--cb-button-radius"] = `${radii[1]?.px ?? Math.round(toPx(vars["--cb-border-radius"])! / 1.5)}px`;

  const fs = toPx(x.fontSizes.p ?? x.fontSizes.body ?? "");
  if (fs) vars["--cb-font-size"] = `${fs}px`;
  const h3 = toPx(x.fontSizes.h3 ?? "");
  if (h3) vars["--cb-font-size-title"] = `${h3}px`;
  vars["--cb-font-size-small"] = `${toPx(vars["--cb-font-size"])! - 2}px`;
  return vars;
}

/** Vervangt alleen de waarden in het eerste :root-blok; rest van custom.css blijft byte-voor-byte gelijk. */
export function renderCustomCss(source: string, vars: Vars): string {
  const start = source.indexOf(":root {");
  const end = source.indexOf("}", start);
  const root = source.slice(start, end).replace(/(--cb-[\w-]+):\s*[^;]+;/g, (m, name: string) =>
    name in vars ? `${name}: ${vars[name as VarName]};` : m,
  );
  return source.slice(0, start) + root + source.slice(end);
}

/** veenstra-edelmetaal.webflow.io → veenstra_consent */
export function keyFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.split(".")[0].split("-")[0].replace(/[^a-z0-9]/gi, "_").toLowerCase() + "_consent";
  } catch {
    return "flits_consent";
  }
}
