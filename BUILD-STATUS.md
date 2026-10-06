# Elementary Music Success Scorecard: Build Status

_Last updated: October 6, 2026_

## At a glance

| | |
|---|---|
| **Live site** | https://audit.thatmusicteacher.com |
| **Short link** | https://thatmusicteacher.com/audit (301 redirect to the live site) |
| **Vercel project** | `ten-pillar-quiz` (team: bryson-2285's projects) |
| **GitHub repo** | `bryson-debug/quiz`, branch `claude/music-success-scorecard-8qdf92` (Vercel's production branch) |
| **Deploys** | Automatic: every push to that branch goes live in a few seconds |
| **Overall** | Built, deployed and on the real domain. Live testing is next. Copy, trainings, logo and tracking IDs are still placeholders. |

---

## What's built

### User flow
1. **Intro.** Logo, "Your Elementary Music Success Scorecard" and the approved intro copy, with a **Start My Scorecard** button.
2. **Before you begin.** Explains the Pillars framework and the five pillars, then **how it works** (3 steps), with Back and **Let's Begin** buttons.
3. **Five pillar pages,** one per pillar in framework order, each with 5 statements rated 1–5. A progress bar shows "Pillar X of 5". **Next** stays disabled until all 5 are answered, **Back** keeps answers, and a refresh doesn't lose progress.
4. **Email gate.** "Your results are ready." The Flodesk form for the person's **growth pillar** is embedded here.
5. **Results.** These sections appear in order:
   - Growth Pillar headline
   - Radar chart with all 5 scores
   - Foundation Pillar card
   - Growth plan card with 3 recommended trainings and any "also worth your attention" pillars
   - "The support you need" section with the **Join Elementary Music EDGE®** button
   - Optional name field and **Download My Scorecard** (PDF)
   - **Retake the Scorecard**

### Scoring (unit-tested, 11 tests passing)
- **Pillar score:** the sum of its 5 ratings, from 5 to 25.
- **Growth Pillar:** the lowest score. Ties go to the earliest pillar in framework order. Other pillars tied for lowest appear as "also worth your attention."
- **Foundation Pillar:** the highest score, excluding the growth pillar, with the same tie-break.
- **All five equal:** growth is Expectations & Procedures and foundation is Approaches & Pedagogy.

**Framework order:** Expectations & Procedures → Approaches & Pedagogy → Inclusion & Differentiation → Curriculum & Planning → Teacher Fulfillment.

### Flodesk (all 5 forms connected)
| Growth pillar | Form ID | Segment (exists in Flodesk) |
|---|---|---|
| Expectations & Procedures | `6abffc0d14eff99404fef9c4` | QUIZ/EXPECTATIONS |
| Approaches & Pedagogy | `6ac3b7a4d3fb39ccdb8a7da1` | QUIZ/APPROACHES |
| Inclusion & Differentiation | `6ac3b801147b36f92f884771` | QUIZ/INCLUSION |
| Curriculum & Planning | `6ac3b81e147b36f92f884773` | QUIZ/CURRICULUM |
| Teacher Fulfillment | `6ac3b8379c6b79a7586772e7` | QUIZ/FULFILLMENT |

- **After submission:** results appear when Flodesk shows its success state. If it doesn't, they appear about 1.5 seconds after a valid submit.
- **If the form is blocked** (for example by an ad blocker), a "Show my results" button appears after 6 seconds, so nobody gets stuck.
- **Status:** only tested against a simulated form so far. The real-form test is pending (see "Next steps").

### Design
- **Colors:** mint `#CDEAE7`, near-black `#1C2120` and white.
- **Fonts:** headings use Arial Black, or the self-hosted Archivo Black on devices without it. Body text is Inter.
- **Screen sizes:** mobile-first. Checked at 360, 390, 768, 1024, 1280 and 1440px plus landscape, with no horizontal scrolling. Rating buttons span the full width of each question.
- **Accessibility:** keyboard-navigable rating buttons, focus moved to each new screen, screen-reader announcements, and reduced-motion support.
- **Phones:** Next and Back stick to the bottom of the screen and never sit under the cookie bar.

### Privacy
- **No backend or database.** Scoring runs in the visitor's browser.
- **Name and email are collected only by Flodesk.**
- **The PDF name field is never stored or sent.**
- **Trackers never receive names, emails or individual answers.**
- **Clarity masking** is set on the email gate and the PDF name field.

### Other
- **PDF scorecard:** generated in the browser on one letter-size page, with the TEN logo, scores, radar chart, foundation and growth pillars, growth plan, trainings and a footer.
- **Cookie notice bar:** shown on the first visit and remembered once dismissed.
- **Footer:** copyright, the EDGE® trademark line, and Privacy, Terms, Disclaimer and Contact links, which open in new tabs.
- **Meta and social tags:** page title, description, and Open Graph and Twitter tags (OG image is a placeholder).

### Changes made after the first build (at your request)
- Removed the two footer notes ("answers stay on your device" and "self-reflection tool").
- Removed the hint text under the PDF name field.
- Added the "Before you begin" page.
- Rating buttons now span the full width of the question text.
- Connected the 4 remaining Flodesk forms.

---

## Launch checklist

- [x] Real Flodesk form IDs for all 5 pillars
- [x] Vercel project created and deploying from GitHub
- [x] `audit.thatmusicteacher.com` added in Vercel, plus the Squarespace CNAME (verified on phone; computer needed a DNS cache refresh)
- [x] Squarespace URL Mapping `/audit -> https://audit.thatmusicteacher.com 301` (confirmed)
- [x] 5 QUIZ segments exist in Flodesk
- [ ] **Each form's settings checked:** correct segment only, double opt-in off, "show success message" (not redirect), consent text added (Step 3)
- [ ] **Live end-to-end test** of all 5 pillars plus the tie case (Claude for Chrome brief prepared)
- [ ] **5 pillar workflows** built in Flodesk and triggered by the QUIZ segments (none exist yet; Step 4)
- [ ] **Meta Pixel ID** added
- [ ] **GA4 Measurement ID** added
- [ ] **Microsoft Clarity ID** added, with masking set to **Strict** in the Clarity dashboard
- [ ] **Real logo, OG image and favicon** added
- [ ] **Real copy** for each pillar's foundation and growth text replaced in `public/js/config.js`
- [ ] **15 real recommended trainings** (3 per pillar: title, clinician, one-line description)
- [ ] **Privacy policy updated** to name Flodesk, Meta Pixel, Google Analytics and Microsoft Clarity (session recording and heatmaps)
- [ ] **Tested with an ad blocker on,** to confirm the "Show my results" fallback
- [ ] **Full quiz plus PDF download** on a real iPhone, Android phone, iPad or tablet, and desktop
- [ ] **(Optional) Create a `main` branch** and switch Vercel's production branch to it

---

## Still placeholders (all in `public/js/config.js` unless noted)

| Item | Where |
|---|---|
| Meta Pixel, GA4 and Clarity IDs | `tracking` (trackers stay off until set) |
| Foundation and growth copy for all 5 pillars | `pillars[].foundationCopy` / `growthCopy` |
| 3 recommended trainings per pillar (15 total) | `pillars[].trainings` |
| TEN logo | `public/assets/ten-logo-black.svg` |
| OG share image (1200×630) | `public/assets/og-image.png` |
| Favicons | `public/assets/favicon.svg`, `favicon.png`, `apple-touch-icon.png` |

---

## Next steps (in order)
1. **Step 3:** In Flodesk, check each quiz form's settings (segment, double opt-in off, success message, consent text).
2. **Live test:** run the Claude for Chrome test brief, then have Claude check that each test subscriber landed in the right QUIZ segment.
3. **Step 4:** Build the 5 pillar workflows in Flodesk.
4. **Steps 5–7:** Create Meta Pixel, GA4 and Clarity, and send the IDs to add.
5. **Content:** send the real pillar copy, the 15 trainings, and the logo, OG image and favicon files.
6. **Final launch checks:** privacy policy update, ad-blocker test, and real-device testing.

---

## Open decisions and notes
- **"Guarantee" wording.** The About page says "get out the door on time" instead of "guarantee you leave work on time," to avoid making a promise you could be held to. You can change it back.
- **"About five minutes"** on the About page is an estimate.
- **Retake clears everything,** including the email gate. People re-submit the form, so they land in the new segment if their growth pillar changes.
- **EU consent.** Requiring an email before showing results isn't airtight under GDPR for EU visitors. An optional consent checkbox in Flodesk would reduce the risk.
- **PDF body font** is Helvetica, and it could embed Inter to match the site. Headings already use Archivo Black.

## Where things live
- `public/js/config.js`: all copy, IDs, trainings and links (edit content here)
- `CLAUDE.md`: every rule and decision, for future Claude sessions
- `README.md`: how to run locally, deploy steps and the launch checklist
- `npm test` runs the scoring tests, and `npm run screenshots` runs the full-flow check at all screen sizes
