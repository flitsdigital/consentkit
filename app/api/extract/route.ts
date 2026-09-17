import { extractFromUrl } from "@/lib/extract";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  try {
    return Response.json(await extractFromUrl(url));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Site niet bereikbaar" }, { status: 400 });
  }
}
