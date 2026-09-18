"use client";

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonGroup, ColorControl, DialRoot, DialStore, EasingVisualization, Folder, PresetManager, Slider, TextControl, Toggle, useDialKitController, type DialConfig, type EasingConfig, type Preset, type ShortcutConfig } from "dialkit";
import { formatRgb, parse } from "culori";
import { Studio, type Parts } from "./studio";
import GlideSelect from "./glide-select";
import { AUTO_VARS, COLOR_VARS, DEFAULTS, VAR_NAMES, contrast, deriveAuto, hex, keyFromUrl, mapToVars, opaque, renderCustomCss, toPx, type Extracted, type VarName, type Vars } from "@/lib/mapping";

type Files = { customCss: string; classesCss: string; componentHtml: string; clipboardJson: string; headSnippet: string; version: string };
type WfNode = { _id: string; text?: boolean; v?: string; children?: string[]; data?: { xattr?: { name: string; value: string }[]; link?: { mode: string; url: string } } };
type Cat = { id?: string; key: string; title: string; text: string; signals: string; locked?: boolean };
const cid = () => Math.random().toString(36).slice(2, 8);
// Tekstnodes in clipboard.json, in volgorde: 0 titel, 1 tekst, 2 privacylink, 3–8 drie categorieën (titel, tekst), 9–12 knoppen
const GENERAL_TEXTS: [number, string][] = [[0, "Titel"], [1, "Tekst"], [2, "Privacylink"], [9, "Knop: instellingen"], [10, "Knop: opslaan"], [11, "Knop: weigeren"], [12, "Knop: accepteren"]];
const DEFAULT_SIGNALS: Record<string, string> = { analytics: "analytics_storage", marketing: "ad_storage, ad_user_data, ad_personalization" };
const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "categorie";
const PRIVACY_HREF = "/privacybeleid"; // href in component.html / clipboard.json

const CONTRAST_PAIRS: [VarName, VarName, string][] = [["--cb-color-accent-text", "--cb-color-accent", "Knop"], ["--cb-color", "--cb-color-background", "Tekst"], ["--cb-color", "--cb-color-surface", "Secundair"]];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// DialKit-pad ↔ --cb-variabele. Sliders in px; kleuren als hex; schaduw/easing als tekst.
const DIAL: Record<string, { v: VarName; range?: [number, number, number?]; unit?: "" }> = {
  "kleuren.tekst": { v: "--cb-color" },
  "kleuren.achtergrond": { v: "--cb-color-background" },
  "kleuren.oppervlak": { v: "--cb-color-surface" },
  "kleuren.accent": { v: "--cb-color-accent" },
  "kleuren.accentTekst": { v: "--cb-color-accent-text" },
  "kleuren.switchUit": { v: "--cb-color-switch-off" },
  "kleuren.focus": { v: "--cb-color-focus" },
  "typografie.tekst": { v: "--cb-font-size", range: [10, 24] },
  "typografie.klein": { v: "--cb-font-size-small", range: [8, 20] },
  "typografie.titel": { v: "--cb-font-size-title", range: [14, 40] },
  "maten.padding": { v: "--cb-padding", range: [8, 48] },
  "maten.offset": { v: "--cb-offset", range: [0, 48] },
  "maten.maxBreedte": { v: "--cb-max-width", range: [320, 2000, 10] }, // 2000 = "volle breedte" (Balk-starter)
  "maten.kaartRadius": { v: "--cb-border-radius", range: [0, 40] },
  "maten.knopRadius": { v: "--cb-button-radius", range: [0, 32] },
  "maten.switchBreedte": { v: "--cb-switch-width", range: [32, 72] },
  "maten.switchHoogte": { v: "--cb-switch-height", range: [16, 40] },
  "maten.switchPadding": { v: "--cb-switch-padding", range: [0, 8] },
  "maten.zIndex": { v: "--cb-z-index", range: [1, 99999, 1], unit: "" },
};
// Effect: schaduw als x/y/blur/opacity/kleur (kleur volgt --cb-color na extractie), easing als DialKit-bézier. Geen tekstvelden meer.
type Shadow = { x: number; y: number; blur: number; opacity: number; color: string };
const parseShadow = (v: string): Shadow => { const m = v.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(rgba?\([^)]*?([\d.]+)\))/); return m ? { x: +m[1], y: +m[2], blur: +m[3], opacity: +m[5], color: hex(m[4]) } : { x: 0, y: 12, blur: 40, opacity: 0.18, color: "#1b020d" }; };
const parseEase = (v: string): EasingConfig => { const m = v.match(/cubic-bezier\(([^)]+)\)/); const e = m?.[1].split(",").map(Number); return { type: "easing", duration: 0.25, ease: e?.length === 4 ? (e as EasingConfig["ease"]) : [0.32, 0.72, 0, 1] }; };
const px = (n: number) => (n === 0 ? "0" : `${n}px`);
const shadowCss = (sh: Shadow) => `${px(sh.x)} ${px(sh.y)} ${px(sh.blur)} ${formatRgb({ ...parse(sh.color)!, alpha: sh.opacity })}`;
const easeCss = (e: EasingConfig) => `cubic-bezier(${e.ease.join(", ")})`;
const SHADOW: Record<Exclude<keyof Shadow, "color">, { label: string; range: [number, number, number?]; unit: string }> = { x: { label: "Schaduw x", range: [-40, 40], unit: "px" }, y: { label: "Schaduw y", range: [-40, 60], unit: "px" }, blur: { label: "Schaduw blur", range: [0, 120], unit: "px" }, opacity: { label: "Schaduw opacity", range: [0, 1, 0.01], unit: "" } };
const effectConfig = (vars: Vars): DialConfig => { const sh = parseShadow(vars["--cb-shadow"]); return { ...Object.fromEntries(Object.entries(SHADOW).map(([k, d]) => [k, [sh[k as keyof typeof SHADOW], ...d.range]])), color: sh.color, easing: parseEase(vars["--cb-ease"]), replay: { type: "action", label: "Speel switch-animatie af" } }; };
type EffectValues = Shadow & { easing?: EasingConfig };
// Layout-starters: welke elementen (knoppen) en welke vorm. Kleur/radius doe je daarna in de tool.
type Align = "links" | "midden" | "rechts";
type Binding = "auto" | `--${string}`; // "auto" = afgeleid; anders de site-variabele waaraan de kleur hangt
type Hidden = "settings" | "save" | "reject";
type Layout = { hide: Hidden[]; patch: Partial<Vars> };
const STARTERS: { name: string; hint: string; layout: Layout }[] = [
  { name: "Simpel", hint: "Alleen accepteren — niet AVG-conform", layout: { hide: ["settings", "save", "reject"], patch: { "--cb-max-width": "560px", "--cb-offset": "16px" } } },
  { name: "Compleet", hint: "Instellingen, weigeren, accepteren", layout: { hide: [], patch: { "--cb-max-width": "560px", "--cb-offset": "16px" } } },
  { name: "Kaart", hint: "Kaart onderin, huidige knoppen", layout: { hide: [], patch: { "--cb-max-width": "560px", "--cb-offset": "16px", "--cb-border-radius": "12px" } } },
  { name: "Balk", hint: "Volle breedte onderin", layout: { hide: [], patch: { "--cb-max-width": "2000px", "--cb-offset": "0px", "--cb-border-radius": "0px" } } },
];
// Uitlijning: de Webflow-class centreert met margin auto; één override in de head-code zet hem links of rechts
const alignCss = (a: Align) => (a === "links" ? ".cb-banner { margin-left: 0; }" : a === "rechts" ? ".cb-banner { margin-right: 0; }" : "");
// Toets vasthouden + scrollen/slepen tunet de slider zonder naar het paneel te kijken
const NO_PRESETS: Preset[] = [];
const SHORTCUTS: Record<string, ShortcutConfig> = { "maten.padding": { key: "p" }, "maten.offset": { key: "o" }, "maten.kaartRadius": { key: "r" }, "maten.knopRadius": { key: "k" }, "typografie.tekst": { key: "t" }, "effect.blur": { key: "b" } };
type DialValues = Record<string, Record<string, string | number>>;

