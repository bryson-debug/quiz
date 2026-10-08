// Meta Pixel, GA4 and Microsoft Clarity. Each loads on page load only if its ID
// in config.js is set (not a placeholder).
//
// PRIVACY RULE: never pass names, emails or individual answers to any tracker.
// Only pillar names/slugs, steps and scores.

import { CONFIG, isPlaceholder } from './config.js';

const ids = CONFIG.tracking;
const enabled = { meta: false, ga4: false, clarity: false };

function loadScript(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function initMeta(id) {
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
  /* eslint-enable */
  // Turn off the pixel's automatic configuration BEFORE init. With it on, the pixel auto-detects
  // buttons and form submissions and collects page/form metadata, which could include the
  // embedded Flodesk form where people type their name and email. This site must never send
  // names or emails to Meta (see CLAUDE.md, Privacy model), so only the explicit events below
  // are sent. Also keep "Automatic Advanced Matching" OFF in Meta Events Manager: that is a
  // separate, dashboard-only setting this call does not control.
  window.fbq('set', 'autoConfig', false, id);
  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

function initGa4(id) {
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date());
  window.gtag('config', id); // sends page_view automatically
}

function initClarity(id) {
  /* eslint-disable */
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
    t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', id);
  /* eslint-enable */
}

export function initTracking() {
  const run = (key, id, init) => {
    if (isPlaceholder(id)) return;
    try { init(id); enabled[key] = true; } catch (e) { console.warn(`[tracking] ${key} failed to load`, e); }
  };
  run('meta', ids.META_PIXEL_ID, initMeta);
  run('ga4', ids.GA4_MEASUREMENT_ID, initGa4);
  run('clarity', ids.CLARITY_PROJECT_ID, initClarity);
}

function meta(kind, name, params) {
  if (!enabled.meta || typeof window.fbq !== 'function') return;
  window.fbq(kind, name, params || {});
}

function ga(name, params) {
  if (!enabled.ga4 || typeof window.gtag !== 'function') return;
  window.gtag('event', name, params || {});
}

// One function per moment in the funnel, so the event table in CLAUDE.md maps 1:1.
export const track = {
  quizStarted() {
    meta('trackCustom', 'QuizStarted');
    ga('quiz_start');
  },
  pillarCompleted(pillarName, step) {
    meta('trackCustom', 'PillarCompleted', { pillar: pillarName });
    ga('pillar_complete', { pillar: pillarName, step });
  },
  quizCompleted() {
    meta('trackCustom', 'QuizCompleted');
    ga('quiz_complete');
  },
  lead(growthPillarName) {
    meta('track', 'Lead', { content_name: growthPillarName });
    ga('generate_lead', { growth_pillar: growthPillarName });
  },
  edgeCtaClick(growthPillarName) {
    meta('trackCustom', 'EdgeCTAClick', { growth_pillar: growthPillarName });
    ga('edge_cta_click', { growth_pillar: growthPillarName });
  },
  scorecardDownloaded() {
    meta('trackCustom', 'ScorecardDownloaded');
    ga('scorecard_download');
  },
};
