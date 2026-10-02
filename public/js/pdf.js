// In-browser PDF scorecard (jsPDF, vendored and lazy-loaded). Nothing is uploaded.
// Same US Letter layout whatever device generates it.

import { CONFIG } from './config.js';
import { radarPoint, labelPlacement, GRID_STEPS, MAX_SCORE } from './radar.js';

const PAGE = { w: 612, h: 792, margin: 48 }; // US Letter in points
const INK = [28, 33, 32]; // #1C2120
const MINT = [205, 234, 231]; // #CDEAE7
const GREY = [96, 104, 102];
const FOOTER_H = 52;

let assetsPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function fetchBase64(url) {
  const buf = await (await fetch(url)).arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

// Rasterize the (SVG) logo to PNG, since jsPDF can't draw SVG directly.
async function rasterizeLogo(src) {
  const text = await (await fetch(src)).text();
  const vb = /viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);
  const aspect = vb ? Number(vb[1]) / Number(vb[2]) : 3;
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'sync';
    await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = url; });
    const height = 200;
    const width = Math.round(height * aspect);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    return { dataUrl: canvas.toDataURL('image/png'), aspect };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Start loading jsPDF, the heading font and the logo. Safe to call repeatedly. */
export function preparePdf() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([
      window.jspdf ? Promise.resolve() : loadScript('/vendor/jspdf.umd.min.js'),
      fetchBase64('/fonts/ArchivoBlack-Regular.ttf').catch(() => null),
      rasterizeLogo(CONFIG.site.logoSrc).catch(() => null),
    ]).then(([, font, logo]) => ({ font, logo }));
    assetsPromise.catch(() => { assetsPromise = null; }); // allow a retry
  }
  return assetsPromise;
}

/**
 * Build and download the scorecard PDF.
 * @param {{scores: Object, growth: string, foundation: string, alsoAttention: string[]}} results
 * @param {string} printName optional name, used only inside the PDF
 */
