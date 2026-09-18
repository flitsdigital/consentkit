"use client";
// PROTOTYPE — drie shells voor login / sites / account. Schermen wisselen via ?screen=; niets muteert.
import { useState, type ReactNode } from "react";
import { Cookie } from "../../studio";
import { Avatar, Field, Google, INVOICES, MEMBERS, Mini, ORG, SITES, Status, USER, type Site } from "./data";

export type Screen = "login" | "sites" | "profiel" | "team" | "abonnement";
type P = { screen: Screen; go: (s: Screen) => void };
const ACCOUNT: [Screen, string][] = [["profiel", "Profiel"], ["team", "Team"], ["abonnement", "Abonnement"]];

/* ---------- gedeelde inhoud (de vorm eromheen verschilt per variant) ---------- */
const LoginForm = ({ go, compact }: { go: P["go"]; compact?: boolean }) => (
  <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); go("sites"); }}>
    {!compact && <div><h1 className="text-[17px] font-semibold tracking-tight">Inloggen bij Consentkit</h1><p className="mt-1 text-xs leading-relaxed text-muted">Je krijgt een inloglink per e-mail. Geen wachtwoord.</p></div>}
    <button type="button" className="btn h-9 w-full" onClick={() => go("sites")}><Google /> Doorgaan met Google</button>
    <div className="flex items-center gap-3 text-[11px] text-muted"><span className="h-px flex-1 bg-line" />of<span className="h-px flex-1 bg-line" /></div>
    <Field label="E-mail"><input type="email" className="field" placeholder="naam@bureau.nl" defaultValue={USER.email} /></Field>
    <button type="submit" className="btn btn-primary h-9 w-full">Stuur inloglink</button>
    <p className="text-center text-[11px] text-muted">Nog geen account? <button type="button" className="text-fg underline underline-offset-2" onClick={() => go("sites")}>Start met 14 dagen gratis</button></p>
  </form>
);

const Profile = () => (
  <div className="flex max-w-sm flex-col gap-3">
    <div className="flex items-center gap-3"><Avatar initials={USER.initials} size={40} /><div><div className="text-[13px] font-medium">{USER.name}</div><div className="text-xs text-muted">{USER.email}</div></div></div>
    <Field label="Naam"><input className="field" defaultValue={USER.name} /></Field>
    <Field label="E-mail"><input className="field" defaultValue={USER.email} /></Field>
    <Field label="Bureau"><input className="field" defaultValue={ORG.name} /></Field>
    <div className="flex gap-2"><button type="button" className="btn btn-primary">Opslaan</button><button type="button" className="btn btn-ghost">Uitloggen</button></div>
  </div>
);

