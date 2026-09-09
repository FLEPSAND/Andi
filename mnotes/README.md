# MNotes

Eine Notiz-App für Handschrift, Zeichnen, PDF und Lernstoff. Läuft als
statische Web-App im Browser, ohne Build-Schritt und ohne Server. Alle Notizen,
Zeichnungen, PDFs und Aufnahmen liegen in IndexedDB auf dem Gerät — es gibt
kein Konto, keine Synchronisierung und keine Telemetrie.

Der Funktionsumfang orientiert sich an dem, was vergleichbare Apps hinter einem
Abo anbieten: viele Stiftarten, Ebenen, Vorlagen, Zweiseiten- und
Split-Ansicht, Versionsverlauf, PDF-Annotation, Texterkennung, Tonaufnahme mit
Live-Mitschrift und eine Auswertung des Notizinhalts.

## Starten

Weil die App ES-Module lädt, braucht sie einen Webserver — ein Doppelklick auf
`index.html` reicht nicht.

```bash
cd mnotes
python3 -m http.server 8000
# dann http://localhost:8000 öffnen
```

Über „zum Home-Bildschirm hinzufügen" (iPad) beziehungsweise „installieren"
(Chrome, Edge) läuft sie als eigenständige App im Vollbild. Ein Service Worker
legt die eigenen Dateien lokal ab, sodass sie auch offline startet.

## Was drin ist

**Stifte.** Füller, Kugelschreiber, Fineliner, Bleistift, Pinsel, Textmarker,
Wachsmaler, Neon und eine gestrichelte Linie. Füller, Kugelschreiber und Pinsel
folgen dem Stiftdruck, Bleistift und Wachsmaler haben eine Körnung, Neon
leuchtet. Jeder Stift merkt sich eigene Farbe, Dicke und Deckkraft. Dazu fünf
Farbpaletten, ein freier Farbwähler, Formen (Linie, Pfeil, Rechteck, Ellipse),
Lasso-Auswahl zum Verschieben, Duplizieren und Umfärben — und ein Radierer, der
wahlweise ganze Striche entfernt oder druckabhängig nur den berührten Teil.

**Ebenen.** Pro Seite beliebig viele, einzeln sichtbar, sperrbar,
verschiebbar und zusammenführbar. Skizze unten, Reinzeichnung oben.

**Vorlagen.** Leer, liniert, weit liniert, kariert, Rechenkästchen,
Punktraster, Schreiblinien mit Mittellinie, Notenlinien, Cornell, Aufgabenliste,
Wochenplan, Storyboard, isometrisch. Einzeln oder für alle Seiten.

**Ordnung.** Ordner (Notizen lassen sich per Drag-and-drop hineinziehen),
Schlagwörter, Favoriten, Volltextsuche über Titel, Text, erkannten Text und
PDF-Inhalt, Symbol und Farbe pro Notiz.