export async function downloadScorecardPdf(results, printName) {
  const { font, logo } = await preparePdf();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: 'letter', compress: true });

  let headingFont = ['helvetica', 'bold'];
  if (font) {
    doc.addFileToVFS('ArchivoBlack-Regular.ttf', font);
    doc.addFont('ArchivoBlack-Regular.ttf', 'ArchivoBlack', 'normal');
    headingFont = ['ArchivoBlack', 'normal'];
  }

  const year = new Date().getFullYear();
  const pillars = CONFIG.pillars;
  const bySlug = Object.fromEntries(pillars.map((p) => [p.slug, p]));
  const growth = bySlug[results.growth];
  const foundation = bySlug[results.foundation];
  const contentW = PAGE.w - PAGE.margin * 2;
  const bottomLimit = PAGE.h - FOOTER_H - 6;

  const setHeading = (size) => { doc.setFont(...headingFont); doc.setFontSize(size); doc.setTextColor(...INK); };
  const setBody = (size, style = 'normal', color = INK) => { doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(...color); };

  const decorate = () => {
    // Soft mint accents echoing the printed scorecard.
    doc.setFillColor(...MINT);
    doc.circle(PAGE.w - 30, 30, 92, 'F');
    doc.rect(0, PAGE.h - FOOTER_H - 6, 10, FOOTER_H + 6, 'F');
  };

  const footer = () => {
    const y = PAGE.h - FOOTER_H + 12;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.5);
    doc.line(PAGE.margin, y - 10, PAGE.w - PAGE.margin, y - 10);
    setBody(8, 'normal', GREY);
    doc.text(CONFIG.copy.pdf.footerCopyright.replace('{year}', year), PAGE.w / 2, y + 4, { align: 'center' });
    setBody(8.5, 'bold', INK);
    doc.text(CONFIG.copy.pdf.footerCta, PAGE.w / 2, y + 17, { align: 'center' });
  };

  const newPage = () => { doc.addPage(); decorate(); return PAGE.margin + 10; };
  const ensure = (y, needed) => (y + needed > bottomLimit ? newPage() : y);

  // --- Page 1 header -------------------------------------------------------
  decorate();
  let y = PAGE.margin;
  if (logo) {
    const h = 34;
    doc.addImage(logo.dataUrl, 'PNG', PAGE.margin, y - 8, h * logo.aspect, h);
    y += 40;
  }

  setHeading(22);
  const titleLines = doc.splitTextToSize(CONFIG.copy.pdf.title.toUpperCase(), contentW - 80);
  doc.text(titleLines, PAGE.margin, y + 16);
  y += 16 + titleLines.length * 26;

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const name = (printName || '').trim();
  setBody(11, 'normal', GREY);
  doc.text(name ? `${name}  ·  ${dateStr}` : dateStr, PAGE.margin, y);
  y += 18;

  // --- Scores panel + radar ------------------------------------------------
  const panelTop = y;
  const panelW = 218;
  const panelH = 212;
  doc.setFillColor(...MINT);
  doc.roundedRect(PAGE.margin, panelTop, panelW, panelH, 10, 10, 'F');
  setHeading(12);
  doc.text(CONFIG.copy.pdf.scoresHeading.toUpperCase(), PAGE.margin + 18, panelTop + 30);
  let rowY = panelTop + 56;
  pillars.forEach((p) => {
    setBody(10, 'bold');
    doc.text(p.name, PAGE.margin + 18, rowY);
    setHeading(14);
    doc.text(`${results.scores[p.slug]}/25`, PAGE.margin + panelW - 18, rowY, { align: 'right' });
    rowY += 31;
  });

  // Radar (vector), to the right of the panel.
  const cx = PAGE.margin + panelW + (contentW - panelW) / 2 + 4;
  const cy = panelTop + panelH / 2 + 6;
  const r = 78;
  const n = pillars.length;
  const ring = (value) => pillars.map((_, i) => radarPoint(i, n, value, cx, cy, r));
  const drawPoly = (pts, style) => {
    const deltas = pts.slice(1).map((pt, i) => [pt[0] - pts[i][0], pt[1] - pts[i][1]]);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], style, true);
  };
  doc.setDrawColor(190, 198, 196);
  doc.setLineWidth(0.5);
  GRID_STEPS.forEach((step) => {
    if (step === MAX_SCORE) { doc.setDrawColor(...INK); doc.setLineWidth(0.8); }
    drawPoly(ring(step), 'S');
  });
  doc.setDrawColor(190, 198, 196);
  doc.setLineWidth(0.5);
  ring(MAX_SCORE).forEach(([x, yy]) => doc.line(cx, cy, x, yy));
  const shape = pillars.map((p, i) => radarPoint(i, n, results.scores[p.slug], cx, cy, r));
  doc.setFillColor(...MINT);
  doc.setDrawColor(...INK);
  doc.setLineWidth(1.6);
  drawPoly(shape, 'FD');
  doc.setFillColor(...INK);
  shape.forEach(([x, yy]) => doc.circle(x, yy, 2.2, 'F'));
  setBody(6.5, 'normal', GREY);
  GRID_STEPS.forEach((step) => {
    const [x, yy] = radarPoint(0, n, step, cx, cy, r);
    doc.text(String(step), x - 4, yy + 2.5, { align: 'right' });
  });
  pillars.forEach((p, i) => {
    const pl = labelPlacement(i, n, cx, cy, r, 9);
    const lines = [...p.chartLabel, `${results.scores[p.slug]}/25`];
    const lh = 9;
    let y0;
    if (pl.vertical === 'above') y0 = pl.y - (lines.length - 1) * lh - 3;
    else if (pl.vertical === 'below') y0 = pl.y + 8;
    else y0 = pl.y - ((lines.length - 1) * lh) / 2 + 2.5;
    lines.forEach((line, k) => {
      setBody(7.5, 'bold', INK);
      doc.text(line, pl.x, y0 + k * lh, { align: pl.anchor === 'middle' ? 'center' : pl.anchor === 'start' ? 'left' : 'right' });
    });
  });

  y = panelTop + panelH + 18;

  // --- Foundation & growth boxes -----------------------------------------
  const boxW = (contentW - 16) / 2;
  const boxH = 70;
  const box = (x, label, pillarName, filled) => {
    doc.setDrawColor(...INK);
    doc.setLineWidth(1);
    if (filled) { doc.setFillColor(...MINT); doc.roundedRect(x, y, boxW, boxH, 8, 8, 'FD'); } else doc.roundedRect(x, y, boxW, boxH, 8, 8, 'S');
    setBody(9, 'bold', INK);
    doc.text(label.toUpperCase(), x + 16, y + 22);
    setHeading(14);
    doc.text(doc.splitTextToSize(pillarName.toUpperCase(), boxW - 32), x + 16, y + 42);
  };
  box(PAGE.margin, 'My Foundation Pillar', foundation.name, false);
  box(PAGE.margin + boxW + 16, 'My Growth Pillar', growth.name, true);
  y += boxH + 26;

  // --- Growth plan -------------------------------------------------------
  setHeading(14);
  doc.text('MY GROWTH PLAN', PAGE.margin, y);
  y += 18;
  setBody(10.5);
  const planLines = doc.splitTextToSize(growth.growthCopy, contentW);
  y = ensure(y, planLines.length * 14);
  doc.text(planLines, PAGE.margin, y);
  y += planLines.length * 14 + 4;

  if (results.alsoAttention.length) {
    setBody(10, 'italic', GREY);
    const also = `${CONFIG.copy.results.alsoAttentionLabel} ${results.alsoAttention.map((s) => bySlug[s].name).join(', ')}`;
    const alsoLines = doc.splitTextToSize(also, contentW);
    y = ensure(y, alsoLines.length * 13);
    doc.text(alsoLines, PAGE.margin, y + 6);
    y += alsoLines.length * 13 + 8;
  }

  y += 12;
  y = ensure(y, 40);
  setHeading(12);
  doc.text(CONFIG.copy.results.trainingsHeading.toUpperCase(), PAGE.margin, y);
  y += 20;

  growth.trainings.forEach((t, i) => {
    setBody(10);
    const descLines = doc.splitTextToSize(t.description, contentW - 34);
    setBody(11, 'bold');
    const titleLines2 = doc.splitTextToSize(t.title, contentW - 34);
    const blockH = titleLines2.length * 14 + 13 + descLines.length * 13 + 12;
    y = ensure(y, blockH);
    doc.setFillColor(...MINT);
    doc.circle(PAGE.margin + 10, y - 4, 10, 'F');
    setHeading(10);
    doc.text(String(i + 1), PAGE.margin + 10, y - 0.5, { align: 'center' });
    setBody(11, 'bold');
    doc.text(titleLines2, PAGE.margin + 30, y);
    let ty = y + titleLines2.length * 14 - 1;
    setBody(9.5, 'normal', GREY);
    doc.text(t.clinician, PAGE.margin + 30, ty);
    ty += 13;
    setBody(10);
    doc.text(descLines, PAGE.margin + 30, ty);
    y = ty + descLines.length * 13 + 8;
  });

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p += 1) { doc.setPage(p); footer(); }

  const filename = CONFIG.copy.pdf.filename;
  try {
    doc.save(filename);
  } catch (e) {
    // Fallback for browsers that refuse the download attribute.
    window.location.href = doc.output('bloburl');
  }
}
