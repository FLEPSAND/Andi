/**
 * Andi Notes — wiring.
 *
 * Keeps the DOM in step with the store: sidebar, pages, toolbars, the side
 * panel and the keyboard. Anything with a heavy dependency (PDF, OCR) loads
 * lazily from its own module, so the app starts fast and works offline.
 */

import * as store from './store.js';
import * as db from './db.js';
import { InkLayer } from './ink.js';
import { PENS, SHAPES, PALETTES, drawStroke } from './pens.js';
import { TEMPLATES, TEMPLATE_GROUPS, applyTemplate } from './templates.js';
import { createProvider, TASK_LABELS } from './ai.js';
import * as pdfview from './pdfview.js';
import { recognize } from './ocr.js';
import * as exporter from './export.js';
import { VideoBox } from './pip.js';
import { Recorder, LiveTranscriber, transcriptionSupported, formatDuration } from './audio.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const app = $('#app');
const pagesEl = $('#pages');

const NOTE_ICONS = ['📄', '📚', '🧮', '🔬', '🎨', '🎼', '🏃', '🌍', '🧪', '📐', '✏️', '⭐', '💡', '❤️', '🐱', '🌸', '🚀', '🍀'];
const NOTE_COLORS = ['#3b6cff', '#e5484d', '#12a150', '#f5a524', '#8b5cf6', '#ff6fae', '#00b8b8', null];

const tool = {
  mode: 'pen',
  pen: 'fountain',
  shape: 'line',
  color: PENS.fountain.defaults.color,
  size: PENS.fountain.defaults.size,
  opacity: 1,
  eraserMode: 'pressure',
  straight: false
};

const inkLayers = new Map();
const renderedPdf = new Set();
let provider = null;
let pdfDocPromise = null;
let lastOcrText = '';
let videoBox = null;
let pageObserver = null;
let recorder = null;
let transcriber = null;
let recordingNote = null;
let autoVersionTimer = null;

/* ═════════════════════════ Start ═════════════════════════ */

init().catch(err => {
  console.error(err);
  toast('Start fehlgeschlagen: ' + err.message, 8000);
});

async function init() {
  await store.load();
  provider = createProvider(store.state.settings);
  applyTheme();

  if (!store.state.notes.length) {
    await store.createNote({ title: 'Willkommen', icon: '⭐', pages: [store.blankPage({ text: WELCOME })] });
  }

  buildPenRack();
  buildShapeMenu();
  buildPalettes();
  buildTemplateDialog();
  buildIconDialog();

  bindSidebar();
  bindTopbar();
  bindTextToolbar();
  bindDrawToolbar();
  bindSelectionBar();
  bindMenu();
  bindPanel();
  bindAudio();
  bindVideo();
  bindSettings();
  bindKeyboard();

  store.on('notes', renderNoteList);
  store.on('folders', () => { renderFolders(); renderNoteList(); });
  store.on('note-changed', renderNote);
  store.on('dirty', () => setSaveState('speichert…'));
  store.on('saved', () => setSaveState('gespeichert'));
  store.on('save-error', e => setSaveState('Fehler: ' + e.message));
  store.on('settings', () => {
    provider = createProvider(store.state.settings);
    $('#provider-badge').textContent = provider.label;
    applyTheme();
  });

  renderFolders();
  renderNoteList();

  const last = store.state.settings.lastNoteId;
  const target = store.state.notes.find(n => n.id === last) || store.state.notes[0];
  store.openNote(target.id);

  setMode('text');
  selectPen(store.state.settings.pen || 'fountain');
  startAutoVersions();
  registerServiceWorker();

  window.addEventListener('resize', debounce(() => inkLayers.forEach(l => l.resize()), 150));
}

const WELCOME = `<h1>Hallo!</h1>
<p>Oben umschalten zwischen <b>Text</b> und <b>Zeichnen</b>. Im Zeichenmodus liegen neun Stifte bereit — Füller, Kugelschreiber, Fineliner, Bleistift, Pinsel, Textmarker, Wachsmaler, Neon und eine gestrichelte Linie. Jeder merkt sich seine eigene Farbe, Dicke und Deckkraft.</p>
<ul>
<li><b>Ebenen</b> — Skizze unten, saubere Linien oben, einzeln ein- und ausblenden.</li>
<li><b>Vorlagen</b> — kariert, Schreiblinien, Notenlinien, Cornell, Wochenplan, Storyboard.</li>
<li><b>Ordner und Schlagwörter</b> — links sortieren, oben suchen.</li>
<li><b>🎙 Aufnahme</b> mit Live-Mitschrift, <b>▶ Video</b> im Bild-in-Bild, <b>PDF</b> zum Draufschreiben.</li>
<li><b>KI</b> fasst zusammen, zieht Aufgaben heraus und macht Lernfragen.</li>
</ul>
<p>Alles bleibt auf diesem Gerät. Sicherung über <i>⋯ → Backup</i>.</p>`;

/* ═════════════════════════ Seitenleiste ═════════════════════════ */

function bindSidebar() {
  $('#btn-new-note').addEventListener('click', async () => {
    const note = await store.createNote();
    store.openNote(note.id);
    renderNoteList();
    $('#note-title').focus();
    closeSidebarOnNarrow();
  });

  $('#btn-new-folder').addEventListener('click', async () => {
    const name = prompt('Name des Ordners');
    if (name && name.trim()) await store.createFolder(name.trim());
  });

  $('#btn-import-pdf').addEventListener('click', () => $('#file-pdf').click());
  $('#file-pdf').addEventListener('change', ev => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (file) importPdf(file);
  });

  $('#btn-settings').addEventListener('click', openSettings);
  $('#btn-open-settings').addEventListener('click', openSettings);
  $('#btn-sidebar-close').addEventListener('click', () => app.classList.remove('sidebar-open'));
  $('#btn-sidebar-open').addEventListener('click', () => app.classList.add('sidebar-open'));

  $('#q').addEventListener('input', ev => {
    store.state.query = ev.target.value;
    renderNoteList();
  });
}

function renderFolders() {
  const { folders, folderId } = store.state;
  const rows = [
    { id: null, name: 'Alle Notizen', fixed: true, icon: '🗂' },
    { id: '__starred', name: 'Favoriten', fixed: true, icon: '★' }
  ].concat(folders);

  const list = $('#folders');
  list.innerHTML = '';

  rows.forEach((row, index) => {
    const el = document.createElement('div');
    el.className = 'folder' + (row.id === folderId ? ' active' : '');
    if (row.color) el.style.setProperty('--folder-color', row.color);

    const icon = document.createElement('span');
    icon.className = 'folder-icon';
    icon.textContent = row.icon || '📁';

    const name = document.createElement('span');
    name.className = 'folder-name';
    name.textContent = row.name;

    const count = document.createElement('span');
    count.className = 'count';
    const n = store.state.notes.filter(note =>
      row.id === '__starred' ? note.starred : (row.id === null ? true : note.folderId === row.id)).length;
    count.textContent = n || '';

    el.append(icon, name, count);

    if (!row.fixed) {
      el.appendChild(rowButton('✎', 'Umbenennen', async ev => {
        ev.stopPropagation();
        const next = prompt('Neuer Name', row.name);
        if (next && next.trim()) await store.updateFolder(row.id, { name: next.trim() });
      }));
      el.appendChild(rowButton('↑', 'Nach oben', ev => {
        ev.stopPropagation();
        store.moveFolder(row.id, -1);
      }));
      el.appendChild(rowButton('✕', 'Ordner löschen (Notizen bleiben)', async ev => {
        ev.stopPropagation();
        if (confirm(`Ordner „${row.name}" löschen? Die Notizen darin bleiben erhalten.`)) {
          await store.deleteFolder(row.id);
        }
      }));

      el.addEventListener('dragover', ev => { ev.preventDefault(); el.classList.add('drop'); });
      el.addEventListener('dragleave', () => el.classList.remove('drop'));
      el.addEventListener('drop', async ev => {
        ev.preventDefault();
        el.classList.remove('drop');
        const noteId = ev.dataTransfer.getData('text/note-id');
        const note = store.state.notes.find(x => x.id === noteId);
        if (!note) return;
        note.folderId = row.id;
        await store.touch(note, true);
        renderFolders();
        renderNoteList();
        toast(`Verschoben nach „${row.name}".`);
      });
    }

    el.addEventListener('click', () => {
      store.state.folderId = row.id;
      renderFolders();
      renderNoteList();
    });
    list.appendChild(el);
    void index;
  });

  renderTags();
}

