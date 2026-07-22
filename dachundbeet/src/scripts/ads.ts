/**
 * AdSense-Loader — lädt das AdSense-Skript und aktiviert Anzeigenslots
 * NUR nachdem der Nutzer über den Consent-Banner zugestimmt hat.
 * Ohne Zustimmung bleibt der Platzhalter stehen, es wird kein Google-Skript
 * geladen und keine Anzeige ausgeliefert.
 */
import { getConsent } from './consent';

function loadAdsenseScript(clientId: string): void {
  if (document.querySelector('script[data-adsbygoogle-script]')) return;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
  s.crossOrigin = 'anonymous';
  s.dataset.adsbygoogleScript = '1';
  document.head.appendChild(s);
}

function activateSlot(el: HTMLElement): void {
  const client = el.dataset.adClient;
  const slot = el.dataset.adSlot;
  if (!client || !slot) return; // Slot-ID noch nicht konfiguriert
  const body = el.querySelector<HTMLElement>('[data-adslot-body]');
  if (!body || body.querySelector('ins.adsbygoogle')) return;

  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = client;
  ins.dataset.adSlot = slot;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  body.replaceChildren(ins);

  try {
    (window as any).adsbygoogle = (window as any).adsbygoogle || [];
    (window as any).adsbygoogle.push({});
  } catch {
    /* AdSense-Skript evtl. noch nicht bereit */
  }
}

function activateAll(): void {
  document
    .querySelectorAll<HTMLElement>('[data-adslot][data-enabled="1"]')
    .forEach(activateSlot);
}

function onConsentGranted(): void {
  const first = document.querySelector<HTMLElement>('[data-adslot][data-enabled="1"]');
  const clientId = first?.dataset.adClient;
  if (clientId) loadAdsenseScript(clientId);
  // Skript braucht einen Moment zum Laden, bevor push() sinnvoll ist.
  window.setTimeout(activateAll, 300);
}

if (getConsent() === 'accepted') onConsentGranted();

window.addEventListener('consent-changed', (e: Event) => {
  const detail = (e as CustomEvent<'accepted' | 'rejected'>).detail;
  if (detail === 'accepted') onConsentGranted();
});
