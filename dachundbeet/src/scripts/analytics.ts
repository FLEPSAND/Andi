/**
 * Google Analytics (GA4) — lädt NUR nach Zustimmung über den Cookie-Banner.
 * Analog zu scripts/ads.ts: ohne "accepted" wird kein Google-Skript geladen
 * und keine Nutzungsdaten übertragen.
 */
import { getConsent } from './consent';
import { ANALYTICS } from '../config';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function loadGtag(id: string): void {
  if (document.querySelector('script[data-gtag-script]')) return;

  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  s.dataset.gtagScript = '1';
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag('js', new Date());
  window.gtag('config', id);
}

function onConsentGranted(): void {
  if (!ANALYTICS.enabled || !ANALYTICS.measurementId) return;
  loadGtag(ANALYTICS.measurementId);
}

if (getConsent() === 'accepted') onConsentGranted();

window.addEventListener('consent-changed', (e: Event) => {
  const detail = (e as CustomEvent<'accepted' | 'rejected'>).detail;
  if (detail === 'accepted') onConsentGranted();
});