function rowButton(label, title, onClick) {
  const b = document.createElement('button');
  b.className = 'row-btn';
  b.textContent = label;
  b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

function renderTags() {
  const tags = store.allTags();
  $('#tags-head').hidden = !tags.length;
  const cloud = $('#tagcloud');
  cloud.innerHTML = '';
  tags.forEach(([tag, count]) => {
    const b = document.createElement('button');
    b.className = 'tag' + (store.state.folderId === '__tag:' + tag ? ' active' : '');
    b.textContent = `#${tag} ${count}`;
    b.addEventListener('click', () => {
      store.state.folderId = store.state.folderId === '__tag:' + tag ? null : '__tag:' + tag;
      renderFolders();
      renderNoteList();
    });
    cloud.appendChild(b);
  });
}

function renderNoteList() {
  const notes = store.visibleNotes();
  $('#notelist-count').textContent = notes.length;
  const list = $('#notelist');
  list.innerHTML = '';

  if (!notes.length) {
    const empty = document.createElement('p');
    empty.className = 'muted pad';
    empty.textContent = store.state.query ? 'Nichts gefunden.' : 'Noch keine Notiz hier.';
    list.appendChild(empty);
    return;
  }

  notes.forEach(note => {
    const el = document.createElement('div');
    el.className = 'note-row' + (store.state.note && note.id === store.state.note.id ? ' active' : '');
    el.draggable = true;
    if (note.color) el.style.setProperty('--note-color', note.color);

    const head = document.createElement('span');
    head.className = 'note-title';
    head.textContent = `${note.icon || (note.kind === 'pdf' ? '📕' : '📄')} ${note.starred ? '★ ' : ''}${store.noteTitle(note)}`;

    const preview = document.createElement('span');
    preview.className = 'note-preview';
    preview.textContent = store.noteText(note).replace(/\s+/g, ' ').slice(0, 90);

    const meta = document.createElement('span');
    meta.className = 'note-meta';
    meta.textContent = `${relativeTime(note.updatedAt)} · ${note.pages.length} S.` +
      (note.tags.length ? ' · ' + note.tags.map(t => '#' + t).join(' ') : '');

    el.append(head, preview, meta);
    el.addEventListener('click', () => {
      store.openNote(note.id);
      renderNoteList();
      closeSidebarOnNarrow();
    });
    el.addEventListener('dragstart', ev => ev.dataTransfer.setData('text/note-id', note.id));
    list.appendChild(el);
  });
}

function closeSidebarOnNarrow() {
  if (window.matchMedia('(max-width: 900px)').matches) app.classList.remove('sidebar-open');
}

/* ═════════════════════════ Notiz rendern ═════════════════════════ */

function renderNote() {
  const note = store.state.note;
  inkLayers.forEach(l => l.destroy());
  inkLayers.clear();
  renderedPdf.clear();
  if (pageObserver) pageObserver.disconnect();
  pagesEl.innerHTML = '';
  pdfDocPromise = null;
  hideSelectionBar();

  if (!note) {
    $('#note-title').value = '';
    $('#page-info').textContent = '–';
    return;
  }

  store.saveSettings({ lastNoteId: note.id });
  $('#note-title').value = note.title || '';
  $('#btn-note-icon').textContent = note.icon || (note.kind === 'pdf' ? '📕' : '📄');
  $('#btn-star').textContent = note.starred ? '★' : '☆';
  $('#btn-star').classList.toggle('on', !!note.starred);

  pageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const page = note.pages[Number(el.dataset.index)];
      if (!page) return;
      ensureInk(el, page);
      ensurePdf(el, page, note);
      store.state.pageIndex = Number(el.dataset.index);
      updatePageInfo();
    });
  }, { root: pagesEl, rootMargin: '300px 0px', threshold: 0.05 });

  note.pages.forEach((page, index) => pagesEl.appendChild(buildPage(page, index, note)));
  updatePageInfo();
  renderChat();
  renderVersions();
  renderRecordings();
  $('#ai-out').innerHTML = '<p class="muted">Grundlage ist der Text der Notiz.</p>';
  $('#ocr-out').textContent = '';
  $('#btn-ocr-insert').hidden = true;
}

function buildPage(page, index, note) {
  const el = document.createElement('section');
  el.className = 'page';
  el.dataset.index = index;
  el.dataset.pageId = page.id;
  el.style.setProperty('--page-ratio', page.w + ' / ' + page.h);

  const pdfCanvas = document.createElement('canvas');
  pdfCanvas.className = 'layer pdf-layer';

  const text = document.createElement('div');
  text.className = 'layer text-layer';
  text.contentEditable = 'true';
  text.spellcheck = true;
  text.innerHTML = page.text || '';

  const ink = document.createElement('canvas');
  ink.className = 'layer ink-layer';

  const num = document.createElement('div');
  num.className = 'page-num';
  num.textContent = index + 1;

  el.append(pdfCanvas, text, ink, num);
  if (note.kind !== 'pdf') applyTemplate(el, page);

  text.addEventListener('input', () => {
    page.text = text.innerHTML;
    autoGrow(el, page, text);
    store.touch();
    scheduleListRefresh();
  });
  text.addEventListener('focus', () => {
    store.state.pageIndex = index;
    updatePageInfo();
  });
  text.addEventListener('click', ev => {
    const todo = ev.target.closest('.todo');
    if (!todo) return;
    if (ev.clientX - todo.getBoundingClientRect().left > 28) return;
    todo.dataset.done = todo.dataset.done === 'true' ? 'false' : 'true';
    page.text = text.innerHTML;
    store.touch();
  });

  pageObserver.observe(el);
  requestAnimationFrame(() => autoGrow(el, page, text));
  return el;
}

/**
 * Pages have a fixed size like real paper, and the text layer clips. Rather
 * than silently hiding what someone just wrote, the sheet grows.
 */
function autoGrow(pageEl, page, textEl) {
  if (page.pdfPage) return;                     // a PDF page keeps its size
  if (textEl.scrollHeight <= textEl.clientHeight + 4) return;
  const overflow = textEl.scrollHeight - textEl.clientHeight;
  const scale = pageEl.getBoundingClientRect().width / page.w || 1;
  page.h = Math.round(page.h + overflow / scale + 80);
  pageEl.style.setProperty('--page-ratio', page.w + ' / ' + page.h);
  applyTemplate(pageEl, page);
  const ink = inkLayers.get(page.id);
  if (ink) requestAnimationFrame(() => ink.resize());
}

function ensureInk(pageEl, page) {
  if (inkLayers.has(page.id)) {
    inkLayers.get(page.id).resize();
    return inkLayers.get(page.id);
  }
  const layer = new InkLayer(pageEl.querySelector('.ink-layer'), page, {
    getTool: () => tool,
    getSettings: () => store.state.settings,
    onChange: () => {
      store.touch();
      updateUndoButtons();
      renderLayerList();
    },
    onSelection: info => {
      if (info.locked) return toast('Diese Ebene ist gesperrt.');
      showSelectionBar(info.count);
    }
  });
  inkLayers.set(page.id, layer);
  requestAnimationFrame(() => layer.resize());
  return layer;
}

async function ensurePdf(pageEl, page, note) {
  if (!page.pdfPage || renderedPdf.has(page.id)) return;
  renderedPdf.add(page.id);
  try {
    if (!pdfDocPromise) {
      pdfDocPromise = db.get('assets', note.assetId).then(asset => {
        if (!asset) throw new Error('Die PDF-Datei fehlt in der Ablage.');
        return pdfview.docFor(note.assetId, asset.blob);
      });
    }
    const doc = await pdfDocPromise;
    await pdfview.renderPage(doc, page.pdfPage, pageEl.querySelector('.pdf-layer'));
  } catch (err) {
    renderedPdf.delete(page.id);
    toast('PDF-Seite konnte nicht gezeichnet werden: ' + err.message, 5000);
  }
}

