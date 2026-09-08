//
//  InspectorView.swift
//  Andi Notes
//

import SwiftUI
import SwiftData
import UIKit

enum InspectorTab: String, CaseIterable, Identifiable {
    case layers, analysis, chat, ocr, audio, history

    var id: String { rawValue }

    var title: String {
        switch self {
        case .layers: return "Ebenen"
        case .analysis: return "Analyse"
        case .chat: return "Chat"
        case .ocr: return "OCR"
        case .audio: return "Audio"
        case .history: return "Verlauf"
        }
    }

    var symbol: String {
        switch self {
        case .layers: return "square.3.layers.3d"
        case .analysis: return "sparkles"
        case .chat: return "bubble.left.and.bubble.right"
        case .ocr: return "text.viewfinder"
        case .audio: return "mic"
        case .history: return "clock.arrow.circlepath"
        }
    }
}

struct InspectorView: View {
    @Environment(\.modelContext) private var context
    @Bindable var note: Note
    let page: Page?
    @Binding var tab: InspectorTab
    let controller: PageCanvasController?
    let onChange: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Picker("Bereich", selection: $tab) {
                ForEach(InspectorTab.allCases) { item in
                    Image(systemName: item.symbol).tag(item)
                }
            }
            .pickerStyle(.segmented)
            .padding(8)

            Divider()

            Group {
                switch tab {
                case .layers:
                    LayersPanel(page: page, controller: controller, onChange: onChange)
                case .analysis:
                    AnalysisPanel(note: note, page: page, onChange: onChange)
                case .chat:
                    ChatPanel(note: note, onChange: onChange)
                case .ocr:
                    OCRPanel(page: page, controller: controller, onChange: onChange)
                case .audio:
                    AudioPanel(note: note, onChange: onChange)
                case .history:
                    HistoryPanel(note: note, onChange: onChange)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .background(.regularMaterial)
    }
}

// MARK: - Ebenen

struct LayersPanel: View {
    let page: Page?
    let controller: PageCanvasController?
    let onChange: () -> Void
    @State private var renaming: InkLayer?
    @State private var newName = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Button {
                    guard let page else { return }
                    page.addLayer()
                    controller?.apply()
                    controller?.renderComposites()
                    onChange()
                } label: {
                    Label("Neue Ebene", systemImage: "plus")
                }
                Spacer()
                Button("Leeren") {
                    controller?.clearActiveLayer()
                    controller?.renderComposites()
                    onChange()
                }
            }
            .padding(10)

            if let page {
                List {
                    // Topmost layer first, the way a layer stack is read.
                    ForEach(page.orderedLayers.reversed()) { layer in
                        LayerRow(layer: layer,
                                 isActive: page.activeLayer?.persistentModelID == layer.persistentModelID,
                                 canDelete: page.orderedLayers.count > 1,
                                 onSelect: {
                                     page.activeLayerIndex = layer.index
                                     controller?.apply()
                                     controller?.renderComposites()
                                     onChange()
                                 },
                                 onToggleVisible: {
                                     layer.isVisible.toggle()
                                     controller?.renderComposites()
                                     onChange()
                                 },
                                 onToggleLock: {
                                     layer.isLocked.toggle()
                                     controller?.apply()
                                     onChange()
                                 },
                                 onRename: {
                                     newName = layer.name
                                     renaming = layer
                                 },
                                 onDelete: { delete(layer, from: page) })
                    }
                }
                .listStyle(.plain)
            } else {
                Spacer()
            }
        }
        .alert("Ebene benennen", isPresented: Binding(get: { renaming != nil },
                                                      set: { if !$0 { renaming = nil } })) {
            TextField("Name", text: $newName)
            Button("Sichern") {
                renaming?.name = newName
                renaming = nil
                onChange()
            }
            Button("Abbrechen", role: .cancel) { renaming = nil }
        }
    }

    private func delete(_ layer: InkLayer, from page: Page) {
        guard page.orderedLayers.count > 1 else { return }
        let remaining = page.orderedLayers.filter { $0.persistentModelID != layer.persistentModelID }
        for (index, item) in remaining.enumerated() { item.index = index }
        page.layers = remaining
        page.activeLayerIndex = min(page.activeLayerIndex, max(0, remaining.count - 1))
        controller?.apply()
        controller?.renderComposites()
        onChange()
    }
}