// Eén keer afgeleid: pad → folder/key (DialKit nest per folder)
const ENTRIES = Object.entries(DIAL).map(([path, d]) => ({ path, folder: path.split(".")[0], key: path.split(".")[1], ...d, unit: d.unit ?? "px" }));
type Entry = (typeof ENTRIES)[number];
const toNumber = (d: Entry, v: string) => (d.unit === "" ? Number(v) : toPx(v) ?? toPx(DEFAULTS[d.v])!);
const dialValue = (d: Entry, v: string) => (d.range ? toNumber(d, v) : hex(v));
const nest = (make: (d: Entry) => unknown) => { const out: Record<string, Record<string, unknown>> = {}; for (const d of ENTRIES) (out[d.folder] ??= {})[d.key] = make(d); return out; };
const toDialValues = (vars: Vars) => nest((d) => dialValue(d, vars[d.v])) as DialValues;
const dialConfig = (vars: Vars) => ({ ...nest((d) => (d.range ? [dialValue(d, vars[d.v]), ...d.range] : dialValue(d, vars[d.v]))), effect: effectConfig(vars) }) as DialConfig;
const toVars = (values: DialValues): Vars => {
  const vars = { ...DEFAULTS } as Vars;
  for (const d of ENTRIES) {
    const val = values[d.folder]?.[d.key];
    if (val === undefined) continue;
    vars[d.v] = typeof val === "number" ? `${val}${d.unit}` : val;
  }
  const fx = values.effect as unknown as EffectValues | undefined;
  if (fx?.easing?.ease) {
    vars["--cb-shadow"] = shadowCss(fx);
    vars["--cb-ease"] = easeCss(fx.easing);
  }
  return vars;
};
const PATH_OF = Object.fromEntries(ENTRIES.map((d) => [d.v, d.path])) as Record<VarName, string>;
const COLOR_TARGETS = ENTRIES.filter((d) => COLOR_VARS.includes(d.v)).map((d) => ({ path: d.path, label: d.key }));
const RADIUS_TARGETS = [{ path: "maten.kaartRadius", label: "Kaart" }, { path: "maten.knopRadius", label: "Knop" }];
const FONT_TARGETS = [{ path: "typografie.tekst", label: "Tekst" }, { path: "typografie.klein", label: "Klein" }, { path: "typografie.titel", label: "Titel" }];
const shortName = (name: string) => name.replace(/^--_?/, "").replace(/\\.*$/, "");
const label = (k: string) => k.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export function Configurator({ files }: { files: Files }) {
  const params = useSearchParams();
  const clipboard = useMemo(() => JSON.parse(files.clipboardJson) as { payload: { nodes: WfNode[] } }, [files.clipboardJson]);
  const originals = useMemo(() => clipboard.payload.nodes.filter((n) => n.text).map((n) => n.v ?? ""), [clipboard]);

  const [url, setUrl] = useState(params.get("url") ?? "");
  const [texts, setTexts] = useState<string[]>(() => originals.map((o, i) => params.get(`t${i}`) ?? o));
  const defaultCats = useMemo<Cat[]>(() => [
    { id: "c1", key: "", title: originals[3], text: originals[4], signals: "", locked: true },
    { id: "c2", key: "analytics", title: originals[5], text: originals[6], signals: DEFAULT_SIGNALS.analytics },
    { id: "c3", key: "marketing", title: originals[7], text: originals[8], signals: DEFAULT_SIGNALS.marketing },
  ], [originals]);
  const [cats, setCats] = useState<Cat[]>(() => { try { return (JSON.parse(params.get("cats") ?? "") as Cat[]).map((c) => ({ ...c, id: c.id ?? cid() })); } catch { return defaultCats; } });
  // FLIP: rijen glijden naar hun nieuwe plek na herordenen/toevoegen/verwijderen
  const rowTops = useRef(new Map<string, number>());
  useLayoutEffect(() => {
    document.querySelectorAll<HTMLElement>(".drag-row[data-id]").forEach((r) => {
      const top = r.getBoundingClientRect().top, prev = rowTops.current.get(r.dataset.id!);
      if (prev !== undefined && prev !== top) {
        r.style.transition = "none"; r.style.transform = `translateY(${prev - top}px)`; void r.offsetHeight;
        r.style.transition = "transform 200ms var(--ease-out-strong)"; r.style.transform = "";
      }
      rowTops.current.set(r.dataset.id!, top);
    });
  }, [cats]);
  const [key, setKey] = useState(params.get("key") ?? "");
  const [privacy, setPrivacy] = useState(params.get("privacy") ?? PRIVACY_HREF);
  const [days, setDays] = useState(Number(params.get("days")) || 180);
  const [align, setAlign] = useState<Align>((params.get("align") as Align) || "midden");
  const [hide, setHide] = useState<Hidden[]>(() => (params.get("hide")?.split(",").filter((h) => ["settings", "save", "reject"].includes(h)) ?? []) as Hidden[]);
  const [bannerVersion, setBannerVersion] = useState(Number(params.get("v")) || 1); // consent-versie in de config, niet de scriptversie
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [siteBg, setSiteBg] = useState(false);
  const [copied, setCopied] = useState("");
  // Afgevinkte exportstappen, extractie-samenvatting, undo-stack
  const [done, setDone] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const history = useRef<DialValues[]>([]);
  const skipHistory = useRef(false);
  // Categorie slepen met pointer events (geen HTML5-DnD: werkt ook op touch en is te testen)
  const [drag, setDrag] = useState<{ from: number | null; over: number | null }>({ from: null, over: null });
  const startDrag = (from: number) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const rows = [...document.querySelectorAll<HTMLElement>(".drag-row")];
    let over = from;
    const onMove = (ev: PointerEvent) => {
      over = rows.findIndex((r) => { const b = r.getBoundingClientRect(); return ev.clientY < b.top + b.height / 2; });
      if (over === -1) over = rows.length - 1; else if (over > from) over -= 1;
      setDrag({ from, over });
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (over !== from) setCats((cs) => cs.toSpliced(from, 1).toSpliced(over, 0, cs[from]));
      setDrag({ from: null, over: null });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    setDrag({ from, over: from });
  };
  // Figma-achtige variabelen: kleur gekoppeld aan een site-variabele → export als var(--naam).
  // "auto" = afgeleid van tekst/achtergrond/accent (deriveAuto) tot de gebruiker de kleur zelf zet.
  const [bindings, setBindings] = useState<Partial<Record<VarName, Binding>>>(() =>
    Object.fromEntries(COLOR_VARS.flatMap((n) => {
      const p = params.get(n.slice(2));
      const m = p?.match(/^var\((--[^)]+)\)$/);
      if (m) return [[n, m[1] as Binding]];
      return !p && (AUTO_VARS as readonly string[]).includes(n) ? [[n, "auto"]] : [];
    })));

  const [config] = useState(() => dialConfig(Object.fromEntries(VAR_NAMES.map((n) => { const p = params.get(n.slice(2)); return [n, p && !p.startsWith("var(") ? p : DEFAULTS[n]]; })) as Vars));
  const frame = useRef<HTMLIFrameElement>(null);
  const replay = () => { setPrefsOpen(true); setTimeout(() => frame.current?.contentWindow?.postMessage({ cb: "replay" }, "*"), 400); }; // na eventuele iframe-reload
  const dial = useDialKitController("Banner", config, { id: "banner", shortcuts: SHORTCUTS, onAction: (p) => p === "effect.replay" && replay() });
  // Versies (DialKit-presets): A/B voor de klant. In-memory voor deze sessie.
  const presets = useSyncExternalStore((cb) => DialStore.subscribe("banner", cb), () => DialStore.getPresets("banner"), () => NO_PRESETS);
  const activePreset = useSyncExternalStore((cb) => DialStore.subscribe("banner", cb), () => DialStore.getActivePresetId("banner"), () => null);
  const values = dial.values as unknown as DialValues;
  const resolved = useMemo(() => toVars(values), [values]); // altijd hex/px: preview + contrast
  const vars = useMemo(() => ({ ...resolved, ...Object.fromEntries(Object.entries(bindings).filter(([, v]) => v !== "auto").map(([n, v]) => [n, `var(${v})`])) }) as Vars, [resolved, bindings]); // export
  // Undo (⌘Z) op DialKit-waarden — snapshot na 400 ms rust
  useEffect(() => {
    if (skipHistory.current) { skipHistory.current = false; return; }
    const t = setTimeout(() => { const last = history.current.at(-1); if (JSON.stringify(last) !== JSON.stringify(values)) history.current.push(structuredClone(values)); if (history.current.length > 50) history.current.shift(); }, 400);
    return () => clearTimeout(t);
  }, [values]);
  const undo = () => {
    if (history.current.length < 2) return;
    history.current.pop();
    skipHistory.current = true;
    dial.setValues(structuredClone(history.current.at(-1)!) as never);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key !== "z" || (e.target as HTMLElement).closest?.("input, textarea")) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Auto-kleuren volgen tekst/achtergrond/accent
  useEffect(() => {
    const auto = deriveAuto(resolved);
    for (const n of AUTO_VARS) if (bindings[n] === "auto" && resolved[n] !== auto[n]) dial.setValue(PATH_OF[n], auto[n]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved["--cb-color"], resolved["--cb-color-background"], resolved["--cb-color-accent"], bindings]);
  const siteVars = useMemo(() => (extracted?.variables ?? []).filter((v) => !v.name.startsWith("--cb-") && (/^(#|rgb|hsl|oklch)/i.test(v.value) || /^[a-z]+$/i.test(v.value)) && parse(v.value)), [extracted]);
  const bind = (n: VarName, name: Binding | null, value: string) => {
    setBindings((b) => { const next = { ...b }; if (name) next[n] = name; else delete next[n]; return next; });
    dial.setValue(PATH_OF[n], hex(value));
  };

  // Deelbare state: alles wat afwijkt van de default in de querystring
  useEffect(() => {
    const q = new URLSearchParams();
    if (url) q.set("url", url);
    if (key) q.set("key", key);
    if (privacy !== PRIVACY_HREF) q.set("privacy", privacy);
    if (days !== 180) q.set("days", String(days));
    if (align !== "midden") q.set("align", align);
    if (hide.length) q.set("hide", hide.join(","));
    if (bannerVersion !== 1) q.set("v", String(bannerVersion));
    const same = (n: VarName) => (COLOR_VARS.includes(n) && !vars[n].startsWith("var(") ? hex(vars[n]) === hex(DEFAULTS[n]) : vars[n] === DEFAULTS[n]);
    VAR_NAMES.forEach((n) => !same(n) && bindings[n] !== "auto" && q.set(n.slice(2), vars[n]));
    GENERAL_TEXTS.forEach(([i]) => texts[i] !== originals[i] && q.set(`t${i}`, texts[i]));
    if (JSON.stringify(cats) !== JSON.stringify(defaultCats)) q.set("cats", JSON.stringify(cats));
    window.history.replaceState(null, "", q.size ? `?${q}` : location.pathname);
  }, [url, key, privacy, days, bannerVersion, align, hide, vars, texts, cats, defaultCats, originals, bindings]);

  async function extract(target: string, apply: boolean) {
    target = target.trim();
    if (!/^https?:\/\//i.test(target)) { target = `https://${target}`; setUrl(target); }
    setStatus({ loading: true });
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(target)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setExtracted(json);
      const ex = json as Extracted;
      const accent = mapToVars(ex)["--cb-color-accent"];
      const brand = ex.variables.find((v) => !v.name.startsWith("--cb-") && opaque(v.value) === accent);
      setSummary(`${ex.colors.length} kleuren, ${ex.variables.length} variabelen, ${ex.radii.length} radii gevonden${brand ? ` · accent uit ${shortName(brand.name)}` : ""}`);
      const found = new Map((json as Extracted).variables.map((v) => [v.name, v.value]));
      for (const [n, name] of Object.entries(bindings)) if (found.has(name)) dial.setValue(PATH_OF[n as VarName], hex(found.get(name)!));
      if (apply) {
        const mapped = mapToVars(json);
        const auto = deriveAuto(mapped);
        dial.setValues(toDialValues(mapped));
        dial.setValue("effect.color", mapped["--cb-color"]);
        setBindings((b) => { const n = { ...b }; for (const a of AUTO_VARS) if (mapped[a] === auto[a]) n[a] = "auto"; else delete n[a]; return n; });
        setKey(keyFromUrl(target));
      }
      setStatus({});
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : "Site niet bereikbaar" });
    }
  }
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.cb === "settings") setPrefsOpen(true); if (e.data?.cb === "save") setPrefsOpen(false); };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);
  // Link met state geopend: wel de gevonden waarden ophalen, niet de gekozen waarden overschrijven
  useEffect(() => {
    const u = params.get("url");
    if (u) queueMicrotask(() => extract(u, ![...params.keys()].some((k) => k.startsWith("cb-"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teksten + categorieën toepassen op HTML (preview) en clipboard-JSON (Copy to Webflow).
  // Rij 1 (Noodzakelijk) en rij 2 (Statistieken) uit de bron zijn de templates voor vaste resp. schakelbare categorieën.
  const fill = (tpl: string, from: Cat, to: Cat) => tpl.replaceAll(`>${esc(from.title)}<`, `>${esc(to.title)}<`).replaceAll(`aria-label="${esc(from.title)}"`, `aria-label="${esc(to.title)}"`).replaceAll(`>${esc(from.text)}<`, `>${esc(to.text)}<`).replaceAll(`data-cb-toggle="${from.key}"`, `data-cb-toggle="${esc(to.key)}"`);
  const applyTextsHtml = (html: string) => {
    const h = GENERAL_TEXTS.reduce((acc, [i]) => acc.replaceAll(`>${esc(originals[i])}<`, `>${esc(texts[i])}<`), html).replace(`href="${PRIVACY_HREF}"`, `href="${esc(privacy)}"`);
    const [before, rest] = h.split('<div data-cb="prefs" class="cb-prefs">');
    const [inner, after] = rest.split('<div class="cb-actions">');
    const [, ...rows] = inner.split('<div class="cb-row">');
    const close = rows[rows.length - 1].slice(rows[rows.length - 1].lastIndexOf("</div>")); // sluit-div van cb-prefs
    const body = cats.map((c) => '<div class="cb-row">' + fill(rows[c.locked ? 0 : 1], defaultCats[c.locked ? 0 : 1], c)).join("");
    const out = before + '<div data-cb="prefs" class="cb-prefs">' + body + close + '<div class="cb-actions">' + after;
    return hide.reduce((acc, a) => acc.replace(new RegExp(`\\s*<a[^>]*data-cb-action="${a}"[^>]*>[^<]*</a>`), ""), out);
  };
  const clipboardJson = () => {
    const src = clipboard.payload.nodes;
    const byId = new Map(src.map((n) => [n._id, n]));
    const prefs = src.find((n) => n.data?.xattr?.some((a) => a.name === "data-cb" && a.value === "prefs"))!;
    const subtree = (id: string): string[] => [id, ...(byId.get(id)?.children ?? []).flatMap(subtree)];
    const oldRows = new Set(prefs.children!.flatMap(subtree));
    const out: WfNode[] = [];
    const clone = (id: string, from: Cat, to: Cat): string => {
      const n = byId.get(id)!;
      const c: WfNode = { ...n, _id: crypto.randomUUID() };
      if (n.text) c.v = n.v === from.title ? to.title : n.v === from.text ? to.text : n.v;
      if (n.data?.xattr) c.data = { ...n.data, xattr: n.data.xattr.map((a) => (a.name === "aria-label" && a.value === from.title ? { ...a, value: to.title } : a.name === "data-cb-toggle" ? { ...a, value: to.key } : a)) };
      if (n.children) c.children = n.children.map((ch) => clone(ch, from, to));
      out.push(c);
      return c._id;
    };
    const rowIds = cats.map((c) => clone(prefs.children![c.locked ? 0 : 1], defaultCats[c.locked ? 0 : 1], c));
    const hidden = new Set(src.filter((n) => n.data?.xattr?.some((a) => a.name === "data-cb-action" && (hide as string[]).includes(a.value))).flatMap((n) => subtree(n._id)));
    const nodes = src.filter((n) => !oldRows.has(n._id) && !hidden.has(n._id)).map((n) => {
      if (n === prefs) return { ...n, children: rowIds };
      if (n.children?.some((c) => hidden.has(c))) n = { ...n, children: n.children.filter((c) => !hidden.has(c)) };
      if (n.text) { const i = originals.indexOf(n.v ?? ""); return { ...n, v: GENERAL_TEXTS.some(([g]) => g === i) ? texts[i] : n.v }; }
      const link = n.data?.link?.url === PRIVACY_HREF ? { ...n.data.link, url: privacy } : n.data?.link;
      return link ? { ...n, data: { ...n.data, link } } : n;
    }).concat(out);
    return JSON.stringify({ ...clipboard, payload: { ...clipboard.payload, nodes } });
  };
  const categoriesJs = "{ " + cats.filter((c) => !c.locked && c.key).map((c) => `${c.key}: [${c.signals.split(",").map((x) => x.trim()).filter(Boolean).map((x) => `'${x}'`).join(", ")}]`).join(", ") + " }";

  const customCss = renderCustomCss(files.customCss, vars);
  // Preview: de :root-waarden gaan via postMessage naar de iframe (geen reload per slider-tick).
  // srcdoc bevat de waarden van het moment van (her)bouwen en verandert alleen bij structuur (teksten, categorieën, prefs, layout).
  const pushVars = () => frame.current?.contentWindow?.postMessage({ cb: "vars", vars: resolved }, "*");
  useEffect(pushVars, [resolved]);
  const exportCss = `<style>\n${customCss}</style>`;
  const exportAlign = alignCss(align) && `<style>${alignCss(align)}</style>`;
  const headCode = `<script>window.FlitsConsent = { key: '${slug(key) === "categorie" ? "flits_consent" : slug(key)}', version: ${bannerVersion}, days: ${days}, categories: ${categoriesJs} };</script>\n${files.headSnippet.trim()}`;
  const footerCode = `<script src="https://cdn.jsdelivr.net/gh/flitsdigital/cookie-consent@${files.version}/dist/consent.min.js" defer></script>`;
  // Eén prompt met alles erin, voor Claude Code/Cursor/agents die de banner op een (niet-)Webflow-site zetten.
  const agentPrompt = () => `Implementeer deze cookiebanner (Flits cookie-consent v${files.version}, geconfigureerd met Consentkit) op ${url || "de website"}. Verander niets aan de waarden, teksten of attributen hieronder; alleen de plek waar het staat mag anders als het platform dat vereist.

## 1. In <head>, vóór Google Tag Manager
Zet de Consent Mode-defaults en de config bóven de GTM-snippet, anders vuurt GTM zonder consent.
\`\`\`html
${headCode}
\`\`\`

## 2. CSS (ook in <head>)
Alleen de :root-waarden zijn aangepast; de rest is de standaard stylesheet. Voeg toe zoals hij is.
\`\`\`html
${exportCss}${exportAlign ? `\n${exportAlign}` : ""}
\`\`\`

## 3. Script, vlak voor </body>
\`\`\`html
${footerCode}
\`\`\`

## 4. Markup, direct na <body>
Webflow: plak het component via "Copy to Webflow" in Consentkit (${location.href}) — de classes zitten dan in de Designer. Elk ander platform: plak deze HTML plus de class-CSS hieronder. De data-cb-*/aria-attributen zijn het contract met het script en moeten exact blijven; classes mogen worden hernoemd zolang de CSS meegaat.
\`\`\`html
${applyTextsHtml(files.componentHtml.split("<!-- Ergens")[0]).trim()}
\`\`\`
\`\`\`html
<style>
${files.classesCss.trim()}
</style>
\`\`\`

## 5. Cookie-instellingen opnieuw openen
Zet ergens in de footer een link met \`data-cb-open\`; het script koppelt hem automatisch:
\`\`\`html
<a href="#" data-cb-open="true">Cookie-instellingen</a>
\`\`\`

## 6. Controleren
- Banner verschijnt bij eerste bezoek, verdwijnt na een keuze en komt niet terug (key \`${slug(key)}\`, ${days} dagen, versie ${bannerVersion}).
- "Weigeren" zet alle Consent Mode-signalen op denied; "Alles accepteren" op granted. Check met Google Tag Assistant.
- Niet-Google tags in GTM: zet per tag "Require additional consent" op het juiste signaal (${cats.filter((c) => !c.locked && c.key).map((c) => `${c.title}: ${c.signals}`).join("; ")}).
- De privacybeleid-link wijst naar ${privacy}.
`;

  // `resolved` staat bewust niet in de deps: de waarden van dat moment gaan mee, live updates via pushVars.
  const srcdoc = useMemo(() => `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${renderCustomCss(files.customCss, resolved)}</style><style>${files.classesCss}</style><style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:system-ui,sans-serif;background:color-mix(in srgb, var(--cb-color) 8%, var(--cb-color-background))}
.site{position:absolute;inset:0;width:100%;height:100%;border:0}
.cb-banner{display:block}
${alignCss(align)}
${prefsOpen ? ".cb-prefs{display:block}[data-cb-action=settings]{display:none}" : "[data-cb-action=save]{display:none}"}
</style></head><body>${siteBg && url ? `<iframe class="site" src="${esc(url)}"></iframe>` : ""}${applyTextsHtml(files.componentHtml.split("<!-- Ergens")[0])}
<script>
// Preview-interactie: links niet volgen, switches togglen, instellingen/opslaan naar de tool melden
document.addEventListener("click", function (e) {
  var a = e.target.closest("a, [role=switch]"); if (!a) return; e.preventDefault();
  var act = a.getAttribute("data-cb-action");
  if (act === "settings" || act === "save") parent.postMessage({ cb: act }, "*");
  if (a.hasAttribute("data-cb-toggle")) { var on = a.classList.toggle("is-on"); a.setAttribute("aria-checked", String(on)); }
});
addEventListener("message", function (e) {
  if (!e.data) return;
  if (e.data.cb === "replay") { var t = document.querySelector("[data-cb-toggle]"); if (t) t.click(); }
  if (e.data.cb === "vars") for (var k in e.data.vars) document.documentElement.style.setProperty(k, e.data.vars[k]);
});
</script></body></html>`, [files, siteBg, url, prefsOpen, align, hide, texts, cats, privacy, defaultCats, originals]); // eslint-disable-line react-hooks/exhaustive-deps

  function flash(name: string) { setCopied(name); setTimeout(() => setCopied(""), 1600); }
  async function copy(name: string, text: string) { await navigator.clipboard.writeText(text); flash(name); setDone((d) => [...new Set([...d, name])]); }
  // Webflow accepteert alleen clipboard-data met MIME-type application/json (zelfde truc als demo/index.html)
  function copyToWebflow() {
    const json = clipboardJson();
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); e.clipboardData?.setData("application/json", json); e.clipboardData?.setData("text/plain", json); };
    document.addEventListener("copy", onCopy);
    document.execCommand("copy");
    document.removeEventListener("copy", onCopy);
    flash("webflow");
    setDone((d) => [...new Set([...d, "webflow"])]);
  }

  const copyBtn = (name: string, text: string) => (
    <button type="button" onClick={() => copy(name, text)} className="btn h-7 min-w-[6.5rem] px-2.5 text-xs">
      {copied === name ? <><Check /> Gekopieerd</> : "Kopieer"}
    </button>
  );
  const menuFor = (id: string, targets: { path: string; label: string }[], value: string | number, varName?: Binding) => (
    <div id={id} popover="auto" className="menu">
      <div className="menu-title">Gebruik als</div>
      {targets.map((t) => (
        <button key={t.path} type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" onClick={() => (typeof value === "string" && COLOR_VARS.includes(DIAL[t.path].v) ? bind(DIAL[t.path].v, varName ?? null, value) : dial.setValue(t.path, value))}>{label(t.label)}</button>
      ))}
    </div>
  );
  const [varQuery, setVarQuery] = useState("");
  // Kleurrij: DialKit ColorControl + variabelen-picker (Figma-stijl). Gekoppeld → chip met naam i.p.v. hex.
  const auto = deriveAuto(resolved);
  const colorRow = (d: Entry) => {
    const path = d.path;
    const bound = bindings[d.v];
    const id = `pick-${d.v.slice(5)}`;
    const q = varQuery.toLowerCase();
    return (
      <div key={path} className="flex items-center gap-1.5">
        {bound ? (
          <div className="dialkit-color-control flex-1" data-bound>
            <span className="dialkit-color-label">{label(d.key)}</span>
            <button type="button" popoverTarget={id} title={bound === "auto" ? "Afgeleid van tekst/achtergrond/accent" : bound} className={`var-chip ${bound === "auto" ? "auto-chip" : ""}`}>
              <span className="swatch size-3.5 shrink-0 rounded-sm" style={{ background: resolved[d.v] }} />
              <span className="truncate">{bound === "auto" ? `Auto · ${resolved[d.v]}` : shortName(bound)}</span>
            </button>
            <button type="button" className="var-detach" title="Loskoppelen" aria-label="Loskoppelen" onClick={() => bind(d.v, null, resolved[d.v])}><Unlink /></button>
          </div>
        ) : (
          <div className="min-w-0 flex-1"><ColorControl label={label(d.key)} value={String(values[d.folder]?.[d.key] ?? "#000000")} onChange={(v) => dial.setValue(path, v)} /></div>
        )}
        {!bound && <button type="button" popoverTarget={id} className="var-btn" title="Variabele van de site" aria-label="Variabele kiezen" disabled={!siteVars.length}><VarIcon /></button>}
        <div id={id} popover="auto" className="menu menu-right w-64">
          <input type="search" value={varQuery} onChange={(e) => setVarQuery(e.target.value)} placeholder="Zoek variabele…" className="field mb-1 h-7 text-xs" />
          <div className="max-h-64 overflow-y-auto">
            {(AUTO_VARS as readonly string[]).includes(d.v) && !q && (
              <button type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" onClick={() => bind(d.v, "auto", auto[d.v as (typeof AUTO_VARS)[number]])} aria-current={bound === "auto"}>
                <span className="swatch size-4 shrink-0 rounded" style={{ background: auto[d.v as (typeof AUTO_VARS)[number]] }} />
                <span className="text-[12px]">Auto</span><span className="ml-auto text-[10px] text-muted">afgeleid</span>
              </button>
            )}
            {siteVars.filter((v) => !q || v.name.toLowerCase().includes(q) || v.value.includes(q)).map((v) => (
              <button key={v.name} type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" title={v.name} onClick={() => bind(d.v, v.name as Binding, v.value)} aria-current={bound === v.name}>
                <span className="swatch size-4 shrink-0 rounded" style={{ background: v.value }} />
                <span className="truncate font-mono text-[11px]">{shortName(v.name)}</span>
                <span className="ml-auto shrink-0 font-mono text-[10px] text-muted">{hex(v.value)}</span>
              </button>
            ))}
            {extracted && !q && (
              <>
                <div className="menu-title mt-1">Gevonden kleuren</div>
                <div className="grid grid-cols-8 gap-1 px-1 pb-1">
                  {extracted.colors.slice(0, 32).map((c) => (
                    <button key={c.value} type="button" popoverTarget={id} popoverTargetAction="hide" title={`${c.value} · ${c.count}×`} className="swatch aspect-square rounded transition-transform duration-150 active:scale-[0.97]" style={{ background: c.value, padding: 0 }} onClick={() => bind(d.v, null, c.value)} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  const sliderFor = (path: string, range: readonly [number, number, number?], unit = "px", lbl?: string) => { const [f, k] = path.split("."); return <Slider key={path} label={lbl ?? label(k)} value={Number(values[f]?.[k] ?? 0)} onChange={(v) => dial.setValue(path, v)} min={range[0]} max={range[1]} step={range[2] ?? 1} unit={unit} shortcut={SHORTCUTS[path]} />; };
  const slider = (d: Entry) => sliderFor(d.path, d.range!, d.unit);
  const fx = values.effect as unknown as EffectValues | undefined;
  const effectPanel = (
    <div className="flex flex-col gap-1.5">
      {Object.entries(SHADOW).map(([k, d]) => sliderFor(`effect.${k}`, d.range, d.unit, d.label))}
      <ColorControl label="Schaduw kleur" value={fx?.color ?? "#000000"} onChange={(v) => dial.setValue("effect.color", v)} />
      {/* ponytail: alleen de curve — Time/Physics (springs) passen niet in een CSS cubic-bezier */}
      {fx?.easing?.ease && <Folder title="Switch-easing" defaultOpen><EasingVisualization easing={fx.easing} onChange={(ease) => dial.setValue("effect.easing", { ...fx.easing, ease } as unknown as string)} /></Folder>}
      <ButtonGroup buttons={[{ label: "Speel switch-animatie af", onClick: replay }]} />
    </div>
  );
  const applyLayout = (l: Layout) => {
    setHide((h) => (h.join() === l.hide.join() ? h : l.hide)); // zelfde referentie = geen iframe-reload
    dial.setValues(toDialValues({ ...resolved, ...l.patch }));
  };
  const starters = (
    <div className="px-3 pb-4">
      <p className="mb-3 text-[11px] leading-relaxed text-muted">Kies de opzet; kleuren, radius en teksten blijven staan en stel je in bij Kleuren en Layout.</p>
      <div className="grid grid-cols-2 gap-2">
        {STARTERS.map((t) => { const bar = t.name === "Balk"; const btns = 3 - t.layout.hide.filter((h) => h !== "save").length; return (
          <button key={t.name} type="button" onClick={() => applyLayout(t.layout)} className="starter">
            <span className="starter-preview" style={{ background: `color-mix(in srgb, ${resolved["--cb-color"]} 8%, ${resolved["--cb-color-background"]})` }}>
              <span className="starter-card" style={{ background: resolved["--cb-color-background"], borderRadius: bar ? 0 : 6, width: bar ? "100%" : "78%", bottom: bar ? 0 : 6 }}>
                <i style={{ background: resolved["--cb-color"], width: "55%", height: 3, borderRadius: 2 }} />
                <i style={{ background: resolved["--cb-color"], opacity: 0.35, width: "85%", height: 2, borderRadius: 2 }} />
                <span className="mt-auto flex justify-end gap-1">
                  {btns === 3 && <i style={{ background: resolved["--cb-color-surface"], width: 14, height: 6, borderRadius: 2 }} />}
                  {btns >= 2 && <i style={{ background: resolved["--cb-color-accent"], width: 14, height: 6, borderRadius: 2 }} />}
                  <i style={{ background: resolved["--cb-color-accent"], width: 18, height: 6, borderRadius: 2 }} />
                </span>
              </span>
            </span>
            <span className="block text-[12px] font-medium">{t.name}</span>
            <span className="block text-[10px] text-muted">{t.hint}</span>
          </button>
        ); })}
      </div>
    </div>
  );
  // "Keuze opslaan" bestaat alleen met een instellingen-knop
  const toggleHide = (a: Hidden, on: boolean) => setHide((h) => { const linked: Hidden[] = a === "settings" ? [a, "save"] : [a]; return on ? h.filter((x) => !linked.includes(x)) : [...new Set([...h, ...linked])]; });
  const layoutPanel = (
    <div className="flex flex-col gap-1.5">
      <div className="gs-row"><span>Uitlijning</span><GlideSelect ariaLabel="Uitlijning" value={align} options={[{ value: "links", label: "Links", tag: "margin-left 0" }, { value: "midden", label: "Midden", tag: "standaard" }, { value: "rechts", label: "Rechts", tag: "margin-right 0" }]} onChange={(v) => setAlign(v as Align)} size="sm" align="right" menuWidth={200} /></div>
      <Toggle label="Knop: instellingen" checked={!hide.includes("settings")} onChange={(on) => toggleHide("settings", on)} />
      <Toggle label="Knop: weigeren" checked={!hide.includes("reject")} onChange={(on) => toggleHide("reject", on)} />
    </div>
  );
  const versions = <PresetManager panelId="banner" presets={presets} activePresetId={activePreset} onAdd={() => DialStore.saveNewPreset("banner")} />;
  const entries = (folder: string) => ENTRIES.filter((d) => d.folder === folder);

  const domain = (() => { try { return new URL(url).hostname; } catch { return "Nieuwe banner"; } })();

  // ---- Onderdelen; de Studio-layout zet ze neer ----
  const urlForm = (
    <form className="flex w-full items-center gap-2" onSubmit={(e) => { e.preventDefault(); extract(url, true); }}>
      <input type="text" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://klant.webflow.io/" className="field font-mono text-xs" />
      <button type="submit" disabled={status.loading} className="btn">{status.loading ? <><Spinner /> Bezig</> : "Stijl ophalen"}</button>
    </form>
  );
  const errorLine = status.error && <p role="alert" className="truncate text-xs text-red-400">{status.error}</p>;
  const previewControls = (
    <>
      <div className="seg" role="group" aria-label="Banner-staat">
        <button type="button" aria-pressed={!prefsOpen} onClick={() => setPrefsOpen(false)}>Gesloten</button>
        <button type="button" aria-pressed={prefsOpen} onClick={() => setPrefsOpen(true)}>Instellingen</button>
      </div>
      <div className="seg" role="group" aria-label="Formaat">
        <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button>
        <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobiel</button>
      </div>
      <button type="button" className="btn" aria-pressed={siteBg} disabled={!url} onClick={() => setSiteBg((s) => !s)} style={siteBg ? { boxShadow: "0 0 0 1px oklch(1 0 0 / 0.35)" } : undefined}>Site als achtergrond</button>
    </>
  );
  const shareBtn = <button type="button" className="btn btn-ghost" onClick={() => copy("link", location.href)}>{copied === "link" ? <><Check /> Link gekopieerd</> : "Deel link"}</button>;
  const roleOf = (c: string) => (c === hex(extracted?.body.color ?? "") ? "tekstkleur van de site" : c === hex(extracted?.body.background ?? "") ? "achtergrond van de site" : c === resolved["--cb-color-accent"] ? "gebruikt als accent" : undefined);
  const extractStatus = status.loading ? (
    <div className="rounded-xl p-3 text-xs text-muted" style={{ boxShadow: "var(--shadow-ring)" }}><div className="flex items-center gap-2 text-fg"><Spinner /> Stijl ophalen…</div><div className="mt-1">HTML en stylesheets lezen, kleuren en variabelen sorteren. Meestal 1–3 s.</div></div>
  ) : status.error ? (
    <div className="rounded-xl p-3 text-xs" style={{ boxShadow: "0 0 0 1px oklch(0.65 0.2 25 / 0.5)" }}><div className="font-medium text-red-300">Ophalen mislukt</div><div className="mt-1 text-muted">{status.error}. De site blokkeert misschien geautomatiseerde toegang, of de URL klopt niet.</div><button type="button" className="btn mt-2 h-7 text-xs" onClick={() => extract(url, true)}>Opnieuw proberen</button></div>
  ) : summary ? (
    <div className="flex items-start gap-2 rounded-xl p-3 text-xs text-muted" style={{ boxShadow: "var(--shadow-ring)" }}><span className="text-emerald-300"><Check /></span><span>{summary}</span></div>
  ) : null;
  const foundPanel = !extracted ? (
    <p className="px-1 pt-6 text-center text-xs leading-relaxed text-muted">Plak een URL en klik <em>Stijl ophalen</em>. Kleuren, radii en font-sizes van de site verschijnen hier.</p>
  ) : (
    <div className="space-y-5">
      <Section title="Belangrijkste kleuren">
          <div className="grid grid-cols-2 gap-1.5">
            {extracted.colors.slice(0, 6).map((c, i) => (
              <span key={c.value} className="relative">
                <button type="button" popoverTarget={`k${i}`} className="starter w-full p-2 text-left">
                  <span className="swatch mb-1.5 block h-9 w-full rounded-md" style={{ background: c.value }} />
                  <span className="block font-mono text-[11px]">{c.value} <span className="text-muted">{c.count}×</span></span>
                  <span className="block truncate text-[10px] text-muted">{roleOf(c.value) ?? (i === 0 ? "meest gebruikt" : "\u00a0")}</span>
                </button>
                {menuFor(`k${i}`, COLOR_TARGETS, c.value)}
              </span>
            ))}
          </div>
        </Section>
      <Section title="Kleuren" hint={`${extracted.colors.length}`}>
        <div className="grid grid-cols-6 gap-1.5">
          {extracted.colors.slice(0, 36).map((c, i) => (
            <span key={c.value} className="relative">
              <button type="button" popoverTarget={`c${i}`} title={`${c.value} · ${c.count}×`} className="swatch block aspect-square w-full rounded-md transition-transform duration-150 ease-out-strong active:scale-[0.97]" style={{ background: c.value }} aria-label={`${c.value}, ${c.count} keer`} />
              {menuFor(`c${i}`, COLOR_TARGETS, c.value)}
            </span>
          ))}
        </div>
      </Section>
      {siteVars.length > 0 && (
        <Section title="Variabelen" hint={`${siteVars.length}`}>
          <div className="space-y-0.5">
            {siteVars.slice(0, 40).map((v, i) => (
              <span key={v.name} className="relative block">
                <button type="button" popoverTarget={`v${i}`} title={v.name} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-raised">
                  <span className="swatch size-4 shrink-0 rounded" style={{ background: v.value }} />
                  <span className="truncate font-mono text-[11px] text-fg/80">{shortName(v.name)}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-muted">{hex(v.value)}</span>
                </button>
                {menuFor(`v${i}`, COLOR_TARGETS, v.value, v.name as Binding)}
              </span>
            ))}
          </div>
        </Section>
      )}
      <Section title="Radius">
        <div className="flex flex-wrap gap-1.5">
          {extracted.radii.filter((r) => toPx(r.value)).map((r, i) => (
            <span key={r.value} className="relative">
              <button type="button" popoverTarget={`r${i}`} className="btn h-7 gap-1.5 px-2 font-mono text-[11px]"><span className="inline-block size-3 border-t border-l border-fg/60" style={{ borderTopLeftRadius: Math.min(toPx(r.value)!, 12) }} />{toPx(r.value)}px <span className="text-muted">{r.count}×</span></button>
              {menuFor(`r${i}`, RADIUS_TARGETS, toPx(r.value)!)}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Font-size">
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(extracted.fontSizes).filter(([, v]) => v && toPx(v)).map(([tag, v], i) => (
            <span key={tag} className="relative">
              <button type="button" popoverTarget={`f${i}`} className="btn h-7 px-2 font-mono text-[11px]"><span className="text-muted">{tag}</span> {toPx(v!)}px</button>
              {menuFor(`f${i}`, FONT_TARGETS, toPx(v!)!)}
            </span>
          ))}
        </div>
      </Section>
    </div>
  );
  const generalTexts = (
    <div className="flex flex-col gap-1.5">
      {GENERAL_TEXTS.map(([i, lbl]) => (
        <Fragment key={i}>
          <TextControl label={lbl} value={texts[i]} onChange={(v) => setTexts((s) => s.map((x, j) => (j === i ? v : x)))} />
          {i === 2 && <TextControl label="Privacy-URL" value={privacy} onChange={setPrivacy} placeholder="/privacybeleid" />}
        </Fragment>
      ))}
    </div>
  );
  const categoryList = (
    <>
      {cats.map((c, i) => {
        const upd = (patch: Partial<Cat>) => setCats((cs) => cs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
        return (
          <div key={c.id ?? i} data-id={c.id} className="drag-row" data-over={drag.over === i && drag.from !== i ? (drag.from! < i ? "after" : "before") : undefined} data-dragging={drag.from === i || undefined}>
            <button type="button" className="drag-handle" aria-label="Versleep categorie" title="Versleep" onPointerDown={startDrag(i)}><Grip /></button>
            <Folder title={c.title || `Categorie ${i + 1}`} inline defaultOpen={false}>
              <div className="flex flex-col gap-1.5">
                <TextControl label="Titel" value={c.title} onChange={(v) => upd({ title: v, ...(c.locked || cats.some((x) => x !== c && x.key === c.key) || c.key === slug(c.title) ? { key: c.locked ? "" : slug(v) } : {}) })} />
                <TextControl label="Tekst" value={c.text} onChange={(v) => upd({ text: v })} />
                {c.locked ? (
                  <p className="px-3 py-1 text-[11px] text-muted">Staat altijd aan (geen schakelaar).</p>
                ) : (
                  <>
                    <TextControl label="Key" value={c.key} onChange={(v) => upd({ key: slug(v) })} placeholder="analytics" />
                    <TextControl label="Consent Mode" value={c.signals} onChange={(v) => upd({ signals: v })} placeholder="analytics_storage" />
                    <ButtonGroup buttons={[{ label: "Categorie verwijderen", onClick: () => setCats((cs) => cs.filter((_, j) => j !== i)) }]} />
                  </>
                )}
              </div>
            </Folder>
          </div>
        );
      })}
      <div className="pt-2">
        <ButtonGroup buttons={[{ label: "+ Nieuwe categorie", onClick: () => setCats((cs) => [...cs, { id: cid(), key: `categorie_${Date.now() % 10000}`, title: "Nieuwe categorie", text: "", signals: "" }]) }]} />
      </div>
    </>
  );
  const contrastStrip = (
    <div className="grid grid-cols-3 gap-1.5 px-3 pb-2">
      {CONTRAST_PAIRS.map(([a, b, name]) => {
        const r = contrast(resolved[a], resolved[b]) ?? 0;
        const ok = r >= 4.5;
        return (
          <div key={name} className="rounded-lg p-2" style={{ boxShadow: "var(--shadow-ring)" }} title={`${a} op ${b}`}>
            <div className="flex items-center justify-between">
              <span className="swatch flex h-5 w-7 items-center justify-center rounded text-[10px] font-bold" style={{ background: resolved[b], color: resolved[a] }}>Aa</span>
              <span className={`rounded px-1 py-px text-[10px] font-semibold ${ok ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{ok ? "AA" : "✕"}</span>
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-[11px]"><span className="text-muted">{name}</span><span className="font-mono">{r.toFixed(1)}</span></div>
          </div>
        );
      })}
    </div>
  );
  const styleFolders = {
    kleuren: <div className="flex flex-col gap-1.5">{entries("kleuren").map(colorRow)}</div>,
    typografie: <div className="flex flex-col gap-1.5">{entries("typografie").map(slider)}</div>,
    layout: layoutPanel,
    maten: <div className="flex flex-col gap-1.5">{entries("maten").map(slider)}</div>,
    effect: effectPanel,
  };
  const behaviourPanel = (
    <>
      <div className="flex flex-col gap-1.5">
        <TextControl label="Opslag-key (localStorage / cookie)" value={key} onChange={setKey} placeholder="klant_consent" />
        <TextControl label="Geldigheid (dagen)" value={String(days)} onChange={(v) => setDays(Number(v) || 180)} />
        <TextControl label="Versie (verhoog = opnieuw vragen)" value={String(bannerVersion)} onChange={(v) => setBannerVersion(Number(v) || 1)} />
      </div>
      <p className="px-3 pt-3 text-[11px] leading-relaxed text-muted">Consent Mode v2-signalen per categorie stel je in bij <em>Banner → Categorieën</em>.</p>
    </>
  );
  const steps = ["css", "head", "footer", "webflow"];
  const [forAgent, setForAgent] = useState(false); // Webflow-stappen of één agent-prompt
  const agentView = () => ( // pas bij tonen opbouwen: agentPrompt() gebruikt location
    <div className="space-y-3">
      <p className="text-[11px] leading-relaxed text-muted">Head, CSS, footer, markup met class-CSS en een checklist als één instructie. Plak in Claude Code of Cursor met “implementeer dit”. Werkt ook buiten Webflow.</p>
      <button type="button" onClick={() => copy("agent", agentPrompt())} className="btn btn-primary h-9 w-full">{copied === "agent" ? <><Check /> Gekopieerd</> : "Copy for agents"}</button>
      <pre className="code max-h-72">{agentPrompt()}</pre>
    </div>
  );
  const exportPanel = (
    <div className="space-y-4 px-3 pb-4">
      <div className="seg w-full" role="group" aria-label="Exporteren voor">
        <button type="button" className="flex-1" aria-pressed={!forAgent} onClick={() => setForAgent(false)}>Webflow</button>
        <button type="button" className="flex-1" aria-pressed={forAgent} onClick={() => setForAgent(true)}>Agent</button>
      </div>
      {forAgent ? agentView() : <>
      <div className="flex items-center gap-1.5 text-[11px] text-muted">
          {steps.map((k, i) => <span key={k} className={`flex size-5 items-center justify-center rounded-full ${done.includes(k) ? "bg-emerald-400/20 text-emerald-300" : "bg-raised"}`}>{done.includes(k) ? <Check /> : i + 1}</span>)}
          <span className="ml-1">{done.filter((d) => steps.includes(d)).length}/{steps.length} in Webflow geplakt</span>
        </div>
      <Step n={1} done={done.includes("css")} title="custom.css" sub="Site settings → Custom code → Head" action={copyBtn("css", exportCss)}><pre className="code max-h-44">{exportCss}</pre></Step>
      {exportAlign && <Step n={1} title="Uitlijning" sub="Onder custom.css plakken (buiten de source-repo)" action={copyBtn("align", exportAlign)}><pre className="code">{exportAlign}</pre></Step>}
      <Step n={2} done={done.includes("head")} title="Head-code" sub="Boven GTM" action={copyBtn("head", headCode)}><pre className="code max-h-32">{headCode}</pre></Step>
      <Step n={3} done={done.includes("footer")} title="Footer-code" sub={`v${files.version}`} action={copyBtn("footer", footerCode)}><pre className="code">{footerCode}</pre></Step>
      <Step n={4} done={done.includes("webflow")} title="Component" sub="Plak met ⌘V in de Webflow Designer">
        <button type="button" onClick={copyToWebflow} className="btn btn-primary h-9 w-full">{copied === "webflow" ? <><Check /> Gekopieerd – plak in de Designer</> : "Copy to Webflow"}</button>
      </Step>
      <Step n={5} title="Testen" sub="Publiceer in Webflow en open de site">
          <div className="flex gap-2">
            <a href={url || "#"} target="_blank" rel="noreferrer" className="btn flex-1" aria-disabled={!url}>Open site <Arrow /></a>
            <a href="https://tagassistant.google.com" target="_blank" rel="noreferrer" className="btn flex-1">Tag Assistant <Arrow /></a>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">Check: banner verschijnt, ‘Weigeren’ zet alles op denied, na keuze geen banner meer. Cookie-instellingen-link in de footer opent hem weer.</p>
        </Step>
      </>}
    </div>
  );
  // Export als checklist-menu in de topbar. Klik = kopiëren + afvinken (menu blijft open).
  const checkItems: [string, string, string, () => void][] = [
    ["webflow", "Copy to Webflow", "component", copyToWebflow],
    ["css", "custom.css", "head", () => copy("css", exportCss)],
    ["head", "Head-code", "boven GTM", () => copy("head", headCode)],
    ["footer", "Footer-code", "footer", () => copy("footer", footerCode)],
  ];
  const doneCount = checkItems.filter(([k]) => done.includes(k)).length;
  const [row, setRow] = useState<number | null>(null); // glijdende pill in het export-menu
  const exportMenu = (
    <div id="export-menu" popover="auto" className="menu menu-right w-64">
      <button type="button" className="menu-item" onClick={() => copy("agent", agentPrompt())}><span className="flex-1">Copy for agents</span><span className="text-[10px] text-muted">{copied === "agent" ? "Gekopieerd" : "prompt"}</span></button>
      <div className="my-1 h-px bg-line" />
      <div className="menu-title flex items-center justify-between">Webflow <span className="font-mono normal-case">{doneCount}/{checkItems.length}</span></div>
      <div className="check-list" onPointerLeave={() => setRow(null)}>
        <span className="check-pill" aria-hidden style={{ transform: `translateY(${(row ?? 0) * 33}px)`, opacity: row === null ? 0 : 1 }} />
        {checkItems.map(([k, lbl, hint, act], i) => (
          <button key={k} type="button" className="menu-item check-item" data-done={done.includes(k)} onClick={act} onPointerEnter={() => setRow(i)}>
            <span className="check" aria-hidden><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 8.5l3 3 6.5-6.5" /></svg></span>
            <span className="check-label flex-1">{lbl}</span>
            <span className="check-hint text-[10px] text-muted">{done.includes(k) ? (copied === k ? "Gekopieerd" : "Klaar") : hint}</span>
          </button>
        ))}
      </div>
      <div className="my-1 h-px bg-line" />
      <button type="button" className="menu-item" popoverTarget="export-menu" popoverTargetAction="hide" onClick={() => window.dispatchEvent(new CustomEvent("consentkit:open", { detail: "installatie" }))}><span className="flex-1">Alle stappen bekijken</span><span className="text-muted">→</span></button>
    </div>
  );
  // Lege staat op het canvas
  const emptyState = (
    <div className="mx-auto w-full max-w-lg rounded-2xl bg-panel p-6" style={{ boxShadow: "var(--shadow-pop)" }}>
      <h2 className="text-[15px] font-semibold">Nieuwe cookiebanner</h2>
      <p className="mt-1 mb-4 text-xs leading-relaxed text-muted">Plak de URL van de site. We halen kleuren, radius en font-sizes op en zetten de banner in de huisstijl.</p>
      {urlForm}
      <div className="mt-3">{extractStatus}</div>
      <div className="mt-5 mb-2 text-[11px] font-medium tracking-wide text-muted uppercase">Of begin met een opzet</div>
      <div className="grid grid-cols-4 gap-2">
        {STARTERS.map((t) => (
          <button key={t.name} type="button" onClick={() => { applyLayout(t.layout); setSummary(""); }} className="starter">
            <span className="starter-preview" style={{ background: "#e9e9e9", height: 48 }}><span className="starter-card" style={{ background: "#fff", borderRadius: t.name === "Balk" ? 0 : 5, width: t.name === "Balk" ? "100%" : "78%", bottom: t.name === "Balk" ? 0 : 4, height: 28, padding: 5, gap: 3 }}><i style={{ background: "#333", width: "50%", height: 2 }} /><span className="mt-auto flex justify-end gap-1"><i style={{ background: "#999", width: 10, height: 4, borderRadius: 1 }} /></span></span></span>
            <span className="block text-[11px] font-medium">{t.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
  const preview = (
    <iframe
      ref={frame}
      title="Preview"
      srcDoc={srcdoc}
      onLoad={pushVars}
      data-testid="preview"
      className="mx-auto block rounded-xl bg-white shadow-[0_0_0_1px_oklch(1_0_0_/_0.1),0_24px_64px_oklch(0_0_0_/_0.5)]"
      style={{ width: mobile ? 390 : "min(1024px, 100%)", height: mobile ? 720 : 640, maxWidth: "100%" }}
    />
  );

  const parts: Parts = { domain, urlForm, errorLine, previewControls, shareBtn, foundPanel, generalTexts, categoryList, contrastStrip, versions, starters, styleFolders, behaviourPanel, exportPanel, preview, version: files.version,
    extractStatus, exportMenu, doneCount, doneTotal: checkItems.length, emptyState: !extracted && summary === null ? emptyState : null, artboard: mobile ? "Mobiel · 390 × 720" : "Desktop · 1024 × 640", undo };
  return (
    <>
      <Studio {...parts} />
      {/* Onzichtbare DialRoot: levert alleen de globale shortcut-listener (toets + scroll) voor onze eigen layout */}
      <div hidden><DialRoot mode="inline" productionEnabled /></div>
    </>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 flex items-baseline justify-between text-[11px] font-medium tracking-wide text-muted uppercase">{title}{hint && <span className="font-mono normal-case">{hint}</span>}</h3>
      {children}
    </section>
  );
}
function Step({ n, done, title, sub, action, children }: { n: number; done?: boolean; title: string; sub: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex size-5 items-center justify-center rounded-full font-mono text-[10px] ${done ? "bg-emerald-400/20 text-emerald-300" : "bg-raised"}`}>{done ? <Check /> : n}</span>
        <div className="min-w-0 flex-1 leading-tight"><div className="text-[13px] font-medium">{title}</div><div className="truncate text-[11px] text-muted">{sub}</div></div>
        {action}
      </div>
      {children}
    </section>
  );
}
const Grip = () => <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden><circle cx="2.5" cy="2" r="1.3" /><circle cx="7.5" cy="2" r="1.3" /><circle cx="2.5" cy="7" r="1.3" /><circle cx="7.5" cy="7" r="1.3" /><circle cx="2.5" cy="12" r="1.3" /><circle cx="7.5" cy="12" r="1.3" /></svg>;
const Arrow = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L12 4M6 4h6v6" /></svg>;
const Check = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>;
const VarIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
const Unlink = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5l3-3M9 4l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M7 12l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1M3 3l10 10" /></svg>;
const Spinner = () => <svg className="animate-spin [animation-duration:0.7s]" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2a6 6 0 1 1-6 6" /></svg>;