function currentPage() {
  const note = store.state.note;
  if (!note) return null;
  return note.pages[Math.min(store.state.pageIndex, note.pages.length - 1)] || null;
}

function currentInk() {
  const page = currentPage();
  return page ? inkLayers.get(page.id) : null;
}

function currentPageEl() {
  const page = currentPage();
  return page ? pagesEl.querySelector(`[data-page-id="${page.id}"]`) : null;
}

function updatePageInfo() {
  const note = store.state.note;
  if (!note) return;
  $('#page-info').textContent = `Seite ${store.state.pageIndex + 1} von ${note.pages.length}`;
  const page = currentPage();
  const chip = $('#layer-info');
  if (page && page.layers.length > 1) {
    chip.hidden = false;
    chip.textContent = `Ebene ${(page.activeLayer || 0) + 1}/${page.layers.length}`;
  } else {
    chip.hidden = true;
  }
  renderLayerList();
}

const scheduleListRefresh = debounce(renderNoteList, 1200);

/* ═════════════════════════ Topbar ═════════════════════════ */

function bindTopbar() {
  $('#note-title').addEventListener('input', ev => {
    if (!store.state.note) return;
    store.state.note.title = ev.target.value;
    store.touch();
    scheduleListRefresh();
  });

  $$('.mode-btn').forEach(btn => btn.addEventListener('click', () => setMode(btn.dataset.mode)));

  $('#btn-star').addEventListener('click', () => {
    const note = store.state.note;
    if (!note) return;
    note.starred = !note.starred;
    $('#btn-star').textContent = note.starred ? '★' : '☆';
    $('#btn-star').classList.toggle('on', note.starred);
    store.touch();
    renderNoteList();
    renderFolders();
  });

  $('#btn-ai').addEventListener('click', togglePanel);
  $('#btn-ai-close').addEventListener('click', () => { app.dataset.panel = 'closed'; });
  $('#btn-pip').addEventListener('click', () => videoBox.toggle());
  $('#btn-record').addEventListener('click', () => { selectTab('audio'); });
  $('#btn-note-icon').addEventListener('click', () => $('#icon-dialog').showModal());
  $('#btn-layers').addEventListener('click', () => selectTab('layers'));

  $('#btn-zoom-in').addEventListener('click', () => setZoom(currentZoom() + 0.1));
  $('#btn-zoom-out').addEventListener('click', () => setZoom(currentZoom() - 0.1));
  setZoom(currentZoom());
}

function currentZoom() {
  return store.state.settings.zoom || 1;
}

function setZoom(value) {
  const zoom = Math.max(0.5, Math.min(2.5, Math.round(value * 10) / 10));
  pagesEl.style.setProperty('--zoom', zoom);
  $('#zoom-value').textContent = Math.round(zoom * 100) + ' %';
  store.saveSettings({ zoom });
  // The canvases are sized in CSS pixels, so they have to follow the new width.
  setTimeout(() => inkLayers.forEach(l => l.resize()), 60);
}

function setMode(mode) {
  app.dataset.mode = mode;
  $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
  if (mode === 'draw') {
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    const ink = currentInk();
    if (ink) ink.resize();
  } else {
    hideSelectionBar();
    inkLayers.forEach(l => l.clearSelection());
  }
  updateUndoButtons();
}

function togglePanel() {
  app.dataset.panel = app.dataset.panel === 'open' ? 'closed' : 'open';
}

/* ═════════════════════════ Text-Werkzeuge ═════════════════════════ */

function bindTextToolbar() {
  const bar = $('#toolbar-text');
  bar.addEventListener('mousedown', ev => { if (ev.target.closest('button')) ev.preventDefault(); });
  bar.addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    if (btn.dataset.cmd) exec(btn.dataset.cmd);
    else if (btn.dataset.block) exec('formatBlock', btn.dataset.block);
    else if (btn.dataset.act === 'todo') exec('insertHTML', '<div class="todo" data-done="false">&nbsp;</div>');
    else if (btn.dataset.act === 'highlight-text') exec('hiliteColor', '#ffe066');
    else if (btn.dataset.act === 'clear-format') exec('removeFormat');
  });

  const color = $('#text-color');
  color.addEventListener('input', () => {
    $('#text-color-dot').style.background = color.value;
    exec('foreColor', color.value);
  });
  $('#text-color-dot').style.background = color.value;
}

function exec(command, value = null) {
  const el = currentPageEl();
  if (el) {
    const layer = el.querySelector('.text-layer');
    if (document.activeElement !== layer) layer.focus();
  }
  document.execCommand(command, false, value);
  const page = currentPage();
  if (page && el) {
    page.text = el.querySelector('.text-layer').innerHTML;
    store.touch();
  }
}

/* ═════════════════════════ Stifte ═════════════════════════ */

function buildPenRack() {
  const rack = $('#pen-rack');
  rack.innerHTML = '';
  Object.entries(PENS).forEach(([id, pen]) => {
    const b = document.createElement('button');
    b.className = 'pen';
    b.dataset.pen = id;
    b.title = `${pen.label} — ${pen.hint}`;
    b.innerHTML = `<span class="pen-icon">${pen.icon}</span>` +
      `<span class="pen-label">${pen.label}</span>` +
      '<span class="pen-color"></span>';
    b.addEventListener('click', () => selectPen(id));
    rack.appendChild(b);
  });
  paintPenColors();
}

/** Each pen shows the colour it is currently loaded with. */
function paintPenColors() {
  const saved = store.state.settings.tools || {};
  $$('.pen').forEach(b => {
    const id = b.dataset.pen;
    const color = (saved[id] && saved[id].color) || PENS[id].defaults.color;
    const bar = b.querySelector('.pen-color');
    if (bar) bar.style.background = color;
  });
}

function buildShapeMenu() {
  const menu = $('#menu-shapes');
  menu.innerHTML = '';
  Object.entries(SHAPES).forEach(([id, shape]) => {
    const b = document.createElement('button');
    b.textContent = `${shape.icon}  ${shape.label}`;
    b.addEventListener('click', () => {
      tool.shape = id;
      $('#btn-shapes').textContent = shape.icon;
      setToolMode('shape');
      menu.hidden = true;
    });
    menu.appendChild(b);
  });
  $('#btn-shapes').addEventListener('click', ev => {
    ev.stopPropagation();
    if (tool.mode === 'shape') { menu.hidden = !menu.hidden; return; }
    setToolMode('shape');
  });
  $('#btn-shapes').addEventListener('contextmenu', ev => {
    ev.preventDefault();
    menu.hidden = false;
  });
}

function buildPalettes() {
  const select = $('#palette-select');
  select.innerHTML = '';
  Object.keys(PALETTES).forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  });
  select.value = store.state.settings.palette || 'Klassisch';
  select.addEventListener('change', () => {
    store.saveSettings({ palette: select.value });
    renderSwatches();
  });
}

function selectPen(id) {
  if (!PENS[id]) id = 'fountain';
  tool.pen = id;
  const saved = (store.state.settings.tools || {})[id] || {};
  const defaults = PENS[id].defaults;
  tool.color = saved.color || defaults.color;
  tool.size = saved.size || defaults.size;
  tool.opacity = saved.opacity != null ? saved.opacity : defaults.opacity;
  setToolMode('pen');
  store.saveSettings({ pen: id });
  syncToolUi();
  setMode('draw');
}

function setToolMode(mode) {
  tool.mode = mode;
  app.dataset.tool = mode;
  $$('.pen').forEach(b => b.classList.toggle('active', mode === 'pen' && b.dataset.pen === tool.pen));
  $$('[data-mode-tool]').forEach(b => b.classList.toggle('active', b.dataset.modeTool === mode));
  $('#eraser-mode-wrap').hidden = mode !== 'eraser';
  if (mode !== 'lasso') {
    inkLayers.forEach(l => l.clearSelection());
    hideSelectionBar();
  }
  if (mode === 'eraser') {
    tool.size = store.state.settings.eraserSize || 14;
    $('#ink-size').value = tool.size;
  }
  updateSizePreview();
}

