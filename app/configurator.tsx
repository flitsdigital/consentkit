"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatHex } from "culori";
import {
  COLOR_VARS, DEFAULTS, VAR_NAMES, contrast, keyFromUrl, mapToVars, renderCustomCss, resolveColor,
  type Extracted, type VarName, type Vars,
} from "@/lib/mapping";

type Files = { customCss: string; classesCss: string; componentHtml: string; clipboardJson: string; headSnippet: string; version: string };
type Node = { text?: boolean; v?: string; data?: { xattr?: { name: string; value: string }[] } };

const TEXT_LABELS = ["Titel", "Tekst", "Privacylink", "Categorie 1", "Categorie 1 – tekst", "Categorie 2", "Categorie 2 – tekst", "Categorie 3", "Categorie 3 – tekst", "Knop: instellingen", "Knop: opslaan", "Knop: weigeren", "Knop: accepteren"];
const CONTRAST_PAIRS: [VarName, VarName][] = [["--cb-color-accent-text", "--cb-color-accent"], ["--cb-color", "--cb-color-background"], ["--cb-color", "--cb-color-surface"]];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function Configurator({ files }: { files: Files }) {
  const params = useSearchParams();
  const clipboard = useMemo(() => JSON.parse(files.clipboardJson) as { payload: { nodes: Node[] } }, [files.clipboardJson]);
  const originals = useMemo(() => clipboard.payload.nodes.filter((n) => n.text).map((n) => n.v ?? ""), [clipboard]);

  const [url, setUrl] = useState(params.get("url") ?? "");
  const [vars, setVars] = useState<Vars>(() => Object.fromEntries(VAR_NAMES.map((n) => [n, params.get(n.slice(2)) ?? DEFAULTS[n]])) as Vars);
  const [texts, setTexts] = useState<string[]>(() => originals.map((o, i) => params.get(`t${i}`) ?? o));
  const [key, setKey] = useState(params.get("key") ?? "");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [status, setStatus] = useState<{ loading?: boolean; error?: string }>({});
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [siteBg, setSiteBg] = useState(false);
  const [copied, setCopied] = useState("");

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
        setVars(mapToVars(json));
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

  const set = (n: VarName, v: string) => setVars((s) => ({ ...s, [n]: v }));
  const hexOf = (v: string) => { const c = resolveColor(v, vars); return c ? formatHex(c) : "#000000"; };

  // Teksten toepassen op HTML (preview) en clipboard-JSON (Copy to Webflow)
  const applyTextsHtml = (html: string) => originals.reduce((h, o, i) => h.replaceAll(`>${esc(o)}<`, `>${esc(texts[i])}<`).replaceAll(`aria-label="${esc(o)}"`, `aria-label="${esc(texts[i])}"`), html);
  const clipboardJson = () => {
    const nodes = clipboard.payload.nodes.map((n) => {
      if (n.text) return { ...n, v: texts[originals.indexOf(n.v ?? "")] ?? n.v };
      const xattr = n.data?.xattr?.map((a) => a.name === "aria-label" && originals.includes(a.value) ? { ...a, value: texts[originals.indexOf(a.value)] } : a);
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

  async function copy(name: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(name);
    setTimeout(() => setCopied(""), 1500);
  }
  // Webflow accepteert alleen clipboard-data met MIME-type application/json (zelfde truc als demo/index.html)
  function copyToWebflow() {
    const json = clipboardJson();
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); e.clipboardData?.setData("application/json", json); e.clipboardData?.setData("text/plain", json); };
    document.addEventListener("copy", onCopy);
    document.execCommand("copy");
    document.removeEventListener("copy", onCopy);
    setCopied("webflow");
    setTimeout(() => setCopied(""), 3000);
  }

  const copyBtn = (name: string, text: string) => (
    <button type="button" onClick={() => copy(name, text)} className="rounded bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700">
      {copied === name ? "Gekopieerd ✓" : "Kopieer"}
    </button>
  );

  const suggestions = (n: VarName): { value: string; count?: number }[] => {
    if (!extracted) return [];
    if (COLOR_VARS.includes(n)) return [...extracted.colors.slice(0, 24), ...extracted.variables.filter((v) => resolveColor(v.value, vars)).map((v) => ({ value: v.value, count: undefined }))];
    if (n.includes("radius")) return extracted.radii;
    if (n.includes("font-size")) return Object.entries(extracted.fontSizes).map(([k, value]) => ({ value: `${value}`, count: undefined, label: k })).filter((s) => s.value);
    return [];
  };

  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Cookie consent configurator</h1>
        <p className="text-sm text-neutral-600">Plak een website-URL, pas de kleuren aan, kopieer de code naar Webflow.</p>
      </header>

      <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); extract(url, true); }}>
        <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://klant.webflow.io/" className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2" />
        <button type="submit" disabled={status.loading} className="rounded bg-pink-600 px-4 py-2 font-medium text-white hover:bg-pink-700 disabled:opacity-50">
          {status.loading ? "Bezig…" : "Stijl ophalen"}
        </button>
      </form>
      {status.error && <p role="alert" className="mb-4 rounded bg-red-100 px-3 py-2 text-sm text-red-800">{status.error}</p>}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="min-w-0 space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {CONTRAST_PAIRS.map(([a, b]) => {
              const r = contrast(vars[a], vars[b], vars);
              return (
                <div key={a + b} className="rounded border border-neutral-200 bg-white p-2 text-xs">
                  <div className="text-neutral-500">{a.slice(5)} / {b.slice(5)}</div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-5 w-10 rounded border" style={{ background: hexOf(vars[b]), color: hexOf(vars[a]) }}><span className="block text-center text-[10px] font-bold leading-5">Aa</span></span>
                    <span className="font-mono">{r ? `${r}:1` : "?"}</span>
                    {r !== undefined && <span className={`rounded px-1.5 py-0.5 font-bold ${r >= 4.5 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>{r >= 4.5 ? "AA" : "geen AA"}</span>}
                  </div>
                </div>
              );
            })}
          </div>

          <fieldset className="rounded border border-neutral-200 bg-white p-4">
            <legend className="px-1 text-sm font-semibold">Variabelen</legend>
            <div className="grid gap-2">
              {VAR_NAMES.map((n) => {
                const isColor = COLOR_VARS.includes(n);
                const sug = suggestions(n);
                return (
                  <label key={n} className="grid grid-cols-[9rem_1fr_auto] items-center gap-2 text-sm">
                    <span className="font-mono text-xs text-neutral-600">{n.slice(5)}</span>
                    <span className="flex items-center gap-1">
                      {isColor && <input type="color" value={hexOf(vars[n])} onChange={(e) => set(n, e.target.value)} className="h-8 w-8 cursor-pointer rounded border border-neutral-300" aria-label={`${n} kleur`} />}
                      <input type="text" value={vars[n]} onChange={(e) => set(n, e.target.value)} className="w-full rounded border border-neutral-300 px-2 py-1 font-mono text-xs" />
                    </span>
                    {sug.length ? (
                      <span className="relative">
                        <button type="button" popoverTarget={`pop-${n}`} className="rounded border border-neutral-300 px-2 py-1 text-xs hover:bg-neutral-100">Gevonden ▾</button>
                        <div id={`pop-${n}`} popover="auto" className="m-0 max-h-72 w-64 overflow-auto rounded border border-neutral-200 bg-white p-1 shadow-lg [position-area:bottom_span-left]">
                          {sug.map((s, i) => (
                            <button key={i} type="button" popoverTarget={`pop-${n}`} popoverTargetAction="hide" onClick={() => set(n, s.value)} className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-neutral-100">
                              {isColor && <span className="inline-block h-4 w-4 shrink-0 rounded border" style={{ background: hexOf(s.value) }} />}
                              <span className="flex-1 truncate font-mono">{s.value}</span>
                              {s.count !== undefined && <span className="text-neutral-400">{s.count}×</span>}
                            </button>
                          ))}
                        </div>
                      </span>
                    ) : <span />}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <details className="rounded border border-neutral-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold">Teksten</summary>
            <div className="mt-3 grid gap-2">
              {texts.map((t, i) => (
                <label key={i} className="grid grid-cols-[9rem_1fr] items-center gap-2 text-sm">
                  <span className="text-xs text-neutral-600">{TEXT_LABELS[i] ?? `Tekst ${i + 1}`}</span>
                  {t.length > 60
                    ? <textarea value={t} rows={3} onChange={(e) => setTexts((s) => s.map((x, j) => (j === i ? e.target.value : x)))} className="rounded border border-neutral-300 px-2 py-1 text-xs" />
                    : <input type="text" value={t} onChange={(e) => setTexts((s) => s.map((x, j) => (j === i ? e.target.value : x)))} className="rounded border border-neutral-300 px-2 py-1 text-xs" />}
                </label>
              ))}
            </div>
          </details>

          <section className="rounded border border-neutral-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Exporteren</h2>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between"><span className="text-xs text-neutral-600">1. Site settings → Custom code → Head: <code>custom.css</code></span>{copyBtn("css", exportCss)}</div>
                <pre className="max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-[11px] text-neutral-100">{exportCss}</pre>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-xs text-neutral-600">2. Head-code (boven GTM) — key:
                    <input type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="klant_consent" className="rounded border border-neutral-300 px-2 py-0.5 font-mono text-xs" />
                  </span>
                  {copyBtn("head", headCode)}
                </div>
                <pre className="max-h-40 overflow-auto rounded bg-neutral-900 p-2 text-[11px] text-neutral-100">{headCode}</pre>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between"><span className="text-xs text-neutral-600">3. Footer-code (v{files.version})</span>{copyBtn("footer", footerCode)}</div>
                <pre className="overflow-auto rounded bg-neutral-900 p-2 text-[11px] text-neutral-100">{footerCode}</pre>
              </div>
              <div className="flex items-center justify-between rounded bg-pink-50 p-3">
                <span className="text-xs text-neutral-700">4. Component: plak met ⌘V in de Webflow Designer</span>
                <button type="button" onClick={copyToWebflow} className="rounded bg-pink-600 px-4 py-2 text-sm font-medium text-white hover:bg-pink-700">
                  {copied === "webflow" ? "Gekopieerd – plak in de Designer" : "Copy to Webflow"}
                </button>
              </div>
            </div>
          </section>
        </section>

        <section className="min-w-0 lg:sticky lg:top-8 lg:self-start">
          <div className="mb-2 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-1"><input type="checkbox" checked={prefsOpen} onChange={(e) => setPrefsOpen(e.target.checked)} /> Instellingen open</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={mobile} onChange={(e) => setMobile(e.target.checked)} /> Mobiel</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={siteBg} onChange={(e) => setSiteBg(e.target.checked)} disabled={!url} /> Site als achtergrond</label>
          </div>
          <iframe title="Preview" srcDoc={srcdoc} className="h-[640px] rounded border border-neutral-300 bg-white shadow" style={{ width: mobile ? 375 : "100%" }} data-testid="preview" />
        </section>
      </div>
    </main>
  );
}
