/**
 * App state: folders, notes, the open note and its pages.
 *
 * Notes stay in memory in full (PDFs and audio live in the `assets` store, so
 * a note document stays small) and are written back debounced — drawing a
 * stroke must not cause a database write per pointer event.
 */

import * as db from './db.js';

export const PAGE_W = 794;   // A4 at 96 dpi
export const PAGE_H = 1123;

const DEFAULT_SETTINGS = {
  provider: 'local',
  apiKey: '',
  model: '',
  baseUrl: '',
  penOnly: false,
  pressure: true,
  smooth: true,
  dimInactiveLayers: false,
  autoVersions: true,
  theme: 'auto',
  zoom: 1,
  eraserSize: 14,
  lastNoteId: null,
  pen: 'fountain',
  palette: 'Klassisch',
  tools: {}          // per-pen { color, size, opacity }
};

export const state = {
  folders: [],
  notes: [],
  note: null,
  pageIndex: 0,
  folderId: null,
  query: '',
  settings: Object.assign({}, DEFAULT_SETTINGS),
  saving: false
};

const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, detail) {
  const set = listeners.get(event);
  if (set) set.forEach(fn => fn(detail));
}

export function uid(prefix = 'id') {
  return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* ─────────────────────────── Laden ─────────────────────────── */

export async function load() {
  const [folders, notes, settings] = await Promise.all([
    db.getAll('folders'),
    db.getAll('notes'),
    db.loadSettings(DEFAULT_SETTINGS)
  ]);
  state.folders = folders.sort((a, b) => (a.order || 0) - (b.order || 0) || a.createdAt - b.createdAt);
  state.notes = notes.map(migrate).sort((a, b) => b.updatedAt - a.updatedAt);
  state.settings = Object.assign({}, DEFAULT_SETTINGS, settings);
  db.persist();
  emit('loaded');
}

/** Brings notes written by older versions up to the current shape. */
function migrate(note) {
  note.pages = note.pages || [];
  note.pages.forEach(page => {
    page.w = page.w || PAGE_W;
    page.h = page.h || PAGE_H;
    page.template = page.template || page.bg || 'lines';
    page.activeLayer = page.activeLayer || 0;
    if (!page.layers) {
      page.layers = [newLayer('Ebene 1', page.strokes || [])];
    }
    page.layers.forEach(l => { l.strokes = l.strokes || []; });
    delete page.strokes;
    if (typeof page.text !== 'string') page.text = '';
  });
  note.chat = note.chat || [];
  note.tags = note.tags || [];
  note.versions = note.versions || [];
  note.color = note.color || null;
  note.icon = note.icon || null;
  return note;
}

export function newLayer(name, strokes = []) {
  return { id: uid('ly'), name, visible: true, locked: false, strokes };
}

/* ─────────────────────────── Speichern ─────────────────────────── */

const pending = new Set();
let saveTimer = null;

export function touch(note = state.note, immediate = false) {
  if (!note) return Promise.resolve();
  note.updatedAt = Date.now();
  pending.add(note.id);
  state.saving = true;
  emit('dirty');
  if (immediate) return flush();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 600);
  return Promise.resolve();
}

export async function flush() {
  clearTimeout(saveTimer);
  if (!pending.size) {
    state.saving = false;
    emit('saved');
    return;
  }
  const ids = Array.from(pending);
  pending.clear();
  const docs = ids.map(id => state.notes.find(n => n.id === id)).filter(Boolean);
  try {
    await db.putMany('notes', docs.map(serialize));
    state.saving = false;
    emit('saved');
  } catch (err) {
    state.saving = false;
    emit('save-error', err);
  }
}

function serialize(note) {
  const copy = Object.assign({}, note);
  copy.pages = note.pages.map(p => ({
    id: p.id,
    template: p.template,
    w: p.w,
    h: p.h,
    text: p.text,
    activeLayer: p.activeLayer || 0,
    layers: p.layers.map(l => ({
      id: l.id, name: l.name, visible: l.visible, locked: l.locked, strokes: l.strokes
    })),
    pdfPage: p.pdfPage || null,
    pdfText: p.pdfText || '',
    ocrText: p.ocrText || ''
  }));
  return copy;
}

