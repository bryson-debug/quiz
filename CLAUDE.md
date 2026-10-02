# Elementary Music Success Scorecard (TEN Pillar Quiz)

Digital version of TEN's printed "Your Elementary Music Success Scorecard". Teachers rate 25
statements (5 pillars × 5), see a radar chart, and learn their **Growth Pillar** (lowest) and
**Foundation Pillar** (highest). It's a lead funnel into Elementary Music EDGE®.

## Stack and layout

- Static site, **no build step**: plain HTML/CSS/vanilla JS (ES modules). Deployed by Vercel from `public/`.
- `public/js/config.js` holds **all editable content and IDs** (copy, pillar text, trainings, Flodesk
  form IDs, tracking IDs, URLs). Content changes go there, never in logic files.
- `public/js/scoring.js`: pure scoring (unit-tested in `tests/scoring.test.js`, run `npm test`).
- `public/js/radar.js`: radar geometry + inline SVG (shared geometry with the PDF).
- `public/js/gate.js`: Flodesk embed + submission detection.
- `public/js/pdf.js`: in-browser PDF via vendored jsPDF (`public/vendor/jspdf.umd.min.js`, MIT, v4.2.1),
  lazy-loaded on the results screen.
- `public/js/tracking.js`: Meta Pixel / GA4 / Clarity. `public/js/app.js`: screens and flow.
- `scripts/screenshots.mjs`: headless full-flow check + screenshots (`npm run screenshots`).

## Flow

Intro → 5 pillar screens (one per pillar, framework order) → email gate (Flodesk) → results.
Next is disabled until all 5 statements on a screen are answered; Back keeps answers. No totals
are shown during the quiz. Answers are mirrored to `sessionStorage` (`ten-scorecard-v1`) so a refresh
keeps progress; Retake clears it (including the gate unlock, so the gate shows again).
All storage calls are wrapped in try/catch.

## Pillars (framework order = tie-break order)

| # | Name | Slug |
|---|---|---|
| 1 | Expectations & Procedures | `expectations-procedures` |
| 2 | Approaches & Pedagogy | `approaches-pedagogy` |
| 3 | Inclusion & Differentiation | `inclusion-differentiation` |
| 4 | Curriculum & Planning | `curriculum-planning` |
| 5 | Teacher Fulfillment | `teacher-fulfillment` |

Statement wording and pillar descriptions are approved copy. Don't edit them without being asked.

## Scoring rules

- Pillar score = sum of its 5 ratings (1–5 each), range 5–25.
- **Growth** = lowest score. Ties → earliest pillar in framework order.
- Other pillars tied for lowest → "Also worth your attention" (shown in the growth card and PDF).
  The foundation pillar is never listed there (it can only tie for lowest when all five are equal).
- **Foundation** = highest score **excluding the growth pillar**. Ties → framework order.
- All five equal → growth = Expectations & Procedures, foundation = Approaches & Pedagogy.

## Privacy model

- The quiz stores **no personal data** on our side: no backend, database or API keys. Scoring runs in the browser.
- Name + email are collected **only inside the embedded Flodesk form**; Flodesk stores them.
- The optional "Name to print on your scorecard" field is used only inside the PDF, never stored or sent.
- **Never send names, emails or individual answers to any tracker.** Only pillar names, steps, scores.
- Gate section and the PDF-name section carry `data-clarity-mask="true"`. Clarity masking should be **Strict**.

## Flodesk

- Universal script loads once in `<head>` (index.html). The form is initialized only when the gate
  screen renders: container `<div id="fd-form-{formId}">` + `window.fd('form', { formId, containerEl })`.
- One form per **growth pillar**; each adds the subscriber to that pillar's segment → pillar workflow.

| Growth pillar | Form ID |
|---|---|
| Expectations & Procedures | `6abffc0d14eff99404fef9c4` (real) |
| Approaches & Pedagogy | `PLACEHOLDER_APPROACHES_PEDAGOGY` |
| Inclusion & Differentiation | `PLACEHOLDER_INCLUSION_DIFFERENTIATION` |
| Curriculum & Planning | `PLACEHOLDER_CURRICULUM_PLANNING` |
| Teacher Fulfillment | `PLACEHOLDER_TEACHER_FULFILLMENT` |

While an ID is a placeholder, the Expectations & Procedures form is used and a console warning is logged.

