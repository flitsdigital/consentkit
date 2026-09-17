"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ButtonGroup, ColorControl, Folder, Slider, TextControl, useDialKitController, type DialConfig } from "dialkit";
import { formatHex, parse } from "culori";
import { AUTO_VARS, COLOR_VARS, DEFAULTS, VAR_NAMES, contrast, deriveAuto, keyFromUrl, mapToVars, renderCustomCss, toPx, type Extracted, type VarName, type Vars } from "@/lib/mapping";

type Files = { customCss: string; classesCss: string; componentHtml: string; clipboardJson: string; headSnippet: string; version: string };
type Node = { _id: string; text?: boolean; v?: string; children?: string[]; data?: { xattr?: { name: string; value: string }[]; link?: { mode: string; url: string } } };
type Cat = { key: string; title: string; text: string; signals: string; locked?: boolean };
// Tekstnodes in clipboard.json, in volgorde: 0 titel, 1 tekst, 2 privacylink, 3–8 drie categorieën (titel, tekst), 9–12 knoppen
const GENERAL: [number, string][] = [[0, "Titel"], [1, "Tekst"], [2, "Privacylink"], [9, "Knop: instellingen"], [10, "Knop: opslaan"], [11, "Knop: weigeren"], [12, "Knop: accepteren"]];
const DEFAULT_SIGNALS: Record<string, string> = { analytics: "analytics_storage", marketing: "ad_storage, ad_user_data, ad_personalization" };
const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "categorie";
const PRIVACY_HREF = "/privacybeleid"; // href in component.html / clipboard.json

const CONTRAST_PAIRS: [VarName, VarName, string][] = [["--cb-color-accent-text", "--cb-color-accent", "Knop"], ["--cb-color", "--cb-color-background", "Tekst"], ["--cb-color", "--cb-color-surface", "Secundair"]];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const hex = (v: string) => { const c = parse(v); return c ? formatHex(c) : "#000000"; };

// DialKit-pad ↔ --cb-variabele. Sliders in px; kleuren als hex; schaduw/easing als tekst.
const DIAL: Record<string, { v: VarName; range?: [number, number, number?]; text?: true }> = {
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
  "maten.maxBreedte": { v: "--cb-max-width", range: [320, 960, 10] },
  "maten.kaartRadius": { v: "--cb-border-radius", range: [0, 40] },
  "maten.knopRadius": { v: "--cb-button-radius", range: [0, 32] },
  "maten.switchBreedte": { v: "--cb-switch-width", range: [32, 72] },
  "maten.switchHoogte": { v: "--cb-switch-height", range: [16, 40] },
  "maten.switchPadding": { v: "--cb-switch-padding", range: [0, 8] },
  "maten.zIndex": { v: "--cb-z-index", range: [1, 99999, 1] },
  "effect.schaduw": { v: "--cb-shadow", text: true },
  "effect.easing": { v: "--cb-ease", text: true },
};
type DialValues = Record<string, Record<string, string | number>>;

