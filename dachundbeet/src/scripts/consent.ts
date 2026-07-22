/**
 * Consent-Status (Cookie-/Werbe-Einwilligung) — zentrales Modul.
 * Speichert die Nutzerwahl in localStorage und benachrichtigt den Rest der
 * Seite (z. B. AdSense-Loader) per CustomEvent, wenn sich der Status ändert.
 */

export type ConsentValue = 'accepted' | 'rejected';
const KEY = 'db-consent';

export function getConsent(): ConsentValue | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'accepted' || v === 'rejected' ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    /* localStorage nicht verfügbar (z. B. privater Modus) — Wahl gilt nur für diese Session */
  }
  window.dispatchEvent(new CustomEvent('consent-changed', { detail: value }));
}

export function resetConsent(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
