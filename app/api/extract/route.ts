import { extractFromUrl } from "@/lib/extract";

export async function GET(request: Request) {
  const url = new URL(request.url).searchParams.get("url") ?? "";
  try {
    return Response.json(await extractFromUrl(url));
  } catch (e) {
    return Response.json({ error: (e as Error).message || "Site niet bereikbaar" }, { status: 400 }); // extractFromUrl gooit altijd een Error
  }
}