struct LayerRow: View {
    let layer: InkLayer
    let isActive: Bool
    let canDelete: Bool
    let onSelect: () -> Void
    let onToggleVisible: () -> Void
    let onToggleLock: () -> Void
    let onRename: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(spacing: 8) {
            Button(action: onToggleVisible) {
                Image(systemName: layer.isVisible ? "eye" : "eye.slash")
                    .foregroundStyle(layer.isVisible ? Color.primary : Color.secondary)
            }
            .buttonStyle(.plain)

            Button(action: onToggleLock) {
                Image(systemName: layer.isLocked ? "lock.fill" : "lock.open")
                    .foregroundStyle(layer.isLocked ? Color.orange : Color.secondary)
            }
            .buttonStyle(.plain)

            Text(layer.name)
                .fontWeight(isActive ? .semibold : .regular)
                .frame(maxWidth: .infinity, alignment: .leading)
                .contentShape(Rectangle())
                .onTapGesture(perform: onSelect)
        }
        .listRowBackground(isActive ? Color.accentColor.opacity(0.15) : Color.clear)
        .contextMenu {
            Button("Umbenennen", action: onRename)
            if canDelete {
                Button("Löschen", role: .destructive, action: onDelete)
            }
        }
    }
}

// MARK: - Analyse

struct AnalysisPanel: View {
    let note: Note
    let page: Page?
    let onChange: () -> Void

    @State private var output = ""
    @State private var isWorking = false
    @State private var providerLabel = AIProviderFactory.make().label

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                ForEach(AITask.allCases) { task in
                    Button(task.title) { run(task) }
                        .buttonStyle(.bordered)
                        .disabled(isWorking)
                }
            }

            ScrollView {
                if isWorking {
                    HStack {
                        ProgressView()
                        Text("wird erstellt…").foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                } else if output.isEmpty {
                    Text("Grundlage ist der Text der Notiz — getippt, erkannt, aus dem PDF gelesen oder transkribiert.")
                        .font(.callout)
                        .foregroundStyle(.secondary)
                } else {
                    Text(output)
                        .font(.callout)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            if !output.isEmpty {
                Button("In die Notiz übernehmen") { insert() }
                    .buttonStyle(.borderedProminent)
            }

            Text("Auswertung: \(providerLabel)")
                .font(.caption2)
                .foregroundStyle(.secondary)
        }
        .padding(12)
        .onAppear { providerLabel = AIProviderFactory.make().label }
    }

    private func run(_ task: AITask) {
        isWorking = true
        output = ""
        let provider = AIProviderFactory.make()
        providerLabel = provider.label
        let text = note.plainText
        Task {
            do {
                let result = try await provider.analyze(task, text: text)
                await MainActor.run {
                    output = result
                    isWorking = false
                }
            } catch {
                await MainActor.run {
                    output = error.localizedDescription
                    isWorking = false
                }
            }
        }
    }

    private func insert() {
        guard let page, !output.isEmpty else { return }
        let existing: NSMutableAttributedString
        if let data = page.textRTF,
           let attributed = try? NSAttributedString(
            data: data,
            options: [.documentType: NSAttributedString.DocumentType.rtf],
            documentAttributes: nil
           ) {
            existing = NSMutableAttributedString(attributedString: attributed)
        } else {
            existing = NSMutableAttributedString()
        }
        existing.append(NSAttributedString(
            string: "\n\n" + output,
            attributes: [.font: UIFont.systemFont(ofSize: 15),
                         .foregroundColor: UIColor.black]
        ))
        page.textRTF = try? existing.data(
            from: NSRange(location: 0, length: existing.length),
            documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
        )
        onChange()
    }
}

// MARK: - Chat

struct ChatPanel: View {
    @Bindable var note: Note
    let onChange: () -> Void

    @State private var question = ""
    @State private var isWorking = false

