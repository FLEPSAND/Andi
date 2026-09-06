# Dach & Beet 🏡

Rechner-Hub für **Haus · Energie · Garten** — kostenlose, präzise Online-Rechner,
die vollständig **lokal im Browser** rechnen. Gebaut mit [Astro](https://astro.build)
als **statische Seite** (Top-Speed, perfektes SEO) und modular auf beliebig viele
Rechner erweiterbar.

Domain: **dachundbeet.de** · Monetarisierung: Google AdSense + Affiliate/Lead-Gen.

## Was schon drin ist

**18 Rechner** (Schwerpunkt Energie = höchster CPC), je mit Ratgeber-Artikel verlinkt:
| Rechner | Slug | Kategorie |
|---|---|---|
| ☀️ Photovoltaik-Rechner | `pv-solar` | Energie |
| 🔌 Balkonkraftwerk-Rechner | `balkonkraftwerk` | Energie |
| 🔥 Wärmepumpen-Rechner | `waermepumpe` | Energie |
| 🚗 E-Auto Ladekosten-Rechner | `wallbox-ladekosten` | Energie |
| 💡 Stromkosten-Rechner | `stromkosten` | Energie |
| 🔋 Batteriespeicher-Rechner | `batteriespeicher` | Energie |
| ❄️ Klimaanlagen-Rechner | `klimaanlage-stromkosten` | Energie |
| 🌱 Hochbeet-Füllmengen-Rechner | `hochbeet` | Garten |
| 🚰 Zisternen-Rechner | `zisterne` | Garten |
| 🧩 Pflaster-Rechner | `pflaster` | Garten |
| 🌾 Rasen-Rechner | `rasen` | Garten |
| 🏊 Pool-Rechner | `pool-wasser` | Garten |
| ♻️ Kompost-Rechner | `kompost` | Garten |
| 🧱 Dämmungs-Rechner | `daemmung` | Haus |
| 🌡️ Heizlast-Rechner | `heizlast` | Haus |
| 🪵 Brennholz-Rechner | `brennholz` | Haus |
| 🎨 Farbrechner (Streichen) | `streichen-farbe` | Haus |
| 🪚 Bodenbelag-Rechner | `bodenbelag-laminat` | Haus |

Dazu **18 Ratgeber-Artikel** (einer pro Rechner, gegenseitig verlinkt — Rechner zeigt
„Passender Ratgeber", Artikel verlinkt zurück zum Rechner).

Dazu: Startseite, Rechner-Übersicht, Ratgeber-Hub, **Impressum**, **Datenschutz**,
Über uns, Kontakt, 404 — plus SEO-Basis (`sitemap.xml`, `robots.txt`, `ads.txt`,
Open Graph, FAQ-/WebApplication-/Article-/Breadcrumb-Schema), Cookie-Consent-Banner
und AdSense-/Affiliate-Slots.

## Entwickeln

```bash
cd dachundbeet
npm install
npm run dev      # http://localhost:4321
npm run build    # erzeugt statische Dateien in dist/
npm run preview  # dist/ lokal testen
```

## Deploy auf IONOS (oder jeden Webspace)

1. `npm run build` → alle fertigen Dateien liegen in **`dist/`**.
2. Den **Inhalt von `dist/`** per FTP in das Web-Root deines IONOS-Pakets laden
   (z. B. `/`), sodass `dachundbeet.de` direkt `index.html` ausliefert.
3. Fertig — es ist reines statisches HTML/CSS/JS, kein Node auf dem Server nötig.

> **Später komfortabler:** Repo mit **Cloudflare Pages** verbinden (Build-Befehl
> `npm run build`, Output-Ordner `dist`) → bei jedem `git push` wird automatisch
> deployt, inkl. globalem CDN und HTTPS. Kostenlos.

## ✅ Vor dem Launch erledigen

- [x] **Impressum** (`src/pages/impressum.astro`) — ausgefüllt (private Nutzung). Bei Gewerbeanmeldung/USt-Pflicht später ergänzen.
- [x] **Datenschutz** (`src/pages/datenschutz.astro`) — ausgefüllt, inkl. Cloudflare als Hosting-Anbieter. Vor dem Launch einmal rechtlich prüfen lassen.
- [x] **Cookie-/Consent-Banner:** eingebaut (`ConsentBanner.astro` + `scripts/consent.ts` +
      `scripts/ads.ts`). Blockiert das AdSense-Skript technisch, bis der Nutzer zustimmt;
      „Cookie-Einstellungen“ im Footer setzt die Wahl zurück. **Achtung:** Das ist ein
      funktionierender, selbstgebauter Consent-Gate — für volle Rechtssicherheit bei
      Google-Werbung im EWR empfiehlt Google zusätzlich eine **zertifizierte
      IAB-TCF-CMP** (z. B. consentmanager, CookieYes, Cookiebot – kostenlose Tarife
      vorhanden). Lässt sich später einfach in `ConsentBanner.astro` einsetzen.
- [ ] **AdSense scharfstellen:** in `src/config.ts` `ADSENSE.enabled = true` setzen und
      pro `<AdSlot slot="…">` die jeweilige Ad-Slot-ID eintragen.
- [ ] **Affiliate-Links:** in `src/data/rechner.ts` die `affiliate.href`-Platzhalter (`#`)
      durch echte Partnerprogramm-URLs ersetzen.
- [x] **Kontakt-E-Mail** in `src/config.ts` (`SITE.email`) gesetzt.

## 🔌 Neuen Rechner hinzufügen (modular — bestehende Seiten bleiben unberührt)

Zwei Schritte, dann entstehen Detailseite, Übersichts-Karte, Nav-Zähler, Sitemap
und interne Verlinkung **automatisch**:

1. **Rechen-Funktion** in `src/scripts/compute.ts` ergänzen (Schlüssel = neuer `slug`):
   ```ts
   function meinRechner(v: Inputs): Outputs {
     const ergebnis = v.eingabeA * v.eingabeB;
     return { ergebnis };
   }
   export const COMPUTE = { /* … */, 'mein-rechner': meinRechner };
   ```
2. **Eintrag** in `src/data/rechner.ts` (Array `RECHNER`) anhängen — mit `slug`,
   `inputs` (Slider), `outputs` (Ergebnis-Felder), `content` (Ratgeber-Text) und `faq`.
   Die `id`s der `inputs`/`outputs` müssen zu den Feldern der Rechen-Funktion passen.

Neu bauen (`npm run build`) — der Rechner ist live.

## Projektstruktur

```
src/
  config.ts               # EINE zentrale Config: Marke, Domain, Autor, AdSense, Affiliate, Nav
  data/rechner.ts         # Rechner-Registry (Metadaten, Inputs, Outputs, Content, FAQ)
  scripts/
    compute.ts            # reine Rechen-Funktionen (Browser + Build)
    calculator.ts         # Client-Runtime: Slider → rechnen → Ergebnis (de-DE-Format)
  layouts/BaseLayout.astro # <head> mit SEO/OG/Schema, Header + Footer
  components/             # Header, Footer, Calculator, RechnerCard, Faq, AdSlot, AffiliateCTA, AutorBox
  pages/                  # index, rechner/, ratgeber/, Rechtsseiten, 404
scripts/generate-og.mjs   # erzeugt die OG-Vorschaubilder in public/og/
public/                   # ads.txt, robots.txt, favicon.svg, og/*.png
```

## Vorschaubilder (Open Graph)

Jede Seite liefert ein Vorschaubild für Social-Media-Shares. Es gibt vier
Varianten (Standard plus je eine pro Kategorie); die Auswahl passiert automatisch
über die Kategorie des Rechners bzw. Artikels.

Neu erzeugen nach Farb- oder Markenänderungen:

```bash
node scripts/generate-og.mjs
```

Alle Angaben in den Rechnern sind vereinfachte Modellrechnungen ohne Gewähr und
ersetzen keine fachliche Beratung.
