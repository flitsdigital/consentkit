"use client";
// Account-schermen: login, sites (met detailkolom), team, abonnement, profiel. Data uit lib/sample tot de DB er is.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Avatar, Field, Google, INVOICES, MEMBERS, Mini, ORG, PAGES, SITES, Status, USER, type Page, type Site } from "../lib/sample";
import { InstallCheck } from "./install-check";
import dynamic from "next/dynamic";
// tijdgebonden data → alleen client renderen (geen hydration-mismatch)
const Logbook = dynamic(() => import("./logbook").then((m) => m.Logbook), { ssr: false });
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

export function Sites() {
  const [sel, setSel] = useState<Site>(SITES[0]);
  const [view, setView] = useState<"overzicht" | "logboek">("overzicht");
  return (
    <div className="grid min-h-0 grid-cols-[1fr_320px]">
      <main className="canvas overflow-auto p-6">
        {view === "logboek" ? <>
        <div className="mb-4 flex items-center gap-3"><button type="button" className="btn btn-ghost h-7 px-2 text-xs" onClick={() => setView("overzicht")}>← Sites</button><h1 className="text-[15px] font-semibold tracking-tight">Logboek · {sel.name}</h1></div>
        <Logbook site={sel} />
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
