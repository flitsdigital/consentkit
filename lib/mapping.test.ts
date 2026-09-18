import { describe, expect, it } from "vitest";
import { extractFromCss } from "./extract";
import { DEFAULTS, mapToVars, renderCustomCss, keyFromUrl, toPx } from "./mapping";
import { readFileSync } from "node:fs";

const webflow = `
:root { --_colors---primary: #0f4c81; --_colors---text: #222; --_colors---light: #f2f4f7; }
body { color: var(--_colors---text); background-color: #fff; font-size: 16px; }
p { font-size: 17px; }
h3 { font-size: 24px; }
.btn { background-color: var(--_colors---primary); color: #fff; border-radius: 6px; }
.card { background-color: var(--_colors---light); border-radius: 16px; }
.card2 { background-color: var(--_colors---light); border-radius: 16px; }
.x { color: #222; }`;

describe("mapToVars", () => {
  it("Webflow-site met variabelen", () => {
    const v = mapToVars(extractFromCss([webflow]));
    expect(v["--cb-color"]).toBe("#222222");
    expect(v["--cb-color-background"]).toBe("#ffffff");
    expect(v["--cb-color-accent"]).toBe("#0f4c81");
    expect(v["--cb-color-accent-text"]).toBe("#ffffff");
    expect(v["--cb-color-surface"]).toBe("#f2f4f7"); // lichtste tint van de site
    expect(v["--cb-border-radius"]).toBe("16px");
    expect(v["--cb-button-radius"]).toBe("6px");
    expect(v["--cb-font-size"]).toBe("17px");
    expect(v["--cb-font-size-title"]).toBe("24px");
  });

  it("site zonder variabelen", () => {
    const v = mapToVars(extractFromCss([`.a{color:#111}.b{color:#111}.c{background-color:#e63946}.d{color:#e63946}.e{border-radius:4px}`]));
    expect(v["--cb-color"]).toBe("#111111");
    expect(v["--cb-color-accent"]).toBe("#e63946");
    expect(v["--cb-border-radius"]).toBe("4px");
    expect(v["--cb-button-radius"]).toBe("3px");
    expect(v["--cb-color-surface"]).toBe("#f1f1f1");
  });

  it("alleen zwart/wit → default accent", () => {
    const v = mapToVars(extractFromCss([`body{color:#000;background-color:#fff}.a{color:#000}`]));
    expect(v["--cb-color"]).toBe("#000000");
    expect(v["--cb-color-accent"]).toBe(DEFAULTS["--cb-color-accent"]);
    expect(v["--cb-color-switch-off"]).toBe("#d1d1d1");
    expect(v["--cb-font-size-small"]).toBe("13px");
  });
});

it("renderCustomCss vervangt alleen :root-waarden", () => {
  const src = readFileSync("public/consent/custom.css", "utf8");
  expect(renderCustomCss(src, { ...DEFAULTS })).toBe(src);
  const out = renderCustomCss(src, { ...DEFAULTS, "--cb-color-accent": "#123456", "--cb-offset": "20px" });
  expect(out).toContain("--cb-color-accent: #123456;\n");
  expect(out).toContain("--cb-color-accent-text: #1b020d; /* donker op roze");
  expect(out).toContain(":root { --cb-offset: 8px; --cb-padding: 20px; }"); // media-query blijft
  expect(out.replace("--cb-color-accent: #123456", "--cb-color-accent: #ec4d94").replace("--cb-offset: 20px", "--cb-offset: 16px")).toBe(src);
});

it("toPx", () => {
  expect(toPx(".5rem")).toBe(8);
  expect(toPx("17px")).toBe(17);
  expect(toPx("50%")).toBeUndefined();
});

it("keyFromUrl", () => {
  expect(keyFromUrl("https://veenstra-edelmetaal.webflow.io/")).toBe("veenstra_consent");
  expect(keyFromUrl("https://www.flitsdigital.nl")).toBe("flitsdigital_consent");
});
