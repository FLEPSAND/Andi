# Offene Aufgaben

Drei Funktionen fehlen noch, damit MNotes den Umfang der Vorlage erreicht.
Jede ist unten so beschrieben, dass sie ohne Rückfragen gebaut werden kann:
betroffene Dateien, vorhandene Bausteine, Entscheidungen, Fallstricke.

Reihenfolge nach Nutzen für ein Kind: erst 1, dann 2, dann 3.

## Regeln, die für alle drei gelten

**CloudKit-Schema.** Die App synchronisiert über `.private(cloudContainerID)`.
Darum gilt für jede neue Eigenschaft an einem `@Model`: sie braucht einen
Standardwert, jede neue Beziehung muss optional sein, und `@Attribute(.unique)`
ist verboten. Wird das verletzt, stürzt die App beim Start ab, nicht erst beim
Synchronisieren.

**SwiftData-Modelle sind nicht `Sendable`.** Ein `Page` oder `Note` darf nicht
in `Task.detached` wandern. Das Muster im Bestand ist: auf dem MainActor die
einfachen Werte oder das fertige Bild herausziehen, dann `await`, dann auf dem
MainActor zurückschreiben. Siehe `InspectorView.swift`, `runOCR`.

**Ergebnis prüfen.** Bauen, auf einem Gerät starten, die Funktion einmal von
Hand durchspielen. Danach committen und auf `claude/freenotes-app-lc8j99`
pushen.

---

## 1. Bibliothek als Kachelansicht

Heute ist die mittlere Spalte eine Liste (`NoteListView` in
`ContentView.swift`). Daneben soll ein Raster mit Vorschaubildern stehen,
umschaltbar. Für ein Kind ist das Wiederfinden über ein Bild deutlich
einfacher als über eine Textzeile.

### Was schon da ist

`PageRenderer.flatten(page:pdfData:scale:includeTemplate:includeText:)` in
`Services.swift` zeichnet eine Seite vollständig in ein `UIImage`: Vorlage
oder PDF, getippter Text, alle sichtbaren Ebenen, Schnellmarker. Genau das
braucht die Kachel. Für eine Vorschau reicht `scale: 0.35`, das ergibt aus
einer A4-Seite rund 208 × 295 Punkte.

### Zu bauen

- Umschalter Liste/Raster. Er gehört in `AppSettings` (`Settings.swift`)
  neben `autoVersions`, mit demselben Muster aus `didSet` und einer Zeile im
  `init`. Schlüssel `libraryLayout`, Standard: Raster.
- Der Knopf dafür in die Werkzeugleiste von `NoteListView`, neben den
  vorhandenen Knopf für eine neue Notiz.
- Raster über `LazyVGrid` mit
  `[GridItem(.adaptive(minimum: 150), spacing: 14)]` in einer `ScrollView`.
- Kachel: Vorschaubild oben, darunter Titel, Datum und Seitenzahl. Favorit
  als kleiner Stern über dem Bild. Für eine Notiz im Papierkorb statt des
  Datums die verbleibenden Tage, `note.daysLeftInTrash`.
- Vorschaubild der **ersten** Seite, `note.orderedPages.first`.

### Zwischenspeicher

Ohne Zwischenspeicher wird beim Scrollen jede sichtbare Seite neu gezeichnet,
das ruckelt sofort. Also:

- Ein `final class ThumbnailCache` mit einem `NSCache<NSString, UIImage>`,
  als `static let shared`.
- Schlüssel aus der Kennung der Notiz und `note.updatedAt`. Ändert sich die
  Notiz, ändert sich der Schlüssel, das alte Bild fällt von selbst heraus.
- `cache.countLimit` auf etwa 120 setzen.
- Gezeichnet wird in einem `.task` pro Kachel, damit nur Sichtbares
  gerendert wird. Weil `Page` nicht `Sendable` ist, bleibt das Zeichnen auf
  dem MainActor. Das ist vertretbar, solange der Zwischenspeicher greift.

### Fallstrick: Auswahl

`List(selection:)` bringt die Auswahl in der `NavigationSplitView` von selbst
mit, ein `LazyVGrid` nicht. Jede Kachel braucht deshalb ein eigenes
`.onTapGesture { selection = note }` und einen sichtbaren Rahmen, wenn sie
die ausgewählte ist.

Ebenso fehlen im Raster die Wischgesten. Die vorhandenen Aktionen kommen als
`.contextMenu` an die Kachel:

- außerhalb des Papierkorbs: Favorit umschalten, Löschen (also
  `note.moveToTrash()`)
- im Papierkorb: Zurückholen (`note.restoreFromTrash()`), endgültig löschen
  (`context.delete(note)`)

Das Verhalten muss zur Liste passen. Ein Wisch legt in den Papierkorb, er
löscht nicht.

---

## 2. Handschrift automatisch erkennen

Die Texterkennung gibt es, sie läuft aber nur, wenn man sie im Inspektor pro
Seite anstößt. Bis dahin findet die Suche geschriebene Wörter nicht. Das soll
im Hintergrund passieren.

### Was schon da ist

- `OCRService.recognize(image:languages:)` in `Services.swift`, Vision, auf
  dem Gerät, Standard `de-DE`.
