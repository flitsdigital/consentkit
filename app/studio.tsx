"use client";
// Studio-layout: tabs boven (Banner/Gedrag/Stijl/Installatie), vaste icoon-rail links, zwevend paneel, canvas, onderbalk.
// Gekozen uit zeven prototypes (branch prototype/layout, variant G).

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
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
  contrastStrip: ReactNode;
  versions: ReactNode;
  styleFolders: { kleuren: ReactNode; typografie: ReactNode; maten: ReactNode; effect: ReactNode };
  behaviourPanel: ReactNode;
  exportPanel: ReactNode;
  preview: ReactNode;
  version: string;
};

const TABS = { banner: "Banner", gedrag: "Gedrag", stijl: "Stijl", installatie: "Installatie" } as const;
type Tab = keyof typeof TABS;
const TAB_IDS = Object.keys(TABS) as Tab[];

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

// Secties per tab (rail + paneel)
type Section = { id: string; label: string; icon: ReactNode; render: (p: Parts) => ReactNode };
const SECTIONS: Record<Tab, Section[]> = {
  banner: [
    { id: "teksten", label: "Teksten", icon: <I.Text />, render: (p) => <div className="dialkit-root texts px-1 pb-4" data-theme="dark"><Folder title="Algemeen" inline>{p.generalTexts}</Folder></div> },
    { id: "categorieen", label: "Categorieën", icon: <I.List />, render: (p) => <div className="dialkit-root texts px-1 pb-4" data-theme="dark">{p.categoryList}</div> },
  ],
  gedrag: [{ id: "opslag", label: "Opslag", icon: <I.Sliders />, render: (p) => p.behaviourPanel }],
  stijl: [
    { id: "site", label: "Site", icon: <I.Globe />, render: (p) => <div className="space-y-3 px-3 pb-4"><div>{p.urlForm}</div>{p.errorLine}{p.foundPanel}</div> },
    { id: "kleuren", label: "Kleuren", icon: <I.Palette />, render: (p) => <>{p.versions}{p.contrastStrip}<div className="dialkit-root px-3 pb-4" data-theme="dark"><Folder title="Kleuren" inline>{p.styleFolders.kleuren}</Folder></div></> },
    { id: "typografie", label: "Typografie", icon: <I.Type />, render: (p) => <>{p.versions}<div className="dialkit-root px-3 pb-4" data-theme="dark"><Folder title="Typografie" inline>{p.styleFolders.typografie}</Folder></div></> },
    { id: "maten", label: "Maten", icon: <I.Ruler />, render: (p) => <>{p.versions}<div className="dialkit-root px-3 pb-4" data-theme="dark"><Folder title="Maten" inline>{p.styleFolders.maten}</Folder><Folder title="Effect" inline defaultOpen={false}>{p.styleFolders.effect}</Folder></div></> },
  ],
  installatie: [{ id: "code", label: "Code", icon: <I.Code />, render: (p) => p.exportPanel }],
};

const ALL_SECTIONS = TAB_IDS.flatMap((t) => SECTIONS[t].map((s) => ({ ...s, tab: t, key: `${t}.${s.id}` })));

/* Tabs met glijdende streep; vaste rail (alle secties, gegroepeerd, icoon + label);
   zwevend paneel met transitie + @starting-style; inhoud wisselt met 120 ms opacity; Escape sluit. */
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
      {TAB_IDS.map((id) => (
        <button key={id} type="button" data-tab={id} aria-current={tab === id} onClick={() => onTab(id)} className="tab">{TABS[id]}</button>
      ))}
      <span ref={ink} className="tab-ink" aria-hidden />
    </nav>
  );
}
export function Studio(p: Parts) {
  const [open, setOpen] = useState<string | null>("stijl.site");
  const active = ALL_SECTIONS.find((s) => s.key === open);
  const [tab, setTab] = useState<Tab>("stijl");
  const pickTab = (t: Tab) => { setTab(t); setOpen(`${t}.${SECTIONS[t][0].id}`); };
  const pickSection = (t: Tab, key: string) => { setTab(t); setOpen(open === key ? null : key); };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !(e.target as HTMLElement).closest("[popover]:popover-open")) setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div className="grid h-full grid-rows-[48px_1fr_48px]">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center border-b border-line px-4">
        <div className="flex items-center gap-2 text-[13px]"><Cookie /><span className="font-semibold tracking-tight">consentkit</span><span className="text-muted">/</span><span className="truncate text-muted">{p.domain}</span></div>
        <SlidingTabs tab={tab} onTab={pickTab} />
        <div className="flex items-center justify-end gap-2">{p.shareBtn}<button type="button" className="btn btn-primary ps-3 pe-2.5" onClick={() => pickTab("installatie")}>Exporteren <Arrow /></button></div>
      </header>
      <div className="relative min-h-0">
        <main className="canvas absolute inset-0 flex items-center justify-center overflow-auto p-8 pl-28">
          <div className="w-full max-w-5xl">{p.preview}</div>
        </main>
        {/* Vaste rail: alle secties, gegroepeerd per tab */}
        <nav className="absolute top-4 left-4 flex w-[68px] flex-col items-stretch gap-0.5 rounded-xl bg-panel p-1.5" style={{ boxShadow: "var(--shadow-pop)" }} aria-label="Secties">
          {TAB_IDS.map((t, gi) => (
            <div key={t} className="flex flex-col gap-0.5">
              {gi > 0 && <span className="mx-2 my-1 h-px bg-line" />}
              {SECTIONS[t].map((s) => (
                <button key={s.id} type="button" aria-pressed={open === `${t}.${s.id}`} aria-label={s.label} onClick={() => pickSection(t, `${t}.${s.id}`)} className="rail-btn">{s.icon}<span>{s.label}</span></button>
              ))}
            </div>
          ))}
        </nav>
        {/* Zwevend paneel: transitie + @starting-style; inhoud wisselt met key → 120 ms opacity */}
        {active && (
          <aside className="float-panel absolute top-4 bottom-4 left-[92px] flex w-[336px] flex-col rounded-xl bg-panel" style={{ boxShadow: "var(--shadow-pop)" }}>
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-3">
              <span className="text-[13px]"><span className="text-muted">{TABS[active.tab]} / </span><span className="font-medium">{active.label}</span></span>
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