function saveToolPrefs() {
  const tools = Object.assign({}, store.state.settings.tools);
  if (tool.mode === 'pen') {
    tools[tool.pen] = { color: tool.color, size: tool.size, opacity: tool.opacity };
    store.saveSettings({ tools });
  } else if (tool.mode === 'eraser') {
    store.saveSettings({ eraserSize: tool.size });
  }
}

function bindDrawToolbar() {
  $$('[data-mode-tool]').forEach(btn => {
    if (btn.id === 'btn-shapes') return;
    btn.addEventListener('click', () => setToolMode(btn.dataset.modeTool));
  });

  $('#ink-color').addEventListener('input', ev => setColor(ev.target.value));
  $('#ink-size').addEventListener('input', ev => {
    tool.size = Number(ev.target.value);
    updateSizePreview();
    saveToolPrefs();
  });
  $('#ink-opacity').addEventListener('input', ev => {
    tool.opacity = Number(ev.target.value);
    updateSizePreview();
    saveToolPrefs();
  });

  $('#pen-only').addEventListener('change', ev => store.saveSettings({ penOnly: ev.target.checked }));
  $('#eraser-pressure').addEventListener('change', ev => {
    tool.eraserMode = ev.target.checked ? 'pressure' : 'stroke';
  });

  $('#btn-undo').addEventListener('click', () => { const i = currentInk(); if (i) i.undo(); updateUndoButtons(); });
  $('#btn-redo').addEventListener('click', () => { const i = currentInk(); if (i) i.redo(); updateUndoButtons(); });
  $('#btn-ocr-page').addEventListener('click', () => { selectTab('ocr'); runOcr(); });

  renderSwatches();
}

function renderSwatches() {
  const palette = PALETTES[store.state.settings.palette] || PALETTES.Klassisch;
  const box = $('#swatches');
  box.innerHTML = '';
  palette.forEach(color => {
    const b = document.createElement('button');
    b.className = 'swatch' + (color.toLowerCase() === String(tool.color).toLowerCase() ? ' active' : '');
    b.style.background = color;
    b.title = color;
    b.addEventListener('click', () => setColor(color));
    box.appendChild(b);
  });
}

function setColor(color) {
  const ink = currentInk();
  if (tool.mode === 'lasso' && ink && ink.selection.length) {
    ink.restyleSelection({ color });
    return;
  }
  tool.color = color;
  syncToolUi();
  saveToolPrefs();
}

function syncToolUi() {
  $('#ink-color').value = normalizeHex(tool.color);
  $('#ink-color-dot').style.background = tool.color;
  $('#ink-size').value = tool.size;
  $('#ink-opacity').value = tool.opacity;
  $('#pen-only').checked = !!store.state.settings.penOnly;
  updateSizePreview();
  renderSwatches();
  paintPenColors();
}

function updateSizePreview() {
  const px = Math.max(3, Math.min(30, tool.size));
  const preview = $('#size-preview');
  preview.style.width = px + 'px';
  preview.style.height = px + 'px';
  preview.style.background = tool.color;
  preview.style.opacity = tool.opacity;
}

function updateUndoButtons() {
  const ink = currentInk();
  $('#btn-undo').disabled = !ink || !ink.canUndo;
  $('#btn-redo').disabled = !ink || !ink.canRedo;
}

function normalizeHex(color) {
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#111318';
}

/* ═════════════════════════ Auswahl ═════════════════════════ */

function bindSelectionBar() {
  $('#selbar').addEventListener('click', ev => {
    const btn = ev.target.closest('[data-sel]');
    if (!btn) return;
    const ink = currentInk();
    if (!ink) return;
    if (btn.dataset.sel === 'dup') ink.duplicateSelection();
    if (btn.dataset.sel === 'del') { ink.deleteSelection(); hideSelectionBar(); }
    if (btn.dataset.sel === 'close') { ink.clearSelection(); hideSelectionBar(); }
  });
  $('#sel-color').addEventListener('input', ev => {
    const ink = currentInk();
    if (ink) ink.restyleSelection({ color: ev.target.value });
    $('#sel-color-dot').style.background = ev.target.value;
  });
}

function showSelectionBar(count) {
  const bar = $('#selbar');
  if (!count) return hideSelectionBar();
  bar.hidden = false;
  $('#selbar-count').textContent = `${count} ausgewählt`;
}

function hideSelectionBar() {
  $('#selbar').hidden = true;
}

/* ═════════════════════════ Menü ═════════════════════════ */

function bindMenu() {
  $('#btn-more').addEventListener('click', ev => {
    ev.stopPropagation();
    $('#menu-more').hidden = !$('#menu-more').hidden;
  });
  document.addEventListener('click', () => {
    $('#menu-more').hidden = true;
    $('#menu-shapes').hidden = true;
  });
  $('#menu-more').addEventListener('click', ev => {
    const btn = ev.target.closest('button');
    if (!btn) return;
    $('#menu-more').hidden = true;
    menuAction(btn.dataset.act);
  });

  $('#file-restore').addEventListener('change', async ev => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const replace = confirm('Vorhandene Notizen ersetzen? OK = ersetzen, Abbrechen = zusammenführen.');
      const stats = await exporter.restore(json, { replace });
      await store.load();
      renderFolders();
      renderNoteList();
      if (store.state.notes.length) store.openNote(store.state.notes[0].id);
      toast(`${stats.notes} Notizen, ${stats.folders} Ordner, ${stats.assets} Dateien eingespielt.`);
    } catch (err) {
      toast('Backup konnte nicht gelesen werden: ' + err.message, 6000);
    }
  });

  $('#btn-split-close').addEventListener('click', () => {
    $('#splitview').hidden = true;
    app.dataset.split = 'off';
  });
  $('#split-note').addEventListener('change', ev => renderSplit(ev.target.value));
}

