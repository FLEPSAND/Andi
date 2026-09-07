/**
 * Drawing surface for one page.
 *
 * A page holds layers, a layer holds strokes, a stroke holds points in logical
 * page coordinates — so a page looks the same on a phone and on a big tablet,
 * and printing stays sharp.
 *
 * Undo works on whole layer contents (arrays of stroke references, so it is
 * cheap): every edit records the stroke list before and after.
 */

import { PENS, drawStroke, strokeBounds } from './pens.js';

const UNDO_LIMIT = 60;
let seq = 0;
const nextId = () => 'st' + Date.now().toString(36) + (seq++).toString(36);

export class InkLayer {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} page  page from the store, mutated in place
   * @param {object} opts  { getTool, getSettings, onChange, onSelection }
   */
  constructor(canvas, page, opts) {
    this.canvas = canvas;
    this.page = page;
    this.getTool = opts.getTool;
    this.getSettings = opts.getSettings;
    this.onChange = opts.onChange || (() => {});
    this.onSelection = opts.onSelection || (() => {});
    this.ctx = canvas.getContext('2d');

    this.scale = 1;
    this.dpr = 1;
    this.drawing = null;
    this.undoStack = [];
    this.redoStack = [];
    this.lasso = null;
    this.selection = [];
    this.dragFrom = null;

    this._onDown = this._onDown.bind(this);
    this._onMove = this._onMove.bind(this);
    this._onUp = this._onUp.bind(this);

    canvas.addEventListener('pointerdown', this._onDown);
    canvas.addEventListener('pointermove', this._onMove);
    canvas.addEventListener('pointerup', this._onUp);
    canvas.addEventListener('pointercancel', this._onUp);
    canvas.style.touchAction = 'none';
  }

  destroy() {
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onMove);
    this.canvas.removeEventListener('pointerup', this._onUp);
    this.canvas.removeEventListener('pointercancel', this._onUp);
  }

  /* ───────────────────────── Ebenen ───────────────────────── */

  get layers() { return this.page.layers; }

  get activeLayer() {
    const i = Math.min(this.page.activeLayer || 0, this.layers.length - 1);
    return this.layers[Math.max(0, i)];
  }

  setActiveLayer(index) {
    this.page.activeLayer = Math.max(0, Math.min(index, this.layers.length - 1));
    this.clearSelection();
  }

  /* ───────────────────────── Ansicht ───────────────────────── */

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.scale = rect.width / this.page.w;
    const w = Math.round(rect.width * this.dpr);
    const h = Math.round(rect.height * this.dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.render();
  }

  /* ───────────────────────── Eingabe ───────────────────────── */

  _accepts(ev) {
    const s = this.getSettings();
    if (s.penOnly && ev.pointerType === 'touch') return false;
    return true;
  }

  _pt(ev) {
    const rect = this.canvas.getBoundingClientRect();
    const s = this.getSettings();
    let p = ev.pressure;
    if (!s.pressure || ev.pointerType === 'mouse' || !p) p = 0.5;
    return [
      (ev.clientX - rect.left) / this.scale,
      (ev.clientY - rect.top) / this.scale,
      Math.max(0.05, Math.min(1, p))
    ];
  }

  _onDown(ev) {
    if (!this._accepts(ev)) return;
    if (ev.button > 0) return;
    const layer = this.activeLayer;
    const t = this.getTool();

    // The eraser button on the back of a stylus always erases.
    const eraserButton = ev.buttons === 32 || ev.button === 5;
    const mode = eraserButton ? 'eraser' : t.mode;

    if (layer.locked && mode !== 'lasso') {
      this.onSelection({ locked: true });
      return;
    }

    this.canvas.setPointerCapture(ev.pointerId);
    const pt = this._pt(ev);

    if (mode === 'eraser') {
      this.erasing = { before: layer.strokes.slice(), last: pt, touched: false };
      this._eraseAt(pt, pt, pt[2]);
      return;
    }

    if (mode === 'lasso') {
      if (this.selection.length && this._insideSelection(pt)) {
        this.dragFrom = pt;
        this.dragBefore = layer.strokes.slice();
        this.dragMoved = false;
      } else {
        this.selection = [];
        this.lasso = [pt];
        this.onSelection({ count: 0 });
      }
      this.render();
      return;
    }

    this.drawing = {
      id: nextId(),
      pen: t.pen,
      shape: mode === 'shape' ? t.shape : null,
      color: t.color,
      size: t.size,
      opacity: t.opacity,
      pts: [pt]
    };
    this.render();
  }

  _onMove(ev) {
    if (!this._accepts(ev)) return;

    if (this.erasing) {
      const events = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      for (const e of events) {
        const p = this._pt(e);
        this._eraseAt(this.erasing.last, p, p[2]);
        this.erasing.last = p;
      }
      return;
    }

    if (this.dragFrom) {
      const pt = this._pt(ev);
      this._moveSelection(pt[0] - this.dragFrom[0], pt[1] - this.dragFrom[1]);
      this.dragFrom = pt;
      this.dragMoved = true;
      this.render();
      return;
    }

    if (this.lasso) {
      this.lasso.push(this._pt(ev));
      this.render();
      return;
    }

    if (!this.drawing) return;

    if (this.drawing.shape) {
      this.drawing.pts[1] = this._pt(ev);
    } else {
      const events = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev];
      for (const e of events) this.drawing.pts.push(this._pt(e));
      if (this.getTool().straight) this.drawing.pts = [this.drawing.pts[0], this.drawing.pts[this.drawing.pts.length - 1]];
    }
    this.render(true);
  }

  _onUp(ev) {
    if (ev.pointerId !== undefined && this.canvas.hasPointerCapture &&
        this.canvas.hasPointerCapture(ev.pointerId)) {
      this.canvas.releasePointerCapture(ev.pointerId);
    }
    const layer = this.activeLayer;

    if (this.erasing) {
      const { before, touched } = this.erasing;
      this.erasing = null;
      if (touched) this._commit(layer, before);
      this.render();
      return;
    }

    if (this.dragFrom) {
      this.dragFrom = null;
      if (this.dragMoved) this._commit(layer, this.dragBefore);
      this.dragBefore = null;
      return;
    }

    if (this.lasso) {
      this.selection = this._strokesInside(this.lasso);
      this.lasso = null;
      this.onSelection({ count: this.selection.length });
      this.render();
      return;
    }

    if (!this.drawing) return;
    const stroke = this.drawing;
    this.drawing = null;

    if (!stroke.shape) {
      if (stroke.pts.length === 1) stroke.pts.push(stroke.pts[0].slice());
      if (this.getSettings().smooth && PENS[stroke.pen] && stroke.pts.length > 3) {
        stroke.pts = smooth(stroke.pts);
      }
    } else if (stroke.pts.length < 2) {
      this.render();
      return;
    }
    stroke.pts = stroke.pts.map(p => [round(p[0]), round(p[1]), Math.round(p[2] * 100) / 100]);

    const before = layer.strokes.slice();
    layer.strokes.push(stroke);
    this._commit(layer, before);
    this.render();
  }

  /* ───────────────────────── Bearbeiten ───────────────────────── */

  /** Records an undo step for `layer` given its previous stroke list. */
  _commit(layer, before) {
    this.undoStack.push({ layerId: layer.id, before, after: layer.strokes.slice() });
    if (this.undoStack.length > UNDO_LIMIT) this.undoStack.shift();
    this.redoStack.length = 0;
    this.onChange();
  }

  _layerById(id) {
    return this.layers.find(l => l.id === id) || this.activeLayer;
  }

  /**
   * Erases along the segment from → to. In "pressure" mode the radius follows
   * the stylus and strokes are cut apart; in "stroke" mode whole strokes go.
   */
  _eraseAt(from, to, pressure) {
    const t = this.getTool();
    const layer = this.activeLayer;
    const radius = t.eraserMode === 'pressure'
      ? Math.max(3, t.size * (0.5 + 1.6 * pressure))
      : Math.max(6, t.size);

    const next = [];
    let changed = false;

    for (const stroke of layer.strokes) {
      const box = strokeBounds(stroke);
      if (!boxNearSegment(box, from, to, radius)) { next.push(stroke); continue; }

      if (t.eraserMode !== 'pressure' || stroke.shape) {
        if (strokeHitsSegment(stroke, from, to, radius)) { changed = true; continue; }
        next.push(stroke);
        continue;
      }

      const pieces = splitStroke(stroke, from, to, radius);
      if (pieces === null) { next.push(stroke); continue; }
      changed = true;
      pieces.forEach(p => next.push(p));
    }

    if (changed) {
      layer.strokes = next;
      this.erasing.touched = true;
      this.render();
    }
  }

  _strokesInside(loop) {
    if (loop.length < 3) return [];
    return this.activeLayer.strokes
      .filter(s => s.pts.every(p => pointInPolygon(p, loop)))
      .map(s => s.id);
  }

  _insideSelection(pt) {
    const box = this.selectionBox();
    if (!box) return false;
    return pt[0] >= box.x - 10 && pt[0] <= box.x + box.w + 10 &&
           pt[1] >= box.y - 10 && pt[1] <= box.y + box.h + 10;
  }

  selectionBox() {
    if (!this.selection.length) return null;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of this.activeLayer.strokes) {
      if (!this.selection.includes(s.id)) continue;
      const b = strokeBounds(s);
      x0 = Math.min(x0, b.x); y0 = Math.min(y0, b.y);
      x1 = Math.max(x1, b.x + b.w); y1 = Math.max(y1, b.y + b.h);
    }
    return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  _moveSelection(dx, dy) {
    for (const s of this.activeLayer.strokes) {
      if (!this.selection.includes(s.id)) continue;
      s.pts = s.pts.map(p => [round(p[0] + dx), round(p[1] + dy), p[2]]);
    }
  }

  /** Applies a change to every selected stroke, e.g. a new colour. */
  restyleSelection(patch) {
    if (!this.selection.length) return;
    const layer = this.activeLayer;
    const before = layer.strokes.slice();
    layer.strokes = layer.strokes.map(s =>
      this.selection.includes(s.id) ? Object.assign({}, s, patch) : s);
    this.selection = layer.strokes.filter(s => this.selection.includes(s.id)).map(s => s.id);
    this._commit(layer, before);
    this.render();
  }

  duplicateSelection() {
    if (!this.selection.length) return;
    const layer = this.activeLayer;
    const before = layer.strokes.slice();
    const copies = layer.strokes
      .filter(s => this.selection.includes(s.id))
      .map(s => Object.assign({}, s, {
        id: nextId(),
        pts: s.pts.map(p => [p[0] + 16, p[1] + 16, p[2]])
      }));
    layer.strokes = layer.strokes.concat(copies);
    this.selection = copies.map(s => s.id);
    this._commit(layer, before);
    this.render();
  }

  deleteSelection() {
    if (!this.selection.length) return;
    const layer = this.activeLayer;
    const before = layer.strokes.slice();
    layer.strokes = layer.strokes.filter(s => !this.selection.includes(s.id));
    this.selection = [];
    this.onSelection({ count: 0 });
    this._commit(layer, before);
    this.render();
  }

  clearSelection() {
    if (!this.selection.length) return;
    this.selection = [];
    this.onSelection({ count: 0 });
    this.render();
  }

  clearLayer() {
    const layer = this.activeLayer;
    if (!layer.strokes.length) return;
    const before = layer.strokes.slice();
    layer.strokes = [];
    this._commit(layer, before);
    this.render();
  }

  undo() {
    const op = this.undoStack.pop();
    if (!op) return false;
    const layer = this._layerById(op.layerId);
    layer.strokes = op.before.slice();
    this.redoStack.push(op);
    this.selection = [];
    this.onChange();
    this.render();
    return true;
  }

  redo() {
    const op = this.redoStack.pop();
    if (!op) return false;
    const layer = this._layerById(op.layerId);
    layer.strokes = op.after.slice();
    this.undoStack.push(op);
    this.selection = [];
    this.onChange();
    this.render();
    return true;
  }

  get canUndo() { return this.undoStack.length > 0; }
  get canRedo() { return this.redoStack.length > 0; }

  /* ───────────────────────── Zeichnen ───────────────────────── */

  render(preview = false) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const k = this.scale * this.dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);

    const active = this.activeLayer;
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      ctx.save();
      if (this.getSettings().dimInactiveLayers && layer !== active) ctx.globalAlpha = 0.45;
      for (const s of layer.strokes) drawStroke(ctx, s, preview);
      ctx.restore();
    }
    if (this.drawing) drawStroke(ctx, this.drawing, preview);

    if (this.lasso && this.lasso.length > 1) this._drawLasso(ctx);
    const box = this.selectionBox();
    if (box) this._drawSelection(ctx, box);
  }

  _drawLasso(ctx) {
    ctx.save();
    ctx.strokeStyle = '#3b6cff';
    ctx.lineWidth = 1.5 / this.scale;
    ctx.setLineDash([6 / this.scale, 4 / this.scale]);
    ctx.beginPath();
    ctx.moveTo(this.lasso[0][0], this.lasso[0][1]);
    for (const p of this.lasso.slice(1)) ctx.lineTo(p[0], p[1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  _drawSelection(ctx, box) {
    ctx.save();
    ctx.strokeStyle = '#3b6cff';
    ctx.fillStyle = 'rgba(59,108,255,0.08)';
    ctx.lineWidth = 1.5 / this.scale;
    ctx.setLineDash([5 / this.scale, 4 / this.scale]);
    const pad = 6;
    ctx.fillRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
    ctx.strokeRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2);
    ctx.restore();
  }

  /** Paints every visible layer into another context (OCR, export). */
  drawInto(ctx, scale = 1) {
    ctx.save();
    ctx.scale(scale, scale);
    for (const layer of this.layers) {
      if (!layer.visible) continue;
      for (const s of layer.strokes) drawStroke(ctx, s, false);
    }
    ctx.restore();
  }
}

/* ───────────────────────── Geometrie ───────────────────────── */

const round = n => Math.round(n * 10) / 10;

function smooth(pts) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    out.push([(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4, b[2]]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function distToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  let t = len ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function boxNearSegment(box, a, b, r) {
  const minX = Math.min(a[0], b[0]) - r;
  const maxX = Math.max(a[0], b[0]) + r;
  const minY = Math.min(a[1], b[1]) - r;
  const maxY = Math.max(a[1], b[1]) + r;
  return !(box.x > maxX || box.x + box.w < minX || box.y > maxY || box.y + box.h < minY);
}

function strokeHitsSegment(stroke, from, to, r) {
  const reach = r + (stroke.size || 2) / 2;
  for (let i = 0; i < stroke.pts.length; i++) {
    if (distToSegment(stroke.pts[i], from, to) <= reach) return true;
    if (i > 0 && distToSegment(from, stroke.pts[i - 1], stroke.pts[i]) <= reach) return true;
  }
  return false;
}

/**
 * Removes the points of `stroke` that the eraser touched and returns the
 * remaining pieces, or null when nothing was hit.
 */
function splitStroke(stroke, from, to, r) {
  const reach = r + (stroke.size || 2) / 2;
  const keep = stroke.pts.map(p => distToSegment(p, from, to) > reach);
  if (keep.every(Boolean)) return null;

  const pieces = [];
  let run = [];
  stroke.pts.forEach((p, i) => {
    if (keep[i]) {
      run.push(p);
    } else if (run.length) {
      pieces.push(run);
      run = [];
    }
  });
  if (run.length) pieces.push(run);

  return pieces
    .filter(run2 => run2.length > 1)
    .map((pts, i) => Object.assign({}, stroke, { id: stroke.id + '_' + i, pts }));
}

function pointInPolygon(p, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const hits = (yi > p[1]) !== (yj > p[1]) &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi || 1e-9) + xi;
    if (hits) inside = !inside;
  }
  return inside;
}
