/**
 * PDF import and rendering.
 *
 * pdf.js is pulled from a CDN the first time a PDF is opened, so the core app
 * (notes, handwriting, local analysis) still works offline and without any
 * dependency in the repo.
 */

const PDFJS_VERSION = '3.11.174';
const PDFJS_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;
const WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

let libPromise = null;

export function loadPdfJs() {
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    if (window.pdfjsLib) return resolve(window.pdfjsLib);
    const el = document.createElement('script');
    el.src = PDFJS_URL;
    el.onload = () => {
      if (!window.pdfjsLib) return reject(new Error('pdf.js konnte nicht geladen werden.'));
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = WORKER_URL;
      resolve(window.pdfjsLib);
    };
    el.onerror = () => reject(new Error('pdf.js konnte nicht geladen werden (offline?).'));
    document.head.appendChild(el);
  });
  return libPromise;
}

/** Opens a PDF blob and returns { doc, pages: [{ w, h, pdfPage }], text: [] }. */
export async function openPdf(blob) {
  const lib = await loadPdfJs();
  const buf = await blob.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  const pages = [];
  const text = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1 });
    pages.push({ w: Math.round(vp.width), h: Math.round(vp.height), pdfPage: n });
    try {
      const content = await page.getTextContent();
      text.push(content.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim());
    } catch {
      text.push('');
    }
  }
  return { doc, pages, text };
}

/** Cache of open pdf.js documents, keyed by asset id. */
const docs = new Map();

export async function docFor(assetId, blob) {
  if (docs.has(assetId)) return docs.get(assetId);
  const lib = await loadPdfJs();
  const buf = await blob.arrayBuffer();
  const doc = await lib.getDocument({ data: buf }).promise;
  docs.set(assetId, doc);
  return doc;
}

export function forgetDoc(assetId) {
  const doc = docs.get(assetId);
  if (doc && doc.destroy) doc.destroy();
  docs.delete(assetId);
}

/**
 * Renders one PDF page into a canvas, matched to the canvas' CSS size and the
 * device pixel ratio. Returns a promise that resolves once painting is done.
 */
export async function renderPage(doc, pageNum, canvas) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width) return;
  const page = await doc.getPage(pageNum);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const base = page.getViewport({ scale: 1 });
  const scale = (rect.width * dpr) / base.width;
  const vp = page.getViewport({ scale });
  canvas.width = Math.round(vp.width);
  canvas.height = Math.round(vp.height);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
}
