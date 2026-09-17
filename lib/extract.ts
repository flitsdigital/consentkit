import { parse, walk, generate, type CssNode, type Rule } from "css-tree";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { parse as parseColor, formatHex } from "culori";
import type { Extracted } from "./mapping";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_SHEETS = 5;

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) return /^(::1|::|f[cd]|fe[89ab]|::ffff:)/i.test(ip) || ip === "::";
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

async function assertPublic(url: URL) {
  if (!/^https?:$/.test(url.protocol)) throw new Error("Alleen http(s)-URL's");
  const host = url.hostname;
  if (host === "localhost" || host.endsWith(".local")) throw new Error("Geen lokale adressen");
  const ip = isIP(host) ? host : (await lookup(host)).address;
  if (isPrivateIp(ip)) throw new Error("Geen privé-adressen");
}

async function fetchText(url: URL, signal: AbortSignal): Promise<string> {
  await assertPublic(url);
  const res = await fetch(url, { signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; consent-config)" } });
  if (!res.ok) throw new Error(`${url.host} antwoordt met ${res.status}`);
  const len = Number(res.headers.get("content-length") ?? 0);
  if (len > MAX_BYTES) throw new Error("Bestand te groot");
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new Error("Bestand te groot");
  return text;
}

// Alleen dekkende kleuren; (half)transparant is nooit een bannerkleur
const normColor = (v: string) => { const c = parseColor(v.trim()); return c && (c.alpha ?? 1) === 1 ? formatHex(c) : undefined; };

export function extractFromCss(sheets: string[]): Extracted {
  const variables = new Map<string, string>();
  const colors = new Map<string, number>();
  const radii = new Map<string, number>();
  const fontSizes: Extracted["fontSizes"] = {};
  const body: Extracted["body"] = {};

  // Twee passes: eerst variabelen (voor var()-resolutie), dan de rest.
  const asts = sheets.map((s) => parse(s, { parseValue: false, parseAtrulePrelude: false }));
  const decls: { prop: string; value: string; selector: string }[] = [];
  for (const ast of asts) {
    walk(ast, {
      visit: "Declaration",
      enter(node: CssNode) {
        if (node.type !== "Declaration") return;
        const rule = this.rule as Rule | null;
        const selector = rule ? generate(rule.prelude) : "";
        const value = generate(node.value).trim();
        decls.push({ prop: node.property.toLowerCase(), value, selector });
      },
    });
  }
  for (const d of decls) {
    if (d.prop.startsWith("--") && /(^|,)\s*(:root|html|body)\s*($|,)/.test(d.selector) && !variables.has(d.prop)) variables.set(d.prop, d.value);
  }
  const resolve = (v: string) => v.replace(/var\((--[\w-]+)(?:,\s*([^)]*))?\)/g, (_, n, fb) => variables.get(n) ?? fb ?? "");
  // Variabelen die naar variabelen verwijzen (Webflow: --primary--accent → --_color---primary--gold-500) oplossen
  for (let i = 0; i < 5; i++) for (const [n, v] of variables) if (v.includes("var(")) variables.set(n, resolve(v));
  const count = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const selectors = (s: string) => s.split(",").map((x) => x.trim().toLowerCase());

  for (const d of decls) {
    const value = resolve(d.value);
    if (["color", "background-color", "border-color"].includes(d.prop)) {
      const c = normColor(value);
      if (c) count(colors, c);
    }
    if (d.prop === "border-radius" && /^[\d.]+(px|rem|em)?$/.test(value)) count(radii, value);
    const sel = selectors(d.selector);
    if (d.prop === "font-size" && /^[\d.]+(px|rem|em|%)$/.test(value)) {
      for (const tag of ["body", "p", "h2", "h3"] as const) if (sel.includes(tag) && !fontSizes[tag]) fontSizes[tag] = value;
    }
    if (sel.includes("body")) {
      if (d.prop === "color" && !body.color) body.color = normColor(value);
      if (d.prop === "background-color" && !body.background) body.background = normColor(value);
    }
  }
  const sorted = (m: Map<string, number>) => [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
  return { variables: [...variables].map(([name, value]) => ({ name, value })), colors: sorted(colors), radii: sorted(radii), fontSizes, body };
}

export async function extractFromUrl(input: string): Promise<Extracted> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const base = new URL(input);
    const html = await fetchText(base, ctrl.signal);
    const hrefs = [...html.matchAll(/<link[^>]+rel=["']?stylesheet["']?[^>]*>/gi)]
      .map((m) => m[0].match(/href=["']([^"']+)["']/)?.[1])
      .filter((h): h is string => !!h)
      .slice(0, MAX_SHEETS);
    const inline = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]);
    const external = await Promise.all(hrefs.map((h) => fetchText(new URL(h, base), ctrl.signal).catch(() => "")));
    return extractFromCss([...external, ...inline]);
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error("Time-out: site antwoordt niet binnen 10 s");
    throw e instanceof Error ? e : new Error("Site niet bereikbaar");
  } finally {
    clearTimeout(timer);
  }
}
