/**
 * Rechner-Registry — die zentrale Liste aller Rechner.
 * Jeder Eintrag beschreibt einen Rechner vollständig: Metadaten, Eingabe-Slider,
 * Ergebnis-Felder, Inhalt (Ratgeber-Text) und FAQ.
 *
 * NEUEN RECHNER HINZUFÜGEN:
 *   1. Rechen-Funktion in src/scripts/compute.ts ergänzen (gleicher slug).
 *   2. Hier ein Objekt in RECHNER anhängen.
 * -> Übersicht, Navigation-Zähler, Sitemap, Detailseite & interne Links
 *    entstehen automatisch. Bestehende Seiten müssen NICHT angefasst werden.
 */

export interface CalcInput {
  id: string;
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  default: number;
  unit?: string;
  decimals?: number;
}

export interface CalcOutput {
  id: string;
  label: string;
  unit?: string;
  decimals?: number;
  money?: boolean;
  primary?: boolean;
}

export interface FaqItem { q: string; a: string; }

export interface Affiliate {
  heading: string;
  text: string;
  cta: string;
  /** Platzhalter — vor Launch mit echter Partner-URL ersetzen */
  href: string;
}

export interface Rechner {
  slug: string;
  category: 'Energie' | 'Garten' | 'Haus';
  icon: string;
  title: string;
  cardTitle: string;
  tagline: string;
  heroSubtitle: string;
  seoTitle: string;
  seoDescription: string;
  inputs: CalcInput[];
  outputs: CalcOutput[];
  note?: string;
  content: string;
  faq: FaqItem[];
  affiliate?: Affiliate;
  updated: string;
}

