# consentkit

Eén pagina die van een website-URL de kleuren/radii/font-sizes haalt, ze mapt op de `--cb-*`-variabelen van [flitsdigital/cookie-consent](https://github.com/flitsdigital/cookie-consent) en de installatiecode voor Webflow oplevert: `custom.css`, head-code, footer-code en een "Copy to Webflow"-knop voor de component.

Alle banner-bestanden komen uit de source-repo (`public/consent/`, niet in git). Die repo is de enige bron van waarheid; hier staat geen eigen banner-CSS of -markup. Eén uitzondering: de uitlijning (links/rechts) is een aparte `<style>`-regel in het export-paneel, los van `custom.css` — die blijft byte-voor-byte gelijk aan de bron behalve de `:root`-waarden.

Dependencies: `css-tree` (parsen), `culori` (kleuren/contrast), `dialkit` (controls) en `motion` (verplichte peer van DialKit's React-adapter).

```bash
npm install
npm run sync   # haalt custom.css, classes.css, component.html, clipboard.json, head.snippet.html op (draait ook in prebuild)
npm run dev    # http://localhost:3000
npm test       # vitest: mapping
npm run test:e2e   # playwright (mockt /api/extract)
```

Deploy: Vercel, geen env-vars nodig. `prebuild` draait `sync`, dus elke deploy pakt de laatste versie van de source-bestanden; het versienummer in de footer-code komt van de laatste GitHub-tag (fallback `1.0.0`).

Deelbare state: alle gekozen waarden staan in de querystring (`?url=…&cb-color-accent=%23…&t0=…&key=…`).

Bestanden: `lib/extract.ts` (fetch + css-tree, server), `lib/mapping.ts` (mapping, contrast, custom.css-rendering), `app/configurator.tsx` (state + onderdelen), `app/studio.tsx` (layout: tabs, rail, zwevend paneel, canvas; de controls zijn [DialKit](https://dialkit.dev)-componenten), `app/api/extract/route.ts`.
