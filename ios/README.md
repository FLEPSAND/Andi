# MNotes für iPhone und iPad

Native App in SwiftUI. Handschrift läuft über PencilKit, es gibt also echten
Apple-Pencil-Druck, Neigung, Handballenerkennung und das Doppeltippen am Stift.
Gespeichert wird mit SwiftData auf dem Gerät.

## Bauen

Xcode 16 oder neuer, iOS 17 als Mindestversion.

```
open ios/MNotes/MNotes.xcodeproj
```

Vor dem ersten Start zwei Dinge einstellen:

1. Ziel **MNotes** → Reiter *Signing & Capabilities* → dein Team auswählen.
2. Die Bundle-ID `de.mnotes.app` gegen eine eigene tauschen, etwa
   `de.deinname.mnotes`. Sie muss weltweit eindeutig sein.

Dann Gerät auswählen und starten. Auf dem Simulator läuft alles außer
Apple Pencil und Mikrofonaufnahme sinnvoll.

Auf einem Mac mit Apple Silicon läuft die App ohne Zusatzarbeit: in Xcode als
Ziel **My Mac (Designed for iPad)** wählen. Zeichnen geht dort nur mit der Maus
oder über ein angeschlossenes iPad per Sidecar.

Das Projekt nutzt eine dateisystem-synchronisierte Gruppe: neue Dateien im
Ordner `MNotes/` landen automatisch im Ziel, sie müssen nicht einzeln
hinzugefügt werden. Das setzt Xcode 16 voraus.

## Aufbau

```
MNotes/
  MNotesApp.swift       Einstiegspunkt, SwiftData-Container
  Models.swift          Ordner, Notiz, Seite, Ebene, Aufnahme, Version
  ContentView.swift     Dreispaltige Navigation, Ordner- und Notizliste
  NoteEditorView.swift  Editor, Werkzeugleiste, Stiftregal, Seitenleiste unten
  PageCanvas.swift      PKCanvasView mit Ebenen, Zoom, Hintergrund, Text
  Pens.swift            Stiftvorgaben, Paletten, Werkzeugzustand
  Templates.swift       Seitenvorlagen, mit Core Graphics gezeichnet
  InspectorView.swift   Ebenen, Analyse, Chat, OCR, Audio, Verlauf
  AskSelectionView.swift  Bereich auswählen und dazu fragen
  WelcomeView.swift     Startbildschirm beim ersten Öffnen
  VideoPane.swift       Video neben der Notiz, Standbild, Bild-in-Bild
  RichText.swift        Textformat der Seiten (RTFD, mit Bildern)
  Annotations.swift     Schnellmarker: Linienstile über der Handschrift
  Services.swift        PDF, Seiten-Rendering, Export, Vision-OCR, Schlüsselbund
  AIService.swift       Auswertung lokal oder über die Claude-API
  AudioService.swift    Aufnahme und Live-Mitschrift
  Settings.swift        Einstellungen
  Store.swift           Käufe (StoreKit 2) und die Stufen-Logik
  PaywallView.swift     Kaufseite mit Vergleichstabelle
  Products.storekit     Testprodukte für Xcode, ohne App Store Connect
```

## Wie die Ebenen funktionieren

PencilKit kennt keine Ebenen. Die Seite wird deshalb von Hand zusammengesetzt:
alles unterhalb der aktiven Ebene wird zu einem Hintergrundbild verrechnet,
alles darüber zu einem Overlay, und nur die aktive Ebene liegt im
`PKCanvasView`, wo der Stift sie erreicht. Weil `PKCanvasView` eine Scroll-View
ist, kommen Zoom und Verschieben von PencilKit selbst — deshalb bleibt die
Schrift bei jeder Vergrößerung scharf. Die beiden Bildansichten und das
Textfeld werden in `syncOverlays()` nachgeführt.

## Was drin ist

