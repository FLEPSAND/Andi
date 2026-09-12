//
//  NoteEditorView.swift
//  MNotes
//

import SwiftUI
import SwiftData
import UIKit
import PencilKit
import PhotosUI
import UniformTypeIdentifiers

struct NoteEditorView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.scenePhase) private var scenePhase
    @Bindable var note: Note
    let tools: ToolState

    @State private var pageIndex = 0
    @State private var controller: PageCanvasController?
    @State private var showInspector = false
    @State private var inspectorTab: InspectorTab = .layers
    @State private var showTemplates = false
    @State private var showTags = false
    @State private var showPDFImporter = false
    @State private var shareItem: ShareItem?
    @State private var tagText = ""
    @State private var pdfImages: [Int: UIImage] = [:]
    @State private var status: String?
    @State private var isSelectingRegion = false
    @State private var askImage: AskImage?
    @State private var showVideo = false
    @State private var video = VideoModel()
    @State private var store = Store.shared
    @State private var showPaywall = false
    @State private var didEdit = false
    @State private var isRecognising = false
    @State private var showPhotoPicker = false
    @State private var photoItem: PhotosPickerItem?

    private var pages: [Page] { note.orderedPages }
    private var currentPage: Page? {
        let list = pages
        guard !list.isEmpty else { return nil }
        return list[min(pageIndex, list.count - 1)]
    }

    /// Ein Whiteboard hat genau eine große Fläche, keine Seiten.
    private var isWhiteboard: Bool { note.kind == .whiteboard }

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider()
            HStack(spacing: 0) {
                canvasArea
                if showVideo, store.allows(.video) {
                    Divider()
                    VideoPane(model: video,
                              onSnapshot: insertSnapshot,
                              onClose: { withAnimation { showVideo = false } })
                        .frame(width: 380)
                        .transition(.move(edge: .trailing))
                }
                if showInspector {
                    Divider()
                    InspectorView(note: note,
                                  page: currentPage,
                                  tab: $inspectorTab,
                                  controller: controller,
                                  onChange: save)
                        .frame(width: 340)
                        .transition(.move(edge: .trailing))
                }
            }
        }
        .navigationTitle(note.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { navigationToolbar }
        .sheet(isPresented: $showTemplates) {
            TemplatePicker(page: currentPage, note: note, onApply: {
                controller?.renderComposites()
                save()
            })
        }
        .sheet(item: $shareItem) { item in
            ShareSheet(items: [item.url])
        }
        .sheet(isPresented: $showPaywall) { PaywallView() }
        .sheet(item: $askImage) { item in
            AskSelectionView(image: item.image, page: currentPage) { answer in
                appendToPage(answer)
            }
        }
        .fileImporter(isPresented: $showPDFImporter,
                      allowedContentTypes: [.pdf]) { result in
            if case .success(let url) = result { importPDF(from: url) }
        }
        .photosPicker(isPresented: $showPhotoPicker,
                      selection: $photoItem,
                      matching: .images)
        .onChange(of: photoItem) { _, item in
            guard let item else { return }
            Task { await insertPhoto(item) }
        }
        .alert("Schlagwörter", isPresented: $showTags) {
            TextField("durch Komma getrennt", text: $tagText)
            Button("Sichern") {
                note.tags = tagText
                    .split(separator: ",")
                    .map { $0.trimmingCharacters(in: .whitespaces).replacingOccurrences(of: "#", with: "") }
                    .filter { !$0.isEmpty }
                save()
            }
            Button("Abbrechen", role: .cancel) { }
        }
        .overlay(alignment: .bottom) {
            if let status {
                Text(status)
                    .font(.callout)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(.thinMaterial, in: Capsule())
                    .padding(.bottom, 24)
                    .transition(.opacity)
            }
        }
        .onAppear { loadPDFImageIfNeeded() }
        .onChange(of: pageIndex) { oldValue, _ in
            loadPDFImageIfNeeded()
            // Erkennen der verlassene Seite.
            if let left = page(at: oldValue) {
                Task { await recogniseHandwritingIfNeeded(for: left) }
            }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .background {
                autoSaveVersionIfNeeded()
                if let page = currentPage {
                    Task { await recogniseHandwritingIfNeeded(for: page) }
                }
            }
        }
        .onDisappear {
            autoSaveVersionIfNeeded()
            if let page = currentPage {
                Task { await recogniseHandwritingIfNeeded(for: page) }
            }
        }
    }

    // MARK: Werkzeugleiste

    private var toolbar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                modePicker

                if tools.mode != .text {
                    Divider().frame(height: 30)
                    rulerToggle
                }

                Divider().frame(height: 30)
                Button {
                    guard store.allows(.assistant) else { showPaywall = true; return }
                    isSelectingRegion.toggle()
                    if isSelectingRegion { show("Bereich aufziehen, den die Auswertung ansehen soll.") }
                } label: {
                    Label("Fragen", systemImage: "sparkles.rectangle.stack")
                        .font(.callout)
                }
                .buttonStyle(.bordered)
                .tint(isSelectingRegion ? .accentColor : .secondary)

                Divider().frame(height: 30)
                undoRedo
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
        }
        .background(.bar)
    }

    private var modePicker: some View {
        Picker("Modus", selection: Binding(
            get: { tools.mode == .text ? ToolMode.text : ToolMode.draw },
            set: { tools.mode = $0 }
        )) {
            Text("Zeichnen").tag(ToolMode.draw)
            Text("Text").tag(ToolMode.text)
        }
        .pickerStyle(.segmented)
        .frame(width: 180)
    }

    private var rulerToggle: some View {
        Toggle(isOn: Binding(get: { tools.isRulerActive },
                             set: { tools.isRulerActive = $0 })) {
            Image(systemName: "ruler")
        }
        .toggleStyle(.button)
        .help("Lineal")
    }

    private var undoRedo: some View {
        HStack(spacing: 6) {
            Button {
                controller?.undo()
            } label: {
                Image(systemName: "arrow.uturn.backward")
            }
            Button {
                controller?.redo()
            } label: {
                Image(systemName: "arrow.uturn.forward")
            }
            Button {
                showInspector.toggle()
            } label: {
                Image(systemName: showInspector ? "sidebar.trailing" : "sidebar.right")
            }
        }
        .buttonStyle(.bordered)
    }

    // MARK: Zeichenfläche

    private var canvasArea: some View {
        ZStack(alignment: .leading) {
            VStack(spacing: 0) {
                if let page = currentPage {
                    PageCanvas(page: page,
                               tools: tools,
                               pdfImage: pdfImages[page.index],
                               isSelectingRegion: isSelectingRegion,
                               onChange: save,
                               onController: { found in
                                   DispatchQueue.main.async { controller = found }
                               },
                               onRegionSelected: { rect in
                                   isSelectingRegion = false
                                   guard let image = controller?.image(of: rect) else {
                                       show("Der Ausschnitt ließ sich nicht lesen.")
                                       return
                                   }
                                   askImage = AskImage(image: image)
                               })
                        .id(page.persistentModelID)
                } else {
                    ContentUnavailableView("Keine Seite", systemImage: "doc")
                }
                if !isWhiteboard {
                    pageStrip
                }
            }

            if tools.mode != .text {
                PenRail(tools: tools, onRemoveLastMark: { controller?.removeLastMark() })
                    .padding(8)
                    .background {
                        RoundedRectangle(cornerRadius: 18)
                            .fill(.thinMaterial)
                            .allowsHitTesting(false)
                    }
                    .padding(.leading, 8)
            }
        }
    }

    private var pageStrip: some View {
        HStack(spacing: 12) {
            Button {
                pageIndex = max(0, pageIndex - 1)
            } label: {
                Image(systemName: "chevron.left")
            }
            .disabled(pageIndex == 0)

            Text("Seite \(pageIndex + 1) von \(pages.count)")
                .font(.caption)
                .monospacedDigit()

            Button {
                pageIndex = min(pages.count - 1, pageIndex + 1)
            } label: {
                Image(systemName: "chevron.right")
            }
            .disabled(pageIndex >= pages.count - 1)

            Divider().frame(height: 20)

            Button {
                controller?.zoom(by: 1 / 1.3)
            } label: {
                Image(systemName: "minus.magnifyingglass")
            }
            Button {
                controller?.zoomToFitAnimated()
            } label: {
                Image(systemName: "arrow.up.left.and.down.right.magnifyingglass")
            }
            Button {
                controller?.zoom(by: 1.3)
            } label: {
                Image(systemName: "plus.magnifyingglass")
            }

            Spacer()

            if let page = currentPage, page.orderedLayers.count > 1 {
                Text("Ebene \(page.activeLayerIndex + 1)/\(page.orderedLayers.count)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Button {
                addPage()
            } label: {
                Label("Seite", systemImage: "plus.rectangle.on.rectangle")
                    .font(.caption)
            }
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .background(.bar)
    }

    // MARK: Navigationsleiste

    @ToolbarContentBuilder
    private var navigationToolbar: some ToolbarContent {
        ToolbarItem(placement: .topBarTrailing) {
            Button {
                note.isStarred.toggle()
                save()
            } label: {
                Image(systemName: note.isStarred ? "star.fill" : "star")
            }
        }

        ToolbarItem(placement: .topBarTrailing) {
            Button {
                if store.allows(.video) { withAnimation { showVideo.toggle() } }
                else { showPaywall = true }
            } label: {
                Image(systemName: showVideo ? "play.rectangle.fill" : "play.rectangle")
            }
        }

        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Section("Seite") {
                    Button("Bild einfügen…") { showPhotoPicker = true }
                    Button("Vorlage wählen…") { showTemplates = true }
                    if !isWhiteboard {
                        Button("Seite anhängen") { addPage() }
                        Button("Seite verlängern") { extendPage() }
                        Button("Seite duplizieren") { duplicatePage() }
                        Button("Seite löschen", role: .destructive) { deletePage() }
                    }
                }
                Section("Notiz") {
                    Button("PDF öffnen…") { showPDFImporter = true }
                    Button("Schlagwörter…") {
                        tagText = note.tags.joined(separator: ", ")
                        showTags = true
                    }
                    Button("Version sichern") {
                        if store.allows(.versions) { saveVersion() }
                        else { showPaywall = true }
                    }
                }
                Section("Ansicht") {
                    Button {
                        let current = AppSettings.shared.appearance
                        AppSettings.shared.appearance = current == .dark ? .light : .dark
                    } label: {
                        Label(AppSettings.shared.appearance == .dark ? "Heller Modus" : "Dunkler Modus",
                              systemImage: AppSettings.shared.appearance == .dark ? "sun.max" : "moon")
                    }
                }
                Section("Teilen") {
                    Button("Als PDF") { exportPDF() }
                    Button("Seite als Bild") { exportPNG() }
                    Button("Text als Markdown") { exportMarkdown() }
                }
                Section {
                    Button("Notiz löschen", role: .destructive) {
                        context.delete(note)
                    }
                }
            } label: {
                Image(systemName: "ellipsis.circle")
            }
        }
    }

    // MARK: Aktionen

    private func save() {
        note.touch()
        didEdit = true
    }

    /// Appends assistant output to the page's typed text.
    private func appendToPage(_ text: String) {
        guard let page = currentPage else { return }
        page.setRTF(RichText.appending(text, to: page.textRTF))
        controller?.renderComposites()
        save()
        show("Übernommen.")
    }

    /// Legt ein Foto aus der Mediathek unten an die Seite. Verkleinert wird in
    /// `RichText`, damit ein Urlaubsfoto die Notiz nicht sprengt.
    private func insertPhoto(_ item: PhotosPickerItem) async {
        defer { photoItem = nil }
        guard let data = try? await item.loadTransferable(type: Data.self),
              let image = UIImage(data: data) else {
            show("Das Bild ließ sich nicht laden.")
            return
        }
        guard let page = currentPage else { return }
        page.setRTF(RichText.appending(image: image,
                                       width: page.size.width - 80,
                                       to: page.textRTF))
        controller?.renderComposites()
        save()
        show("Bild eingefügt.")
    }

    /// Drops a still frame with its timestamp into the page.
    private func insertSnapshot(_ image: UIImage, at time: String) {
        guard let page = currentPage else { return }
        page.setRTF(RichText.appending(image: image,
                                       caption: "Video bei \(time)",
                                       width: page.size.width - 80,
                                       to: page.textRTF))
        controller?.renderComposites()
        save()
        show("Standbild bei \(time) eingefügt.")
    }

    private func show(_ message: String) {
        withAnimation { status = message }
        Task {
            try? await Task.sleep(for: .seconds(2.5))
            withAnimation { status = nil }
        }
    }

    private func addPage() {
        let template = currentPage?.template ?? .lines
        let page = Page(index: pages.count, template: template)
        note.pages = pages + [page]
        save()
        pageIndex = pages.count - 1
    }

    private func extendPage() {
        currentPage?.extend(by: 400)
        controller?.renderComposites()
        save()
        show("Seite verlängert.")
    }

    private func duplicatePage() {
        guard let source = currentPage else { return }
        let copy = Page(index: source.index + 1,
                        template: source.template,
                        size: source.size)
        copy.setRTF(source.textRTF)
        copy.layers = source.orderedLayers.map { layer in
            let new = InkLayer(name: layer.name, index: layer.index)
            new.drawingData = layer.drawingData
            new.isVisible = layer.isVisible
            return new
        }
        var list = pages
        list.insert(copy, at: min(source.index + 1, list.count))
        for (index, page) in list.enumerated() { page.index = index }
        note.pages = list
        save()
    }

    private func deletePage() {
        guard pages.count > 1, let page = currentPage else {
            show("Die letzte Seite bleibt.")
            return
        }
        // Absichtlich ohne Stufenprüfung: das ist keine Funktion, sondern ein
        // Netz vor einer Löschung. Wer nicht zahlt, sieht den Verlauf nicht,
        // verliert seine Seite aber auch nicht endgültig.
        saveVersion(label: "vor Seite löschen", silent: true)
        context.delete(page)
        let remaining = note.orderedPages.filter { $0.persistentModelID != page.persistentModelID }
        for (index, item) in remaining.enumerated() { item.index = index }
        pageIndex = max(0, pageIndex - 1)
        save()
    }

    private func saveVersion(label: String = "manuell", silent: Bool = false) {
        let snapshot = VersionSnapshot(note: note)
        guard let data = try? JSONEncoder().encode(snapshot) else { return }
        let version = NoteVersion(label: label, snapshot: data)
        note.versions = (note.versions ?? []) + [version]
        // Keep the history short; snapshots hold every stroke of every page.
        let all = note.orderedVersions
        if all.count > 15 {
            for old in all.dropFirst(15) { context.delete(old) }
        }
        note.touch()
        didEdit = false
        if !silent { show("Version gesichert.") }
    }

    /// Saves an automatic version when leaving or backgrounding a note that
    /// has unsnapshotted edits — honours the "Automatisch Versionen sichern"
    /// setting in the preferences.
    private func autoSaveVersionIfNeeded() {
        guard store.allows(.versions), AppSettings.shared.autoVersions, didEdit else { return }
        saveVersion(label: "automatisch", silent: true)
    }

    // MARK: Automatische Handschrifterkennung

    /// Recognises handwriting on a page in the background, once per changed
    /// ink. Honours the `autoOCR` setting and the Plus tier.
    private func recogniseHandwritingIfNeeded(for page: Page) async {
        // Whiteboard überspringen: scale 3 greift hier die Begrenzung aus
        // Aufgabe 3 (auf 1,0), Vision liest Handschrift dann nicht zuverlässig.
        // Manuell im Inspektor bleibt die Erkennung möglich.
        guard note.kind != .whiteboard else { return }

        guard AppSettings.shared.autoOCR, store.allows(.ocr), !isRecognising else { return }

        let fingerprint = inkFingerprint(for: page)
        // Unchanged? The stored text is still current.
        guard fingerprint != page.ocrSourceHash else { return }
        // No ink at all — nothing to recognise, don't even render.
        guard page.orderedLayers.contains(where: { ($0.drawingData?.count ?? 0) > 0 }) else { return }

        isRecognising = true
        defer { isRecognising = false }

        // Ink-only render. `Page` is not Sendable, so this stays on the
        // MainActor; the recognition itself runs off the actor via `await`.
        let image = PageRenderer.flatten(page: page,
                                         pdfData: nil,
                                         scale: 3,
                                         includeTemplate: false,
                                         includeText: false)

        do {
            let text = try await OCRService.recognize(image: image)
            if !text.isEmpty {
                page.ocrText = text
                note.touch()
            }
            // Remember what we looked at so unchanged ink isn't re-read.
            page.ocrSourceHash = fingerprint
        } catch {
            // Leave the hash untouched so a later trigger tries again.
        }
    }

    /// Cheap fingerprint of the ink: per-layer byte counts. It changes only
    /// when a stroke is added, removed or replaced.
    private func inkFingerprint(for page: Page) -> String {
        page.orderedLayers
            .map { "\($0.drawingData?.count ?? 0)" }
            .joined(separator: "-")
    }

    private func page(at index: Int) -> Page? {
        let list = pages
        guard list.indices.contains(index) else { return nil }
        return list[index]
    }

    // MARK: PDF

    private func loadPDFImageIfNeeded() {
        guard let page = currentPage,
              let pdfPageIndex = page.pdfPageIndex,
              let data = note.pdfData,
              pdfImages[page.index] == nil else { return }
        let size = page.size
        let slot = page.index
        Task.detached(priority: .userInitiated) {
            let image = PDFImporter.renderPage(data: data, index: pdfPageIndex, size: size)
            await MainActor.run {
                guard let image else { return }
                pdfImages[slot] = image
                controller?.pdfImage = image
                controller?.renderComposites()
            }
        }
    }

    private func importPDF(from url: URL) {
        let accessed = url.startAccessingSecurityScopedResource()
        defer { if accessed { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else {
            show("PDF ließ sich nicht lesen.")
            return
        }
        guard let imported = PDFImporter.pages(from: data) else {
            show("Das PDF hat keine Seiten.")
            return
        }
        let newNote = Note(title: url.deletingPathExtension().lastPathComponent,
                           kind: .pdf,
                           icon: "📕",
                           folder: note.folder)
        newNote.pdfData = data
        newNote.pages = imported.enumerated().map { index, info in
            let page = Page(index: index, template: .blank, size: info.size, pdfPageIndex: index)
            page.pdfText = info.text
            return page
        }
        context.insert(newNote)
        show("\(imported.count) Seiten importiert.")
    }

    // MARK: Export

    private func exportPDF() {
        guard let url = ExportService.pdf(note: note, pdfData: note.pdfData) else {
            show("Export fehlgeschlagen.")
            return
        }
        shareItem = ShareItem(url: url)
    }

    private func exportPNG() {
        guard let controller, let page = currentPage,
              let url = ExportService.png(image: controller.flatten(scale: 3),
                                          name: "\(note.displayTitle)-Seite-\(page.index + 1)") else {
            show("Export fehlgeschlagen.")
            return
        }
        shareItem = ShareItem(url: url)
    }

    private func exportMarkdown() {
        guard let url = ExportService.markdown(note: note) else {
            show("Export fehlgeschlagen.")
            return
        }
        shareItem = ShareItem(url: url)
    }
}

// MARK: - Teilen

struct ShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

struct AskImage: Identifiable {
    let id = UUID()
    let image: UIImage
}

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ controller: UIActivityViewController, context: Context) {}
}
