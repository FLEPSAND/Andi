# Offene Aufgaben

Drei Funktionen fehlen noch, damit MNotes den Umfang der Vorlage erreicht.
Jede ist unten so beschrieben, dass sie ohne Rückfragen gebaut werden kann:
betroffene Dateien, vorhandene Bausteine, Entscheidungen, Fallstricke.

Aufgabe 1 bis 3 und 5a sind erledigt. Aufgabe 6 ist gebaut, aber noch
nicht gepusht. Offen sind Aufgabe 4, 5b und 7.

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

## 1. Bibliothek als Kachelansicht — erledigt

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

## 2. Handschrift automatisch erkennen — erledigt

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

## 3. Whiteboard — erledigt

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

---

## 4. Die automatische Erkennung darf das Blättern nicht bremsen

Aufgabe 2 läuft, hat aber eine spürbare Kante. `recogniseHandwritingIfNeeded`
rendert die Seite mit `scale: 3`. Bei A4 sind das 1785 × 2526 Bildpunkte,
also 4,5 Megapixel, und das entsteht auf dem MainActor.

Bei zwei der drei Auslöser stört das niemanden: beim Verlassen der Notiz und
beim Wechsel in den Hintergrund schaut ohnehin keiner hin. Beim Blättern
schon. Dort fällt die Bildberechnung genau in den Moment, in dem die neue
Seite erscheinen soll.

### Erst messen

Schalte „Handschrift automatisch erkennen" ein, schreib etwas auf zwei Seiten
und blättere hin und her. Wenn es sich flüssig anfühlt, lass es wie es ist
und streich diese Aufgabe. Ein Hänger, den man nicht sieht, ist keiner.

### Falls es hakt

Zwei Wege, aufsteigend nach Aufwand:

1. **Maßstab senken.** `scale: 3` auf `2` ändern. Ein Drittel weniger Kante,
   also weniger als die Hälfte der Bildpunkte. Vision erkennt Handschrift bei
   dieser Auflösung weiterhin ordentlich. Danach noch einmal prüfen, ob die
   Erkennung schlechter wird — der manuelle Weg im Inspektor bleibt bei 3,
   du kannst also direkt vergleichen.

2. **Aus dem MainActor heraus.** Das Zeichnen braucht kein `Page`, nur die
   `drawingData` der sichtbaren Ebenen und die Seitengröße. Beides ist
   `Sendable`. Also: auf dem MainActor `[Data]` und `CGSize` einsammeln,
   damit in einen `Task.detached` gehen, dort `PKDrawing(data:)` und
   `image(from:scale:)` aufrufen und das Bild zurückgeben.

   Vorsicht: Apple sagt nirgends zu, dass `PKDrawing.image(from:scale:)`
   außerhalb des MainActors laufen darf. In der Praxis funktioniert es, aber
   das ist eine Zusicherung, die niemand gegeben hat. Wenn du diesen Weg
   gehst, dann probier ihn auf einem echten Gerät mit einer vollgeschriebenen
   Seite aus, nicht nur im Simulator.

Ich würde mit Weg 1 anfangen und Weg 2 nur nehmen, wenn das nicht reicht.

---

## 5. Whiteboard und die beiden Bildberechnungen

Aufgabe 2 und 3 sind einzeln richtig, treffen sich aber an einer Stelle, die
in keiner der beiden Vorgaben stand. Beide rendern die Seite in ein Bitmap,
und bei einem Whiteboard ist die Seite 4000 × 3000 Punkte groß.

Die Begrenzung aus Aufgabe 3 verhindert den Absturz. Sie senkt den Maßstab
auf 1,0, es bleiben also 12 Megapixel und rund 48 MB pro Bild. Das überlebt
ein iPhone, aber es ist kein Nebenbei.

### 5a. Automatische Erkennung auf einem Whiteboard abschalten — erledigt

Das ist der klare Fall, und er kostet eine Zeile.

`recogniseHandwritingIfNeeded` rendert mit `scale: 3`. Bei A4 ergibt das
1785 × 2526, bei einem Whiteboard greift die Begrenzung und es bleiben
4000 × 3000. Zwei Dinge daran sind falsch:

- Es sind 48 MB und eine lange Rechnung auf dem MainActor, ausgelöst beim
  Verlassen der Notiz.
- Es bringt nichts. Handschrift auf einem Whiteboard ist genauso groß wie
  auf A4, wird hier aber mit einem Drittel der Auflösung abgetastet. Vision
  liest das nicht zuverlässig.

