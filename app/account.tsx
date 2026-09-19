"use client";
// Account-schermen: login, sites (met detailkolom), team, abonnement, profiel. Data uit lib/sample tot de DB er is.
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import { Switcher } from "./prototype/switcher";
import { useState, type ReactNode } from "react";
import { Avatar, Field, Google, INVOICES, logFor, MEMBERS, Mini, ORG, PAGES, SITES, Status, USER, type Page, type Site } from "../lib/sample";
import { InstallCheck } from "./install-check";
import { Cookie } from "./studio";

const Chevron = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-muted" aria-hidden><path d="M4 6l4 4 4-4" /></svg>;
const studioHref = (s: Site) => `/?url=${encodeURIComponent(`https://${s.url}`)}`;

export function LoginForm() {
  const router = useRouter();
  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); router.push("/sites"); }}>
      <div><h1 className="text-[17px] font-semibold tracking-tight">Inloggen bij Consentkit</h1><p className="mt-1 text-xs leading-relaxed text-muted">Je krijgt een inloglink per e-mail. Geen wachtwoord.</p></div>
      <button type="button" className="btn h-9 w-full" onClick={() => router.push("/sites")}><Google /> Doorgaan met Google</button>
      <div className="flex items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-line" />of<span className="h-px flex-1 bg-line" /></div>
      <Field label="E-mail"><input type="email" className="field" placeholder="naam@bureau.nl" required /></Field>
      <button type="submit" className="btn btn-primary h-9 w-full">Stuur inloglink</button>
      <p className="text-center text-[11px] text-muted">Nog geen account? <Link href="/sites" className="text-fg underline underline-offset-2">Start met 14 dagen gratis</Link></p>
    </form>
  );
}

export function Login() {
  return (
    <div className="grid h-dvh grid-cols-[1.1fr_1fr]">
      <div className="canvas flex flex-col justify-between border-r border-line p-8">
        <Link href="/" className="flex items-center gap-2 text-[13px]"><Cookie /><span className="font-semibold tracking-tight">consentkit</span></Link>
        <div className="grid max-w-md grid-cols-2 gap-3">{SITES.slice(0, 4).map((s) => <Mini key={s.id} site={s} height={96} />)}</div>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">Cookiebanners in de huisstijl van elke klant. Eén abonnement, onbeperkt sites, altijd Consent Mode v2.</p>
      </div>
      <div className="flex items-center justify-center p-8"><div className="w-full max-w-xs"><LoginForm /></div></div>
    </div>
  );
}

export function Sidebar({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="grid h-dvh grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r border-line bg-panel p-3">
        <span className="relative">
          <button type="button" className="menu-item mb-3 justify-between" popoverTarget="org-menu"><span className="flex items-center gap-2"><Cookie /><span className="text-[13px] font-medium">{ORG.name}</span></span><Chevron /></button>
          <div id="org-menu" popover="auto" className="menu w-52"><div className="menu-title">Bureaus</div><button type="button" className="menu-item" aria-current="true">{ORG.name}</button><button type="button" className="menu-item text-muted">+ Nieuw bureau</button></div>
        </span>
        <nav className="flex flex-col gap-0.5">
          {(Object.keys(PAGES) as Page[]).map((p) => <Link key={p} href={`/${p}`} className="menu-item text-[14px]" aria-current={path === `/${p}`}>{PAGES[p]}{p === "sites" && <span className="ml-auto font-mono text-[11px] text-muted">{SITES.length}</span>}</Link>)}
        </nav>
        <div className="mt-auto flex items-center gap-2 px-2 text-xs"><Avatar initials={USER.initials} size={24} /><span className="min-w-0 flex-1 truncate">{USER.name}</span><Link href="/login" className="btn btn-ghost h-7 px-2 text-[11px]">Uit</Link></div>
      </aside>
      {children}
    </div>
  );
}

