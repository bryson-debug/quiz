// Quiz flow: intro -> 5 pillar screens -> email gate -> results.
// Answers live in memory, mirrored to sessionStorage (no personal data).

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

function loadState() {
  try {
    const saved = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!saved || typeof saved !== 'object') return;
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
    // Never land on gate/results with incomplete answers.
    if ((screen === 'gate' || screen === 'results') && !ORDER.every((s) => isPillarComplete(answers, s))) {
      state.screen = 'question';
    }
    if (screen === 'results' && !state.unlocked) state.screen = 'gate';
  } catch (e) { /* storage blocked or corrupt: start fresh */ }
}

function saveState() {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* storage blocked */ }
}

function clearState() {
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch (e) { /* storage blocked */ }
  state = { screen: 'intro', step: 0, answers: emptyAnswers(), unlocked: false };
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
  // Not a link during the quiz; on results it links to the TEN site.
  slot.innerHTML = state.screen === 'results'
    ? `<a class="logo" href="${esc(CONFIG.site.brandUrl)}">${img}</a>`
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
        <fieldset class="statement">
          <legend><span class="statement__num" aria-hidden="true">${i + 1}</span><span>${esc(text)}</span></legend>
          <div class="rating">${radios}</div>
          <div class="rating__ends" aria-hidden="true"><span>${esc(low)}</span><span>${esc(high)}</span></div>
        </fieldset>
      </li>`;
  }).join('');

  const pct = ((step + 1) / PILLARS.length) * 100;
  return `
    <section class="screen screen--question" aria-labelledby="screen-heading">
      <div class="progress">
        <p class="progress__label" id="progress-label">Pillar ${step + 1} of ${PILLARS.length}</p>
        <div class="progress__track" role="progressbar" aria-labelledby="progress-label" aria-valuemin="1" aria-valuemax="${PILLARS.length}" aria-valuenow="${step + 1}">
          <div class="progress__fill" style="width:${pct}%"></div>
        </div>
      </div>
      <h1 id="screen-heading" class="pillar-title" tabindex="-1">${esc(p.name)}</h1>
      <p class="pillar-desc">${esc(p.description)}</p>
      <p class="scale-hint">Rate each statement from <strong>1</strong> (${esc(low)}) to <strong>5</strong> (${esc(high)}).</p>
      <form class="statements-form" novalidate>
        <ol class="statements">${statements}</ol>
        <p class="answer-count" data-count aria-hidden="true">${answered} of ${STATEMENTS_PER_PILLAR} answered</p>
        <div class="quiz-nav">
          <button type="button" class="btn btn--ghost" data-action="back">Back</button>
          <p class="quiz-nav__status" data-count-wide>${answered} of ${STATEMENTS_PER_PILLAR} answered</p>
          <button type="submit" class="btn" data-action="next"${complete ? '' : ' disabled'} aria-describedby="next-hint">Next</button>
          <span id="next-hint" class="visually-hidden">${complete ? '' : 'Answer all 5 statements to continue.'}</span>
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
        <a class="btn" data-action="edge" href="${esc(edgeUrl(growth.slug))}">${esc(c.supportButton)}</a>
      </section>

      <section class="download" aria-labelledby="download-h" data-clarity-mask="true">
        <h2 id="download-h">${esc(c.downloadHeading)}</h2>
        <div class="field">
          <label for="print-name">${esc(c.nameFieldLabel)}</label>
          <input id="print-name" type="text" autocomplete="name" maxlength="80">
        </div>
        <button type="button" class="btn" data-action="download">${esc(c.downloadButton)}</button>
        <p class="download-status" data-download-status role="status"></p>
      </section>

      <p class="retake"><button type="button" class="link-btn" data-action="retake">${esc(c.retake)}</button></p>
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

function go(screen, step = state.step, { focus = true } = {}) {
  if (gateCleanup) { gateCleanup(); gateCleanup = null; }
  state.screen = screen;
  state.step = step;
  saveState();
  render({ focus });
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
  const form = $main.querySelector('form');
  const next = form.querySelector('[data-action="next"]');
  const hint = form.querySelector('#next-hint');

  const update = () => {
    const answered = state.answers[p.slug].filter((a) => a !== null).length;
    const complete = answered === STATEMENTS_PER_PILLAR;
    next.disabled = !complete;
    hint.textContent = complete ? '' : 'Answer all 5 statements to continue.';
    const text = `${answered} of ${STATEMENTS_PER_PILLAR} answered`;
    form.querySelectorAll('[data-count], [data-count-wide]').forEach((el) => { el.textContent = text; });
  };

  form.addEventListener('change', (e) => {
    const input = e.target;
    if (input.type !== 'radio') return;
    state.answers[p.slug][Number(input.dataset.index)] = Number(input.value);
    saveState();
    update();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!isPillarComplete(state.answers, p.slug)) return;
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
    go('results');
  };

  gateCleanup = mountGateForm(host, r.growth, {
    onRendered: () => { loading.hidden = true; },
    onBlocked: () => {
      loading.hidden = true;
      blocked.hidden = false;
    },
    onSuccess: () => {
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

  $main.querySelector('[data-action="retake"]').addEventListener('click', () => {
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
render({ focus: false });
