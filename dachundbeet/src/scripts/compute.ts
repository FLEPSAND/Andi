/**
 * Rechen-Logik aller Rechner — reine Funktionen, laufen im Browser.
 * Kein DOM, keine Seiteneffekte: Eingaben rein, Ergebnisse raus.
 * Neuen Rechner ergänzen = eine Funktion hier + ein Eintrag in data/rechner.ts.
 *
 * Konvention: Eingaben und Ergebnisse sind Objekte { id: number }.
 * Die ids müssen zu den input-/output-ids in der Registry passen.
 */

export type Inputs = Record<string, number>;
export type Outputs = Record<string, number>;
export type ComputeFn = (v: Inputs) => Outputs;

/** ☀️ PV / Solar — Jahresertrag, finanzieller Nutzen, Amortisation */
function pvSolar(v: Inputs): Outputs {
  const jahresertrag = v.kwp * v.spezertrag; // kWh/Jahr
  const eigen = jahresertrag * (v.eigenverbrauch / 100);
  const einspeisung = jahresertrag - eigen;
  const ersparnis = eigen * (v.strompreis / 100);
  const erloes = einspeisung * (v.einspeiseverguetung / 100);
  const nutzen = ersparnis + erloes;
  const amortisation = nutzen > 0 ? v.investition / nutzen : 0;
  const gewinn20 = nutzen * 20 - v.investition;
  return { jahresertrag, nutzen, amortisation, gewinn20 };
}

/** 🔌 Balkonkraftwerk — Ertrag, Ersparnis, Amortisation */
function balkonkraftwerk(v: Inputs): Outputs {
  const kwp = v.leistung / 1000;
  const jahresertrag = kwp * v.spezertrag; // kWh/Jahr
  const genutzt = jahresertrag * (v.eigenverbrauch / 100);
  const ersparnis = genutzt * (v.strompreis / 100); // €/Jahr
  const amortisation = ersparnis > 0 ? v.kosten / ersparnis : 0;
  const ersparnis10 = ersparnis * 10 - v.kosten;
  return { jahresertrag, ersparnis, amortisation, ersparnis10 };
}

/** 🔥 Wärmepumpe — Kostenvergleich alte Heizung vs. Wärmepumpe */
function waermepumpe(v: Inputs): Outputs {
  const endenergieAlt = v.heizbedarf / (v.wirkungsgrad / 100);
  const kostenAlt = endenergieAlt * (v.brennstoffpreis / 100);
  const stromWp = v.heizbedarf / v.jaz;
  const kostenWp = stromWp * (v.strompreis / 100);
  const ersparnis = kostenAlt - kostenWp;
  const ersparnis15 = ersparnis * 15;
  return { kostenAlt, kostenWp, ersparnis, ersparnis15 };
}

/** 🚗 Wallbox / E-Auto — Ladekosten */
function wallbox(v: Inputs): Outputs {
  const gesamtKwh = (v.fahrleistung / 100) * v.verbrauch;
  const kwhHeim = gesamtKwh * (v.anteilHeim / 100);
  const kwhOeff = gesamtKwh - kwhHeim;
  const kosten = kwhHeim * (v.strompreis / 100) + kwhOeff * (v.preisOeff / 100);
  const pro100 = gesamtKwh > 0 ? (kosten / (v.fahrleistung || 1)) * 100 : 0;
  const proMonat = kosten / 12;
  return { gesamtKwh, kosten, pro100, proMonat };
}

/** 💡 Stromkosten — aktueller vs. neuer Tarif, Ersparnis */
function stromkosten(v: Inputs): Outputs {
  const kostenAlt = v.verbrauch * (v.arbeitspreisAlt / 100) + v.grundpreisAlt * 12;
  const kostenNeu = v.verbrauch * (v.arbeitspreisNeu / 100) + v.grundpreisNeu * 12;
  const ersparnis = kostenAlt - kostenNeu;
  const ersparnisMonat = ersparnis / 12;
  return { kostenAlt, kostenNeu, ersparnis, ersparnisMonat };
}

/** 🌱 Hochbeet — Füllmengen nach Schichten */
function hochbeet(v: Inputs): Outputs {
  const liter = (v.laenge * v.breite * v.hoehe) / 1000; // cm³ -> Liter
  const haecksel = liter * 0.3; // grober Baum-/Strauchschnitt
  const kompost = liter * 0.45; // Grünschnitt, Laub, grober Kompost
  const erde = liter * 0.25; // feine Pflanzerde (oberste Schicht)
  const saecke = Math.ceil(erde / 40); // Säcke Pflanzerde à 40 L
  return { liter, haecksel, kompost, erde, saecke };
}

/** 🧱 Dämmung / U-Wert — Wärmeverlust & Heizkosten-Ersparnis */
function daemmung(v: Inputs): Outputs {
  // Faktor 84 = Heizgradtage (~3500 Kd/a) × 24 h / 1000 → kWh je (W/m²K · m²)
  const hgt = 84;
  const verlustAlt = v.uAlt * v.flaeche * hgt;
  const verlustNeu = v.uNeu * v.flaeche * hgt;
  const ersparnisKwh = verlustAlt - verlustNeu;
  const ersparnis = ersparnisKwh * (v.energiepreis / 100);
  return { verlustAlt, verlustNeu, ersparnisKwh, ersparnis };
}

/** 🌡️ Heizlast — benötigte Heizleistung & Wärmebedarf */
function heizlast(v: Inputs): Outputs {
  const kw = (v.flaeche * v.spez) / 1000;
  const bedarf = kw * v.vbh; // Vollbenutzungsstunden
  const gasM3 = bedarf / 10; // ~10 kWh je m³ Erdgas
  return { kw, bedarf, gasM3 };
}