Also am Anfang der Funktion aussteigen:

```swift
guard note.kind != .whiteboard else { return }
```

Ein Whiteboard ist zum Sammeln da, nicht zum Durchsuchen. Wer den Text
trotzdem braucht, kann die Erkennung im Inspektor weiterhin von Hand
anstoßen.

### 5b. Der Hintergrund eines Whiteboards, falls es hakt

`renderComposites` legt das Hintergrundbild **immer** an, auch wenn es nur
das Punktraster enthält. Bei einem Whiteboard sind das 48 MB, solange es
geöffnet ist. Kommen sichtbare Ebenen über der aktiven dazu, noch einmal
so viel.

Erst ausprobieren: ein Whiteboard anlegen, zwei, drei Ebenen füllen, zoomen,
zwischen Notizen wechseln. Wenn nichts stockt und die App nicht wegen
Speicher beendet wird, lass es.

Falls doch, ist der saubere Weg nicht ein kleinerer Maßstab, sondern gar
kein Bitmap: das Punktraster ist ein sich wiederholendes Muster. Eine
Kachel von etwa 40 × 40 Punkten als `UIColor(patternImage:)` auf
`backgroundView.backgroundColor` ist bei jedem Zoom scharf und kostet
Kilobytes statt Megabytes. Das Hintergrundbild wird dann nur noch gebraucht,
wenn tatsächlich Ebenen unter der aktiven liegen.

Das ist mehr Arbeit als 5a und lohnt sich nur, wenn das Problem messbar ist.

---

## 6. Die Stifte als senkrechte Leiste am Rand

Der Wunsch kommt vom Nutzer, nach einem Vergleich mit der Vorlage: die
Stifte sollen nicht als kleine Symbolreihe in der oberen Leiste liegen,
sondern als senkrechte Leiste am linken Rand der Seite, und sie sollen
aussehen wie Stifte statt wie Piktogramme. Der ausgewählte Stift schiebt
sich seitlich heraus.

**Was nicht übernommen wird:** keine Grafiken, Symbole oder Farbwerte aus
der Vorlage. Eine senkrechte Werkzeugleiste ist ein allgemeines
Bedienmuster und frei verwendbar, die konkrete Zeichnung eines fremden
Herstellers nicht. Die Stiftformen werden hier selbst gezeichnet.

### Was heute da ist

- `PenRack` in `NoteEditorView.swift` ab Zeile 752: eine `HStack` mit
  SF-Symbol, Name und einem farbigen Balken je Stift. Der aktive Stift
  bekommt einen Rahmen und wandert 3 Punkte nach oben.
- `ColorRow` ab Zeile 803 und `sliders` ab Zeile 286 stehen in derselben
  oberen Leiste.
- `PenPreset.all` in `Pens.swift` ab Zeile 48: neun Stifte mit `name`,
  `inkRaw`, `width`, `colorHex`, `opacity`, `hint`.
- `ToolState` hält `penID`, `color`, `width`, `opacity`, und merkt sich
  über `loadPreferences`/`rememberCurrentPen` je Stift eigene Werte.

### Zu bauen

Eine neue Datei `PenRail.swift` mit zwei Ansichten.

**`PenShape`** zeichnet einen Stift, etwa 34 Punkte breit und 96 hoch,
liegend nach rechts zeigend:

- Ein Schaft als `RoundedRectangle`, gefüllt in der aktuellen Farbe des
  Stifts (`ToolState.preferences`, sonst `preset.colorHex`).
- Eine Spitze als `Path` aus drei Punkten, ein Dreieck nach rechts.
- Die Form unterscheidet sich je `inkRaw`, damit die neun Stifte
  unterscheidbar bleiben:
  - `fountainPen`: schmale, lange Spitze mit einem Schlitz in der Mitte
  - `pen`: kurze, stumpfe Spitze mit einer kleinen Kugel vorn
  - `monoline`: dünner Schaft, sehr spitze Spitze
  - `pencil`: sechseckiger Schaft (ein `Path`, kein Rechteck), Spitze
    holzfarben mit dunkler Mine
  - `marker`: breiter Schaft, abgeschrägte Spitze, Farbe halbtransparent
  - `crayon`: kurzer, dicker Schaft mit gerundeter Spitze
  - `watercolor`: Schaft mit einem angedeuteten Pinselkopf aus Borsten
- Der Schaft bekommt oben einen hellen Streifen als angedeuteten Glanz.
  Ein `LinearGradient` von Weiß mit 0,25 Deckkraft nach Klar reicht.

