"use client";
// PROTOTYPE — drie layout-varianten voor dezelfde configurator, wisselbaar via ?variant=A|B|C.
// Vraag: welke indeling voelt rustiger dan de huidige drie-koloms layout? (tabs Banner/Gedrag/Stijl/Installatie, icoon-rail, canvas, onderbalk)
// Winnaar wordt de echte layout; de rest gaat weg. Zie mattpocock-skills:prototype.

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Folder } from "dialkit";

export type Parts = {
  domain: string;
  urlForm: ReactNode;
  errorLine: ReactNode;
  previewControls: ReactNode;
  shareBtn: ReactNode;
  foundPanel: ReactNode;
  generalTexts: ReactNode;
  categoryList: ReactNode;
  textsPanel: ReactNode;
  contrastStrip: ReactNode;
  styleFolders: { kleuren: ReactNode; typografie: ReactNode; maten: ReactNode; effect: ReactNode };
  stylePanel: ReactNode;
  behaviourPanel: ReactNode;
  exportPanel: ReactNode;
  preview: ReactNode;
  version: string;
  hasSite: boolean;
};

type Tab = "banner" | "gedrag" | "stijl" | "installatie";
const TABS: [Tab, string][] = [["banner", "Banner"], ["gedrag", "Gedrag"], ["stijl", "Stijl"], ["installatie", "Installatie"]];

/* ---------- Iconen ---------- */
const svg = (d: ReactNode) => <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{d}</svg>;
const I = {
  Text: () => svg(<><path d="M3 4h10M3 8h10M3 12h6" /></>),
  List: () => svg(<><path d="M5 4h8M5 8h8M5 12h8" /><circle cx="2.5" cy="4" r=".8" fill="currentColor" /><circle cx="2.5" cy="8" r=".8" fill="currentColor" /><circle cx="2.5" cy="12" r=".8" fill="currentColor" /></>),
  Sliders: () => svg(<><path d="M2 4h12M2 8h12M2 12h12" /><circle cx="6" cy="4" r="1.5" fill="var(--color-panel)" /><circle cx="10" cy="8" r="1.5" fill="var(--color-panel)" /><circle cx="5" cy="12" r="1.5" fill="var(--color-panel)" /></>),
  Globe: () => svg(<><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></>),
  Palette: () => svg(<><path d="M8 2a6 6 0 1 0 0 12h1a1.5 1.5 0 0 0 0-3h-.5a1 1 0 0 1 0-2H10a4 4 0 0 0 0-8H8z" /><circle cx="5" cy="7" r=".9" fill="currentColor" /><circle cx="8" cy="5" r=".9" fill="currentColor" /><circle cx="11" cy="7" r=".9" fill="currentColor" /></>),
  Type: () => svg(<><path d="M3 4h10M8 4v9M6 13h4" /></>),
  Ruler: () => svg(<><rect x="2" y="5" width="12" height="6" rx="1" /><path d="M5 5v2M8 5v3M11 5v2" /></>),
  Code: () => svg(<><path d="M6 4L2 8l4 4M10 4l4 4-4 4" /></>),
};
export const Cookie = () => <svg width="18" height="18" viewBox="0 0 24 24" className="text-accent" aria-hidden><path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M2 12C2 6.47715 6.47715 2 12 2C12.3853 2 12.7659 2.02184 13.1406 2.06443L14.1463 2.17875L14.0198 3.18304C14.0068 3.28644 14 3.39219 14 3.5C14 4.76634 14.9425 5.81419 16.1638 5.97771L16.9209 6.07907L17.0223 6.83617C17.1858 8.05754 18.2337 9 19.5 9C19.8094 9 20.1035 8.94425 20.3743 8.84314L21.4192 8.45303L21.6934 9.53406C21.8938 10.3239 22 11.1503 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM10 8.5C10 9.32843 9.32843 10 8.5 10C7.67157 10 7 9.32843 7 8.5C7 7.67157 7.67157 7 8.5 7C9.32843 7 10 7.67157 10 8.5ZM14 11.5C14 12.3284 13.3284 13 12.5 13C11.6716 13 11 12.3284 11 11.5C11 10.6716 11.6716 10 12.5 10C13.3284 10 14 10.6716 14 11.5ZM17 15C17.5523 15 18 14.5523 18 14C18 13.4477 17.5523 13 17 13C16.4477 13 16 13.4477 16 14C16 14.5523 16.4477 15 17 15ZM13 16.5C13 17.3284 12.3284 18 11.5 18C10.6716 18 10 17.3284 10 16.5C10 15.6716 10.6716 15 11.5 15C12.3284 15 13 15.6716 13 16.5ZM7 15C7.55228 15 8 14.5523 8 14C8 13.4477 7.55228 13 7 13C6.44772 13 6 13.4477 6 14C6 14.5523 6.44772 15 7 15Z" /></svg>;
const Arrow = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12L12 4M6 4h6v6" /></svg>;

