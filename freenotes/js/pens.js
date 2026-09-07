/**
 * Pens.
 *
 * Every pen is a small description plus a renderer. A stroke stores which pen
 * drew it, so a note keeps looking the same even if the pen defaults change
 * later. Points are [x, y, pressure] in logical page coordinates.
 */

export const PENS = {
  fountain: {
    label: 'Füller',
    icon: '✒',
    hint: 'Strichstärke folgt dem Druck — für Handschrift',
    defaults: { color: '#1b2440', size: 3.2, opacity: 1 },
    variable: true
  },
  ballpoint: {
    label: 'Kugelschreiber',
    icon: '🖊',
    hint: 'Gleichmäßig, leicht druckempfindlich',
    defaults: { color: '#20304f', size: 2.2, opacity: 1 },
    variable: true
  },
  fineliner: {
    label: 'Fineliner',
    icon: '🖋',
    hint: 'Immer gleich dick, sehr sauber',
    defaults: { color: '#111318', size: 1.8, opacity: 1 }
  },
  pencil: {
    label: 'Bleistift',
    icon: '✏',
    hint: 'Körnig wie Graphit',
    defaults: { color: '#4a4f5c', size: 3, opacity: 0.85 }
  },
  brush: {
    label: 'Pinsel',
    icon: '🖌',
    hint: 'Läuft an den Enden spitz zu',
    defaults: { color: '#1b1d24', size: 9, opacity: 1 },
    variable: true
  },
  marker: {
    label: 'Textmarker',
    icon: '▬',
    hint: 'Transparent, überdeckt Text nicht',
    defaults: { color: '#ffd23f', size: 18, opacity: 0.32 },
    behind: true
  },
  crayon: {
    label: 'Wachsmaler',
    icon: '🖍',
    hint: 'Breit und rau',
    defaults: { color: '#f2762e', size: 10, opacity: 0.9 }
  },
  neon: {
    label: 'Neon',
    icon: '✨',
    hint: 'Leuchtet — gut auf dunklen Seiten',
    defaults: { color: '#4be1ff', size: 4, opacity: 1 }
  },
  dashed: {
    label: 'Gestrichelt',
    icon: '┄',
    hint: 'Für Hilfslinien und Markierungen',
    defaults: { color: '#e5484d', size: 2.4, opacity: 1 }
  }
};

export const SHAPES = {
  line: { label: 'Linie', icon: '╱' },
  arrow: { label: 'Pfeil', icon: '↗' },
  rect: { label: 'Rechteck', icon: '▭' },
  ellipse: { label: 'Ellipse', icon: '◯' }
};

export const PALETTES = {
  Klassisch: ['#111318', '#20304f', '#e5484d', '#12a150', '#f5a524', '#8b5cf6', '#8a6b4f', '#ffffff'],
  Pastell: ['#ffb5c2', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff', '#e9edf5'],
  Neon: ['#ff2e88', '#ff9f1c', '#ffe100', '#3ddc84', '#4be1ff', '#8b5cf6', '#ff5f1f', '#ffffff'],
  Marker: ['#ffd23f', '#7ef29d', '#8ecbff', '#ffa8d2', '#c7b3ff', '#ffb08a', '#b9f6ca', '#e0e0e0'],
  Erde: ['#4a3f35', '#8a6b4f', '#b08968', '#ddb892', '#7f9172', '#556b2f', '#2f3e46', '#f0ead2']
};

/* ───────────────────────── Rendering ───────────────────────── */

/**
 * Draws one stroke. `preview` skips expensive texture work while the pen is
 * still moving, so drawing stays responsive on slower tablets.
 */
export function drawStroke(ctx, stroke, preview = false) {
  const pen = PENS[stroke.pen] || PENS.fountain;
  const pts = stroke.pts;
  if (!pts || !pts.length) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.color;
  ctx.fillStyle = stroke.color;
  ctx.globalAlpha = stroke.opacity != null ? stroke.opacity : 1;

  if (stroke.shape) {
    drawShape(ctx, stroke);
    ctx.restore();
    return;
  }

  switch (stroke.pen) {
    case 'marker':
      ctx.lineCap = 'butt';
      ctx.lineWidth = stroke.size;
      strokePath(ctx, pts);
      break;

    case 'fineliner':
      ctx.lineWidth = stroke.size;
      strokePath(ctx, pts);
      break;

    case 'dashed':
      ctx.lineWidth = stroke.size;
      ctx.setLineDash([stroke.size * 3, stroke.size * 2.2]);
      strokePath(ctx, pts);
      break;

    case 'neon':
      ctx.shadowColor = stroke.color;
      ctx.shadowBlur = stroke.size * 3;
      ctx.lineWidth = stroke.size;
      strokePath(ctx, pts);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = Math.min(1, (stroke.opacity || 1) + 0.2);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(0.6, stroke.size * 0.35);
      strokePath(ctx, pts);
      break;

    case 'pencil':
      grain(ctx, stroke, preview ? 3 : 1);
      break;

    case 'crayon':
      grain(ctx, stroke, preview ? 3 : 1, true);
      break;

    default: // fountain, ballpoint, brush
      variableWidth(ctx, stroke, pen);
  }

  ctx.restore();
}

function strokePath(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  if (pts.length === 2) {
    ctx.lineTo(pts[1][0], pts[1][1]);
  } else {
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const last = pts[pts.length - 1];
    ctx.lineTo(last[0], last[1]);
  }
  ctx.stroke();
}

/** Pressure- and speed-dependent width, drawn segment by segment. */
function variableWidth(ctx, stroke, pen) {
  const pts = stroke.pts;
  const size = stroke.size;
  const taper = stroke.pen === 'brush';
  const range = stroke.pen === 'ballpoint' ? 0.3 : (stroke.pen === 'brush' ? 1.1 : 0.75);

  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0][0], pts[0][1], size / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const pressure = (a[2] + b[2]) / 2;
    let w = size * (1 - range / 2 + range * pressure);
    if (taper) {
      const edge = Math.min(i, pts.length - i) / Math.min(8, pts.length / 2);
      w *= Math.min(1, 0.35 + 0.65 * edge);
    }
    ctx.beginPath();
    ctx.lineWidth = Math.max(0.3, w);
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
}

