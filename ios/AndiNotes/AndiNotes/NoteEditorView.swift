//
//  NoteEditorView.swift
//  Andi Notes
//

import SwiftUI
import SwiftData
import UIKit
import PencilKit
import PhotosUI
import UniformTypeIdentifiers

struct NoteEditorView: View {
    @Environment(\.modelContext) private var context
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

    private var pages: [Page] { note.orderedPages }
    private var currentPage: Page? {
        let list = pages
        guard !list.isEmpty else { return nil }
        return list[min(pageIndex, list.count - 1)]
    }

    var body: some View {
        VStack(spacing: 0) {
            toolbar
            Divider()
            HStack(spacing: 0) {
                canvasArea
                if showVideo {
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
        .sheet(item: $askImage) { item in
            AskSelectionView(image: item.image, page: currentPage) { answer in
                appendToPage(answer)
            }
        }
        .fileImporter(isPresented: $showPDFImporter,
                      allowedContentTypes: [.pdf]) { result in
            if case .success(let url) = result { importPDF(from: url) }
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
        .onChange(of: pageIndex) { _, _ in loadPDFImageIfNeeded() }
    }

    // MARK: Werkzeugleiste

    private var toolbar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                modePicker

                if tools.mode != .text {
                    Divider().frame(height: 30)
                    PenRack(tools: tools)
                    Divider().frame(height: 30)
                    eraserAndLasso
                    Divider().frame(height: 30)
                    ColorRow(tools: tools)
                    Divider().frame(height: 30)
                    sliders
                }

                Divider().frame(height: 30)
                Button {
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

    private var eraserAndLasso: some View {
        HStack(spacing: 6) {
            toolButton("eraser", systemImage: "eraser", mode: .erase)
            toolButton("lasso", systemImage: "lasso", mode: .lasso)
            quickMarkButton
            Toggle(isOn: Binding(get: { tools.isRulerActive },
                                 set: { tools.isRulerActive = $0 })) {
                Image(systemName: "ruler")
            }
            .toggleStyle(.button)
            .help("Lineal")

            if tools.mode == .erase {
                Toggle(isOn: Binding(get: { tools.eraseWholeStrokes },
                                     set: { tools.eraseWholeStrokes = $0; tools.saveToDefaults() })) {
                    Text("ganze Striche")
                        .font(.caption)
                }
                .toggleStyle(.button)
            }
        }
    }

    /// Quick marker: the button switches the tool, a long press picks the
    /// line style.
    private var quickMarkButton: some View {
        Menu {
            ForEach(MarkStyle.allCases) { style in
                Button {
                    tools.markStyle = style
                    tools.mode = .quickMark
                } label: {
                    Label(style.title, systemImage: style.symbol)
                }
            }
            Divider()
            Button("Letzte Markierung entfernen") { controller?.removeLastMark() }
        } label: {
            Image(systemName: tools.markStyle.symbol)
                .frame(width: 30, height: 30)
        } primaryAction: {
            tools.mode = tools.mode == .quickMark ? .draw : .quickMark
        }
        .buttonStyle(.bordered)
        .tint(tools.mode == .quickMark ? .accentColor : .secondary)
        .help("Schnellmarker: \(tools.markStyle.title)")
    }

    private func toolButton(_ id: String, systemImage: String, mode: ToolMode) -> some View {
        Button {
            tools.mode = mode
        } label: {
            Image(systemName: systemImage)
                .frame(width: 30, height: 30)
        }
        .buttonStyle(.bordered)
        .tint(tools.mode == mode ? .accentColor : .secondary)
    }

    private var sliders: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Dicke").font(.caption2).foregroundStyle(.secondary)
                Slider(value: Binding(
                    get: { Double(tools.mode == .erase ? tools.eraserWidth : tools.width) },
                    set: { value in
                        if tools.mode == .erase { tools.eraserWidth = CGFloat(value) }
                        else { tools.width = CGFloat(value); tools.rememberCurrentPen() }
                    }
                ), in: 1...60)
                .frame(width: 110)
            }

            if tools.mode != .erase {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Deckkraft").font(.caption2).foregroundStyle(.secondary)
                    Slider(value: Binding(
                        get: { tools.opacity },
                        set: { tools.opacity = $0; tools.rememberCurrentPen() }
                    ), in: 0.1...1)
                    .frame(width: 90)
                }
            }
        }
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
            pageStrip
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
                withAnimation { showVideo.toggle() }
            } label: {
                Image(systemName: showVideo ? "play.rectangle.fill" : "play.rectangle")
            }
        }

