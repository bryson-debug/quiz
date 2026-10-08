# Your Elementary Music Success Scorecard

A digital version of TEN's printed **Elementary Music Success Scorecard** (the Pillars of General
Music Success quiz). Teachers rate 25 statements, see a radar chart of their five pillar scores, and
learn their **Growth Pillar** and **Foundation Pillar**. The results page recommends EDGE trainings and
offers a PDF download.

- Static site (HTML/CSS/vanilla JS). No framework, build step or backend.
- No personal data is stored on our side. Name and email are collected only by the embedded Flodesk form.
- **All content and IDs live in [`public/js/config.js`](public/js/config.js).** See [`CLAUDE.md`](CLAUDE.md) for every rule and decision.

## Run locally

```bash
npm start          # serves public/ at http://localhost:3000 (uses npx serve)
npm test           # scoring unit tests (Node 18+)
npm run screenshots  # headless full-flow check at phone/tablet/desktop widths → screenshots/
```

Any static server works (`python3 -m http.server -d public 3000`). Open the site over http, not
`file://`, because it uses ES modules. `npm run screenshots` needs Playwright (`npm i -D playwright`, or
a global install).

## Deploy (Vercel)

1. Import this GitHub repo in Vercel. Framework preset: **Other**. No build command. `vercel.json`
   sets the output directory to `public`.
2. Pushing to `main` deploys production. Other branches get preview URLs.
3. Add the domain **`audit.thatmusicteacher.com`** in Vercel → Project → Settings → Domains.
4. In **Squarespace → Domains → thatmusicteacher.com → DNS Settings**, add:

   | Type | Host | Data |
   |---|---|---|
   | CNAME | `audit` | `cname.vercel-dns.com` |

   If Vercel shows a different, project-specific CNAME target when you add the domain, use that one.
   Wait for Vercel to show the domain as **Valid**. It issues HTTPS automatically.
5. In **Squarespace → Settings → Developer Tools → URL Mappings**, add:

   ```
   /audit -> https://audit.thatmusicteacher.com 301
   ```

## Editing content

Everything is in `public/js/config.js`:
- `flodesk.forms`: one Flodesk form ID per growth pillar
- `tracking`: `META_PIXEL_ID`, `GA4_MEASUREMENT_ID`, `CLARITY_PROJECT_ID`. Leave the `PLACEHOLDER…` value to keep a tracker off.
- `pillars[].foundationCopy`, `growthCopy`, `trainings`: results and PDF copy
- `copy.*`: screen text, footer, cookie bar, PDF text
- `links`: EDGE URL + UTM parameters, legal links

Replace `public/assets/ten-logo-black.svg`, `og-image.png` (1200×630), `favicon.svg`, `favicon.png`
(32×32) and `apple-touch-icon.png` (180×180), keeping the same filenames.

## Launch checklist

- [x] Replace the 4 placeholder Flodesk form IDs
- [ ] Each Flodesk form adds subscribers to the correct pillar segment, with consent wording set in Flodesk's form settings
- [ ] 5 Flodesk segments and 5 pillar workflows are built
- [ ] Real TEN black logo, OG image and favicon added
- [ ] Placeholder pillar copy and recommended trainings replaced in config
- [ ] Meta Pixel, GA4 and Clarity IDs added; Clarity masking set to Strict
- [ ] Privacy policy at thatmusicteacher.com/privacy updated to name Meta Pixel and Microsoft Clarity (including session recording and heatmaps)
- [x] CNAME added in Squarespace DNS and domain verified in Vercel
- [x] Squarespace URL Mapping `/audit -> https://audit.thatmusicteacher.com 301` added
- [ ] Submitted a real test through the Flodesk form, confirmed the subscriber landed in the right segment, and confirmed the Lead event fired (Meta Events Manager test events)
- [ ] Tested with an ad blocker on, to confirm the "Show my results" fallback works
- [ ] Took the full quiz on a real iPhone, a real Android phone, an iPad or tablet, and a desktop browser, including the PDF download on each

## Third-party files

- `public/vendor/jspdf.umd.min.js`: jsPDF 4.2.1 (MIT)
- `public/fonts/ArchivoBlack-Regular.ttf`: Archivo Black (SIL Open Font License 1.1)
- `public/fonts/inter-*.woff2`: Inter 4 via Fontsource 5.3.0, Latin + Latin Extended, weights 400–700 (SIL Open Font License 1.1, `public/fonts/Inter-OFL.txt`)
