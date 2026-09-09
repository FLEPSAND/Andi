/**
 * Page templates.
 *
 * Each template returns a CSS `background-image` for the page element, drawn
 * as an inline SVG so it stays crisp at any zoom and prints cleanly. Colours
 * come from CSS variables of the page, so templates work in dark mode too.
 */

const svg = (w, h, body) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
  )}")`;

const LINE = '#c9d2e3';
const SOFT = '#dfe5f0';
const ACCENT = '#9db4e8';

function lines(gap) {
  return svg(100, gap, `<line x1="0" y1="${gap - 0.5}" x2="100" y2="${gap - 0.5}" stroke="${LINE}" stroke-width="1"/>`);
}

function grid(gap) {
  return svg(gap, gap,
    `<path d="M ${gap} 0 L 0 0 0 ${gap}" fill="none" stroke="${SOFT}" stroke-width="1"/>`);
}

function dots(gap) {
  return svg(gap, gap, `<circle cx="1.5" cy="1.5" r="1.4" fill="${LINE}"/>`);
}

/** Two solid lines with a dashed middle — the sheet used for learning script. */
function handwriting(gap) {
  const mid = gap / 2;
  return svg(100, gap, `
    <line x1="0" y1="${gap - 0.5}" x2="100" y2="${gap - 0.5}" stroke="${LINE}" stroke-width="1"/>
    <line x1="0" y1="${mid}" x2="100" y2="${mid}" stroke="${ACCENT}" stroke-width="0.8" stroke-dasharray="4 4"/>
  `);
}

function music() {
  const gap = 9;
  const staff = Array.from({ length: 5 }, (_, i) =>
    `<line x1="0" y1="${10 + i * gap}" x2="100" y2="${10 + i * gap}" stroke="${LINE}" stroke-width="1"/>`
  ).join('');
  return svg(100, 90, staff);
}

function cornell(w, h) {
  const cue = Math.round(w * 0.3);
  const summary = h - 150;
  return svg(w, h, `
    <line x1="${cue}" y1="60" x2="${cue}" y2="${summary}" stroke="${ACCENT}" stroke-width="1.5"/>
    <line x1="0" y1="60" x2="${w}" y2="60" stroke="${ACCENT}" stroke-width="1.5"/>
    <line x1="0" y1="${summary}" x2="${w}" y2="${summary}" stroke="${ACCENT}" stroke-width="1.5"/>
    <text x="16" y="38" font-family="system-ui" font-size="15" fill="#93a1bd">Thema / Datum</text>
    <text x="16" y="86" font-family="system-ui" font-size="13" fill="#93a1bd">Fragen</text>
    <text x="${cue + 16}" y="86" font-family="system-ui" font-size="13" fill="#93a1bd">Notizen</text>
    <text x="16" y="${summary + 26}" font-family="system-ui" font-size="13" fill="#93a1bd">Zusammenfassung</text>
  `);
}

function todo(w) {
  const rowH = 44;
  return svg(w, rowH, `
    <rect x="24" y="12" width="20" height="20" rx="5" fill="none" stroke="${ACCENT}" stroke-width="1.4"/>
    <line x1="58" y1="${rowH - 6}" x2="${w - 24}" y2="${rowH - 6}" stroke="${SOFT}" stroke-width="1"/>
  `);
}

function storyboard(w, h) {
  const cols = 2;
  const rows = 3;
  const pad = 30;
  const cw = (w - pad * (cols + 1)) / cols;
  const ch = (h - pad * (rows + 1)) / rows;
  let body = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = pad + c * (cw + pad);
      const y = pad + r * (ch + pad);
      body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch * 0.68}" rx="10" fill="none" stroke="${ACCENT}" stroke-width="1.4"/>`;
      for (let l = 1; l <= 3; l++) {
        const ly = y + ch * 0.68 + l * 18;
        body += `<line x1="${x}" y1="${ly}" x2="${x + cw}" y2="${ly}" stroke="${SOFT}" stroke-width="1"/>`;
      }
    }
  }
  return svg(w, h, body);
}

function weekPlan(w, h) {
  const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa/So'];
  const rowH = (h - 70) / days.length;
  let body = `<text x="24" y="42" font-family="system-ui" font-size="18" fill="#93a1bd">Woche</text>`;
  days.forEach((day, i) => {
    const y = 70 + i * rowH;
    body += `<line x1="24" y1="${y}" x2="${w - 24}" y2="${y}" stroke="${ACCENT}" stroke-width="1.2"/>`;
    body += `<text x="30" y="${y + 22}" font-family="system-ui" font-size="14" fill="#93a1bd">${day}</text>`;
    for (let l = 1; l <= 3; l++) {
      const ly = y + 26 + l * 22;
      if (ly < y + rowH - 4) {
        body += `<line x1="90" y1="${ly}" x2="${w - 24}" y2="${ly}" stroke="${SOFT}" stroke-width="0.8"/>`;
      }
    }
  });
  return svg(w, h, body);
}

function isometric(gap) {
  const h = gap * Math.sqrt(3);
  return svg(gap * 2, h, `
    <path d="M0 0 L${gap} ${h / 2} L0 ${h} M${gap * 2} 0 L${gap} ${h / 2} L${gap * 2} ${h}"
      fill="none" stroke="${SOFT}" stroke-width="1"/>
  `);
}

export const TEMPLATES = {
  blank:       { label: 'Leer',            group: 'Basis',   image: () => 'none' },
  lines:       { label: 'Liniert',         group: 'Basis',   image: () => lines(32) },
  linesWide:   { label: 'Weit liniert',    group: 'Basis',   image: () => lines(44) },
  grid:        { label: 'Kariert',         group: 'Basis',   image: () => grid(24) },
  gridSmall:   { label: 'Rechenkästchen',  group: 'Basis',   image: () => grid(14) },
  dots:        { label: 'Punktraster',     group: 'Basis',   image: () => dots(22) },
  handwriting: { label: 'Schreiblinien',   group: 'Schule',  image: () => handwriting(40) },
  music:       { label: 'Notenlinien',     group: 'Schule',  image: () => music() },
  cornell:     { label: 'Cornell',         group: 'Schule',  image: (p) => cornell(p.w, p.h) },
  todo:        { label: 'Aufgabenliste',   group: 'Planen',  image: (p) => todo(p.w) },
  week:        { label: 'Wochenplan',      group: 'Planen',  image: (p) => weekPlan(p.w, p.h) },
  storyboard:  { label: 'Storyboard',      group: 'Kreativ', image: (p) => storyboard(p.w, p.h) },
  isometric:   { label: 'Isometrisch',     group: 'Kreativ', image: () => isometric(26) }
};

export const TEMPLATE_GROUPS = ['Basis', 'Schule', 'Planen', 'Kreativ'];

/** Applies a template as the page element's background. */
export function applyTemplate(pageEl, page) {
  const template = TEMPLATES[page.template] || TEMPLATES.blank;
  const image = template.image(page);
  pageEl.style.backgroundImage = image;
  // Full-page templates must not tile; small patterns must.
  const tiled = ['blank', 'lines', 'linesWide', 'grid', 'gridSmall', 'dots', 'handwriting', 'music', 'todo', 'isometric'];
  pageEl.style.backgroundRepeat = tiled.includes(page.template) ? 'repeat' : 'no-repeat';
  pageEl.style.backgroundSize = tiled.includes(page.template) ? 'auto' : '100% 100%';
  pageEl.dataset.template = page.template;
}