- `PageRenderer.flatten(..., includeTemplate: false, includeText: false)`
  liefert die Seite nur mit Tinte. Genau das braucht die Erkennung, und
  anders als `PageCanvasController.inkOnly` braucht es keinen lebenden
  Controller, funktioniert also für jede Seite.
- `Page.ocrText` ist das Ziel. `Note.plainText` liest es bereits mit, die
  Suche greift also sofort.

### Zu bauen

- Schalter `autoOCR` in `AppSettings`, Muster wie `autoVersions`. **Standard
  aus.** Die Erkennung kostet Rechenzeit und Akku, das gehört nicht
  ungefragt eingeschaltet.
- Den Schalter in `SettingsView` neben den für automatische Versionen, mit
  einem Satz Erklärung darunter.
- Stufenprüfung: `Store.shared.allows(.ocr)`. Texterkennung gehört zu Plus.
  Ohne Kauf läuft nichts, auch nicht im Hintergrund.
- Auslöser in `NoteEditorView`, an denselben Stellen wie
  `autoSaveVersionIfNeeded`: `.onDisappear` und `scenePhase == .background`.
  Zusätzlich beim Seitenwechsel, also im vorhandenen
  `.onChange(of: pageIndex)`, dort für die **verlassene** Seite.
- Ablauf: auf dem MainActor das Bild rendern, `await` auf die Erkennung,
  auf dem MainActor `page.ocrText` setzen und `note.touch()` rufen.

### Nicht bei jedem Auslöser neu rechnen

Sonst läuft die Erkennung bei jedem Blättern erneut über unveränderte Seiten.

- Neue Eigenschaft an `Page`: `var ocrSourceHash: String = ""`. Standardwert
  nicht vergessen, sonst bricht CloudKit.
- Vor dem Rendern einen billigen Fingerabdruck über die Ebenen bilden, etwa
  die Summe der Byte-Längen aller `drawingData` plus die Anzahl der Ebenen,
  als Zeichenkette.
- Stimmt er mit `ocrSourceHash` überein, nichts tun. Sonst erkennen und
  danach den neuen Wert setzen.
- Bei leerer Seite ohne Tinte gar nicht erst rendern.

### Fallstrick

Zwei Erkennungen dürfen nicht gleichzeitig auf derselben Seite laufen. Ein
`@State private var isRecognising = false` in `NoteEditorView` reicht, weil
der Editor ohnehin nur eine Notiz gleichzeitig zeigt.

---

## 3. Whiteboard

Eine endlose Fläche ohne Seitenränder, zum Sammeln statt zum Schreiben.

### Empfohlener Weg

Nicht wirklich endlos bauen, sondern eine sehr große Seite. Der Grund: die
Architektur trägt das schon.

- `PKCanvasView` ist eine Scroll-View, Zoom und Verschieben kommen von ihr.
  Eine große `contentSize` genügt, es ist kein neues Bedienkonzept nötig.
- Das Zusammensetzen der Ebenen in `PageCanvasController.renderComposites`
  arbeitet in Seitenkoordinaten und ist von der Größe unabhängig.
- Der Export in `ExportService.pdf` rendert pro Seite und kommt damit
  ebenfalls zurecht.

Eine wirklich mitwachsende Fläche würde Geometrie, Zoom und Export anfassen.
Der Gewinn steht nicht dafür.

### Zu bauen

- `NoteKind` in `Models.swift` um `case whiteboard` erweitern. `kindRaw` hat
  einen Standardwert, das ist CloudKit-sicher.
- In `PageGeometry` eine zweite Größe daneben:
  `static let board = CGSize(width: 4000, height: 3000)`.
- Beim Anlegen: ein zweiter Knopf neben „neue Notiz", der eine Notiz mit
  `kind: .whiteboard` und einer Seite in `board`-Größe erzeugt, Vorlage
  `.blank` oder `.dots`.
- Im Editor für diese Art ausblenden: `pageStrip`, „Seite
  anhängen", „Seite verlängern", „Seite duplizieren", „Seite löschen". Ein
  Whiteboard hat genau eine Fläche.
- Beim Öffnen nicht auf die ganze Fläche herauszoomen, sondern auf die obere
  linke Ecke in etwa Originalgröße. `zoomToFit` in `PageCanvas.swift` (Zeile 336)
  entsprechend abzweigen.
- Eigenes Symbol in `Note.displayIcon`, damit die Kachelansicht aus Aufgabe 1
  ein Whiteboard auf einen Blick zeigt.

### Fallstrick: Bildgröße

Das ist der eine Punkt, an dem es sonst wirklich knallt.
`PKDrawing.image(from:scale:)` und `PageRenderer.flatten` erzeugen ein Bitmap
in `Größe × scale`. Bei 4000 × 3000 und `scale: 2` sind das 96 Millionen
Bildpunkte, rund 384 MB. Das überlebt kein iPhone.

Also in `PageRenderer.flatten` **und** in `renderComposites` den Maßstab
begrenzen, bevor gerendert wird:

```swift
let maxEdge: CGFloat = 4000
let safeScale = min(scale, maxEdge / max(size.width, size.height))
```

Für eine A4-Seite ändert das nichts, für ein Whiteboard verhindert es den
Absturz. Diese Begrenzung gilt auch für die Vorschaubilder aus Aufgabe 1 und
für den PDF-Export.