const Team = () => (
  <div className="flex max-w-lg flex-col gap-3">
    <div className="flex gap-2"><input className="field" placeholder="collega@bureau.nl" /><button type="button" className="btn">Uitnodigen</button></div>
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

const Billing = ({ tight }: { tight?: boolean }) => (
  <div className={`flex flex-col gap-3 ${tight ? "" : "max-w-lg"}`}>
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

const SiteRow = ({ s, onOpen }: { s: Site; onOpen: () => void }) => (
  <button type="button" onClick={onOpen} className="menu-item !grid grid-cols-[44px_1fr_110px_120px_72px] items-center gap-3 px-2 py-2">
    <span className="h-7 w-11 overflow-hidden rounded-md" style={{ background: s.bg }}><span className="mt-3.5 ml-1.5 block h-2 w-5 rounded-sm" style={{ background: s.accent }} /></span>
    <span className="min-w-0"><span className="block truncate text-[13px]">{s.name}</span><span className="block truncate text-[11px] text-muted">{s.url}</span></span>
    <span className="text-right font-mono text-[11px] text-muted">{s.status === "live" ? `${s.choices} · ${s.accept}%` : "—"}</span>
    <span className="text-right text-[11px] text-muted">{s.updated}</span>
    <Status s={s.status} />
  </button>
);

const NewSiteMenu = ({ id }: { id: string }) => (
  <div id={id} popover="auto" className="menu menu-right w-72">
    <div className="menu-title">Nieuwe site</div>
    <form className="flex flex-col gap-2 px-2 pb-2" onSubmit={(e) => e.preventDefault()}>
      <input className="field font-mono text-xs" placeholder="klant.webflow.io" autoFocus />
      <button type="submit" className="btn btn-primary h-8 w-full">Stijl ophalen en beginnen</button>
    </form>
  </div>
);

const UserMenu = ({ id, go }: { id: string; go: P["go"] }) => (
  <div id={id} popover="auto" className="menu menu-right w-56">
    <div className="px-2 pt-1 pb-2"><div className="text-[13px] font-medium">{USER.name}</div><div className="text-[11px] text-muted">{ORG.name} · {ORG.plan}</div></div>
    <div className="my-1 h-px bg-line" />
    {ACCOUNT.map(([s, l]) => <button key={s} type="button" className="menu-item" popoverTarget={id} popoverTargetAction="hide" onClick={() => go(s)}>{l}</button>)}
    <div className="my-1 h-px bg-line" />
    <button type="button" className="menu-item text-muted" popoverTarget={id} popoverTargetAction="hide" onClick={() => go("login")}>Uitloggen</button>
  </div>
);

/* ---------- A · Werkruimte: apart dashboard, topbar + lijst, account via avatar-menu ---------- */
export function VariantA({ screen, go }: P) {
  const [q, setQ] = useState("");
  if (screen === "login") return (
    <div className="canvas flex h-full items-center justify-center p-8">
      <div className="w-full max-w-sm rounded-2xl bg-panel p-6" style={{ boxShadow: "var(--shadow-pop)" }}>
        <div className="mb-5 flex items-center gap-2 text-[13px]"><Cookie /><span className="font-semibold tracking-tight">consentkit</span></div>
        <LoginForm go={go} />
      </div>
    </div>
  );
  const list = SITES.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.url.includes(q.toLowerCase()));
  const live = SITES.filter((s) => s.status === "live");
  return (
    <div className="grid h-full grid-rows-[48px_1fr]">
      <header className="flex items-center justify-between border-b border-line px-4">
        <button type="button" className="flex items-center gap-2 text-[13px]" onClick={() => go("sites")}><Cookie /><span className="font-semibold tracking-tight">consentkit</span><span className="text-muted">/</span><span className="text-muted">{ORG.name}</span></button>
        <div className="flex items-center gap-2">
          <span className="relative"><button type="button" className="btn btn-primary" popoverTarget="a-new">+ Nieuwe site</button><NewSiteMenu id="a-new" /></span>
          <span className="relative"><button type="button" className="rounded-full" popoverTarget="a-user" aria-label="Account"><Avatar initials={USER.initials} /></button><UserMenu id="a-user" go={go} /></span>
        </div>
      </header>
      <main className="canvas overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-8">
          {screen === "sites" ? (
            <>
              <div className="mb-5 flex items-end justify-between gap-4">
                <div><h1 className="text-[17px] font-semibold tracking-tight">Sites</h1><p className="mt-0.5 text-xs text-muted">{live.length} live · {SITES.length - live.length} overig · {live.reduce((n, s) => n + s.choices, 0)} keuzes in 30 dagen</p></div>
                <input className="field w-56" placeholder="Zoeken…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <div className="rounded-xl bg-panel p-1.5" style={{ boxShadow: "var(--shadow-pop)" }}>
                <div className="grid grid-cols-[44px_1fr_110px_120px_72px] gap-3 px-2 pt-1 pb-2 text-[11px] text-muted"><span /><span>Site</span><span className="text-right">Keuzes · accept</span><span className="text-right">Bewerkt</span><span>Status</span></div>
                {list.map((s) => <SiteRow key={s.id} s={s} onOpen={() => {}} />)}
              </div>
            </>
          ) : (
            <>
              <div className="mb-5 flex items-center gap-3"><button type="button" className="btn btn-ghost h-7 px-2 text-xs" onClick={() => go("sites")}>← Sites</button><h1 className="text-[17px] font-semibold tracking-tight">Account</h1></div>
              <div className="seg mb-5">{ACCOUNT.map(([s, l]) => <button key={s} type="button" aria-pressed={screen === s} onClick={() => go(s)}>{l}</button>)}</div>
              {screen === "profiel" ? <Profile /> : screen === "team" ? <Team /> : <Billing />}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

/* ---------- B · Zijbalk: org-switcher + navigatie links, kaarten met mini-banner, detail rechts ---------- */
export function VariantB({ screen, go }: P) {
  const [sel, setSel] = useState<Site | null>(SITES[0]);
  if (screen === "login") return (
    <div className="grid h-full grid-cols-[1.1fr_1fr]">
      <div className="canvas relative flex flex-col justify-between border-r border-line p-8">
        <div className="flex items-center gap-2 text-[13px]"><Cookie /><span className="font-semibold tracking-tight">consentkit</span></div>
        <div className="grid max-w-md grid-cols-2 gap-3">{SITES.slice(0, 4).map((s) => <Mini key={s.id} site={s} height={96} />)}</div>
        <p className="max-w-sm text-[13px] leading-relaxed text-muted">Cookiebanners in de huisstijl van elke klant. Eén abonnement, onbeperkt sites, altijd Consent Mode v2.</p>
      </div>
      <div className="flex items-center justify-center p-8"><div className="w-full max-w-xs"><LoginForm go={go} /></div></div>
    </div>
  );
  const NAV: [Screen, string][] = [["sites", "Sites"], ["team", "Team"], ["abonnement", "Abonnement"], ["profiel", "Profiel"]];
  return (
    <div className="grid h-full grid-cols-[220px_1fr]">
      <aside className="flex flex-col border-r border-line bg-panel p-3">
        <span className="relative"><button type="button" className="menu-item mb-3 justify-between" popoverTarget="b-org"><span className="flex items-center gap-2"><Cookie /><span className="text-[13px] font-medium">{ORG.name}</span></span><span className="text-muted">⌄</span></button>
          <div id="b-org" popover="auto" className="menu w-52"><div className="menu-title">Bureaus</div><button type="button" className="menu-item" aria-current="true">{ORG.name}</button><button type="button" className="menu-item text-muted">+ Nieuw bureau</button></div></span>
        <nav className="flex flex-col gap-0.5">{NAV.map(([s, l]) => <button key={s} type="button" className="menu-item" aria-current={screen === s} onClick={() => go(s)}>{l}{s === "sites" && <span className="ml-auto font-mono text-[11px] text-muted">{SITES.length}</span>}</button>)}</nav>
        <div className="mt-auto flex items-center gap-2 px-2 text-xs"><Avatar initials={USER.initials} size={24} /><span className="min-w-0 flex-1 truncate">{USER.name}</span><button type="button" className="btn btn-ghost h-7 px-2 text-[11px]" onClick={() => go("login")}>Uit</button></div>
      </aside>
      {screen === "sites" ? (
        <div className="grid min-h-0 grid-cols-[1fr_320px]">
          <main className="canvas overflow-auto p-6">
            <div className="mb-4 flex items-center justify-between"><h1 className="text-[15px] font-semibold tracking-tight">Sites</h1><span className="relative"><button type="button" className="btn btn-primary" popoverTarget="b-new">+ Nieuwe site</button><NewSiteMenu id="b-new" /></span></div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3">
              {SITES.map((s) => (
                <button key={s.id} type="button" className="starter bg-panel" aria-pressed={sel?.id === s.id} onClick={() => setSel(s)} style={sel?.id === s.id ? { boxShadow: "0 0 0 1px oklch(1 0 0 / 0.35)" } : undefined}>
                  <Mini site={s} />
                  <span className="flex items-center justify-between gap-2 px-1 pb-0.5"><span className="min-w-0"><span className="block truncate text-[13px]">{s.name}</span><span className="block truncate text-[11px] text-muted">{s.url}</span></span><Status s={s.status} /></span>
                </button>
              ))}
            </div>
          </main>
          <aside className="flex flex-col overflow-auto border-l border-line bg-panel p-4">
            {sel && (
              <>
                <Mini site={sel} height={120} />
                <div className="mt-3 text-[15px] font-semibold tracking-tight">{sel.name}</div>
                <div className="text-xs text-muted">{sel.url} · <Status s={sel.status} /></div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-lg p-2.5" style={{ boxShadow: "var(--shadow-ring)" }}><div className="text-[11px] text-muted">Keuzes · 30 d</div><div className="font-mono text-[15px]">{sel.choices}</div></div>
                  <div className="rounded-lg p-2.5" style={{ boxShadow: "var(--shadow-ring)" }}><div className="text-[11px] text-muted">Accepteert</div><div className="font-mono text-[15px]">{sel.accept}%</div></div>
                </div>
                <div className="mt-4 flex flex-col gap-1.5"><button type="button" className="btn btn-primary h-9 w-full">Openen in Studio</button><button type="button" className="btn w-full">Installatie-code</button></div>
                <div className="mt-4 rounded-lg p-2.5 font-mono text-[11px] text-muted" style={{ boxShadow: "var(--shadow-ring)" }}>consentkit.nl/s/{sel.id}.js</div>
                {sel.status === "verlopen" && <div className="mt-3 rounded-lg bg-amber-400/10 p-2.5 text-[11px] leading-relaxed text-amber-200">Banner staat uit: abonnement verlopen op 6 aug. Defaults blijven denied.</div>}
                <button type="button" className="btn btn-ghost mt-auto text-xs text-muted">Site verwijderen</button>
              </>
            )}
          </aside>
        </div>
      ) : (
        <main className="canvas overflow-auto p-6">
          <h1 className="mb-4 text-[15px] font-semibold tracking-tight">{NAV.find(([s]) => s === screen)?.[1]}</h1>
          {screen === "profiel" ? <Profile /> : screen === "team" ? <Team /> : <Billing />}
        </main>
      )}
    </div>
  );
}

/* ---------- C · In de Studio: geen dashboard, site-switcher in de header, account als zwevend paneel ---------- */
const StudioChrome = ({ site, children, header, panel }: { site: Site; children?: ReactNode; header: ReactNode; panel?: ReactNode }) => (
  <div className="grid h-full grid-rows-[48px_1fr_48px]">
    <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
      {header}
      <div className="flex items-center gap-4">{["Banner", "Gedrag", "Stijl", "Installatie"].map((t, i) => <span key={t} className={`text-[13px] ${i === 2 ? "text-fg" : "text-muted"}`}>{t}</span>)}</div>
      <div className="flex items-center justify-end gap-2"><button type="button" className="btn btn-ghost">Deel link</button><button type="button" className="btn btn-primary">Exporteren <span className="font-mono text-[11px] opacity-60">0/2</span></button></div>
    </header>
    <div className="relative min-h-0">
      <main className="canvas absolute inset-0 flex items-center justify-center p-8 pl-28">
        <div className="w-full max-w-5xl"><div className="mb-2 text-center font-mono text-[11px] text-muted">Desktop · 1024 × 640</div>
          <div className="relative mx-auto aspect-[1024/640] w-full overflow-hidden rounded-xl" style={{ background: `color-mix(in oklab, ${site.bg} 60%, #161616)`, boxShadow: "var(--shadow-pop)" }}>
            <div className="absolute right-6 bottom-6 w-[46%] rounded-xl p-5" style={{ background: site.bg, color: site.fg, boxShadow: "0 12px 40px rgba(0,0,0,.35)" }}>
              <div className="text-[15px] font-bold">Wij gebruiken cookies</div><div className="mt-1 text-[11px] leading-relaxed opacity-75">Wij gebruiken functionele cookies om de website goed te laten werken. Met uw toestemming ook voor statistieken en advertenties.</div>
              <div className="mt-3 flex justify-end gap-1.5"><span className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold" style={{ background: `color-mix(in oklab, ${site.fg} 8%, ${site.bg})` }}>Instellingen</span><span className="rounded-md px-2.5 py-1.5 text-[11px] font-semibold" style={{ background: site.accent, color: "#fff" }}>Alles accepteren</span></div>
            </div>
          </div>
        </div>
      </main>
      <nav className="absolute top-4 left-4 flex w-[68px] flex-col gap-0.5 rounded-xl bg-panel p-1.5" style={{ boxShadow: "var(--shadow-pop)" }}>
        {["Teksten", "Categorieën", "Opslag", "Site", "Starters", "Kleuren", "Typografie", "Layout", "Code"].map((l, i) => <span key={l} className="rail-btn" aria-pressed={i === 3}><span className="size-4 rounded-sm bg-white/10" /><span>{l}</span></span>)}
      </nav>
      {panel}
      {children}
    </div>
    <footer className="flex items-center justify-between border-t border-line px-4"><div className="seg"><button type="button" aria-pressed>Gesloten</button><button type="button">Instellingen</button></div><span className="font-mono text-[11px] text-muted">consent.min.js v1.0.0</span></footer>
  </div>
);

export function VariantC({ screen, go }: P) {
  const [site, setSite] = useState<Site>(SITES[0]);
  const header = (
    <div className="flex items-center gap-2 text-[13px]">
      <Cookie /><span className="font-semibold tracking-tight">consentkit</span><span className="text-muted">/</span>
      <span className="relative">
        <button type="button" className="btn h-7 gap-1.5 px-2 text-[13px] font-normal" popoverTarget="c-sites"><span className="size-2 rounded-full" style={{ background: site.accent }} />{site.url}<span className="text-muted">⌄</span></button>
        <div id="c-sites" popover="auto" className="menu w-80">
          <input className="field mb-1 h-7 text-xs" placeholder="Zoek site…" />
          {SITES.map((s) => <button key={s.id} type="button" className="menu-item" aria-current={s.id === site.id} popoverTarget="c-sites" popoverTargetAction="hide" onClick={() => setSite(s)}><span className="size-2 shrink-0 rounded-full" style={{ background: s.accent }} /><span className="min-w-0 flex-1 truncate">{s.name}<span className="ml-1.5 text-[11px] text-muted">{s.url}</span></span><Status s={s.status} /></button>)}
          <div className="my-1 h-px bg-line" />
          <button type="button" className="menu-item" popoverTarget="c-sites" popoverTargetAction="hide">+ Nieuwe site</button>
        </div>
      </span>
      <span className="relative ml-1"><button type="button" className="rounded-full" popoverTarget="c-user" aria-label="Account"><Avatar initials={USER.initials} size={26} /></button><UserMenu id="c-user" go={go} /></span>
    </div>
  );
  const panel = screen !== "login" && screen !== "sites" && (
    <aside className="float-panel absolute top-4 right-4 bottom-4 flex w-[360px] flex-col rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-pop)" }}>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3"><span className="text-[13px]"><span className="text-muted">Account / </span><span className="font-medium">{ACCOUNT.find(([s]) => s === screen)?.[1]}</span></span><button type="button" className="btn btn-ghost h-7 w-7 px-0" aria-label="Sluiten" onClick={() => go("sites")}>✕</button></div>
      <div className="seg m-3 mb-0">{ACCOUNT.map(([s, l]) => <button key={s} type="button" className="flex-1" aria-pressed={screen === s} onClick={() => go(s)}>{l}</button>)}</div>
      <div key={screen} className="panel-body min-h-0 flex-1 overflow-y-auto p-3">{screen === "profiel" ? <Profile /> : screen === "team" ? <Team /> : <Billing tight />}</div>
    </aside>
  );
  return (
    <StudioChrome site={site} header={header} panel={panel || undefined}>
      {screen === "login" && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-panel p-6" style={{ boxShadow: "var(--shadow-pop)" }}>
            <div className="mb-1 text-[15px] font-semibold tracking-tight">Log in om te publiceren</div>
            <p className="mb-4 text-xs leading-relaxed text-muted">Je banner staat klaar. Met een account kun je hem live zetten, teksten later aanpassen en de consent-log zien.</p>
            <LoginForm go={go} compact />
          </div>
        </div>
      )}
    </StudioChrome>
  );
}
