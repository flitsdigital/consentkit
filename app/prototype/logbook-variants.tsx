"use client";
// PROTOTYPE — drie logboek-varianten op /sites (?variant=A|B|C): A paneel, B stream, C dashboard. Sample-data, Live is gesimuleerd.
import { useEffect, useMemo, useState } from "react";
import { logFor, type LogRow, type Site } from "../../lib/sample";

const ACTION = { accept: ["Accepteren", "bg-emerald-400", "text-emerald-300"], reject: ["Weigeren", "bg-red-400", "text-red-300"], custom: ["Aangepast", "bg-amber-400", "text-amber-300"] } as const;
type Act = keyof typeof ACTION;
const ACTS = Object.keys(ACTION) as Act[];
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const ago = (d: Date) => { const m = Math.round((Date.now() - d.getTime()) / 6e4); return m < 1 ? "zojuist" : m < 60 ? `${m} min geleden` : m < 1440 ? `${Math.round(m / 60)} uur geleden` : `${Math.round(m / 1440)} d geleden`; };
const time = (d: Date) => d.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
const day = (d: Date) => { const t = new Date(); t.setHours(0, 0, 0, 0); const diff = Math.round((t.getTime() - new Date(d).setHours(0, 0, 0, 0)) / 864e5); return diff === 0 ? "Vandaag" : diff === 1 ? "Gisteren" : d.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" }); };
const PERIODS = { 7: "7 d", 30: "30 d", 90: "90 d" } as const;
type Period = keyof typeof PERIODS;
const UA = { Mobiel: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1", Desktop: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/537.36 Chrome/128.0 Safari/537.36" };

/* ---------- data helpers ---------- */
function useLog(site: Site, period: Period, live: boolean) {
  const all = useMemo(() => logFor(site, 480), [site]);
  const [extra, setExtra] = useState<LogRow[]>([]);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setExtra((e) => [{ at: new Date(), action: Math.random() < 0.7 ? "accept" : Math.random() < 0.6 ? "reject" : "custom", cats: ["analytics", "marketing"], version: 1, device: Math.random() < 0.6 ? "Mobiel" : "Desktop", page: "/", id: crypto.randomUUID().slice(0, 13) } as LogRow, ...e]), 6000);
    return () => clearInterval(t);
  }, [live]);
  const rows = [...extra, ...all];
  const [now] = useState(() => Date.now()); // ponytail: prototype-klok, vast per mount
  const cur = rows.filter((r) => now - r.at.getTime() < period * 864e5);
  const prev = rows.filter((r) => now - r.at.getTime() >= period * 864e5 && now - r.at.getTime() < 2 * period * 864e5);
  const days = Array.from({ length: period }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - period + 1 + i); const inDay = cur.filter((r) => r.at >= d && r.at < new Date(d.getTime() + 864e5)); return { d, accept: inDay.filter((r) => r.action === "accept").length, reject: inDay.filter((r) => r.action === "reject").length, custom: inDay.filter((r) => r.action === "custom").length }; });
  return { rows: cur, prev, days, now, newIds: new Set(extra.map((r) => r.id)) };
}
const rate = (rows: LogRow[], a: Act) => pct(rows.filter((r) => r.action === a).length, rows.length);