// Secties per tab (voor de icoon-rail in variant A en de palette in C)
type Section = { id: string; label: string; icon: ReactNode; render: (p: Parts) => ReactNode };
const SECTIONS: Record<Tab, Section[]> = {
  banner: [
    { id: "teksten", label: "Teksten", icon: <I.Text />, render: (p) => <div className="dialkit-root texts px-1 pb-4" data-theme="dark"><Folder title="Algemeen" inline>{p.generalTexts}</Folder></div> },
    { id: "categorieen", label: "Categorieën", icon: <I.List />, render: (p) => <div className="dialkit-root texts px-1 pb-4" data-theme="dark">{p.categoryList}</div> },
  ],
  gedrag: [{ id: "opslag", label: "Opslag", icon: <I.Sliders />, render: (p) => p.behaviourPanel }],
  stijl: [
    { id: "site", label: "Site", icon: <I.Globe />, render: (p) => <div className="space-y-3 px-3 pb-4"><div>{p.urlForm}</div>{p.errorLine}{p.foundPanel}</div> },
    { id: "kleuren", label: "Kleuren", icon: <I.Palette />, render: (p) => <>{p.contrastStrip}<div className="dialkit-root px-3 pb-4" data-theme="dark"><Folder title="Kleuren" inline>{p.styleFolders.kleuren}</Folder></div></> },
    { id: "typografie", label: "Typografie", icon: <I.Type />, render: (p) => <div className="dialkit-root px-3 pb-4" data-theme="dark"><Folder title="Typografie" inline>{p.styleFolders.typografie}</Folder></div> },
    { id: "maten", label: "Maten", icon: <I.Ruler />, render: (p) => <div className="dialkit-root px-3 pb-4" data-theme="dark"><Folder title="Maten" inline>{p.styleFolders.maten}</Folder><Folder title="Effect" inline defaultOpen={false}>{p.styleFolders.effect}</Folder></div> },
  ],
  installatie: [{ id: "code", label: "Code", icon: <I.Code />, render: (p) => p.exportPanel }],
};

function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <nav className="flex items-center gap-1" aria-label="Onderdelen">
      {TABS.map(([id, name]) => (
        <button key={id} type="button" aria-current={tab === id} onClick={() => onTab(id)} className="tab">{name}</button>
      ))}
    </nav>
  );
}
const Logo = ({ domain }: { domain: string }) => (
  <div className="flex items-center gap-2 text-[13px]"><Cookie /><span className="font-semibold tracking-tight">consentkit</span><span className="text-muted">/</span><span className="truncate text-muted">{domain}</span></div>
);

