/**
 * Thin IndexedDB wrapper.
 *
 * Four stores:
 *   folders  { id, name, parentId, createdAt }
 *   notes    { id, folderId, title, kind, pages[], chat[], … }
 *   assets   { id, type, name, blob }   — imported PDFs and images
 *   kv       { key, value }             — settings
 *
 * Everything lives in the browser. There is no server side.
 */

const DB_NAME = 'andi-notes';
const DB_VERSION = 1;

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('folders')) db.createObjectStore('folders', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('notes')) db.createObjectStore('notes', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode, run) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let result;
    try {
      result = run(s);
    } catch (err) {
      reject(err);
      return;
    }
    t.oncomplete = () => resolve(result && result.result !== undefined ? result.result : result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export function get(store, key) {
  return tx(store, 'readonly', s => s.get(key));
}

export function getAll(store) {
  return tx(store, 'readonly', s => s.getAll());
}

export function put(store, value) {
  return tx(store, 'readwrite', s => s.put(value)).then(() => value);
}

export function putMany(store, values) {
  return tx(store, 'readwrite', s => {
    values.forEach(v => s.put(v));
  });
}

export function del(store, key) {
  return tx(store, 'readwrite', s => s.delete(key));
}

export function clear(store) {
  return tx(store, 'readwrite', s => s.clear());
}

/** Settings live in `kv` under a single record so a save is one write. */
export async function loadSettings(defaults) {
  const rec = await get('kv', 'settings');
  return Object.assign({}, defaults, rec ? rec.value : null);
}

export function saveSettings(value) {
  return put('kv', { key: 'settings', value });
}

/** Rough report of how much space the origin uses, for the settings dialog. */
export async function usage() {
  if (!navigator.storage || !navigator.storage.estimate) return null;
  try {
    const { usage: used, quota } = await navigator.storage.estimate();
    return { used, quota };
  } catch {
    return null;
  }
}

/**
 * Asks the browser to keep this origin's data around instead of evicting it
 * under storage pressure. Silently does nothing where unsupported.
 */
export async function persist() {
  if (!navigator.storage || !navigator.storage.persist) return false;
  try {
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