/* ---------- gedeelde stukjes ---------- */
const Delta = ({ v }: { v: number }) => <span className={`text-[11px] ${v > 0 ? "text-emerald-300" : v < 0 ? "text-red-300" : "text-muted"}`}>{v > 0 ? "+" : ""}{v}{v ? "%" : "—"}</span>;
const Spark = ({ vals, cls = "stroke-emerald-400" }: { vals: number[]; cls?: string }) => { const max = Math.max(1, ...vals); const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * 100},${28 - (v / max) * 26}`).join(" "); return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-7 w-full"><polyline points={pts} fill="none" strokeWidth="1.5" className={cls} vectorEffect="non-scaling-stroke" /></svg>; };
const Kpi = ({ label, value, delta, spark }: { label: string; value: string; delta?: number; spark?: number[] }) => (
  <div className="rounded-xl bg-panel p-3" style={{ boxShadow: "var(--shadow-ring)" }}>
    <div className="flex items-center justify-between text-[11px] text-muted"><span>{label}</span>{delta !== undefined && <Delta v={delta} />}</div>
    <div className="mt-0.5 font-mono text-[20px] leading-tight">{value}</div>
    {spark && <div className="mt-1 opacity-70"><Spark vals={spark} /></div>}
  </div>
);
const Kpis = ({ rows, prev, days }: ReturnType<typeof useLog>) => (
  <div className="grid grid-cols-4 gap-2">
    <Kpi label="Keuzes" value={String(rows.length)} delta={prev.length ? pct(rows.length - prev.length, prev.length) : 0} spark={days.map((d) => d.accept + d.reject + d.custom)} />
    {ACTS.map((a) => <Kpi key={a} label={`${ACTION[a][0]}`} value={`${rate(rows, a)}%`} delta={rate(rows, a) - rate(prev, a)} spark={days.map((d) => d[a])} />)}
  </div>
);
const PeriodSeg = ({ p, set }: { p: Period; set: (p: Period) => void }) => <div className="seg shrink-0 whitespace-nowrap">{(Object.keys(PERIODS).map(Number) as Period[]).map((k) => <button key={k} type="button" aria-pressed={p === k} onClick={() => set(k)}>{PERIODS[k]}</button>)}</div>;
const LiveBtn = ({ on, set }: { on: boolean; set: (v: boolean) => void }) => <button type="button" className="btn h-7 gap-1.5 px-2.5 text-xs" aria-pressed={on} onClick={() => set(!on)} style={on ? { boxShadow: "0 0 0 1px oklch(0.8 0.17 150 / 0.5)" } : undefined}><span className={`size-1.5 rounded-full ${on ? "animate-pulse bg-emerald-400" : "bg-muted"}`} />{on ? "Live" : "Live"}</button>;
const Dot = ({ a }: { a: Act }) => <span className={`size-1.5 shrink-0 rounded-full ${ACTION[a][1]}`} />;

function Chips({ f, set }: { f: Record<string, string>; set: (f: Record<string, string>) => void }) {
  const opts: Record<string, string[]> = { actie: ["accept", "reject", "custom"], apparaat: ["Mobiel", "Desktop"], versie: ["1"], pagina: ["/", "/contact", "/inkoopprijzen", "/goudtour", "/b2b"] };
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {Object.entries(f).map(([k, v]) => <button key={k} type="button" className="btn h-7 gap-1 px-2 text-xs" onClick={() => { const n = { ...f }; delete n[k]; set(n); }}><span className="text-muted">{k}</span> {k === "actie" ? ACTION[v as Act][0] : v} <span className="text-muted">✕</span></button>)}
      <span className="relative">
        <button type="button" className="btn btn-ghost h-7 px-2 text-xs" popoverTarget="chip-menu">+ Filter</button>
        <div id="chip-menu" popover="auto" className="menu w-52">
          {Object.entries(opts).map(([k, vs]) => <div key={k}><div className="menu-title">{k}</div>{vs.map((v) => <button key={v} type="button" className="menu-item text-xs" popoverTarget="chip-menu" popoverTargetAction="hide" onClick={() => set({ ...f, [k]: v })}>{k === "actie" ? ACTION[v as Act][0] : v}</button>)}</div>)}
        </div>
      </span>
    </div>
  );
}
const applyChips = (rows: LogRow[], f: Record<string, string>) => rows.filter((r) => (!f.actie || r.action === f.actie) && (!f.apparaat || r.device === f.apparaat) && (!f.versie || String(r.version) === f.versie) && (!f.pagina || r.page === f.pagina));

function Chart({ days, prevDays, markers }: { days: ReturnType<typeof useLog>["days"]; prevDays?: number[]; markers?: number[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...days.map((x) => x.accept + x.reject + x.custom), ...(prevDays ?? []));
  return (
    <div className="relative rounded-xl bg-panel p-3" style={{ boxShadow: "var(--shadow-ring)" }} onPointerLeave={() => setHover(null)}>
      <div className="mb-2 flex items-center justify-between text-[11px] text-muted"><span>Per dag{prevDays && <span className="ml-2 opacity-60">— vorige periode</span>}</span><span className="flex gap-3">{ACTS.map((a) => <span key={a} className="flex items-center gap-1"><Dot a={a} />{ACTION[a][0]}</span>)}</span></div>
      <div className="relative flex h-28 items-end gap-[3px]">
        {prevDays && <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox={`0 0 ${prevDays.length} 100`} preserveAspectRatio="none"><polyline points={prevDays.map((v, i) => `${i + 0.5},${100 - (v / max) * 100}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-muted" vectorEffect="non-scaling-stroke" /></svg>}
        {days.map((x, i) => (
          <div key={+x.d} className="relative flex h-full flex-1 flex-col-reverse gap-px" onPointerEnter={() => setHover(i)}>
            {(["accept", "custom", "reject"] as const).map((a) => <span key={a} className={`${ACTION[a][1]} rounded-[2px] ${hover === null || hover === i ? "opacity-90" : "opacity-40"}`} style={{ height: `${(x[a] / max) * 100}%` }} />)}
            {markers?.includes(i) && <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-fg px-1 font-mono text-[9px] text-bg">v2</span>}
          </div>
        ))}
      </div>
      {hover !== null && <div className="pointer-events-none absolute z-10 w-40 rounded-lg bg-[#262626] p-2 text-[11px]" style={{ left: `${(hover / days.length) * 100}%`, top: 8, boxShadow: "var(--shadow-pop)" }}><div className="mb-1 font-medium">{days[hover].d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</div>{ACTS.map((a) => <div key={a} className="flex justify-between"><span className="flex items-center gap-1 text-muted"><Dot a={a} />{ACTION[a][0]}</span><span className="font-mono">{days[hover][a]}</span></div>)}</div>}
      <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{days[0].d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span><span>vandaag</span></div>
    </div>
  );
}

const Row = ({ k, v, mono }: { k: string; v: string; mono?: boolean }) => <div className="flex justify-between gap-3 border-t border-line py-1.5 text-[12px]"><span className="text-muted">{k}</span><span className={`truncate text-right ${mono ? "font-mono text-[11px]" : ""}`} title={v}>{v}</span></div>;

function Detail({ r, site, onClose }: { r: LogRow; site: Site; onClose?: () => void }) {
  const json = JSON.stringify({ consent_id: r.id, site: site.url, at: r.at.toISOString(), action: r.action, categories: { necessary: true, analytics: r.cats.includes("analytics"), marketing: r.cats.includes("marketing") }, version: r.version, text_hash: "sha256:4f1c…9be2", page: r.page, device: r.device, user_agent: UA[r.device] }, null, 2);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between pb-3"><div><div className="flex items-center gap-2 text-[13px] font-medium"><Dot a={r.action} />{ACTION[r.action][0]}</div><div className="mt-0.5 font-mono text-[11px] text-muted">{r.id}</div></div>{onClose && <button type="button" className="btn btn-ghost h-7 w-7 px-0" onClick={onClose}>✕</button>}</div>
      <div className="flex gap-2 pb-3"><button type="button" className="btn btn-primary h-8 flex-1 text-xs" onClick={() => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([json], { type: "application/json" })); a.download = `consent-${r.id}.json`; a.click(); }}>Bewijs downloaden</button><button type="button" className="btn h-8 px-2.5 text-xs" onClick={() => navigator.clipboard.writeText(r.id)}>Kopieer ID</button></div>
      <div className="overflow-auto">
        <div className="menu-title px-0">Wanneer</div>
        <Row k="Lokaal" v={r.at.toLocaleString("nl-NL")} /><Row k="UTC" v={r.at.toISOString().replace("T", " ").slice(0, 19)} mono /><Row k="ISO" v={r.at.toISOString()} mono />
        <div className="menu-title mt-3 px-0">Wat</div>
        {[["Noodzakelijk", true], ["Statistieken", r.cats.includes("analytics")], ["Marketing", r.cats.includes("marketing")]].map(([k, v]) => <div key={String(k)} className="flex justify-between border-t border-line py-1.5 text-[12px]"><span className="text-muted">{k}</span><span className={v ? "text-emerald-300" : "text-red-300"}>{v ? "✓ toegestaan" : "✕ geweigerd"}</span></div>)}
        <Row k="Versie" v={`v${r.version}`} mono /><Row k="Tekst-hash" v="sha256:4f1c…9be2" mono />
        <div className="menu-title mt-3 px-0">Waar</div>
        <Row k="Pagina" v={r.page} mono /><Row k="Apparaat" v={r.device} /><Row k="User-agent" v={UA[r.device]} mono />
        <div className="menu-title mt-3 px-0">Ruw</div>
        <pre className="code max-h-40 text-[10px]">{json}</pre>
      </div>
    </div>
  );
}