/* ---------- A — Studio: tabs boven, icoon-rail links met zwevend paneel, canvas, onderbalk ---------- */
export function StudioLayout(p: Parts) {
  const [tab, setTab] = useState<Tab>(p.hasSite ? "stijl" : "stijl");
  const [section, setSection] = useState<string | null>("site");
  const sections = SECTIONS[tab];
  const active = sections.find((s) => s.id === section);
  const pick = (t: Tab) => { setTab(t); setSection(SECTIONS[t][0].id); };
  return (
    <div className="grid h-full grid-rows-[48px_1fr_48px]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
        <Logo domain={p.domain} />
        <Tabs tab={tab} onTab={pick} />
        <div className="flex items-center justify-end gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => pick("installatie")}>Exporteren <Arrow /></button></div>
      </header>
      <div className="relative min-h-0">
        <main className="canvas absolute inset-0 flex items-center justify-center overflow-auto p-8 pl-24">
          <div className="w-full max-w-5xl">{p.preview}</div>
        </main>
        {/* Rail */}
        <nav className="absolute top-4 left-4 flex flex-col gap-1 rounded-xl bg-panel p-1.5" style={{ boxShadow: "var(--shadow-pop)" }} aria-label="Secties">
          {sections.map((s) => (
            <button key={s.id} type="button" title={s.label} aria-label={s.label} aria-pressed={section === s.id} onClick={() => setSection(section === s.id ? null : s.id)} className="rail-btn">{s.icon}</button>
          ))}
        </nav>
        {/* Zwevend paneel naast de rail */}
        {active && (
          <aside className="float-panel absolute top-4 bottom-4 left-[68px] flex w-[336px] flex-col rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-pop)" }}>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
              <span className="text-[13px] font-medium">{active.label}</span>
              <button type="button" className="btn btn-ghost h-7 w-7 px-0" aria-label="Sluiten" onClick={() => setSection(null)}>✕</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pt-2">{active.render(p)}</div>
          </aside>
        )}
      </div>
      <footer className="flex items-center justify-between border-t border-line px-4">
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <span className="font-mono text-[11px] text-muted">consent.min.js v{p.version}</span>
      </footer>
    </div>
  );
}

/* ---------- B — Inspector: tabs boven, één rechterpaneel met de inhoud van de tab, canvas, onderbalk ---------- */
export function InspectorLayout(p: Parts) {
  const [tab, setTab] = useState<Tab>("stijl");
  const content: Record<Tab, ReactNode> = {
    banner: p.textsPanel,
    gedrag: p.behaviourPanel,
    stijl: <><div className="px-3 pb-3">{p.urlForm}{p.errorLine}</div>{p.contrastStrip}{p.stylePanel}<div className="border-t border-line px-3 pt-4 pb-4">{p.foundPanel}</div></>,
    installatie: p.exportPanel,
  };
  return (
    <div className="grid h-full grid-cols-[1fr_360px] grid-rows-[48px_1fr_48px]">
      <header className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
        <Logo domain={p.domain} />
        <Tabs tab={tab} onTab={setTab} />
        <div className="flex items-center justify-end gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => setTab("installatie")}>Exporteren <Arrow /></button></div>
      </header>
      <main className="canvas flex min-h-0 items-center justify-center overflow-auto p-8"><div className="w-full max-w-5xl">{p.preview}</div></main>
      <aside className="row-span-2 flex min-h-0 flex-col border-l border-line bg-panel">
        <div className="min-h-0 flex-1 overflow-y-auto pt-3">{content[tab]}</div>
      </aside>
      <footer className="flex items-center justify-between border-t border-line px-4">
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <span className="font-mono text-[11px] text-muted">v{p.version}</span>
      </footer>
    </div>
  );
}

/* ---------- C — Focus: alleen canvas; zwevende palette onderin opent een sheet rechts ---------- */
export function FocusLayout(p: Parts) {
  const [open, setOpen] = useState<string | null>(null); // "tab.section"
  const all = TABS.flatMap(([t, name]) => SECTIONS[t].map((s) => ({ ...s, tab: t, tabName: name, key: `${t}.${s.id}` })));
  const active = all.find((s) => s.key === open);
  return (
    <div className="relative h-full overflow-hidden">
      <header className="absolute inset-x-0 top-0 z-10 flex h-12 items-center justify-between px-4">
        <Logo domain={p.domain} />
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <div className="flex items-center gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => setOpen("installatie.code")}>Exporteren <Arrow /></button></div>
      </header>
      <main className="canvas absolute inset-0 flex items-center justify-center overflow-auto p-8 pt-16 pb-20"><div className="w-full max-w-5xl">{p.preview}</div></main>
      {/* Palette */}
      <nav className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl bg-panel p-1" style={{ boxShadow: "var(--shadow-pop)" }} aria-label="Onderdelen">
        {TABS.map(([t, name], i) => (
          <div key={t} className="flex items-center gap-0.5">
            {i > 0 && <span className="mx-1 h-5 w-px bg-line" />}
            <span className="px-1.5 text-[11px] text-muted">{name}</span>
            {SECTIONS[t].map((s) => (
              <button key={s.id} type="button" title={s.label} aria-label={`${name}: ${s.label}`} aria-pressed={open === `${t}.${s.id}`} onClick={() => setOpen(open === `${t}.${s.id}` ? null : `${t}.${s.id}`)} className="rail-btn">{s.icon}</button>
            ))}
          </div>
        ))}
      </nav>
      {/* Sheet rechts */}
      {active && (
        <aside className="float-panel absolute top-14 right-4 bottom-16 z-10 flex w-[360px] flex-col rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-pop)" }}>
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
            <span className="text-[13px]"><span className="text-muted">{active.tabName} / </span><span className="font-medium">{active.label}</span></span>
            <button type="button" className="btn btn-ghost h-7 w-7 px-0" aria-label="Sluiten" onClick={() => setOpen(null)}>✕</button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pt-2">{active.render(p)}</div>
        </aside>
      )}
    </div>
  );
}