        ToolbarItem(placement: .topBarTrailing) {
            Menu {
                Section("Seite") {
                    Button("Vorlage wählen…") { showTemplates = true }
                    Button("Seite anhängen") { addPage() }
                    Button("Seite verlängern") { extendPage() }
                    Button("Seite duplizieren") { duplicatePage() }
                    Button("Seite löschen", role: .destructive) { deletePage() }
                }
                Section("Notiz") {
                    Button("PDF öffnen…") { showPDFImporter = true }
                    Button("Schlagwörter…") {
                        tagText = note.tags.joined(separator: ", ")
                        showTags = true
                    }
                    Button("Version sichern") { saveVersion() }
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
    }

    /// Appends assistant output to the page's typed text.
    private func appendToPage(_ text: String) {
        guard let page = currentPage else { return }
        page.textRTF = RichText.appending(text, to: page.textRTF)
        controller?.renderComposites()
        save()
        show("Übernommen.")
    }

    /// Drops a still frame with its timestamp into the page.
    private func insertSnapshot(_ image: UIImage, at time: String) {
        guard let page = currentPage else { return }
        page.textRTF = RichText.appending(image: image,
                                          caption: "Video bei \(time)",
                                          width: page.size.width - 80,
                                          to: page.textRTF)
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
        copy.textRTF = source.textRTF
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
        save()
        if !silent { show("Version gesichert.") }
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

// MARK: - Stiftregal

struct PenRack: View {
    let tools: ToolState

    var body: some View {
        HStack(spacing: 4) {
            ForEach(PenPreset.all) { preset in
                Button {
                    tools.mode = .draw
                    tools.penID = preset.id
                    tools.saveToDefaults()
                } label: {
                    VStack(spacing: 3) {
                        Image(systemName: preset.symbol)
                            .font(.system(size: 16))
                        Text(preset.name)
                            .font(.system(size: 9))
                            .lineLimit(1)
                        Capsule()
                            .fill(penColor(preset))
                            .frame(width: 22, height: 3)
                    }
                    .frame(width: 62)
                    .padding(.vertical, 5)
                    .background(
                        RoundedRectangle(cornerRadius: 9)
                            .fill(isActive(preset) ? Color.accentColor.opacity(0.16) : Color.clear)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 9)
                            .strokeBorder(isActive(preset) ? Color.accentColor : .clear, lineWidth: 1)
                    )
                    .offset(y: isActive(preset) ? -3 : 0)
                }
                .buttonStyle(.plain)
                .help(preset.hint)
            }
        }
        .animation(.easeOut(duration: 0.15), value: tools.penID)
    }

    private func isActive(_ preset: PenPreset) -> Bool {
        tools.mode == .draw && tools.penID == preset.id
    }

    private func penColor(_ preset: PenPreset) -> Color {
        isActive(preset) ? tools.color : preset.color
    }
}

// MARK: - Farbreihe

struct ColorRow: View {
    let tools: ToolState

    var body: some View {
        HStack(spacing: 6) {
            Menu {
                ForEach(Palettes.names, id: \.self) { name in
                    Button(name) {
                        tools.paletteName = name
                        tools.saveToDefaults()
                    }
                }
            } label: {
                Text(tools.paletteName)
                    .font(.caption)
            }

            ForEach(Palettes.all[tools.paletteName] ?? [], id: \.self) { hex in
                Button {
                    tools.color = Color(hex: hex)
                    tools.rememberCurrentPen()
                } label: {
                    Circle()
                        .fill(Color(hex: hex))
                        .frame(width: 22, height: 22)
                        .overlay(
                            Circle().strokeBorder(
                                tools.color.hexString == hex ? Color.accentColor : Color.gray.opacity(0.35),
                                lineWidth: tools.color.hexString == hex ? 2.5 : 1
                            )
                        )
                }
                .buttonStyle(.plain)
            }

            ColorPicker("", selection: Binding(
                get: { tools.color },
                set: { tools.color = $0; tools.rememberCurrentPen() }
            ))
            .labelsHidden()
            .frame(width: 28)
        }
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
