import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scorePillars, pickPillars, computeResults, isPillarComplete,
} from '../public/js/scoring.js';
import { CONFIG } from '../public/js/config.js';

const ORDER = CONFIG.pillars.map((p) => p.slug);
const [EP, AP, ID, CP, TF] = ORDER;

// Build a scores object from five numbers in framework order.
const s = (...vals) => Object.fromEntries(ORDER.map((slug, i) => [slug, vals[i]]));

test('framework order and slugs are as specified', () => {
  assert.deepEqual(ORDER, [
    'expectations-procedures',
    'approaches-pedagogy',
    'inclusion-differentiation',
    'curriculum-planning',
    'teacher-fulfillment',
  ]);
  for (const p of CONFIG.pillars) assert.equal(p.statements.length, 5, p.slug);
});

test('scorePillars sums the five ratings per pillar', () => {
  const answers = {
    [EP]: [1, 2, 3, 4, 5],
    [AP]: [5, 5, 5, 5, 5],
    [ID]: [1, 1, 1, 1, 1],
    [CP]: [3, 3, 3, 3, 3],
    [TF]: [2, 4, 2, 4, 2],
  };
  assert.deepEqual(scorePillars(answers, ORDER), s(15, 25, 5, 15, 14));
});

test('unique lowest and highest', () => {
  const r = pickPillars(s(20, 12, 18, 25, 15), ORDER);
  assert.equal(r.growth, AP);
  assert.equal(r.foundation, CP);
  assert.deepEqual(r.alsoAttention, []);
});

test('tie for lowest: earliest in framework order is growth, others are also-attention', () => {
  const r = pickPillars(s(20, 10, 22, 10, 10), ORDER);
  assert.equal(r.growth, AP);
  assert.deepEqual(r.alsoAttention, [CP, TF]);
  assert.equal(r.foundation, ID);
});

test('tie for highest: earliest in framework order is foundation', () => {
  const r = pickPillars(s(24, 8, 24, 24, 15), ORDER);
  assert.equal(r.growth, AP);
  assert.equal(r.foundation, EP);
});

test('foundation excludes the growth pillar', () => {
  // Growth is first by tie-break; foundation must come from the rest.
  const r = pickPillars(s(10, 10, 10, 12, 11), ORDER);
  assert.equal(r.growth, EP);
  assert.equal(r.foundation, CP);
  assert.deepEqual(r.alsoAttention, [AP, ID]);
});

test('two pillars tied low, rest tied high', () => {
  const r = pickPillars(s(25, 25, 6, 6, 25), ORDER);
  assert.equal(r.growth, ID);
  assert.deepEqual(r.alsoAttention, [CP]);
  assert.equal(r.foundation, EP);
});

test('all five equal: growth = Expectations & Procedures, foundation = Approaches & Pedagogy', () => {
  for (const v of [5, 15, 25]) {
    const r = pickPillars(s(v, v, v, v, v), ORDER);
    assert.equal(r.growth, EP);
    assert.equal(r.foundation, AP);
    assert.deepEqual(r.alsoAttention, []);
    assert.equal(r.allEqual, true);
    assert.equal(r.growthTied, true);
    assert.equal(r.foundationTied, true);
  }
});

test('tie flags: clear winner vs. tie-break', () => {
  const clear = pickPillars(s(20, 12, 18, 25, 15), ORDER);
  assert.equal(clear.allEqual, false);
  assert.equal(clear.growthTied, false);
  assert.equal(clear.foundationTied, false);

  const tiedLow = pickPillars(s(20, 10, 22, 10, 10), ORDER);
  assert.equal(tiedLow.growthTied, true);
  assert.equal(tiedLow.foundationTied, false);

  const tiedHigh = pickPillars(s(24, 8, 24, 24, 15), ORDER);
  assert.equal(tiedHigh.growthTied, false);
  assert.equal(tiedHigh.foundationTied, true);
});

test('four tied lowest with one higher', () => {
  const r = pickPillars(s(9, 9, 9, 9, 20), ORDER);
  assert.equal(r.growth, EP);
  assert.equal(r.foundation, TF);
  assert.deepEqual(r.alsoAttention, [AP, ID, CP]);
});

test('computeResults wires scoring and picking together', () => {
  const answers = Object.fromEntries(ORDER.map((slug, i) => [slug, Array(5).fill(5 - i)]));
  const r = computeResults(answers, ORDER);
  assert.deepEqual(r.scores, s(25, 20, 15, 10, 5));
  assert.equal(r.growth, TF);
  assert.equal(r.foundation, EP);
});

test('isPillarComplete requires five 1–5 ratings', () => {
  assert.equal(isPillarComplete({ [EP]: [1, 2, 3, 4, 5] }, EP), true);
  assert.equal(isPillarComplete({ [EP]: [1, 2, null, 4, 5] }, EP), false);
  assert.equal(isPillarComplete({ [EP]: [1, 2, 3, 4] }, EP), false);
  assert.equal(isPillarComplete({ [EP]: [1, 2, 3, 4, 6] }, EP), false);
  assert.equal(isPillarComplete({}, EP), false);
});
