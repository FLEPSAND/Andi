/**
 * Client-Runtime für alle Rechner.
 * Liest die Slider (data-input) aus, ruft die passende Rechen-Funktion
 * (dispatch per data-calc = slug) auf und schreibt die Ergebnisse (data-output)
 * in deutscher Zahlenformatierung zurück. Läuft nur im Browser.
 */
import { COMPUTE } from './compute';

const fmt = (val: number, decimals = 0): string =>
  new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);

function initCalc(root: HTMLElement): void {
  const slug = root.dataset.calc || '';
  const compute = COMPUTE[slug];
  if (!compute) return;

  const inputs = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[data-input]')
  );
  const valueEls = new Map<string, HTMLElement>();
  root.querySelectorAll<HTMLElement>('[data-value]').forEach((el) => {
    if (el.dataset.value) valueEls.set(el.dataset.value, el);
  });
  const outputEls = Array.from(
    root.querySelectorAll<HTMLElement>('[data-output]')
  );

  function update(): void {
    const v: Record<string, number> = {};
    for (const inp of inputs) {
      const id = inp.dataset.input as string;
      v[id] = Number(inp.value);
      const el = valueEls.get(id);
      if (el) el.textContent = fmt(Number(inp.value), Number(inp.dataset.decimals || 0));
    }
    const out = compute(v);
    for (const el of outputEls) {
      const id = el.dataset.output as string;
      let val = out[id];
      if (val === undefined || !isFinite(val)) val = 0;
      el.textContent = fmt(val, Number(el.dataset.decimals || 0));
    }
  }

  for (const inp of inputs) inp.addEventListener('input', update);
  update();
}

document
  .querySelectorAll<HTMLElement>('[data-calc]')
  .forEach((el) => initCalc(el));
