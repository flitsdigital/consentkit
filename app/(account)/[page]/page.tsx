import { notFound } from "next/navigation";
import { Billing, Profile, Sites, Team } from "../../account";
import { PAGES, type Page } from "../../../lib/sample";

const VIEWS = { sites: Sites, team: Team, abonnement: Billing, profiel: Profile } as const;
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(PAGES).map((page) => ({ page })); }
export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) { const { page } = await params; return { title: `${PAGES[page as Page] ?? ""} · Consentkit` }; }

export default async function AccountPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const View = VIEWS[page as Page];
  if (!View) notFound();
  if (page === "sites") return <Sites />;
  return <main className="canvas overflow-auto p-6"><h1 className="mb-4 text-[15px] font-semibold tracking-tight">{PAGES[page as Page]}</h1><View /></main>;
}
