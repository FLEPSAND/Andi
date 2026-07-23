/**
 * Zentrale Projekt-Konfiguration — die EINE Stelle, an der Marke, Domain,
 * AdSense- und Affiliate-Einstellungen liegen. Domain wechseln = hier ändern,
 * alles andere (Canonicals, Sitemap, ads.txt, OG-Tags) zieht automatisch nach.
 */

export const SITE = {
  name: 'Dach & Beet',
  /** Slogan / Tagline unter dem Logo */
  tagline: 'Haus · Energie · Garten',
  /** Kurzbeschreibung für Meta-Description der Startseite */
  description:
    'Kostenlose, präzise Online-Rechner für Haus, Energie und Garten. ' +
    'Solar, Wärmepumpe, Balkonkraftwerk, Energiekosten & mehr — sofort im Browser, ohne Anmeldung.',
  /** Produktions-URL ohne abschließenden Slash */
  url: 'https://dachundbeet.de',
  locale: 'de-DE',
  lang: 'de',
  /** E-Mail für Kontakt/Impressum */
  email: 'andreas.fleps@proton.me',
} as const;

/**
 * Google AdSense.
 * `enabled` erst auf true setzen, wenn die Site im AdSense-Konto freigegeben ist.
 * Solange false, werden dezente Platzhalter statt echter Anzeigen gerendert.
 */
export const ADSENSE = {
  enabled: false,
  /** Publisher-ID (öffentlich, steht ohnehin in ads.txt & im Anzeigen-Code) */
  publisherId: 'ca-pub-1117343635620263',
} as const;

/**
 * Affiliate / Lead-Gen.
 * Platzhalter-Links vor Launch mit echten Partnerprogramm-URLs ersetzen.
 * `enabled` steuert, ob Affiliate-CTAs überhaupt angezeigt werden.
 */
export const AFFILIATE = {
  enabled: true,
  /** Pflicht-Hinweis nach dt. Recht in der Nähe von Affiliate-Links */
  disclosure:
    'Anzeige · Einige Links sind Empfehlungs-/Affiliate-Links. Kaufst du darüber, ' +
    'erhalten wir ggf. eine Provision — für dich ohne Mehrkosten.',
} as const;

/**
 * Website-Verifizierung für Suchmaschinen-Tools (Search Console, Bing etc.).
 * Leerer String = Meta-Tag wird nicht gerendert.
 */
export const VERIFICATION = {
  google: 'ZFI8O9KBF5JEtJS_YjgNU9G3DFU3mAkCk6sGkHvpDj4',
  bing: '',
} as const;

/** Hauptnavigation. Neue Punkte hier ergänzen — Header/Footer ziehen nach. */
export const NAV = [
  { label: 'Rechner', href: '/rechner' },
  { label: 'Ratgeber', href: '/ratgeber' },
  { label: 'Über uns', href: '/ueber-uns' },
] as const;