async function menuAction(act) {
  const note = store.state.note;
  if (!note) return;
  const index = store.state.pageIndex;
  const page = note.pages[index];

  switch (act) {
    case 'template':
      openTemplateDialog();
      break;

    case 'page-add':
      note.pages.push(store.blankPage({ template: page ? page.template : 'lines' }));
      await store.touch(note, true);
      renderNote();
      pagesEl.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;

    case 'page-extend':
      if (!page) break;
      store.extendPage(page, 400);
      await store.touch(note, true);
      renderNote();
      toast('Seite verlängert.');
      break;

    case 'page-dup': {
      if (!page) break;
      const copy = JSON.parse(JSON.stringify(page));
      copy.id = store.uid('pg');
      copy.layers.forEach(l => { l.id = store.uid('ly'); });
      note.pages.splice(index + 1, 0, copy);
      await store.touch(note, true);
      renderNote();
      break;
    }

    case 'page-del':
      if (note.pages.length === 1) return toast('Die letzte Seite lässt sich nicht löschen.');
      if (!confirm(`Seite ${index + 1} löschen?`)) return;
      store.snapshot(note, 'vor Seite löschen');
      note.pages.splice(index, 1);
      store.state.pageIndex = Math.max(0, index - 1);
      await store.touch(note, true);
      renderNote();
      break;

    case 'spread':
      app.dataset.spread = app.dataset.spread === 'double' ? 'single' : 'double';
      setTimeout(() => inkLayers.forEach(l => l.resize()), 60);
      toast(app.dataset.spread === 'double' ? 'Zweiseitenmodus an.' : 'Zweiseitenmodus aus.');
      break;

    case 'split':
      openSplit();
      break;

    case 'tags': {
      const next = prompt('Schlagwörter, durch Komma getrennt', note.tags.join(', '));
      if (next === null) return;
      note.tags = next.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
      await store.touch(note, true);
      renderNoteList();
      renderTags();
      break;
    }

    case 'move': {
      const names = store.state.folders.map((f, i) => `${i + 1}: ${f.name}`).join('\n');
      const answer = prompt(`In welchen Ordner?\n0: (kein Ordner)\n${names}`, '0');
      if (answer === null) return;
      const i = Number(answer);
      note.folderId = i === 0 ? null : (store.state.folders[i - 1] || {}).id || null;
      await store.touch(note, true);
      renderFolders();
      renderNoteList();
      break;
    }

    case 'duplicate': {
      const copy = await store.duplicateNote(note.id);
      if (copy) { store.openNote(copy.id); renderNoteList(); toast('Kopie angelegt.'); }
      break;
    }

    case 'version':
      if (store.snapshot(note, 'manuell')) {
        renderVersions();
        toast('Version gesichert.');
      } else {
        toast('Es hat sich seit der letzten Version nichts geändert.');
      }
      break;

    case 'export-md':
      exporter.download(exporter.safeName(store.noteTitle(note)) + '.md',
        exporter.toMarkdown(note), 'text/markdown;charset=utf-8');
      break;

    case 'export-png': {
      const el = currentPageEl();
      if (!el || !page) break;
      const canvas = composePage(el, page, inkLayers.get(page.id), 2);
      canvas.toBlob(blob => {
        exporter.download(`${exporter.safeName(store.noteTitle(note))}-seite-${index + 1}.png`, blob, 'image/png');
      }, 'image/png');
      break;
    }

    case 'export-print':
      exporter.printNote();
      break;

    case 'backup': {
      toast('Backup wird erstellt…');
      const data = await exporter.backup();
      exporter.download(`andi-notes-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(data), 'application/json');
      toast('Backup gespeichert.');
      break;
    }

    case 'restore':
      $('#file-restore').click();
      break;

    case 'delete':
      if (!confirm(`Notiz „${store.noteTitle(note)}" endgültig löschen?`)) return;
      await store.deleteNote(note.id);
      renderNoteList();
      if (store.state.notes.length) store.openNote(store.state.notes[0].id);
      else renderNote();
      break;
  }
}

/* ═════════════════════════ Vorlagen ═════════════════════════ */

function buildTemplateDialog() {
  const grid = $('#template-grid');
  grid.innerHTML = '';
  TEMPLATE_GROUPS.forEach(group => {
    const head = document.createElement('h3');
    head.textContent = group;
    grid.appendChild(head);
    const row = document.createElement('div');
    row.className = 'template-row';
    Object.entries(TEMPLATES)
      .filter(([, t]) => t.group === group)
      .forEach(([id, t]) => {
        const b = document.createElement('button');
        b.className = 'template-card';
        b.dataset.template = id;
        const preview = document.createElement('span');
        preview.className = 'template-preview';
        preview.style.backgroundImage = t.image({ w: 300, h: 420 });
        preview.style.backgroundSize = ['cornell', 'week', 'storyboard'].includes(id) ? '100% 100%' : 'auto';
        const label = document.createElement('span');
        label.textContent = t.label;
        b.append(preview, label);
        b.addEventListener('click', () => applyTemplateTo(id, false));
        row.appendChild(b);
      });
    grid.appendChild(row);
  });

  $('#btn-template-close').addEventListener('click', () => $('#template-dialog').close());
  $('#btn-template-all').addEventListener('click', () => {
    const active = $('#template-grid .template-card.active');
    if (active) applyTemplateTo(active.dataset.template, true);
  });
}

function openTemplateDialog() {
  const page = currentPage();
  $$('#template-grid .template-card').forEach(c =>
    c.classList.toggle('active', page && c.dataset.template === page.template));
  $('#template-dialog').showModal();
}

function applyTemplateTo(id, all) {
  const note = store.state.note;
  const page = currentPage();
  if (!note || !page) return;
  const targets = all ? note.pages : [page];
  targets.forEach(p => { p.template = id; });
  store.touch(note);
  targets.forEach(p => {
    const el = pagesEl.querySelector(`[data-page-id="${p.id}"]`);
    if (el) applyTemplate(el, p);
  });
  $$('#template-grid .template-card').forEach(c => c.classList.toggle('active', c.dataset.template === id));
  if (all) {
    $('#template-dialog').close();
    toast('Vorlage auf alle Seiten angewendet.');
  }
}

/* ═════════════════════════ Symbol und Farbe ═════════════════════════ */

function buildIconDialog() {
  const grid = $('#icon-grid');
  NOTE_ICONS.forEach(icon => {
    const b = document.createElement('button');
    b.textContent = icon;
    b.addEventListener('click', () => {
      const note = store.state.note;
      if (!note) return;
      note.icon = icon;
      $('#btn-note-icon').textContent = icon;
      store.touch();
      renderNoteList();
    });
    grid.appendChild(b);
  });

  const colors = $('#note-colors');
  NOTE_COLORS.forEach(color => {
    const b = document.createElement('button');
    b.className = 'color-dot';
    b.style.background = color || 'transparent';
    b.textContent = color ? '' : '∅';
    b.addEventListener('click', () => {
      const note = store.state.note;
      if (!note) return;
      note.color = color;
      store.touch();
      renderNoteList();
    });
    colors.appendChild(b);
  });

  $('#btn-icon-clear').addEventListener('click', () => {
    const note = store.state.note;
    if (!note) return;
    note.icon = null;
    note.color = null;
    $('#btn-note-icon').textContent = note.kind === 'pdf' ? '📕' : '📄';
    store.touch();
    renderNoteList();
  });
  $('#btn-icon-close').addEventListener('click', () => $('#icon-dialog').close());
}

/* ═════════════════════════ Split-Screen ═════════════════════════ */

function openSplit() {
  const select = $('#split-note');
  select.innerHTML = '';
  store.state.notes
    .filter(n => !store.state.note || n.id !== store.state.note.id)
    .forEach(n => {
      const opt = document.createElement('option');
      opt.value = n.id;
      opt.textContent = store.noteTitle(n);
      select.appendChild(opt);
    });
  if (!select.options.length) return toast('Es gibt nur diese eine Notiz.');
  $('#splitview').hidden = false;
  app.dataset.split = 'on';
  renderSplit(select.value);
  setTimeout(() => inkLayers.forEach(l => l.resize()), 60);
}

/** The second pane is a reader: it shows the note, it does not edit it. */
function renderSplit(noteId) {
  const note = store.state.notes.find(n => n.id === noteId);
  const body = $('#split-body');
  body.innerHTML = '';
  if (!note) return;

  note.pages.forEach((page, index) => {
    const el = document.createElement('section');
    el.className = 'page readonly';
    el.style.setProperty('--page-ratio', page.w + ' / ' + page.h);
    applyTemplate(el, page);

    const text = document.createElement('div');
    text.className = 'layer text-layer';
    text.innerHTML = page.text || '';

    const canvas = document.createElement('canvas');
    canvas.className = 'layer ink-layer';
    el.append(text, canvas);
    body.appendChild(el);

    requestAnimationFrame(() => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      const k = (rect.width / page.w) * dpr;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      page.layers.forEach(layer => {
        if (!layer.visible) return;
        layer.strokes.forEach(s => drawStroke(ctx, s));
      });
    });
    void index;
  });
}

/* ═════════════════════════ PDF ═════════════════════════ */

async function importPdf(file) {
  toast('PDF wird gelesen…', 4000);
  try {
    const { pages, text } = await pdfview.openPdf(file);
    const assetId = store.uid('asset');
    await db.put('assets', { id: assetId, type: 'pdf', name: file.name, blob: file });

    const note = await store.createNote({
      title: file.name.replace(/\.pdf$/i, ''),
      kind: 'pdf',
      icon: '📕',
      assetId,
      pages: pages.map((p, i) => store.blankPage({
        template: 'blank',
        w: p.w,
        h: p.h,
        pdfPage: p.pdfPage,
        pdfText: text[i] || ''
      }))
    });
    await store.touch(note, true);
    store.openNote(note.id);
    renderNoteList();
    toast(`${pages.length} Seiten importiert.`);
  } catch (err) {
    console.error(err);
    toast('PDF-Import fehlgeschlagen: ' + err.message, 6000);
  }
}

/* ═════════════════════════ Panel ═════════════════════════ */

function bindPanel() {
  $$('.tab').forEach(tab => tab.addEventListener('click', () => selectTab(tab.dataset.tab)));
  selectTab('summary');
  app.dataset.panel = 'closed';

  $$('[data-ai]').forEach(btn => btn.addEventListener('click', () => runAnalysis(btn.dataset.ai)));

  $('#chat-form').addEventListener('submit', ev => { ev.preventDefault(); sendChat(); });
  $('#chat-input').addEventListener('keydown', ev => {
    if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) { ev.preventDefault(); sendChat(); }
  });

  $('#btn-ocr-run').addEventListener('click', runOcr);
  $('#btn-ocr-insert').addEventListener('click', insertOcr);

  $('#btn-layer-add').addEventListener('click', () => {
    const page = currentPage();
    if (!page) return;
    store.addLayer(page);
    store.touch();
    renderLayerList();
    const ink = currentInk();
    if (ink) ink.render();
    updatePageInfo();
  });
  $('#btn-layer-merge').addEventListener('click', () => {
    const page = currentPage();
    if (!page) return;
    if (!store.mergeLayerDown(page, page.activeLayer || 0)) return toast('Darunter ist keine Ebene.');
    store.touch();
    renderLayerList();
    const ink = currentInk();
    if (ink) ink.render();
  });
  $('#dim-layers').addEventListener('change', ev => {
    store.saveSettings({ dimInactiveLayers: ev.target.checked });
    const ink = currentInk();
    if (ink) ink.render();
  });

  $('#btn-version-save').addEventListener('click', () => menuAction('version'));
  $('#provider-badge').textContent = provider.label;
}

