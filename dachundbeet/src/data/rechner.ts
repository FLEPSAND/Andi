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
    `,
    faq: [
      { q: 'Wie viel Erde brauche ich für mein Hochbeet?', a: 'Nur die oberste Schicht (rund 25 % des Volumens) muss hochwertige Pflanzerde sein. Der Rechner zeigt dir die Litermenge und die Anzahl 40-Liter-Säcke direkt an.' },
      { q: 'Kann ich das Hochbeet komplett mit Erde füllen?', a: 'Möglich, aber teuer und weniger effektiv. Der klassische Schichtaufbau spart Erde, verbessert die Drainage und versorgt die Pflanzen über die Verrottung mit Nährstoffen.' },
      { q: 'Womit fülle ich die unteren Schichten?', a: 'Ideal ist Material aus dem eigenen Garten: Baum- und Strauchschnitt, Laub, Rasenschnitt und halbreifer Kompost. So entsorgst du Gartenabfälle sinnvoll und sparst Kosten.' },
      { q: 'Warum sackt das Hochbeet zusammen?', a: 'Das organische Füllmaterial zersetzt sich und verliert an Volumen. Das ist normal und erwünscht – plane 10–20 % Nachfüllmaterial für das erste Jahr ein.' },
    ],
    affiliate: {
      heading: 'Hochbeeterde & Zubehör',
      text: 'Passende Hochbeeterde, Wühlmausgitter und Teichfolie zum Auskleiden – bequem nach Hause geliefert.',
      cta: 'Produkte ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },
];

/** Hilfsfunktionen für Seiten & Navigation */
export const getRechner = (slug: string) => RECHNER.find((r) => r.slug === slug);
export const categories = () => [...new Set(RECHNER.map((r) => r.category))];
export const rechnerByCategory = (cat: string) => RECHNER.filter((r) => r.category === cat);