**`PenRail`** ist die Leiste selbst:

- Senkrechte `VStack` mit 6 Punkten Abstand, in einer `ScrollView`, damit
  sie auf dem iPhone im Querformat nicht abgeschnitten wird.
- Oben die drei Werkzeuge, die keine Stifte sind: Radierer, Lasso,
  Schnellmarker, Formen. Als kleine runde Knöpfe mit SF-Symbol, nicht als
  Stiftform.
- Darunter die neun Stifte als `PenShape`.
- Der aktive Stift schiebt sich um 14 Punkte nach rechts heraus
  (`.offset(x:)` mit `.animation(.spring(response: 0.28, dampingFraction: 0.8))`).
- Ein Tipp auf einen bereits aktiven Stift öffnet einen `.popover` mit
  Farbwähler, Strichbreite und Deckkraft. Das ist der neue Ort für
  `ColorRow` und `sliders`.
- Ganz unten ein Knopf für die Farbpalette.

### Einbau in den Editor

In `NoteEditorView`:

- `canvasArea` in eine `HStack` legen, links die `PenRail` mit fester
  Breite von 56 Punkten, rechts die bisherige Leinwand.
- Die Leiste über die Leinwand legen statt daneben, mit
  `.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))`
  und 8 Punkten Abstand vom Rand. So bleibt die Seite so groß wie bisher.
- Aus der oberen Leiste entfernen: `PenRack`, `ColorRow`, `sliders` und
  `eraserAndLasso`. Dort bleiben nur noch Moduswahl, der Knopf „Fragen",
  Lineal und Rückgängig.
- Im Textmodus (`tools.mode == .text`) die Leiste ausblenden.
- Auf dem iPhone im Hochformat ist links wenig Platz. Dort die Leiste
  schmaler machen (40 Punkte) und die Stifte entsprechend kleiner
  zeichnen. `horizontalSizeClass == .compact` ist die Unterscheidung.

### Worauf zu achten ist

- `ToolState.rememberCurrentPen()` muss weiterhin gerufen werden, wenn
  Farbe, Breite oder Deckkraft im Popover geändert werden. Sonst vergisst
  ein Stift seine Einstellungen.
- Die Stiftfarbe in der Leiste muss die **eingestellte** Farbe zeigen,
  nicht die Vorgabe aus `PenPreset`. Also über `ToolState` gehen.
- Die Leiste darf keine Zeicheneingaben abfangen. Sie liegt neben der
  Leinwand, nicht darüber; wenn sie als Overlay gebaut wird, braucht der
  Bereich außerhalb der Knöpfe `.allowsHitTesting(false)`.

### Danach

Bauen, auf dem iPad ansehen, und zwar im Quer- und im Hochformat.
Die Stiftformen sind der Punkt der ganzen Aufgabe. Wenn sie nach neun
gleichen Balken aussehen, ist es nicht fertig.

---

## 7. Der Editor soll die ganze Seite bekommen

Rückmeldung vom Nutzer nach dem ersten Test auf dem iPad, mit einem
Bildschirmfoto der laufenden App. Drei Dinge stören, alle betreffen das
Aussehen, nicht die Technik.

**Vorher pushen.** Aufgabe 6 liegt nur lokal. Erst committen und pushen,
dann hier weitermachen, sonst geht die Arbeit verloren und niemand kann
sie gegenlesen.

### 7a. Vollbild beim Schreiben

Heute stehen alle drei Spalten nebeneinander: Ordnerbaum, Notizliste,
Editor. Auf einem iPad bleibt für die Seite dadurch weniger als die Hälfte
der Breite. Zum Schreiben ist das der falsche Zuschnitt.

In `ContentView.swift`:

- Wird eine Notiz geöffnet, `columnVisibility` auf `.detailOnly` setzen.
  Also in `.onChange(of: selectedNote)`, wenn der neue Wert nicht `nil` ist.
- Der Editor bekommt dadurch die ganze Fläche. Zurück zur Bibliothek über
  den Knopf, den `NavigationSplitView` selbst einblendet, oder über einen
  eigenen Zurück-Pfeil links oben im Editor.
- Auf dem iPhone ändert sich nichts, dort ist ohnehin immer nur eine
  Spalte sichtbar.
- Die gewählte Einstellung nicht speichern. Wer zur Bibliothek zurückgeht
  und eine andere Notiz öffnet, will wieder Vollbild.

Die obere Leiste im Editor darf dabei schmaler werden. Moduswahl,
Lineal, „Fragen", Rückgängig und der Knopf für die Seitenleiste reichen.
Alles andere steckt in der Stiftleiste oder im Menü.