/* ================= Ronde 2 ================= */
const ALL_SECTIONS = TABS.flatMap(([t, name]) => SECTIONS[t].map((s) => ({ ...s, tab: t, tabName: name, key: `${t}.${s.id}` })));
const PanelHeader = ({ crumb, title }: { crumb?: string; title: string }) => (
  <div className="flex h-11 shrink-0 items-center border-b border-line px-4 text-[13px]">{crumb && <span className="text-muted">{crumb}&nbsp;/&nbsp;</span>}<span className="font-medium">{title}</span></div>
);

/* ---------- D — Rail + inspector: tabs boven, icoon-rail (met label) links kiest de sectie, vast rechterpaneel toont die sectie ---------- */
export function RailInspectorLayout(p: Parts) {
  const [tab, setTab] = useState<Tab>("stijl");
  const [section, setSection] = useState("site");
  const sections = SECTIONS[tab];
  const active = sections.find((s) => s.id === section) ?? sections[0];
  const pick = (t: Tab) => { setTab(t); setSection(SECTIONS[t][0].id); };
  return (
    <div className="grid h-full grid-cols-[64px_1fr_360px] grid-rows-[48px_1fr_48px]">
      <header className="col-span-3 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
        <Logo domain={p.domain} />
        <Tabs tab={tab} onTab={pick} />
        <div className="flex items-center justify-end gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => pick("installatie")}>Exporteren <Arrow /></button></div>
      </header>
      <nav className="flex flex-col items-center gap-1 border-r border-line bg-panel py-3" aria-label="Secties">
        {sections.map((s) => (
          <button key={s.id} type="button" aria-pressed={active.id === s.id} onClick={() => setSection(s.id)} className="rail-btn h-auto w-14 flex-col gap-1 py-2 text-[10px]">{s.icon}<span>{s.label}</span></button>
        ))}
      </nav>
      <main className="canvas flex min-h-0 items-center justify-center overflow-auto p-8"><div className="w-full max-w-5xl">{p.preview}</div></main>
      <aside className="row-span-2 flex min-h-0 flex-col border-l border-line bg-panel">
        <PanelHeader crumb={TABS.find(([t]) => t === tab)![1]} title={active.label} />
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">{active.render(p)}</div>
      </aside>
      <footer className="col-span-2 flex items-center justify-between border-t border-line px-4">
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <span className="font-mono text-[11px] text-muted">v{p.version}</span>
      </footer>
    </div>
  );
}

/* ---------- E — Sidebar: geen tabs; linker sidebar met tekst-navigatie (groepen = tabs, items = secties), rechts inspector ---------- */
export function SidebarLayout(p: Parts) {
  const [open, setOpen] = useState("stijl.site");
  const active = ALL_SECTIONS.find((s) => s.key === open) ?? ALL_SECTIONS[0];
  return (
    <div className="grid h-full grid-cols-[208px_1fr_360px] grid-rows-[48px_1fr_48px]">
      <header className="col-span-3 flex items-center justify-between border-b border-line px-4">
        <Logo domain={p.domain} />
        <div className="flex items-center gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => setOpen("installatie.code")}>Exporteren <Arrow /></button></div>
      </header>
      <nav className="row-span-2 overflow-y-auto border-r border-line bg-panel p-3" aria-label="Onderdelen">
        {TABS.map(([t, name]) => (
          <div key={t} className="mb-4">
            <div className="mb-1 px-2 text-[11px] font-medium tracking-wide text-muted uppercase">{name}</div>
            {SECTIONS[t].map((s) => (
              <button key={s.id} type="button" aria-current={open === `${t}.${s.id}`} onClick={() => setOpen(`${t}.${s.id}`)} className="nav-item">{s.icon}<span>{s.label}</span></button>
            ))}
          </div>
        ))}
      </nav>
      <main className="canvas flex min-h-0 items-center justify-center overflow-auto p-8"><div className="w-full max-w-5xl">{p.preview}</div></main>
      <aside className="row-span-2 flex min-h-0 flex-col border-l border-line bg-panel">
        <PanelHeader crumb={active.tabName} title={active.label} />
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">{active.render(p)}</div>
      </aside>
      <footer className="flex items-center justify-between border-t border-line px-4">
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <span className="font-mono text-[11px] text-muted">v{p.version}</span>
      </footer>
    </div>
  );
}