const num = (d: (typeof DIAL)[string], v: string) => (d.v === "--cb-z-index" ? Number(v) : toPx(v) ?? toPx(DEFAULTS[d.v])!);
function dialConfig(vars: Vars) {
  const cfg: Record<string, Record<string, unknown>> = {};
  for (const [path, d] of Object.entries(DIAL)) {
    const [folder, k] = path.split(".");
    cfg[folder] ??= {};
    cfg[folder][k] = d.text ? { type: "text", default: vars[d.v] } : d.range ? [num(d, vars[d.v]), ...d.range] : hex(vars[d.v]);
  }
  return cfg as DialConfig;
}
const toDial = (vars: Vars) => {
  const out: DialValues = {};
  for (const [path, d] of Object.entries(DIAL)) {
    const [folder, k] = path.split(".");
    out[folder] ??= {};
    out[folder][k] = d.text ? vars[d.v] : d.range ? num(d, vars[d.v]) : hex(vars[d.v]);
  }
  return out;
};
const toVars = (values: DialValues): Vars => {
  const vars = { ...DEFAULTS } as Vars;
  for (const [path, d] of Object.entries(DIAL)) {
    const [folder, k] = path.split(".");
    const val = values[folder]?.[k];
    if (val === undefined) continue;
    vars[d.v] = typeof val === "number" ? (d.v === "--cb-z-index" ? String(val) : `${val}px`) : val;
  }
  return vars;
};
const pathOf = (n: VarName) => Object.entries(DIAL).find(([, d]) => d.v === n)![0];
const COLOR_TARGETS = Object.entries(DIAL).filter(([, d]) => COLOR_VARS.includes(d.v)).map(([p]) => ({ path: p, label: p.split(".")[1] }));
const RADIUS_TARGETS = [{ path: "maten.kaartRadius", label: "Kaart" }, { path: "maten.knopRadius", label: "Knop" }];
const FONT_TARGETS = [{ path: "typografie.tekst", label: "Tekst" }, { path: "typografie.klein", label: "Klein" }, { path: "typografie.titel", label: "Titel" }];
const label = (k: string) => k.replace(/([A-Z])/g, " $1").toLowerCase().replace(/^./, (c) => c.toUpperCase());

