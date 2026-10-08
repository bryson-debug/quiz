import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formIdFor } from '../public/js/gate.js';
import { CONFIG } from '../public/js/config.js';

// Capture console.error without printing it during the test run.
function captureErrors(fn) {
  const original = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args.join(' '));
  try { return { result: fn(), logged }; } finally { console.error = original; }
}

test('every pillar in config has a real Flodesk form ID', () => {
  for (const p of CONFIG.pillars) {
    const { result, logged } = captureErrors(() => formIdFor(p.slug));
    assert.match(result, /^[0-9a-f]{24}$/, p.slug);
    assert.equal(logged.length, 0);
  }
});

test('a placeholder form ID returns null and logs an error (no fallback to another form)', () => {
  const forms = {
    'expectations-procedures': '6abffc0d14eff99404fef9c4',
    'approaches-pedagogy': 'PLACEHOLDER_APPROACHES_PEDAGOGY',
  };
  const { result, logged } = captureErrors(() => formIdFor('approaches-pedagogy', forms));
  assert.equal(result, null);
  assert.equal(logged.length, 1);
  assert.match(logged[0], /approaches-pedagogy/);
});

test('a missing or empty form ID returns null and logs an error', () => {
  for (const forms of [{}, { 'teacher-fulfillment': '' }]) {
    const { result, logged } = captureErrors(() => formIdFor('teacher-fulfillment', forms));
    assert.equal(result, null);
    assert.equal(logged.length, 1);
  }
});
