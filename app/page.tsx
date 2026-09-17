import { readFileSync } from "node:fs";
import { Suspense } from "react";
import { Configurator } from "./configurator";

// Alles wordt bij de build gelezen (prebuild = sync); public/ zit niet in de Vercel-functie, dus geen revalidatie.
const read = (f: string) => readFileSync(`public/consent/${f}`, "utf8");

async function latestVersion(): Promise<string> {
  try {
    const res = await fetch("https://api.github.com/repos/flitsdigital/cookie-consent/tags", { cache: "force-cache" });
    const tags: { name: string }[] = await res.json();
    return tags[0]?.name.replace(/^v/, "") || "1.0.0";
  } catch {
    return "1.0.0";
  }
}

export default async function Page() {
  const files = {
    customCss: read("custom.css"),
    classesCss: read("classes.css"),
    componentHtml: read("component.html"),
    clipboardJson: read("clipboard.json"),
    headSnippet: read("head.snippet.html"),
    version: await latestVersion(),
  };
  return (
    <Suspense>
      <Configurator files={files} />
    </Suspense>
  );
}