window.addEventListener('beforeunload', () => { if (pending.size) flush(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

/* ─────────────────────────── Ordner ─────────────────────────── */

export async function createFolder(name, color) {
  const folder = {
    id: uid('fld'),
    name: name || 'Neuer Ordner',
    color: color || null,
    parentId: null,
    order: state.folders.length,
    createdAt: Date.now()
  };
  state.folders.push(folder);
  await db.put('folders', folder);
  emit('folders');
  return folder;
}

export async function updateFolder(id, patch) {
  const f = state.folders.find(x => x.id === id);
  if (!f) return;
  Object.assign(f, patch);
  await db.put('folders', f);
  emit('folders');
}

export async function moveFolder(id, delta) {
  const i = state.folders.findIndex(f => f.id === id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= state.folders.length) return;
  const [f] = state.folders.splice(i, 1);
  state.folders.splice(j, 0, f);
  state.folders.forEach((folder, index) => { folder.order = index; });
  await db.putMany('folders', state.folders);
  emit('folders');
}

/** Notes inside a deleted folder move back to the inbox instead of vanishing. */
export async function deleteFolder(id) {
  state.folders = state.folders.filter(f => f.id !== id);
  await db.del('folders', id);
  const affected = state.notes.filter(n => n.folderId === id);
  affected.forEach(n => { n.folderId = null; n.updatedAt = Date.now(); });
  if (affected.length) await db.putMany('notes', affected.map(serialize));
  if (state.folderId === id) state.folderId = null;
  emit('folders');
  emit('notes');
}

/* ─────────────────────────── Seiten ─────────────────────────── */

export function blankPage(overrides = {}) {
  const page = Object.assign({
    id: uid('pg'),
    template: 'lines',
    w: PAGE_W,
    h: PAGE_H,
    text: '',
    activeLayer: 0,
    pdfPage: null,
    pdfText: '',
    ocrText: ''
  }, overrides);
  page.layers = overrides.layers || [newLayer('Ebene 1')];
  return page;
}

/** "Seite erweitern" — makes the sheet taller without touching what is on it. */
export function extendPage(page, by = 400) {
  page.h += by;
  return page;
}

export function addLayer(page, name) {
  page.layers.push(newLayer(name || `Ebene ${page.layers.length + 1}`));
  page.activeLayer = page.layers.length - 1;
}

export function removeLayer(page, index) {
  if (page.layers.length <= 1) return false;
  page.layers.splice(index, 1);
  page.activeLayer = Math.max(0, Math.min(page.activeLayer, page.layers.length - 1));
  return true;
}

export function moveLayer(page, index, delta) {
  const j = index + delta;
  if (j < 0 || j >= page.layers.length) return false;
  const [l] = page.layers.splice(index, 1);
  page.layers.splice(j, 0, l);
  page.activeLayer = j;
  return true;
}

export function mergeLayerDown(page, index) {
  if (index <= 0) return false;
  const upper = page.layers[index];
  const lower = page.layers[index - 1];
  lower.strokes = lower.strokes.concat(upper.strokes);
  page.layers.splice(index, 1);
  page.activeLayer = index - 1;
  return true;
}

/* ─────────────────────────── Notizen ─────────────────────────── */

export async function createNote(fields = {}) {
  const now = Date.now();
  const note = Object.assign({
    id: uid('note'),
    folderId: state.folderId && !String(state.folderId).startsWith('__') ? state.folderId : null,
    title: '',
    kind: 'note',
    assetId: null,
    starred: false,
    tags: [],
    icon: null,
    color: null,
    createdAt: now,
    updatedAt: now,
    pages: [blankPage()],
    chat: [],
    versions: [],
    summary: null
  }, fields);
  state.notes.unshift(note);
  await db.put('notes', serialize(note));
  emit('notes');
  return note;
}

export async function duplicateNote(id) {
  const src = state.notes.find(n => n.id === id);
  if (!src) return null;
  const copy = JSON.parse(JSON.stringify(serialize(src)));
  copy.id = uid('note');
  copy.title = (noteTitle(src) + ' (Kopie)').slice(0, 90);
  copy.createdAt = copy.updatedAt = Date.now();
  copy.versions = [];
  copy.pages.forEach(p => {
    p.id = uid('pg');
    p.layers.forEach(l => { l.id = uid('ly'); });
  });
  state.notes.unshift(migrate(copy));
  await db.put('notes', copy);
  emit('notes');
  return copy;
}

export async function deleteNote(id) {
  const note = state.notes.find(n => n.id === id);
  state.notes = state.notes.filter(n => n.id !== id);
  await db.del('notes', id);
  if (note && note.assetId) await db.del('assets', note.assetId).catch(() => {});
  if (state.note && state.note.id === id) {
    state.note = null;
    state.pageIndex = 0;
  }
  emit('notes');
  emit('note-changed');
}

export function openNote(id) {
  const note = state.notes.find(n => n.id === id) || null;
  state.note = note;
  state.pageIndex = 0;
  emit('note-changed');
  return note;
}

export function visibleNotes() {
  const q = state.query.trim().toLowerCase();
  let list = state.notes;
  if (state.folderId === '__starred') list = list.filter(n => n.starred);
  else if (state.folderId && String(state.folderId).startsWith('__tag:')) {
    const tag = state.folderId.slice(6);
    list = list.filter(n => n.tags.includes(tag));
  } else if (state.folderId) list = list.filter(n => n.folderId === state.folderId);

  if (q) {
    list = list.filter(n =>
      (n.title || '').toLowerCase().includes(q) ||
      n.tags.some(t => t.toLowerCase().includes(q)) ||
      noteText(n).toLowerCase().includes(q));
  }
  return list.slice().sort((a, b) => (b.starred - a.starred) || (b.updatedAt - a.updatedAt));
}

export function allTags() {
  const counts = new Map();
  state.notes.forEach(n => n.tags.forEach(t => counts.set(t, (counts.get(t) || 0) + 1)));
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

/* ─────────────────────────── Versionen ─────────────────────────── */

const VERSION_LIMIT = 15;

/** Stores a snapshot of the pages, skipping one when nothing changed. */
export function snapshot(note = state.note, label = '') {
  if (!note) return null;
  const data = JSON.stringify(serialize(note).pages);
  const last = note.versions[note.versions.length - 1];
  if (last && last.data === data) return null;
  const version = { id: uid('ver'), ts: Date.now(), label, data };
  note.versions.push(version);
  while (note.versions.length > VERSION_LIMIT) note.versions.shift();
  touch(note);
  return version;
}

export function restoreVersion(note, versionId) {
  const version = note.versions.find(v => v.id === versionId);
  if (!version) return false;
  snapshot(note, 'vor Wiederherstellung');
  note.pages = JSON.parse(version.data);
  migrate(note);
  touch(note, true);
  emit('note-changed');
  return true;
}

/* ─────────────────────────── Text ─────────────────────────── */

const stripper = document.createElement('div');

export function htmlToText(html) {
  stripper.innerHTML = html || '';
  stripper.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  const text = stripper.innerText || stripper.textContent || '';
  stripper.innerHTML = '';
  return text;
}

export function noteText(note = state.note) {
  if (!note) return '';
  return note.pages
    .map(p => [htmlToText(p.text), p.ocrText || '', p.pdfText || ''].filter(Boolean).join('\n'))
    .join('\n\n')
    .trim();
}

export function noteTitle(note) {
  if (note.title && note.title.trim()) return note.title.trim();
  const first = htmlToText(note.pages[0] ? note.pages[0].text : '').trim().split('\n')[0];
  return first ? first.slice(0, 60) : 'Ohne Titel';
}

/* ─────────────────────────── Einstellungen ─────────────────────────── */

export async function saveSettings(patch) {
  Object.assign(state.settings, patch);
  await db.saveSettings(state.settings);
  emit('settings');
}
