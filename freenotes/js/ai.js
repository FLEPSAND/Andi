/**
 * Pluggable analysis backends — same idea as the remote's Transport layer.
 *
 * `local`     runs a plain extractive analysis in the browser. No network, no
 *             key, no data leaves the device. It is not a language model; it
 *             ranks and picks sentences that are already in the note.
 * `anthropic` calls the Claude Messages API with a key the user supplies.
 * `custom`    calls any OpenAI-compatible /chat/completions endpoint.
 *
 * Every provider exposes the same two methods:
 *   analyze(kind, text)                 kind: summary | keypoints | actions | quiz
 *   chat(question, context, history)
 */

const MAX_CONTEXT = 24000; // characters handed to a remote model

const TASKS = {
  summary: {
    label: 'Zusammenfassung',
    instruction: 'Fasse die Notiz in 4–6 Sätzen zusammen. Schreibe sachlich und ohne Einleitungsfloskel.'
  },
  keypoints: {
    label: 'Kernpunkte',
    instruction: 'Nenne die wichtigsten Punkte der Notiz als kurze Liste mit maximal 8 Einträgen. Ein Punkt pro Zeile, beginnend mit "- ".'
  },
  actions: {
    label: 'Aufgaben',
    instruction: 'Liste alle Aufgaben, Zusagen und Termine aus der Notiz als "- [ ] …" auf. Wenn keine enthalten sind, antworte genau: Keine Aufgaben gefunden.'
  },
  quiz: {
    label: 'Lernfragen',
    instruction: 'Erstelle 5 Verständnisfragen zum Inhalt, jeweils mit einer kurzen Antwort. Format: "F: …" gefolgt von "A: …".'
  }
};

export const TASK_LABELS = Object.fromEntries(
  Object.entries(TASKS).map(([k, v]) => [k, v.label])
);

const SYSTEM = [
  'Du bist ein Assistent in einer Notiz-App und arbeitest ausschließlich mit dem gelieferten Notiztext.',
  'Antworte auf Deutsch, sachlich und knapp, ohne Höflichkeitsfloskeln und ohne Wiederholung der Frage.',
  'Wenn die Notiz die Frage nicht beantwortet, sag genau das, statt zu raten.'
].join(' ');

/* ───────────────────────── Lokal ───────────────────────── */

const STOPWORDS = new Set(`
aber alle allem allen aller alles als also am an andere anderen auch auf aus bei beim bin bis bist da damit
dann das dass dem den denn der des dessen die dies diese diesem diesen dieser dieses doch dort du durch ein
eine einem einen einer eines er es etwas euch euer für gegen gewesen hab habe haben hat hatte hatten hier hin
ihr ihre ihrem ihren ihrer ihres im in indem ins ist ja jede jedem jeden jeder jedes jene jetzt kann kein
keine können könnte man mehr mein meine mit muss musste nach nicht nichts noch nun nur ob oder ohne schon
sehr sein seine seinem seinen seiner sich sie sind so solche soll sollte sondern sonst über um und uns unser
unter vom von vor war waren warum was weg weil weiter welche wenn wer werde werden wie wieder will wir wird
wirst wo wollen wollte würde zu zum zur zwar zwischen
a about after all also an and any are as at be because been but by can could did do does for from get had has
have how i if in into is it its just like make may more most no not of on one only or other our out over
said say see should since so some such than that the their them then there these they this those to too under
up use very was way we were what when where which who will with would you your
`.trim().split(/\s+/));

const ACTION_HINTS = /(\bmuss\b|\bmüssen\b|\bsollte\b|\bsollen\b|\bto-?do\b|\baufgabe\b|\bdeadline\b|\bfrist\b|\bbis (zum|spätestens|freitag|montag|dienstag|mittwoch|donnerstag|samstag|sonntag)\b|\berledigen\b|\bklären\b|\bprüfen\b|\bvorbereiten\b|\bnachfragen\b|\bnicht vergessen\b|\bwir brauchen\b|\banrufen\b|\bschicken\b|\bmelden\b|\btermin\b)/i;
const CHECKBOX = /^\s*(?:[-*]\s*\[\s?\]|\[\s?\]|☐|todo:|to-do:|aufgabe:)\s*/i;

