// Quiz flow: intro -> about -> 5 pillar screens -> email gate -> results.
// Answers live in memory, mirrored to localStorage on this device (no personal data),
// and each screen gets a browser-history entry so Back/forward move through the quiz.

import { CONFIG } from './config.js';
import { computeResults, isPillarComplete, STATEMENTS_PER_PILLAR } from './scoring.js';
import { radarSvg } from './radar.js';
import { initTracking, track } from './tracking.js';
import { mountGateForm } from './gate.js';
import { preparePdf, downloadScorecardPdf } from './pdf.js';

const PILLARS = CONFIG.pillars;
const ORDER = PILLARS.map((p) => p.slug);
const BY_SLUG = Object.fromEntries(PILLARS.map((p) => [p.slug, p]));
const STORAGE_KEY = 'ten-scorecard-v1';
const STORAGE_MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000; // forget saved progress after ~6 months
const NAME_MAX = 80;
const COOKIE_KEY = 'ten-cookie-notice-dismissed';
const COMPACT_CHART_MQ = window.matchMedia('(max-width: 599px)');

const $main = document.getElementById('main');
const $status = document.getElementById('sr-status');
const year = new Date().getFullYear();

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const emptyAnswers = () => Object.fromEntries(ORDER.map((slug) => [slug, Array(STATEMENTS_PER_PILLAR).fill(null)]));

let state = { screen: 'intro', step: 0, answers: emptyAnswers(), unlocked: false };
let gateCleanup = null;
// First name typed into the Flodesk form, kept in memory only to prefill the PDF name field.
let gateFirstName = '';

function readSaved() {
  // localStorage survives closed tabs and later visits; fall back to an older sessionStorage copy.
  for (const store of ['localStorage', 'sessionStorage']) {
    try {
      const raw = window[store].getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked or corrupt */ }
  }
  return null;
}

function loadState() {
  try {
    const saved = readSaved();
    if (!saved || typeof saved !== 'object') return;
    if (saved.savedAt && Date.now() - saved.savedAt > STORAGE_MAX_AGE_MS) { clearState(); return; }
    const answers = emptyAnswers();
    for (const slug of ORDER) {
      const arr = saved.answers && saved.answers[slug];
      if (Array.isArray(arr)) {
        for (let i = 0; i < STATEMENTS_PER_PILLAR; i += 1) {
          const v = arr[i];
          answers[slug][i] = Number.isInteger(v) && v >= 1 && v <= 5 ? v : null;
        }
      }
    }
    const screen = ['intro', 'about', 'question', 'gate', 'results'].includes(saved.screen) ? saved.screen : 'intro';
    const step = Math.min(Math.max(Number(saved.step) || 0, 0), ORDER.length - 1);
    state = { screen, step, answers, unlocked: Boolean(saved.unlocked) };
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
}

function saveState() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch (e) { /* storage blocked: progress just won't survive a reload */ }
}

function clearState() {
  for (const store of ['localStorage', 'sessionStorage']) {
    try { window[store].removeItem(STORAGE_KEY); } catch (e) { /* storage blocked */ }
  }
  state = { screen: 'intro', step: 0, answers: emptyAnswers(), unlocked: false };
  gateFirstName = '';
}