function selectTab(name) {
  $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  $$('.tabpane').forEach(p => { p.hidden = p.dataset.pane !== name; });
  app.dataset.panel = 'open';
  if (name === 'layers') renderLayerList();
  if (name === 'history') renderVersions();
  if (name === 'audio') renderRecordings();
}

async function runAnalysis(kind) {
  const note = store.state.note;
  if (!note) return;
  const out = $('#ai-out');
  out.innerHTML = `<p class="muted">${TASK_LABELS[kind]} wird erstellt… <span class="spinner"></span></p>`;
  try {
    const result = await provider.analyze(kind, store.noteText(note));
    out.innerHTML = renderMarkdown(result);
    const insert = document.createElement('button');
    insert.className = 'btn small';
    insert.textContent = 'In Notiz einfügen';
    insert.addEventListener('click', () => insertIntoNote(TASK_LABELS[kind], result));
    out.appendChild(insert);
    if (kind === 'summary') { note.summary = result; store.touch(); }
  } catch (err) {
    out.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function insertIntoNote(heading, body) {
  const page = currentPage();
  const el = currentPageEl();
  if (!page || !el) return;
  const layer = el.querySelector('.text-layer');
  layer.innerHTML += `<div class="ai-block"><small>${escapeHtml(heading)}</small>${renderMarkdown(body)}</div>`;
  page.text = layer.innerHTML;
  store.touch();
  toast('Eingefügt.');
}

async function sendChat() {
  const note = store.state.note;
  const input = $('#chat-input');
  const question = input.value.trim();
  if (!note || !question) return;
  input.value = '';
  note.chat.push({ role: 'user', content: question, ts: Date.now() });
  renderChat();
  store.touch();

  const pendingEl = document.createElement('div');
  pendingEl.className = 'msg assistant';
  pendingEl.innerHTML = '<span class="spinner"></span>';
  $('#chat').appendChild(pendingEl);
  $('#chat').scrollTop = $('#chat').scrollHeight;

  try {
    const answer = await provider.chat(question, store.noteText(note), note.chat.slice(0, -1));
    note.chat.push({ role: 'assistant', content: answer, ts: Date.now() });
  } catch (err) {
    note.chat.push({ role: 'assistant', content: 'Fehler: ' + err.message, ts: Date.now() });
  }
  store.touch();
  renderChat();
}

function renderChat() {
  const note = store.state.note;
  const box = $('#chat');
  box.innerHTML = '';
  if (!note || !note.chat.length) {
    box.innerHTML = '<p class="muted">Noch keine Fragen. Der Chat sieht den Text der geöffneten Notiz — getippt, erkannt oder transkribiert.</p>';
    return;
  }
  note.chat.forEach(m => {
    const el = document.createElement('div');
    el.className = 'msg ' + m.role;
    el.innerHTML = m.role === 'user' ? escapeHtml(m.content) : renderMarkdown(m.content);
    box.appendChild(el);
  });
  const clear = document.createElement('button');
  clear.className = 'link';
  clear.textContent = 'Verlauf löschen';
  clear.addEventListener('click', () => { note.chat = []; store.touch(); renderChat(); });
  box.appendChild(clear);
  box.scrollTop = box.scrollHeight;
}

/* ═════════════════════════ Ebenen ═════════════════════════ */

function renderLayerList() {
  const page = currentPage();
  const list = $('#layer-list');
  if (!list) return;
  list.innerHTML = '';
  $('#dim-layers').checked = !!store.state.settings.dimInactiveLayers;
  if (!page) return;

  page.layers.slice().reverse().forEach((layer, revIndex) => {
    const index = page.layers.length - 1 - revIndex;
    const row = document.createElement('div');
    row.className = 'layer-row' + (index === (page.activeLayer || 0) ? ' active' : '');

    const vis = rowButton(layer.visible ? '👁' : '🚫', 'Sichtbar', ev => {
      ev.stopPropagation();
      layer.visible = !layer.visible;
      store.touch();
      renderLayerList();
      const ink = currentInk();
      if (ink) ink.render();
    });

    const lock = rowButton(layer.locked ? '🔒' : '🔓', 'Sperren', ev => {
      ev.stopPropagation();
      layer.locked = !layer.locked;
      store.touch();
      renderLayerList();
    });

    const name = document.createElement('span');
    name.className = 'layer-name';
    name.textContent = `${layer.name} (${layer.strokes.length})`;
    name.addEventListener('dblclick', () => {
      const next = prompt('Name der Ebene', layer.name);
      if (next && next.trim()) { layer.name = next.trim(); store.touch(); renderLayerList(); }
    });

    const up = rowButton('↑', 'Nach oben', ev => {
      ev.stopPropagation();
      if (store.moveLayer(page, index, 1)) { store.touch(); renderLayerList(); currentInk() && currentInk().render(); }
    });
    const down = rowButton('↓', 'Nach unten', ev => {
      ev.stopPropagation();
      if (store.moveLayer(page, index, -1)) { store.touch(); renderLayerList(); currentInk() && currentInk().render(); }
    });
    const del = rowButton('✕', 'Ebene löschen', ev => {
      ev.stopPropagation();
      if (!confirm(`Ebene „${layer.name}" mit ${layer.strokes.length} Strichen löschen?`)) return;
      if (!store.removeLayer(page, index)) return toast('Die letzte Ebene bleibt.');
      store.touch();
      renderLayerList();
      const ink = currentInk();
      if (ink) ink.render();
      updatePageInfo();
    });

    row.append(vis, lock, name, up, down, del);
    row.addEventListener('click', () => {
      page.activeLayer = index;
      const ink = currentInk();
      if (ink) { ink.setActiveLayer(index); ink.render(); }
      store.touch();
      renderLayerList();
      updatePageInfo();
    });
    list.appendChild(row);
  });
}

/* ═════════════════════════ Versionen ═════════════════════════ */

function startAutoVersions() {
  clearInterval(autoVersionTimer);
  autoVersionTimer = setInterval(() => {
    if (!store.state.settings.autoVersions) return;
    const note = store.state.note;
    if (note && store.snapshot(note, 'automatisch')) renderVersions();
  }, 10 * 60 * 1000);
}

function renderVersions() {
  const note = store.state.note;
  const list = $('#version-list');
  if (!list) return;
  list.innerHTML = '';
  if (!note || !note.versions.length) {
    list.innerHTML = '<p class="muted">Noch keine Version gesichert.</p>';
    return;
  }
  note.versions.slice().reverse().forEach(version => {
    const row = document.createElement('div');
    row.className = 'version-row';
    const label = document.createElement('span');
    label.textContent = `${new Date(version.ts).toLocaleString('de-DE')} · ${version.label || 'Version'}`;
    const restore = document.createElement('button');
    restore.className = 'btn small';
    restore.textContent = 'Wiederherstellen';
    restore.addEventListener('click', () => {
      if (!confirm('Diesen Stand wiederherstellen? Der aktuelle wird vorher gesichert.')) return;
      store.restoreVersion(note, version.id);
      toast('Version wiederhergestellt.');
    });
    row.append(label, restore);
    list.appendChild(row);
  });
}

/* ═════════════════════════ OCR ═════════════════════════ */

async function runOcr() {
  const page = currentPage();
  const pageEl = currentPageEl();
  if (!page || !pageEl) return;
  const out = $('#ocr-out');
  out.innerHTML = '<p class="muted">Bild wird vorbereitet…</p>';
  $('#btn-ocr-insert').hidden = true;

  try {
    const canvas = composePage(pageEl, page, inkLayers.get(page.id), 2);
    const text = await recognize(canvas, $('#ocr-lang').value, (status, progress) => {
      out.innerHTML = `<p class="muted">${escapeHtml(status)} — ${Math.round(progress * 100)}%</p>`;
    });
    lastOcrText = text;
    if (!text) return void (out.innerHTML = '<p class="muted">Kein Text erkannt.</p>');
    out.innerHTML = `<pre>${escapeHtml(text)}</pre>`;
    page.ocrText = text;
    store.touch();
    $('#btn-ocr-insert').hidden = false;
  } catch (err) {
    out.innerHTML = `<p class="error">${escapeHtml(err.message)}</p>`;
  }
}

function insertOcr() {
  const page = currentPage();
  const el = currentPageEl();
  if (!page || !el || !lastOcrText) return;
  const layer = el.querySelector('.text-layer');
  layer.innerHTML += `<div class="ocr-block"><small>Erkannter Text</small><p>${escapeHtml(lastOcrText).replace(/\n/g, '<br>')}</p></div>`;
  page.text = layer.innerHTML;
  page.ocrText = lastOcrText;
  store.touch();
  toast('Text eingefügt.');
}

/** Flattens template, PDF background and every visible layer into one canvas. */
function composePage(pageEl, page, ink, scale = 2) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(page.w * scale);
  canvas.height = Math.round(page.h * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const pdfCanvas = pageEl.querySelector('.pdf-layer');
  if (pdfCanvas && pdfCanvas.width) ctx.drawImage(pdfCanvas, 0, 0, canvas.width, canvas.height);
  if (ink) ink.drawInto(ctx, scale);
  return canvas;
}

/* ═════════════════════════ Aufnahme ═════════════════════════ */

function bindAudio() {
  const hint = $('#transcribe-hint');
  hint.textContent = transcriptionSupported
    ? 'Die Live-Mitschrift nutzt die Spracherkennung des Browsers. In Chrome und Edge wird der Ton dafür an den Hersteller übertragen; die Aufnahme selbst bleibt auf dem Gerät.'
    : 'Dieser Browser kann nicht live mitschreiben. Die Aufnahme selbst funktioniert trotzdem.';
  $('#live-transcribe').disabled = !transcriptionSupported;

  $('#btn-rec-toggle').addEventListener('click', toggleRecording);
}

async function toggleRecording() {
  const button = $('#btn-rec-toggle');

  if (recorder && recorder.recording) {
    const result = await recorder.stop();
    recorder = null;
    if (transcriber) { transcriber.stop(); transcriber = null; }
    button.textContent = 'Aufnahme starten';
    button.classList.remove('recording');
    $('#rec-info').hidden = true;
    $('#rec-level').style.width = '0%';

    if (result && result.blob.size) {
      const assetId = store.uid('asset');
      await db.put('assets', { id: assetId, type: 'audio', name: 'Aufnahme', blob: result.blob });
      const note = recordingNote || store.state.note;
      note.recordings = note.recordings || [];
      note.recordings.push({
        id: store.uid('rec'),
        assetId,
        ts: Date.now(),
        duration: result.duration,
        transcript: $('#transcript').dataset.text || ''
      });
      await store.touch(note, true);
      renderRecordings();
      toast(`Aufnahme gespeichert (${formatDuration(result.duration)}).`);
    }
    recordingNote = null;
    return;
  }

  try {
    recordingNote = store.state.note;
    recorder = new Recorder({
      onTick: seconds => {
        $('#rec-time').textContent = formatDuration(seconds);
        $('#rec-info').textContent = '● Aufnahme ' + formatDuration(seconds);
      },
      onLevel: level => { $('#rec-level').style.width = Math.round(level * 100) + '%'; }
    });
    await recorder.start();
    button.textContent = 'Aufnahme beenden';
    button.classList.add('recording');
    $('#rec-info').hidden = false;
    $('#transcript').textContent = '';
    $('#transcript').dataset.text = '';

    if ($('#live-transcribe').checked && transcriptionSupported) startTranscription();
  } catch (err) {
    recorder = null;
    toast('Aufnahme nicht möglich: ' + err.message, 6000);
  }
}

function startTranscription() {
  const box = $('#transcript');
  transcriber = new LiveTranscriber({
    onPartial: text => { box.dataset.partial = text; paintTranscript(); },
    onFinal: text => {
      box.dataset.text = ((box.dataset.text || '') + ' ' + text).trim();
      box.dataset.partial = '';
      paintTranscript();
      const page = currentPage();
      if (page) {
        page.ocrText = ((page.ocrText || '') + ' ' + text).trim();
        store.touch();
      }
    },
    onError: msg => toast(msg, 5000)
  });
  transcriber.start($('#rec-lang').value);
}

function paintTranscript() {
  const box = $('#transcript');
  box.innerHTML = escapeHtml(box.dataset.text || '') +
    (box.dataset.partial ? ` <span class="partial">${escapeHtml(box.dataset.partial)}</span>` : '');
  box.scrollTop = box.scrollHeight;
}

function renderRecordings() {
  const note = store.state.note;
  const list = $('#rec-list');
  if (!list) return;
  list.innerHTML = '';
  const recordings = (note && note.recordings) || [];
  if (!recordings.length) {
    list.innerHTML = '<p class="muted">Noch keine Aufnahme in dieser Notiz.</p>';
    return;
  }

  recordings.slice().reverse().forEach(rec => {
    const row = document.createElement('div');
    row.className = 'rec-row';
    const label = document.createElement('span');
    label.textContent = `${new Date(rec.ts).toLocaleString('de-DE')} · ${formatDuration(rec.duration)}`;
    const play = document.createElement('button');
    play.className = 'btn small';
    play.textContent = '▶';
    play.addEventListener('click', async () => {
      const asset = await db.get('assets', rec.assetId);
      if (!asset) return toast('Die Audiodatei fehlt.');
      const audio = row.querySelector('audio') || document.createElement('audio');
      audio.controls = true;
      audio.src = URL.createObjectURL(asset.blob);
      if (!row.contains(audio)) row.appendChild(audio);
      audio.play();
    });
    const del = document.createElement('button');
    del.className = 'btn small';
    del.textContent = '🗑';
    del.addEventListener('click', async () => {
      if (!confirm('Aufnahme löschen?')) return;
      note.recordings = note.recordings.filter(r => r.id !== rec.id);
      await db.del('assets', rec.assetId).catch(() => {});
      await store.touch(note, true);
      renderRecordings();
    });
    row.append(label, play, del);
    if (rec.transcript) {
      const t = document.createElement('p');
      t.className = 'rec-transcript';
      t.textContent = rec.transcript;
      row.appendChild(t);
    }
    list.appendChild(row);
  });
}

/* ═════════════════════════ Video ═════════════════════════ */

function bindVideo() {
  videoBox = new VideoBox($('#videobox'), {
    onError: msg => toast(msg, 5000),
    onShot: (dataUrl, stamp) => {
      const page = currentPage();
      const el = currentPageEl();
      if (!page || !el) return;
      const layer = el.querySelector('.text-layer');
      layer.innerHTML += `<figure class="shot"><img src="${dataUrl}" alt="Standbild bei ${stamp}"><figcaption>${stamp}</figcaption></figure>`;
      page.text = layer.innerHTML;
      store.touch();
      toast('Standbild bei ' + stamp + ' eingefügt.');
    }
  });

  $('#btn-video-close').addEventListener('click', () => videoBox.hide());
  $('#btn-video-file').addEventListener('click', () => $('#file-video').click());
  $('#file-video').addEventListener('change', ev => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (file) videoBox.loadFile(file);
  });
  $('#btn-video-load').addEventListener('click', () => videoBox.loadUrl($('#video-url').value.trim()));
  $('#btn-video-pip').addEventListener('click', () => videoBox.pip());
  $('#btn-video-shot').addEventListener('click', () => videoBox.shot());
}

/* ═════════════════════════ Einstellungen ═════════════════════════ */

function bindSettings() {
  $$('input[name="provider"]').forEach(radio => radio.addEventListener('change', syncProviderFields));

  $('#settings-dialog').addEventListener('close', async ev => {
    if (ev.target.returnValue !== 'save') return;
    await store.saveSettings({
      provider: ($('input[name="provider"]:checked') || {}).value || 'local',
      apiKey: $('#set-key').value.trim(),
      model: $('#set-model').value.trim(),
      baseUrl: $('#set-base').value.trim(),
      penOnly: $('#set-penonly').checked,
      pressure: $('#set-pressure').checked,
      smooth: $('#set-smooth').checked,
      autoVersions: $('#set-autoversions').checked,
      theme: $('#set-theme').value
    });
    syncToolUi();
    toast('Einstellungen gespeichert.');
  });
}

async function openSettings() {
  const s = store.state.settings;
  const radio = $(`input[name="provider"][value="${s.provider}"]`);
  if (radio) radio.checked = true;
  $('#set-key').value = s.apiKey || '';
  $('#set-model').value = s.model || '';
  $('#set-base').value = s.baseUrl || '';
  $('#set-penonly').checked = !!s.penOnly;
  $('#set-pressure').checked = !!s.pressure;
  $('#set-smooth').checked = !!s.smooth;
  $('#set-autoversions').checked = !!s.autoVersions;
  $('#set-theme').value = s.theme || 'auto';
  syncProviderFields();

  const info = await db.usage();
  $('#storage-info').textContent = info
    ? `Belegt: ${formatBytes(info.used)} von etwa ${formatBytes(info.quota)} Browser-Speicher.`
    : 'Die Speicherbelegung lässt sich in diesem Browser nicht abfragen.';

  $('#settings-dialog').showModal();
}

function syncProviderFields() {
  const value = ($('input[name="provider"]:checked') || {}).value || 'local';
  $$('[data-for]').forEach(field => {
    field.hidden = !field.dataset.for.split(' ').includes(value);
  });
}

function applyTheme() {
  const theme = store.state.settings.theme || 'auto';
  document.documentElement.dataset.theme = theme;
}

/* ═════════════════════════ Tastatur ═════════════════════════ */

function bindKeyboard() {
  document.addEventListener('keydown', ev => {
    const mod = ev.metaKey || ev.ctrlKey;
    const editing = isEditing(ev.target);

    if (mod && !ev.shiftKey && ev.key.toLowerCase() === 'n') { ev.preventDefault(); $('#btn-new-note').click(); return; }
    if (mod && ev.key.toLowerCase() === 'f') {
      ev.preventDefault();
      app.classList.add('sidebar-open');
      $('#q').focus();
      $('#q').select();
      return;
    }
    if (mod && ev.key.toLowerCase() === 'k') { ev.preventDefault(); togglePanel(); return; }
    if (mod && ev.key.toLowerCase() === 'p') { ev.preventDefault(); exporter.printNote(); return; }
    if (mod && ev.shiftKey && ev.key.toLowerCase() === 's') { ev.preventDefault(); videoBox.shot(); return; }
    if (ev.altKey && (ev.key === '1' || ev.key === '2')) {
      ev.preventDefault();
      setMode(ev.key === '1' ? 'text' : 'draw');
      return;
    }

    if (mod && ev.key.toLowerCase() === 'z' && app.dataset.mode === 'draw') {
      ev.preventDefault();
      const ink = currentInk();
      if (ink) (ev.shiftKey ? ink.redo() : ink.undo());
      updateUndoButtons();
      return;
    }

    if (ev.key === 'Escape') {
      const ink = currentInk();
      if (ink && ink.selection.length) { ink.clearSelection(); hideSelectionBar(); return; }
      if (app.dataset.panel === 'open') { app.dataset.panel = 'closed'; return; }
      if (videoBox.open) videoBox.hide();
      return;
    }

    if (editing || mod || ev.altKey) return;

    if (app.dataset.mode === 'draw') {
      const penKeys = { 1: 'fountain', 2: 'ballpoint', 3: 'fineliner', 4: 'pencil', 5: 'brush', 6: 'marker', 7: 'crayon', 8: 'neon', 9: 'dashed' };
      if (penKeys[ev.key]) { selectPen(penKeys[ev.key]); return; }
      if (ev.key === 'e') { setToolMode('eraser'); return; }
      if (ev.key === 's') { setToolMode('lasso'); return; }
      if (ev.key === 'f') { setToolMode('shape'); return; }
      if (ev.key === 'Delete' || ev.key === 'Backspace') {
        const ink = currentInk();
        if (ink && ink.selection.length) { ev.preventDefault(); ink.deleteSelection(); hideSelectionBar(); }
        return;
      }
      if (ev.key === '[') { setSize(tool.size - 1); return; }
      if (ev.key === ']') { setSize(tool.size + 1); return; }
      if (ev.key === 'Shift') tool.straight = true;
    }

    if (ev.key === 't') setMode('text');
    if (ev.key === 'd') setMode('draw');
  });

  document.addEventListener('keyup', ev => {
    if (ev.key === 'Shift') tool.straight = false;
  });
}

function setSize(value) {
  tool.size = Math.max(0.5, Math.min(40, value));
  $('#ink-size').value = tool.size;
  updateSizePreview();
  saveToolPrefs();
}

function isEditing(el) {
  if (!el) return false;
  return el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName);
}

