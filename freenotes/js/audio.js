/**
 * Audio recording and live transcription.
 *
 * Recording runs entirely on the device (MediaRecorder → a blob in IndexedDB).
 *
 * Live transcription uses the browser's SpeechRecognition API. In Chrome and
 * Edge that API sends the microphone signal to the vendor's servers — this is
 * not on-device dictation, and the UI says so before it starts. Safari on iOS
 * exposes it too; other browsers do not have it at all.
 */

export class Recorder {
  constructor({ onTick, onLevel } = {}) {
    this.onTick = onTick || (() => {});
    this.onLevel = onLevel || (() => {});
    this.recorder = null;
    this.chunks = [];
    this.startedAt = 0;
    this.elapsed = 0;
    this.timer = null;
  }

  get recording() { return !!this.recorder && this.recorder.state === 'recording'; }
  get paused() { return !!this.recorder && this.recorder.state === 'paused'; }

  async start() {
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      throw new Error('Dieser Browser kann keinen Ton aufnehmen.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
      .find(t => MediaRecorder.isTypeSupported(t));
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : undefined);
    this.chunks = [];
    this.recorder.ondataavailable = e => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start(1000);
    this.startedAt = Date.now();
    this.elapsed = 0;
    this._meter();
    this.timer = setInterval(() => {
      this.elapsed = (Date.now() - this.startedAt) / 1000;
      this.onTick(this.elapsed);
    }, 500);
  }

  pause() {
    if (this.recording) {
      this.recorder.pause();
      clearInterval(this.timer);
    }
  }

  resume() {
    if (this.paused) {
      this.startedAt = Date.now() - this.elapsed * 1000;
      this.recorder.resume();
      this.timer = setInterval(() => {
        this.elapsed = (Date.now() - this.startedAt) / 1000;
        this.onTick(this.elapsed);
      }, 500);
    }
  }

  /** @returns {Promise<{blob: Blob, duration: number, type: string}>} */
  stop() {
    return new Promise(resolve => {
      if (!this.recorder) return resolve(null);
      const type = this.recorder.mimeType || 'audio/webm';
      this.recorder.onstop = () => {
        clearInterval(this.timer);
        if (this.audioCtx) this.audioCtx.close().catch(() => {});
        this.stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(this.chunks, { type });
        const duration = this.elapsed;
        this.recorder = null;
        this.chunks = [];
        resolve({ blob, duration, type });
      };
      this.recorder.stop();
    });
  }

  /** Drives a small level meter so it is obvious the mic is live. */
  _meter() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new Ctx();
      const source = this.audioCtx.createMediaStreamSource(this.stream);
      const analyser = this.audioCtx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!this.recorder) return;
        analyser.getByteTimeDomainData(data);
        let peak = 0;
        for (const v of data) peak = Math.max(peak, Math.abs(v - 128));
        this.onLevel(Math.min(1, peak / 90));
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      /* the meter is decoration; recording works without it */
    }
  }
}

/* ───────────────────────── Live-Transkription ───────────────────────── */

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export const transcriptionSupported = !!SpeechRecognition;

export class LiveTranscriber {
  constructor({ onPartial, onFinal, onError, onEnd } = {}) {
    this.onPartial = onPartial || (() => {});
    this.onFinal = onFinal || (() => {});
    this.onError = onError || (() => {});
    this.onEnd = onEnd || (() => {});
    this.running = false;
  }

  start(lang = 'de-DE') {
    if (!SpeechRecognition) {
      this.onError('Dieser Browser kann nicht live mitschreiben. Chrome, Edge oder Safari können es.');
      return false;
    }
    const rec = new SpeechRecognition();
    this.rec = rec;
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = event => {
      let partial = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) this.onFinal(text.trim());
        else partial += text;
      }
      if (partial) this.onPartial(partial.trim());
    };

    rec.onerror = event => {
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      this.onError(describeSpeechError(event.error));
    };

    // The API stops on its own after a pause; restart while the user wants it.
    rec.onend = () => {
      if (this.running) {
        try { rec.start(); } catch { this.running = false; }
      } else {
        this.onEnd();
      }
    };

    this.running = true;
    try {
      rec.start();
    } catch (err) {
      this.running = false;
      this.onError(err.message);
      return false;
    }
    return true;
  }

  stop() {
    this.running = false;
    if (this.rec) this.rec.stop();
  }
}

function describeSpeechError(code) {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Zugriff auf das Mikrofon wurde abgelehnt.';
    case 'audio-capture':
      return 'Kein Mikrofon gefunden.';
    case 'network':
      return 'Die Spracherkennung braucht eine Internetverbindung.';
    default:
      return 'Spracherkennung fehlgeschlagen: ' + code;
  }
}

export function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(seconds || 0));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