export const RECHNER: Rechner[] = [
  // ── ☀️ PV / Solar ────────────────────────────────────────────────────────
  {
    slug: 'pv-solar',
    category: 'Energie',
    icon: '☀️',
    title: 'Photovoltaik-Rechner',
    cardTitle: 'Photovoltaik-Rechner',
    tagline: 'Ertrag, Ersparnis & Amortisation deiner Solaranlage.',
    heroSubtitle: 'Wie viel bringt deine PV-Anlage – und wann hat sie sich bezahlt gemacht? Ertrag, jährlicher Nutzen und Amortisation in Sekunden.',
    seoTitle: 'Photovoltaik-Rechner 2026 – Ertrag & Amortisation berechnen',
    seoDescription: 'Kostenloser PV-Rechner: Jahresertrag, Stromersparnis, Einspeiseerlös und Amortisationszeit deiner Solaranlage sofort berechnen. Ohne Anmeldung.',
    inputs: [
      { id: 'kwp', label: 'Anlagenleistung', icon: '☀️', min: 1, max: 30, step: 0.5, default: 8, unit: 'kWp', decimals: 1 },
      { id: 'investition', label: 'Investition', icon: '💰', min: 2000, max: 60000, step: 500, default: 13000, unit: '€', decimals: 0 },
      { id: 'spezertrag', label: 'Spez. Ertrag', icon: '📈', min: 800, max: 1150, step: 10, default: 980, unit: 'kWh/kWp', decimals: 0 },
      { id: 'eigenverbrauch', label: 'Eigenverbrauch', icon: '🏠', min: 10, max: 90, step: 1, default: 35, unit: '%', decimals: 0 },
      { id: 'strompreis', label: 'Strompreis', icon: '⚡', min: 20, max: 60, step: 0.5, default: 35, unit: 'ct/kWh', decimals: 1 },
      { id: 'einspeiseverguetung', label: 'Einspeisung', icon: '🔌', min: 0, max: 15, step: 0.1, default: 8.1, unit: 'ct/kWh', decimals: 1 },
    ],
    outputs: [
      { id: 'nutzen', label: 'Nutzen pro Jahr', money: true, primary: true },
      { id: 'jahresertrag', label: 'Jahresertrag', unit: 'kWh', decimals: 0 },
      { id: 'amortisation', label: 'Amortisation', unit: 'Jahre', decimals: 1 },
      { id: 'gewinn20', label: 'Gewinn in 20 J.', money: true },
    ],
    note: 'Vereinfachte Modellrechnung ohne Degradation, Strompreissteigerung, Wartung und Steuern. Reale Werte können abweichen.',
    content: `
      <h2>Wie der Photovoltaik-Rechner rechnet</h2>
      <p>Der Rechner schätzt zunächst den <strong>Jahresertrag</strong> aus der Anlagenleistung (in kWp) und dem spezifischen Ertrag deines Standorts. In Deutschland liegt dieser meist zwischen <strong>900 und 1.050 kWh pro kWp</strong> und Jahr – im sonnigen Süden höher als an der Küste.</p>
      <p>Der Ertrag wird in zwei Teile zerlegt: Den <strong>Eigenverbrauch</strong> nutzt du direkt im Haus und sparst dafür den vollen Strompreis. Den Rest speist du ins Netz ein und erhältst die <strong>Einspeisevergütung</strong>. Beide Beträge zusammen ergeben deinen jährlichen finanziellen Nutzen. Die <strong>Amortisation</strong> ist die Investition geteilt durch diesen Nutzen.</p>
      <h3>Realistische Eigenverbrauchsquote</h3>
      <p>Ohne Speicher liegt der Eigenverbrauch typischerweise bei <strong>25–35 %</strong>. Mit einem Batteriespeicher sind <strong>55–75 %</strong> erreichbar – das erhöht die Ersparnis deutlich, kostet aber extra. Wärmepumpe, E-Auto oder eine flexible Waschmaschinen-Nutzung heben die Quote zusätzlich.</p>
      <h3>Tipp für mehr Genauigkeit</h3>
      <ul>
        <li>Berücksichtige eine jährliche Leistungsabnahme (Degradation) von rund 0,5 %.</li>
        <li>Steigende Strompreise verkürzen die Amortisation – hier konservativ gerechnet.</li>
        <li>Wartung, Versicherung und Zählergebühr solltest du gegenrechnen.</li>
      </ul>
      <h3>Mit oder ohne Speicher?</h3>
      <p>Ein Batteriespeicher hebt den Eigenverbrauch von rund 30 % auf 55–75 % und steigert damit die jährliche Ersparnis spürbar. Er kostet aber 4.000–10.000 € extra und verlängert oft die Amortisation. Faustregel: Rechne die Anlage zuerst ohne Speicher durch und prüfe dann, ob der Speicher seinen Mehrpreis über die Lebensdauer wieder einspielt. Wer eine Wärmepumpe oder ein E-Auto hat, profitiert am meisten, weil der Solarstrom dann fast vollständig selbst genutzt wird.</p>
    `,
    faq: [
      { q: 'Wie viel kWp brauche ich für mein Haus?', a: 'Als Faustregel gilt: pro 1.000 kWh Jahresstromverbrauch etwa 1 kWp. Ein 4-Personen-Haushalt mit 4.000 kWh liegt also bei rund 4–6 kWp – mehr, wenn Wärmepumpe oder E-Auto dazukommen.' },
      { q: 'Lohnt sich ein Batteriespeicher?', a: 'Ein Speicher erhöht den Eigenverbrauch von ~30 % auf 55–75 % und damit die Ersparnis. Ob er sich rechnet, hängt von Speicherpreis, Strompreis und deinem Verbrauchsprofil ab. Rechne beide Varianten durch.' },
      { q: 'Wie hoch ist die Einspeisevergütung 2026?', a: 'Für kleine Dachanlagen mit Teileinspeisung liegt sie 2026 bei rund 8 ct/kWh und wird bei Inbetriebnahme für 20 Jahre garantiert. Prüfe den aktuellen Satz der Bundesnetzagentur.' },
      { q: 'Ist der Rechner verbindlich?', a: 'Nein. Es ist eine transparente Modellrechnung zur ersten Orientierung. Für eine belastbare Auslegung hol dir ein individuelles Angebot eines Fachbetriebs.' },
    ],
    affiliate: {
      heading: 'Kostenlose Photovoltaik-Angebote vergleichen',
      text: 'Lass dir unverbindlich mehrere Angebote geprüfter Fachbetriebe aus deiner Region erstellen und finde den besten Preis für deine Anlage.',
      cta: 'Angebote vergleichen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🔌 Balkonkraftwerk ────────────────────────────────────────────────────
  {
    slug: 'balkonkraftwerk',
    category: 'Energie',
    icon: '🔌',
    title: 'Balkonkraftwerk-Rechner',
    cardTitle: 'Balkonkraftwerk-Rechner',
    tagline: 'Ertrag & Ersparnis deiner Steckersolar-Anlage.',
    heroSubtitle: 'Was bringt ein Balkonkraftwerk wirklich? Berechne Jahresertrag, jährliche Ersparnis und wann sich die Anschaffung amortisiert.',
    seoTitle: 'Balkonkraftwerk-Rechner 2026 – Ertrag & Ersparnis berechnen',
    seoDescription: 'Balkonkraftwerk lohnt sich? Berechne Ertrag, Stromersparnis pro Jahr und Amortisation deiner Steckersolar-Anlage kostenlos und sofort.',
    inputs: [
      { id: 'leistung', label: 'Modulleistung', icon: '🔆', min: 300, max: 2000, step: 10, default: 800, unit: 'Wp', decimals: 0 },
      { id: 'spezertrag', label: 'Spez. Ertrag', icon: '📈', min: 600, max: 1050, step: 10, default: 850, unit: 'kWh/kWp', decimals: 0 },
      { id: 'eigenverbrauch', label: 'Eigenverbrauch', icon: '🏠', min: 40, max: 100, step: 1, default: 85, unit: '%', decimals: 0 },
      { id: 'strompreis', label: 'Strompreis', icon: '⚡', min: 20, max: 60, step: 0.5, default: 35, unit: 'ct/kWh', decimals: 1 },
      { id: 'kosten', label: 'Anschaffung', icon: '💰', min: 150, max: 1500, step: 10, default: 500, unit: '€', decimals: 0 },
    ],
    outputs: [
      { id: 'ersparnis', label: 'Ersparnis pro Jahr', money: true, primary: true },
      { id: 'jahresertrag', label: 'Jahresertrag', unit: 'kWh', decimals: 0 },
      { id: 'amortisation', label: 'Amortisation', unit: 'Jahre', decimals: 1 },
      { id: 'ersparnis10', label: 'Gewinn in 10 J.', money: true },
    ],
    note: 'Modellrechnung. Ausrichtung, Verschattung und Verbrauchsverhalten beeinflussen das Ergebnis stark.',
    content: `
      <h2>Lohnt sich ein Balkonkraftwerk?</h2>
      <p>Ein Balkonkraftwerk (auch Steckersolar) speist Solarstrom direkt über die Steckdose in deinen Haushalt. Da du den Strom fast vollständig <strong>selbst verbrauchst</strong>, sparst du den teuren Netzstrom – und genau darin liegt die Wirtschaftlichkeit.</p>
      <p>Seit 2024 sind bis zu <strong>800 W Wechselrichter-Leistung</strong> erlaubt, die Anmeldung wurde stark vereinfacht (nur noch Eintrag im Marktstammdatenregister). Typische Komplettsets kosten <strong>350–700 €</strong> und amortisieren sich – je nach Ausrichtung – oft in <strong>4 bis 7 Jahren</strong>.</p>
      <h3>Was den Ertrag bestimmt</h3>
      <ul>
        <li><strong>Ausrichtung:</strong> Süd bringt am meisten, Ost/West verteilt den Ertrag über den Tag – oft besser zum Eigenverbrauch.</li>
        <li><strong>Neigung:</strong> 30–35° sind ideal; senkrecht am Balkongeländer bringt spürbar weniger.</li>
        <li><strong>Verschattung:</strong> schon ein verschatteter Teil des Moduls senkt den Ertrag deutlich.</li>
        <li><strong>Grundlast:</strong> Kühlschrank, Router & Standby laufen tagsüber – ideal für hohen Eigenverbrauch.</li>
      </ul>
      <h3>Anmeldung in 3 Schritten</h3>
      <ol>
        <li><strong>Aufstellen &amp; anstecken:</strong> Module montieren, Wechselrichter mit dem Hausnetz verbinden.</li>
        <li><strong>Registrieren:</strong> Eintrag im Marktstammdatenregister der Bundesnetzagentur (kostenlos, wenige Minuten).</li>
        <li><strong>Zähler:</strong> Der Netzbetreiber tauscht bei Bedarf gegen einen Zweirichtungszähler – darum musst du dich in der Regel nicht kümmern.</li>
      </ol>
    `,
    faq: [
      { q: 'Wie viel spart ein 800-W-Balkonkraftwerk?', a: 'Bei gutem Standort erzeugt es rund 700–800 kWh im Jahr. Bei hohem Eigenverbrauch und 35 ct/kWh sind das etwa 200–250 € Ersparnis pro Jahr.' },
      { q: 'Muss ich das Balkonkraftwerk anmelden?', a: 'Ja, aber es ist einfach: Eintrag im Marktstammdatenregister der Bundesnetzagentur. Eine separate Anmeldung beim Netzbetreiber ist seit 2024 nicht mehr nötig.' },
      { q: 'Reicht eine normale Steckdose?', a: 'In der Praxis ja – viele Sets kommen mit Schuko-Stecker. Eine spezielle Einspeisesteckdose (Wieland) gilt als sicherer; frage im Zweifel einen Elektriker.' },
      { q: 'Lohnt sich ein Speicher fürs Balkonkraftwerk?', a: 'Ein kleiner Speicher erhöht den Eigenverbrauch in die Abendstunden, verteuert die Anlage aber deutlich und verlängert die Amortisation. Für die meisten lohnt er sich noch nicht.' },
    ],
    affiliate: {
      heading: 'Balkonkraftwerk-Sets im Preisvergleich',
      text: 'Geprüfte Komplettsets mit 800-W-Wechselrichter – vergleiche Preise und finde ein Set, das zu deinem Balkon passt.',
      cta: 'Sets ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🔥 Wärmepumpe ─────────────────────────────────────────────────────────
  {
    slug: 'waermepumpe',
    category: 'Energie',
    icon: '🔥',
    title: 'Wärmepumpen-Rechner',
    cardTitle: 'Wärmepumpen-Rechner',
    tagline: 'Lohnt sich der Umstieg? Heizkosten im Vergleich.',
    heroSubtitle: 'Gas oder Öl gegen Wärmepumpe: Vergleiche die jährlichen Heizkosten und sieh, wie viel du pro Jahr sparen kannst.',
    seoTitle: 'Wärmepumpen-Rechner 2026 – Heizkosten & Ersparnis vergleichen',
    seoDescription: 'Lohnt sich die Wärmepumpe? Vergleiche Heizkosten von Gas/Öl mit einer Wärmepumpe und berechne deine jährliche Ersparnis – kostenlos.',
    inputs: [
      { id: 'heizbedarf', label: 'Heizwärmebedarf', icon: '🏡', min: 5000, max: 40000, step: 500, default: 18000, unit: 'kWh/a', decimals: 0 },
      { id: 'brennstoffpreis', label: 'Preis alt', icon: '🛢️', min: 6, max: 22, step: 0.5, default: 12, unit: 'ct/kWh', decimals: 1 },
      { id: 'wirkungsgrad', label: 'Wirkungsgrad alt', icon: '♨️', min: 70, max: 100, step: 1, default: 90, unit: '%', decimals: 0 },
      { id: 'jaz', label: 'JAZ Wärmepumpe', icon: '🔄', min: 2.5, max: 5, step: 0.1, default: 3.6, unit: '', decimals: 1 },
      { id: 'strompreis', label: 'WP-Stromtarif', icon: '⚡', min: 15, max: 45, step: 0.5, default: 27, unit: 'ct/kWh', decimals: 1 },
    ],
    outputs: [
      { id: 'ersparnis', label: 'Ersparnis pro Jahr', money: true, primary: true },
      { id: 'kostenAlt', label: 'Kosten alt / Jahr', money: true },
      { id: 'kostenWp', label: 'Kosten WP / Jahr', money: true },
      { id: 'ersparnis15', label: 'Ersparnis in 15 J.', money: true },
    ],
    note: 'Reine Betriebskosten. Anschaffung, Förderung (BEG), Wartung und CO₂-Preis sind nicht enthalten.',
    content: `
      <h2>Wärmepumpe vs. Gas/Öl – was ist günstiger?</h2>
      <p>Entscheidend ist die <strong>Jahresarbeitszahl (JAZ)</strong>: Sie sagt, wie viele Kilowattstunden Wärme die Wärmepumpe aus einer Kilowattstunde Strom macht. Eine JAZ von 3,6 bedeutet, dass aus 1 kWh Strom 3,6 kWh Wärme werden. Je höher die JAZ und je günstiger dein Wärmepumpen-Stromtarif, desto klarer schlägt die Wärmepumpe fossile Heizungen.</p>
      <p>Der Rechner ermittelt die <strong>Betriebskosten beider Systeme</strong> aus deinem Heizwärmebedarf. Bei der alten Heizung wird der Wirkungsgrad berücksichtigt (ältere Gaskessel liegen oft nur bei 80–85 %).</p>
      <h3>Wann lohnt sich die Wärmepumpe besonders?</h3>
      <ul>
        <li><strong>Gut gedämmtes Haus</strong> mit niedriger Vorlauftemperatur (Flächenheizung ideal).</li>
        <li><strong>Hohe JAZ (≥ 3,5):</strong> moderne Geräte und passende Auslegung.</li>
        <li><strong>Günstiger Wärmepumpentarif</strong> oder Kombination mit eigener PV-Anlage.</li>
        <li><strong>Förderung:</strong> Über die BEG sind je nach Fall bis zu 70 % Zuschuss auf die Investition möglich.</li>
      </ul>
      <h3>So verbesserst du die Jahresarbeitszahl</h3>
      <p>Je niedriger die Vorlauftemperatur, desto höher die JAZ. Diese Maßnahmen helfen: größere oder Niedertemperatur-Heizkörper, eine Fußbodenheizung, gedämmtes Dach und moderne Fenster sowie ein hydraulischer Abgleich der Heizung. Oft reichen schon Teilmaßnahmen, um von einer Vorlauftemperatur über 60 °C auf 45–50 °C zu kommen – und damit von „grenzwertig" auf „wirtschaftlich".</p>
    `,
    faq: [
      { q: 'Was ist eine gute Jahresarbeitszahl?', a: 'Werte ab 3,5 gelten als gut, moderne Anlagen im Bestand erreichen oft 3,0–4,0, im Neubau mit Fußbodenheizung auch darüber. Unter 2,8 wird es wirtschaftlich schwierig.' },
      { q: 'Funktioniert eine Wärmepumpe im Altbau?', a: 'Ja, wenn die Vorlauftemperatur nicht zu hoch sein muss. Größere Heizkörper, gedämmte Fassade oder Fußbodenheizung helfen. Eine Heizlastberechnung durch einen Fachbetrieb ist ratsam.' },
      { q: 'Wie stark senkt eine PV-Anlage die WP-Kosten?', a: 'Läuft die Wärmepumpe tagsüber mit eigenem Solarstrom, sinken die Stromkosten spürbar. Im Winter ist der PV-Ertrag jedoch gering – der Großteil kommt dann aus dem Netz.' },
      { q: 'Ist die Anschaffung im Rechner enthalten?', a: 'Nein, der Rechner vergleicht die laufenden Betriebskosten. Für die Gesamtwirtschaftlichkeit musst du Investition abzüglich Förderung und die Wartung berücksichtigen.' },
    ],
    affiliate: {
      heading: 'Wärmepumpen-Angebote & Förder-Check',
      text: 'Regionale Fachbetriebe vergleichen und prüfen lassen, welche Förderung für dich möglich ist – unverbindlich.',
      cta: 'Angebote einholen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🚗 Wallbox / E-Auto ───────────────────────────────────────────────────
  {
    slug: 'wallbox-ladekosten',
    category: 'Energie',
    icon: '🚗',
    title: 'E-Auto Ladekosten-Rechner',
    cardTitle: 'Ladekosten-Rechner',
    tagline: 'Was kostet das Laden deines E-Autos pro Jahr?',
    heroSubtitle: 'Zuhause an der Wallbox oder unterwegs laden: Berechne deine jährlichen Ladekosten, die Kosten pro 100 km und pro Monat.',
    seoTitle: 'E-Auto Ladekosten-Rechner 2026 – Stromkosten pro 100 km',
    seoDescription: 'Was kostet das Laden eines E-Autos? Berechne Ladekosten pro Jahr, Monat und 100 km – für Laden zuhause und unterwegs. Kostenlos & sofort.',
    inputs: [
      { id: 'fahrleistung', label: 'Fahrleistung', icon: '🛣️', min: 3000, max: 50000, step: 500, default: 13000, unit: 'km/a', decimals: 0 },
      { id: 'verbrauch', label: 'Verbrauch', icon: '🔋', min: 12, max: 30, step: 0.5, default: 18, unit: 'kWh/100km', decimals: 1 },
      { id: 'anteilHeim', label: 'Anteil zuhause', icon: '🏠', min: 0, max: 100, step: 5, default: 80, unit: '%', decimals: 0 },
      { id: 'strompreis', label: 'Strompreis Heim', icon: '⚡', min: 15, max: 60, step: 0.5, default: 33, unit: 'ct/kWh', decimals: 1 },
      { id: 'preisOeff', label: 'Preis öffentlich', icon: '🅿️', min: 30, max: 90, step: 1, default: 55, unit: 'ct/kWh', decimals: 0 },
    ],
    outputs: [
      { id: 'kosten', label: 'Ladekosten / Jahr', money: true, primary: true },
      { id: 'gesamtKwh', label: 'Strombedarf', unit: 'kWh', decimals: 0 },
      { id: 'pro100', label: 'Kosten / 100 km', money: true },
      { id: 'proMonat', label: 'Kosten / Monat', money: true },
    ],
    note: 'Ohne Ladeverluste (real ca. 10–15 % Aufschlag) und ohne Grundgebühren von Ladekarten.',
    content: `
      <h2>Was kostet das Laden eines E-Autos?</h2>
      <p>Die Ladekosten hängen an drei Stellschrauben: deinem <strong>Verbrauch</strong> (kWh/100 km), deiner <strong>Fahrleistung</strong> und vor allem am <strong>Verhältnis von Heim- zu Ladesäulen-Strom</strong>. Zuhause lädst du oft für rund 30 ct/kWh, an Schnellladern unterwegs schnell für 55–79 ct/kWh – der Unterschied macht über das Jahr hunderte Euro aus.</p>
      <p>Der Rechner teilt deinen Jahres-Strombedarf entsprechend auf und ermittelt daraus die <strong>Gesamtkosten, die Kosten pro 100 km und pro Monat</strong>.</p>
      <h3>So senkst du die Ladekosten</h3>
      <ul>
        <li><strong>Möglichst zuhause laden</strong> – idealerweise mit eigenem PV-Strom für unter 15 ct/kWh.</li>
        <li><strong>Wärme im Winter</strong> einplanen: Der Verbrauch steigt bei Kälte um 20–30 %.</li>
        <li><strong>Ladetarife vergleichen:</strong> Die richtige Ladekarte spart an öffentlichen Säulen viel.</li>
        <li><strong>Wallbox statt Schuko:</strong> schneller, effizienter und sicherer als die Haushaltssteckdose.</li>
      </ul>
      <h3>Wallbox oder normale Steckdose?</h3>
      <p>An der Haushaltssteckdose (Schuko) lädt ein E-Auto mit maximal ca. 2,3 kW – über Nacht reicht das für Wenigfahrer, belastet die Steckdose aber dauerhaft stark. Eine <strong>Wallbox mit 11 kW</strong> lädt rund fünfmal schneller, effizienter (weniger Ladeverluste) und sicherer. Für regelmäßiges Laden zuhause ist sie klar die bessere Wahl; die Installation muss ein Elektrofachbetrieb übernehmen und ab 12 kW beim Netzbetreiber angemeldet werden.</p>
    `,
    faq: [
      { q: 'Wie viel kostet Laden pro 100 km?', a: 'Bei 18 kWh/100 km und 33 ct/kWh zuhause sind das rund 6 €. An teuren Schnellladern (60–79 ct) können es 11–14 € werden – deshalb lohnt Heimladen.' },
      { q: 'Was kostet eine Wallbox?', a: 'Die Wallbox selbst kostet meist 400–800 €, dazu kommt die Installation durch einen Elektriker (oft 500–1.500 €, je nach Aufwand). Regionale Förderungen gibt es zeitweise.' },
      { q: 'Lohnt sich Laden mit eigener PV-Anlage?', a: 'Ja, deutlich. Eigener Solarstrom kostet dich effektiv 8–12 ct/kWh statt 33 ct aus dem Netz. Ein Überschuss-Laden-Modus lädt gezielt, wenn die Sonne scheint.' },
      { q: 'Sind Ladeverluste berücksichtigt?', a: 'Nein, der Rechner nutzt den reinen Fahrzeugverbrauch. In der Praxis solltest du 10–15 % Ladeverluste aufschlagen – die tatsächlichen Kosten liegen also etwas höher.' },
    ],
    affiliate: {
      heading: 'Wallbox & Ökostromtarif finden',
      text: 'Vergleiche passende Wallboxen und günstige Autostrom-Tarife, um deine Ladekosten dauerhaft zu senken.',
      cta: 'Jetzt vergleichen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 💡 Stromkosten ────────────────────────────────────────────────────────
  {
    slug: 'stromkosten',
    category: 'Energie',
    icon: '💡',
    title: 'Stromkosten-Rechner',
    cardTitle: 'Stromkosten-Rechner',
    tagline: 'Aktueller vs. neuer Tarif – wie viel du sparst.',
    heroSubtitle: 'Zahlst du zu viel für Strom? Vergleiche deinen aktuellen Tarif mit einem neuen und sieh deine mögliche Ersparnis pro Jahr und Monat.',
    seoTitle: 'Stromkosten-Rechner 2026 – Stromkosten & Ersparnis berechnen',
    seoDescription: 'Stromkosten berechnen und Tarife vergleichen: Ermittle deine jährlichen Stromkosten und wie viel du mit einem Anbieterwechsel sparst. Kostenlos.',
    inputs: [
      { id: 'verbrauch', label: 'Jahresverbrauch', icon: '🔌', min: 800, max: 12000, step: 100, default: 3500, unit: 'kWh/a', decimals: 0 },
      { id: 'arbeitspreisAlt', label: 'Arbeitspreis alt', icon: '⚡', min: 20, max: 60, step: 0.5, default: 40, unit: 'ct/kWh', decimals: 1 },
      { id: 'grundpreisAlt', label: 'Grundpreis alt', icon: '📅', min: 0, max: 40, step: 0.5, default: 14, unit: '€/Mon', decimals: 1 },
      { id: 'arbeitspreisNeu', label: 'Arbeitspreis neu', icon: '⚡', min: 20, max: 60, step: 0.5, default: 30, unit: 'ct/kWh', decimals: 1 },
      { id: 'grundpreisNeu', label: 'Grundpreis neu', icon: '📅', min: 0, max: 40, step: 0.5, default: 10, unit: '€/Mon', decimals: 1 },
    ],
    outputs: [
      { id: 'ersparnis', label: 'Ersparnis pro Jahr', money: true, primary: true },
      { id: 'kostenAlt', label: 'Kosten aktuell', money: true },
      { id: 'kostenNeu', label: 'Kosten neu', money: true },
      { id: 'ersparnisMonat', label: 'Ersparnis / Monat', money: true },
    ],
    note: 'Ohne Boni und Kautionen. Achte bei Tarifen auf Preisgarantie, Vertragslaufzeit und Kündigungsfrist.',
    content: `
      <h2>Stromkosten berechnen und Tarife vergleichen</h2>
      <p>Deine Stromrechnung besteht aus zwei Teilen: dem <strong>Arbeitspreis</strong> (Cent pro verbrauchter Kilowattstunde) und dem <strong>Grundpreis</strong> (feste monatliche Gebühr, unabhängig vom Verbrauch). Der Rechner addiert beide für deinen aktuellen und einen neuen Tarif und zeigt dir die Differenz.</p>
      <p>Gerade nach dem Auslaufen einer Preisgarantie oder in der Grundversorgung zahlen viele Haushalte deutlich zu viel. Ein Wechsel ist meist in wenigen Minuten erledigt – der neue Anbieter kündigt in der Regel automatisch beim alten.</p>
      <h3>Durchschnittlicher Stromverbrauch</h3>
      <ul>
        <li><strong>1 Person:</strong> ca. 1.500–2.000 kWh/Jahr</li>
        <li><strong>2 Personen:</strong> ca. 2.500–3.000 kWh/Jahr</li>
        <li><strong>3–4 Personen:</strong> ca. 3.500–4.500 kWh/Jahr</li>
        <li><strong>Mit Wärmepumpe/E-Auto:</strong> deutlich mehr – oft 6.000 kWh und aufwärts</li>
      </ul>
      <h3>In 4 Schritten den Anbieter wechseln</h3>
      <ol>
        <li><strong>Verbrauch ablesen:</strong> Jahresverbrauch in kWh von der letzten Abrechnung nehmen.</li>
        <li><strong>Vergleichen:</strong> Tarife für deine Postleitzahl und deinen Verbrauch prüfen.</li>
        <li><strong>Wechseln:</strong> Neuer Anbieter kündigt in der Regel automatisch beim alten.</li>
        <li><strong>Kontrollieren:</strong> Nach 11 Monaten erneut vergleichen, bevor sich der Tarif verteuert.</li>
      </ol>
    `,
    faq: [
      { q: 'Wie oft sollte ich den Stromanbieter wechseln?', a: 'Einmal jährlich lohnt sich der Vergleich. Viele Tarife haben nach 12 Monaten schlechtere Konditionen – ein Wechsel oder eine Neuverhandlung spart oft dreistellige Beträge.' },
      { q: 'Was ist wichtiger – Arbeits- oder Grundpreis?', a: 'Bei hohem Verbrauch zählt der Arbeitspreis stärker, bei sehr niedrigem Verbrauch der Grundpreis. Der Rechner berücksichtigt beide, deshalb ist das Gesamtergebnis entscheidend.' },
      { q: 'Ist Ökostrom teurer?', a: 'Nicht unbedingt. Viele Ökostromtarife sind heute preislich gleichauf mit konventionellen Angeboten – teils sogar günstiger. Ein Vergleich lohnt sich.' },
      { q: 'Worauf sollte ich beim Tarif achten?', a: 'Auf eine Preisgarantie, eine überschaubare Vertragslaufzeit (idealerweise max. 12 Monate) und faire Kündigungsfristen. Vorsicht bei hohen Sofortboni, die die Ersparnis nur im ersten Jahr schönen.' },
    ],
    affiliate: {
      heading: 'Günstigere Stromtarife finden',
      text: 'Vergleiche geprüfte Stromtarife für deinen Verbrauch und deine Postleitzahl und wechsle in wenigen Minuten.',
      cta: 'Tarife vergleichen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🌱 Hochbeet ───────────────────────────────────────────────────────────
  {
    slug: 'hochbeet',
    category: 'Garten',
    icon: '🌱',
    title: 'Hochbeet-Füllmengen-Rechner',
    cardTitle: 'Hochbeet-Rechner',
    tagline: 'Wie viel Material brauchst du zum Befüllen?',
    heroSubtitle: 'Gib die Maße deines Hochbeets ein und erhalte die passenden Füllmengen je Schicht – inklusive Anzahl Säcke Pflanzerde.',
    seoTitle: 'Hochbeet-Rechner 2026 – Füllmenge & Erde-Bedarf berechnen',
    seoDescription: 'Hochbeet richtig befüllen: Berechne Füllvolumen und Materialmengen je Schicht (Häckselgut, Kompost, Pflanzerde) und die Anzahl Erdsäcke. Kostenlos.',
    inputs: [
      { id: 'laenge', label: 'Länge', icon: '📏', min: 50, max: 400, step: 5, default: 200, unit: 'cm', decimals: 0 },
      { id: 'breite', label: 'Breite', icon: '📐', min: 40, max: 200, step: 5, default: 100, unit: 'cm', decimals: 0 },
      { id: 'hoehe', label: 'Füllhöhe', icon: '📦', min: 30, max: 120, step: 5, default: 80, unit: 'cm', decimals: 0 },
    ],
    outputs: [
      { id: 'liter', label: 'Gesamtvolumen', unit: 'L', decimals: 0, primary: true },
      { id: 'haecksel', label: 'Häckselgut / Äste', unit: 'L', decimals: 0 },
      { id: 'kompost', label: 'Kompost / Grünschnitt', unit: 'L', decimals: 0 },
      { id: 'erde', label: 'Pflanzerde', unit: 'L', decimals: 0 },
      { id: 'saecke', label: 'Säcke Erde (à 40 L)', unit: 'Stk', decimals: 0 },
    ],
    note: 'Rechne 10–20 % mehr ein: Das Füllmaterial sackt im ersten Jahr zusammen und muss nachgefüllt werden.',
    content: `
      <h2>Hochbeet richtig befüllen – Schicht für Schicht</h2>
      <p>Ein Hochbeet wird nicht einfach mit Erde vollgekippt, sondern in <strong>Schichten</strong> aufgebaut. Von unten nach oben verrottet grobes Material langsam und liefert dabei über Jahre Nährstoffe und Wärme. Der Rechner teilt dein Füllvolumen automatisch auf die typischen Schichten auf.</p>
      <h3>Die klassischen Schichten</h3>
      <ul>
        <li><strong>Unten (ca. 30 %): Häckselgut, Äste, grober Strauchschnitt</strong> – sorgt für Drainage und Belüftung.</li>
        <li><strong>Mitte (ca. 45 %): Grünschnitt, Laub, halbreifer Kompost, Mist</strong> – die „Kompostierschicht".</li>
        <li><strong>Oben (ca. 25 %): hochwertige Pflanz- oder Hochbeeterde</strong> – hier wachsen deine Pflanzen.</li>
      </ul>
      <p>Eine dünne Lage Rasenschnitt oder Karton als Trennschicht (gegen Wühlmäuse ein Draht am Boden) verbessert das Ergebnis zusätzlich.</p>
      <h3>Wann und wie nachfüllen?</h3>
      <p>Im ersten Jahr sackt der Inhalt spürbar zusammen – oft um <strong>10–20 cm</strong>. Fülle im Frühjahr einfach frische Erde oder reifen Kompost oben nach. Nach etwa 5–7 Jahren ist das grobe Material vollständig zersetzt; dann lohnt sich eine komplette Neubefüllung.</p>
      <h3>Welche Erde für die oberste Schicht?</h3>
      <p>Für die Pflanzschicht eignet sich hochwertige, <strong>torffreie Hochbeet- oder Gemüseerde</strong> mit Kompostanteil. Sie ist nährstoffreich, locker und speichert Wasser gut. Günstige „Blumenerde" ist meist zu nährstoffarm und sackt stark zusammen. Tipp: Mische etwas reifen Kompost unter – das versorgt Starkzehrer wie Tomaten und Kürbis in der ersten Saison optimal.</p>
    `,
    faq: [
      { q: 'Wie viel Erde brauche ich für mein Hochbeet?', a: 'Nur die oberste Schicht (rund 25 % des Volumens) muss hochwertige Pflanzerde sein. Der Rechner zeigt dir die Litermenge und die Anzahl 40-Liter-Säcke direkt an.' },
      { q: 'Kann ich das Hochbeet komplett mit Erde füllen?', a: 'Möglich, aber teuer und weniger effektiv. Der klassische Schichtaufbau spart Erde, verbessert die Drainage und versorgt die Pflanzen über die Verrottung mit Nährstoffen.' },
      { q: 'Womit fülle ich die unteren Schichten?', a: 'Ideal ist Material aus dem eigenen Garten: Baum- und Strauchschnitt, Laub, Rasenschnitt und halbreifer Kompost. So entsorgst du Gartenabfälle sinnvoll und sparst Kosten.' },
      { q: 'Warum sackt das Hochbeet zusammen?', a: 'Das organische Füllmaterial zersetzt sich und verliert an Volumen. Das ist normal und erwünscht – plane 10–20 % Nachfüllmaterial für das erste Jahr ein.' },
    ],
    affiliate: {
      heading: 'Hochbeeterde & Zubehör bei BALDUR-Garten',
      text: 'Passende Pflanzerde, Kompost und Zubehör für dein Hochbeet – direkt bei BALDUR-Garten bestellen.',
      cta: 'Zu BALDUR-Garten',
      href: 'https://www.awin1.com/cread.php?awinmid=13634&awinaffid=2774494&clickref=Hochbeet-Rechner',
    },
    updated: '2026-07-22',
  },

  // ── 🧱 Dämmung / U-Wert ───────────────────────────────────────────────────
  {
    slug: 'daemmung',
    category: 'Haus',
    icon: '🧱',
    title: 'Dämmung- & U-Wert-Rechner',
    cardTitle: 'Dämmungs-Rechner',
    tagline: 'Heizkosten-Ersparnis durch bessere Dämmung.',
    heroSubtitle: 'Wie viel spart eine bessere Dämmung? Vergleiche den Wärmeverlust vor und nach der Sanierung und sieh deine jährliche Ersparnis.',
    seoTitle: 'Dämmung-Rechner 2026 – U-Wert & Heizkosten-Ersparnis berechnen',
    seoDescription: 'Wärmeverlust und Heizkosten-Ersparnis durch Dämmung berechnen: Gib Fläche und U-Werte vor und nach der Sanierung ein. Kostenlos & sofort.',
    inputs: [
      { id: 'flaeche', label: 'Bauteilfläche', icon: '📐', min: 5, max: 300, step: 1, default: 40, unit: 'm²', decimals: 0 },
      { id: 'uAlt', label: 'U-Wert vorher', icon: '🥶', min: 0.2, max: 3, step: 0.05, default: 1.4, unit: 'W/m²K', decimals: 2 },
      { id: 'uNeu', label: 'U-Wert nachher', icon: '🧥', min: 0.1, max: 1, step: 0.01, default: 0.24, unit: 'W/m²K', decimals: 2 },
      { id: 'energiepreis', label: 'Energiepreis', icon: '🔥', min: 6, max: 25, step: 0.5, default: 12, unit: 'ct/kWh', decimals: 1 },
    ],
    outputs: [
      { id: 'ersparnis', label: 'Ersparnis pro Jahr', money: true, primary: true },
      { id: 'verlustAlt', label: 'Verlust vorher', unit: 'kWh', decimals: 0 },
      { id: 'verlustNeu', label: 'Verlust nachher', unit: 'kWh', decimals: 0 },
      { id: 'ersparnisKwh', label: 'Ersparnis Energie', unit: 'kWh', decimals: 0 },
    ],
    note: 'Vereinfachte Rechnung über den Transmissionsverlust dieses Bauteils (Heizgradtage ~3.500 Kd/a). Wärmebrücken und Lüftungsverluste sind nicht enthalten.',
    content: `
      <h2>Was der U-Wert bedeutet</h2>
      <p>Der <strong>U-Wert</strong> (Wärmedurchgangskoeffizient) gibt an, wie viel Wärme durch ein Bauteil verloren geht – je <strong>niedriger</strong>, desto besser gedämmt. Eine ungedämmte Altbauwand liegt oft bei 1,2–1,6 W/m²K, eine frisch gedämmte Fassade erreicht 0,20–0,28 W/m²K. Schon dieser Sprung halbiert bis viertelt den Wärmeverlust der Wand.</p>
      <p>Der Rechner ermittelt den jährlichen <strong>Transmissionsverlust</strong> deines Bauteils vor und nach der Dämmung und rechnet die Differenz in Euro um – auf Basis typischer deutscher Heizgradtage.</p>
      <h3>Rechenbeispiel</h3>
      <p>40 m² Fassade, U-Wert von <strong>1,4 auf 0,24</strong> verbessert, Gaspreis 12 ct/kWh: Der Verlust sinkt von rund 4.700 auf 810 kWh pro Jahr – das sind etwa <strong>3.900 kWh</strong> weniger und rund <strong>470 €</strong> Ersparnis jährlich, nur für dieses eine Bauteil.</p>
      <h3>Typische U-Werte nach Sanierung</h3>
      <ul>
        <li><strong>Außenwand (WDVS):</strong> 0,20–0,28 W/m²K</li>
        <li><strong>Dach / oberste Geschossdecke:</strong> 0,14–0,24 W/m²K</li>
        <li><strong>Kellerdecke:</strong> 0,25–0,35 W/m²K</li>
        <li><strong>Fenster (3-fach):</strong> 0,8–1,1 W/m²K</li>
      </ul>
      <h3>Förderung nicht vergessen</h3>
      <p>Einzelmaßnahmen an der Gebäudehülle werden über die <strong>BEG-Förderung</strong> bezuschusst (Zuschuss oder steuerliche Abschreibung). Das verkürzt die Amortisation deiner Dämmung deutlich – rechne den Zuschuss immer mit ein.</p>
    `,
    faq: [
      { q: 'Welcher U-Wert ist gut?', a: 'Für eine gedämmte Außenwand gelten 0,20–0,24 W/m²K als guter Standard, beim Dach eher 0,14–0,20. Die Förderung setzt Mindestwerte voraus, die du erreichen musst.' },
      { q: 'Wie finde ich meinen aktuellen U-Wert heraus?', a: 'Aus Baujahr und Wandaufbau lässt er sich abschätzen; genaue Werte liefert ein Energieberater. Für eine erste Orientierung reichen die typischen Richtwerte im Rechner.' },
      { q: 'Lohnt sich Dämmung überhaupt noch?', a: 'Bei hohen Energiepreisen und mit Förderung amortisiert sich vor allem die Dämmung von Dach und oberster Geschossdecke oft in wenigen Jahren – sie ist meist die günstigste Maßnahme mit dem besten Verhältnis.' },
      { q: 'Sind Wärmebrücken berücksichtigt?', a: 'Nein, der Rechner betrachtet den reinen Bauteilverlust. Wärmebrücken (z. B. Balkonplatten) und Lüftungsverluste kommen in der Praxis hinzu – der reale Effekt kann also abweichen.' },
    ],
    affiliate: {
      heading: 'Sanierung & Förder-Check',
      text: 'Lass dich zu Dämmung und passender Förderung beraten und hol dir Angebote von Fachbetrieben aus deiner Region.',
      cta: 'Beratung anfragen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🌡️ Heizlast ──────────────────────────────────────────────────────────
  {
    slug: 'heizlast',
    category: 'Haus',
    icon: '🌡️',
    title: 'Heizlast-Rechner',
    cardTitle: 'Heizlast-Rechner',
    tagline: 'Welche Heizleistung braucht dein Haus?',
    heroSubtitle: 'Wie viel Kilowatt muss deine Heizung leisten? Schätze Heizlast, Jahres-Wärmebedarf und den ungefähren Brennstoffverbrauch.',
    seoTitle: 'Heizlast-Rechner 2026 – benötigte Heizleistung (kW) schätzen',
    seoDescription: 'Heizlast überschlägig berechnen: Ermittle die benötigte Heizleistung in kW, den Jahres-Wärmebedarf und den Gasverbrauch anhand von Fläche und Baustandard.',
    inputs: [
      { id: 'flaeche', label: 'Wohnfläche', icon: '🏠', min: 40, max: 400, step: 5, default: 130, unit: 'm²', decimals: 0 },
      { id: 'spez', label: 'Spez. Heizlast', icon: '🌡️', min: 30, max: 120, step: 5, default: 70, unit: 'W/m²', decimals: 0 },
      { id: 'vbh', label: 'Vollbenutzungsstd.', icon: '⏱️', min: 1400, max: 2200, step: 50, default: 1800, unit: 'h/a', decimals: 0 },
    ],
    outputs: [
      { id: 'kw', label: 'Heizlast', unit: 'kW', decimals: 1, primary: true },
      { id: 'bedarf', label: 'Wärmebedarf', unit: 'kWh/a', decimals: 0 },
      { id: 'gasM3', label: 'Gas ca.', unit: 'm³/a', decimals: 0 },
    ],
    note: 'Nur eine Überschlagsrechnung. Für die Auslegung einer Wärmepumpe ist eine raumweise Heizlastberechnung nach DIN EN 12831 durch einen Fachbetrieb nötig.',
    content: `
      <h2>Warum die Heizlast so wichtig ist</h2>
      <p>Die <strong>Heizlast</strong> ist die Leistung in Kilowatt, die deine Heizung bei tiefsten Außentemperaturen bereitstellen muss, um das Haus warm zu halten. Sie ist die zentrale Größe bei der <strong>Auslegung einer neuen Heizung oder Wärmepumpe</strong>: Ist die Anlage zu groß, taktet sie ineffizient; ist sie zu klein, wird es an kalten Tagen nicht warm.</p>
      <p>Die überschlägige Formel lautet: <strong>Heizlast = Wohnfläche × spezifische Heizlast</strong>. Die spezifische Heizlast (in W/m²) hängt stark vom energetischen Zustand ab.</p>
      <h3>Richtwerte spezifische Heizlast</h3>
      <ul>
        <li><strong>Neubau (KfW-Effizienzhaus):</strong> 30–50 W/m²</li>
        <li><strong>Gut saniert:</strong> 50–70 W/m²</li>
        <li><strong>Teilsaniert:</strong> 70–100 W/m²</li>
        <li><strong>Unsanierter Altbau:</strong> 100–140 W/m²</li>
      </ul>
      <h3>Rechenbeispiel</h3>
      <p>130 m² Wohnfläche, teilsaniert (70 W/m²): Die Heizlast liegt bei rund <strong>9,1 kW</strong>. Bei 1.800 Vollbenutzungsstunden ergibt das etwa <strong>16.400 kWh</strong> Wärmebedarf pro Jahr – umgerechnet grob <strong>1.640 m³ Erdgas</strong>.</p>
      <p>Für die Wärmepumpen-Planung ist die Heizlast entscheidend: Sie bestimmt, welche Geräteleistung du brauchst und bei welcher Vorlauftemperatur du fahren kannst.</p>
    `,
    faq: [
      { q: 'Wie genau ist die überschlägige Heizlast?', a: 'Sie liefert eine gute erste Größenordnung. Für die tatsächliche Auslegung – besonders bei Wärmepumpen – ist eine raumweise Heizlastberechnung nach DIN EN 12831 durch einen Fachbetrieb Pflicht.' },
      { q: 'Was sind Vollbenutzungsstunden?', a: 'Eine Rechengröße, die angibt, wie viele Stunden die Heizung rechnerisch unter Volllast liefe, um den Jahresbedarf zu decken. In Deutschland liegt sie meist zwischen 1.600 und 2.100 Stunden.' },
      { q: 'Wie komme ich auf meine spezifische Heizlast?', a: 'Orientiere dich am energetischen Zustand: Je besser gedämmt, desto niedriger der Wert. Der Energieausweis oder ein Energieberater liefern belastbarere Zahlen.' },
      { q: 'Kann ich damit meinen Gasverbrauch prüfen?', a: 'Ja, als Plausibilitätscheck. Vergleiche den errechneten Wärmebedarf mit deiner letzten Gasabrechnung – große Abweichungen deuten auf einen anderen Dämmstandard oder Nutzerverhalten hin.' },
    ],
    affiliate: {
      heading: 'Heizung & Wärmepumpe planen lassen',
      text: 'Fachbetriebe berechnen deine Heizlast korrekt und legen die passende Anlage aus – hol dir unverbindliche Angebote.',
      cta: 'Angebote einholen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🚰 Regenwasser / Zisterne ─────────────────────────────────────────────
  {
    slug: 'zisterne',
    category: 'Garten',
    icon: '🚰',
    title: 'Regenwasser- & Zisternen-Rechner',
    cardTitle: 'Zisternen-Rechner',
    tagline: 'Auffangmenge, Zisternengröße & Wasserersparnis.',
    heroSubtitle: 'Wie viel Regenwasser fängt dein Dach im Jahr auf – und wie groß sollte die Zisterne sein? Inklusive geschätzter Trinkwasser-Ersparnis.',
    seoTitle: 'Zisternen-Rechner 2026 – Regenwasser & Zisternengröße berechnen',
    seoDescription: 'Regenwasser-Ertrag deines Dachs, empfohlene Zisternengröße und Trinkwasser-Ersparnis berechnen – kostenlos und sofort im Browser.',
    inputs: [
      { id: 'dachflaeche', label: 'Dachfläche', icon: '🏠', min: 20, max: 300, step: 5, default: 90, unit: 'm²', decimals: 0 },
      { id: 'niederschlag', label: 'Niederschlag', icon: '🌧️', min: 400, max: 1300, step: 10, default: 800, unit: 'mm/a', decimals: 0 },
      { id: 'abfluss', label: 'Abflussbeiwert', icon: '💧', min: 0.5, max: 0.95, step: 0.05, default: 0.85, unit: '', decimals: 2 },
      { id: 'wasserpreis', label: 'Wasserpreis', icon: '💶', min: 2, max: 7, step: 0.1, default: 4, unit: '€/m³', decimals: 1 },
    ],
    outputs: [
      { id: 'ertrag', label: 'Auffangmenge/Jahr', unit: 'L', decimals: 0, primary: true },
      { id: 'empfohlen', label: 'Empf. Zisterne', unit: 'L', decimals: 0 },
      { id: 'ersparnis', label: 'Ersparnis/Jahr', money: true },
    ],
    note: 'Die empfohlene Zisternengröße ist ein Richtwert (Faustregel). Die Ersparnis hängt davon ab, wofür du das Wasser nutzt (Garten, WC, Waschmaschine).',
    content: `
      <h2>Wie viel Regenwasser bringt mein Dach?</h2>
      <p>Die Auffangmenge berechnet sich aus <strong>Dachfläche × Jahresniederschlag × Abflussbeiwert</strong>. Der Abflussbeiwert berücksichtigt, dass nicht das gesamte Wasser in der Zisterne landet – ein Teil verdunstet oder bleibt auf der Fläche. Für harte, glatte Dächer (Ziegel, Blech) liegt er bei etwa 0,8–0,9, für Gründächer deutlich niedriger.</p>
      <p>Wichtig: Gemeint ist die <strong>projizierte Grundfläche</strong> des Dachs (Draufsicht), nicht die schräge Dachfläche.</p>
      <h3>Rechenbeispiel</h3>
      <p>90 m² Dachfläche, 800 mm Niederschlag, Beiwert 0,85: Das ergibt rund <strong>61.000 Liter</strong> pro Jahr. Als Zisterne sind hier etwa <strong>3.700 Liter</strong> sinnvoll. Nutzt du das Wasser für Garten und WC, sparst du bei 4 €/m³ grob <strong>240 €</strong> Frischwasser pro Jahr.</p>
      <h3>Wofür lohnt sich Regenwasser?</h3>
      <ul>
        <li><strong>Gartenbewässerung:</strong> der Klassiker – kalkarmes Wasser, ideal für Pflanzen.</li>
        <li><strong>Toilettenspülung:</strong> spart dauerhaft viel Trinkwasser (erfordert zweites Leitungsnetz).</li>
        <li><strong>Waschmaschine:</strong> möglich, aber mit höherem technischem Aufwand.</li>
      </ul>
      <p>Für reine Gartennutzung reicht oft eine oberirdische Regentonne oder ein kleiner Flachtank; für Haus-Nutzung lohnt eine erdverlegte Zisterne mit Filter und Pumpe.</p>
    `,
    faq: [
      { q: 'Wie groß sollte meine Zisterne sein?', a: 'Als Faustregel gilt rund 5–6 % der Jahres-Auffangmenge, bei Gartennutzung genügt oft weniger. Wichtiger als Maximalgröße ist, dass sie typische Trockenperioden von 2–3 Wochen überbrückt.' },
      { q: 'Was ist der Abflussbeiwert?', a: 'Er gibt an, welcher Anteil des Regens tatsächlich abfließt und aufgefangen werden kann. Ziegel- und Metalldächer liegen bei 0,8–0,9, Kies- und Gründächer deutlich niedriger.' },
      { q: 'Rechne ich mit der Schräg- oder Grundfläche?', a: 'Mit der projizierten Grundfläche (Draufsicht). Da der Regen senkrecht fällt, zählt die horizontale Fläche – nicht die größere schräge Dachfläche.' },
      { q: 'Lohnt sich eine Zisterne finanziell?', a: 'Für reine Gartennutzung amortisiert sie sich langsam. Richtig lohnend wird es bei zusätzlicher WC-Nutzung, weil dann dauerhaft viel teures Trinkwasser ersetzt wird.' },
    ],
    affiliate: {
      heading: 'Zisterne, Regentonne & Zubehör',
      text: 'Erdtanks, Flachtanks, Filter und Pumpen – finde die passende Lösung für Garten oder Hausnutzung.',
      cta: 'Produkte ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🧩 Pflaster ───────────────────────────────────────────────────────────
  {
    slug: 'pflaster',
    category: 'Garten',
    icon: '🧩',
    title: 'Pflastersteine-Rechner',
    cardTitle: 'Pflaster-Rechner',
    tagline: 'Steinbedarf, Splitt & Schotter für deine Fläche.',
    heroSubtitle: 'Wie viele Pflastersteine brauchst du – und wie viel Splitt und Schotter für den Unterbau? Gib Länge und Breite ein und plane materialgenau.',
    seoTitle: 'Pflastersteine-Rechner 2026 – Steinbedarf & Unterbau berechnen',
    seoDescription: 'Pflaster-Bedarf berechnen: Anzahl Steine inklusive Verschnitt sowie Splitt und Schotter für den Unterbau deiner Fläche. Kostenlos & sofort.',
    inputs: [
      { id: 'laenge', label: 'Länge', icon: '📏', min: 1, max: 40, step: 0.5, default: 5, unit: 'm', decimals: 1 },
      { id: 'breite', label: 'Breite', icon: '📐', min: 1, max: 25, step: 0.5, default: 4, unit: 'm', decimals: 1 },
      { id: 'proQm', label: 'Steine pro m²', icon: '🧩', min: 20, max: 100, step: 1, default: 44, unit: 'Stk', decimals: 0 },
      { id: 'verschnitt', label: 'Verschnitt', icon: '✂️', min: 0, max: 15, step: 1, default: 5, unit: '%', decimals: 0 },
    ],
    outputs: [
      { id: 'steine', label: 'Pflastersteine', unit: 'Stk', decimals: 0, primary: true },
      { id: 'flaeche', label: 'Fläche', unit: 'm²', decimals: 1 },
      { id: 'splitt', label: 'Splitt (5 cm)', unit: 'm³', decimals: 2 },
      { id: 'schotter', label: 'Schotter (15 cm)', unit: 'm³', decimals: 2 },
    ],
    note: 'Steine pro m² je nach Format (z. B. Betonstein 10×20 cm ≈ 50 Stk/m²). Unterbau-Dicken sind typische Richtwerte für begeh- und leicht befahrbare Flächen.',
    content: `
      <h2>Material für deine Pflasterfläche richtig planen</h2>
      <p>Eine haltbare Pflasterfläche besteht aus mehreren Schichten: unten die <strong>Schottertragschicht</strong> (Frostschutz, ca. 15–30 cm je nach Belastung), darüber das <strong>Splittbett</strong> (ca. 3–5 cm) und obenauf die <strong>Pflastersteine</strong>. Der Rechner ermittelt alle drei Mengen auf einmal – inklusive Reserve für Verschnitt beim Zuschneiden an Rändern.</p>
      <h3>Steine pro Quadratmeter</h3>
      <ul>
        <li><strong>Betonstein 10 × 20 cm:</strong> ca. 50 Stück/m²</li>
        <li><strong>Pflasterklinker 20 × 5 cm:</strong> ca. 100 Stück/m²</li>
        <li><strong>Großformat 20 × 30 cm:</strong> ca. 17 Stück/m²</li>
        <li><strong>Rasengittersteine 40 × 60 cm:</strong> ca. 4 Stück/m²</li>
      </ul>
      <h3>Rechenbeispiel</h3>
      <p>Eine Terrasse von 5 × 4 m = 20 m², Betonstein mit 44 Stk/m² und 5 % Verschnitt: Du brauchst rund <strong>925 Steine</strong>, etwa <strong>1,0 m³ Splitt</strong> und <strong>3,0 m³ Schotter</strong> für den Unterbau.</p>
      <h3>Tipps aus der Praxis</h3>
      <ul>
        <li>Plane 5–10 % Verschnitt ein – mehr bei diagonaler Verlegung oder vielen Rundungen.</li>
        <li>Gib der Fläche ein leichtes Gefälle (ca. 2 %), damit Wasser abläuft.</li>
        <li>Für befahrbare Flächen (Einfahrt) den Unterbau kräftiger ausführen (25–30 cm Schotter).</li>
      </ul>
    `,
    faq: [
      { q: 'Wie viele Pflastersteine brauche ich pro m²?', a: 'Das hängt vom Format ab: Ein gängiger Betonstein (10×20 cm) ergibt rund 50 Stück/m². Stelle im Rechner den Wert deines Steins ein – er steht meist auf der Verpackung oder beim Händler.' },
      { q: 'Wie dick muss der Unterbau sein?', a: 'Für Gehwege und Terrassen genügen meist 15–20 cm Schotter plus 3–5 cm Splitt. Für Einfahrten mit Autolast solltest du 25–30 cm Schotter einplanen.' },
      { q: 'Wie viel Verschnitt sollte ich einrechnen?', a: 'Üblich sind 5 %, bei vielen Schnitten (Rundungen, Diagonalverlegung) eher 10 %. Lieber etwas mehr bestellen – Nachbestellungen haben oft leichte Farbabweichungen.' },
      { q: 'Wie rechne ich Splitt und Schotter in Tonnen um?', a: 'Grobe Faustregel: 1 m³ Schotter wiegt etwa 1,8 t, 1 m³ Splitt rund 1,5 t. Multipliziere die Kubikmeter aus dem Rechner entsprechend, wenn dein Händler nach Gewicht verkauft.' },
    ],
    affiliate: {
      heading: 'Pflaster & Baustoffe',
      text: 'Pflastersteine, Splitt, Schotter und Werkzeug – vergleiche Angebote und lass dir die Menge liefern.',
      cta: 'Baustoffe ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🌾 Rasen ──────────────────────────────────────────────────────────────
  {
    slug: 'rasen',
    category: 'Garten',
    icon: '🌾',
    title: 'Rasen-Rechner',
    cardTitle: 'Rasen-Rechner',
    tagline: 'Saatgut, Dünger & Wasser für deine Rasenfläche.',
    heroSubtitle: 'Wie viel Rasensamen, Dünger und Wasser braucht deine Fläche? Ideal für Neuanlage und Nachsaat – in Sekunden berechnet.',
    seoTitle: 'Rasen-Rechner 2026 – Rasensamen, Dünger & Wasser berechnen',
    seoDescription: 'Rasensamen-Menge, Düngerbedarf und Wassermenge für deine Rasenfläche berechnen. Für Neuanlage und Nachsaat, kostenlos und sofort.',
    inputs: [
      { id: 'flaeche', label: 'Rasenfläche', icon: '🟩', min: 5, max: 1000, step: 5, default: 100, unit: 'm²', decimals: 0 },
      { id: 'saatmenge', label: 'Aussaatmenge', icon: '🌱', min: 10, max: 40, step: 1, default: 25, unit: 'g/m²', decimals: 0 },
      { id: 'duengermenge', label: 'Düngermenge', icon: '🧪', min: 10, max: 50, step: 1, default: 30, unit: 'g/m²', decimals: 0 },
    ],
    outputs: [
      { id: 'saat', label: 'Rasensamen', unit: 'kg', decimals: 2, primary: true },
      { id: 'duenger', label: 'Dünger', unit: 'kg', decimals: 2 },
      { id: 'wasser', label: 'Wasser je Gabe', unit: 'L', decimals: 0 },
    ],
    note: 'Aussaatmenge: ~20–25 g/m² für Neuanlage, ~10–15 g/m² für Nachsaat. Wassermenge gilt pro Wässerung (~15 L/m²); in der Keimphase täglich, sonst seltener und durchdringend.',
    content: `
      <h2>Rasen anlegen: die richtigen Mengen</h2>
      <p>Ob Neuanlage oder Nachsaat – mit den passenden Mengen an Saatgut, Dünger und Wasser wird der Rasen dicht und belastbar. Der Rechner nimmt dir das Umrechnen ab und zeigt, wie viel du für deine Fläche brauchst.</p>
      <h3>Aussaatmenge</h3>
      <ul>
        <li><strong>Neuanlage:</strong> 20–25 g/m² für eine dichte Grasnarbe.</li>
        <li><strong>Nachsaat / Reparatur:</strong> 10–15 g/m², da schon Bestand vorhanden ist.</li>
        <li><strong>Schattenrasen / Spielrasen:</strong> Herstellerangabe beachten, oft etwas höher.</li>
      </ul>
      <h3>Rechenbeispiel</h3>
      <p>100 m² Neuanlage mit 25 g/m²: Du brauchst <strong>2,5 kg Rasensamen</strong>. Bei 30 g/m² Dünger sind das <strong>3,0 kg Dünger</strong>, und pro Wässerung rund <strong>1.500 Liter</strong> Wasser (15 L/m²).</p>
      <h3>Der beste Zeitpunkt</h3>
      <p>Ideal sind <strong>Frühjahr (April–Mai)</strong> und <strong>Spätsommer (August–September)</strong>: Der Boden ist warm genug zum Keimen, und es ist nicht zu heiß. In der Keimphase (ca. 2–3 Wochen) muss der Boden konstant feucht bleiben – lieber öfter kurz als selten viel.</p>
    `,
    faq: [
      { q: 'Wie viel Rasensamen pro m²?', a: 'Für eine Neuanlage rechnet man mit 20–25 g/m², für die Nachsaat mit 10–15 g/m². Zu dicht gesät schwächt die Halme, zu dünn lässt Unkraut Platz.' },
      { q: 'Wann sollte ich Rasen säen?', a: 'Am besten im Frühjahr (April–Mai) oder Spätsommer (August–September). Dann ist der Boden warm genug und die Feuchtigkeit für die Keimung reicht meist aus.' },
      { q: 'Wie oft muss ich frisch gesäten Rasen wässern?', a: 'In den ersten 2–3 Wochen sollte der Boden nie austrocknen – je nach Wetter täglich, an heißen Tagen auch zweimal, dafür schonend. Danach seltener, aber durchdringend gießen.' },
      { q: 'Wann und wie viel düngen?', a: 'Eine Startdüngung zur Aussaat und dann je nach Produkt 2–3 Gaben über die Saison. Übliche Mengen liegen bei 20–35 g/m² je Gabe – halte dich an die Herstellerangabe.' },
    ],
    affiliate: {
      heading: 'Rasensamen & Dünger vom Rasendoktor',
      text: 'Qualitäts-Saatgut, Rasendünger und Pflegemittel – passend für Neuanlage oder Nachsaat, direkt beim Rasendoktor.',
      cta: 'Zum Rasendoktor',
      href: 'https://www.awin1.com/cread.php?awinmid=26999&awinaffid=2774494&clickref=Rasen-Rechner',
    },
    updated: '2026-07-22',
  },

  // ── 🪵 Brennholz ──────────────────────────────────────────────────────────
  {
    slug: 'brennholz',
    category: 'Haus',
    icon: '🪵',
    title: 'Brennholz-Rechner',
    cardTitle: 'Brennholz-Rechner',
    tagline: 'Wie viele Raummeter brauchst du – und was kostet es?',
    heroSubtitle: 'Wie viel Brennholz brauchst du für die Heizsaison? Berechne den Bedarf in Raummetern, die Kosten und den Festmeter-Wert.',
    seoTitle: 'Brennholz-Rechner 2026 – Raummeter-Bedarf & Kosten berechnen',
    seoDescription: 'Brennholzbedarf berechnen: benötigte Raummeter für deinen Wärmebedarf, Kosten und Festmeter-Umrechnung – kostenlos und sofort.',
    inputs: [
      { id: 'heizbedarf', label: 'Wärmebedarf', icon: '🔥', min: 2000, max: 30000, step: 500, default: 12000, unit: 'kWh/a', decimals: 0 },
      { id: 'heizwert', label: 'Heizwert Holz', icon: '🪵', min: 1300, max: 2100, step: 50, default: 1600, unit: 'kWh/rm', decimals: 0 },
      { id: 'wirkungsgrad', label: 'Ofen-Wirkungsgrad', icon: '♨️', min: 55, max: 90, step: 1, default: 78, unit: '%', decimals: 0 },
      { id: 'preis', label: 'Preis je Raummeter', icon: '💶', min: 50, max: 180, step: 5, default: 100, unit: '€/rm', decimals: 0 },
    ],
    outputs: [
      { id: 'rm', label: 'Bedarf', unit: 'rm', decimals: 1, primary: true },
      { id: 'kosten', label: 'Kosten/Jahr', money: true },
      { id: 'fm', label: 'entspricht', unit: 'fm', decimals: 1 },
    ],
    note: 'Heizwert je Raummeter gilt für lufttrockenes Holz (~20 % Restfeuchte). Frisches Holz hat einen deutlich geringeren Heizwert und schadet dem Ofen.',
    content: `
      <h2>Wie viel Brennholz brauche ich?</h2>
      <p>Der Bedarf hängt von deinem <strong>Wärmebedarf</strong>, dem <strong>Heizwert der Holzart</strong> und dem <strong>Wirkungsgrad deines Ofens</strong> ab. Ein moderner Kaminofen erreicht 75–85 %, ein alter offener Kamin deutlich weniger. Der Rechner berücksichtigt das und zeigt dir Raummeter, Kosten und die Umrechnung in Festmeter.</p>
      <h3>Heizwert nach Holzart (je Raummeter, lufttrocken)</h3>
      <ul>
        <li><strong>Buche / Esche:</strong> ca. 1.900–2.100 kWh/rm</li>
        <li><strong>Eiche:</strong> ca. 1.900 kWh/rm</li>
        <li><strong>Birke:</strong> ca. 1.700 kWh/rm</li>
        <li><strong>Fichte / Nadelholz:</strong> ca. 1.400–1.500 kWh/rm</li>
      </ul>
      <h3>Raummeter, Festmeter, Schüttraummeter</h3>
      <p>Diese Maße sorgen oft für Verwirrung:</p>
      <ul>
        <li><strong>Festmeter (fm):</strong> 1 m³ massives Holz ohne Zwischenräume.</li>
        <li><strong>Raummeter / Ster (rm):</strong> 1 m³ geschichtetes Scheitholz ≈ 0,7 fm.</li>
        <li><strong>Schüttraummeter (srm):</strong> 1 m³ lose geschüttet ≈ 0,4 fm.</li>
      </ul>
      <h3>Rechenbeispiel</h3>
      <p>12.000 kWh Wärmebedarf, Buche (1.600 kWh/rm im Rechner), Ofen mit 78 %: Du brauchst rund <strong>9,6 Raummeter</strong> pro Saison, bei 100 €/rm also etwa <strong>960 €</strong> – das entspricht knapp <strong>6,7 Festmetern</strong>.</p>
    `,
    faq: [
      { q: 'Was ist der Unterschied zwischen Raummeter und Festmeter?', a: 'Ein Festmeter ist 1 m³ massives Holz, ein Raummeter 1 m³ geschichtetes Scheitholz inklusive Luftzwischenräume. 1 Raummeter entspricht etwa 0,7 Festmetern.' },
      { q: 'Welches Holz hat den höchsten Heizwert?', a: 'Harthölzer wie Buche, Esche und Eiche liefern pro Raummeter am meisten Energie. Nadelhölzer brennen schneller ab und haben einen geringeren Heizwert je Raummeter.' },
      { q: 'Warum muss Brennholz trocken sein?', a: 'Frisches Holz hat viel Wasser, das beim Verbrennen erst verdampfen muss – das senkt den Heizwert stark, rußt und schadet Ofen und Schornstein. Ideal sind unter 20 % Restfeuchte (1–2 Jahre gelagert).' },
      { q: 'Wie viel Holz für einen ganzen Winter?', a: 'Als grobe Orientierung braucht ein Haus, das allein mit Holz heizt, oft 8–15 Raummeter pro Saison. Der genaue Wert hängt an Dämmung, Ofen und Wohnfläche – rechne ihn oben aus.' },
    ],
    affiliate: {
      heading: 'Brennholz & Kaminzubehör',
      text: 'Ofenfertiges Brennholz, Feuchtemessgeräte und Kaminzubehör – bequem geliefert.',
      cta: 'Angebote ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },
];

/** Hilfsfunktionen für Seiten & Navigation */
export const getRechner = (slug: string) => RECHNER.find((r) => r.slug === slug);
export const categories = () => [...new Set(RECHNER.map((r) => r.category))];
export const rechnerByCategory = (cat: string) => RECHNER.filter((r) => r.category === cat);