    var body: some View {
        VStack(spacing: 8) {
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 8) {
                        if note.chat.isEmpty {
                            Text("Noch keine Fragen. Der Chat sieht den Text der geöffneten Notiz.")
                                .font(.callout)
                                .foregroundStyle(.secondary)
                        }
                        ForEach(note.chat) { message in
                            Text(message.content)
                                .font(.callout)
                                .padding(9)
                                .background(message.isUser ? Color.accentColor.opacity(0.18) : Color.secondary.opacity(0.12),
                                            in: RoundedRectangle(cornerRadius: 12))
                                .frame(maxWidth: .infinity,
                                       alignment: message.isUser ? .trailing : .leading)
                                .id(message.id)
                        }
                        if isWorking {
                            ProgressView().padding(.leading, 4)
                        }
                    }
                    .padding(10)
                }
                .onChange(of: note.chat.count) { _, _ in
                    if let last = note.chat.last { proxy.scrollTo(last.id, anchor: .bottom) }
                }
            }

            HStack(spacing: 6) {
                TextField("Frage zur Notiz…", text: $question, axis: .vertical)
                    .textFieldStyle(.roundedBorder)
                    .lineLimit(1...4)
                Button {
                    ask()
                } label: {
                    Image(systemName: "paperplane.fill")
                }
                .disabled(question.trimmingCharacters(in: .whitespaces).isEmpty || isWorking)
            }
            .padding(10)

            if !note.chat.isEmpty {
                Button("Verlauf löschen") {
                    note.chat = []
                    onChange()
                }
                .font(.caption)
                .padding(.bottom, 8)
            }
        }
    }

    private func ask() {
        let text = question.trimmingCharacters(in: .whitespaces)
        guard !text.isEmpty else { return }
        question = ""
        var history = note.chat
        history.append(ChatMessage(role: "user", content: text))
        note.chat = history
        onChange()
        isWorking = true

        let provider = AIProviderFactory.make()
        let context = note.plainText
        Task {
            let answer: String
            do {
                answer = try await provider.chat(question: text,
                                                 context: context,
                                                 history: Array(history.dropLast()))
            } catch {
                answer = "Fehler: \(error.localizedDescription)"
            }
            await MainActor.run {
                var updated = note.chat
                updated.append(ChatMessage(role: "assistant", content: answer))
                note.chat = updated
                isWorking = false
                onChange()
            }
        }
    }
}

// MARK: - OCR

struct OCRPanel: View {
    let page: Page?
    let controller: PageCanvasController?
    let onChange: () -> Void

    @State private var language = "de-DE"
    @State private var result = ""
    @State private var isWorking = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Wandelt Handschrift oder eine PDF-Seite in Text um. Läuft auf dem Gerät.")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack {
                Picker("Sprache", selection: $language) {
                    ForEach(OCRService.availableLanguages, id: \.code) { item in
                        Text(item.name).tag(item.code)
                    }
                }
                .labelsHidden()

                Button("Seite erkennen") { run() }
                    .buttonStyle(.borderedProminent)
                    .disabled(isWorking || controller == nil)
            }

            ScrollView {
                if isWorking {
                    ProgressView()
                } else {
                    Text(result.isEmpty ? "Noch nichts erkannt." : result)
                        .font(.callout)
                        .foregroundStyle(result.isEmpty ? .secondary : .primary)
                        .textSelection(.enabled)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }

            if !result.isEmpty {
                Text("Der erkannte Text hängt jetzt an der Seite und wird von Suche und Auswertung mitgelesen.")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
    }

    private func run() {
        guard let controller, let page else { return }
        isWorking = true
        let image = controller.inkOnly(scale: 3)
        let languages = [language]
        Task {
            do {
                let text = try await OCRService.recognize(image: image, languages: languages)
                await MainActor.run {
                    result = text.isEmpty ? "Kein Text erkannt." : text
                    if !text.isEmpty {
                        page.ocrText = text
                        onChange()
                    }
                    isWorking = false
                }
            } catch {
                await MainActor.run {
                    result = error.localizedDescription
                    isWorking = false
                }
            }
        }
    }
}

// MARK: - Aufnahme

struct AudioPanel: View {
    @Environment(\.modelContext) private var context
    @Bindable var note: Note
    let onChange: () -> Void

    @State private var audio = AudioService()
    @State private var player = AudioPlayer()

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Button {
                    Task { await toggle() }
                } label: {
                    Label(audio.isRecording ? "Aufnahme beenden" : "Aufnahme starten",
                          systemImage: audio.isRecording ? "stop.circle.fill" : "mic.circle.fill")
                }
                .buttonStyle(.borderedProminent)
                .tint(audio.isRecording ? .red : .accentColor)