**Seiten.** Anhängen, duplizieren, löschen, verlängern („Seite erweitern"),
Zweiseitenmodus, Split-Screen mit einer zweiten Notiz zum Nachschlagen
(Leseansicht), Zoom.

**PDF.** Import über pdf.js, Annotation mit allen Stiften direkt auf den
Seiten, der Textinhalt des PDFs fließt in Suche und Auswertung ein.

**Texterkennung.** Tesseract macht aus Handschrift oder einer gescannten Seite
durchsuchbaren Text, wahlweise deutsch, englisch oder beides.

**Aufnahme.** Tonaufnahme mit Pegelanzeige, optional mit Live-Mitschrift über
die Spracherkennung des Browsers. Aufnahmen hängen an der Notiz und lassen sich
dort abspielen.

**Video.** Videodatei oder direkte Video-URL laden, Bild-in-Bild einschalten
und mit einem Klick ein Standbild samt Zeitmarke in die Notiz setzen.

**Auswertung.** Zusammenfassung, Kernpunkte, Aufgabenliste, Lernfragen und ein
Chat, der Fragen zum Inhalt der Notiz beantwortet.

**Versionen.** Manuell oder automatisch gesicherte Stände, einzeln
wiederherstellbar.

**Export.** Markdown, PNG der aktuellen Seite, PDF über den Druckdialog,
vollständiges JSON-Backup samt PDFs und Aufnahmen.

## Auswertung: lokal oder mit Modell

In den Einstellungen steht der Anbieter:

- **Lokal** (Voreinstellung): rechnet im Browser, ohne Netz und ohne
  Schlüssel. Das ist kein Sprachmodell — es gewichtet Sätze, zieht
  Aufgabenzeilen heraus und sucht passende Stellen zur Frage. Für Stichpunkte
  aus einer Mitschrift reicht das; formulieren kann es nicht.
- **Anthropic (Claude)**: echter Modellaufruf mit eigenem API-Schlüssel.
- **Eigener Endpunkt**: jede OpenAI-kompatible `/chat/completions`-API.

Ein hinterlegter Schlüssel liegt unverschlüsselt in der Browser-Datenbank und
geht nur an den gewählten Anbieter. Auf einem geteilten Gerät besser leer
lassen.

Die Live-Mitschrift nutzt die `SpeechRecognition`-Schnittstelle des Browsers.
In Chrome und Edge wird der Ton dafür an den Hersteller übertragen; die
Aufnahme selbst bleibt lokal.

## Tastatur

| Taste | Wirkung |
|-------|---------|
| `Alt`+`1` / `Alt`+`2` | Text- / Zeichenmodus |
| `1`–`9` | Stift wählen (im Zeichenmodus) |
| `E` / `S` / `F` | Radierer / Auswahl / Formen |
| `[` / `]` | dünner / dicker |
| `Umschalt` halten | Strich gerade ziehen |
| `Strg`+`Z` / `Strg`+`Umschalt`+`Z` | rückgängig / wiederholen |
| `Entf` | Auswahl löschen |
| `Strg`+`N` | neue Notiz |
| `Strg`+`F` | suchen |
| `Strg`+`K` | Panel ein-/ausblenden |
| `Strg`+`P` | drucken / als PDF sichern |
| `Strg`+`Umschalt`+`S` | Standbild aus dem Video |
| `Esc` | Auswahl aufheben, Panel schließen |

## Aufbau

```
index.html              Aufbau der Oberfläche
css/app.css             Gestaltung, hell und dunkel, Druckansicht
js/app.js               Verdrahtung: Ereignisse, Rendern, Dialoge
js/store.js             Notizen, Ordner, Seiten, Ebenen, Versionen
js/db.js                IndexedDB
js/ink.js               Zeichenfläche: Eingabe, Ebenen, Auswahl, Rückgängig
js/pens.js              Stiftarten und ihr Aussehen
js/templates.js         Seitenvorlagen als SVG
js/ai.js                Auswertung: lokal, Anthropic, OpenAI-kompatibel
js/ocr.js               Texterkennung (Tesseract, wird bei Bedarf geladen)
js/pdfview.js           PDF-Import und -Darstellung (pdf.js, bei Bedarf)
js/audio.js             Aufnahme und Live-Mitschrift
js/pip.js               Video und Bild-in-Bild
js/export.js            Markdown, Druck, Backup
sw.js                   Offline-Betrieb
```

Die App selbst hat keine Abhängigkeiten. pdf.js und Tesseract kommen von einem
CDN und werden erst geladen, wenn jemand ein PDF öffnet beziehungsweise die
Texterkennung startet — ohne Netz fehlen genau diese beiden Funktionen, der
Rest läuft weiter.

## Grenzen

- Die Split-Ansicht zeigt die zweite Notiz zum Lesen; bearbeitet wird links.
- Handschrift ist vektorbasiert, aber es gibt keine Formerkennung, die
  Gekritzeltes in saubere Geometrie umwandelt.
- Kein Abgleich zwischen Geräten. Umziehen geht über Backup und Einspielen.
- Die Live-Mitschrift hängt am Browser: Chrome, Edge und Safari können es,
  Firefox nicht.

## Name

Die App heißt bewusst nicht wie das Vorbild: „Freenotes" ist eine eingetragene
Marke. Zum Umbenennen reichen der `<title>` in `index.html`, `.brand-name` und
der Name in `manifest.webmanifest`.
