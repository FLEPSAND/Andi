/**
 * Text recognition for handwriting and scanned PDF pages.
 *
 * Tesseract and its language data are fetched from a CDN on first use — the
 * German model is roughly 10 MB, so this stays opt-in and out of the core app.
 */

const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

let libPromise = null;
const workers = new Map();

function loadTesseract() {
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    if (window.Tesseract) return resolve(window.Tesseract);
    const el = document.createElement('script');
    el.src = TESSERACT_URL;
    el.onload = () => window.Tesseract
      ? resolve(window.Tesseract)
      : reject(new Error('Tesseract konnte nicht geladen werden.'));
    el.onerror = () => reject(new Error('Tesseract konnte nicht geladen werden (offline?).'));
    document.head.appendChild(el);
  });
  return libPromise;
}

async function workerFor(lang, onProgress) {
  if (workers.has(lang)) return workers.get(lang);
  const Tesseract = await loadTesseract();
  const promise = Tesseract.createWorker(lang, 1, {
    logger: m => {
      if (onProgress && typeof m.progress === 'number') onProgress(m.status, m.progress);
    }
  });
  workers.set(lang, promise);
  try {
    return await promise;
  } catch (err) {
    workers.delete(lang);
    throw err;
  }
}

/**
 * @param {HTMLCanvasElement|Blob|string} image
 * @param {string} lang  e.g. 'deu', 'eng', 'deu+eng'
 * @param {(status: string, progress: number) => void} [onProgress]
 * @returns {Promise<string>}
 */
export async function recognize(image, lang = 'deu', onProgress) {
  const worker = await workerFor(lang, onProgress);
  const { data } = await worker.recognize(image);
  return (data.text || '').replace(/\n{3,}/g, '\n\n').trim();
}

export async function shutdown() {
  for (const promise of workers.values()) {
    try {
      const worker = await promise;
      await worker.terminate();
    } catch { /* nothing to clean up */ }
  }
  workers.clear();
}
