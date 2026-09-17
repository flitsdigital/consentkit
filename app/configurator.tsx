"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DialRoot, useDialKitController, type DialConfig } from "dialkit";
import { formatHex, parse } from "culori";
import { COLOR_VARS, DEFAULTS, VAR_NAMES, contrast, keyFromUrl, mapToVars, renderCustomCss, toPx, type Extracted, type VarName, type Vars } from "@/lib/mapping";

type Files = { customCss: string; classesCss: string; componentHtml: string; clipboardJson: string; headSnippet: string; version: string };
type Node = { text?: boolean; v?: string; data?: { xattr?: { name: string; value: string }[] } };

const TEXT_LABELS = ["Titel", "Tekst", "Privacylink", "Categorie 1", "Categorie 1 – tekst", "Categorie 2", "Categorie 2 – tekst", "Categorie 3", "Categorie 3 – tekst", "Knop: instellingen", "Knop: opslaan", "Knop: weigeren", "Knop: accepteren"];
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
  const [key, setKey] = useState(params.get("key") ?? "");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [siteBg, setSiteBg] = useState(false);
  const [leftTab, setLeftTab] = useState<"gevonden" | "teksten">("gevonden");
  const [rightTab, setRightTab] = useState<"stijl" | "export">("stijl");
  const [copied, setCopied] = useState("");

  const [config] = useState(() => dialConfig(Object.fromEntries(VAR_NAMES.map((n) => [n, params.get(n.slice(2)) ?? DEFAULTS[n]])) as Vars));
  const dial = useDialKitController("Banner", config, { id: "banner" });
  const vars = useMemo(() => toVars(dial.values as unknown as DialValues), [dial.values]);

  // Deelbare state: alles wat afwijkt van de default in de querystring
  useEffect(() => {
    const q = new URLSearchParams();
    if (url) q.set("url", url);
    if (key) q.set("key", key);
    VAR_NAMES.forEach((n) => vars[n] !== DEFAULTS[n] && q.set(n.slice(2), vars[n]));
    texts.forEach((t, i) => t !== originals[i] && q.set(`t${i}`, t));
    window.history.replaceState(null, "", q.size ? `?${q}` : location.pathname);
  }, [url, key, vars, texts, originals]);

  async function extract(target: string, apply: boolean) {
    setStatus({ loading: true });
    try {
      const res = await fetch(`/api/extract?url=${encodeURIComponent(target)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setExtracted(json);
      if (apply) {
        dial.setValues(toDial(mapToVars(json)));
        setKey(keyFromUrl(target));
      }
      setStatus({});
    } catch (e) {
      setStatus({ error: e instanceof Error ? e.message : "Site niet bereikbaar" });
    }
  }
  // Link met state geopend: wel de gevonden waarden ophalen, niet de gekozen waarden overschrijven
  useEffect(() => {
    const u = params.get("url");
    if (u) queueMicrotask(() => extract(u, ![...params.keys()].some((k) => k.startsWith("cb-"))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Teksten toepassen op HTML (preview) en clipboard-JSON (Copy to Webflow)
  const applyTextsHtml = (html: string) => originals.reduce((h, o, i) => h.replaceAll(`>${esc(o)}<`, `>${esc(texts[i])}<`).replaceAll(`aria-label="${esc(o)}"`, `aria-label="${esc(texts[i])}"`), html);
  const clipboardJson = () => {
    const nodes = clipboard.payload.nodes.map((n) => {
      if (n.text) return { ...n, v: texts[originals.indexOf(n.v ?? "")] ?? n.v };
      const xattr = n.data?.xattr?.map((a) => (a.name === "aria-label" && originals.includes(a.value) ? { ...a, value: texts[originals.indexOf(a.value)] } : a));
      return xattr ? { ...n, data: { ...n.data, xattr } } : n;
    });
    return JSON.stringify({ ...clipboard, payload: { ...clipboard.payload, nodes } });
  };

  const customCss = renderCustomCss(files.customCss, vars);
  const exportCss = `<style>\n${customCss}</style>`;
  const headCode = `<script>window.FlitsConsent = { key: '${key || "flits_consent"}', version: 1, days: 180 };</script>\n${files.headSnippet.trim()}`;
  const footerCode = `<script src="https://cdn.jsdelivr.net/gh/flitsdigital/cookie-consent@${files.version}/dist/consent.min.js" defer></script>`;

  const srcdoc = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>${customCss}</style><style>${files.classesCss}</style><style>
html,body{margin:0;height:100%;font-family:system-ui,sans-serif;background:color-mix(in srgb, var(--cb-color) 8%, var(--cb-color-background))}
.site{position:absolute;inset:0;width:100%;height:100%;border:0}
.cb-banner{display:block}
${prefsOpen ? ".cb-prefs{display:block}[data-cb-action=settings]{display:none}" : "[data-cb-action=save]{display:none}"}
</style></head><body>${siteBg && url ? `<iframe class="site" src="${esc(url)}"></iframe>` : ""}${applyTextsHtml(files.componentHtml.split("<!-- Ergens")[0])}</body></html>`;

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
  const menuFor = (id: string, targets: { path: string; label: string }[], value: string | number) => (
    <div id={id} popover="auto" className="menu">
      <div className="menu-title">Gebruik als</div>
      {targets.map((t) => (
        <button key={t.path} type="button" popoverTarget={id} popoverTargetAction="hide" onClick={() => dial.setValue(t.path, value)}>{label(t.label)}</button>
      ))}
    </div>
  );

  const domain = (() => { try { return new URL(url).hostname; } catch { return "Nieuwe banner"; } })();
  // culori parseert "400" als hex; alleen echte kleurnotaties en named colors tonen
  const colorVars = extracted?.variables.filter((v) => !v.name.startsWith("--cb-") && (/^(#|rgb|hsl|oklch)/i.test(v.value) || /^[a-z]+$/i.test(v.value)) && parse(v.value)) ?? [];

  return (
    <div className="grid h-full grid-cols-[264px_1fr_336px] grid-rows-[48px_44px_1fr]">
      {/* Topbar */}
      <header className="col-span-3 flex items-center border-b border-line px-4">
        <div className="flex w-60 items-center gap-2 text-[13px] font-semibold tracking-tight"><span className="inline-block size-2.5 rounded-full bg-accent" /> consent</div>
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
                          <span className="truncate font-mono text-[11px] text-fg/80">{v.name.replace(/^--_?/, "").replace(/\\.*$/, "")}</span>
                          <span className="ml-auto shrink-0 font-mono text-[10px] text-muted">{hex(v.value)}</span>
                        </button>
                        {menuFor(`v${i}`, COLOR_TARGETS, hex(v.value))}
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
            <div className="space-y-3">
              {texts.map((t, i) => (
                <label key={i} className="block">
                  <span className="mb-1 block text-[11px] text-muted">{TEXT_LABELS[i] ?? `Tekst ${i + 1}`}</span>
                  {t.length > 40
                    ? <textarea value={t} rows={3} onChange={(e) => setTexts((s) => s.map((x, j) => (j === i ? e.target.value : x)))} className="field" />
                    : <input type="text" value={t} onChange={(e) => setTexts((s) => s.map((x, j) => (j === i ? e.target.value : x)))} className="field" />}
                </label>
              ))}
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
                const r = contrast(vars[a], vars[b]) ?? 0;
                const ok = r >= 4.5;
                return (
                  <div key={name} className="rounded-lg p-2" style={{ boxShadow: "var(--shadow-ring)" }} title={`${a} op ${b}`}>
                    <div className="flex items-center justify-between">
                      <span className="swatch flex h-5 w-7 items-center justify-center rounded text-[10px] font-bold" style={{ background: vars[b], color: vars[a] }}>Aa</span>
                      <span className={`rounded px-1 py-px text-[10px] font-semibold ${ok ? "bg-emerald-400/15 text-emerald-300" : "bg-red-400/15 text-red-300"}`}>{ok ? "AA" : "✕"}</span>
                    </div>
                    <div className="mt-1.5 flex items-baseline justify-between text-[11px]"><span className="text-muted">{name}</span><span className="font-mono">{r.toFixed(1)}</span></div>
                  </div>
                );
              })}
            </div>
            <div className="px-1">
              <DialRoot mode="inline" theme="dark" productionEnabled />
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
const Check = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8.5l3 3 7-7" /></svg>;
const Arrow = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L12 4M6 4h6v6" /></svg>;
const Spinner = () => <svg className="animate-spin" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 2a6 6 0 1 1-6 6" /></svg>;
