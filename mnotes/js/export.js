/**
 * Export and backup.
 *
 * Markdown keeps the typed text; the PDF export goes through the browser's
 * print dialog so handwriting and PDF pages come out exactly as displayed.
 * The JSON backup is the only complete copy — it includes strokes and,
 * optionally, imported PDF files.
 */

import * as db from './db.js';
import { state, noteTitle, htmlToText } from './store.js';

/* ───────────────────────── Markdown ───────────────────────── */

export function toMarkdown(note) {
  const out = [`# ${noteTitle(note)}`, ''];
  note.pages.forEach((page, i) => {
    if (note.pages.length > 1) out.push(`<!-- Seite ${i + 1} -->`, '');
    const md = htmlToMarkdown(page.text);
    if (md.trim()) out.push(md.trim(), '');
    const strokes = (page.layers || []).reduce((n, l) => n + l.strokes.length, 0);
    if (strokes) {
      out.push(`_[${strokes} handschriftliche Striche auf ${page.layers.length} Ebene(n) — sichtbar im PDF- und PNG-Export]_`, '');
    }
    if (page.ocrText) out.push('**Erkannter Text:**', '', page.ocrText.trim(), '');
  });
  return out.join('\n');
}

function htmlToMarkdown(html) {
  const root = document.createElement('div');
  root.innerHTML = html || '';

  const inline = node => {
    let text = '';
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      const inner = inline(child);
      switch (child.tagName) {
        case 'B': case 'STRONG': text += `**${inner}**`; break;
        case 'I': case 'EM': text += `*${inner}*`; break;
        case 'U': text += `<u>${inner}</u>`; break;
        case 'S': case 'STRIKE': case 'DEL': text += `~~${inner}~~`; break;
        case 'CODE': text += '`' + inner + '`'; break;
        case 'BR': text += '\n'; break;
        case 'A': text += `[${inner}](${child.getAttribute('href') || ''})`; break;
        case 'IMG': text += `![${child.alt || 'Bild'}](${child.src.startsWith('data:') ? 'eingebettetes-bild' : child.src})`; break;
        default: text += inner;
      }
    });
    return text;
  };

  const lines = [];
  const walk = node => {
    node.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const t = child.textContent.trim();
        if (t) lines.push(t);
        return;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) return;
      switch (child.tagName) {
        case 'H1': lines.push('# ' + inline(child), ''); break;
        case 'H2': lines.push('## ' + inline(child), ''); break;
        case 'H3': lines.push('### ' + inline(child), ''); break;
        case 'UL':
          child.querySelectorAll(':scope > li').forEach(li => lines.push('- ' + inline(li)));
          lines.push('');
          break;
        case 'OL':
          child.querySelectorAll(':scope > li').forEach((li, i) => lines.push(`${i + 1}. ` + inline(li)));
          lines.push('');
          break;
        case 'BLOCKQUOTE': lines.push('> ' + inline(child), ''); break;
        case 'PRE': lines.push('```', child.textContent, '```', ''); break;
        case 'HR': lines.push('---', ''); break;
        case 'DIV':
          if (child.classList.contains('todo')) {
            const done = child.dataset.done === 'true';
            lines.push(`- [${done ? 'x' : ' '}] ` + inline(child).replace(/^[☐☑]\s*/, ''));
            break;
          }
          if (child.querySelector('h1,h2,h3,ul,ol,pre,blockquote,div')) { walk(child); break; }
          lines.push(inline(child) || '');
          break;
        case 'P': lines.push(inline(child), ''); break;
        default: lines.push(inline(child));
      }
    });
  };
  walk(root);

  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

/* ───────────────────────── Download ───────────────────────── */

export function download(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeName(text) {
  return (text || 'notiz')
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

/* ───────────────────────── Backup ───────────────────────── */

export async function backup({ includeAssets = true } = {}) {
  const [folders, notes, assets] = await Promise.all([
    db.getAll('folders'),
    db.getAll('notes'),
    includeAssets ? db.getAll('assets') : Promise.resolve([])
  ]);
  const encoded = [];
  for (const asset of assets) {
    encoded.push({
      id: asset.id,
      type: asset.type,
      name: asset.name,
      data: await blobToDataUrl(asset.blob)
    });
  }
  return {
    app: 'andi-notes',
    version: 1,
    exportedAt: new Date().toISOString(),
    folders,
    notes,
    assets: encoded
  };
}

export async function restore(json, { replace = false } = {}) {
  if (!json || json.app !== 'andi-notes') throw new Error('Keine gültige Backup-Datei.');
  if (replace) {
    await Promise.all([db.clear('folders'), db.clear('notes'), db.clear('assets')]);
  }
  if (json.folders && json.folders.length) await db.putMany('folders', json.folders);
  if (json.notes && json.notes.length) await db.putMany('notes', json.notes);
  for (const asset of json.assets || []) {
    await db.put('assets', {
      id: asset.id,
      type: asset.type,
      name: asset.name,
      blob: await dataUrlToBlob(asset.data)
    });
  }
  return {
    folders: (json.folders || []).length,
    notes: (json.notes || []).length,
    assets: (json.assets || []).length
  };
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}

/* ───────────────────────── Drucken ───────────────────────── */

/**
 * The pages are already in the DOM as canvases and text layers, so the print
 * stylesheet does the work. Titles the printout after the note.
 */
export function printNote() {
  const note = state.note;
  const previous = document.title;
  if (note) document.title = noteTitle(note);
  const restoreTitle = () => {
    document.title = previous;
    window.removeEventListener('afterprint', restoreTitle);
  };
  window.addEventListener('afterprint', restoreTitle);
  window.print();
}

export function plainText(note) {
  return note.pages.map(p => htmlToText(p.text)).join('\n\n');
}