/* ---------- F — Stappen: lineaire flow (Site → Stijl → Banner → Gedrag → Installatie), stap-inhoud links, canvas rechts, Vorige/Volgende onderin ---------- */
const STEPS: { title: string; keys: string[] }[] = [
  { title: "Site", keys: ["stijl.site"] },
  { title: "Stijl", keys: ["stijl.kleuren", "stijl.typografie", "stijl.maten"] },
  { title: "Banner", keys: ["banner.teksten", "banner.categorieen"] },
  { title: "Gedrag", keys: ["gedrag.opslag"] },
  { title: "Installatie", keys: ["installatie.code"] },
];
export function StepsLayout(p: Parts) {
  const [step, setStep] = useState(0);
  const cur = STEPS[step];
  return (
    <div className="grid h-full grid-cols-[400px_1fr] grid-rows-[48px_1fr_56px]">
      <header className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
        <Logo domain={p.domain} />
        <ol className="flex items-center gap-1" aria-label="Stappen">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex items-center gap-1">
              {i > 0 && <span className="mx-1 h-px w-4 bg-line" />}
              <button type="button" aria-current={i === step ? "step" : undefined} onClick={() => setStep(i)} className="step">
                <span className="step-n">{i + 1}</span>{s.title}
              </button>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-end gap-2">{p.shareBtn}</div>
      </header>
      <aside className="flex min-h-0 flex-col border-r border-line bg-panel">
        <PanelHeader crumb={`Stap ${step + 1}`} title={cur.title} />
        <div className="min-h-0 flex-1 overflow-y-auto pt-2">
          {cur.keys.map((k) => { const s = ALL_SECTIONS.find((x) => x.key === k)!; return <div key={k}>{cur.keys.length > 1 && <div className="px-4 pt-3 pb-1 text-[11px] font-medium tracking-wide text-muted uppercase">{s.label}</div>}{s.render(p)}</div>; })}
        </div>
      </aside>
      <main className="canvas flex min-h-0 items-center justify-center overflow-auto p-8"><div className="w-full max-w-5xl">{p.preview}</div></main>
      <footer className="col-span-2 flex items-center justify-between border-t border-line px-4">
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn" disabled={step === 0} onClick={() => setStep(step - 1)}>← Vorige</button>
          <button type="button" className="btn btn-primary" disabled={step === STEPS.length - 1} onClick={() => setStep(step + 1)}>Volgende →</button>
        </div>
      </footer>
    </div>
  );
}


/* ---------- G — Studio v2: A + feedback. Tabs boven met glijdende streep; vaste rail (alle secties, gegroepeerd, icoon + label);
   zwevend paneel met transitie i.p.v. keyframes; inhoud wisselt met 120 ms opacity; iframe-formaat instant; Escape sluit. ---------- */
function SlidingTabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const nav = useRef<HTMLElement>(null);
  const ink = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = nav.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (!el || !ink.current) return;
    ink.current.style.transform = `translateX(${el.offsetLeft + 10}px) scaleX(${(el.offsetWidth - 20) / 100})`;
  }, [tab]);
  return (
    <nav ref={nav} className="relative flex items-center gap-1" aria-label="Onderdelen">
      {TABS.map(([id, name]) => (
        <button key={id} type="button" data-tab={id} aria-current={tab === id} onClick={() => onTab(id)} className="tab tab-v2">{name}</button>
      ))}
      <span ref={ink} className="tab-ink" aria-hidden />
    </nav>
  );
}
export function StudioV2Layout(p: Parts) {
  const [open, setOpen] = useState<string | null>("stijl.site");
  const active = ALL_SECTIONS.find((s) => s.key === open);
  const [tab, setTab] = useState<Tab>("stijl");
  const pickTab = (t: Tab) => { setTab(t); setOpen(`${t}.${SECTIONS[t][0].id}`); };
  const pickSection = (s: (typeof ALL_SECTIONS)[number]) => { setTab(s.tab); setOpen(open === s.key ? null : s.key); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !(e.target as HTMLElement).closest("[popover]:popover-open")) setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="grid h-full grid-rows-[48px_1fr_48px]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
        <Logo domain={p.domain} />
        <SlidingTabs tab={tab} onTab={pickTab} />
        <div className="flex items-center justify-end gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => pickTab("installatie")}>Exporteren <Arrow /></button></div>
      </header>
      <div className="relative min-h-0">
        <main className="canvas absolute inset-0 flex items-center justify-center overflow-auto p-8 pl-28">
          <div className="w-full max-w-5xl">{p.preview}</div>
        </main>
        {/* Vaste rail: alle secties, gegroepeerd per tab */}
        <nav className="absolute top-4 left-4 flex w-[68px] flex-col items-stretch gap-0.5 rounded-xl bg-panel p-1.5" style={{ boxShadow: "var(--shadow-pop)" }} aria-label="Secties">
          {TABS.map(([t], gi) => (
            <div key={t} className="flex flex-col gap-0.5">
              {gi > 0 && <span className="mx-2 my-1 h-px bg-line" />}
              {SECTIONS[t].map((s) => (
                <button key={s.id} type="button" aria-pressed={open === `${t}.${s.id}`} aria-label={s.label} onClick={() => pickSection({ ...s, tab: t, tabName: "", key: `${t}.${s.id}` })} className="rail-btn rail-btn-v2">{s.icon}<span>{s.label}</span></button>
              ))}
            </div>
          ))}
        </nav>
        {/* Zwevend paneel: transitie + @starting-style; inhoud wisselt met key → 120 ms opacity */}
        {active && (
          <aside className="float-panel-v2 absolute top-4 bottom-4 left-[92px] flex w-[336px] flex-col rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-pop)" }}>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
              <span className="text-[13px]"><span className="text-muted">{active.tabName} / </span><span className="font-medium">{active.label}</span></span>
              <button type="button" className="btn btn-ghost h-7 w-7 px-0" aria-label="Sluiten (Esc)" title="Sluiten (Esc)" onClick={() => setOpen(null)}>✕</button>
            </div>
            <div key={active.key} className="panel-body min-h-0 flex-1 overflow-y-auto pt-2">{active.render(p)}</div>
          </aside>
        )}
      </div>
      <footer className="flex items-center justify-between border-t border-line px-4">
        <div className="flex items-center gap-2">{p.previewControls}</div>
        <span className="font-mono text-[11px] text-muted">consent.min.js v{p.version}</span>
      </footer>
    </div>
  );
}

/* ---------- Switcher (alleen dev) ---------- */
const VARIANTS: [string, string][] = [["A", "Studio: rail + zwevend paneel"], ["B", "Inspector: één rechterpaneel"], ["C", "Focus: canvas + palette"], ["D", "Rail + inspector"], ["E", "Sidebar + inspector"], ["F", "Stappen"], ["G", "Studio v2 (A + feedback)"]];
export function PrototypeSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const i = Math.max(0, VARIANTS.findIndex(([k]) => k === current));
  const go = (d: number) => {
    const q = new URLSearchParams(location.search);
    q.set("variant", VARIANTS[(i + d + VARIANTS.length) % VARIANTS.length][0]);
    router.replace(`?${q}`);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (!e.altKey || t.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="fixed bottom-16 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-2 py-1 text-[12px] font-medium text-white shadow-lg">
      <button type="button" onClick={() => go(-1)} className="px-1" aria-label="Vorige variant (Alt+←)">←</button>
      <span>PROTOTYPE {VARIANTS[i][0]} — {VARIANTS[i][1]}</span>
      <button type="button" onClick={() => go(1)} className="px-1" aria-label="Volgende variant">→</button>
    </div>
  );
}