export function NewSiteMenu({ id }: { id: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  return (
    <div id={id} popover="auto" className="menu menu-right w-72">
      <div className="menu-title">Nieuwe site</div>
      <form className="flex flex-col gap-2 px-2 pb-2" onSubmit={(e) => { e.preventDefault(); router.push(`/?url=${encodeURIComponent(/^https?:\/\//i.test(url) ? url : `https://${url}`)}`); }}>
        <input className="field font-mono text-xs" placeholder="klant.webflow.io" value={url} onChange={(e) => setUrl(e.target.value)} required />
        <button type="submit" className="btn btn-primary h-8 w-full">Stijl ophalen en beginnen</button>
      </form>
      <div className="my-1 h-px bg-line" />
      <Link href="/" className="menu-item text-muted"><span className="flex-1">Zonder site beginnen</span><span>→</span></Link>
    </div>
  );
}

const ago = (d: Date) => { const m = Math.round((Date.now() - d.getTime()) / 6e4); return m < 60 ? `${m} min geleden` : m < 1440 ? `${Math.round(m / 60)} uur geleden` : `${Math.round(m / 1440)} d geleden`; };
const ACTION = { accept: ["Accepteren", "bg-emerald-400"], reject: ["Weigeren", "bg-red-400"], custom: ["Aangepast", "bg-amber-400"] } as const;

const fmt = (d: Date) => d.toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);

const KPI = ({ label, value, sub }: { label: string; value: string; sub?: string }) => <div className="rounded-xl bg-panel p-3" style={{ boxShadow: "var(--shadow-ring)" }}><div className="text-[11px] text-muted">{label}</div><div className="mt-0.5 font-mono text-[20px] leading-tight">{value}</div>{sub && <div className="mt-0.5 text-[11px] text-muted">{sub}</div>}</div>;

/** Logboek als volledige weergave: KPI's, 30-dagen-grafiek, opt-in per categorie, tabel met filters. */
function Logbook({ site }: { site: Site }) {
  const [filter, setFilter] = useState<"all" | keyof typeof ACTION>("all");
  const [q, setQ] = useState("");
  const rows = logFor(site);
  const shown = rows.filter((r) => (filter === "all" || r.action === filter) && (!q || r.id.includes(q.toLowerCase()) || r.page.includes(q.toLowerCase())));
  const n = rows.length;
  const count = (a: keyof typeof ACTION) => rows.filter((r) => r.action === a).length;
  const optin = (c: string) => pct(rows.filter((r) => r.cats.includes(c)).length, n);
  const days = Array.from({ length: 30 }, (_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 29 + i); const inDay = rows.filter((r) => r.at >= d && r.at < new Date(d.getTime() + 864e5)); return { d, accept: inDay.filter((r) => r.action === "accept").length, reject: inDay.filter((r) => r.action === "reject").length, custom: inDay.filter((r) => r.action === "custom").length }; });
  const max = Math.max(1, ...days.map((x) => x.accept + x.reject + x.custom));
  const csv = () => { const blob = new Blob([["tijd,actie,categorieen,versie,apparaat,pagina,consent_id", ...rows.map((r) => `${r.at.toISOString()},${r.action},${r.cats.join("|")},${r.version},${r.device},${r.page},${r.id}`)].join("\n")], { type: "text/csv" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${site.url}-consent-log.csv`; a.click(); };
  if (!n) return <div className="rounded-xl bg-panel p-6 text-center text-xs text-muted" style={{ boxShadow: "var(--shadow-pop)" }}>Nog geen keuzes gelogd voor {site.url}. Zodra het script op de site draait, verschijnt hier elke keuze.</div>;
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-4 gap-2">
        <KPI label="Keuzes · 30 d" value={String(site.choices)} sub={`laatste ${ago(rows[0].at)}`} />
        <KPI label="Accepteert alles" value={`${pct(count("accept"), n)}%`} sub={`${count("accept")} keuzes`} />
        <KPI label="Weigert" value={`${pct(count("reject"), n)}%`} sub={`${count("reject")} keuzes`} />
        <KPI label="Past aan" value={`${pct(count("custom"), n)}%`} sub={`${count("custom")} keuzes`} />
      </div>
      <div className="grid grid-cols-[1fr_260px] gap-2">
        <div className="rounded-xl bg-panel p-3" style={{ boxShadow: "var(--shadow-ring)" }}>
          <div className="mb-2 flex items-center justify-between text-[11px] text-muted"><span>Per dag</span><span className="flex gap-3">{(Object.keys(ACTION) as (keyof typeof ACTION)[]).map((a) => <span key={a} className="flex items-center gap-1"><span className={`size-1.5 rounded-full ${ACTION[a][1]}`} />{ACTION[a][0]}</span>)}</span></div>
          <div className="flex h-24 items-end gap-[3px]">
            {days.map((x) => <div key={+x.d} className="flex h-full flex-1 flex-col-reverse gap-px" title={`${x.d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}: ${x.accept + x.reject + x.custom} keuzes`}>{(["accept", "custom", "reject"] as const).map((a) => <span key={a} className={`${ACTION[a][1]} rounded-[2px] opacity-90`} style={{ height: `${(x[a] / max) * 100}%` }} />)}</div>)}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted"><span>{days[0].d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</span><span>vandaag</span></div>
        </div>
        <div className="rounded-xl bg-panel p-3" style={{ boxShadow: "var(--shadow-ring)" }}>
          <div className="mb-2 text-[11px] text-muted">Opt-in per categorie</div>
          {[["analytics", "Statistieken"], ["marketing", "Marketing"]].map(([c, l]) => <div key={c} className="mb-2"><div className="flex justify-between text-[12px]"><span>{l}</span><span className="font-mono text-muted">{optin(c)}%</span></div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-emerald-400" style={{ width: `${optin(c)}%` }} /></div></div>)}
          <div className="mt-3 border-t border-line pt-2 text-[11px] text-muted">Mobiel {pct(rows.filter((r) => r.device === "Mobiel").length, n)}% · Desktop {pct(rows.filter((r) => r.device === "Desktop").length, n)}%</div>
        </div>
      </div>
      <div className="rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-ring)" }}>
        <div className="flex items-center gap-2 border-b border-line p-2">
          <select className="field h-7 w-auto text-xs" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option value="all">Alle acties</option>{(Object.keys(ACTION) as (keyof typeof ACTION)[]).map((a) => <option key={a} value={a}>{ACTION[a][0]}</option>)}</select>
          <input className="field h-7 max-w-xs font-mono text-xs" placeholder="consent-id of pagina" value={q} onChange={(e) => setQ(e.target.value)} />
          <span className="ml-auto text-[11px] whitespace-nowrap text-muted">{shown.length} van {n}</span>
          <button type="button" className="btn h-7 px-2 text-xs" onClick={csv}>CSV</button>
        </div>
        <div className="grid grid-cols-[120px_100px_170px_50px_70px_1fr] gap-3 px-3 py-1.5 text-[11px] text-muted"><span>Tijd</span><span>Actie</span><span>Categorieën</span><span>Versie</span><span>Apparaat</span><span>Consent-ID</span></div>
        <div className="max-h-[420px] overflow-auto">
          {shown.map((r) => (
            <div key={r.id} className="grid grid-cols-[120px_100px_170px_50px_70px_1fr] items-center gap-3 border-t border-line px-3 py-1.5 text-[12px]">
              <span className="text-muted">{fmt(r.at)}</span>
              <span className="flex items-center gap-1.5"><span className={`size-1.5 rounded-full ${ACTION[r.action][1]}`} />{ACTION[r.action][0]}</span>
              <span className="flex gap-1 whitespace-nowrap">{r.cats.length ? r.cats.map((c) => <span key={c} className="rounded-full bg-raised px-1.5 text-[11px]">{c}</span>) : <span className="text-muted">alleen noodzakelijk</span>}</span>
              <span className="font-mono text-muted">v{r.version}</span>
              <span className="text-muted">{r.device}</span>
              <span className="truncate font-mono text-muted" title={`${r.id} · ${r.page}`}>{r.id}<span className="ml-2 opacity-60">{r.page}</span></span>
            </div>
          ))}
          {!shown.length && <p className="p-4 text-center text-[11px] text-muted">Niets gevonden</p>}
        </div>
      </div>
    </div>
  );
}

// PROTOTYPE: ?variant=A|B|C wisselt het logboek; zonder param de huidige versie
// tijdgebonden sample-data → alleen client renderen (geen hydration-mismatch)
const LOG_VARIANTS = { A: dynamic(() => import("./prototype/logbook-variants").then((m) => m.LogA), { ssr: false }), B: dynamic(() => import("./prototype/logbook-variants").then((m) => m.LogB), { ssr: false }), C: dynamic(() => import("./prototype/logbook-variants").then((m) => m.LogC), { ssr: false }) } as const;
function LogSwitch({ site }: { site: Site }) {
  const v = useSearchParams().get("variant") as keyof typeof LOG_VARIANTS | null;
  const V = v ? LOG_VARIANTS[v] : null;
  return <>{V ? <V key={site.id} site={site} /> : <Logbook site={site} />}<Switcher variants={["huidig", "A", "B", "C"]} names={{ huidig: "Huidig", A: "Paneel", B: "Stream", C: "Dashboard" }} /></>;
}
export function Sites() {
  const [sel, setSel] = useState<Site>(SITES[0]);
  const [view, setView] = useState<"overzicht" | "logboek">("logboek");
  return (
    <div className="grid min-h-0 grid-cols-[1fr_320px]">
      <main className="canvas overflow-auto p-6">
        {view === "logboek" ? <>
        <div className="mb-4 flex items-center gap-3"><button type="button" className="btn btn-ghost h-7 px-2 text-xs" onClick={() => setView("overzicht")}>← Sites</button><h1 className="text-[15px] font-semibold tracking-tight">Logboek · {sel.name}</h1></div>
        <Suspense><LogSwitch site={sel} /></Suspense>
        </> : <>
        <div className="mb-4 flex items-center justify-between"><h1 className="text-[15px] font-semibold tracking-tight">Sites</h1><span className="relative"><button type="button" className="btn btn-primary" popoverTarget="new-site">+ Nieuwe site</button><NewSiteMenu id="new-site" /></span></div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
          {SITES.map((s) => (
            <button key={s.id} type="button" className="starter bg-panel" aria-pressed={sel.id === s.id} onClick={() => setSel(s)} onDoubleClick={() => (location.href = studioHref(s))} style={sel.id === s.id ? { boxShadow: "0 0 0 1px oklch(1 0 0 / 0.35)" } : undefined}>
              <Mini site={s} />
              <span className="flex items-center justify-between gap-2 px-1 pb-0.5"><span className="min-w-0"><span className="block truncate text-[13px]">{s.name}</span><span className="block truncate text-[11px] text-muted">{s.url}</span></span><Status s={s.status} /></span>
            </button>
          ))}
        </div>
        </>}
      </main>
      <aside className="flex flex-col overflow-auto border-l border-line bg-panel p-4">
        <Mini site={sel} height={120} />
        <div className="mt-3 text-[15px] font-semibold tracking-tight">{sel.name}</div>
        <div className="flex items-center gap-2 text-xs text-muted">{sel.url} <Status s={sel.status} /></div>
        <div className="seg mt-3 w-full"><button type="button" className="flex-1" aria-pressed={view === "overzicht"} onClick={() => setView("overzicht")}>Overzicht</button><button type="button" className="flex-1" aria-pressed={view === "logboek"} onClick={() => setView("logboek")}>Logboek</button></div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5" style={{ boxShadow: "var(--shadow-ring)" }}><div className="text-[11px] text-muted">Keuzes · 30 d</div><div className="font-mono text-[15px]">{sel.choices}</div></div>
          <div className="rounded-lg p-2.5" style={{ boxShadow: "var(--shadow-ring)" }}><div className="text-[11px] text-muted">Accepteert</div><div className="font-mono text-[15px]">{sel.accept}%</div></div>
        </div>
        <div className="mt-4 flex flex-col gap-2"><Link href={studioHref(sel)} className="btn btn-primary h-9 w-full">Openen in Studio</Link><Link href={`${studioHref(sel)}#installatie`} className="btn w-full">Installatie-code</Link></div>
        <div className="mt-4 rounded-lg p-2.5 font-mono text-[11px] text-muted" style={{ boxShadow: "var(--shadow-ring)" }}>consentkit.nl/s/{sel.id}.js</div>
        {sel.status === "verlopen" && <div className="mt-3 rounded-lg bg-amber-400/10 p-2.5 text-[11px] leading-relaxed text-amber-200">Banner staat uit: abonnement verlopen. De Consent Mode-defaults blijven op denied.</div>}
        <div className="mt-4"><InstallCheck key={sel.id} url={`https://${sel.url}`} /></div>
        <button type="button" className="btn btn-ghost mt-auto text-xs text-muted">Site verwijderen</button>
      </aside>
    </div>
  );
}

export function Team() {
  return (
    <div className="flex max-w-lg flex-col gap-3">
      <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}><input type="email" className="field" placeholder="collega@bureau.nl" /><button type="submit" className="btn">Uitnodigen</button></form>
      <div className="overflow-hidden rounded-xl" style={{ boxShadow: "var(--shadow-ring)" }}>
        {MEMBERS.map((m, i) => (
          <div key={m.email} className={`flex items-center gap-3 px-3 py-2.5 ${i ? "border-t border-line" : ""}`}>
            <Avatar initials={m.initials} size={26} />
            <div className="min-w-0 flex-1"><div className="truncate text-[13px]">{m.name}</div><div className="truncate text-[11px] text-muted">{m.email}</div></div>
            <span className={`text-[11px] ${m.role === "Uitgenodigd" ? "text-amber-300" : "text-muted"}`}>{m.role}</span>
            {m.role !== "Eigenaar" && <button type="button" className="btn btn-ghost h-7 px-2 text-xs">Verwijder</button>}
          </div>
        ))}
      </div>
      <p className="text-[11px] leading-relaxed text-muted">Iedereen in het team kan alle sites bewerken en publiceren. Facturatie alleen door de eigenaar.</p>
    </div>
  );
}

export function Billing() {
  return (
    <div className="flex max-w-lg flex-col gap-3">
      <div className="rounded-xl p-4" style={{ boxShadow: "var(--shadow-ring)" }}>
        <div className="flex items-start justify-between gap-3">
          <div><div className="text-[13px] font-medium">{ORG.plan} · {ORG.price}</div><div className="mt-0.5 text-xs text-muted">Onbeperkt sites en teamleden. Verlengt op {ORG.renews}.</div></div>
          <span className="inline-flex h-5 items-center rounded-full bg-emerald-400/15 px-2 text-[11px] font-medium text-emerald-300">Actief</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn">Betaalmethode ({ORG.card})</button><button type="button" className="btn btn-ghost">Opzeggen</button></div>
      </div>
      <div className="rounded-xl p-3 text-[11px] leading-relaxed text-muted" style={{ boxShadow: "var(--shadow-ring)" }}>Na opzeggen blijven je banners nog 14 dagen werken. Daarna verdwijnt de banner op alle sites; de Consent Mode-defaults blijven op <em>denied</em>.</div>
      <div>
        <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">Facturen</div>
        <div className="overflow-hidden rounded-xl" style={{ boxShadow: "var(--shadow-ring)" }}>
          {INVOICES.map((f, i) => <div key={f.date} className={`flex items-center justify-between px-3 py-2 text-[13px] ${i ? "border-t border-line" : ""}`}><span>{f.date}</span><span className="font-mono text-xs text-muted">{f.amount}</span><a href="#" className="text-xs text-muted underline underline-offset-2">PDF</a></div>)}
        </div>
      </div>
    </div>
  );
}

export function Profile() {
  return (
    <form className="flex max-w-sm flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
      <div className="flex items-center gap-3"><Avatar initials={USER.initials} size={40} /><div><div className="text-[13px] font-medium">{USER.name}</div><div className="text-xs text-muted">{USER.email}</div></div></div>
      <Field label="Naam"><input className="field" defaultValue={USER.name} /></Field>
      <Field label="E-mail"><input className="field" defaultValue={USER.email} /></Field>
      <Field label="Bureau"><input className="field" defaultValue={ORG.name} /></Field>
      <div className="flex gap-2"><button type="submit" className="btn btn-primary">Opslaan</button><Link href="/login" className="btn btn-ghost">Uitloggen</Link></div>
    </form>
  );
}

/** In de Studio-header: huidige site + wissel-menu, en het account-menu. */
export function SiteSwitcher({ domain }: { domain: string }) {
  const cur = SITES.find((s) => s.url === domain);
  return (
    <>
      <span className="relative">
        <button type="button" className="btn h-7 gap-1.5 px-2 text-[13px] font-normal" popoverTarget="site-menu"><span className="size-2 rounded-full" style={{ background: cur?.accent ?? "var(--color-muted)" }} />{domain}<Chevron /></button>
        <div id="site-menu" popover="auto" className="menu w-80">
          <input className="field mb-1 h-7 text-xs" placeholder="Zoek site…" onChange={(e) => { const q = e.target.value.toLowerCase(); e.currentTarget.parentElement?.querySelectorAll<HTMLElement>("[data-site]").forEach((el) => (el.hidden = !el.dataset.site!.includes(q))); }} />
          {SITES.map((s) => <Link key={s.id} href={studioHref(s)} data-site={`${s.name} ${s.url}`.toLowerCase()} className="menu-item" aria-current={s.url === domain}><span className="size-2 shrink-0 rounded-full" style={{ background: s.accent }} /><span className="min-w-0 flex-1 truncate">{s.name}<span className="ml-1.5 text-[11px] text-muted">{s.url}</span></span><Status s={s.status} /></Link>)}
          <div className="my-1 h-px bg-line" />
          <Link href="/sites" className="menu-item"><span className="flex-1">Alle sites</span><span className="text-muted">→</span></Link>
        </div>
      </span>
      <span className="relative ml-1">
        <button type="button" className="rounded-full" popoverTarget="user-menu" aria-label="Account"><Avatar initials={USER.initials} size={26} /></button>
        <div id="user-menu" popover="auto" className="menu w-56">
          <div className="px-2 pt-1 pb-2"><div className="text-[13px] font-medium">{USER.name}</div><div className="text-[11px] text-muted">{ORG.name} · {ORG.plan}</div></div>
          <div className="my-1 h-px bg-line" />
          {(["profiel", "team", "abonnement"] as Page[]).map((p) => <Link key={p} href={`/${p}`} className="menu-item">{PAGES[p]}</Link>)}
          <div className="my-1 h-px bg-line" />
          <Link href="/login" className="menu-item text-muted">Uitloggen</Link>
        </div>
      </span>
    </>
  );
}