/* ---------- A · Paneel: tabel + rij → zwevend detailpaneel ---------- */
export function LogA({ site }: { site: Site }) {
  const [period, setPeriod] = useState<Period>(30);
  const [live, setLive] = useState(false);
  const [f, setF] = useState<Record<string, string>>({});
  const [sel, setSel] = useState<LogRow | null>(null);
  const log = useLog(site, period, live);
  const shown = applyChips(log.rows, f);
  return (
    <div className="relative flex flex-col gap-4">
      <div className="flex items-center justify-between"><PeriodSeg p={period} set={setPeriod} /><LiveBtn on={live} set={setLive} /></div>
      <Kpis {...log} />
      <Chart days={log.days} />
      <div className="rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-ring)" }}>
        <div className="flex items-center gap-2 border-b border-line p-2"><Chips f={f} set={setF} /><span className="ml-auto text-[11px] whitespace-nowrap text-muted">{shown.length} keuzes</span><button type="button" className="btn h-7 px-2 text-xs">CSV</button></div>
        <div className="max-h-[380px] overflow-auto">
          {shown.slice(0, 80).map((r) => (
            <button key={r.id} type="button" onClick={() => setSel(r)} aria-current={sel?.id === r.id} className={`grid w-full grid-cols-[110px_110px_1fr_80px_1fr] items-center gap-3 border-t border-line px-3 py-1.5 text-left text-[12px] hover:bg-raised aria-[current=true]:bg-raised ${log.newIds.has(r.id) ? "row-new" : ""}`}>
              <span className="text-muted">{r.at.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
              <span className="flex items-center gap-1.5"><Dot a={r.action} />{ACTION[r.action][0]}</span>
              <span className="flex gap-1 whitespace-nowrap">{r.cats.length ? r.cats.map((c) => <span key={c} className="rounded-full bg-raised px-1.5 text-[11px]">{c}</span>) : <span className="text-muted">alleen noodzakelijk</span>}</span>
              <span className="text-muted">{r.device}</span>
              <span className="truncate font-mono text-muted">{r.id}</span>
            </button>
          ))}
        </div>
      </div>
      {sel && <aside className="float-panel fixed top-4 right-4 bottom-4 z-20 w-[360px] rounded-xl bg-panel p-4" style={{ boxShadow: "var(--shadow-pop)" }}><Detail r={sel} site={site} onClose={() => setSel(null)} /></aside>}
    </div>
  );
}