                Text(formatDuration(audio.elapsed))
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: audio.level)
                .tint(.green)

            Toggle("Live mitschreiben", isOn: Binding(
                get: { audio.transcribeLive },
                set: { audio.transcribeLive = $0 }
            ))
            .disabled(audio.isRecording)

            Picker("Sprache", selection: Binding(
                get: { audio.localeIdentifier },
                set: { audio.localeIdentifier = $0 }
            )) {
                Text("Deutsch").tag("de-DE")
                Text("Englisch").tag("en-US")
                Text("Französisch").tag("fr-FR")
            }
            .disabled(audio.isRecording)

            if case .denied(let message) = audio.state {
                Text(message).font(.caption).foregroundStyle(.red)
            }

            if audio.isRecording || !audio.transcript.isEmpty {
                ScrollView {
                    (Text(audio.transcript) + Text(" " + audio.partial).foregroundStyle(.secondary))
                        .font(.callout)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .frame(maxHeight: 160)
            }

            Divider()

            if note.orderedRecordings.isEmpty {
                Text("Noch keine Aufnahme in dieser Notiz.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                List {
                    ForEach(note.orderedRecordings) { recording in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack {
                                Button {
                                    player.toggle(recording)
                                } label: {
                                    Image(systemName: player.playingFile == recording.fileName
                                          ? "pause.circle" : "play.circle")
                                }
                                .buttonStyle(.plain)
                                Text(recording.createdAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.caption)
                                Spacer()
                                Text(formatDuration(recording.duration))
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            if !recording.transcript.isEmpty {
                                Text(recording.transcript)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(3)
                            }
                        }
                    }
                    .onDelete(perform: deleteRecordings)
                }
                .listStyle(.plain)
            }
        }
        .padding(12)
    }

    private func toggle() async {
        if audio.isRecording {
            guard let result = audio.stop() else { return }
            let recording = Recording(fileName: result.fileName,
                                      duration: result.duration,
                                      transcript: result.transcript)
            note.recordings = (note.recordings ?? []) + [recording]
            if !result.transcript.isEmpty, let page = note.orderedPages.first {
                page.ocrText = (page.ocrText + "\n" + result.transcript)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
            }
            onChange()
        } else {
            await audio.start()
        }
    }

    private func deleteRecordings(at offsets: IndexSet) {
        let list = note.orderedRecordings
        for index in offsets {
            let recording = list[index]
            try? FileManager.default.removeItem(at: recording.fileURL)
            context.delete(recording)
        }
        onChange()
    }
}

// MARK: - Verlauf

struct HistoryPanel: View {
    @Environment(\.modelContext) private var context
    @Bindable var note: Note
    let onChange: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Eine Version enthält alle Seiten der Notiz. Beim Zurückholen wird der aktuelle Stand vorher gesichert.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.horizontal, 12)
                .padding(.top, 12)

            if note.orderedVersions.isEmpty {
                Text("Noch keine Version gesichert.")
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .padding(12)
                Spacer()
            } else {
                List {
                    ForEach(note.orderedVersions) { version in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(version.createdAt.formatted(date: .abbreviated, time: .shortened))
                                    .font(.callout)
                                Text(version.label)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Zurückholen") { restore(version) }
                                .buttonStyle(.bordered)
                                .font(.caption)
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private func restore(_ version: NoteVersion) {
        // Keep the current state before overwriting it.
        if let data = try? JSONEncoder().encode(VersionSnapshot(note: note)) {
            let backup = NoteVersion(label: "vor Wiederherstellung", snapshot: data)
            note.versions = (note.versions ?? []) + [backup]
        }
        guard let data = version.snapshot,
              let snapshot = try? JSONDecoder().decode(VersionSnapshot.self, from: data) else { return }
        snapshot.restore(into: note, context: context)
        onChange()
    }
}

// MARK: - Vorlagen

struct TemplatePicker: View {
    @Environment(\.dismiss) private var dismiss
    let page: Page?
    let note: Note
    let onApply: () -> Void

    @State private var selected: PageTemplate = .lines

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 14)]

    var body: some View {
        NavigationStack {
            ScrollView {
                ForEach(PageTemplate.groups, id: \.self) { group in
                    VStack(alignment: .leading, spacing: 8) {
                        Text(group)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 16)

                        LazyVGrid(columns: columns, spacing: 14) {
                            ForEach(PageTemplate.allCases.filter { $0.group == group }) { template in
                                Button {
                                    selected = template
                                    page?.template = template
                                    onApply()
                                } label: {
                                    VStack(spacing: 6) {
                                        Image(uiImage: TemplateRenderer.image(
                                            for: template,
                                            size: CGSize(width: 200, height: 280),
                                            scale: 1
                                        ))
                                        .resizable()
                                        .aspectRatio(200.0 / 280.0, contentMode: .fit)
                                        .background(Color.white)
                                        .frame(height: 130)
                                        .clipShape(RoundedRectangle(cornerRadius: 6))
                                        .overlay(
                                            RoundedRectangle(cornerRadius: 6)
                                                .strokeBorder(selected == template ? Color.accentColor : Color.gray.opacity(0.3),
                                                              lineWidth: selected == template ? 2.5 : 1)
                                        )
                                        Text(template.name)
                                            .font(.caption2)
                                    }
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 14)
                }
            }
            .navigationTitle("Vorlage")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Auf alle Seiten") {
                        for page in note.orderedPages { page.template = selected }
                        onApply()
                        dismiss()
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") { dismiss() }
                }
            }
            .onAppear { selected = page?.template ?? .lines }
        }
    }
}
