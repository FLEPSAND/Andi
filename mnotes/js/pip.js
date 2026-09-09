/**
 * Watch a video and take notes at the same time.
 *
 * Picture-in-Picture keeps the video floating above every other window, so the
 * note stays in focus. A screenshot grabs the current frame into the note —
 * that only works for videos the page may read: local files and servers that
 * allow cross-origin reads. YouTube and friends block it, and the capture
 * fails with a clear message instead of a blank image.
 */

export class VideoBox {
  constructor(root, { onShot, onError }) {
    this.root = root;
    this.video = root.querySelector('#video');
    this.empty = root.querySelector('#video-empty');
    this.onShot = onShot;
    this.onError = onError || (() => {});
    this.hasSource = false;
    this.video.crossOrigin = 'anonymous';
    this._syncEmpty();
  }

  get open() { return !this.root.hidden; }

  show() {
    this.root.hidden = false;
    this.root.classList.add('is-open');
  }

  hide() {
    this.root.classList.remove('is-open');
    this.root.hidden = true;
    if (document.pictureInPictureElement === this.video) {
      document.exitPictureInPicture().catch(() => {});
    }
  }

  toggle() {
    this.open ? this.hide() : this.show();
  }

  loadFile(file) {
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(file);
    this.video.removeAttribute('crossorigin');
    this.video.src = this.objectUrl;
    this.hasSource = true;
    this.sameOrigin = true;
    this._syncEmpty();
    this.video.play().catch(() => {});
  }

  loadUrl(url) {
    if (!url) return;
    if (/youtu\.?be|vimeo\.com|dailymotion/.test(url)) {
      this.onError('Streaming-Portale lassen sich nicht direkt einbetten. Nimm die Bild-in-Bild-Funktion des Players im anderen Tab — Screenshots gehen dort nicht.');
      return;
    }
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }
    this.video.crossOrigin = 'anonymous';
    this.video.src = url;
    this.hasSource = true;
    this.sameOrigin = false;
    this._syncEmpty();
    this.video.play().catch(() => {});
  }

  async pip() {
    if (!this.hasSource) return this.onError('Erst ein Video laden.');
    if (!document.pictureInPictureEnabled) {
      return this.onError('Dieser Browser unterstützt Bild-in-Bild nicht.');
    }
    try {
      if (document.pictureInPictureElement === this.video) await document.exitPictureInPicture();
      else await this.video.requestPictureInPicture();
    } catch (err) {
      this.onError('Bild-in-Bild abgelehnt: ' + err.message);
    }
  }

  /** Grabs the current frame as a PNG data URL and hands it to `onShot`. */
  shot() {
    if (!this.hasSource || !this.video.videoWidth) {
      return this.onError('Erst ein Video laden und abspielen.');
    }
    const canvas = document.createElement('canvas');
    canvas.width = this.video.videoWidth;
    canvas.height = this.video.videoHeight;
    canvas.getContext('2d').drawImage(this.video, 0, 0);
    let dataUrl;
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch {
      return this.onError('Das Video erlaubt keine Bildentnahme (fremde Domain ohne CORS-Freigabe).');
    }
    const stamp = formatTime(this.video.currentTime);
    this.onShot(dataUrl, stamp);
  }

  _syncEmpty() {
    this.empty.hidden = this.hasSource;
    this.video.hidden = !this.hasSource;
  }
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = n => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
