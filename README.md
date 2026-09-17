# Cookie consent configurator

Eén pagina die van een website-URL de kleuren/radii/font-sizes haalt, ze mapt op de `--cb-*`-variabelen van [flitsdigital/cookie-consent](https://github.com/flitsdigital/cookie-consent) en de installatiecode voor Webflow oplevert: `custom.css`, head-code, footer-code en een "Copy to Webflow"-knop voor de component.

Alle banner-bestanden komen uit de source-repo (`public/consent/`, niet in git). Die repo is de enige bron van waarheid; hier staat geen eigen banner-CSS of -markup.

```bash
npm install
npm run sync   # haalt custom.css, classes.css, component.html, clipboard.json, head.snippet.html op (draait ook in prebuild)
npm run dev    # http://localhost:3000
npm test       # vitest: mapping
npm run test:e2e   # playwright (mockt /api/extract)
```

Deploy: Vercel, geen env-vars nodig. `prebuild` draait `sync`, dus elke deploy pakt de laatste versie van de source-bestanden; het versienummer in de footer-code komt van de laatste GitHub-tag (fallback `1.0.0`).

Deelbare state: alle gekozen waarden staan in de querystring (`?url=…&cb-color-accent=%23…&t0=…&key=…`).

Bestanden: `lib/extract.ts` (fetch + css-tree, server), `lib/mapping.ts` (mapping, contrast, custom.css-rendering), `app/configurator.tsx` (UI; de variabelen-editor is een inline [DialKit](https://dialkit.dev)-panel), `app/api/extract/route.ts`.