function sentences(text) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÄÖÜ0-9„"])/)
    .map(s => s.trim())
    .filter(s => s.length > 25);
}

function words(text) {
  return text.toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w));
}

function frequencies(text) {
  const freq = new Map();
  for (const w of words(text)) freq.set(w, (freq.get(w) || 0) + 1);
  return freq;
}

function scoreSentence(sentence, freq) {
  const ws = words(sentence);
  if (!ws.length) return 0;
  let score = 0;
  for (const w of ws) score += freq.get(w) || 0;
  return score / Math.sqrt(ws.length); // long sentences must earn their length
}

function rank(text, count) {
  const list = sentences(text);
  if (!list.length) return [];
  const freq = frequencies(text);
  return list
    .map((s, i) => ({ s, i, score: scoreSentence(s, freq) * (i === 0 ? 1.25 : 1) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .sort((a, b) => a.i - b.i)
    .map(x => x.s);
}

class LocalProvider {
  constructor() {
    this.id = 'local';
    this.label = 'lokal';
    this.remote = false;
  }

  async analyze(kind, text) {
    text = (text || '').trim();
    if (text.length < 60) return 'Die Notiz enthält noch zu wenig Text für eine Auswertung.';

    if (kind === 'summary') {
      const picked = rank(text, Math.min(6, Math.max(3, Math.round(sentences(text).length * 0.2))));
      return picked.join(' ') || 'Kein zusammenhängender Text gefunden.';
    }

    if (kind === 'keypoints') {
      const picked = rank(text, 8);
      const topics = Array.from(frequencies(text).entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]);
      return picked.map(s => '- ' + s).join('\n') +
        (topics.length ? '\n\nHäufige Begriffe: ' + topics.join(', ') : '');
    }

    if (kind === 'actions') {
      const lines = text.split(/\n+/).flatMap(l => (l.length > 200 ? sentences(l) : [l]));
      const hits = [];
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (CHECKBOX.test(line)) hits.push(line.replace(CHECKBOX, ''));
        else if (ACTION_HINTS.test(line) && line.length < 240) hits.push(line.replace(/^[-*•]\s*/, ''));
      }
      const unique = Array.from(new Set(hits));
      return unique.length
        ? unique.map(h => '- [ ] ' + h).join('\n')
        : 'Keine Aufgaben gefunden.';
    }

    if (kind === 'quiz') {
      const freq = frequencies(text);
      const picked = rank(text, 5);
      if (!picked.length) return 'Zu wenig Text für Lernfragen.';
      return picked.map((s, n) => {
        const term = words(s).sort((a, b) => (freq.get(b) || 0) - (freq.get(a) || 0))[0];
        if (!term) return `${n + 1}. ${s}`;
        const re = new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\w*', 'i');
        const gap = s.replace(re, '_____');
        return `${n + 1}. Lückentext: ${gap}\n   Antwort: ${s.match(re)[0]}`;
      }).join('\n\n');
    }

    return 'Unbekannte Auswertung.';
  }

  async chat(question, context) {
    const q = (question || '').trim();
    if (!q) return '';
    if (!context || context.trim().length < 30) {
      return 'Die Notiz ist noch leer — ohne Inhalt kann die lokale Auswertung nichts nachschlagen.';
    }
    const qWords = new Set(words(q));
    const list = sentences(context);
    const scored = list
      .map((s, i) => {
        const overlap = words(s).filter(w => qWords.has(w)).length;
        return { s, i, overlap };
      })
      .filter(x => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap)
      .slice(0, 3)
      .sort((a, b) => a.i - b.i);

    if (!scored.length) {
      return 'Dazu steht nichts in der Notiz. (Lokale Suche vergleicht nur Wörter — für echte Antworten in den Einstellungen einen KI-Anbieter hinterlegen.)';
    }
    return 'Passende Stellen aus der Notiz:\n\n' + scored.map(x => '> ' + x.s).join('\n\n');
  }
}

/* ───────────────────────── Anthropic ───────────────────────── */

class AnthropicProvider {
  constructor(settings) {
    this.id = 'anthropic';
    this.label = 'Claude';
    this.remote = true;
    this.key = settings.apiKey;
    this.model = settings.model || 'claude-sonnet-5';
  }

  async _call(messages, system) {
    if (!this.key) throw new Error('Kein API-Schlüssel hinterlegt.');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': this.key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        system,
        messages
      })
    });
    if (!res.ok) throw new Error(await describeError(res));
    const data = await res.json();
    return (data.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')
      .trim();
  }

  analyze(kind, text) {
    const task = TASKS[kind];
    if (!task) return Promise.resolve('Unbekannte Auswertung.');
    return this._call(
      [{ role: 'user', content: `${task.instruction}\n\n<notiz>\n${clip(text)}\n</notiz>` }],
      SYSTEM
    );
  }

  chat(question, context, history = []) {
    const messages = history.slice(-8).map(m => ({ role: m.role, content: m.content }));
    messages.push({
      role: 'user',
      content: `<notiz>\n${clip(context)}\n</notiz>\n\nFrage: ${question}`
    });
    return this._call(messages, SYSTEM);
  }
}

