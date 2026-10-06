// Radar chart geometry (shared by the on-screen SVG and the PDF) and SVG renderer.
// Axis 0 points straight up; the rest go clockwise in framework order.

export const MAX_SCORE = 25;
export const GRID_STEPS = [5, 10, 15, 20, 25];

/** Point on axis `i` of `n` at `value` (0–25), for a chart centered at cx,cy with radius r. */
export function radarPoint(i, n, value, cx, cy, r) {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  const dist = (Math.max(0, Math.min(MAX_SCORE, value)) / MAX_SCORE) * r;
  return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
}

/**
 * Where to put a scale number (5, 10 … 25). It sits on the grid edge between the top axis and
 * the upper-left axis, which no data point can sit on (points only fall on axes).
 */
export function tickPoint(step, n, cx, cy, r) {
  const [x1, y1] = radarPoint(0, n, step, cx, cy, r);
  const [x2, y2] = radarPoint(n - 1, n, step, cx, cy, r);
  return [(x1 + x2) / 2, (y1 + y2) / 2];
}

/** Where to put an axis label, and how to align it, based on which side of the chart it sits. */
export function labelPlacement(i, n, cx, cy, r, gap) {
  const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
  const x = cx + (r + gap) * Math.cos(angle);
  const y = cy + (r + gap) * Math.sin(angle);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end';
  // vertical: 'above' for the top label, 'below' for bottom labels, 'center' for sides
  const vertical = sin < -0.9 ? 'above' : sin > 0.5 ? 'below' : 'center';
  return { x, y, anchor, vertical };
}

const esc = (str) => String(str).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * Build the radar chart SVG markup.
 * @param {{label: string[], score: number}[]} axes in framework order
 * @param {{compact?: boolean, title?: string}} opts compact = phone layout (one-line labels)
 */
export function radarSvg(axes, { compact = false, title = 'Pillar scores radar chart' } = {}) {
  const n = axes.length;
  // Compact: smaller chart and bigger relative type so labels stay readable at 328px wide.
  const L = compact
    ? { w: 440, h: 384, cx: 220, cy: 204, r: 102, gap: 12, font: 15, line: 17 }
    : { w: 560, h: 460, cx: 280, cy: 240, r: 150, gap: 16, font: 13, line: 16 };
  const { cx, cy, r } = L;

  const poly = (value) => axes
    .map((_, i) => radarPoint(i, n, value, cx, cy, r).map((v) => v.toFixed(1)).join(','))
    .join(' ');

  const grid = GRID_STEPS.map((step) => `<polygon class="radar-grid${step === MAX_SCORE ? ' radar-grid--outer' : ''}" points="${poly(step)}"/>`).join('');

  const spokes = axes.map((_, i) => {
    const [x, y] = radarPoint(i, n, MAX_SCORE, cx, cy, r);
    return `<line class="radar-spoke" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
  }).join('');

  // Scale numbers between two axes, clear of the data points (which only sit on axes).
  const ticks = GRID_STEPS.map((step) => {
    const [x, y] = tickPoint(step, n, cx, cy, r);
    return `<text class="radar-tick" x="${x.toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="middle">${step}</text>`;
  }).join('');

  const dataPoints = axes.map((a, i) => radarPoint(i, n, a.score, cx, cy, r));
  const shape = `<polygon class="radar-shape" points="${dataPoints.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`;
  const dots = dataPoints.map(([x, y]) => `<circle class="radar-dot" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${compact ? 4.5 : 4}"/>`).join('');

  const labels = axes.map((a, i) => {
    const p = labelPlacement(i, n, cx, cy, r, L.gap);
    const lines = [...a.label, `${a.score}/25`];
    const total = lines.length;
    // First baseline so the block sits above / below / centered on the anchor point.
    let y0;
    if (p.vertical === 'above') y0 = p.y - (total - 1) * L.line - 4;
    else if (p.vertical === 'below') y0 = p.y + L.font;
    else y0 = p.y - ((total - 1) * L.line) / 2 + L.font * 0.35;
    const tspans = lines.map((line, k) => `<tspan x="${p.x.toFixed(1)}" y="${(y0 + k * L.line).toFixed(1)}"${k === total - 1 ? ' class="radar-label-score"' : ''}>${esc(line)}</tspan>`).join('');
    return `<text class="radar-label" text-anchor="${p.anchor}" font-size="${L.font}">${tspans}</text>`;
  }).join('');

  return `<svg class="radar" viewBox="0 0 ${L.w} ${L.h}" role="img" aria-labelledby="radar-title" xmlns="http://www.w3.org/2000/svg">`
    + `<title id="radar-title">${esc(title)}</title>`
    + `<g aria-hidden="true">${grid}${spokes}${shape}${dots}${ticks}${labels}</g></svg>`;
}
