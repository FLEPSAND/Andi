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
      <p>Der Rechner schätzt zuerst den Jahresertrag aus der Anlagenleistung in kWp und dem spezifischen Ertrag deines Standorts. Diesen Ertrag zerlegt er in zwei Teile: Den Eigenverbrauch nutzt du direkt im Haus und sparst dafür den vollen Strompreis. Den Rest speist du ein und bekommst die Einspeisevergütung. Beide Beträge zusammen ergeben den jährlichen Nutzen, und die Investition geteilt durch diesen Nutzen ergibt die Amortisationszeit.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Anlagenleistung:</strong> Als Faustregel passt etwa 1 kWp pro 1.000 kWh Jahresstromverbrauch. Wer Wärmepumpe oder E-Auto hat oder plant, sollte deutlich großzügiger rechnen. Auf ein Standarddach passen pro kWp rund 4,5 bis 5 Quadratmeter.</p>
      <p><strong>Spezifischer Ertrag:</strong> In Deutschland liegt er zwischen etwa 850 kWh/kWp an der Nordseeküste und über 1.100 kWh/kWp in Süddeutschland. Für ein Süddach mit 30 Grad Neigung kannst du den Regionalwert direkt nehmen. Bei einem Ost-West-Dach ziehst du rund 15 bis 20 Prozent ab, bei starker Verschattung durch Bäume oder einen Schornstein noch einmal 10 bis 30 Prozent.</p>
      <p><strong>Eigenverbrauch:</strong> Ohne Speicher liegt die Quote in einem normalen Haushalt bei 25 bis 35 Prozent. Mit Batteriespeicher sind 55 bis 75 Prozent erreichbar. Wer tagsüber zu Hause ist, Wäsche per Zeitvorwahl in die Mittagsstunden legt oder einen Heizstab für den Warmwasserspeicher hat, liegt am oberen Rand der jeweiligen Spanne.</p>
      <p><strong>Investition:</strong> Schlüsselfertig kostet eine Aufdachanlage derzeit etwa 1.300 bis 1.800 Euro pro kWp, inklusive Montage, Wechselrichter, Gerüst und Anmeldung. Kleine Anlagen sind pro kWp teurer, weil Anfahrt und Gerüst unabhängig von der Größe anfallen.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Der Nutzen pro Jahr ist die Summe aus gesparten Stromkosten und Einspeiseerlös. Er ist die Zahl, mit der die Anlage sich zurückzahlt. Die Amortisation liegt bei aktuellen Preisen häufig zwischen 9 und 14 Jahren – bei einer Lebensdauer von 25 bis 30 Jahren und einer über 20 Jahre garantierten Vergütung.</p>
      <p>Der Gewinn nach 20 Jahren ist bewusst konservativ gerechnet: mit konstantem Strompreis, ohne Degradation und ohne Betriebskosten. Steigt der Strompreis, verbessert sich das Ergebnis; rechne umgekehrt etwa 0,5 Prozent Leistungsverlust pro Jahr, 100 bis 200 Euro laufende Kosten und einmal 1.000 bis 2.000 Euro für einen Wechselrichtertausch gegen.</p>

      <h3>Mit oder ohne Speicher?</h3>
      <p>Rechne die Anlage zuerst ohne Speicher durch. Erhöhe danach die Eigenverbrauchsquote auf den Wert, den ein Speicher bringen würde, und vergleiche den Zugewinn mit dem Speicherpreis von 500 bis 900 Euro je nutzbarer Kilowattstunde. Wer eine Wärmepumpe oder ein E-Auto hat, hebt die Quote oft schon ohne Speicher deutlich – dann bringt die Batterie entsprechend weniger.</p>
        `,
    faq: [
      { q: 'Wie viel kWp brauche ich für mein Haus?', a: 'Als Faustregel gilt: pro 1.000 kWh Jahresstromverbrauch etwa 1 kWp. Ein Vier-Personen-Haushalt mit 4.000 kWh liegt also bei rund 4 bis 6 kWp – mehr, wenn Wärmepumpe oder E-Auto dazukommen. Weil größere Anlagen pro kWp günstiger sind, lohnt es sich meist, das Dach eher voll zu belegen als knapp zu planen.' },
      { q: 'Lohnt sich ein Batteriespeicher?', a: 'Ein Speicher erhöht den Eigenverbrauch von rund 30 auf 55 bis 75 Prozent. Jede so zusätzlich selbst genutzte Kilowattstunde ist etwa 25 Cent wert. Ob sich das trägt, hängt vom Speicherpreis und davon ab, wie viel Überschuss bei dir überhaupt anfällt. Rechne beide Varianten durch.' },
      { q: 'Wie hoch ist die Einspeisevergütung 2026?', a: 'Für kleine Dachanlagen mit Teileinspeisung liegt sie bei rund 8 ct/kWh und wird ab Inbetriebnahme für 20 Jahre garantiert. Den tagesaktuellen Satz veröffentlicht die Bundesnetzagentur; er sinkt in regelmäßigen Schritten für Neuanlagen.' },
      { q: 'Muss ich die Anlage versteuern?', a: 'Für Anlagen bis 30 kWp auf Einfamilienhäusern sind die Einnahmen von der Einkommensteuer befreit, und beim Kauf fällt durch die Nullregelung keine Umsatzsteuer an. Für die meisten privaten Betreiber entfällt damit der steuerliche Aufwand komplett.' },
      { q: 'Wo muss ich die Anlage anmelden?', a: 'An zwei Stellen: beim Netzbetreiber vor der Inbetriebnahme und im Marktstammdatenregister der Bundesnetzagentur innerhalb eines Monats danach. Den ersten Teil übernimmt in der Regel der Installateur, die Verantwortung bleibt aber bei dir.' },
      { q: 'Ist der Rechner verbindlich?', a: 'Nein. Es ist eine transparente Modellrechnung zur ersten Orientierung, ohne Degradation, Strompreissteigerung, Wartung und Steuern. Für eine belastbare Auslegung hol dir ein individuelles Angebot eines Fachbetriebs.' },
    ],
    affiliate: {
      heading: 'Kostenlose Photovoltaik-Angebote vergleichen',
      text: 'Lass dir unverbindlich mehrere Angebote geprüfter Fachbetriebe aus deiner Region erstellen und finde den besten Preis für deine Anlage – über Tarifcheck24.',
      cta: 'Angebote vergleichen',
      href: 'https://a.partner-versicherung.de/click.php?partner_id=199206&ad_id=15&deep=solaranlage',
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
      <h2>Wie der Balkonkraftwerk-Rechner rechnet</h2>
      <p>Aus Modulleistung und spezifischem Ertrag ergibt sich der Jahresertrag. Davon wird der Anteil genommen, den du direkt im Haushalt verbrauchst, und mit deinem Strompreis multipliziert. Der Rest fließt unvergütet ins Netz und bleibt in der Rechnung außen vor – genau so, wie es bei einem Steckersolargerät ohne Einspeisevertrag tatsächlich läuft.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Modulleistung:</strong> Gemeint ist die Leistung der Module in Watt Peak, nicht die Ausgangsleistung des Wechselrichters. Du darfst mehr Modulleistung installieren, als der auf 800 Watt begrenzte Wechselrichter abgeben kann. Ein Set mit 1.600 Wp Modulen liefert an trüben Tagen und in den Morgenstunden deutlich mehr als ein knapp bemessenes, weil die 800 Watt öfter erreicht werden.</p>
      <p><strong>Spezifischer Ertrag:</strong> Hier steckt die Montageart. Ein aufgeständertes Modul mit rund 30 Grad Neigung nach Süden erreicht 900 bis 1.050 kWh/kWp. Eine senkrecht an der Südbrüstung montierte Anlage kommt auf 600 bis 700, nach Osten oder Westen auf 450 bis 550. Der Unterschied zwischen senkrechter Brüstung und geneigter Aufständerung beträgt gut 40 Prozent.</p>
      <p><strong>Eigenverbrauch:</strong> Beim Balkonkraftwerk ist die Quote hoch, üblicherweise 80 bis 95 Prozent. Der Grund ist die geringe Leistung: Ein Haushalt zieht auch tagsüber fast durchgehend 100 bis 300 Watt Grundlast, und sobald Kühlschrank oder Rechner dazukommen, ist die Erzeugung aufgebraucht. Nur bei sehr großen Sets über 1.500 Wp oder einem tagsüber leeren Ein-Personen-Haushalt solltest du niedriger ansetzen.</p>
      <p><strong>Anschaffung:</strong> Komplettsets mit zwei Modulen und Wechselrichter liegen je nach Ausführung bei 350 bis 800 Euro. Halterung, Aufständerung und ein längeres Kabel kommen gegebenenfalls dazu.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Die jährliche Ersparnis liegt bei einem gut aufgestellten 800-Watt-System typischerweise zwischen 150 und 270 Euro. Die Amortisation fällt damit meist auf drei bis fünf Jahre – deutlich kürzer als bei einer großen Dachanlage, weil praktisch der gesamte Ertrag zum vollen Strompreis gegengerechnet wird und keine Einspeisung zum niedrigen Satz dazwischenkommt.</p>
      <p>Die Ersparnis über zehn Jahre ist mit konstantem Strompreis gerechnet. Da Module 20 bis 25 Jahre halten, läuft die Anlage nach der Amortisation viele Jahre im Plus.</p>

      <h3>Anmeldung und Vorschriften</h3>
      <p>Seit dem Solarpaket reicht die Eintragung im Marktstammdatenregister der Bundesnetzagentur. Sie dauert online etwa zehn Minuten und kostet nichts; die frühere zusätzliche Anmeldung beim Netzbetreiber entfällt. Ein alter Ferraris-Zähler darf übergangsweise weiterlaufen und wird vom Netzbetreiber irgendwann kostenfrei getauscht. Mieter und Wohnungseigentümer haben inzwischen einen gesetzlichen Anspruch darauf, ein Steckersolargerät anzubringen; über die Art der Ausführung darf der Vermieter mitreden, verbieten kann er sie nicht.</p>
        `,
    faq: [
      { q: 'Wie viel spart ein Balkonkraftwerk im Jahr?', a: 'Ein 800-Watt-System liefert je nach Ausrichtung 500 bis 900 kWh im Jahr. Bei 35 ct/kWh und 85 Prozent Eigenverbrauch sind das grob 150 bis 270 Euro jährlich.' },
      { q: 'Muss ich das Balkonkraftwerk anmelden?', a: 'Ja, aber nur noch im Marktstammdatenregister der Bundesnetzagentur. Das ist online in etwa zehn Minuten erledigt und kostenlos. Die separate Anmeldung beim Netzbetreiber ist seit dem Solarpaket entfallen.' },
      { q: 'Darf mein Vermieter das verbieten?', a: 'Nein. Steckersolargeräte gehören zu den privilegierten baulichen Veränderungen. Vermieter und Eigentümergemeinschaft können über die Art der Befestigung und das Erscheinungsbild mitbestimmen, die Anlage aber nicht grundsätzlich ablehnen. Ein kurzes Schreiben mit Foto der geplanten Montage vorab erspart Diskussionen.' },
      { q: 'Lohnt sich ein Speicher fürs Balkonkraftwerk?', a: 'Meist nicht. Speicher für Steckersolar kosten oft mehr als die Anlage selbst und heben den Eigenverbrauch nur wenig, weil er ohnehin schon bei 80 bis 95 Prozent liegt. Die Amortisation verlängert sich dadurch deutlich.' },
      { q: 'Reicht eine normale Schuko-Steckdose?', a: 'Sie funktioniert und ist inzwischen ausdrücklich zulässig. Voraussetzung ist ein intakter Stromkreis und ein Wechselrichter mit NA-Schutz, der bei Netzausfall sofort abschaltet. Wenn die Steckdose alt oder locker ist, lass sie vorher prüfen.' },
      { q: 'Was passiert mit dem Strom, den ich nicht verbrauche?', a: 'Er fließt ins öffentliche Netz und wird bei einem Steckersolargerät in der Regel nicht vergütet. Deshalb lohnt es sich, laufende Verbraucher wie Waschmaschine oder Spülmaschine in die sonnigen Mittagsstunden zu legen.' },
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
      <h2>Wie der Wärmepumpen-Rechner rechnet</h2>
      <p>Der Rechner stellt zwei Betriebskostenrechnungen nebeneinander. Für die alte Heizung teilt er den Heizwärmebedarf durch den Wirkungsgrad und multipliziert mit dem Brennstoffpreis. Für die Wärmepumpe teilt er denselben Wärmebedarf durch die Jahresarbeitszahl und multipliziert mit dem Strompreis. Die Differenz ist deine jährliche Ersparnis im laufenden Betrieb.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Heizwärmebedarf:</strong> Nimm den tatsächlichen Verbrauch aus deiner letzten Abrechnung und zieh den Warmwasseranteil ab, grob 500 bis 800 kWh pro Person und Jahr. Bei Gas steht der Verbrauch meist in Kubikmetern auf der Rechnung; multipliziere mit dem dort angegebenen Brennwert und der Zustandszahl, in der Regel liegt der Faktor bei etwa 10 bis 11 kWh je Kubikmeter.</p>
      <p><strong>Wirkungsgrad der alten Anlage:</strong> Ein moderner Brennwertkessel erreicht 90 bis 98 Prozent, ein Niedertemperaturkessel der 90er Jahre 80 bis 88, ein alter Konstanttemperaturkessel oder eine Ölheizung mit überdimensioniertem Kessel oft nur 70 bis 80.</p>
      <p><strong>Jahresarbeitszahl:</strong> Das ist die wichtigste und am häufigsten zu optimistisch gesetzte Zahl. Verwechsle sie nicht mit dem COP aus dem Datenblatt, der unter Laborbedingungen gemessen wird. Realistisch sind bei Luft-Wasser-Wärmepumpen im Bestand mit Heizkörpern 2,8 bis 3,4, im sanierten Bestand mit Flächenheizung 3,5 bis 4,2 und bei Erdwärme 4,0 bis 4,8.</p>
      <p><strong>Strompreis:</strong> Für einen Wärmepumpentarif mit separatem Zähler liegen die Arbeitspreise typischerweise 5 bis 10 Cent unter dem Haushaltstarif. Rechne die Grundgebühr des zweiten Zählers von etwa 100 bis 150 Euro im Jahr mit ein.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Das Ergebnis zeigt die reinen Betriebskosten. Nicht enthalten sind die Investition, die Förderung und die wegfallenden Nebenkosten. Letztere solltest du dir dazudenken: Schornsteinfeger und Gaszähler entfallen, das sind zusammen meist 150 bis 250 Euro im Jahr. Der CO₂-Preis auf Erdgas und Heizöl steigt weiter, was die Rechnung Jahr für Jahr stärker zugunsten der Wärmepumpe verschiebt.</p>
      <p>Die Ersparnis über 15 Jahre ist mit heutigen Preisen gerechnet. Sie ist keine Amortisationsrechnung – dafür müsstest du die Investition abzüglich Förderung gegenrechnen.</p>

      <h3>Der Selbsttest vor jedem Angebot</h3>
      <p>Bevor du planst, prüfe an einem kalten Tag, mit welcher Vorlauftemperatur dein Haus auskommt. Stelle die Regelung der alten Heizung auf 50 Grad, öffne alle Thermostate und warte zwei bis drei Stunden. Wird es überall warm, ist dein Haus wärmepumpentauglich, ohne dass ein Heizkörper getauscht werden muss. Bleiben einzelne Räume kühl, weißt du bereits, wo nachzurüsten ist. Jedes Grad weniger Vorlauf bringt etwa 2,5 Prozent weniger Stromverbrauch.</p>
        `,
    faq: [
      { q: 'Was ist eine gute Jahresarbeitszahl?', a: 'Ab 3,5 ist eine Wärmepumpe wirtschaftlich klar im Vorteil. Zwischen 3,0 und 3,5 liegt der solide Bereich, der im Bestand häufig erreichbar ist. Unter 2,8 wird es schwierig, weil die Kilowattstunde Wärme dann etwa so viel kostet wie aus einer Gasheizung.' },
      { q: 'Funktioniert eine Wärmepumpe im Altbau?', a: 'Häufig ja. Entscheidend ist nicht das Baujahr, sondern die nötige Vorlauftemperatur. Kommt das Haus mit 45 bis 55 Grad aus, funktioniert es meist. Große Heizkörper, eine gedämmte oberste Geschossdecke und ein hydraulischer Abgleich helfen mehr als eine Komplettsanierung.' },
      { q: 'Wie hoch ist die Förderung?', a: 'Über die Bundesförderung für effiziente Gebäude sind je nach Situation bis zu 70 Prozent Zuschuss möglich, zusammengesetzt aus Grundförderung, Klimageschwindigkeitsbonus, Effizienzbonus und einkommensabhängigem Bonus, gedeckelt auf eine Höchstsumme. Sätze und Bedingungen ändern sich – prüfe sie vor der Beauftragung, und stelle den Antrag unbedingt vor dem Auftrag.' },
      { q: 'Was kostet eine Wärmepumpe komplett?', a: 'Eine Luft-Wasser-Wärmepumpe im Einfamilienhaus liegt vor Förderung typischerweise bei 25.000 bis 40.000 Euro, inklusive Hydraulik, Speicher, Elektroanschluss und Demontage der alten Anlage. Erdwärme kostet wegen der Bohrung 10.000 bis 20.000 Euro mehr, ist dafür effizienter.' },
      { q: 'Brauche ich einen separaten Stromzähler?', a: 'Nur wenn du einen vergünstigten Wärmepumpentarif nutzen willst. Der Netzbetreiber darf dafür zeitweise abschalten, üblicherweise bis zu dreimal zwei Stunden täglich. Ob sich der zweite Zähler lohnt, hängt an deinem Verbrauch – bei geringem Wärmebedarf frisst die Grundgebühr den Vorteil auf.' },
      { q: 'Ist eine Wärmepumpe laut?', a: 'Moderne Außeneinheiten liegen bei 45 bis 55 dB(A) in einem Meter Abstand und im Nachtbetrieb darunter. Wichtiger als der Datenblattwert ist die Aufstellung: Abstand zur Nachbargrenze einhalten, nicht in eine Ecke zwischen zwei Wände stellen und die Ausblasrichtung nicht auf ein Schlafzimmerfenster richten.' },
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
      <h2>Wie der Ladekosten-Rechner rechnet</h2>
      <p>Aus Fahrleistung und Verbrauch ergibt sich die benötigte Strommenge im Jahr. Diese Menge wird nach dem Anteil aufgeteilt, den du zu Hause lädst, und mit dem jeweiligen Preis multipliziert – Haushaltsstrom für den Heimanteil, öffentlicher Ladetarif für den Rest. Das Ergebnis sind die tatsächlichen Jahreskosten, umgerechnet auf Monat und auf 100 Kilometer.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Verbrauch:</strong> Nimm den realen Wert, nicht die WLTP-Angabe. Kompaktwagen liegen bei 15 bis 18 kWh je 100 Kilometer, Mittelklasse und Kombis bei 18 bis 22, große SUV bei 22 bis 28. Im Winter kommen 20 bis 30 Prozent dazu, auf der Autobahn bei 130 km/h ebenfalls. Wer viel Langstrecke fährt, sollte am oberen Rand ansetzen.</p>
      <p><strong>Anteil Heimladen:</strong> Das ist der Regler mit dem größten Einfluss auf das Ergebnis. Wer eine eigene Wallbox hat und nur im Urlaub unterwegs lädt, liegt bei 85 bis 95 Prozent. Ohne feste Lademöglichkeit sind es oft unter 30.</p>
      <p><strong>Strompreis zu Hause:</strong> Haushaltstarife liegen bei 30 bis 40 Cent. Wenn du eine PV-Anlage hast und überwiegend mit Überschuss lädst, ist der richtige Ansatz die entgangene Einspeisevergütung von rund 8 Cent – so viel kostet dich die Kilowattstunde, die ins Auto statt ins Netz geht.</p>
      <p><strong>Preis öffentlich:</strong> Mit Ladekarte zahlst du an AC-Säulen meist 45 bis 60 Cent, an DC-Schnellladern 55 bis 79. Ohne Vertrag im Ad-hoc-Tarif werden bis zu 89 Cent fällig. Wenn du gemischt lädst, nimm einen Mittelwert deiner tatsächlichen Abrechnungen.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Zum Vergleich: Ein Benziner mit 7 Litern Verbrauch kostet bei 1,80 Euro je Liter 12,60 Euro auf 100 Kilometer. Wer überwiegend zu Hause lädt, liegt bei etwa der Hälfte. Wer überwiegend schnelllädt, landet ungefähr gleichauf.</p>
      <p>Nicht enthalten sind die Ladeverluste zwischen Steckdose und Batterie. Sie betragen 10 bis 20 Prozent, an der normalen Schuko-Steckdose eher mehr. Der Zähler misst also mehr, als im Akku ankommt – rechne bei den Heimkosten einen entsprechenden Aufschlag dazu.</p>

      <h3>Was eine Wallbox kostet und welche Leistung reicht</h3>
      <p>Das Gerät liegt bei 500 bis 1.200 Euro, die Installation bei 500 bis 2.000, je nach Leitungslänge und baulichem Aufwand. Für den Hausgebrauch reichen 11 kW praktisch immer: Damit lädt ein 60-kWh-Akku in gut fünf Stunden von 20 auf 80 Prozent. 11-kW-Boxen sind beim Netzbetreiber nur anzumelden, ab 12 kW ist eine Genehmigung nötig, die auch abgelehnt werden kann. Viele Fahrzeuge können ohnehin nicht mehr als 11 kW Wechselstrom aufnehmen.</p>
        `,
    faq: [
      { q: 'Was kostet 100 km mit dem E-Auto?', a: 'Bei 18 kWh Verbrauch und Haushaltsstrom für 35 ct sind es 6,30 Euro. Mit Solarstrom liegt der rechnerische Wert bei ein bis zwei Euro, am Schnelllader bei 10 bis 14 Euro.' },
      { q: 'Lohnt sich eine eigene Wallbox?', a: 'Bei regelmäßiger Nutzung ja. Die Differenz zwischen Heimladen und öffentlichem Laden beträgt schnell 400 bis 800 Euro im Jahr, womit sich eine Wallbox meist innerhalb von zwei bis vier Jahren trägt. Dazu kommt der Komfort, morgens immer voll loszufahren.' },
      { q: '11 kW oder 22 kW?', a: 'Für zu Hause reichen 11 kW fast immer aus, weil über Nacht genug Zeit ist. 22 kW lohnen sich nur, wenn mehrere Fahrzeuge nacheinander geladen werden müssen. Der Genehmigungsaufwand ist deutlich höher, und viele Autos können bordseitig gar keine 22 kW aufnehmen.' },
      { q: 'Kann ich mit Solarstrom laden?', a: 'Ja, mit einer Wallbox, die Überschussladen beherrscht. Sie misst am Hausanschluss, wie viel gerade eingespeist würde, und regelt den Ladestrom nach. Achte darauf, dass Wallbox, Wechselrichter und Energiezähler zusammenpassen – und dass die Box bei kleinem Überschuss auf einphasiges Laden umschalten kann, sonst startet sie an vielen Tagen gar nicht.' },
      { q: 'Gibt es noch Förderung für Wallboxen?', a: 'Bundesweit derzeit nicht. Einzelne Bundesländer, Kommunen und Stadtwerke fördern aber weiterhin, teilweise mit mehreren hundert Euro. Ein Blick auf die Seite deines regionalen Versorgers lohnt sich vor dem Kauf.' },
      { q: 'Warum zeigt mein Auto weniger geladene kWh als der Zähler?', a: 'Das sind die Ladeverluste. Zwischen 10 und 20 Prozent gehen im Ladegerät, in der Leitung und bei der Batteriekonditionierung verloren. An der Schuko-Steckdose ist der Anteil höher als an einer Wallbox, weil dort mit geringerer Leistung über längere Zeit geladen wird.' },
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
      <h2>Wie der Stromkosten-Rechner rechnet</h2>
      <p>Jeder Stromtarif besteht aus zwei Teilen: dem monatlichen Grundpreis, der unabhängig vom Verbrauch anfällt, und dem Arbeitspreis je Kilowattstunde. Der Rechner stellt zwei vollständige Tarife nebeneinander – deinen aktuellen und einen Vergleichstarif – und zeigt die Differenz auf Jahr und Monat.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Jahresverbrauch:</strong> Er steht auf deiner letzten Jahresabrechnung. Zur Orientierung: ein Ein-Personen-Haushalt liegt bei 1.300 bis 2.000 kWh, zwei Personen bei 2.000 bis 3.000, vier Personen bei 3.500 bis 4.500. Ein Haus mit Wärmepumpe oder E-Auto kommt auf 6.000 bis 12.000 kWh und mehr. Schätze nicht – eine falsche Verbrauchsannahme verzerrt jeden Tarifvergleich.</p>
      <p><strong>Arbeitspreis und Grundpreis:</strong> Beide stehen auf der Abrechnung und in jedem Angebot. Achte darauf, immer beide Werte gemeinsam einzutragen. Ein Tarif mit sehr niedrigem Arbeitspreis und hohem Grundpreis lohnt sich erst ab einer bestimmten Verbrauchsmenge; bei niedrigem Verbrauch ist er die teurere Wahl.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Zwischen dem Grundversorgungstarif und einem günstigen Wettbewerbsangebot liegen häufig 8 bis 12 Cent je Kilowattstunde. Bei 4.000 kWh sind das 320 bis 480 Euro im Jahr. Das ist auch die Größenordnung, um die es beim jährlichen Vergleich geht.</p>
      <p>Rechne einen Neukundenbonus nicht in den Arbeitspreis ein. Viele Angebote sehen im ersten Jahr günstig aus, weil ein Bonus von 100 bis 200 Euro eingerechnet ist; ab dem zweiten Jahr zahlst du den regulären Preis. Trage deshalb den Preis ohne Bonus ein oder rechne den Zweijahresschnitt.</p>

      <h3>Worauf du beim Tarifwechsel achten solltest</h3>
      <p>Bei der Preisgarantie ist entscheidend, was sie umfasst. Eine eingeschränkte Garantie schließt Steuern, Abgaben und Umlagen aus – also genau die Posten, die sich am ehesten ändern. Bei der Laufzeit sind zwölf Monate üblich; wichtiger als die Laufzeit selbst ist die automatische Verlängerung, denn wer nicht rechtzeitig kündigt, hängt oft ein weiteres Jahr im teureren Folgetarif. Vorkasse- und Kautionstarife solltest du meiden, weil du dem Anbieter damit einen zinslosen Kredit gibst und im Insolvenzfall das Risiko trägst.</p>
      <p>Der Wechsel selbst dauert zwei bis sechs Wochen. Der neue Anbieter übernimmt die Kündigung beim alten; du musst selbst nichts kündigen. Netzbetreiber, Leitung und Zähler bleiben dieselben, ein Stromausfall ist technisch ausgeschlossen. Deine einzige Aufgabe ist es, am Wechseltag den Zählerstand abzulesen und zu fotografieren.</p>

      <h3>Wo du zusätzlich sparst</h3>
      <p>Neben dem Tarif hilft der Blick auf den Verbrauch. Ein alter Kühlschrank oder Gefrierschrank zieht oft dreimal so viel wie ein aktuelles Gerät und kostet über zehn Jahre mehr als ein Neukauf. Auch Standby-Verbrauch summiert sich: 20 Watt Dauerlast entsprechen 175 kWh und damit rund 60 Euro im Jahr.</p>
        `,
    faq: [
      { q: 'Wie viel kann ich beim Anbieterwechsel sparen?', a: 'Zwischen Grundversorgung und einem günstigen Angebot liegen häufig 8 bis 12 ct/kWh. Bei einem Vier-Personen-Haushalt mit 4.000 kWh sind das 320 bis 480 Euro im Jahr.' },
      { q: 'Wie oft sollte ich vergleichen?', a: 'Einmal jährlich. Nach Ablauf der Erstlaufzeit landen viele Kunden in einem Folgetarif, der spürbar teurer ist als das aktuelle Neukundenangebot desselben Anbieters.' },
      { q: 'Kann beim Wechsel der Strom ausfallen?', a: 'Nein. Netz, Leitung und Zähler bleiben unverändert, es wechselt nur der Vertragspartner. Selbst wenn ein Anbieter ausfällt, greift automatisch die Ersatzversorgung durch den Grundversorger.' },
      { q: 'Was mache ich bei einer Preiserhöhung?', a: 'Du hast ein Sonderkündigungsrecht, unabhängig von der vereinbarten Laufzeit. Die Frist ist meist knapp bemessen, oft nur bis zum Wirksamwerden der Erhöhung – handle also zügig, wenn das Schreiben kommt.' },
      { q: 'Ist Ökostrom teurer?', a: 'Kaum. Die meisten Ökostromtarife funktionieren über Herkunftsnachweise für Strom aus bestehenden Wasserkraftwerken und kosten fast nichts mehr. Wer den Ausbau neuer Anlagen unterstützen will, achtet auf Label wie „Grüner Strom" oder „ok-power"; diese Tarife liegen ein bis zwei Cent höher.' },
      { q: 'Sollte ich meinen Abschlag anpassen?', a: 'Wenn dein Verbrauch deutlich von der Schätzung abweicht, ja. Ein zu hoher Abschlag ist ein zinsloser Kredit an den Versorger. Umgekehrt lohnt sich eine Erhöhung, wenn ein E-Auto oder eine Wärmepumpe dazugekommen ist – sonst kommt im Februar eine unerwartete Nachzahlung.' },
    ],
    affiliate: {
      heading: 'Stromtarife vergleichen bei Check24',
      text: 'Vergleiche geprüfte Stromtarife für deinen Verbrauch und deine Postleitzahl und wechsle in wenigen Minuten – über Check24.',
      cta: 'Zum Stromvergleich',
      href: 'https://a.check24.net/misc/click.php?pid=1167745&aid=18&deep=stromanbieter-wechseln&cat=1',
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
      <h2>Wie der Hochbeet-Rechner rechnet</h2>
      <p>Aus Länge, Breite und Höhe ergibt sich das Gesamtvolumen in Litern. Dieses Volumen verteilt der Rechner auf die vier Schichten des klassischen Aufbaus und rechnet die oberste Schicht zusätzlich in handelsübliche Säcke um, damit du weißt, was du einkaufen musst.</p>

      <h3>Der Schichtaufbau von unten nach oben</h3>
      <p>Ganz unten liegt ein Wühlmausgitter mit maximal 13 Millimetern Maschenweite, an den Seiten einige Zentimeter hochgezogen. Darüber kommt die Grobschicht aus Ästen und Strauchschnitt, etwa 30 Prozent der Höhe: Sie belüftet das Beet und ist der langsam verrottende Energievorrat. Es folgt eine Schicht aus umgedrehten Grassoden, Laub und grobem Grünschnitt mit rund 20 Prozent. Darüber halb verrotteter Kompost oder Mist, ebenfalls etwa 20 Prozent, der die Nährstoffe der ersten Jahre liefert. Ganz oben liegt die Pflanzschicht aus reifem Kompost und guter Gartenerde – sie sollte mindestens 25 bis 30 Zentimeter mächtig sein, sonst reicht der Wurzelraum für Tomaten oder Kohl nicht.</p>

      <h3>Was du wirklich kaufen musst</h3>
      <p>Die beiden unteren Schichten kosten in der Regel nichts, weil sie aus dem eigenen Garten stammen. Bezahlen musst du meist nur die oberste. Bei größeren Beeten lohnt sich lose Ware vom Kompostwerk oder Baustoffhandel: Sie kostet pro Kubikmeter oft nur ein Viertel dessen, was dieselbe Menge in Sackware kostet.</p>
      <p>Plane einen Puffer von etwa zehn Prozent ein. Das Material setzt sich schon beim Einfüllen, und du wirst mehr brauchen, als die reine Volumenrechnung ergibt.</p>

      <h3>Warum das Beet absackt</h3>
      <p>Im ersten Jahr sinkt der Inhalt um 15 bis 25 Prozent, weil das organische Material zusammenfällt und verrottet. Das ist kein Fehler, sondern genau der Prozess, der Wärme und Nährstoffe erzeugt. Fülle jedes Frühjahr fünf bis zehn Zentimeter Kompost nach. Nach etwa fünf bis sieben Jahren ist der Vorrat aufgebraucht und der Ertrag lässt nach – dann leerst du das Beet aus, verteilst den Inhalt als hervorragende Erde im Garten und baust neu auf.</p>

      <h3>Der beste Zeitpunkt und die Pflanzfolge</h3>
      <p>Befülle im Herbst, wenn das Schnittgut ohnehin anfällt. Der Winter gibt dem Material Zeit, sich zu setzen, und im Frühjahr füllst du nur die abgesackte Höhe auf.</p>
      <p>Im ersten und zweiten Jahr ist das Beet sehr nährstoffreich – da gehören Starkzehrer hinein: Tomaten, Zucchini, Gurken, Kürbis, Kohl. Im dritten und vierten Jahr folgen Mittelzehrer wie Möhren, Zwiebeln, Kohlrabi und Mangold, ab dem fünften Schwachzehrer wie Salat, Radieschen, Kräuter und Bohnen. Salat im ersten Jahr ist der klassische Fehler: Er reichert bei hohem Stickstoffangebot Nitrat an und schießt schnell in die Blüte.</p>
        `,
    faq: [
      { q: 'Welche Erde kommt ins Hochbeet?', a: 'In die oberste Schicht gehört reifer Kompost, gemischt mit guter Gartenerde oder torffreier Hochbeeterde. Reine Blumenerde ist zu fein und sackt zusammen; reiner Kompost allein ist für viele Kulturen zu nährstoffreich.' },
      { q: 'Wie hoch sollte ein Hochbeet sein?', a: 'Für rückenschonendes Arbeiten 80 bis 90 cm, gemessen bis zur Oberkante. Für Kinder oder als reines Anzuchtbeet reichen 40 bis 60 cm. Wichtig ist vor allem, dass die Pflanzschicht oben mindestens 25 bis 30 cm stark ist.' },
      { q: 'Warum sackt das Hochbeet ab?', a: 'Weil das organische Material verrottet und dabei Volumen verliert. 15 bis 25 Prozent im ersten Jahr sind normal. Fülle jedes Frühjahr Kompost nach.' },
      { q: 'Wie lange hält die Füllung?', a: 'Etwa fünf bis sieben Jahre. Danach ist der Nährstoffvorrat der unteren Schichten aufgebraucht und der Ertrag lässt spürbar nach. Der ausgeräumte Inhalt ist beste Erde für die Beete im Garten.' },
      { q: 'Welches Holz eignet sich für den Rahmen?', a: 'Lärche und Douglasie halten unbehandelt acht bis fünfzehn Jahre, Fichte nur drei bis fünf. Kleide die Innenseite mit Noppenfolie aus, damit das Holz nicht dauerhaft an feuchter Erde liegt, aber lass den Boden offen für Regenwürmer und Wasserabzug.' },
      { q: 'Wann fülle ich das Beet am besten?', a: 'Im Herbst. Dann fällt das grobe Material ohnehin an, und der Inhalt kann sich über den Winter setzen. Im Frühjahr füllst du nur nach und kannst sofort pflanzen.' },
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
      <h2>Wie der Dämmungs-Rechner rechnet</h2>
      <p>Der Wärmeverlust eines Bauteils ergibt sich aus seiner Fläche, dem U-Wert und der Temperaturdifferenz über die Heizperiode. Der Rechner ermittelt diesen Verlust für den alten und den gedämmten Zustand, bildet die Differenz und rechnet die eingesparten Kilowattstunden mit deinem Energiepreis in Euro um.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Fläche:</strong> Nimm die tatsächliche Bauteilfläche. Bei der obersten Geschossdecke ist das die Grundfläche des Dachbodens, bei der Kellerdecke die Grundfläche des Kellers, bei der Fassade der Umfang mal Höhe abzüglich Fenster und Türen.</p>
      <p><strong>U-Wert vorher:</strong> Er beschreibt, wie viel Wärme pro Quadratmeter und Grad Temperaturunterschied verloren geht – je kleiner, desto besser. Eine ungedämmte Vollziegelwand mit 36 Zentimetern liegt bei 1,4 bis 1,6, eine ungedämmte oberste Geschossdecke bei 1,0 bis 2,0, eine ungedämmte Kellerdecke bei 1,2 bis 1,5. Isolierglasfenster aus den 80er Jahren liegen bei 2,8 bis 3,0, einfachverglaste Fenster bei 4,5 bis 5,5.</p>
      <p><strong>U-Wert nachher:</strong> Nach heutigem Standard erreicht eine gedämmte Fassade 0,20 bis 0,24, eine gedämmte oberste Geschossdecke 0,14 bis 0,20, eine gedämmte Kellerdecke 0,25 bis 0,30 und ein neues Fenster 0,90 bis 1,10. Diese Werte sind zugleich ungefähr das, was Förderprogramme mindestens verlangen.</p>

      <h3>Womit du anfangen solltest</h3>
      <p>Die Reihenfolge nach Wirtschaftlichkeit ist fast immer dieselbe. An erster Stelle steht die oberste Geschossdecke: 20 bis 30 Zentimeter Dämmung auf einem ungenutzten Dachboden kosten 25 bis 60 Euro je Quadratmeter, sind teilweise in Eigenleistung machbar und amortisieren sich oft in fünf bis zehn Jahren. Dann folgt die Kellerdecke mit 30 bis 60 Euro je Quadratmeter; der Verbrauchseffekt ist kleiner, der Komfortgewinn im Erdgeschoss aber sofort spürbar.</p>
      <p>Die Fassade kostet mit 150 bis 250 Euro je Quadratmeter am meisten und amortisiert sich rein energetisch selten unter 20 Jahren. Wirtschaftlich wird sie, wenn ohnehin saniert werden muss – dann fallen Gerüst, Putz und Anstrich sowieso an und nur die Differenz zählt. Fenster werden meist überschätzt, weil man die Kälte an ihnen direkt spürt; ihr Flächenanteil ist aber gering.</p>

      <h3>Wie dick dämmen?</h3>
      <p>Der Nutzen jeder weiteren Schicht nimmt ab, trotzdem lohnt sich großzügiges Dämmen. Der Dämmstoff selbst ist der billigste Teil der Maßnahme; Gerüst, Handwerker und Anschlussarbeiten kosten unabhängig von der Stärke ungefähr gleich viel. Bei der Fassade sind heute 16 bis 20 Zentimeter üblich, auf dem Dachboden 24 bis 30.</p>

      <h3>Der Fehler, der zu Schimmel führt</h3>
      <p>Neue, dichte Fenster in einem ungedämmten Haus sind der Klassiker. Vorher entwich Feuchtigkeit durch undichte Fugen, danach bleibt sie im Raum – und der kälteste Punkt ist nun die Wandecke hinter dem Schrank statt der Scheibe. Beim Fenstertausch ist deshalb ein Lüftungskonzept vorgeschrieben. Innendämmung verschiebt den Taupunkt in die Konstruktion hinein und gehört in die Hand eines Planers, der den Wandaufbau rechnerisch prüft.</p>
        `,
    faq: [
      { q: 'Welche Dämmung lohnt sich zuerst?', a: 'Die oberste Geschossdecke. Sie ist billig, oft in Eigenleistung machbar und amortisiert sich häufig in fünf bis zehn Jahren. Danach folgt die Kellerdecke, zuletzt die Fassade.' },
      { q: 'Was bedeutet der U-Wert?', a: 'Er gibt an, wie viel Wärme in Watt pro Quadratmeter und Grad Temperaturunterschied durch ein Bauteil verloren geht. Je kleiner der Wert, desto besser die Dämmwirkung.' },
      { q: 'Wie dick muss die Dämmung sein?', a: 'An der Fassade sind heute 16 bis 20 cm üblich, auf dem Dachboden 24 bis 30 cm, an der Kellerdecke 8 bis 12 cm. Zu dünn zu dämmen spart am falschen Ende, weil Gerüst und Arbeitszeit unabhängig von der Stärke anfallen und Förderprogramme Mindest-U-Werte verlangen.' },
      { q: 'Gibt es Förderung für Dämmung?', a: 'Ja, über die Bundesförderung für effiziente Gebäude als Zuschuss für Einzelmaßnahmen an der Gebäudehülle, mit einem zusätzlichen Bonus, wenn die Maßnahme aus einem individuellen Sanierungsfahrplan stammt. Ein Energieberater muss dabei eingebunden werden und stellt den Antrag.' },
      { q: 'Bin ich zur Dämmung verpflichtet?', a: 'Das Gebäudeenergiegesetz schreibt unter anderem vor, ungedämmte oberste Geschossdecken zu dämmen, wenn ein Haus nach einem Eigentümerwechsel weitergenutzt wird. Eigentümer, die schon lange selbst im Haus wohnen, sind davon ausgenommen.' },
      { q: 'Kann ich selbst dämmen?', a: 'Auf einem ungenutzten Dachboden ja – Dämmplatten oder Klemmfilz zwischen und über die Balken zu legen ist gut machbar. Fassade und Innendämmung gehören dagegen in Fachhände, weil Anschlüsse, Wärmebrücken und Feuchteverhalten stimmen müssen.' },
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
      <h2>Wie der Heizlast-Rechner rechnet</h2>
      <p>Die Heizlast ist die Leistung in Kilowatt, die dein Haus am kältesten Tag braucht. Der Rechner multipliziert dafür die beheizte Wohnfläche mit einem flächenbezogenen Wert, der vom energetischen Zustand des Gebäudes abhängt. Über die Vollbenutzungsstunden ergibt sich daraus zusätzlich der Jahreswärmebedarf.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Wohnfläche:</strong> Gemeint ist die beheizte Fläche. Ein unbeheizter Keller oder ein kalter Dachboden zählen nicht mit.</p>
      <p><strong>Spezifische Heizlast:</strong> Unsanierte Altbauten vor 1978 liegen bei 100 bis 160 W/m². Teilsanierte Häuser mit neuen Fenstern und gedämmtem Dach kommen auf 70 bis 100. Gebäude nach der Wärmeschutzverordnung von 1995 liegen bei 60 bis 80, Neubauten nach aktuellem Standard bei 30 bis 50 und Passivhäuser bei 10 bis 15. Diese Spannen sind bewusst breit: Zwei Häuser desselben Baujahrs können sich um den Faktor zwei unterscheiden, je nachdem, was bereits saniert wurde.</p>
      <p><strong>Vollbenutzungsstunden:</strong> Sie beschreiben, wie viele Stunden im Jahr die Heizung rechnerisch unter Volllast laufen müsste. In Deutschland liegt der Wert je nach Region bei 1.800 bis 2.200 Stunden.</p>

      <h3>Der Gegencheck über den Verbrauch</h3>
      <p>Es gibt eine zweite, oft genauere Methode: die Rückrechnung aus dem tatsächlichen Verbrauch. Nimm den Gasverbrauch eines vollen Jahres in Kilowattstunden, zieh den Warmwasseranteil von grob 500 bis 800 kWh pro Person ab und teile den Rest durch die Vollbenutzungsstunden.</p>
      <p>Ein Beispiel: 20.000 kWh Gas, davon 2.400 für Warmwasser bei drei Personen, bleiben 17.600 kWh Heizwärme. Geteilt durch 2.000 Stunden ergibt das 8,8 Kilowatt. Gehen Flächenschätzung und Verbrauchsrechnung stark auseinander, ist meist die spezifische Heizlast zu hoch angesetzt.</p>

      <h3>Warum die Zahl so wichtig ist</h3>
      <p>Eine zu groß gewählte Heizung ist der häufigste und teuerste Planungsfehler im Bestand. Sie kostet mehr in der Anschaffung, taktet im Betrieb ständig und verschleißt schneller. Bei einer Wärmepumpe drückt das Takten zusätzlich die Jahresarbeitszahl. Historisch hat sich Überdimensionierung eingeschliffen, weil bei Gaskesseln der Mehrpreis gering und die Effizienzeinbuße überschaubar war – bei einer Wärmepumpe gilt beides nicht mehr.</p>
      <p>Ob deine bestehende Anlage zu groß ist, erkennst du am Taktverhalten: Springt der Brenner oder Kompressor in der Übergangszeit sehr häufig an und läuft jeweils nur wenige Minuten, deutet das darauf hin. Mehr als drei bis vier Starts pro Stunde bei milden Außentemperaturen sind ein Warnsignal.</p>

      <h3>Was eine richtige Berechnung zusätzlich leistet</h3>
      <p>Die normgerechte Berechnung nach DIN EN 12831 geht raumweise vor und berücksichtigt jedes Bauteil mit Fläche und U-Wert, Wärmebrücken, den Lüftungswärmebedarf und die regional festgelegte Norm-Außentemperatur, die zwischen etwa −10 °C an der Küste und −16 °C in Höhenlagen liegt. Ihr eigentlicher Wert liegt im raumweisen Ergebnis: Nur damit lässt sich prüfen, ob die vorhandenen Heizkörper bei niedriger Vorlauftemperatur ausreichen. Bei einer Wärmepumpe kommen außerdem ein Zuschlag für Warmwasser von 0,2 bis 0,3 kW pro Person und einer für Sperrzeiten von 5 bis 15 Prozent dazu.</p>
        `,
    faq: [
      { q: 'Was ist die Heizlast?', a: 'Die Leistung in Kilowatt, die dein Haus am kältesten Tag des Jahres braucht, um innen die gewünschte Temperatur zu halten. Aus ihr leiten sich Kesselgröße, Wärmepumpenleistung und Heizkörperauslegung ab.' },
      { q: 'Wie genau ist die Faustformel?', a: 'Sie liefert eine Größenordnung, mehr nicht. Für die Auswahl einer Heizung und erst recht für einen Förderantrag brauchst du eine raumweise Berechnung nach DIN EN 12831 durch einen Fachbetrieb oder Energieberater.' },
      { q: 'Warum ist eine zu große Heizung schlecht?', a: 'Sie taktet – schaltet also ständig ein und aus –, verschleißt dadurch schneller und arbeitet ineffizient. Bei einer Wärmepumpe sinkt die Jahresarbeitszahl spürbar, und der Stromverbrauch steigt entsprechend.' },
      { q: 'Wie rechne ich Gas-Kubikmeter in Kilowattstunden um?', a: 'Multipliziere die Kubikmeter mit dem Brennwert und der Zustandszahl, die beide auf deiner Abrechnung stehen. In der Praxis liegt der Faktor meist bei etwa 10 bis 11 kWh je Kubikmeter.' },
      { q: 'Muss ich Warmwasser dazurechnen?', a: 'Für die Heizlast selbst nicht, aber bei der Auslegung einer Wärmepumpe kommt ein Zuschlag von 0,2 bis 0,3 kW pro Person hinzu, plus 5 bis 15 Prozent für mögliche Sperrzeiten des Netzbetreibers.' },
      { q: 'Woran erkenne ich, dass meine Heizung überdimensioniert ist?', a: 'An häufigen kurzen Brennerstarts in der Übergangszeit. Mehr als drei bis vier Starts pro Stunde bei milden Außentemperaturen deuten auf Takten hin. Oft lässt sich das durch Leistungsbegrenzung in der Regelung und einen hydraulischen Abgleich beheben, ohne die Anlage zu tauschen.' },
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
      <h2>Wie der Zisternen-Rechner rechnet</h2>
      <p>Der Jahresertrag ergibt sich aus drei Werten: der Dachfläche in der Draufsicht, dem Jahresniederschlag und einem Abflussbeiwert für die Eindeckung. Aus dem Ertrag leitet der Rechner eine sinnvolle Behältergröße ab und rechnet die eingesparten Wasserkosten aus.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Dachfläche:</strong> Gemeint ist die Grundfläche in der Draufsicht, nicht die schräge Dachfläche. Ein Satteldach mit 12 mal 8 Metern Grundriss zählt als 96 Quadratmeter, unabhängig von der Neigung – Regen fällt senkrecht. Zähle nur die Flächen, deren Fallrohre auch tatsächlich zur Zisterne führen.</p>
      <p><strong>Niederschlag:</strong> In Deutschland liegt der Jahreswert grob zwischen 500 Millimetern in Teilen Sachsen-Anhalts und über 1.000 Millimetern im Alpenvorland und im Sauerland. Als grober Mittelwert werden häufig 700 bis 800 Millimeter angesetzt; den Wert für deinen Ort findest du bei den regionalen Wetterdiensten.</p>
      <p><strong>Abflussbeiwert:</strong> Er beschreibt, wie viel vom Regen tatsächlich ankommt. Ziegel, Beton und Schiefer liegen bei 0,80 bis 0,90, Metalldächer bei 0,90, Bitumen-Flachdächer bei 0,80, Kiesdächer bei 0,60 und begrünte Dächer nur bei 0,30 bis 0,50.</p>

      <h3>Die richtige Größe</h3>
      <p>Eine Zisterne soll nicht das Jahresaufkommen fassen, sondern die Trockenperioden überbrücken. Üblich ist ein Volumen für etwa sechs Wochen Bedarf, alternativ 5 bis 6 Prozent des Jahresertrags.</p>
      <p>Für die reine Gartennutzung rechnest du mit rund 60 Litern pro Quadratmeter Garten und Saison. 200 Quadratmeter Rasen und Beete brauchen also etwa 12.000 Liter im Jahr, was eine Zisterne von 3.000 bis 4.000 Litern nahelegt. Kommt die Toilettenspülung dazu, ändert sich das Bild: Eine Person verbraucht dafür 30 bis 40 Liter am Tag, bei vier Personen also rund 50 Kubikmeter im Jahr. Hier sind 6.000 bis 8.000 Liter sinnvoll. Zu groß zu bauen kostet doppelt – der Behälter ist teurer, und das Wasser steht länger.</p>

      <h3>Wie du das Ergebnis einordnest</h3>
      <p>Bei reiner Gartennutzung sparst du nur den Frischwasserpreis von meist 1,50 bis 2,50 Euro je Kubikmeter. Gegen eine Investition von mehreren tausend Euro gerechnet ist das keine schnelle Amortisation; hier zählen andere Argumente wie kalkfreies, temperiertes Gießwasser und Unabhängigkeit bei Bewässerungsverboten.</p>
      <p>Mit Toilettenspülung sparst du zusätzlich das Schmutzwasserentgelt von oft 2 bis 3,50 Euro je Kubikmeter, und die Rechnung sieht deutlich besser aus. Frag außerdem bei deiner Gemeinde nach der gesplitteten Abwassergebühr: Wer Regenwasser auf dem Grundstück zurückhält, zahlt vielerorts eine reduzierte Niederschlagswassergebühr, teilweise gibt es zusätzlich einmalige Zuschüsse.</p>

      <h3>Technik, die dazugehört</h3>
      <p>Der Filter vor dem Einlauf muss zugänglich bleiben und mindestens zweimal im Jahr gereinigt werden. Ein beruhigter Zulauf am Boden verhindert, dass die Sedimentschicht aufgewirbelt wird; die Entnahme erfolgt über einen Schwimmer etwa 15 Zentimeter unter der Oberfläche. Der Überlauf braucht einen Geruchsverschluss und, bei Anschluss an die Kanalisation, eine Rückstausicherung. Für die Hausnutzung ist die strikte Trennung vom Trinkwassernetz vorgeschrieben: Eine Nachspeisung darf nur über einen freien Auslauf erfolgen, und Regenwasserleitungen müssen dauerhaft gekennzeichnet sein.</p>
        `,
    faq: [
      { q: 'Wie groß sollte meine Zisterne sein?', a: 'Als Faustregel etwa sechs Wochen Bedarf oder 5 bis 6 Prozent des Jahresertrags. Für reine Gartennutzung sind 3.000 bis 4.000 Liter üblich, mit Toilettenspülung 6.000 bis 8.000.' },
      { q: 'Wie viel Wasser liefert mein Dach?', a: 'Dachfläche in der Draufsicht mal Jahresniederschlag mal Abflussbeiwert. Ein 96-Quadratmeter-Ziegeldach bei 750 mm Niederschlag liefert rund 61 Kubikmeter im Jahr, abzüglich Filterverlusten etwa 55.' },
      { q: 'Darf ich Regenwasser für die Toilette nutzen?', a: 'Ja, aber die Anlage muss strikt vom Trinkwassernetz getrennt sein. Eine Nachspeisung ist nur über einen freien Auslauf zulässig, und alle Regenwasserleitungen müssen dauerhaft gekennzeichnet werden. Die Installation gehört in die Hand eines Fachbetriebs und ist meldepflichtig.' },
      { q: 'Was kostet eine Zisterne komplett?', a: 'Der Erdtank mit 5.000 Litern kostet 1.200 bis 2.500 Euro, die Erdarbeiten 1.500 bis 4.000 je nach Zugänglichkeit, Filter und Pumpentechnik weitere 500 bis 1.500. Für die Hausnutzung kommen 1.500 bis 3.000 Euro für das zweite Leitungsnetz dazu.' },
      { q: 'Gibt es Zuschüsse?', a: 'Viele Kommunen reduzieren die Niederschlagswassergebühr, wenn Regenwasser auf dem Grundstück zurückgehalten wird, und einige zahlen einmalige Zuschüsse zum Bau. Das ist regional sehr unterschiedlich – frag direkt bei der Gemeinde nach.' },
      { q: 'Muss die Zisterne im Winter geleert werden?', a: 'Nein. Ein frostsicher tief eingebauter Erdtank friert nicht durch. Oberirdische Tanks dagegen müssen vor dem Frost entleert werden, ebenso alle Leitungen und die Pumpe, wenn sie außerhalb steht.' },
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
      <h2>Wie der Pflaster-Rechner rechnet</h2>
      <p>Aus Länge und Breite ergibt sich die Fläche, aus der Anzahl Steine je Quadratmeter die Steinzahl. Dazu kommt ein Verschnittzuschlag. Für den Unterbau rechnet der Rechner Schotter und Splitt in der jeweils üblichen Schichtstärke aus.</p>

      <h3>Der Aufbau von unten nach oben</h3>
      <p>Zuerst wird ausgekoffert: 30 bis 40 Zentimeter für Terrasse und Gehweg, 40 bis 60 für eine befahrene Einfahrt. Auf den verdichteten Untergrund kommt ein Geotextil-Vlies, das verhindert, dass sich Schotter und Erdreich vermischen – der häufigste Grund für spätere Setzungen. Es kostet ein bis drei Euro je Quadratmeter und ist die billigste Versicherung im ganzen Aufbau.</p>
      <p>Darüber liegt die Tragschicht aus Schotter der Körnung 0/32 oder 0/45: 20 bis 25 Zentimeter für eine Terrasse, 30 bis 40 für eine Einfahrt. Sie wird lagenweise in höchstens 15 Zentimeter starken Schichten eingebaut und jeweils gerüttelt – alles auf einmal einzufüllen bringt nicht dasselbe Ergebnis. Die Bettung aus Splitt 2/5 oder 1/3 ist konstant 3 bis 5 Zentimeter dick, wird abgezogen, aber nicht verdichtet. Sie gleicht nur die Stärkentoleranzen der Steine aus und ist keine Ausgleichsschicht für einen welligen Unterbau.</p>

      <h3>Verschnitt und Mengen</h3>
      <p>Rechne 5 Prozent Verschnitt bei geradem Reihenverband, 10 bis 12 bei Diagonalverlegung und bis zu 15 bei unregelmäßigen Formaten. Beim Schotter kommen etwa 10 Prozent Zuschlag dazu, weil sich das Material beim Verdichten setzt.</p>
      <p>Baustoffhändler verkaufen nach Tonnen, geplant wird aber in Kubikmetern. Rechne mit einer Schüttdichte von etwa 1,8 t/m³ für Schotter und Splitt – dieser Umrechnungsschritt wird häufig vergessen. Klär außerdem vorher, wohin der Aushub kommt: Bei einer 25-Quadratmeter-Terrasse fallen rund 8 Kubikmeter an, und die Entsorgung ist ein Posten von mehreren hundert Euro.</p>

      <h3>Gefälle und Randeinfassung</h3>
      <p>Die Fläche braucht 2 bis 2,5 Prozent Gefälle vom Haus weg, also 2 bis 2,5 Zentimeter je Meter. Bei einer 4 Meter tiefen Terrasse sind das 8 bis 10 Zentimeter Höhenunterschied. Das ist der Punkt, an dem die meisten Selbstbauprojekte scheitern: Ohne Gefälle steht Wasser in Senken und sprengt im Winter das Fugenmaterial heraus.</p>
      <p>Halte außerdem Abstand zur Hauswand – die Pflasteroberkante muss mindestens 15 Zentimeter unter der Oberkante der Abdichtung bleiben. Randsteine oder eine Betonrückenstütze sind Pflicht: Ohne seitliche Einfassung wandert das Pflaster nach außen, die Fugen öffnen sich und die Fläche verliert ihren Verbund.</p>

      <h3>Steine auswählen</h3>
      <p>4 Zentimeter Stärke reichen für Terrassenplatten, die nur begangen werden. Für eine Einfahrt brauchst du mindestens 8 Zentimeter, bei Lkw-Verkehr 10. Kauf Steine immer aus einer Charge und misch beim Verlegen aus mehreren Paletten gleichzeitig – Betonsteine schwanken chargenweise im Farbton, und wer Palette für Palette abarbeitet, bekommt Streifen in der Fläche.</p>
        `,
    faq: [
      { q: 'Wie dick muss der Unterbau sein?', a: 'Für eine Terrasse 20 bis 25 cm Schotter plus 3 bis 5 cm Splitt, für eine befahrene Einfahrt 30 bis 40 cm Schotter. Der Aushub muss entsprechend 30 bis 60 cm tief sein.' },
      { q: 'Wie viel Gefälle braucht die Terrasse?', a: '2 bis 2,5 Prozent, also 2 bis 2,5 cm pro Meter, immer vom Haus weg. Ohne Gefälle steht Wasser auf der Fläche und sprengt im Winter das Fugenmaterial heraus.' },
      { q: 'Wie viel Verschnitt soll ich einplanen?', a: '5 Prozent bei geradem Reihenverband, 10 bis 12 bei Diagonalverlegung, bis zu 15 bei unregelmäßigen Formaten und Naturstein.' },
      { q: 'Brauche ich wirklich ein Vlies?', a: 'Ja. Ohne Geotextil vermischen sich Schotter und Erdreich über die Jahre, der Unterbau verliert seine Tragfähigkeit und die Fläche sackt ab. Bei ein bis drei Euro je Quadratmeter ist es der günstigste Schutz im ganzen Aufbau.' },
      { q: 'Was kostet eine gepflasterte Terrasse?', a: 'Material liegt bei Betonpflaster bei 20 bis 45 Euro je Quadratmeter, bei Naturstein bei 50 bis 120, der Unterbau bei 15 bis 30. Komplett vom Fachbetrieb kommst du auf 90 bis 180 Euro je Quadratmeter, in Eigenleistung etwa auf die Hälfte.' },
      { q: 'Wie rechne ich Kubikmeter in Tonnen um?', a: 'Mit einer Schüttdichte von etwa 1,8 t/m³ für Schotter und Splitt. 6,25 Kubikmeter Schotter entsprechen also rund 11,3 Tonnen – Baustoffhändler rechnen nach Gewicht ab.' },
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
      <h2>Wie der Rasen-Rechner rechnet</h2>
      <p>Aus der Fläche und der Saatmenge je Quadratmeter ergibt sich der Saatgutbedarf, aus der Düngermenge entsprechend die Düngermenge. Zusätzlich rechnet der Rechner aus, wie viel Wasser die Fläche in der Anwachsphase braucht – der Posten, den die meisten unterschätzen.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Saatmenge:</strong> Für eine Neuanlage 25 bis 30 Gramm je Quadratmeter, für eine Nachsaat 15 bis 20. Mehr zu säen bringt keinen dichteren Rasen – die Gräser konkurrieren dann untereinander und bleiben schwach.</p>
      <p><strong>Düngermenge:</strong> Übliche Langzeitdünger werden mit 25 bis 35 Gramm je Quadratmeter ausgebracht. Die genaue Angabe steht auf der Packung und hängt vom Nährstoffgehalt ab.</p>

      <h3>Das richtige Saatgut</h3>
      <p>Achte auf die Bezeichnung „Regel-Saatgut-Mischung", kurz RSM. Diese Mischungen sind in ihrer Zusammensetzung definiert und enthalten Sorten, die für die jeweilige Nutzung geprüft sind. Billiges Saatgut ohne RSM-Angabe enthält oft Futtergräser, die schnell keimen und einen guten Start vortäuschen, aber grob wachsen und nach zwei Jahren lückig werden.</p>
      <p>Sport- und Spielrasen ist die richtige Wahl für den Familiengarten, Schattenrasen für Flächen unter Bäumen ab etwa drei Sonnenstunden, Zierrasen nur für rein optische Flächen ohne Belastung. In trockenen Lagen sind Mischungen mit Rohrschwingel im Vorteil, weil sie tiefer wurzeln.</p>

      <h3>Der richtige Zeitpunkt</h3>
      <p>Es gibt zwei gute Fenster: Mitte April bis Anfang Juni und Mitte August bis Ende September. Das zweite ist meist das bessere, weil der Boden am wärmsten ist, die Verdunstung zurückgeht und zuverlässiger Regen fällt. Entscheidend ist die Bodentemperatur, nicht das Datum – Rasensamen keimen ab etwa 8 bis 10 Grad. Vermeide die Aussaat im Hochsommer: Bei 30 Grad müsstest du zwei- bis dreimal täglich wässern, und ein einziger vergessener Tag kostet die halbe Ansaat.</p>

      <h3>Vorbereitung und Aussaat</h3>
      <p>Entferne den alten Bewuchs vollständig und lockere den Boden auf 15 bis 20 Zentimeter. Bei schwerem Lehm arbeitest du Sand ein, bei reinem Sand Kompost, jeweils 3 bis 5 Liter je Quadratmeter. Lass die geebnete Fläche danach zwei bis drei Wochen ruhen, wenn die Zeit es zulässt: Der Boden setzt sich, und die ersten Unkräuter lassen sich noch abziehen. Dieser Schritt wird am häufigsten übersprungen und lohnt sich am meisten.</p>
      <p>Teile die Saatgutmenge in zwei Hälften und säe längs und quer aus – das verteilt gleichmäßiger als ein einzelner Durchgang. Harke die Saat nur 5 bis 10 Millimeter tief ein, denn Rasengräser sind Lichtkeimer, und walze danach an, damit die Körner Bodenkontakt haben.</p>

      <h3>Die ersten Wochen</h3>
      <p>Der Boden muss drei Wochen lang durchgehend feucht bleiben, nie oberflächlich abtrocknen. Bei warmem Wetter heißt das zwei bis drei kurze Wassergaben täglich. Die Keimung setzt je nach Art nach 7 bis 21 Tagen ein und geschieht ungleichmäßig – eine nach zehn Tagen fleckige Fläche ist normal. Mähe das erste Mal bei 8 bis 10 Zentimetern Höhe auf etwa 5 Zentimeter, mit scharfem Messer. Belastbar ist der Rasen erst nach rund drei Monaten.</p>
        `,
    faq: [
      { q: 'Wie viel Saatgut brauche ich pro Quadratmeter?', a: 'Für eine Neuanlage 25 bis 30 Gramm, für eine Nachsaat 15 bis 20 Gramm je Quadratmeter. Mehr zu säen bringt keinen dichteren Rasen, weil die Gräser dann untereinander konkurrieren.' },
      { q: 'Wann ist der beste Zeitpunkt für die Aussaat?', a: 'Mitte April bis Anfang Juni oder Mitte August bis Ende September. Das Spätsommerfenster ist meist besser, weil der Boden warm ist und die Verdunstung zurückgeht. Entscheidend ist eine Bodentemperatur von mindestens 8 bis 10 Grad.' },
      { q: 'Wie oft muss ich den neuen Rasen wässern?', a: 'In den ersten drei Wochen täglich, bei warmem Wetter zwei- bis dreimal kurz. Der Boden darf nie oberflächlich abtrocknen. Später reicht seltener, dafür durchdringend zu wässern, damit die Wurzeln in die Tiefe gehen.' },
      { q: 'Wann darf ich das erste Mal mähen?', a: 'Wenn die Halme 8 bis 10 cm hoch sind, dann auf etwa 5 cm kürzen. Das Messer muss scharf sein, sonst reißt es die jungen Pflanzen samt Wurzel heraus. Der erste Schnitt fördert die Bestockung, der Rasen wird danach dichter.' },
      { q: 'Was bedeutet RSM beim Saatgut?', a: 'Regel-Saatgut-Mischung. Diese Mischungen haben eine definierte Zusammensetzung aus geprüften Sorten. Saatgut ohne RSM-Angabe enthält oft schnell keimende Futtergräser, die grob wachsen und nach zwei Jahren lückig werden.' },
      { q: 'Kann ich Löcher einfach nachsäen?', a: 'Ja. Lockere die Stelle oberflächlich, streue Saatgut mit 15 bis 20 Gramm je Quadratmeter aus, siebe etwas Erde darüber und halte die Stelle vier Wochen feucht. Nachsaat gelingt am besten im Spätsommer.' },
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
      <h2>Wie der Brennholz-Rechner rechnet</h2>
      <p>Aus dem Wärmebedarf und dem Wirkungsgrad des Ofens ergibt sich, wie viel Energie im Holz stecken muss. Geteilt durch den Heizwert je Raummeter erhältst du die benötigte Holzmenge, und mit dem Preis je Raummeter die Kosten für die Saison.</p>

      <h3>Raummeter, Schüttraummeter, Festmeter</h3>
      <p>Die drei Einheiten sind der häufigste Grund für Missverständnisse beim Kauf. Ein Festmeter ist ein Kubikmeter massives Holz ohne Zwischenräume. Ein Raummeter, auch Ster genannt, ist ein Kubikmeter gestapeltes Scheitholz und entspricht rund 0,7 Festmetern. Ein Schüttraummeter ist ein Kubikmeter lose geschüttetes Holz und entspricht nur etwa 0,4 Festmetern.</p>
      <p>Ein Schüttraummeter enthält also gut die Hälfte des Holzes eines Raummeters. Wenn ein Angebot mit einem Preis „pro Meter" wirbt, ohne die Einheit zu nennen, ist das der Punkt, an dem du nachfragen musst – der Unterschied beträgt fast 75 Prozent im Preis pro Kilowattstunde.</p>

      <h3>Heizwert nach Holzart</h3>
      <p>Buche, Eiche und Esche liefern lufttrocken jeweils rund 2.100 kWh je Raummeter, Birke etwa 1.900, Fichte nur rund 1.500. Nadelholz ist pro Raummeter deutlich schwächer, oft aber auch spürbar billiger – wer nach Kilowattstunde rechnet statt nach Raummeter, stellt manchmal fest, dass Fichte gar nicht schlechter abschneidet. Für Kaminöfen mit Sichtscheibe ist Laubholz trotzdem angenehmer, weil es weniger rußt und nicht so stark knallt.</p>

      <h3>Restfeuchte: der Faktor, der alles bestimmt</h3>
      <p>Frisch geschlagenes Holz hat 50 bis 60 Prozent Wassergehalt. Zugelassen sind höchstens 25 Prozent, sinnvoll sind 15 bis 18. Bei 50 Prozent Feuchte geht rund ein Drittel der Energie allein dafür drauf, das Wasser zu verdampfen. Nasses Holz liefert also weniger Wärme, verrußt die Scheibe, versottet den Schornstein und erhöht die Feinstaubemission deutlich. Ein Feuchtemessgerät kostet 20 bis 30 Euro; miss an einer frisch gespaltenen Fläche in der Mitte des Scheits, nicht außen.</p>

      <h3>Richtig lagern</h3>
      <p>Das Holz braucht Sonne, Wind und einen Regenschutz von oben. Stapel es an der Südwestseite mit zehn Zentimetern Abstand zur Wand, auf Paletten oder Kanthölzern, und decke nur die Oberseite ab. Eine seitlich heruntergezogene Plane ist der klassische Fehler: Sie hält die Feuchtigkeit im Stapel, und das Holz schimmelt statt zu trocknen.</p>
      <p>Die Trockenzeit beträgt bei Buche und Esche ein bis zwei Jahre, bei Eiche zwei bis drei, bei Nadelholz oft eine Saison. Gespalten trocknet Holz deutlich schneller – spalte deshalb, bevor du stapelst. Wer regelmäßig heizt, führt zwei bis drei Stapel nebeneinander: einen für die laufende Saison, einen für die nächste, einen frisch aufgefüllten.</p>
        `,
    faq: [
      { q: 'Was ist der Unterschied zwischen Raummeter und Schüttraummeter?', a: 'Ein Raummeter ist gestapeltes Holz und entspricht etwa 0,7 Festmetern, ein Schüttraummeter ist lose geschüttet und entspricht nur rund 0,4. Ein Schüttraummeter enthält also gut die Hälfte der Holzmenge eines Raummeters – frag beim Kauf immer nach der Einheit.' },
      { q: 'Wie viel Brennholz brauche ich pro Winter?', a: 'Für einen Kaminofen als Zusatzheizung im Wohnzimmer sind zwei bis vier Raummeter pro Saison üblich. Wer ausschließlich mit Holz heizt, liegt eher bei acht bis fünfzehn.' },
      { q: 'Wie feucht darf Brennholz sein?', a: 'Höchstens 25 Prozent Restfeuchte, sinnvoll sind 15 bis 18. Zu feuchtes Holz zu verbrennen ist nach der Bundes-Immissionsschutzverordnung nicht zulässig, liefert weniger Wärme und versottet den Schornstein.' },
      { q: 'Wie lange muss Holz trocknen?', a: 'Buche und Esche ein bis zwei Jahre, Eiche zwei bis drei, Nadelholz oft eine Saison. Gespalten trocknet Holz deutlich schneller als in Rundlingen, deshalb vor dem Stapeln spalten.' },
      { q: 'Welche Holzart ist die beste?', a: 'Buche gilt als Standard, weil sie lange Glut und eine ruhige Flamme liefert. Nach Kilowattstunde gerechnet kann günstiges Nadelholz aber gleichwertig sein. Für Öfen mit Sichtscheibe ist Laubholz angenehmer, weil es weniger rußt.' },
      { q: 'Wie zünde ich richtig an?', a: 'Von oben: große Scheite unten, kleineres Holz darüber, Anzünder ganz oben. Das Feuer brennt nach unten durch, die entweichenden Gase ziehen durch die heiße Flammenzone und verbrennen mit. Das senkt Emissionen und Rußbildung deutlich gegenüber dem Anzünden von unten.' },
    ],
    affiliate: {
      heading: 'Brennholz & Kaminzubehör',
      text: 'Ofenfertiges Brennholz, Feuchtemessgeräte und Kaminzubehör – bequem geliefert.',
      cta: 'Angebote ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🔋 Batteriespeicher ───────────────────────────────────────────────────
  {
    slug: 'batteriespeicher',
    category: 'Energie',
    icon: '🔋',
    title: 'Batteriespeicher-Rechner',
    cardTitle: 'Batteriespeicher-Rechner',
    tagline: 'Lohnt sich ein Speicher für deine PV-Anlage?',
    heroSubtitle: 'Wie viel zusätzlichen Eigenverbrauch bringt ein Batteriespeicher – und wann hat er sich bezahlt gemacht?',
    seoTitle: 'Batteriespeicher-Rechner 2026 – Amortisation berechnen',
    seoDescription: 'Lohnt sich ein Batteriespeicher für deine Solaranlage? Berechne zusätzlichen Eigenverbrauch, Ersparnis und Amortisationszeit – kostenlos und sofort.',
    inputs: [
      { id: 'jahresertrag', label: 'PV-Jahresertrag', icon: '☀️', min: 2000, max: 20000, step: 100, default: 8000, unit: 'kWh/a', decimals: 0 },
      { id: 'eigenverbrauchOhne', label: 'Eigenverbr. ohne Speicher', icon: '🏠', min: 15, max: 50, step: 1, default: 30, unit: '%', decimals: 0 },
      { id: 'eigenverbrauchMit', label: 'Eigenverbr. mit Speicher', icon: '🔋', min: 40, max: 90, step: 1, default: 60, unit: '%', decimals: 0 },
      { id: 'kosten', label: 'Investition Speicher', icon: '💰', min: 2000, max: 15000, step: 250, default: 6000, unit: '€', decimals: 0 },
      { id: 'strompreis', label: 'Strompreis', icon: '⚡', min: 20, max: 60, step: 0.5, default: 33, unit: 'ct/kWh', decimals: 1 },
    ],
    outputs: [
      { id: 'ersparnis', label: 'Zusatz-Ersparnis/Jahr', money: true, primary: true },
      { id: 'zusatzKwh', label: 'Zusätzl. Eigenverbrauch', unit: 'kWh', decimals: 0 },
      { id: 'amortisation', label: 'Amortisation', unit: 'Jahre', decimals: 1 },
      { id: 'gewinn10', label: 'Gewinn in 10 J.', money: true },
    ],
    note: 'Vereinfachte Modellrechnung. Reale Eigenverbrauchsquoten hängen stark von Speichergröße, Verbrauchsprofil und Lastmanagement ab.',
    content: `
      <h2>Wie der Batteriespeicher-Rechner rechnet</h2>
      <p>Der Rechner vergleicht zwei Eigenverbrauchsquoten: die ohne Speicher und die mit. Die Differenz, angewendet auf deinen Jahresertrag, ergibt die Strommenge, die du zusätzlich selbst nutzt statt sie einzuspeisen. Diese Menge multipliziert mit deinem Strompreis ist die jährliche Zusatzersparnis, aus der sich die Amortisation ergibt.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Jahresertrag:</strong> Wenn die Anlage schon läuft, nimm den Wert aus dem Wechselrichter-Portal. Bei einer geplanten Anlage rechnest du Anlagenleistung mal spezifischem Ertrag, also etwa 8 kWp mal 980 kWh/kWp.</p>
      <p><strong>Eigenverbrauch ohne Speicher:</strong> In einem normalen Haushalt 25 bis 35 Prozent. Mit Wärmepumpe, E-Auto oder jemandem, der tagsüber zu Hause ist, kann die Quote schon ohne Speicher bei 40 bis 55 Prozent liegen.</p>
      <p><strong>Eigenverbrauch mit Speicher:</strong> Realistisch sind 55 bis 75 Prozent. Die oft beworbenen 80 Prozent und mehr erreicht man nur mit sehr großem Speicher, und die letzten Prozentpunkte kosten überproportional viel Kapazität.</p>
      <p><strong>Kosten:</strong> Aktuell 500 bis 900 Euro pro nutzbarer Kilowattstunde, installiert. Achte auf die nutzbare, nicht die Bruttokapazität – ein als 10 kWh verkaufter Speicher hat je nach Hersteller 8,5 bis 9,5 kWh nutzbar. Wird der Speicher nachgerüstet statt gemeinsam mit der Anlage installiert, kommen 500 bis 1.500 Euro Mehrkosten dazu.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Die statische Amortisation, die der Rechner ausgibt, liegt bei üblichen Preisen zwischen acht und zwölf Jahren. Zwei Effekte verschlechtern sie in der Praxis: Bei jedem Lade- und Entladevorgang gehen 8 bis 12 Prozent verloren, und die Kapazität nimmt über die Jahre ab – die meisten Hersteller garantieren nach zehn Jahren noch 70 bis 80 Prozent. Rechne deshalb eher mit dem oberen Ende der ausgegebenen Spanne, bei einer erwarteten Lebensdauer von 12 bis 20 Jahren.</p>
      <p>Ein steigender Strompreis verbessert das Ergebnis unmittelbar, weil der Wert jeder gespeicherten Kilowattstunde mitsteigt.</p>

      <h3>Die richtige Größe</h3>
      <p>Als Faustregel passt etwa 1 kWh nutzbare Kapazität pro 1.000 kWh Jahresstromverbrauch, alternativ 1 kWh je installiertem kWp. Größer ist hier nicht besser: Ein überdimensionierter Speicher wird im Winterhalbjahr nie voll und steht die meiste Zeit halbleer herum. Am besten arbeitet ein Speicher, der im Sommer täglich einmal komplett durchgeladen und entladen wird.</p>

      <h3>Was du vorher billiger haben kannst</h3>
      <p>Bevor du einen Speicher kaufst, hebe den Eigenverbrauch mit den günstigen Mitteln: Spül- und Waschmaschine per Zeitvorwahl in die Mittagsstunden legen, einen Heizstab für den Warmwasserspeicher einbauen, das E-Auto tagsüber laden. Diese Maßnahmen kosten zusammen wenige hundert Euro und heben die Quote oft um zehn Prozentpunkte. Erst wenn danach immer noch viel Überschuss übrig bleibt, ist der Speicher an der Reihe.</p>
        `,
    faq: [
      { q: 'Wie groß sollte der Speicher sein?', a: 'Als Faustregel etwa 1 kWh nutzbare Kapazität pro 1.000 kWh Jahresverbrauch oder pro installiertem kWp. Ein Haushalt mit 5.000 kWh und 8 kWp landet damit bei 5 bis 8 kWh.' },
      { q: 'Wie lange hält ein Batteriespeicher?', a: 'Lithium-Eisenphosphat-Speicher sind auf 6.000 bis 10.000 Vollzyklen ausgelegt, was bei etwa 250 Zyklen im Jahr rechnerisch weit über 20 Jahre ergibt. Die Herstellergarantien laufen meist zehn Jahre und sichern eine Restkapazität von 70 bis 80 Prozent zu.' },
      { q: 'Kann ich bei Stromausfall weiter Strom nutzen?', a: 'Nur mit Not- oder Ersatzstromfunktion, die extra kostet und nicht in jedem Speicher steckt. Notstrom versorgt eine einzelne Steckdose nach kurzer Unterbrechung, Ersatzstrom das ganze Haus nahezu unterbrechungsfrei. Für die meisten Haushalte in Deutschland ist das eher ein Komfortmerkmal als eine Notwendigkeit.' },
      { q: 'Lohnt sich Nachrüsten oder gleich mitkaufen?', a: 'Gemeinsam mit der PV-Anlage ist es günstiger, weil der Elektriker ohnehin da ist und nur ein Hybridwechselrichter statt zweier Geräte nötig ist. Nachrüsten kostet je nach Anlage 500 bis 1.500 Euro Aufschlag.' },
      { q: 'Was bringt ein dynamischer Stromtarif zusätzlich?', a: 'Wer den Speicher nachts zu niedrigen Börsenpreisen laden und in der teuren Abendspitze entladen kann, holt zusätzlich etwas heraus. Voraussetzung sind ein intelligentes Messsystem und ein Speicher, der sich extern steuern lässt.' },
      { q: 'Warum lohnt sich der Speicher bei Wärmepumpe oft weniger?', a: 'Weil dann schon ohne Speicher viel Solarstrom direkt verbraucht wird. Der Speicher kann nur den Überschuss auffangen, der übrig bleibt – ist der klein, ist auch der Nutzen klein.' },
    ],
    affiliate: {
      heading: 'Batteriespeicher-Angebote vergleichen',
      text: 'Hol dir unverbindliche Angebote für Batteriespeicher passend zu deiner PV-Anlage.',
      cta: 'Angebote vergleichen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── ❄️ Klimaanlage ────────────────────────────────────────────────────────
  {
    slug: 'klimaanlage-stromkosten',
    category: 'Energie',
    icon: '❄️',
    title: 'Klimaanlagen-Stromkosten-Rechner',
    cardTitle: 'Klimaanlagen-Rechner',
    tagline: 'Was kostet Kühlen im Sommer wirklich?',
    heroSubtitle: 'Wie viel Strom verbraucht deine Klimaanlage – und was kostet der Kühlbetrieb pro Saison, Tag und Stunde?',
    seoTitle: 'Klimaanlage Stromkosten-Rechner 2026 – Kühlkosten berechnen',
    seoDescription: 'Stromverbrauch und Kosten deiner Klimaanlage berechnen: pro Jahr, Tag und Stunde. Kostenloser Rechner für Split-Klimageräte und mobile Klimaanlagen.',
    inputs: [
      { id: 'leistung', label: 'Kühlleistung', icon: '❄️', min: 1, max: 8, step: 0.5, default: 2.5, unit: 'kW', decimals: 1 },
      { id: 'eer', label: 'Effizienz (EER)', icon: '⚙️', min: 2.5, max: 6, step: 0.1, default: 3.5, unit: '', decimals: 1 },
      { id: 'stundenProTag', label: 'Betrieb pro Tag', icon: '⏱️', min: 1, max: 24, step: 1, default: 6, unit: 'h', decimals: 0 },
      { id: 'tageProJahr', label: 'Kühltage/Jahr', icon: '📅', min: 10, max: 180, step: 5, default: 90, unit: 'Tage', decimals: 0 },
      { id: 'strompreis', label: 'Strompreis', icon: '⚡', min: 20, max: 60, step: 0.5, default: 33, unit: 'ct/kWh', decimals: 1 },
    ],
    outputs: [
      { id: 'kosten', label: 'Kosten pro Saison', money: true, primary: true },
      { id: 'verbrauch', label: 'Stromverbrauch', unit: 'kWh', decimals: 0 },
      { id: 'kostenProTag', label: 'Kosten pro Tag', money: true },
    ],
    note: 'EER (Energy Efficiency Ratio) gibt an, wie viel Kühlleistung pro eingesetzter Kilowattstunde Strom erzeugt wird. Werte laut Typenschild/Datenblatt des Geräts verwenden für genauere Ergebnisse.',
    content: `
      <h2>Wie der Klimaanlagen-Rechner rechnet</h2>
      <p>Die Kühlleistung auf dem Typenschild ist nicht der Stromverbrauch. Der Rechner teilt die Kühlleistung durch die Energieeffizienz und erhält so die elektrische Leistungsaufnahme. Multipliziert mit Laufzeit und Strompreis ergibt das die Kosten pro Tag und für die Saison.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Kühlleistung:</strong> Sie steht in Kilowatt auf dem Typenschild. Als Anhaltspunkt für die nötige Größe rechnet man bei normal gedämmten Räumen mit 60 bis 100 Watt je Quadratmeter, bei einem Dachgeschoss mit großen Südfenstern eher mit 120 bis 150. Ein 25-Quadratmeter-Wohnzimmer braucht also typischerweise 2,0 bis 2,5 kW.</p>
      <p><strong>Effizienz:</strong> Der Regler meint den SEER, die saisonale Leistungszahl beim Kühlen. Moderne Split-Geräte mit Inverter erreichen 6,0 bis 8,5, Multisplit-Anlagen 5,5 bis 7,0. Mobile Monoblock-Geräte mit Abluftschlauch kommen nur auf 2,4 bis 3,0, weil durch das gekippte Fenster ständig warme Luft nachströmt.</p>
      <p><strong>Laufzeit:</strong> Schätze realistisch. Die meisten Geräte laufen nicht durchgehend, sondern an 40 bis 80 Tagen im Jahr für vier bis sechs Stunden. Zwei heiße Wochen im Juli plus einzelne Tage im Juni und August sind das übliche Muster in Deutschland.</p>

      <h3>Wie du das Ergebnis liest</h3>
      <p>Ein Splitgerät mit 3,5 kW Kühlleistung und SEER 6,5 kommt bei 60 Tagen zu je 5 Stunden auf rund 57 Euro für die Saison. Dasselbe Nutzungsprofil mit einem Monoblock bei SEER 2,6 kostet rund 141 Euro. Über fünf Sommer summiert sich der Unterschied auf etwa die Hälfte dessen, was die Installation eines Splitgeräts kostet.</p>
      <p>Die Rechnung ist eher konservativ: Ein Inverter-Gerät läuft nach der ersten Abkühlphase auf Teillast und braucht dann oft nur ein Drittel der Nennaufnahme. Die tatsächlichen Kosten liegen deshalb häufig unter dem ausgegebenen Wert.</p>

      <h3>Wo du am meisten sparst</h3>
      <p>Jedes Grad Zieltemperatur zählt. Der Sprung von 26 auf 22 Grad kann den Verbrauch verdoppeln. Als Faustregel sollte die Innentemperatur höchstens sechs Grad unter der Außentemperatur liegen – das ist auch angenehmer, weil der Temperaturschock beim Hinausgehen ausbleibt.</p>
      <p>Beschattung wirkt noch stärker und kostet keinen Strom. Außenliegende Rollläden oder Markisen halten die Wärme ab, bevor sie durch die Scheibe kommt; innenliegende Vorhänge helfen deutlich weniger. Bei einem Südfenster senkt außenliegender Sonnenschutz die Kühllast oft um ein Drittel. Nachts zu lüften und die Speichermasse des Gebäudes herunterzukühlen ist der dritte große Hebel.</p>
      <p>Reinige außerdem die Filter alle paar Wochen. Ein zugesetzter Filter senkt den Luftdurchsatz, das Gerät läuft länger und verbraucht mehr – das ist die häufigste Ursache für Geräte, die nach drei Jahren „nicht mehr richtig kühlen".</p>
        `,
    faq: [
      { q: 'Was kostet eine Klimaanlage im Sommer?', a: 'Ein Splitgerät mit 3,5 kW und SEER 6,5 kostet bei 60 Tagen zu je 5 Stunden rund 57 Euro für die Saison. Ein mobiles Monoblock-Gerät mit derselben Kühlleistung kommt bei gleicher Nutzung auf etwa 141 Euro.' },
      { q: 'Was bedeutet der SEER-Wert?', a: 'Der SEER ist die saisonale Leistungszahl beim Kühlen. Ein SEER von 6,0 heißt: Aus 1 kWh Strom entstehen 6 kWh Kühlleistung. Je höher der Wert, desto weniger Strom braucht das Gerät für dieselbe Kühlwirkung.' },
      { q: 'Split oder mobiles Gerät?', a: 'Ein Splitgerät ist etwa zweieinhalbmal effizienter, leiser und kühlt zuverlässiger, kostet aber 1.500 bis 3.000 Euro mit Montage durch einen Kältetechniker. Ein mobiles Gerät kostet 300 bis 700 Euro und ist sofort einsatzbereit, braucht aber ein offenes Fenster für den Abluftschlauch.' },
      { q: 'Wie groß muss die Anlage sein?', a: 'Rechne bei normal gedämmten Räumen mit 60 bis 100 Watt Kühlleistung je Quadratmeter, im Dachgeschoss mit großen Südfenstern mit 120 bis 150. Ein zu großes Gerät taktet und entfeuchtet schlechter, ein zu kleines läuft dauerhaft auf Volllast.' },
      { q: 'Kann eine Klimaanlage auch heizen?', a: 'Fast jedes moderne Splitgerät kann das. Technisch ist es dann eine kleine Luft-Luft-Wärmepumpe und erreicht in der Übergangszeit Arbeitszahlen um 4. Für ein einzelnes Zimmer im Oktober oder April ist das oft günstiger, als die Zentralheizung fürs ganze Haus hochzufahren.' },
      { q: 'Brauche ich für eine Splitanlage eine Genehmigung?', a: 'Als Mieter brauchst du die Zustimmung des Vermieters für die Außeneinheit, in einer Eigentümergemeinschaft einen Beschluss. Die Installation selbst darf nur ein zertifizierter Kältetechniker vornehmen, weil der Kältemittelkreislauf verbunden werden muss.' },
    ],
    affiliate: {
      heading: 'Klimageräte im Vergleich',
      text: 'Effiziente Split- und Monoblock-Klimaanlagen vergleichen und passendes Gerät finden.',
      cta: 'Geräte ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🎨 Streichen ──────────────────────────────────────────────────────────
  {
    slug: 'streichen-farbe',
    category: 'Haus',
    icon: '🎨',
    title: 'Farbrechner (Streichen)',
    cardTitle: 'Farbrechner',
    tagline: 'Wie viel Farbe brauchst du für dein Zimmer?',
    heroSubtitle: 'Gib die Maße deines Raums ein und erfahre, wie viel Farbe du für ein oder zwei Anstriche brauchst.',
    seoTitle: 'Farbrechner 2026 – Wandfarbe & Menge berechnen',
    seoDescription: 'Wandfarbe berechnen: Wie viel Liter Farbe brauchst du für dein Zimmer? Wandfläche, Farbmenge und Eimeranzahl kostenlos und sofort berechnen.',
    inputs: [
      { id: 'laenge', label: 'Raumlänge', icon: '📏', min: 1.5, max: 10, step: 0.1, default: 4, unit: 'm', decimals: 1 },
      { id: 'breite', label: 'Raumbreite', icon: '📐', min: 1.5, max: 10, step: 0.1, default: 3.5, unit: 'm', decimals: 1 },
      { id: 'hoehe', label: 'Raumhöhe', icon: '📶', min: 2, max: 4, step: 0.05, default: 2.5, unit: 'm', decimals: 2 },
      { id: 'oeffnungen', label: 'Fenster & Türen', icon: '🚪', min: 0, max: 15, step: 0.5, default: 4, unit: 'm²', decimals: 1 },
      { id: 'ergiebigkeit', label: 'Ergiebigkeit Farbe', icon: '🪣', min: 5, max: 14, step: 0.5, default: 8, unit: 'm²/L', decimals: 1 },
      { id: 'anstriche', label: 'Anzahl Anstriche', icon: '🔁', min: 1, max: 3, step: 1, default: 2, unit: '', decimals: 0 },
    ],
    outputs: [
      { id: 'farbmenge', label: 'Farbmenge gesamt', unit: 'L', decimals: 1, primary: true },
      { id: 'wandflaeche', label: 'Wandfläche', unit: 'm²', decimals: 1 },
      { id: 'eimer5L', label: 'Eimer (5 L)', unit: 'Stk', decimals: 0 },
      { id: 'farbmengeProAnstrich', label: 'Farbe je Anstrich', unit: 'L', decimals: 1 },
    ],
    note: 'Die Ergiebigkeit steht meist auf dem Farbeimer (typisch 6–10 m²/L). Raue oder saugfähige Untergründe verbrauchen mehr Farbe als glatte.',
    content: `
      <h2>Wie der Farbrechner rechnet</h2>
      <p>Aus Länge, Breite und Höhe ergibt sich die Wandfläche über den Raumumfang. Davon werden Fenster- und Türflächen abgezogen. Multipliziert mit der Zahl der Anstriche und geteilt durch die Ergiebigkeit erhältst du die Farbmenge in Litern und die Zahl der Gebinde.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Öffnungen:</strong> Zieh Fenster und Türen nur ab, wenn sie zusammen mehr als etwa 10 Prozent ausmachen. Eine einzelne Zimmertür kannst du ignorieren – der Verschnitt beim Streichen frisst diese Fläche ohnehin auf. Bei einer großen Fensterfront lohnt sich der Abzug dagegen.</p>
      <p><strong>Ergiebigkeit:</strong> Auf dem Eimer steht meist ein Wert zwischen 6 und 10 Quadratmetern je Liter, gemessen unter Idealbedingungen auf glattem, saugarmem Untergrund. In der Praxis rechne mit 7 Quadratmetern je Liter und Anstrich, auf Raufaser oder strukturiertem Putz eher mit 5 bis 6, weil die Struktur die Oberfläche vergrößert. Auf frischem, saugendem Gipsputz schluckt der erste Anstrich noch mehr; eine Grundierung ist hier deutlich billiger als Farbe.</p>
      <p><strong>Anstriche:</strong> Zwei sind der Normalfall. Einer reicht nur bei gleicher Farbe auf gleichmäßigem, hellem Untergrund. Bei einem Wechsel von dunkel auf hell brauchst du drei, manchmal vier.</p>

      <h3>Woran du gute Farbe erkennst</h3>
      <p>Zwei Kennwerte stehen auf jedem Eimer und sagen mehr als der Preis. Die Deckkraftklasse reicht von 1 bis 4; Klasse 1 bedeutet mindestens 99,5 Prozent Deckung bei der angegebenen Ergiebigkeit. Eine billige Farbe der Klasse 3 braucht so viele Anstriche, dass sie am Ende teurer kommt als eine gute Klasse-1-Farbe.</p>
      <p>Die Nassabriebklasse reicht ebenfalls von 1 bis 5 und beschreibt die Wischbeständigkeit. Klasse 1 ist scheuerbeständig und gehört in Küche, Bad und Flur, Klasse 2 ist waschbeständig und passt für Wohn- und Schlafräume, Klasse 3 ist für Kinderzimmer die falsche Wahl.</p>

      <h3>Die Reihenfolge beim Streichen</h3>
      <p>Klebe Sockelleisten, Schalter und Zargen mit Malerkrepp der niedrigeren Klebkraft ab, spachtele Löcher, schleife sie glatt und grundiere stark saugende oder fleckige Untergründe. Streiche zuerst die Decke, dann die Wände, damit heruntertropfende Deckenfarbe nicht stört.</p>
      <p>Arbeite bei jeder Fläche zuerst die Ecken und Kanten mit dem Pinsel vor und rolle die Fläche direkt anschließend, solange die Kanten noch nass sind – wer sie trocknen lässt, sieht später einen Rand. Streiche eine Wand immer in einem Zug fertig, denn Ansätze in der Mitte bleiben sichtbar. Zieh das Kreppband ab, solange die Farbe noch leicht feucht ist.</p>

      <h3>Häufige Fehler</h3>
      <p>Unter 10 Grad oder im Zug trocknet Farbe ungleichmäßig und wird fleckig. Zu dünn aufgetragene Farbe deckt nicht besser, sondern schlechter. Und wenn du abtönst, mische die gesamte benötigte Menge auf einmal an – zwei nachträglich angerührte Ansätze treffen den Ton nie exakt.</p>
        `,
    faq: [
      { q: 'Wie viel Farbe brauche ich pro Quadratmeter?', a: 'Rechne mit etwa einem Liter für 7 Quadratmeter und Anstrich. Auf Raufaser oder strukturiertem Putz eher 5 bis 6 Quadratmeter je Liter, weil die Struktur die Oberfläche vergrößert.' },
      { q: 'Reicht ein Anstrich?', a: 'Nur bei gleicher Farbe auf gleichmäßigem, hellem Untergrund. Der Normalfall sind zwei Anstriche, bei einem Wechsel von dunkel auf hell drei bis vier.' },
      { q: 'Was bedeutet die Nassabriebklasse?', a: 'Sie beschreibt die Wischbeständigkeit von 1 bis 5. Klasse 1 ist scheuerbeständig und gehört in Küche, Bad und Flur, Klasse 2 ist waschbeständig für Wohn- und Schlafräume, Klasse 3 ist nur bedingt feucht abwischbar.' },
      { q: 'Muss ich vorher grundieren?', a: 'Auf stark saugenden Untergründen wie frischem Gipsputz oder auf fleckigen Flächen ja. Grundierung ist deutlich billiger als Farbe und verhindert, dass der erste Anstrich komplett wegschlägt oder Flecken durchscheinen.' },
      { q: 'Wie ziehe ich Fenster und Türen ab?', a: 'Nur wenn sie zusammen mehr als etwa 10 Prozent der Wandfläche ausmachen. Eine einzelne Zimmertür kannst du ignorieren – diese Fläche geht ohnehin für Verschnitt und Nachbesserungen drauf.' },
      { q: 'Warum sieht meine Wand streifig aus?', a: 'Meist weil die Kanten schon trocken waren, als die Fläche gerollt wurde, oder weil eine Wand in zwei Etappen gestrichen wurde. Streiche jede Wand in einem Zug und rolle direkt an die noch nassen Pinselkanten heran.' },
    ],
    affiliate: {
      heading: 'Wandfarbe & Malerbedarf',
      text: 'Hochwertige Wandfarben, Grundierung und Malerzubehör für dein Projekt.',
      cta: 'Produkte ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🪚 Bodenbelag ─────────────────────────────────────────────────────────
  {
    slug: 'bodenbelag-laminat',
    category: 'Haus',
    icon: '🪚',
    title: 'Bodenbelag-Rechner (Laminat & Parkett)',
    cardTitle: 'Bodenbelag-Rechner',
    tagline: 'Wie viele Pakete Laminat oder Parkett brauchst du?',
    heroSubtitle: 'Gib die Raummaße ein und erfahre, wie viele Pakete Laminat oder Parkett du kaufen musst – inklusive Verschnitt und Kosten.',
    seoTitle: 'Bodenbelag-Rechner 2026 – Laminat & Parkett Bedarf berechnen',
    seoDescription: 'Laminat- oder Parkettbedarf berechnen: Wie viele Pakete brauchst du für deinen Raum, inklusive Verschnitt? Plus Kostenschätzung – kostenlos.',
    inputs: [
      { id: 'laenge', label: 'Raumlänge', icon: '📏', min: 1.5, max: 12, step: 0.1, default: 5, unit: 'm', decimals: 1 },
      { id: 'breite', label: 'Raumbreite', icon: '📐', min: 1.5, max: 12, step: 0.1, default: 4, unit: 'm', decimals: 1 },
      { id: 'verschnitt', label: 'Verschnitt', icon: '✂️', min: 5, max: 20, step: 1, default: 10, unit: '%', decimals: 0 },
      { id: 'paketgroesse', label: 'Paketgröße', icon: '📦', min: 1, max: 4, step: 0.1, default: 2.4, unit: 'm²', decimals: 1 },
      { id: 'preis', label: 'Preis pro m²', icon: '💶', min: 8, max: 80, step: 1, default: 25, unit: '€', decimals: 0 },
    ],
    outputs: [
      { id: 'pakete', label: 'Benötigte Pakete', unit: 'Stk', decimals: 0, primary: true },
      { id: 'flaeche', label: 'Raumfläche', unit: 'm²', decimals: 1 },
      { id: 'bedarf', label: 'Bedarf inkl. Verschnitt', unit: 'm²', decimals: 1 },
      { id: 'kosten', label: 'Materialkosten', money: true },
    ],
    note: 'Verschnitt hängt stark vom Verlegemuster ab: gerade Verlegung braucht weniger, diagonale oder Fischgrät-Muster deutlich mehr Reserve.',
    content: `
      <h2>Wie der Bodenbelag-Rechner rechnet</h2>
      <p>Aus Länge und Breite ergibt sich die Grundfläche. Darauf kommt ein Verschnittzuschlag, und das Ergebnis wird durch die Quadratmeterzahl je Paket geteilt und aufgerundet – Pakete werden nicht angebrochen verkauft. Mit dem Quadratmeterpreis ergeben sich die Materialkosten.</p>

      <h3>Der richtige Verschnittzuschlag</h3>
      <p>In einem rechteckigen Raum mit gerader Verlegung reichen 5 Prozent. Bei verwinkelten Räumen mit mehreren Türen sind 8 bis 10 angebracht, bei diagonaler Verlegung 12 bis 15 und bei Fischgrät oder anderen Mustern 15 bis 20.</p>
      <p>Kauf lieber ein Paket mehr als nötig. Ungeöffnete Pakete lassen sich meist zurückgeben, und ein Reservepaket im Keller rettet dich, wenn in fünf Jahren eine Diele beschädigt wird und das Dekor nicht mehr lieferbar ist.</p>

      <h3>Die richtige Nutzungsklasse</h3>
      <p>Die Nutzungsklasse steht auf jeder Packung und ist die wichtigste Kennzahl beim Kauf. Klasse 21 bis 23 bezeichnet den Wohnbereich von mäßig bis stark beansprucht, Klasse 31 bis 34 den Gewerbebereich. Für ein Schlafzimmer reicht 21, für einen Flur oder ein Wohnzimmer mit Hund solltest du mindestens 23 nehmen, besser 31 oder 32. Der Aufpreis ist gering, der Unterschied in der Lebensdauer erheblich.</p>
      <p>Bei Parkett zählt statt der Nutzungsklasse die Nutzschichtdicke. Unter 2,5 Millimetern lässt sich der Boden nicht mehr abschleifen, ab 3,5 Millimetern sind zwei bis drei Renovierungszyklen möglich. Das ist der eigentliche Unterschied zwischen Fertigparkett für 40 und für 90 Euro je Quadratmeter.</p>

      <h3>Untergrund und Unterlage</h3>
      <p>Der Untergrund muss eben und trocken sein; zulässig sind meist 3 Millimeter Unebenheit auf 2 Meter Länge, gemessen mit einer Richtlatte. Größere Wellen gleichst du mit Ausgleichsmasse aus – auf welligem Untergrund arbeiten die Klickverbindungen und knacken nach wenigen Monaten.</p>
      <p>Auf Estrich gehört immer eine Dampfbremsfolie darunter, mit 20 Zentimetern Überlappung und verklebten Stößen. Bei Fußbodenheizung achte auf den Wärmedurchlasswiderstand: Er sollte inklusive Bodenbelag unter 0,15 m²K/W bleiben, sonst heizt du gegen die Dämmung an.</p>

      <h3>Dehnungsfuge und Verlegung</h3>
      <p>Lass rundum mindestens 10 bis 15 Millimeter Abstand zu allen festen Bauteilen. Bei Flächen über 8 Meter Länge brauchst du zusätzlich eine Dehnungsfuge oder ein Übergangsprofil. Ein Boden ohne ausreichende Randfuge wölbt sich im ersten feuchten Sommer auf.</p>
      <p>Lagere die Pakete 48 Stunden flach und ungeöffnet im Verlegeraum. Verlege längs zum Lichteinfall, versetze die Stöße benachbarter Reihen um mindestens 30 bis 40 Zentimeter und nutze den Verschnitt vom Reihenende als Anfangsstück der nächsten Reihe, sofern er länger als 30 Zentimeter ist. Türzargen werden nicht ausgeschnitten, sondern mit einer Zargensäge auf Höhe von Diele plus Unterlage unterschnitten.</p>
        `,
    faq: [
      { q: 'Wie viel Verschnitt soll ich einplanen?', a: '5 Prozent bei rechteckigen Räumen und gerader Verlegung, 8 bis 10 bei verwinkelten Räumen, 12 bis 15 bei diagonaler Verlegung und bis zu 20 bei Fischgrät.' },
      { q: 'Welche Nutzungsklasse brauche ich?', a: 'Für Schlafzimmer reicht 21, für Wohnzimmer und Flur mindestens 23, besser 31 oder 32. Der Aufpreis ist gering, die Lebensdauer aber deutlich höher.' },
      { q: 'Wie groß muss die Dehnungsfuge sein?', a: 'Mindestens 10 bis 15 mm rundum zu allen festen Bauteilen. Bei Flächen über 8 Meter Länge kommt eine zusätzliche Fuge oder ein Übergangsprofil dazu.' },
      { q: 'Brauche ich eine Dampfbremse?', a: 'Auf mineralischen Untergründen wie Estrich immer, mit 20 cm Überlappung und verklebten Stößen. Restfeuchte aus dem Estrich zerstört sonst die Trägerplatte von unten.' },
      { q: 'Kann ich Laminat auf Fußbodenheizung verlegen?', a: 'Ja, wenn der Hersteller es freigibt. Achte darauf, dass Bodenbelag und Unterlage zusammen unter 0,15 m²K/W Wärmedurchlasswiderstand bleiben, sonst arbeitet die Heizung gegen die Dämmung.' },
      { q: 'Wie lange muss das Material akklimatisieren?', a: '48 Stunden flach liegend und ungeöffnet im Verlegeraum bei normaler Raumtemperatur. So nimmt es die Raumfeuchte an, bevor es fixiert wird.' },
    ],
    affiliate: {
      heading: 'Laminat & Parkett im Vergleich',
      text: 'Laminat, Vinyl und Parkett vergleichen und passendes Zubehör (Trittschalldämmung, Sockelleisten) finden.',
      cta: 'Böden ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── 🏊 Pool ───────────────────────────────────────────────────────────────
  {
    slug: 'pool-wasser',
    category: 'Garten',
    icon: '🏊',
    title: 'Pool-Rechner',
    cardTitle: 'Pool-Rechner',
    tagline: 'Wasservolumen & Nachfüllkosten deines Pools.',
    heroSubtitle: 'Wie viel Wasser fasst dein Pool – und was kostet das jährliche Nachfüllen durch Verdunstung und Rückspülung?',
    seoTitle: 'Pool-Rechner 2026 – Wasservolumen & Kosten berechnen',
    seoDescription: 'Pool-Wasservolumen berechnen sowie jährliche Nachfüllmenge und Wasserkosten durch Verdunstung und Filterrückspülung – kostenlos und sofort.',
    inputs: [
      { id: 'laenge', label: 'Poollänge', icon: '📏', min: 2, max: 15, step: 0.25, default: 6, unit: 'm', decimals: 2 },
      { id: 'breite', label: 'Poolbreite', icon: '📐', min: 1, max: 8, step: 0.25, default: 3, unit: 'm', decimals: 2 },
      { id: 'tiefe', label: 'Wassertiefe', icon: '📉', min: 0.5, max: 2.5, step: 0.05, default: 1.4, unit: 'm', decimals: 2 },
      { id: 'wasserwechsel', label: 'Nachfüllanteil/Jahr', icon: '💧', min: 10, max: 60, step: 5, default: 30, unit: '%', decimals: 0 },
      { id: 'wasserpreis', label: 'Wasserpreis', icon: '💶', min: 2, max: 7, step: 0.1, default: 4, unit: '€/m³', decimals: 1 },
    ],
    outputs: [
      { id: 'volumenL', label: 'Wasservolumen', unit: 'L', decimals: 0, primary: true },
      { id: 'volumenM3', label: 'Volumen', unit: 'm³', decimals: 1 },
      { id: 'nachfuellL', label: 'Nachfüllmenge/Jahr', unit: 'L', decimals: 0 },
      { id: 'wasserkosten', label: 'Wasserkosten/Jahr', money: true },
    ],
    note: 'Der Nachfüllanteil hängt von Standort (Sonne/Wind), Abdeckung und Filtertechnik ab. Ohne Abdeckung verdunstet deutlich mehr Wasser als mit.',
    content: `
      <h2>Wie der Pool-Rechner rechnet</h2>
      <p>Aus Länge, Breite und Wassertiefe ergibt sich das Volumen in Litern und Kubikmetern. Dazu kommt die Nachfüllmenge, die über die Saison durch Verdunstung und Rückspülen anfällt. Mit dem Wasserpreis ergeben sich daraus die Wasserkosten.</p>

      <h3>Die richtigen Werte für die Regler</h3>
      <p><strong>Tiefe:</strong> Gemeint ist der Wasserstand, nicht die Beckentiefe. Bis zum Rand wird nie gefüllt, üblicherweise bleiben 10 bis 15 Zentimeter frei. Bei ovalen oder achteckigen Becken kommst du mit Länge mal Breite mal Tiefe mal 0,85 nah genug heran, bei Rundbecken mit Radius zum Quadrat mal Pi mal Tiefe.</p>
      <p><strong>Wasserpreis:</strong> Inklusive Abwasserentgelt liegt er je nach Kommune bei 3,50 bis 6 Euro je Kubikmeter. Hier lohnt ein Anruf beim Versorger: Viele Kommunen erlassen das Schmutzwasserentgelt für Poolfüllungen, weil das Wasser nicht in die Kanalisation geht. Manche verlangen dafür einen Gartenwasserzähler, andere akzeptieren eine formlose Meldung mit Zählerstand – das halbiert die Kosten oft.</p>

      <h3>Verdunstung: der laufende Posten</h3>
      <p>Ein offener Pool verliert an einem warmen Sommertag 3 bis 7 Millimeter Wasserhöhe, an heißen windigen Tagen bis zu 10. Bei 20 Quadratmetern Wasserfläche sind das 60 bis 200 Liter täglich und über eine Saison 7 bis 20 Kubikmeter.</p>
      <p>Eine Abdeckung reduziert die Verdunstung um 80 bis 95 Prozent. Eine einfache Solarfolie kostet 50 bis 150 Euro und ist damit die Maßnahme mit dem besten Verhältnis von Kosten zu Wirkung. Sie hält zusätzlich die Wärme über Nacht im Becken – 2 bis 4 Grad Unterschied sind üblich – und hält Laub und Insekten draußen. Der zweite Verlustpfad ist das Rückspülen des Sandfilters mit 200 bis 600 Litern je Vorgang, üblicherweise einmal wöchentlich.</p>

      <h3>Was neben dem Wasser kostet</h3>
      <p>Die Filterpumpe ist bei den meisten Pools der größte laufende Kostenblock. Eine Einstufenpumpe zieht 400 bis 900 Watt; bei 8 Stunden täglich über 150 Tage sind das rund 250 Euro im Jahr. Eine drehzahlgeregelte Pumpe kommt oft mit einem Drittel davon aus und amortisiert ihren Aufpreis in zwei bis drei Saisons.</p>
      <p>Als Faustregel soll der Wasserinhalt zweimal täglich umgewälzt werden. Ein 20-Kubikmeter-Pool braucht also 40 Kubikmeter Umwälzleistung – bei einer Pumpe mit 8 m³/h sind das 5 Stunden, nicht die oft pauschal empfohlenen 8. Die Laufzeit an der tatsächlichen Pumpenleistung auszurichten spart direkt Geld.</p>
      <p>Beim Heizen wird es teuer: Einen 20-Kubikmeter-Pool um ein Grad zu erwärmen braucht rund 23 Kilowattstunden. Mit einem Heizstab kostet einmal Aufheizen von 18 auf 26 Grad etwa 65 Euro. Eine Pool-Wärmepumpe mit Arbeitszahlen von 4 bis 6 senkt das auf ein Viertel bis ein Sechstel. Am günstigsten ist eine Solarabsorbermatte, die nur die ohnehin laufende Filterpumpe braucht und in der Hauptsaison 3 bis 6 Grad bringt.</p>
        `,
    faq: [
      { q: 'Wie berechne ich das Poolvolumen?', a: 'Bei Rechteckbecken Länge mal Breite mal Wasserstand, bei Rundbecken Radius zum Quadrat mal Pi mal Wasserstand, bei ovalen Formen Länge mal Breite mal Tiefe mal 0,85. Wichtig ist der Wasserstand, nicht die Beckentiefe – oben bleiben 10 bis 15 cm frei.' },
      { q: 'Wie viel Wasser verdunstet pro Tag?', a: '3 bis 7 mm Wasserhöhe an einem warmen Tag, bis zu 10 mm bei Hitze und Wind. Bei 20 Quadratmetern Wasserfläche sind das 60 bis 200 Liter täglich.' },
      { q: 'Lohnt sich eine Poolabdeckung?', a: 'Sehr. Sie senkt die Verdunstung um 80 bis 95 Prozent, hält 2 bis 4 Grad Wärme über Nacht im Becken und hält Laub draußen. Eine Solarfolie kostet 50 bis 150 Euro und ist die wirksamste Einzelmaßnahme am Pool.' },
      { q: 'Muss ich das Poolwasser jährlich wechseln?', a: 'Nein. Bei guter Wasserpflege bleibt eine Füllung mehrere Jahre im Becken; nachgefüllt wird nur, was verdunstet und beim Rückspülen verloren geht. Ein kompletter Wechsel ist nur nötig, wenn die Wasserchemie außer Kontrolle geraten ist.' },
      { q: 'Wie lange muss die Filterpumpe laufen?', a: 'So lange, dass der Wasserinhalt zweimal täglich umgewälzt wird. Bei 20 Kubikmetern und einer 8-m³/h-Pumpe sind das 5 Stunden. Die pauschale Empfehlung von 8 Stunden ist bei leistungsfähigen Pumpen unnötig teuer.' },
      { q: 'Kann ich das Abwasserentgelt sparen?', a: 'In vielen Kommunen ja, weil Poolwasser nicht in die Kanalisation geht. Manche verlangen dafür einen separaten Gartenwasserzähler, andere eine formlose Meldung mit Zählerstand. Frag vor der Befüllung beim Versorger nach.' },
    ],
    affiliate: {
      heading: 'Pool-Zubehör & Pflege',
      text: 'Abdeckungen, Filtertechnik und Pflegeprodukte für sauberes, klares Poolwasser.',
      cta: 'Zubehör ansehen',
      href: '#',
    },
    updated: '2026-07-22',
  },

  // ── ♻️ Kompost ────────────────────────────────────────────────────────────
  {
    slug: 'kompost',
    category: 'Garten',
    icon: '♻️',
    title: 'Kompost-Rechner',
    cardTitle: 'Kompost-Rechner',
    tagline: 'Wie viel Kompost entsteht aus deinen Gartenabfällen?',
    heroSubtitle: 'Wie viel fertiger Kompost entsteht aus deinen Grünabfällen – und wie viel sparst du gegenüber gekaufter Komposterde?',
    seoTitle: 'Kompost-Rechner 2026 – Ertrag & Ersparnis berechnen',
    seoDescription: 'Kompostmenge berechnen: Wie viel fertiger Kompost entsteht aus deinen Gartenabfällen und wie viel sparst du gegenüber Kauf-Komposterde? Kostenlos.',
    inputs: [
      { id: 'abfallProWoche', label: 'Grünabfall/Woche', icon: '🍂', min: 5, max: 150, step: 5, default: 40, unit: 'L', decimals: 0 },
      { id: 'dauer', label: 'Kompostierdauer', icon: '⏳', min: 3, max: 18, step: 1, default: 9, unit: 'Monate', decimals: 0 },
      { id: 'reduktion', label: 'Volumenreduktion', icon: '📉', min: 40, max: 80, step: 5, default: 60, unit: '%', decimals: 0 },
      { id: 'preisProSack', label: 'Preis Kauf-Kompost', icon: '💶', min: 2, max: 12, step: 0.5, default: 5, unit: '€/40L', decimals: 1 },
    ],
    outputs: [
      { id: 'fertigerKompost', label: 'Fertiger Kompost', unit: 'L', decimals: 0, primary: true },
      { id: 'gesamtInput', label: 'Eingesetztes Material', unit: 'L', decimals: 0 },
      { id: 'saecke', label: 'entspricht Säcken (40 L)', unit: 'Stk', decimals: 1 },
      { id: 'ersparnis', label: 'Ersparnis ggü. Kauf', money: true },
    ],
    note: 'Die Volumenreduktion durch Rotte variiert je nach Material (Laub, Rasenschnitt, Küchenabfälle) und Kompostführung deutlich – 50–70 % ist ein üblicher Bereich.',
    content: `
      <h2>Wie der Kompost-Rechner rechnet</h2>
      <p>Aus der wöchentlichen Abfallmenge und der Kompostierdauer ergibt sich das Ausgangsvolumen. Davon zieht der Rechner die Volumenreduktion ab, die während der Rotte entsteht, und rechnet das Ergebnis in Säcke gekauften Kompost um – so siehst du, was du dir sparst.</p>

      <h3>Warum so viel Volumen verloren geht</h3>
      <p>Aus dem Ausgangsmaterial wird deutlich weniger Kompost, als man erwartet: 50 bis 70 Prozent des Volumens gehen verloren, weil Wasser verdunstet und Kohlenstoff als CO₂ entweicht. Ein durchschnittlicher Hausgarten liefert 3 bis 5 Liter Rohmaterial je Quadratmeter Gartenfläche im Jahr. Bei 300 Quadratmetern sind das 1.000 bis 1.500 Liter, aus denen 350 bis 600 Liter fertiger Kompost werden.</p>
      <p>Gekaufter Kompost kostet in Sackware 5 bis 10 Euro je 40 Liter. Dazu kommt die Biotonnengebühr, die je nach Kommune noch einmal 50 bis 100 Euro im Jahr ausmachen kann.</p>

      <h3>Das Verhältnis von Grün zu Braun</h3>
      <p>Der wichtigste Punkt beim Kompostieren ist die Mischung. Grünes, stickstoffreiches Material sind Rasenschnitt, Küchenabfälle, Kaffeesatz und frisches Unkraut. Braunes, kohlenstoffreiches Material sind Herbstlaub, zerkleinerter Strauchschnitt, Stroh, unbehandelte Sägespäne und Pappe.</p>
      <p>Das Verhältnis sollte bei etwa 1 zu 2 bis 1 zu 3 liegen, gemessen in Volumen. Die Praxis sieht anders aus: Im Sommer fällt fast nur Grün an, im Herbst fast nur Braun. Der Trick besteht darin, im Herbst einen Laubvorrat in Säcken oder einem Drahtkorb anzulegen und ihn übers Jahr schichtweise unter den Rasenschnitt zu mischen. Ohne diesen Vorrat entsteht im Sommer eine faulende Grasmasse.</p>

      <h3>Aufsetzen und wenden</h3>
      <p>Setze den Kompost auf offenem Boden auf, nicht auf Platten – der direkte Bodenkontakt lässt Regenwürmer einwandern, die den größten Teil der Arbeit leisten. Beginne mit 20 Zentimetern grobem Material aus Ästen und Häckselgut zur Belüftung. Schichte darüber abwechselnd Grün und Braun in Lagen von 10 bis 20 Zentimetern und streue zwischendurch Gartenerde oder fertigen Kompost ein.</p>
      <p>Der Standort sollte halbschattig sein, die Größe bei etwa einem Kubikmeter liegen: Kleinere Haufen erwärmen sich nicht ausreichend, größere lassen sich schlecht wenden. In den ersten Tagen steigt die Temperatur im Inneren auf 50 bis 70 Grad und tötet die meisten Unkrautsamen ab. Wende den Haufen nach vier bis sechs Wochen einmal um – das ist der einzige größere Arbeitseinsatz und beschleunigt den Prozess deutlich.</p>

      <h3>Was nicht hineingehört</h3>
      <p>Gekochte Speisereste, Fleisch, Fisch und Milchprodukte ziehen Ratten an und faulen. Katzenstreu und Hundekot können Krankheitserreger enthalten. Kranke Pflanzenteile mit Pilzbefall gehören in die Biotonne, weil die Heißrotte im Hausgarten nicht zuverlässig hoch genug wird. Wurzelunkräuter wie Giersch, Quecke und Winde treiben aus dem Kompost wieder aus.</p>
        `,
    faq: [
      { q: 'Wie viel Kompost bekomme ich aus meinem Gartenabfall?', a: 'Etwa 30 bis 50 Prozent des Ausgangsvolumens. Der Rest geht als Wasser und CO₂ verloren. Aus 1.200 Litern Rohmaterial werden also grob 400 bis 600 Liter fertiger Kompost.' },
      { q: 'Wie lange dauert die Kompostierung?', a: 'Frischkompost ist nach drei bis fünf Monaten fertig und eignet sich zum Mulchen und für Starkzehrer. Reifer Kompost braucht 9 bis 12 Monate und ist universell einsetzbar.' },
      { q: 'Was darf nicht auf den Kompost?', a: 'Gekochte Speisereste, Fleisch, Fisch, Milchprodukte, Katzenstreu, Hundekot, kranke Pflanzenteile und Wurzelunkräuter wie Giersch und Quecke. Auch behandeltes Holz, Hochglanzpapier und große Mengen Zitrusschalen gehören nicht hinein.' },
      { q: 'Warum stinkt mein Kompost?', a: 'Weil zu viel grünes Material drin ist und zu wenig Luft. Mische trockenes braunes Material wie Laub oder Häckselgut unter und wende den Haufen einmal um.' },
      { q: 'Muss ich den Kompost wenden?', a: 'Einmal nach vier bis sechs Wochen reicht. Das Umsetzen bringt randliches Material nach innen und beschleunigt die Rotte deutlich. Ohne Wenden dauert es länger, funktioniert aber auch.' },
      { q: 'Woran erkenne ich, dass der Kompost fertig ist?', a: 'Er ist dunkelbraun und krümelig, riecht nach Waldboden, und das Ausgangsmaterial ist nicht mehr erkennbar. Ein einfacher Test: Kresse hineinsäen – keimt sie normal, ist er reif.' },
    ],
    affiliate: {
      heading: 'Komposter & Gartenzubehör',
      text: 'Passende Komposter, Wendehilfen und Kompostbeschleuniger für deinen Garten.',
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