/** 🚰 Regenwasser / Zisterne — Auffangmenge & Zisternengröße */
function zisterne(v: Inputs): Outputs {
  const ertrag = v.dachflaeche * v.niederschlag * v.abfluss; // m² · mm · Beiwert = Liter
  const empfohlen = ertrag * 0.06; // Faustregel Zisternenvolumen
  const ersparnis = (ertrag / 1000) * v.wasserpreis; // m³ · €/m³
  return { ertrag, empfohlen, ersparnis };
}

/** 🧩 Pflaster — Steinbedarf, Splitt & Schotter */
function pflaster(v: Inputs): Outputs {
  const flaeche = v.laenge * v.breite;
  const steine = Math.ceil(flaeche * v.proQm * (1 + v.verschnitt / 100));
  const splitt = flaeche * 0.05; // 5 cm Bettung (m³)
  const schotter = flaeche * 0.15; // 15 cm Unterbau (m³)
  return { flaeche, steine, splitt, schotter };
}

/** 🌾 Rasen — Saatgut, Dünger & Wasser */
function rasen(v: Inputs): Outputs {
  const saat = (v.flaeche * v.saatmenge) / 1000; // kg
  const duenger = (v.flaeche * v.duengermenge) / 1000; // kg
  const wasser = v.flaeche * 15; // ~15 L/m² je Wässerung
  return { saat, duenger, wasser };
}

/** 🪵 Brennholz — benötigte Raummeter & Kosten */
function brennholz(v: Inputs): Outputs {
  const nutzbarProRm = v.heizwert * (v.wirkungsgrad / 100);
  const rm = nutzbarProRm > 0 ? v.heizbedarf / nutzbarProRm : 0;
  const kosten = rm * v.preis;
  const fm = rm * 0.7; // 1 Raummeter ≈ 0,7 Festmeter
  return { rm, kosten, fm };
}

/** 🔋 Batteriespeicher — zusätzlicher Eigenverbrauch & Amortisation */
function batteriespeicher(v: Inputs): Outputs {
  const zusatzKwh = v.jahresertrag * ((v.eigenverbrauchMit - v.eigenverbrauchOhne) / 100);
  const ersparnis = zusatzKwh * (v.strompreis / 100);
  const amortisation = ersparnis > 0 ? v.kosten / ersparnis : 0;
  const gewinn10 = ersparnis * 10 - v.kosten;
  return { zusatzKwh, ersparnis, amortisation, gewinn10 };
}

/** ❄️ Klimaanlage — Stromverbrauch & Kosten im Kühlbetrieb */
function klimaanlage(v: Inputs): Outputs {
  const stromProStunde = v.leistung / v.eer; // kW elektrisch
  const verbrauch = stromProStunde * v.stundenProTag * v.tageProJahr;
  const kosten = verbrauch * (v.strompreis / 100);
  const kostenProTag = kosten / (v.tageProJahr || 1);
  return { verbrauch, kosten, kostenProTag };
}

/** 🎨 Streichen — Wandfläche & Farbmenge */
function streichen(v: Inputs): Outputs {
  const umfang = 2 * (v.laenge + v.breite);
  const wandflaeche = Math.max(umfang * v.hoehe - v.oeffnungen, 0);
  const farbmengeProAnstrich = wandflaeche / v.ergiebigkeit;
  const farbmenge = farbmengeProAnstrich * v.anstriche;
  const eimer5L = Math.ceil(farbmenge / 5);
  return { wandflaeche, farbmenge, eimer5L, farbmengeProAnstrich };
}

/** 🪚 Bodenbelag — Paketbedarf & Kosten */
function bodenbelag(v: Inputs): Outputs {
  const flaeche = v.laenge * v.breite;
  const bedarf = flaeche * (1 + v.verschnitt / 100);
  const pakete = Math.ceil(bedarf / v.paketgroesse);
  const kosten = pakete * v.paketgroesse * v.preis;
  return { pakete, flaeche, bedarf, kosten };
}

/** 🏊 Pool — Wasservolumen & Nachfüllkosten */
function pool(v: Inputs): Outputs {
  const volumenM3 = v.laenge * v.breite * v.tiefe;
  const volumenL = volumenM3 * 1000;
  const nachfuellL = volumenL * (v.wasserwechsel / 100);
  const wasserkosten = (nachfuellL / 1000) * v.wasserpreis;
  return { volumenL, volumenM3, nachfuellL, wasserkosten };
}

/** ♻️ Kompost — Ausgangsmaterial, fertiger Kompost & Ersparnis */
function kompost(v: Inputs): Outputs {
  const wochen = v.dauer * 4.33;
  const gesamtInput = v.abfallProWoche * wochen;
  const fertigerKompost = gesamtInput * (1 - v.reduktion / 100);
  const saecke = fertigerKompost / 40;
  const ersparnis = saecke * v.preisProSack;
  return { fertigerKompost, gesamtInput, saecke, ersparnis };
}

export const COMPUTE: Record<string, ComputeFn> = {
  'pv-solar': pvSolar,
  'balkonkraftwerk': balkonkraftwerk,
  'waermepumpe': waermepumpe,
  'wallbox-ladekosten': wallbox,
  'stromkosten': stromkosten,
  'hochbeet': hochbeet,
  'daemmung': daemmung,
  'heizlast': heizlast,
  'zisterne': zisterne,
  'pflaster': pflaster,
  'rasen': rasen,
  'brennholz': brennholz,
  'batteriespeicher': batteriespeicher,
  'klimaanlage-stromkosten': klimaanlage,
  'streichen-farbe': streichen,
  'bodenbelag-laminat': bodenbelag,
  'pool-wasser': pool,
  'kompost': kompost,
};