/** Adjust a requested screen so nobody lands somewhere they haven't earned yet. */
function allowedScreen(screen, step) {
  const complete = ORDER.every((s) => isPillarComplete(state.answers, s));
  if ((screen === 'gate' || screen === 'results') && !complete) {
    const firstIncomplete = ORDER.findIndex((s) => !isPillarComplete(state.answers, s));
    return { screen: 'question', step: Math.max(firstIncomplete, 0) };
  }
  if (screen === 'results' && !state.unlocked) return { screen: 'gate', step };
  if (screen === 'gate' && state.unlocked) return { screen: 'results', step };
  return { screen, step };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const esc = (str) => String(str).replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function announce(text) {
  $status.textContent = '';
  // Let screen readers notice the change.
  window.setTimeout(() => { $status.textContent = text; }, 60);
}

function edgeUrl(growthSlug) {
  const url = new URL(CONFIG.links.edgeBase);
  Object.entries(CONFIG.links.edgeUtm).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('utm_content', growthSlug);
  return url.toString();
}

function results() {
  return computeResults(state.answers, ORDER);
}

// ---------------------------------------------------------------------------
// Chrome: logo, footer, cookie bar
// ---------------------------------------------------------------------------
function renderLogo() {
  const slot = document.getElementById('logo-slot');
  const img = `<img src="${esc(CONFIG.site.logoSrc)}" alt="${esc(CONFIG.site.logoAlt)}" width="120" height="34">`;
  // Not a link during the quiz; on results it links to the TEN site in a new tab (keeps results open).
  slot.innerHTML = state.screen === 'results'
    ? `<a class="logo" href="${esc(CONFIG.site.brandUrl)}" target="_blank" rel="noopener">${img}</a>`
    : `<span class="logo">${img}</span>`;
}

function renderFooter() {
  const f = CONFIG.copy.footer;
  const L = CONFIG.links;
  // Links open in a new tab so nobody loses their progress.
  const link = (href, text) => `<a href="${esc(href)}"${href.startsWith('mailto:') ? '' : ' target="_blank" rel="noopener"'}>${esc(text)}</a>`;
  document.getElementById('site-footer').innerHTML = `
    <div class="site-footer__inner">
      <p>${esc(f.copyright.replace('{year}', year))}</p>
      <p>${esc(f.trademark)}</p>
      <nav aria-label="Legal">
        ${link(L.privacy, 'Privacy Policy')}<span aria-hidden="true">|</span>
        ${link(L.terms, 'Terms of Use')}<span aria-hidden="true">|</span>
        ${link(L.disclaimer, 'Disclaimer')}<span aria-hidden="true">|</span>
        ${link(L.contact, 'Contact')}
      </nav>
    </div>`;
}

function setupCookieBar() {
  let dismissed = false;
  try { dismissed = window.localStorage.getItem(COOKIE_KEY) === '1'; } catch (e) { /* storage blocked */ }
  if (dismissed) return;

  const c = CONFIG.copy.cookie;
  const bar = document.getElementById('cookie-bar');
  bar.innerHTML = `
    <div class="cookie-bar__inner">
      <p>${esc(c.text)} <a href="${esc(CONFIG.links.privacy)}" target="_blank" rel="noopener">${esc(c.linkText)}</a></p>
      <button type="button" class="btn">${esc(c.button)}</button>
    </div>`;
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Cookie notice');
  bar.hidden = false;
  document.body.classList.add('has-cookie-bar');

  // Reserve space so the bar never covers Next/Back or the footer.
  const setHeight = () => document.documentElement.style.setProperty('--cookie-h', `${bar.offsetHeight}px`);
  setHeight();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(setHeight) : null;
  if (ro) ro.observe(bar); else window.addEventListener('resize', setHeight);

  bar.querySelector('button').addEventListener('click', () => {
    try { window.localStorage.setItem(COOKIE_KEY, '1'); } catch (e) { /* storage blocked */ }
    if (ro) ro.disconnect();
    bar.hidden = true;
    document.body.classList.remove('has-cookie-bar');
    document.documentElement.style.setProperty('--cookie-h', '0px');
  });
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------
function introHtml() {
  const c = CONFIG.copy.intro;
  return `
    <section class="screen screen--intro intro" aria-labelledby="screen-heading">
      <img class="intro__logo" src="${esc(CONFIG.site.logoSrc)}" alt="${esc(CONFIG.site.logoAlt)}" width="220" height="62">
      <h1 id="screen-heading" class="intro__title" tabindex="-1">${esc(c.heading)}</h1>
      <div class="intro__panel"><p>${esc(c.body)}</p></div>
      <button type="button" class="btn" data-action="start">${esc(c.button)}</button>
    </section>`;
}

function aboutHtml() {
  const c = CONFIG.copy.about;
  const paras = c.paragraphs.map((t) => `<p>${esc(t)}</p>`).join('');
  const pillars = PILLARS.map((p) => `<li>${esc(p.name)}</li>`).join('');
  const steps = c.steps.map((t) => `<li>${esc(t)}</li>`).join('');
  return `
    <section class="screen screen--about" aria-labelledby="screen-heading">
      <p class="eyebrow">${esc(c.eyebrow)}</p>
      <h1 id="screen-heading" class="pillar-title" tabindex="-1">${esc(c.heading)}</h1>
      <div class="about__copy">${paras}</div>
      <div class="about__grid">
        <div class="about__panel">
          <h2>${esc(c.pillarsHeading)}</h2>
          <ol class="about__pillars">${pillars}</ol>
        </div>
        <div class="about__panel about__panel--outline">
          <h2>${esc(c.howHeading)}</h2>
          <ol class="about__steps">${steps}</ol>
        </div>
      </div>
      <div class="quiz-nav">
        <button type="button" class="btn btn--ghost" data-action="back">Back</button>
        <button type="button" class="btn" data-action="begin">${esc(c.button)}</button>
      </div>
    </section>`;
}

function questionHtml(step) {
  const p = PILLARS[step];
  const answers = state.answers[p.slug];
  const { low, high } = CONFIG.copy.scale;
  const answered = answers.filter((a) => a !== null).length;
  const complete = answered === STATEMENTS_PER_PILLAR;
  const q = CONFIG.copy.question;
  const isLast = step === PILLARS.length - 1;

  const statements = p.statements.map((text, i) => {
    const name = `${p.slug}-${i}`;
    const radios = [1, 2, 3, 4, 5].map((v) => {
      const id = `${name}-${v}`;
      const extra = v === 1 ? `, ${low}` : v === 5 ? `, ${high}` : '';
      return `<input type="radio" id="${id}" name="${name}" value="${v}" data-index="${i}"${answers[i] === v ? ' checked' : ''}>`
        + `<label for="${id}"><span aria-hidden="true">${v}</span><span class="visually-hidden">${v}${esc(extra)}</span></label>`;
    }).join('');
    return `
      <li>
        <fieldset class="statement" data-statement="${i}">
          <legend><span class="statement__num" aria-hidden="true">${i + 1}</span><span>${esc(text)}</span></legend>
          <div class="rating">${radios}</div>
          <div class="rating__ends" aria-hidden="true"><span>${esc(low)}</span><span>${esc(high)}</span></div>
        </fieldset>
      </li>`;
  }).join('');

  const pct = progressPct(step, answered);
  return `
    <section class="screen screen--question" aria-labelledby="screen-heading">
      <div class="progress">
        <p class="progress__label" id="progress-label">Pillar ${step + 1} of ${PILLARS.length}</p>
        <div class="progress__track" role="progressbar" aria-labelledby="progress-label" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}" aria-valuetext="Pillar ${step + 1} of ${PILLARS.length}, ${answered} of ${STATEMENTS_PER_PILLAR} answered">
          <div class="progress__fill" data-progress-fill style="width:${pct}%"></div>
        </div>
      </div>
      <h1 id="screen-heading" class="pillar-title" tabindex="-1">${esc(p.name)}</h1>
      <p class="pillar-desc">${esc(p.description)}</p>
      <p class="scale-hint">Rate each statement from <strong>1</strong> (${esc(low)}) to <strong>5</strong> (${esc(high)}).</p>
      <form class="statements-form" novalidate>
        <ol class="statements">${statements}</ol>
        <div class="quiz-nav">
          <p class="quiz-nav__status" data-count aria-live="polite">${answered} of ${STATEMENTS_PER_PILLAR} answered</p>
          <button type="button" class="btn btn--ghost" data-action="back">Back</button>
          <button type="submit" class="btn${complete ? '' : ' is-disabled'}" data-action="next" aria-disabled="${complete ? 'false' : 'true'}" aria-describedby="next-hint">${esc(isLast ? q.finish : q.next)}</button>
          <span id="next-hint" class="visually-hidden">${complete ? '' : esc(q.incomplete)}</span>
        </div>
      </form>
    </section>`;
}

function gateHtml() {
  const c = CONFIG.copy.gate;
  return `
    <section class="screen screen--gate" aria-labelledby="screen-heading" data-clarity-mask="true">
      <h1 id="screen-heading" class="pillar-title" tabindex="-1">${esc(c.heading)}</h1>
      <p class="lead">${esc(c.subtext)}</p>
      <div class="gate__panel">
        <p class="gate__loading" data-gate-loading>Loading the form…</p>
        <div class="gate__form" data-gate-form></div>
        <div class="gate__blocked" data-gate-blocked hidden>
          <p>${esc(c.blockedMessage)}</p>
          <button type="button" class="btn" data-action="skip-gate">${esc(c.blockedButton)}</button>
        </div>
      </div>
      <button type="button" class="link-btn" data-action="back">Back to the questions</button>
    </section>`;
}

function resultsHtml() {
  const r = results();
  const c = CONFIG.copy.results;
  const growth = BY_SLUG[r.growth];
  const foundation = BY_SLUG[r.foundation];

  const scoreItems = PILLARS.map((p) => {
    const score = r.scores[p.slug];
    const tag = p.slug === r.growth ? '<span class="tag">Growth</span>' : p.slug === r.foundation ? '<span class="tag">Foundation</span>' : '';
    return `
      <li>
        <div class="score-row"><span>${esc(p.name)}:${tag}</span><strong>${score}/25</strong></div>
        <div class="score-bar" aria-hidden="true"><span style="width:${(score / 25) * 100}%"></span></div>
      </li>`;
  }).join('');

  const trainings = growth.trainings.map((t) => `
    <li class="training">
      <p class="training__title">${esc(t.title)}</p>
      <p class="training__clinician">${esc(t.clinician)}</p>
      <p class="training__desc">${esc(t.description)}</p>
    </li>`).join('');

  const also = r.alsoAttention.length
    ? `<p class="also"><strong>${esc(c.alsoAttentionLabel)}</strong> ${r.alsoAttention.map((s) => esc(BY_SLUG[s].name)).join(', ')}</p>`
    : '';

  const tieNote = r.allEqual ? c.tieAllEqual : (r.growthTied || r.foundationTied) ? c.tieSome : '';

  return `
    <section class="screen screen--results" aria-labelledby="screen-heading">
      <header class="results-hero">
        <h1 id="screen-heading" tabindex="-1">Your Growth Pillar: <span class="pillar-name">${esc(growth.name)}</span></h1>
        <p class="lead">${esc(c.intro)}</p>
      </header>

      <div class="results-chart">
        <div class="chart-wrap" data-chart></div>
        <div class="score-list">
          <h2>${esc(c.scoresHeading)}</h2>
          <ul>${scoreItems}</ul>
          <dl class="score-legend">
            <div><dt><span class="tag">Growth</span></dt><dd>${esc(c.growthDefinition)}</dd></div>
            <div><dt><span class="tag">Foundation</span></dt><dd>${esc(c.foundationDefinition)}</dd></div>
          </dl>
          ${tieNote ? `<p class="tie-note">${esc(tieNote)}</p>` : ''}
        </div>
      </div>

      <div class="cards">
        <article class="card card--foundation" aria-labelledby="foundation-h">
          <h2 id="foundation-h">${esc(c.foundationHeadingPrefix)} <span class="pillar-name">${esc(foundation.name)}</span></h2>
          <p>${esc(foundation.foundationCopy)}</p>
        </article>
        <article class="card card--growth" aria-labelledby="growth-h">
          <h2 id="growth-h">${esc(c.growthHeadingPrefix)} <span class="pillar-name">${esc(growth.name)}</span></h2>
          <p>${esc(growth.growthCopy)}</p>
          ${also}
          <h3>${esc(c.trainingsHeading)}</h3>
          <ol class="trainings">${trainings}</ol>
        </article>
      </div>

      <section class="support" aria-labelledby="support-h">
        <h2 id="support-h">${esc(c.supportHeading)}</h2>
        <p>${esc(c.supportBody)}</p>
        <a class="btn" data-action="edge" href="${esc(edgeUrl(growth.slug))}" target="_blank" rel="noopener">${esc(c.supportButton)}<span class="visually-hidden"> (opens in a new tab)</span></a>
      </section>

      <section class="download" aria-labelledby="download-h" data-clarity-mask="true">
        <h2 id="download-h">${esc(c.downloadHeading)}</h2>
        <div class="field">
          <label for="print-name">${esc(c.nameFieldLabel)}</label>
          <input id="print-name" type="text" autocomplete="name" maxlength="${NAME_MAX}" value="${esc(gateFirstName.slice(0, NAME_MAX))}" aria-describedby="print-name-count">
          <small id="print-name-count" class="field__count" data-name-count>${gateFirstName.slice(0, NAME_MAX).length}/${NAME_MAX}</small>
        </div>
        <button type="button" class="btn" data-action="download">${esc(c.downloadButton)}</button>
        <p class="download-status" data-download-status role="status"></p>
      </section>

      <div class="retake" data-retake>
        <button type="button" class="link-btn" data-action="retake">${esc(c.retake)}</button>
        <div class="retake__confirm" data-retake-confirm hidden>
          <p>${esc(c.retakeConfirm)}</p>
          <button type="button" class="btn" data-action="retake-yes">${esc(c.retakeYes)}</button>
          <button type="button" class="btn btn--ghost" data-action="retake-no">${esc(c.retakeNo)}</button>
        </div>
      </div>
    </section>`;
}

// ---------------------------------------------------------------------------
// Rendering + behaviour
// ---------------------------------------------------------------------------
function renderChart() {
  const host = $main.querySelector('[data-chart]');
  if (!host) return;
  const r = results();
  const compact = COMPACT_CHART_MQ.matches;
  const axes = PILLARS.map((p) => ({ label: compact ? [p.shortLabel] : p.chartLabel, score: r.scores[p.slug] }));
  const summary = PILLARS.map((p) => `${p.name} ${r.scores[p.slug]} out of 25`).join(', ');
  host.innerHTML = radarSvg(axes, { compact, title: `Radar chart of your pillar scores: ${summary}.` });
}
COMPACT_CHART_MQ.addEventListener?.('change', renderChart);

/**
 * Move to a screen. `history`: 'push' adds a browser-history entry (normal navigation),
 * 'replace' swaps the current one (e.g. gate -> results, so Back skips the gate),
 * 'none' is used when responding to the browser's own Back/forward.
 */
function go(screen, step = state.step, { focus = true, history = 'push' } = {}) {
  if (gateCleanup) { gateCleanup(); gateCleanup = null; }
  ({ screen, step } = allowedScreen(screen, step));
  state.screen = screen;
  state.step = step;
  saveState();
  const entry = { quiz: { screen, step } };
  try {
    if (history === 'push') window.history.pushState(entry, '');
    else if (history === 'replace') window.history.replaceState(entry, '');
  } catch (e) { /* history unavailable (e.g. sandboxed iframe) */ }
  render({ focus });
}

window.addEventListener('popstate', (e) => {
  const target = e.state && e.state.quiz;
  if (!target) return;
  go(target.screen, target.step, { history: 'none' });
});

function progressPct(step, answered) {
  return Math.round(((step + answered / STATEMENTS_PER_PILLAR) / PILLARS.length) * 100);
}

function render({ focus = true } = {}) {
  document.body.dataset.screen = state.screen;
  renderLogo();

  if (state.screen === 'intro') $main.innerHTML = introHtml();
  else if (state.screen === 'about') $main.innerHTML = aboutHtml();
  else if (state.screen === 'question') $main.innerHTML = questionHtml(state.step);
  else if (state.screen === 'gate') $main.innerHTML = gateHtml();
  else $main.innerHTML = resultsHtml();

  if (state.screen === 'about') bindAbout();
  if (state.screen === 'question') bindQuestion();
  if (state.screen === 'gate') bindGate();
  if (state.screen === 'results') bindResults();

  if (focus) {
    window.scrollTo(0, 0);
    const heading = $main.querySelector('#screen-heading');
    if (heading) heading.focus({ preventScroll: true });
  }

  const announcements = {
    intro: CONFIG.copy.intro.heading,
    about: CONFIG.copy.about.heading,
    question: `Pillar ${state.step + 1} of ${PILLARS.length}: ${PILLARS[state.step].name}`,
    gate: CONFIG.copy.gate.heading,
    results: `Your results. Growth Pillar: ${BY_SLUG[results().growth].name}`,
  };
  if (focus) announce(announcements[state.screen]);
}

function bindAbout() {
  $main.querySelector('[data-action="begin"]').addEventListener('click', () => go('question', 0));
  $main.querySelector('[data-action="back"]').addEventListener('click', () => go('intro', 0));
}

function bindQuestion() {
  const p = PILLARS[state.step];
  const q = CONFIG.copy.question;
  const form = $main.querySelector('form');
  const next = form.querySelector('[data-action="next"]');
  const hint = form.querySelector('#next-hint');
  const count = form.querySelector('[data-count]');
  const bar = $main.querySelector('[data-progress-fill]');
  const progressTrack = $main.querySelector('[role="progressbar"]');

  const update = () => {
    const answered = state.answers[p.slug].filter((a) => a !== null).length;
    const complete = answered === STATEMENTS_PER_PILLAR;
    next.classList.toggle('is-disabled', !complete);
    next.setAttribute('aria-disabled', String(!complete));
    hint.textContent = complete ? '' : q.incomplete;
    count.textContent = `${answered} of ${STATEMENTS_PER_PILLAR} answered`;
    count.classList.remove('is-warning');
    const pct = progressPct(state.step, answered);
    bar.style.width = `${pct}%`;
    progressTrack.setAttribute('aria-valuenow', pct);
    progressTrack.setAttribute('aria-valuetext', `Pillar ${state.step + 1} of ${PILLARS.length}, ${answered} of ${STATEMENTS_PER_PILLAR} answered`);
  };

  form.addEventListener('change', (e) => {
    const input = e.target;
    if (input.type !== 'radio') return;
    state.answers[p.slug][Number(input.dataset.index)] = Number(input.value);
    input.closest('.statement').classList.remove('statement--missing');
    saveState();
    update();
  });

  // Next stays clickable: if something's unanswered, say so and jump to it.
  const flagMissing = () => {
    const missing = state.answers[p.slug]
      .map((a, i) => (a === null ? i : -1))
      .filter((i) => i >= 0);
    missing.forEach((i) => form.querySelector(`[data-statement="${i}"]`).classList.add('statement--missing'));
    count.textContent = q.incomplete;
    count.classList.add('is-warning');
    const first = form.querySelector(`[data-statement="${missing[0]}"]`);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    first.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    first.querySelector('input').focus({ preventScroll: true });
  };

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isPillarComplete(state.answers, p.slug)) { flagMissing(); return; }
    track.pillarCompleted(p.name, state.step + 1);
    if (state.step < PILLARS.length - 1) {
      go('question', state.step + 1);
    } else {
      track.quizCompleted();
      go(state.unlocked ? 'results' : 'gate');
    }
  });

  form.querySelector('[data-action="back"]').addEventListener('click', () => {
    if (state.step === 0) go('about', 0);
    else go('question', state.step - 1);
  });
}

