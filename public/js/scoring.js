// Pure scoring logic. No DOM access, so it runs in Node for unit tests.
//
// Rules (see CLAUDE.md):
// - Pillar score = sum of its 5 ratings (5–25).
// - Growth = lowest score; ties go to the pillar earliest in framework order.
//   Any other pillar tied for lowest is "also worth your attention".
// - Foundation = highest score excluding the growth pillar; same tie-break.
// - All equal: growth = first pillar, foundation = second pillar, nothing "also worth attention".

export const STATEMENTS_PER_PILLAR = 5;

/** Sum each pillar's ratings. `answers` maps slug -> array of 1–5 (or null). */
export function scorePillars(answers, slugs) {
  const scores = {};
  for (const slug of slugs) {
    const ratings = answers[slug] || [];
    scores[slug] = ratings.reduce((sum, r) => sum + (Number(r) || 0), 0);
  }
  return scores;
}

/** True when every statement for the pillar has a 1–5 rating. */
export function isPillarComplete(answers, slug) {
  const ratings = answers[slug] || [];
  if (ratings.length < STATEMENTS_PER_PILLAR) return false;
  return ratings.slice(0, STATEMENTS_PER_PILLAR).every((r) => Number.isInteger(r) && r >= 1 && r <= 5);
}

/**
 * Pick growth / foundation pillars.
 * @param {Object<string, number>} scores slug -> score
 * @param {string[]} order slugs in framework order (tie-break order)
 * @returns {{growth: string, foundation: string, alsoAttention: string[],
 *   allEqual: boolean, growthTied: boolean, foundationTied: boolean}}
 */
export function pickPillars(scores, order) {
  let growth = order[0];
  for (const slug of order) {
    if (scores[slug] < scores[growth]) growth = slug; // strict: earliest wins ties
  }

  let foundation = null;
  for (const slug of order) {
    if (slug === growth) continue;
    if (foundation === null || scores[slug] > scores[foundation]) foundation = slug;
  }

  // When all five are equal there's no real "lowest", so nothing is flagged.
  const allEqual = order.every((slug) => scores[slug] === scores[order[0]]);

  // Other pillars tied for lowest (never the foundation pillar).
  const alsoAttention = allEqual ? [] : order.filter(
    (slug) => slug !== growth && slug !== foundation && scores[slug] === scores[growth],
  );

  // Which picks were decided by the framework-order tie-break rather than a clear score.
  const growthTied = order.some((slug) => slug !== growth && scores[slug] === scores[growth]);
  const foundationTied = order.some(
    (slug) => slug !== growth && slug !== foundation && scores[slug] === scores[foundation],
  );

  return { growth, foundation, alsoAttention, allEqual, growthTied, foundationTied };
}

/** Convenience: answers -> full results object. */
export function computeResults(answers, order) {
  const scores = scorePillars(answers, order);
  return { scores, ...pickPillars(scores, order) };
}