Submission detection (`gate.js`):
1. MutationObserver on the container: `[data-ff-stage="success"]` reveals results immediately. Looser
   matches (`[data-ff-el="success"]`, visible `[class*="success"]`) count only after a submit.
2. Capture-phase `submit` listener: if the form is valid and no success state appears within
   `submitFallbackMs` (1.5s), reveal anyway unless a visible error (`data-ff-stage="error"`, `aria-invalid`) shows.
3. If no form has rendered after `renderTimeoutMs` (6s), e.g. an ad blocker on assets.flodesk.com,
   show a message + "Show my results". This path does **not** fire the Lead event.
The Flodesk DOM selectors were verified against a simulated form only (assets.flodesk.com was blocked
from the build sandbox). Verify against the live form; adjust `SUCCESS_SELECTORS` in gate.js if needed.

## Tracking (IDs in config; a placeholder ID means that tracker is not loaded)

| Moment | Meta Pixel | GA4 |
|---|---|---|
| Page load | `PageView` | page_view (automatic) |
| Start clicked | custom `QuizStarted` | `quiz_start` |
| Each pillar screen completed | custom `PillarCompleted` {pillar} | `pillar_complete` {pillar, step} |
| Last question screen completed | custom `QuizCompleted` | `quiz_complete` |
| Flodesk form submitted | standard `Lead` {content_name: growth pillar} | `generate_lead` {growth_pillar} |
| Join EDGE clicked | custom `EdgeCTAClick` {growth_pillar} | `edge_cta_click` {growth_pillar} |
| PDF downloaded | custom `ScorecardDownloaded` | `scorecard_download` |

Clarity: standard snippet. Trackers load on page load. The cookie bar is a notice, not a consent gate
(dismissal stored in `localStorage` key `ten-cookie-notice-dismissed`).

## Links

- EDGE CTA: `https://www.thatmusicteacher.com/EDGE?utm_source=pillar-quiz&utm_medium=quiz&utm_campaign=scorecard&utm_content={growth-slug}`
- Privacy /privacy, Terms /tou, Disclaimer /disclaimer on thatmusicteacher.com; Contact mailto:hello@thatmusicteacher.com.
- Footer links always open in a new tab (so progress is never lost).
- Header logo is not a link during the quiz; on results it links to https://tarbeteducationnetwork.com.

## Brand

- Mint `#CDEAE7`: panels, circles, accent blocks only. **Never text or thin lines on white.**
- Near-black `#1C2120`: text, headlines, buttons. White background. Secondary grey `#586260`.
- Headings: uppercase, `"Arial Black", "Archivo Black"`. Archivo Black is **self-hosted**
  (`public/fonts/`, SIL OFL) so phones without Arial Black still get a heavy heading; use
  `font-weight: 400` (no faux bold). Body: Inter from Google Fonts. The PDF embeds Archivo Black.
- Calm and spacious, mint blocks and soft circles as decoration (`.decor`, tablet and up). No bright accents.
- Placeholders: `public/assets/ten-logo-black.svg`, `og-image.png`, `favicon.svg/png`, `apple-touch-icon.png`.

## Responsive and accessibility rules

- Mobile-first; 16px gutter; no horizontal scroll. Question column ~720px, results ~1040px.
  Results: chart + score list side by side from 1000px.
- Rating buttons are native radios styled as 44px+ targets; 5 on one row at 360px; hover only under
  `(hover: hover)`. Next/Back are sticky at the bottom on phones and offset by `--cookie-h` so the cookie
  bar never covers them. Safe-area insets respected; `100dvh` used.
- Radar uses a compact layout (one-word labels) under 600px.
- Focus moves to the screen heading on every screen change; a polite live region announces progress.
  `prefers-reduced-motion` disables transitions.

## Domain

- Production: `audit.thatmusicteacher.com` (Vercel). Root domain is on Squarespace.
- Squarespace DNS: CNAME `audit` → `cname.vercel-dns.com` (use the exact target Vercel shows when the domain is added).
- Squarespace URL Mapping: `/audit -> https://audit.thatmusicteacher.com 301`.

## Checks before pushing

`npm test` (scoring) and `npm run screenshots` (full flow at 360/390/768/1024/1280/1440 + landscape;
reports overflow, wrapping rating rows, small touch targets, off-screen radar labels, page errors; saves the PDF).
