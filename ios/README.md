# Andi Notes für iPhone und iPad

Native App in SwiftUI. Handschrift läuft über PencilKit, es gibt also echten
Apple-Pencil-Druck, Neigung, Handballenerkennung und das Doppeltippen am Stift.
Gespeichert wird mit SwiftData auf dem Gerät.

## Bauen

Xcode 16 oder neuer, iOS 17 als Mindestversion.

```
open ios/AndiNotes/AndiNotes.xcodeproj
```

Vor dem ersten Start zwei Dinge einstellen:

1. Ziel **AndiNotes** → Reiter *Signing & Capabilities* → dein Team auswählen.
2. Die Bundle-ID `de.andi.notes` gegen eine eigene tauschen, etwa
   `de.deinname.andinotes` — sie muss weltweit eindeutig sein.

Dann Gerät auswählen und starten. Auf dem Simulator läuft alles außer
Apple Pencil und Mikrofonaufnahme sinnvoll.

Auf einem Mac mit Apple Silicon läuft die App ohne Zusatzarbeit: in Xcode als
Ziel **My Mac (Designed for iPad)** wählen. Zeichnen geht dort nur mit der Maus
oder über ein angeschlossenes iPad per Sidecar.

Das Projekt nutzt eine dateisystem-synchronisierte Gruppe: neue Dateien im
Ordner `AndiNotes/` landen automatisch im Ziel, sie müssen nicht einzeln
hinzugefügt werden. Das setzt Xcode 16 voraus.

## Aufbau

```
AndiNotes/
  AndiNotesApp.swift    Einstiegspunkt, SwiftData-Container
  Models.swift          Ordner, Notiz, Seite, Ebene, Aufnahme, Version
  ContentView.swift     Dreispaltige Navigation, Ordner- und Notizliste
  NoteEditorView.swift  Editor, Werkzeugleiste, Stiftregal, Seitenleiste unten
  PageCanvas.swift      PKCanvasView mit Ebenen, Zoom, Hintergrund, Text
  Pens.swift            Stiftvorgaben, Paletten, Werkzeugzustand
  Templates.swift       Seitenvorlagen, mit Core Graphics gezeichnet
  InspectorView.swift   Ebenen, Analyse, Chat, OCR, Audio, Verlauf
  AskSelectionView.swift  Bereich auswählen und dazu fragen
  WelcomeView.swift     Startbildschirm beim ersten Öffnen
  Services.swift        PDF, Seiten-Rendering, Export, Vision-OCR, Schlüsselbund
  AIService.swift       Auswertung lokal oder über die Claude-API
  AudioService.swift    Aufnahme und Live-Mitschrift
  Settings.swift        Einstellungen
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
fünf Paletten und freier Farbwähler; Radierer wahlweise pixel- oder
strichweise; Lasso; Lineal; Ebenen mit Sichtbarkeit, Sperre und Umbenennen;
dreizehn Seitenvorlagen; Seiten anhängen, verlängern, duplizieren, löschen;
Ordner, Schlagwörter, Favoriten und Volltextsuche über getippten, erkannten und
PDF-Text; PDF-Import samt Beschriften; Texterkennung mit Vision auf dem Gerät;
Tonaufnahme mit Live-Mitschrift; Versionsverlauf; Export als PDF, PNG und
Markdown über das Teilen-Menü; Auswahl fragen (siehe unten).

## Auswahl fragen

Der Knopf **Fragen** in der Werkzeugleiste schaltet einen Auswahlrahmen ein:
einen Bereich der Seite aufziehen — eine Formel, einen Absatz, eine beschriftete
Skizze — und dazu *Erklären*, *Kurzfassung*, *Lösungsweg*, *Übersetzen* oder
*Abfragen* wählen. Gelesen wird der Ausschnitt mit Vision auf dem Gerät; an die
Auswertung geht nur der erkannte Text, nicht das Bild. Die Antwort lässt sich
mit einem Tipp in die Notiz übernehmen.

Der erkannte Text bleibt an der Seite hängen, damit Suche und Zusammenfassung
ihn später mitlesen.

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

## iCloud-Abgleich nachrüsten

Das Datenmodell ist bereits CloudKit-tauglich: alle Eigenschaften haben
Vorgaben, alle Beziehungen sind optional, es gibt keine `unique`-Bedingungen.
Zum Einschalten:

1. Ziel → *Signing & Capabilities* → **iCloud** hinzufügen, *CloudKit*
   ankreuzen, einen Container anlegen.
2. **Background Modes** hinzufügen und *Remote notifications* ankreuzen.
3. In `AndiNotesApp.swift` die Konfiguration ersetzen:

```swift
let configuration = ModelConfiguration(
    schema: schema,
    isStoredInMemoryOnly: false,
    cloudKitDatabase: .private("iCloud.de.deinname.andinotes")
)
```

Aufnahmen liegen als Dateien in Application Support und wandern dabei **nicht**
mit; dafür bräuchte es zusätzlich CloudKit-Assets oder einen iCloud-Ordner.

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

## Web-Version

Unter [`../freenotes/`](../freenotes/) liegt dieselbe Idee als Web-App. Sie
läuft überall im Browser, auch offline, hat aber kein PencilKit — Druck und
Neigung des Apple Pencil sind dort nur eingeschränkt verfügbar.
