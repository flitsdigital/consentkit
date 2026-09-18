import { readFileSync } from "node:fs";
import { Suspense } from "react";
import { Configurator } from "./configurator";

// Alles wordt bij de build gelezen (prebuild = sync); public/ zit niet in de Vercel-functie, dus geen revalidatie.
const read = (f: string) => readFileSync(`public/consent/${f}`, "utf8");

async function latestVersion(): Promise<string> {
  try {
    const res = await fetch("https://api.github.com/repos/flitsdigital/cookie-consent/tags", { cache: "force-cache" });
    const tags: { name: string }[] = await res.json();
    // GitHub sorteert tags niet op versie; hoogste semver kiezen
    const versions = tags.map((t) => t.name.replace(/^v/, "")).filter((v) => /^\d+\.\d+\.\d+$/.test(v));
    versions.sort((a, b) => { const [x, y] = [a, b].map((v) => v.split(".").map(Number)); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; });
    return versions.at(-1) || "1.0.0";
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