Startbildschirm beim ersten Öffnen; neun Stifte (Füller, Kugelschreiber,
Fineliner, Bleistift, Pinsel, Textmarker,
Wachsmaler, Wasserfarbe, Neon), jeder mit eigener Farbe, Dicke und Deckkraft;
fünf Paletten und freier Farbwähler; Schnellmarker mit sechs Linienstilen;
Radierer wahlweise pixel- oder strichweise; Lasso; Lineal; Ebenen mit Sichtbarkeit, Sperre und Umbenennen;
dreizehn Seitenvorlagen; Seiten anhängen, verlängern, duplizieren, löschen;
Ordner, Schlagwörter, Favoriten und Volltextsuche über getippten, erkannten und
PDF-Text; PDF-Import samt Beschriften; Texterkennung mit Vision auf dem Gerät;
Tonaufnahme mit Live-Mitschrift; Versionsverlauf; Export als PDF, PNG und
Markdown über das Teilen-Menü; Video daneben mit Standbild; Hell- und
Dunkelmodus umschaltbar; Auswahl fragen (siehe unten).

## Schnellmarker

Ein Zug entlang einer Zeile wird zu einer sauberen, waagerechten Markierung.
Der Knopf neben Radierer und Lasso schaltet das Werkzeug ein, ein langer Druck
darauf wählt den Stil: durchgezogen, gestrichelt, Wellenlinie, Zickzack,
Doppellinie oder Balken hinter dem Text. Ein Tipp auf eine Markierung entfernt
sie wieder.

PencilKit kennt keine Linienstile, deshalb liegen diese Anmerkungen als eigene
kleine Datenstruktur an der Seite (`Annotations.swift`) und werden mit Core
Graphics über die Handschrift gezeichnet — im Editor wie im PDF-Export.

## Video daneben

Der Knopf **▶** oben rechts klappt einen Videobereich neben die Seite: eine
Videodatei öffnen oder eine direkte Adresse einfügen, dann links mitschreiben.
*Standbild* setzt das aktuelle Bild samt Zeitmarke in die Notiz. Klappt man den
Bereich zu, während das Video läuft, übernimmt Bild-in-Bild.

Portale wie YouTube oder Vimeo lassen sich nicht einbetten — die App sagt das
und verweist auf die Bild-in-Bild-Funktion des jeweiligen Players.

Weil Standbilder in der Notiz landen, wird getippter Text als RTFD statt RTF
gespeichert (`RichText.swift`): gleiche Formatierung, aber mit Bildern.

## Auswahl fragen

Der Knopf **Fragen** in der Werkzeugleiste schaltet einen Auswahlrahmen ein:
einen Bereich der Seite aufziehen — eine Formel, einen Absatz, eine beschriftete
Skizze — und dazu *Erklären*, *Kurzfassung*, *Lösungsweg*, *Übersetzen* oder
*Abfragen* wählen. Gelesen wird der Ausschnitt mit Vision auf dem Gerät; an die
Auswertung geht nur der erkannte Text, nicht das Bild. Die Antwort lässt sich
mit einem Tipp in die Notiz übernehmen.

Der erkannte Text bleibt an der Seite hängen, damit Suche und Zusammenfassung
ihn später mitlesen.

## Stufen und Käufe

Was kostenlos ist und was nicht, steht an genau einer Stelle: `Feature.required`
in `Store.swift`. Voreinstellung:

| Stufe | Enthalten |
|-------|-----------|
| Kostenlos | Alle Stifte, Schnellmarker, Ebenen, Vorlagen, PDF, Export, Auswertung auf dem Gerät — ohne Obergrenze bei Notizen, Seiten und Ordnern |
| Plus | Aufnahme, Live-Mitschrift, Texterkennung, Videobereich, Versionsverlauf |
| Pro | Zusätzlich der Assistent: Ausschnitt erklären, Lösungsweg, Chat zur Notiz |

Zum Ändern reicht es, in `Feature.required` eine Zeile umzuhängen; Kaufseite und
Sperrhinweise ziehen automatisch nach.

### Ohne App Store Connect testen

`Products.storekit` enthält die vier Produkte mit Testpreisen. In Xcode: Schema
bearbeiten → *Run* → *Options* → **StoreKit Configuration** auf `Products.storekit`
stellen. Käufe laufen dann lokal, ohne Sandbox-Konto. Falls Xcode die Datei nicht
annimmt: *File → New → File → StoreKit Configuration File* und die vier Produkt-IDs
aus `ProductID` neu eintragen.

### Vor der ersten Einreichung

