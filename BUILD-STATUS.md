# Elementary Music Success Scorecard: Build Status

_Last updated: October 8, 2026 (after the privacy/QA audit fixes)_

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
- **If the form loads after that fallback appears,** the fallback hides again and its button stops working.
- **A missing form ID** shows the fallback with a console error. It never uses another pillar's form.
- **Flodesk loads only at the email gate,** not on page load, so Flodesk only sees people who reach it.
- **Status:** live QA on October 6 confirmed each pillar's form is used and results appear after submitting.

### Design
- **Colors:** mint `#CDEAE7`, near-black `#1C2120` and white.
- **Fonts:** headings use Arial Black, or the self-hosted Archivo Black on devices without it. Body text is Inter, also self-hosted. Google Fonts has been removed.
- **Screen sizes:** mobile-first. Checked at 360, 390, 768, 1024, 1280 and 1440px plus landscape, with no horizontal scrolling. Rating buttons span the full width of each question.
- **Accessibility:** keyboard-navigable rating buttons, focus moved to each new screen, screen-reader announcements, and reduced-motion support.
- **Phones:** Next and Back stick to the bottom of the screen and never sit under the cookie bar.

### Privacy
- **No backend or database.** Scoring runs in the visitor's browser, and nothing is stored on a server.
- **Stored in the visitor's browser (`localStorage`):**
  - quiz state under `ten-scorecard-v1` (individual answers, current screen, gate unlock), kept about 6 months so progress survives closed tabs
  - the cookie-bar dismissal under `ten-cookie-notice-dismissed`

  No name or email is stored.
- **Name and email are collected only by Flodesk.**
- **The PDF name field** is prefilled from the email form in memory only. It's never stored or sent.
- **Trackers** never receive names, emails, individual answers or scores. Meta and GA4 receive the **growth pillar name** on the Lead and EDGE-click events, plus quiz-progress events (pillar name and step).
- **Meta pixel automatic configuration is off** in code. *Automatic Advanced Matching* must also be turned off in Meta Events Manager.
- **Clarity masking** covers the whole quiz: every screen, the ratings, scores and results, plus the email gate and the PDF name field.
- **Who sees visitors:**
  - Meta, Google Analytics and Microsoft Clarity: every page view, once their IDs are set
  - Flodesk: only from the email gate onward
  - Google Fonts: no longer used

### Security
- **Headers on every page:** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy` and `Permissions-Policy`.
- **Content-Security-Policy in report-only mode.** It doesn't block anything yet; violations only show in the browser console. See CLAUDE.md for the full policy.
- **`ten-pillar-quiz.vercel.app` redirects** to `audit.thatmusicteacher.com`, so there's no second public copy.

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

### Privacy/QA audit fixes (October 8, PR, one commit each)
1. The EDGE link uses `/edge` (`/EDGE` returned a 404), including the PDF footer.
2. The gate fallback hides once the form renders.
3. Clarity masks the whole quiz.
4. Meta pixel `autoConfig` is turned off.
5. Added `X-Frame-Options` and a report-only CSP. The Flodesk snippet moved out of the page into its own file.
6. Inter is self-hosted, and Google Fonts is gone.
7. A missing form ID fails loudly, with no wrong-pillar fallback.
8. Flodesk loads only at the gate.
9. The duplicate `ten-pillar-quiz.vercel.app` domain redirects to the real one.
10. These docs were updated.

### QA round 1 fixes (October 6)
- All-equal scores no longer list "also worth your attention" pillars, and a note explains tie-break picks.
- PDF prints any name correctly (Łukasz, 山田, etc.).
- About page now mentions the email step, and the "nobody sees your responses" line is gone.
- Tapping Next early says what's missing and jumps to it. Phones show "X of 5 answered" in the sticky bar.
- Slimmer cookie bar on phones and an opaque nav bar.
- Browser and phone Back move one quiz screen. Progress and results survive closed tabs and return visits.
- The PDF name is prefilled from the email form, with an 80-character counter.
- Growth and Foundation definitions appear under the scores.
- Retake asks before clearing.
- The EDGE button and logo open in a new tab.
- Radar scale numbers no longer overlap data points.
- The progress bar fills as you answer.
- The last pillar's button says "See My Results".
- Defensive styling for the embedded Flodesk form: hides the duplicate heading, stacks the fields full-width, keeps the fine print at 13px or more and uses the brand body font.

---

## Launch checklist

- [x] Real Flodesk form IDs for all 5 pillars
- [x] Vercel project created and deploying from GitHub
- [x] `audit.thatmusicteacher.com` added in Vercel, plus the Squarespace CNAME (verified on phone; computer needed a DNS cache refresh)
- [x] Squarespace URL Mapping `/audit -> https://audit.thatmusicteacher.com 301` (confirmed)
- [x] 5 QUIZ segments exist in Flodesk
- [ ] **Each form's settings checked:** correct segment only, double opt-in off, "show success message" (not redirect), consent text added (Step 3)
- [x] **Live end-to-end test** of all 5 pillars plus the tie case (QA round 1, October 6; issues fixed)
- [ ] **Delete the 8 `bryson+quiz-` test subscribers** in Flodesk (bulk archive isn't enabled for the account's Flodesk connection)
- [ ] **5 pillar workflows** built in Flodesk and triggered by the QUIZ segments (none exist yet; Step 4)
- [ ] **Meta Pixel ID** added
- [ ] **GA4 Measurement ID** added
- [ ] **Microsoft Clarity ID** added, with masking set to **Strict** in the Clarity dashboard
- [ ] **Meta Events Manager:** Automatic Advanced Matching turned **off** for the pixel
- [ ] **Switch the CSP from report-only to enforced** after checking the live console with tracker IDs set and the real Flodesk form loaded
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