### 7b. Das Whiteboard muss auffindbar sein

Der Knopf existiert seit Aufgabe 3, oben rechts in der Notizliste, als
Rastersymbol. Der Nutzer hat ihn dreimal nicht gefunden. Ein unbeschriftetes
Symbol neben einem anderen unbeschrifteten Symbol ist kein Fundort.

In `NoteListView`:

- Über die Liste beziehungsweise das Raster eine `Picker` mit
  `.pickerStyle(.segmented)` setzen: **Alle**, **Whiteboards**, **Notizen**.
  Die Auswahl filtert über `note.kind`.
- Der Filter gehört in den lokalen `@State`, nicht in `AppSettings`. Er ist
  eine Ansicht, keine Einstellung.
- Steht der Filter auf „Whiteboards" und es gibt keine, zeigt die leere
  Ansicht einen Knopf **Whiteboard anlegen** statt nur eines Hinweises.
- Aus den beiden Symbolknöpfen oben rechts wird ein einziges `Menu` mit dem
  Plus-Symbol und zwei beschrifteten Einträgen: **Neue Notiz** und
  **Neues Whiteboard**. Beschriftung schlägt Symbol.
- Im Papierkorb bleibt der Filter ausgeblendet.

### 7c. Die Stifte sehen noch nicht nach Stiften aus

Aus dem Bildschirmfoto: die neun Stifte sind kurze, fast gleich geformte
Klötzchen, die sich nur in der Farbe unterscheiden. Sie sollen auf einen
Blick auseinanderzuhalten sein, auch bei gleicher Farbe.

Vier Punkte, die den Unterschied machen:

1. **Länger machen.** Etwa 76 Punkte statt der jetzigen Länge, bei 26
   Punkten Höhe. Ein Stift ist ein längliches Ding; zu kurz wirkt er wie
   ein Fleck.
2. **Heller Schaft, farbige Spitze.** Nicht der ganze Stift in der
   Schreibfarbe. Der Schaft bleibt hell (`Color(white: 0.97)`) mit einem
   feinen Rand, und nur die Spitze trägt die eingestellte Farbe. So sieht
   man Form und Farbe gleichzeitig. Beim Textmarker darf der Schaft die
   Farbe halbtransparent aufnehmen.
3. **Wirklich verschiedene Spitzen.** Das ist der eigentliche Punkt:
   - Füller: schmale Feder, zur Spitze zulaufend, mit einem dünnen Schlitz
     in der Mitte und einem runden Loch am Ansatz
   - Kugelschreiber: kegelige Metallspitze mit einer kleinen Kugel vorn
   - Fineliner: dünne, gerade Nadelspitze in einer Hülse
   - Bleistift: angespitztes Holz, heller Kegel mit dunkler Mine, Schaft
     sechseckig gezeichnet
   - Pinsel: Borstenbündel, nach vorn spitz zulaufend, leicht gewellter
     Umriss
   - Textmarker: breite, schräg angeschnittene Keilspitze
   - Wachsmaler: stumpf und dick, mit einer Papierbanderole um den Schaft
   - Wasserfarbe: runder, weicher Pinselkopf
   - Neon: wie der Textmarker, aber mit einem Schein um die Spitze
     (`.shadow(color: farbe.opacity(0.6), radius: 6)`)
4. **Gruppen trennen.** Zwischen Werkzeugen (Radierer, Lasso, Form,
   Schnellmarker) und Stiften ein `Divider` mit 8 Punkten Abstand, und ein
   zweiter vor der Farbpalette ganz unten.

Der aktive Stift schiebt sich weiterhin nach rechts heraus, und zwar
deutlich: 16 Punkte, mit einem weichen Schatten unter dem Stift, damit er
über den anderen zu schweben scheint.

**Nicht übernehmen:** Grafiken, Symbole, Farbwerte oder Anordnungen aus der
Vorlage. Die Formen werden mit `Path` und `Shape` selbst gezeichnet. Eine
senkrechte Leiste und ein Stift, der wie ein Stift aussieht, sind
allgemeine Gestaltungsmittel; die konkrete Zeichnung eines fremden
Herstellers ist es nicht.

### Danach

Auf dem iPad ansehen, quer und hoch. Ein Bildschirmfoto der Leiste an den
Nutzer, bevor der nächste Punkt angefasst wird. Bei Gestaltung ist eine
Rückfrage billiger als drei Runden Raten.