export function Configurator({ files }: { files: Files }) {
  const params = useSearchParams();
  const clipboard = useMemo(() => JSON.parse(files.clipboardJson) as { payload: { nodes: Node[] } }, [files.clipboardJson]);
  const originals = useMemo(() => clipboard.payload.nodes.filter((n) => n.text).map((n) => n.v ?? ""), [clipboard]);

  const [url, setUrl] = useState(params.get("url") ?? "");
  const [texts, setTexts] = useState<string[]>(() => originals.map((o, i) => params.get(`t${i}`) ?? o));
  const defaultCats = useMemo<Cat[]>(() => [
    { key: "", title: originals[3], text: originals[4], signals: "", locked: true },
    { key: "analytics", title: originals[5], text: originals[6], signals: DEFAULT_SIGNALS.analytics },
    { key: "marketing", title: originals[7], text: originals[8], signals: DEFAULT_SIGNALS.marketing },
  ], [originals]);
  const [cats, setCats] = useState<Cat[]>(() => { try { return JSON.parse(params.get("cats") ?? "") as Cat[]; } catch { return defaultCats; } });
  const [key, setKey] = useState(params.get("key") ?? "");
  const [privacy, setPrivacy] = useState(params.get("privacy") ?? PRIVACY_HREF);
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [siteBg, setSiteBg] = useState(false);
  const [leftTab, setLeftTab] = useState<"gevonden" | "teksten">("gevonden");
  const [rightTab, setRightTab] = useState<"stijl" | "export">("stijl");
  const [copied, setCopied] = useState("");
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
      if (over !== from) setCats((cs) => { const n = [...cs]; const [m] = n.splice(from, 1); n.splice(over, 0, m); return n; });
      setDrag({ from: null, over: null });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    setDrag({ from, over: from });
  };
  // Figma-achtige variabelen: kleur gekoppeld aan een site-variabele → export als var(--naam).
  // "auto" = afgeleid van tekst/achtergrond/accent (deriveAuto) tot de gebruiker de kleur zelf zet.
  const [bindings, setBindings] = useState<Partial<Record<VarName, string>>>(() =>
    Object.fromEntries(COLOR_VARS.flatMap((n) => {
      const p = params.get(n.slice(2));
      const m = p?.match(/^var\((--[^)]+)\)$/);
      if (m) return [[n, m[1]]];
      return !p && (AUTO_VARS as readonly string[]).includes(n) ? [[n, "auto"]] : [];
    })));

  const [config] = useState(() => dialConfig(Object.fromEntries(VAR_NAMES.map((n) => [n, (params.get(n.slice(2)) ?? DEFAULTS[n]).replace(/^var\(.*$/, DEFAULTS[n])])) as Vars));
  const dial = useDialKitController("Banner", config, { id: "banner" });
  const values = dial.values as unknown as DialValues;
  const resolved = useMemo(() => toVars(values), [values]); // altijd hex/px: preview + contrast
  const vars = useMemo(() => ({ ...resolved, ...Object.fromEntries(Object.entries(bindings).filter(([, v]) => v !== "auto").map(([n, v]) => [n, `var(${v})`])) }) as Vars, [resolved, bindings]); // export
  // Auto-kleuren volgen tekst/achtergrond/accent
  useEffect(() => {
    const auto = deriveAuto(resolved);
    for (const n of AUTO_VARS) if (bindings[n] === "auto" && resolved[n] !== auto[n]) dial.setValue(pathOf(n), auto[n]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved["--cb-color"], resolved["--cb-color-background"], resolved["--cb-color-accent"], bindings]);
  const siteVars = useMemo(() => (extracted?.variables ?? []).filter((v) => !v.name.startsWith("--cb-") && (/^(#|rgb|hsl|oklch)/i.test(v.value) || /^[a-z]+$/i.test(v.value)) && parse(v.value)), [extracted]);
  const bind = (n: VarName, name: string | null, value: string) => {
    setBindings((b) => { const next = { ...b }; if (name) next[n] = name; else delete next[n]; return next; });
    dial.setValue(pathOf(n), hex(value));
  };

  // Deelbare state: alles wat afwijkt van de default in de querystring
  useEffect(() => {
    const q = new URLSearchParams();
    if (url) q.set("url", url);
    if (key) q.set("key", key);
    if (privacy !== PRIVACY_HREF) q.set("privacy", privacy);
    VAR_NAMES.forEach((n) => vars[n] !== DEFAULTS[n] && bindings[n] !== "auto" && q.set(n.slice(2), vars[n]));
    GENERAL.forEach(([i]) => texts[i] !== originals[i] && q.set(`t${i}`, texts[i]));
    if (JSON.stringify(cats) !== JSON.stringify(defaultCats)) q.set("cats", JSON.stringify(cats));
    window.history.replaceState(null, "", q.size ? `?${q}` : location.pathname);
  }, [url, key, privacy, vars, texts, cats, defaultCats, originals, bindings]);

  async function extract(target: string, apply: boolean) {
    setStatus({ loading: true });
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(target)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setExtracted(json);
      const found = new Map((json as Extracted).variables.map((v) => [v.name, v.value]));
      for (const [n, name] of Object.entries(bindings)) if (found.has(name)) dial.setValue(pathOf(n as VarName), hex(found.get(name)!));
      if (apply) {
        dial.setValues(toDial(mapToVars(json)));
        setBindings((b) => ({ ...b, ...Object.fromEntries(AUTO_VARS.map((n) => [n, "auto"])) }));
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
    let h = GENERAL.reduce((acc, [i]) => acc.replaceAll(`>${esc(originals[i])}<`, `>${esc(texts[i])}<`), html).replace(`href="${PRIVACY_HREF}"`, `href="${esc(privacy)}"`);
    const [before, rest] = h.split('<div data-cb="prefs" class="cb-prefs">');
    const [inner, after] = rest.split('<div class="cb-actions">');
    const [, ...rows] = inner.split('<div class="cb-row">');
    const close = rows[rows.length - 1].slice(rows[rows.length - 1].lastIndexOf("</div>")); // sluit-div van cb-prefs
    const tpl = [rows[0], rows[1].slice(0, rows[1].length)];
    const body = cats.map((c) => '<div class="cb-row">' + fill(c.locked ? tpl[0] : tpl[1], defaultCats[c.locked ? 0 : 1], c)).join("");
    h = before + '<div data-cb="prefs" class="cb-prefs">' + body + close + '<div class="cb-actions">' + after;
    return h;
  };
  const clipboardJson = () => {
    const src = clipboard.payload.nodes;
    const byId = new Map(src.map((n) => [n._id, n]));
    const prefs = src.find((n) => n.data?.xattr?.some((a) => a.name === "data-cb" && a.value === "prefs"))!;
    const subtree = (id: string): string[] => [id, ...(byId.get(id)?.children ?? []).flatMap(subtree)];
    const oldRows = prefs.children!.flatMap(subtree);
    const out: Node[] = [];
    const clone = (id: string, from: Cat, to: Cat): string => {
      const n = byId.get(id)!;
      const c: Node = { ...n, _id: crypto.randomUUID() };
      if (n.text) c.v = n.v === from.title ? to.title : n.v === from.text ? to.text : n.v;
      if (n.data?.xattr) c.data = { ...n.data, xattr: n.data.xattr.map((a) => (a.name === "aria-label" && a.value === from.title ? { ...a, value: to.title } : a.name === "data-cb-toggle" ? { ...a, value: to.key } : a)) };
      if (n.children) c.children = n.children.map((ch) => clone(ch, from, to));
      out.push(c);
      return c._id;
    };
    const rowIds = cats.map((c) => clone(prefs.children![c.locked ? 0 : 1], defaultCats[c.locked ? 0 : 1], c));
    const nodes = src.filter((n) => !oldRows.includes(n._id)).map((n) => {
      if (n === prefs) return { ...n, children: rowIds };
      if (n.text) { const i = originals.indexOf(n.v ?? ""); return { ...n, v: GENERAL.some(([g]) => g === i) ? texts[i] : n.v }; }
      const link = n.data?.link?.url === PRIVACY_HREF ? { ...n.data.link, url: privacy } : n.data?.link;
      return link ? { ...n, data: { ...n.data, link } } : n;
    }).concat(out);
    return JSON.stringify({ ...clipboard, payload: { ...clipboard.payload, nodes } });
  };
  const categoriesJs = "{ " + cats.filter((c) => !c.locked && c.key).map((c) => `${c.key}: [${c.signals.split(",").map((x) => x.trim()).filter(Boolean).map((x) => `'${x}'`).join(", ")}]`).join(", ") + " }";

  const customCss = renderCustomCss(files.customCss, vars);
  const previewCss = renderCustomCss(files.customCss, resolved);
  const exportCss = `<style>\n${customCss}</style>`;
  const headCode = `<script>window.FlitsConsent = { key: '${key || "flits_consent"}', version: 1, days: 180, categories: ${categoriesJs} };</script>\n${files.headSnippet.trim()}`;
  const footerCode = `<script src="https://cdn.jsdelivr.net/gh/flitsdigital/cookie-consent@${files.version}/dist/consent.min.js" defer></script>`;

  const srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${previewCss}</style><style>${files.classesCss}</style><style>
*{box-sizing:border-box}
html,body{margin:0;height:100%;font-family:system-ui,sans-serif;background:color-mix(in srgb, var(--cb-color) 8%, var(--cb-color-background))}
.site{position:absolute;inset:0;width:100%;height:100%;border:0}
.cb-banner{display:block}
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
</script></body></html>`;

  function flash(name: string) { setCopied(name); setTimeout(() => setCopied(""), 1600); }
  async function copy(name: string, text: string) { await navigator.clipboard.writeText(text); flash(name); }
  // Webflow accepteert alleen clipboard-data met MIME-type application/json (zelfde truc als demo/index.html)
  function copyToWebflow() {
    const json = clipboardJson();
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); e.clipboardData?.setData("application/json", json); e.clipboardData?.setData("text/plain", json); };
    document.addEventListener("copy", onCopy);
    document.execCommand("copy");
    document.removeEventListener("copy", onCopy);
    flash("webflow");
  }

  const copyBtn = (name: string, text: string) => (
    <button type="button" onClick={() => copy(name, text)} className="btn h-7 px-2.5 text-xs">
      {copied === name ? <><Check /> Gekopieerd</> : "Kopieer"}
    </button>
  );
  const menuFor = (id: string, targets: { path: string; label: string }[], value: string | number, varName?: string) => (
    <div id={id} popover="auto" className="menu">
      <div className="menu-title">Gebruik als</div>
      {targets.map((t) => (
        <button key={t.path} type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" onClick={() => (typeof value === "string" && COLOR_VARS.includes(DIAL[t.path].v) ? bind(DIAL[t.path].v, varName ?? null, value) : dial.setValue(t.path, value))}>{label(t.label)}</button>
      ))}
    </div>
  );
  const shortName = (name: string) => name.replace(/^--_?/, "").replace(/\\.*$/, "");
  const [varQuery, setVarQuery] = useState("");
  // Kleurrij: DialKit ColorControl + variabelen-picker (Figma-stijl). Gekoppeld → chip met naam i.p.v. hex.
  const colorRow = (path: string) => {
    const d = DIAL[path];
    const bound = bindings[d.v];
    const id = `pick-${d.v.slice(5)}`;
    const q = varQuery.toLowerCase();
    return (
      <div key={path} className="flex items-center gap-1.5">
        {bound ? (
          <div className="dialkit-color-control flex-1" data-bound>
            <span className="dialkit-color-label">{label(path.split(".")[1])}</span>
            <button type="button" popoverTarget={id} title={bound === "auto" ? "Afgeleid van tekst/achtergrond/accent" : bound} className={`var-chip ${bound === "auto" ? "auto-chip" : ""}`}>
              <span className="swatch size-3.5 shrink-0 rounded-sm" style={{ background: resolved[d.v] }} />
              <span className="truncate">{bound === "auto" ? `Auto · ${resolved[d.v]}` : shortName(bound)}</span>
            </button>
            <button type="button" className="var-detach" title="Loskoppelen" aria-label="Loskoppelen" onClick={() => bind(d.v, null, resolved[d.v])}><Unlink /></button>
          </div>
        ) : (
          <div className="min-w-0 flex-1"><ColorControl label={label(path.split(".")[1])} value={String(values[path.split(".")[0]]?.[path.split(".")[1]] ?? "#000000")} onChange={(v) => dial.setValue(path, v)} /></div>
        )}
        {!bound && <button type="button" popoverTarget={id} className="var-btn" title="Variabele van de site" aria-label="Variabele kiezen" disabled={!siteVars.length}><VarIcon /></button>}
        <div id={id} popover="auto" className="menu w-64" style={{ positionArea: "bottom span-left" }}>
          <input type="search" value={varQuery} onChange={(e) => setVarQuery(e.target.value)} placeholder="Zoek variabele…" className="field mb-1 h-7 text-xs" autoFocus />
          <div className="max-h-64 overflow-y-auto">
            {(AUTO_VARS as readonly string[]).includes(d.v) && !q && (
              <button type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" onClick={() => bind(d.v, "auto", deriveAuto(resolved)[d.v as (typeof AUTO_VARS)[number]])} aria-current={bound === "auto"}>
                <span className="swatch size-4 shrink-0 rounded" style={{ background: deriveAuto(resolved)[d.v as (typeof AUTO_VARS)[number]] }} />
                <span className="text-[12px]">Auto</span><span className="ml-auto text-[10px] text-muted">afgeleid</span>
              </button>
            )}
            {siteVars.filter((v) => !q || v.name.toLowerCase().includes(q) || v.value.includes(q)).map((v) => (
              <button key={v.name} type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" title={v.name} onClick={() => bind(d.v, v.name, v.value)} aria-current={bound === v.name}>
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
  const slider = (path: string) => { const d = DIAL[path]; const [f, k] = path.split("."); return <Slider key={path} label={label(k)} value={Number(values[f]?.[k] ?? 0)} onChange={(v) => dial.setValue(path, v)} min={d.range![0]} max={d.range![1]} step={d.range![2] ?? 1} unit={d.v === "--cb-z-index" ? "" : "px"} />; };
  const text = (path: string) => { const [f, k] = path.split("."); return <TextControl key={path} label={label(k)} value={String(values[f]?.[k] ?? "")} onChange={(v) => dial.setValue(path, v)} />; };
  const paths = (folder: string) => Object.keys(DIAL).filter((p) => p.startsWith(folder + "."));

  const domain = (() => { try { return new URL(url).hostname; } catch { return "Nieuwe banner"; } })();
  const colorVars = siteVars;

  return (
    <div className="grid h-full grid-cols-[264px_1fr_336px] grid-rows-[48px_44px_1fr]">
      {/* Topbar */}
      <header className="col-span-3 flex items-center border-b border-line px-4">
        <div className="flex w-60 items-center gap-2 text-[13px] font-semibold tracking-tight"><Cookie /> consentkit</div>
        <div className="flex-1 truncate text-center text-[13px] text-muted">{domain}</div>
        <div className="flex w-60 items-center justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={() => copy("link", location.href)}>{copied === "link" ? <><Check /> Link gekopieerd</> : "Deel link"}</button>
          <button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => setRightTab("export")}>Exporteren <Arrow /></button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="col-span-3 flex items-center gap-3 border-b border-line px-4">
        <form className="flex w-[420px] items-center gap-2" onSubmit={(e) => { e.preventDefault(); extract(url, true); }}>
          <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://klant.webflow.io/" className="field font-mono text-xs" />
          <button type="submit" disabled={status.loading} className="btn">{status.loading ? <><Spinner /> Bezig</> : "Stijl ophalen"}</button>
        </form>
        {status.error && <p role="alert" className="truncate text-xs text-red-400">{status.error}</p>}
        <div className="ml-auto flex items-center gap-2">
          <div className="seg" role="group" aria-label="Banner-staat">
            <button type="button" aria-pressed={!prefsOpen} onClick={() => setPrefsOpen(false)}>Gesloten</button>
            <button type="button" aria-pressed={prefsOpen} onClick={() => setPrefsOpen(true)}>Instellingen</button>
          </div>
          <div className="seg" role="group" aria-label="Formaat">
            <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)}>Desktop</button>
            <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)}>Mobiel</button>
          </div>
          <button type="button" className="btn" aria-pressed={siteBg} disabled={!url} onClick={() => setSiteBg((s) => !s)} style={siteBg ? { boxShadow: "0 0 0 1px oklch(1 0 0 / 0.35)" } : undefined}>Site als achtergrond</button>
        </div>
      </div>

      {/* Links: gevonden waarden / teksten */}
      <aside className="flex min-h-0 flex-col border-r border-line bg-panel">
        <div className="px-3 pt-3 pb-2">
          <div className="seg">
            <button type="button" aria-pressed={leftTab === "gevonden"} onClick={() => setLeftTab("gevonden")}>Gevonden</button>
            <button type="button" aria-pressed={leftTab === "teksten"} onClick={() => setLeftTab("teksten")}>Teksten</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {leftTab === "gevonden" && (!extracted ? (
            <p className="px-1 pt-6 text-center text-xs leading-relaxed text-muted">Plak een URL en klik <em>Stijl ophalen</em>. Kleuren, radii en font-sizes van de site verschijnen hier.</p>
          ) : (
            <div className="space-y-5">
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
              {colorVars.length > 0 && (
                <Section title="Variabelen" hint={`${colorVars.length}`}>
                  <div className="space-y-0.5">
                    {colorVars.slice(0, 40).map((v, i) => (
                      <span key={v.name} className="relative block">
                        <button type="button" popoverTarget={`v${i}`} title={v.name} className="flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors duration-150 hover:bg-raised">
                          <span className="swatch size-4 shrink-0 rounded" style={{ background: v.value }} />
                          <span className="truncate font-mono text-[11px] text-fg/80">{shortName(v.name)}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted">{hex(v.value)}</span>
                        </button>
                        {menuFor(`v${i}`, COLOR_TARGETS, v.value, v.name)}
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
          ))}
          {leftTab === "teksten" && (
            <div className="dialkit-root texts px-1 pb-4" data-theme="dark">
              <Folder title="Algemeen" inline>
                <div className="flex flex-col gap-1.5">
                  {GENERAL.map(([i, lbl]) => (
                    <Fragment key={i}>
                      <TextControl label={lbl} value={texts[i]} onChange={(v) => setTexts((s) => s.map((x, j) => (j === i ? v : x)))} />
                      {i === 2 && <TextControl label="Privacy-URL" value={privacy} onChange={setPrivacy} placeholder="/privacybeleid" />}
                    </Fragment>
                  ))}
                </div>
              </Folder>
              {cats.map((c, i) => {
                const upd = (patch: Partial<Cat>) => setCats((cs) => cs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div
                    key={i}
                    className="drag-row"
                    data-over={drag.over === i && drag.from !== i ? (drag.from! < i ? "after" : "before") : undefined}
                    data-dragging={drag.from === i || undefined}
                  >
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
                <ButtonGroup buttons={[{ label: "+ Nieuwe categorie", onClick: () => setCats((cs) => [...cs, { key: `categorie_${cs.length}`, title: "Nieuwe categorie", text: "", signals: "" }]) }]} />
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Canvas */}
      <main className="canvas relative flex min-h-0 items-center justify-center overflow-auto p-8">
        <div className="relative">
          <iframe
            title="Preview"
            srcDoc={srcdoc}
            data-testid="preview"
            className="block rounded-xl bg-white shadow-[0_0_0_1px_oklch(1_0_0_/_0.1),0_24px_64px_oklch(0_0_0_/_0.5)] transition-[width,height] duration-200 ease-out-strong"
            style={{ width: mobile ? 390 : "min(1024px, calc(100vw - 264px - 336px - 64px))", height: mobile ? 720 : 640 }}
          />
        </div>
      </main>

      {/* Rechts: DialKit / export */}
      <aside className="flex min-h-0 flex-col border-l border-line bg-panel">
        <div className="px-3 pt-3 pb-2">
          <div className="seg w-full *:flex-1">
            <button type="button" aria-pressed={rightTab === "stijl"} onClick={() => setRightTab("stijl")}>Stijl</button>
            <button type="button" aria-pressed={rightTab === "export"} onClick={() => setRightTab("export")}>Exporteren</button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className={rightTab === "stijl" ? "" : "hidden"}>
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
            <div className="dialkit-root px-3 pb-4" data-theme="dark">
              <Folder title="Kleuren" inline><div className="space-y-1.5">{paths("kleuren").map(colorRow)}</div></Folder>
              <Folder title="Typografie" inline><div className="space-y-1.5">{paths("typografie").map(slider)}</div></Folder>
              <Folder title="Maten" inline><div className="space-y-1.5">{paths("maten").map(slider)}</div></Folder>
              <Folder title="Effect" inline defaultOpen={false}><div className="space-y-1.5">{paths("effect").map(text)}</div></Folder>
            </div>
          </div>
          {rightTab === "export" && (
            <div className="space-y-4 px-3 pb-4">
              <Step n={1} title="custom.css" sub="Site settings → Custom code → Head" action={copyBtn("css", exportCss)}><pre className="code max-h-44">{exportCss}</pre></Step>
              <Step n={2} title="Head-code" sub="Boven GTM" action={copyBtn("head", headCode)}>
                <label className="mb-2 flex items-center gap-2 text-[11px] text-muted">key <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="klant_consent" className="field h-7 font-mono text-[11px]" /></label>
                <pre className="code max-h-32">{headCode}</pre>
              </Step>
              <Step n={3} title="Footer-code" sub={`v${files.version}`} action={copyBtn("footer", footerCode)}><pre className="code">{footerCode}</pre></Step>
              <Step n={4} title="Component" sub="Plak met ⌘V in de Webflow Designer">
                <button type="button" onClick={copyToWebflow} className="btn btn-primary h-9 w-full">{copied === "webflow" ? <><Check /> Gekopieerd – plak in de Designer</> : "Copy to Webflow"}</button>
              </Step>
            </div>
          )}
        </div>
      </aside>
    </div>
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
function Step({ n, title, sub, action, children }: { n: number; title: string; sub: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-raised font-mono text-[10px]">{n}</span>
        <div className="min-w-0 flex-1 leading-tight"><div className="text-[13px] font-medium">{title}</div><div className="truncate text-[11px] text-muted">{sub}</div></div>
        {action}
      </div>
      {children}
    </section>
  );
}
const Cookie = () => <svg width="18" height="18" viewBox="0 0 24 24" className="text-accent" aria-hidden><path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M2 12C2 6.47715 6.47715 2 12 2C12.3853 2 12.7659 2.02184 13.1406 2.06443L14.1463 2.17875L14.0198 3.18304C14.0068 3.28644 14 3.39219 14 3.5C14 4.76634 14.9425 5.81419 16.1638 5.97771L16.9209 6.07907L17.0223 6.83617C17.1858 8.05754 18.2337 9 19.5 9C19.8094 9 20.1035 8.94425 20.3743 8.84314L21.4192 8.45303L21.6934 9.53406C21.8938 10.3239 22 11.1503 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM10 8.5C10 9.32843 9.32843 10 8.5 10C7.67157 10 7 9.32843 7 8.5C7 7.67157 7.67157 7 8.5 7C9.32843 7 10 7.67157 10 8.5ZM14 11.5C14 12.3284 13.3284 13 12.5 13C11.6716 13 11 12.3284 11 11.5C11 10.6716 11.6716 10 12.5 10C13.3284 10 14 10.6716 14 11.5ZM17 15C17.5523 15 18 14.5523 18 14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14C16 14.5523 16.4477 15 17 15ZM13 16.5C13 17.3284 12.3284 18 11.5 18C10.6716 18 10 17.3284 10 16.5C10 15.6716 10.6716 15 11.5 15C12.3284 15 13 15.6716 13 16.5ZM7 15C7.55228 15 8 14.5523 8 14C8 13.4477 7.55228 13 7 13C6.44772 13 6 13.4477 6 14C6 14.5523 6.44772 15 7 15Z" /></svg>;
const Grip = () => <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden><circle cx="2.5" cy="2" r="1.3" /><circle cx="7.5" cy="2" r="1.3" /><circle cx="2.5" cy="7" r="1.3" /><circle cx="7.5" cy="7" r="1.3" /><circle cx="2.5" cy="12" r="1.3" /><circle cx="7.5" cy="12" r="1.3" /></svg>;
const Check = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>;
const Arrow = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L12 4M6 4h6v6" /></svg>;
const VarIcon = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="5" height="5" rx="1" /><rect x="9" y="2" width="5" height="5" rx="1" /><rect x="2" y="9" width="5" height="5" rx="1" /><rect x="9" y="9" width="5" height="5" rx="1" /></svg>;
const Unlink = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5l3-3M9 4l1-1a2.5 2.5 0 0 1 3.5 3.5l-1 1M7 12l-1 1a2.5 2.5 0 0 1-3.5-3.5l1-1M3 3l10 10" /></svg>;
const Spinner = () => <svg className="animate-spin" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2a6 6 0 1 1-6 6" /></svg>;