- Produkte in App Store Connect anlegen, exakt mit den IDs aus `ProductID`.
- Steuer- und Bankdaten hinterlegen — ohne die lässt sich nichts verkaufen.
- In `LegalLinks` (in `PaywallView.swift`) die eigene Datenschutzerklärung
  eintragen. Ohne erreichbare Adresse lehnt Apple die App ab.
- Preise, Laufzeit und Kündigungshinweis müssen auf der Kaufseite stehen. Sie
  stehen dort — aber ohne erfundene Streichpreise, und das sollte so bleiben.

## Auswertung

In den Einstellungen steht der Anbieter:

- **Lokal** (Voreinstellung): rechnet auf dem Gerät, ohne Netz und ohne
  Schlüssel. Kein Sprachmodell — es gewichtet Sätze, zieht Aufgabenzeilen
  heraus und sucht passende Stellen zu einer Frage.
- **Anthropic (Claude)**: echter Modellaufruf. Der Schlüssel liegt im
  Schlüsselbund des Geräts, der Notiztext geht an Anthropic.

Die Live-Mitschrift nutzt `SFSpeechRecognizer`. Ist der Schalter „Nur Erkennung
auf dem Gerät" an, verlässt nichts das iPad — dafür muss das Sprachpaket
installiert sein, sonst bleibt die Mitschrift leer und nur die Aufnahme läuft.

## iCloud-Abgleich

Der iCloud-Abgleich ist vorbereitet und im Code eingeschaltet. Das Datenmodell
ist CloudKit-tauglich (alle Eigenschaften haben Vorgaben, alle Beziehungen sind
optional). `MNotesApp.swift` nutzt die CloudKit-Datenbank; ohne gültigen
Container fällt die App automatisch auf eine rein lokale Ablage zurück, damit
keine Daten verloren gehen.

Vor dem ersten Start auf einem echten Gerät sind drei Dinge nötig:

1. In Xcode: Ziel **MNotes** → *Signing & Capabilities* → dein **Team**
   auswählen (Apple Developer Account).
2. Die Bundle-ID in eine weltweit eindeutige tauschen, etwa
   `de.deinname.andinotes` — in *Signing & Capabilities* und in
   `MNotesApp.swift` (Konstante `cloudContainerID`).
3. Im Apple Developer Portal (oder direkt in Xcode über *+ Capability → iCloud*)
   einen CloudKit-Container `iCloud.de.deinname.andinotes` anlegen und ihn in
   `MNotes.entitlements` und `MNotesApp.swift` eintragen.

Die Hintergrundmodi (`audio` und `remote-notification`) sind bereits gesetzt.
Aufnahmen liegen als Dateien in Application Support und wandern **nicht** mit;
dafür bräuchte es zusätzlich CloudKit-Assets oder einen iCloud-Ordner.

## Grenzen

- Der Code ist nicht auf einem Gerät gelaufen — er wurde ohne Xcode
  geschrieben. Rechne mit Kleinigkeiten beim ersten Übersetzen.
- Handschrifterkennung: Vision liest Druckschrift zuverlässig, Handschrift
  je nach Sauberkeit unterschiedlich gut.
- Der Textmodus arbeitet mit einem einfachen Rich-Text-Feld (fett, kursiv,
  unterstrichen über die Auswahl-Leiste von iOS). Keine Listen, keine
  Aufgabenhaken wie in der Web-Version.
- Kein Import der Notizen aus der Web-App: dort sind Striche in einem eigenen
  Format gespeichert, PencilKit erwartet ein anderes.
- Split-Screen zweier Notizen nebeneinander fehlt; auf dem iPad geht dafür
  Stage Manager mit zwei Fenstern derselben App.
- Der Assistent läuft über einen Schlüssel, den die Nutzerin selbst einträgt.
  Für den Verkauf ist das schief: entweder man verlangt kein Geld dafür, oder
  man betreibt einen eigenen Server mit eigenem Schlüssel — der kostet dann pro
  Anfrage, was ein Angebot „einmal zahlen, dauerhaft nutzen" schwierig macht.

## Web-Version

Unter [`../mnotes/`](../mnotes/) liegt dieselbe Idee als Web-App. Sie
läuft überall im Browser, auch offline, hat aber kein PencilKit — Druck und
Neigung des Apple Pencil sind dort nur eingeschränkt verfügbar.