/** Graphite / wax look: many small dots scattered along the path. */
function grain(ctx, stroke, step, wide = false) {
  const pts = stroke.pts;
  const size = stroke.size;
  const spread = wide ? size * 0.55 : size * 0.4;
  const dots = wide ? 5 : 3;
  const base = ctx.globalAlpha;
  let seed = hash(stroke.id);

  for (let i = step; i < pts.length; i += step) {
    const a = pts[i - step];
    const b = pts[i];
    const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const steps = Math.max(1, Math.ceil(dist / Math.max(0.7, size * 0.25)));
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t;
      const pressure = a[2] + (b[2] - a[2]) * t;
      for (let d = 0; d < dots; d++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const rx = ((seed >>> 8) % 1000) / 1000 - 0.5;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const ry = ((seed >>> 8) % 1000) / 1000 - 0.5;
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const alpha = 0.25 + ((seed >>> 8) % 100) / 200;
        ctx.globalAlpha = base * alpha * (0.5 + pressure);
        ctx.beginPath();
        ctx.arc(x + rx * spread * 2, y + ry * spread * 2, Math.max(0.25, size * 0.14), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.globalAlpha = base;
}

function drawShape(ctx, stroke) {
  const [a, b] = [stroke.pts[0], stroke.pts[stroke.pts.length - 1]];
  ctx.lineWidth = stroke.size;
  ctx.beginPath();

  if (stroke.shape === 'line' || stroke.shape === 'arrow') {
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
    if (stroke.shape === 'arrow') {
      const angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const head = Math.max(8, stroke.size * 4);
      ctx.beginPath();
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - head * Math.cos(angle - 0.4), b[1] - head * Math.sin(angle - 0.4));
      ctx.moveTo(b[0], b[1]);
      ctx.lineTo(b[0] - head * Math.cos(angle + 0.4), b[1] - head * Math.sin(angle + 0.4));
      ctx.stroke();
    }
    return;
  }

  if (stroke.shape === 'rect') {
    ctx.rect(Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]));
    ctx.stroke();
    return;
  }

  if (stroke.shape === 'ellipse') {
    const cx = (a[0] + b[0]) / 2;
    const cy = (a[1] + b[1]) / 2;
    ctx.ellipse(cx, cy, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < String(text).length; i++) {
    h ^= String(text).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Bounding box of a stroke, used for selection and erasing. */
export function strokeBounds(stroke) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of stroke.pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[0] > x1) x1 = p[0];
    if (p[1] > y1) y1 = p[1];
  }
  const pad = (stroke.size || 2) / 2 + 2;
  return { x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 };
}
