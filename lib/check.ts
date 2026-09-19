import { fetchText } from "./extract";

export type CheckItem = { id: string; label: string; state: "ok" | "warn" | "fail"; detail: string };
export type CheckResult = { items: CheckItem[]; checkedAt: string };

const pos = (html: string, re: RegExp) => html.search(re);

/** Statische HTML-check: staat alles op de site, in de juiste volgorde? (Webflow rendert server-side, dus dit volstaat.) */
export async function checkInstall(input: string, key?: string, privacy?: string): Promise<CheckResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const base = new URL(input);
    const html = await fetchText(base, ctrl.signal);
    const head = html.slice(0, pos(html, /<\/head>/i) >>> 0 || html.length);
    const items: CheckItem[] = [];
    const add = (id: string, label: string, state: CheckItem["state"], detail: string) => items.push({ id, label, state, detail });

    const cfg = head.match(/window\.FlitsConsent\s*=\s*\{([^}]*)\}/);
    const cfgKey = cfg?.[1].match(/key:\s*['"]([^'"]+)['"]/)?.[1];
    add("config", "Config in <head>", !cfg ? "fail" : key && cfgKey !== key ? "warn" : "ok", !cfg ? "window.FlitsConsent niet gevonden" : key && cfgKey !== key ? `key is '${cfgKey}', hier staat '${key}'` : `key '${cfgKey ?? "?"}'`);

    const snippet = pos(html, /head\.min\.js|FlitsConsent=r\.FlitsConsent\|\|\{\}/);
    const gtm = pos(html, /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/);
    add("defaults", "Consent-defaults vóór GTM", snippet < 0 ? "fail" : gtm >= 0 && snippet > gtm ? "fail" : "ok", snippet < 0 ? "head-snippet niet gevonden" : gtm < 0 ? "geen GTM gevonden; snippet staat er wel" : snippet > gtm ? "snippet staat ónder de GTM-tag" : "juiste volgorde");

    const script = html.match(/cookie-consent@([\d.]+)\/dist\/consent\.min\.js|consentkit\.[a-z]+\/s\/([A-Za-z0-9_-]+)\.js/);
    add("script", "Script geladen", script ? "ok" : "fail", script ? (script[1] ? `consent.min.js v${script[1]}` : `loader ${script[2]}`) : "footer-script niet gevonden");

    const banner = /data-cb=["']banner["']/.test(html);
    add("markup", "Banner-markup", banner || !!script?.[2] ? "ok" : "fail", banner ? "[data-cb=banner] aanwezig" : script?.[2] ? "wordt door de loader geplaatst" : "component niet op de pagina");

    const ids = [...new Set([...html.matchAll(/GTM-[A-Z0-9]{4,}/g)].map((m) => m[0]))];
    add("gtm", "Google Tag Manager", ids.length ? "ok" : "warn", ids.length ? ids.join(", ") : "geen container gevonden");

    const ga = [...new Set([...html.matchAll(/gtag\/js\?id=(G-[A-Z0-9]+)/g)].map((m) => m[1]))];
    add("ga", "Losse GA4-tag", ga.length ? "warn" : "ok", ga.length ? `${ga.join(", ")} staat los in de head naast GTM — meet mogelijk dubbel` : "geen dubbele meting");

    add("reopen", "Heropen-link", /data-cb-open/.test(html) ? "ok" : "warn", /data-cb-open/.test(html) ? "[data-cb-open] aanwezig" : "geen link met data-cb-open (bv. in de footer)");

    if (privacy) {
      const target = new URL(privacy, base);
      const status = await fetch(target, { method: "HEAD", signal: ctrl.signal, redirect: "follow", headers: { "user-agent": "Mozilla/5.0 (compatible; consent-config)" } }).then((r) => r.status).catch(() => 0);
      add("privacy", "Privacylink", status >= 200 && status < 400 ? "ok" : "fail", status ? `${target.pathname} → ${status}` : `${target.pathname} niet bereikbaar`);
    }
    return { items, checkedAt: new Date().toISOString() };
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error("Time-out: site antwoordt niet binnen 10 s");
    throw e instanceof Error ? e : new Error("Site niet bereikbaar");
  } finally {
    clearTimeout(timer);
  }
}