/* ═════════════════════════ Kleinkram ═════════════════════════ */

let toastTimer = null;
function toast(message, ms = 2600) {
  const el = $('#toast');
  el.textContent = message;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function setSaveState(text) {
  $('#save-state').textContent = text;
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Deliberately small: headings, lists, quotes, bold/italic, inline code. */
function renderMarkdown(text) {
  const lines = String(text || '').split('\n');
  const out = [];
  let list = null;
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };
  const inline = s => escapeHtml(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) { closeList(); continue; }
    let m;
    if ((m = line.match(/^(#{1,3})\s+(.*)$/))) {
      closeList();
      const level = m[1].length + 2;
      out.push(`<h${level}>${inline(m[2])}</h${level}>`);
    } else if ((m = line.match(/^\s*-\s*\[([ xX])\]\s+(.*)$/))) {
      if (list !== 'ul') { closeList(); out.push('<ul class="tasks">'); list = 'ul'; }
      out.push(`<li>${m[1].trim() ? '☑' : '☐'} ${inline(m[2])}</li>`);
    } else if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul'; }
      out.push(`<li>${inline(m[1])}</li>`);
    } else if ((m = line.match(/^\s*(\d+)[.)]\s+(.*)$/))) {
      if (list !== 'ol') { closeList(); out.push('<ol>'); list = 'ol'; }
      out.push(`<li>${inline(m[2])}</li>`);
    } else if ((m = line.match(/^>\s?(.*)$/))) {
      closeList();
      out.push(`<blockquote>${inline(m[1])}</blockquote>`);
    } else {
      closeList();
      out.push(`<p>${inline(line)}</p>`);
    }
  }
  closeList();
  return out.join('\n');
}

function relativeTime(ts) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  if (d < 7) return `vor ${d} Tg.`;
  return new Date(ts).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: '2-digit' });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return (bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0) + ' ' + units[i];
}

function debounce(fn, ms) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
}