/* ───────────────────────── OpenAI-kompatibel ───────────────────────── */

class CustomProvider {
  constructor(settings) {
    this.id = 'custom';
    this.label = 'eigener Endpunkt';
    this.remote = true;
    this.key = settings.apiKey;
    this.model = settings.model || 'gpt-4o-mini';
    this.base = (settings.baseUrl || '').replace(/\/+$/, '');
  }

  async _call(messages) {
    if (!this.base) throw new Error('Keine Basis-URL hinterlegt.');
    const res = await fetch(this.base + '/chat/completions', {
      method: 'POST',
      headers: Object.assign(
        { 'content-type': 'application/json' },
        this.key ? { authorization: 'Bearer ' + this.key } : {}
      ),
      body: JSON.stringify({
        model: this.model,
        max_tokens: 1500,
        messages: [{ role: 'system', content: SYSTEM }].concat(messages)
      })
    });
    if (!res.ok) throw new Error(await describeError(res));
    const data = await res.json();
    const choice = data.choices && data.choices[0];
    return ((choice && choice.message && choice.message.content) || '').trim();
  }

  analyze(kind, text) {
    const task = TASKS[kind];
    if (!task) return Promise.resolve('Unbekannte Auswertung.');
    return this._call([{ role: 'user', content: `${task.instruction}\n\n<notiz>\n${clip(text)}\n</notiz>` }]);
  }

  chat(question, context, history = []) {
    const messages = history.slice(-8).map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: `<notiz>\n${clip(context)}\n</notiz>\n\nFrage: ${question}` });
    return this._call(messages);
  }
}

/* ───────────────────────── Fabrik ───────────────────────── */

export function createProvider(settings) {
  if (settings.provider === 'anthropic' && settings.apiKey) return new AnthropicProvider(settings);
  if (settings.provider === 'custom' && settings.baseUrl) return new CustomProvider(settings);
  return new LocalProvider();
}

function clip(text) {
  const t = (text || '').trim();
  return t.length > MAX_CONTEXT ? t.slice(0, MAX_CONTEXT) + '\n[…gekürzt]' : t;
}

async function describeError(res) {
  let detail = '';
  try {
    const body = await res.json();
    detail = (body.error && (body.error.message || body.error.type)) || JSON.stringify(body).slice(0, 200);
  } catch {
    detail = res.statusText;
  }
  if (res.status === 401 || res.status === 403) return `Zugriff abgelehnt (${res.status}): ${detail}`;
  if (res.status === 429) return `Rate-Limit erreicht: ${detail}`;
  return `Anfrage fehlgeschlagen (${res.status}): ${detail}`;
}
