// Email gate: embeds the Flodesk form for the person's growth pillar and detects
// a successful submission. Flodesk collects and stores the name/email; this code
// never reads, stores or forwards them.
//
// Submission detection, in order of preference:
//   1. Flodesk's success state appears inside the container (MutationObserver).
//   2. A `submit` event bubbles from the form and no success state shows up:
//      reveal after `submitFallbackMs` if the form's fields are valid.
// Never trap the user: if the form hasn't rendered after `renderTimeoutMs`
// (e.g. assets.flodesk.com blocked), show a "Show my results" button.

import { CONFIG, isPlaceholder } from './config.js';

const SUCCESS_SELECTORS = [
  '[data-ff-stage="success"]',
  '[data-ff-el="success"]',
  '[class*="success"]',
];

/** Form ID for a pillar, falling back to the default form while it's a placeholder. */
export function formIdFor(slug) {
  const { forms, fallbackPillar } = CONFIG.flodesk;
  const id = forms[slug];
  if (!isPlaceholder(id)) return id;
  console.warn(`[gate] Flodesk form ID for "${slug}" is still a placeholder; using the "${fallbackPillar}" form instead.`);
  return forms[fallbackPillar];
}

function isVisible(el) {
  if (!el || !el.isConnected) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// Flodesk may render into an open shadow root; search both.
function queryAllDeep(root, selector) {
  const found = [...root.querySelectorAll(selector)];
  root.querySelectorAll('*').forEach((el) => {
    if (el.shadowRoot) found.push(...queryAllDeep(el.shadowRoot, selector));
  });
  return found;
}

// The data-ff-stage attribute is definitive. Looser "success" element/class matches
// only count after a submit, so they can't fire on first render.
function hasSuccessState(container, afterSubmit) {
  const stage = queryAllDeep(container, '[data-ff-stage]').some((el) => el.getAttribute('data-ff-stage') === 'success');
  if (stage || !afterSubmit) return stage;
  return SUCCESS_SELECTORS.slice(1).some((sel) => queryAllDeep(container, sel).some(isVisible));
}

function hasRenderedForm(container) {
  return queryAllDeep(container, 'form, input[type="email"]').length > 0;
}

/**
 * Mount the gate form.
 * @param {HTMLElement} host element to render the form container into
 * @param {string} growthSlug
 * @param {{onSuccess: (how: string) => void, onBlocked: () => void, onRendered?: () => void}} handlers
 * @returns {() => void} cleanup
 */
export function mountGateForm(host, growthSlug, { onSuccess, onBlocked, onRendered = () => {} }) {
  const formId = formIdFor(growthSlug);
  const containerId = `fd-form-${formId}`;
  host.innerHTML = '';
  const container = document.createElement('div');
  container.id = containerId;
  container.className = 'fd-container';
  host.appendChild(container);

  let done = false;
  let rendered = false;
  let submitted = false;
  let submitTimer = null;
  const timers = [];

  const finish = (how) => {
    if (done) return;
    done = true;
    cleanup();
    onSuccess(how);
  };

  const observer = new MutationObserver(() => {
    if (done) return;
    if (!rendered && hasRenderedForm(container)) { rendered = true; onRendered(); }
    if (hasSuccessState(container, submitted)) finish('success-state');
  });
  observer.observe(container, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'data-ff-stage', 'hidden'] });

  // `submit` bubbles from a light-DOM form. Only treat it as a submission if the
  // browser considers the fields valid; then give Flodesk a moment to show success.
  const onSubmit = (event) => {
    const form = event.target;
    if (form && typeof form.checkValidity === 'function' && !form.checkValidity()) return;
    submitted = true;
    clearTimeout(submitTimer);
    submitTimer = setTimeout(() => {
      if (done) return;
      const hasError = queryAllDeep(container, '[data-ff-stage="error"], [aria-invalid="true"]').some(isVisible);
      if (!hasError) finish('submit-fallback');
    }, CONFIG.flodesk.submitFallbackMs);
  };
  container.addEventListener('submit', onSubmit, true);

  // Render timeout: if nothing rendered, offer a way through.
  timers.push(setTimeout(() => {
    if (!done && !rendered && !hasRenderedForm(container)) onBlocked();
  }, CONFIG.flodesk.renderTimeoutMs));

  function cleanup() {
    observer.disconnect();
    container.removeEventListener('submit', onSubmit, true);
    clearTimeout(submitTimer);
    timers.forEach(clearTimeout);
  }

  try {
    if (typeof window.fd !== 'function') throw new Error('Flodesk script not available');
    window.fd('form', { formId, containerEl: `#${containerId}` });
  } catch (e) {
    console.warn('[gate] Could not initialize the Flodesk form:', e);
    // Leave the render timeout to show the fallback (it will, since nothing rendered).
  }

  return cleanup;
}
