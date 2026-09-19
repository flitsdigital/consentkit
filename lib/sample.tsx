// Sample data + kleine UI-stukjes voor accounts. ponytail: vervangt straks door Supabase; de vormen (Site, ORG, USER) blijven.
import type { ReactNode } from "react";

// ponytail: hier (niet in een "use client"-module) zodat server-pages de waarden kunnen lezen
export const PAGES = { sites: "Sites", team: "Team", abonnement: "Abonnement", profiel: "Profiel" } as const;
export type Page = keyof typeof PAGES;

export const USER = { name: "Jordi Klavers", email: "jordi@flitsdigital.nl", initials: "JK" };
export const ORG = { name: "Flits Digital", plan: "Agency", price: "€10 / maand", status: "actief", renews: "18 okt 2026", card: "•••• 4242" };
export const MEMBERS = [
  { name: "Jordi Klavers", email: "jordi@flitsdigital.nl", role: "Eigenaar", initials: "JK" },
  { name: "Anja de Vries", email: "anja@flitsdigital.nl", role: "Lid", initials: "AV" },
  { name: "sam@freelance.nl", email: "sam@freelance.nl", role: "Uitgenodigd", initials: "S" },
];
export type Site = { id: string; name: string; url: string; status: "live" | "concept" | "verlopen"; fg: string; bg: string; accent: string; choices: number; accept: number; updated: string };
export const SITES: Site[] = [
  { id: "k7Qx2pLm", name: "RPM Edelmetaal", url: "rpmedelmetaal.nl", status: "live", fg: "#ffffff", bg: "#000000", accent: "#947848", choices: 412, accept: 71, updated: "vandaag" },
  { id: "a3Fz9wQn", name: "Veenstra Edelmetaal", url: "veenstra-edelmetaal.nl", status: "live", fg: "#1b1b1b", bg: "#ffffff", accent: "#0f4c81", choices: 1280, accept: 64, updated: "3 dagen geleden" },
  { id: "m5Yb1xQe", name: "Autobedrijf Hoekstra", url: "hoekstra-auto.nl", status: "live", fg: "#111827", bg: "#f8fafc", accent: "#dc2626", choices: 96, accept: 58, updated: "2 weken geleden" },
  { id: "p8Lm4cVd", name: "Bakkerij Douma", url: "bakkerijdouma.nl", status: "concept", fg: "#3b2a1a", bg: "#fff8ee", accent: "#c2410c", choices: 0, accept: 0, updated: "gisteren" },
  { id: "w2Hn7tRk", name: "Studio Noord", url: "studionoord.webflow.io", status: "concept", fg: "#f2f2f2", bg: "#161616", accent: "#ec4d94", choices: 0, accept: 0, updated: "1 uur geleden" },
  { id: "q9Ct6vNa", name: "Tandarts Lemstra", url: "tandartslemstra.nl", status: "verlopen", fg: "#0f172a", bg: "#ffffff", accent: "#0ea5e9", choices: 0, accept: 0, updated: "6 weken geleden" },
];
export const INVOICES = [
  { date: "18 sep 2026", amount: "€10,00", status: "betaald" },
  { date: "18 aug 2026", amount: "€10,00", status: "betaald" },
  { date: "18 jul 2026", amount: "€10,00", status: "betaald" },
];

export const Avatar = ({ initials, size = 28 }: { initials: string; size?: number }) => (
  <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-raised font-medium text-fg" style={{ width: size, height: size, fontSize: size * 0.4, boxShadow: "var(--shadow-ring)" }}>{initials}</span>
);

export const Status = ({ s }: { s: Site["status"] }) => {
  const c = s === "live" ? "bg-emerald-400/15 text-emerald-300" : s === "concept" ? "bg-white/8 text-muted" : "bg-amber-400/15 text-amber-300";
  return <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${c}`}>{s === "live" ? "Live" : s === "concept" ? "Concept" : "Verlopen"}</span>;
};

/** Mini cookiebanner in de kleuren van de site — zelfde stijl als de starter-kaarten. */
export const Mini = ({ site, height = 88 }: { site: Site; height?: number }) => (
  <span className="starter-preview" style={{ height, background: `color-mix(in oklab, ${site.bg} 70%, #161616)` }}>
    <span className="starter-card w-[86%] rounded-md" style={{ bottom: 8, background: site.bg, color: site.fg }}>
      <span className="h-1.5 w-1/3 rounded-full" style={{ background: site.fg, opacity: 0.9 }} />
      <span className="h-1 w-3/4 rounded-full" style={{ background: site.fg, opacity: 0.35 }} />
      <span className="mt-auto flex justify-end gap-1"><span className="h-3 w-8 rounded-sm" style={{ background: site.fg, opacity: 0.12 }} /><span className="h-3 w-10 rounded-sm" style={{ background: site.accent }} /></span>
    </span>
  </span>
);

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block"><span className="mb-1 block text-[11px] font-medium text-muted">{label}</span>{children}</label>
);

export const Google = () => <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden><path fill="currentColor" d="M21.35 11.1H12v2.9h5.4c-.5 2.5-2.6 3.9-5.4 3.9a6 6 0 1 1 0-12c1.5 0 2.9.6 3.9 1.5l2.1-2.1A9 9 0 1 0 12 21c5.2 0 8.7-3.6 8.7-8.8 0-.4 0-.8-.1-1.1z" /></svg>;

// Nep-logboek: deterministisch per site (seed op id), zodat het er per site anders uitziet maar stabiel is.
export type LogRow = { at: Date; action: "accept" | "reject" | "custom"; cats: string[]; version: number; id: string; device: "Desktop" | "Mobiel"; page: string };
export function logFor(site: Site, n = 160): LogRow[] {
  if (site.status !== "live") return [];
  let x = [...site.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const rnd = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
  let t = Date.now();
  return Array.from({ length: n }, () => {
    const r = rnd();
    t -= 3.6e6 * (0.2 + rnd() * 1.6) * (n > 60 ? 4.5 : 1);
    const device = rnd() < 0.58 ? "Mobiel" : "Desktop";
    const page = ["/", "/", "/", "/contact", "/inkoopprijzen", "/goudtour", "/b2b"][Math.floor(rnd() * 7)];
    const action = r < site.accept / 100 ? "accept" : r < 0.9 ? "reject" : "custom";
    return { at: new Date(t), action, cats: action === "accept" ? ["analytics", "marketing"] : action === "custom" ? ["analytics"] : [], version: 1, device, page, id: Math.floor(rnd() * 0xffffffff).toString(16).padStart(8, "0") + "-" + Math.floor(rnd() * 0xffff).toString(16).padStart(4, "0") } as LogRow;
  });
}