function bindGate() {
  const r = results();
  const host = $main.querySelector('[data-gate-form]');
  const loading = $main.querySelector('[data-gate-loading]');
  const blocked = $main.querySelector('[data-gate-blocked]');

  const reveal = () => {
    state.unlocked = true;
    // Replace the gate's history entry so browser Back from results returns to the questions.
    go('results', state.step, { history: 'replace' });
  };

  gateCleanup = mountGateForm(host, r.growth, {
    onRendered: () => { loading.hidden = true; },
    onBlocked: () => {
      loading.hidden = true;
      blocked.hidden = false;
    },
    onSuccess: (how, { firstName = '' } = {}) => {
      // Kept in memory only, to prefill the PDF name field. Never stored or sent to trackers.
      gateFirstName = firstName;
      // Pillar name only. Never the name/email typed into the form.
      track.lead(BY_SLUG[r.growth].name);
      reveal();
    },
  });

  blocked.querySelector('[data-action="skip-gate"]').addEventListener('click', reveal);
  $main.querySelector('[data-action="back"]').addEventListener('click', () => go('question', PILLARS.length - 1));
}

function bindResults() {
  renderChart();
  const r = results();
  const growthName = BY_SLUG[r.growth].name;

  // Warm up jsPDF + fonts so the download is quick (and stays inside the tap on iOS).
  const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 400));
  idle(() => { preparePdf().catch(() => {}); });

  $main.querySelector('[data-action="edge"]').addEventListener('click', () => track.edgeCtaClick(growthName));

  const btn = $main.querySelector('[data-action="download"]');
  const status = $main.querySelector('[data-download-status]');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    status.textContent = 'Preparing your scorecard…';
    try {
      // The printed name is read here and used only inside the PDF.
      await downloadScorecardPdf(r, $main.querySelector('#print-name').value);
      track.scorecardDownloaded();
      status.textContent = 'Your scorecard has been downloaded.';
    } catch (e) {
      console.error('[pdf]', e);
      status.textContent = 'Sorry, we couldn’t create your PDF. Please try again.';
    } finally {
      btn.disabled = false;
    }
  });

  const nameInput = $main.querySelector('#print-name');
  const nameCount = $main.querySelector('[data-name-count]');
  nameInput.addEventListener('input', () => { nameCount.textContent = `${nameInput.value.length}/${NAME_MAX}`; });

  // Retake asks first, since it wipes the saved results.
  const retakeBtn = $main.querySelector('[data-action="retake"]');
  const confirmBox = $main.querySelector('[data-retake-confirm]');
  retakeBtn.addEventListener('click', () => {
    retakeBtn.hidden = true;
    confirmBox.hidden = false;
    confirmBox.querySelector('[data-action="retake-no"]').focus();
  });
  confirmBox.querySelector('[data-action="retake-no"]').addEventListener('click', () => {
    confirmBox.hidden = true;
    retakeBtn.hidden = false;
    retakeBtn.focus();
  });
  confirmBox.querySelector('[data-action="retake-yes"]').addEventListener('click', () => {
    clearState();
    go('intro', 0);
  });
}

// Intro start button (delegated so it survives re-renders).
$main.addEventListener('click', (e) => {
  const start = e.target.closest('[data-action="start"]');
  if (!start) return;
  track.quizStarted();
  go('about', 0);
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
initTracking();
loadState();
renderFooter();
setupCookieBar();
({ screen: state.screen, step: state.step } = allowedScreen(state.screen, state.step));
try { window.history.replaceState({ quiz: { screen: state.screen, step: state.step } }, ''); } catch (e) { /* ignore */ }
render({ focus: false });