/* ---------- B · Stream: lijst per dag links, vast detail rechts ---------- */
export function LogB({ site }: { site: Site }) {
  const [period, setPeriod] = useState<Period>(30);
  const [live, setLive] = useState(true);
  const [f, setF] = useState<Record<string, string>>({});
  const log = useLog(site, period, live);
  const shown = applyChips(log.rows, f).slice(0, 120);
  const [selId, setSelId] = useState<string | null>(null);
  const sel = shown.find((r) => r.id === selId) ?? shown[0];
  const groups = shown.reduce<Record<string, LogRow[]>>((g, r) => ((g[day(r.at)] ??= []).push(r), g), {});
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl bg-panel px-3 py-2 text-[12px]" style={{ boxShadow: "var(--shadow-ring)" }}>
        <PeriodSeg p={period} set={setPeriod} />
        <span className="ml-2 flex items-center gap-4">{[["Keuzes", String(log.rows.length), log.prev.length ? pct(log.rows.length - log.prev.length, log.prev.length) : 0], ...ACTS.map((a) => [ACTION[a][0], `${rate(log.rows, a)}%`, rate(log.rows, a) - rate(log.prev, a)] as const)].map(([l, v, d]) => <span key={l} className="flex items-baseline gap-1.5"><span className="text-muted">{l}</span><span className="font-mono text-[14px]">{v}</span><Delta v={d as number} /></span>)}</span>
        <span className="ml-auto"><LiveBtn on={live} set={setLive} /></span>
      </div>
      <div className="grid min-h-[560px] grid-cols-[1fr_380px] gap-3">
        <div className="flex flex-col rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-ring)" }}>
          <div className="flex items-center gap-2 border-b border-line p-2"><Chips f={f} set={setF} /><span className="ml-auto text-[11px] text-muted">{shown.length}</span></div>
          <div className="max-h-[520px] overflow-auto">
            {Object.entries(groups).map(([d, rs]) => (
              <div key={d}>
                <div className="sticky top-0 bg-panel px-3 pt-2 pb-1 text-[11px] font-medium text-muted">{d}</div>
                {rs.map((r) => (
                  <button key={r.id} type="button" onClick={() => setSelId(r.id)} aria-current={sel?.id === r.id} className={`flex w-full items-center gap-3 px-3 py-1.5 text-left text-[12px] hover:bg-raised aria-[current=true]:bg-raised ${log.newIds.has(r.id) ? "row-new" : ""}`}>
                    <span className="w-10 font-mono text-[11px] text-muted">{time(r.at)}</span>
                    <Dot a={r.action} /><span className="w-20">{ACTION[r.action][0]}</span>
                    <span className="min-w-0 flex-1 truncate text-muted">{r.cats.join(", ") || "alleen noodzakelijk"} · {r.device} · {r.page}</span>
                    <span className="font-mono text-[11px] text-muted">{r.id.slice(0, 8)}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-panel p-4" style={{ boxShadow: "var(--shadow-ring)" }}>{sel ? <Detail r={sel} site={site} /> : <p className="text-xs text-muted">Kies een regel</p>}</div>
      </div>
    </div>
  );
}

/* ---------- C · Dashboard: analytics voorop, vergelijking, tabel compact ---------- */
export function LogC({ site }: { site: Site }) {
  const [period, setPeriod] = useState<Period>(30);
  const [live, setLive] = useState(false);
  const [compare, setCompare] = useState(true);
  const [sel, setSel] = useState<LogRow | null>(null);
  const log = useLog(site, period, live);
  const prevDays = useMemo(() => { const now = log.now; return Array.from({ length: period }, (_, i) => log.prev.filter((r) => { const off = Math.floor((now - r.at.getTime()) / 864e5) - period; return off === period - 1 - i; }).length); }, [log.prev, log.now, period]);
  const optin = (c: string) => pct(log.rows.filter((r) => r.cats.includes(c)).length, log.rows.length);
  const optinPrev = (c: string) => pct(log.prev.filter((r) => r.cats.includes(c)).length, log.prev.length);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2"><PeriodSeg p={period} set={setPeriod} /><label className="flex items-center gap-1.5 text-[12px] text-muted"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> vergelijk met vorige periode</label><span className="ml-auto"><LiveBtn on={live} set={setLive} /></span></div>
      <Kpis {...log} />
      <div className="grid grid-cols-[1fr_280px] gap-2">
        <Chart days={log.days} prevDays={compare ? prevDays : undefined} markers={[Math.floor(period * 0.6)]} />
        <div className="rounded-xl bg-panel p-3" style={{ boxShadow: "var(--shadow-ring)" }}>
          <div className="mb-2 text-[11px] text-muted">Opt-in per categorie</div>
          {[["analytics", "Statistieken"], ["marketing", "Marketing"]].map(([c, l]) => <div key={c} className="mb-3"><div className="flex items-center justify-between text-[12px]"><span>{l}</span><span className="flex items-center gap-2"><span className="font-mono">{optin(c)}%</span><Delta v={optin(c) - optinPrev(c)} /></span></div><div className="relative mt-1 h-1.5 rounded-full bg-raised"><span className="absolute inset-y-0 left-0 rounded-full bg-emerald-400" style={{ width: `${optin(c)}%` }} />{compare && <span className="absolute -top-0.5 h-2.5 w-px bg-fg" style={{ left: `${optinPrev(c)}%` }} title={`vorige periode ${optinPrev(c)}%`} />}</div></div>)}
          <div className="border-t border-line pt-2 text-[11px] text-muted">Mobiel {pct(log.rows.filter((r) => r.device === "Mobiel").length, log.rows.length)}% · Desktop {pct(log.rows.filter((r) => r.device === "Desktop").length, log.rows.length)}%</div>
          <div className="mt-3 rounded-lg bg-raised p-2 text-[11px] leading-relaxed text-muted"><span className="font-mono text-fg">v2</span> op de grafiek = tekstwijziging. Acceptatie daarna: <span className="text-fg">{rate(log.rows.slice(0, Math.floor(log.rows.length * 0.4)), "accept")}%</span> vs <span className="text-fg">{rate(log.rows.slice(Math.floor(log.rows.length * 0.4)), "accept")}%</span> ervoor.</div>
        </div>
      </div>
      <details className="rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-ring)" }} open>
        <summary className="cursor-pointer px-3 py-2 text-[12px] text-muted">Laatste keuzes · {log.rows.length}</summary>
        <div className="max-h-[300px] overflow-auto border-t border-line">
          {log.rows.slice(0, 60).map((r) => (
            <div key={r.id} className={`relative flex items-center gap-3 border-t border-line px-3 py-1.5 text-[12px] first:border-t-0 ${log.newIds.has(r.id) ? "row-new" : ""}`}>
              <span className="w-24 text-muted">{ago(r.at)}</span><Dot a={r.action} /><span className="w-20">{ACTION[r.action][0]}</span>
              <span className="min-w-0 flex-1 truncate text-muted">{r.cats.join(", ") || "alleen noodzakelijk"} · {r.device} · {r.page}</span>
              <button type="button" className="font-mono text-[11px] text-muted underline decoration-dotted underline-offset-2" onClick={() => setSel(sel?.id === r.id ? null : r)}>{r.id.slice(0, 8)}</button>
              {sel?.id === r.id && <div className="absolute top-8 right-3 z-10 max-h-[420px] w-80 overflow-auto rounded-xl bg-[#262626] p-3" style={{ boxShadow: "var(--shadow-pop)" }}><Detail r={r} site={site} onClose={() => setSel(null)} /></div>}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
