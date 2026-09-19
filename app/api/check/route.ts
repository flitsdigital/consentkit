import { checkInstall } from "@/lib/check";

export async function GET(request: Request) {
  const p = new URL(request.url).searchParams;
  try {
    return Response.json(await checkInstall(p.get("url") ?? "", p.get("key") || undefined, p.get("privacy") || undefined));
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Site niet bereikbaar" }, { status: 400 });
  }
}
