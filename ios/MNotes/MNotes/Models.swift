//
//  Models.swift
//  MNotes
//
//  SwiftData model. Every property has a default and every relationship is
//  optional, so the same schema can be switched to CloudKit sync later without
//  a migration (see README).
//

import Foundation
import CoreGraphics
import UIKit
import SwiftData

// MARK: - Ordner

@Model
final class Folder {
    var name: String = "Neuer Ordner"
    var colorHex: String?
    var sortIndex: Int = 0
    var createdAt: Date = Date.now

    @Relationship(deleteRule: .nullify, inverse: \Note.folder)
    var notes: [Note]?

    init(name: String = "Neuer Ordner", colorHex: String? = nil, sortIndex: Int = 0) {
        self.name = name
        self.colorHex = colorHex
        self.sortIndex = sortIndex
        self.createdAt = .now
    }

    var noteCount: Int { notes?.count ?? 0 }
}

// MARK: - Notiz

enum NoteKind: String, Codable {
    case note
    case pdf
    case whiteboard
}

@Model
final class Note {
    var title: String = ""
    var icon: String?
    var colorHex: String?
    var isStarred: Bool = false
    var tags: [String] = []
    var kindRaw: String = NoteKind.note.rawValue
    var createdAt: Date = Date.now
    var updatedAt: Date = Date.now

    /// Wann die Notiz in den Papierkorb kam. `nil` heißt: sie ist nicht dort.
    /// Gelöscht wird erst beim Leeren oder nach `Note.trashRetention`.
    var trashedAt: Date?

    /// The imported PDF, if this note was made from one.
    @Attribute(.externalStorage) var pdfData: Data?

    var folder: Folder?

    @Relationship(deleteRule: .cascade, inverse: \Page.note)
    var pages: [Page]?

    @Relationship(deleteRule: .cascade, inverse: \Recording.note)
    var recordings: [Recording]?

    @Relationship(deleteRule: .cascade, inverse: \NoteVersion.note)
    var versions: [NoteVersion]?

    /// Chat history with the assistant, stored as JSON so the schema stays flat.
    var chatData: Data?

    init(title: String = "", kind: NoteKind = .note, icon: String? = nil, folder: Folder? = nil) {
        self.title = title
        self.kindRaw = kind.rawValue
        self.icon = icon
        self.folder = folder
        self.createdAt = .now
        self.updatedAt = .now
        self.pages = [Page(index: 0)]
    }

    var kind: NoteKind {
        get { NoteKind(rawValue: kindRaw) ?? .note }
        set { kindRaw = newValue.rawValue }
    }

    var orderedPages: [Page] {
        (pages ?? []).sorted { $0.index < $1.index }
    }

    var orderedRecordings: [Recording] {
        (recordings ?? []).sorted { $0.createdAt > $1.createdAt }
    }

    var orderedVersions: [NoteVersion] {
        (versions ?? []).sorted { $0.createdAt > $1.createdAt }
    }

    var displayTitle: String {
        let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty { return trimmed }
        let firstLine = plainText
            .split(separator: "\n", omittingEmptySubsequences: true)
            .first
            .map(String.init) ?? ""
        return firstLine.isEmpty ? "Ohne Titel" : String(firstLine.prefix(60))
    }

    var displayIcon: String {
        if let icon { return icon }
        switch kind {
        case .note: return "📄"
        case .pdf: return "📕"
        case .whiteboard: return "⬜"
        }
    }

    /// Everything readable in this note: typed text, recognised text, PDF text.
    var plainText: String {
        orderedPages
            .map { page in
                [page.plainText, page.ocrText, page.pdfText]
                    .filter { !$0.isEmpty }
                    .joined(separator: "\n")
            }
            .filter { !$0.isEmpty }
            .joined(separator: "\n\n")
    }

    func touch() {
        updatedAt = .now
    }

    // MARK: Papierkorb

    /// So lange bleibt eine gelöschte Notiz liegen, bevor sie beim Start
    /// endgültig verschwindet.
    static let trashRetention: TimeInterval = 30 * 24 * 60 * 60

    var isTrashed: Bool { trashedAt != nil }

    /// Tage bis zur endgültigen Löschung, mindestens 0.
    var daysLeftInTrash: Int {
        guard let trashedAt else { return 0 }
        let left = Note.trashRetention + trashedAt.timeIntervalSinceNow
        return max(0, Int(ceil(left / 86_400)))
    }

    func moveToTrash() {
        trashedAt = .now
        touch()
    }

    func restoreFromTrash() {
        trashedAt = nil
        touch()
    }

    var chat: [ChatMessage] {
        get {
            guard let chatData else { return [] }
            return (try? JSONDecoder().decode([ChatMessage].self, from: chatData)) ?? []
        }
        set {
            chatData = try? JSONEncoder().encode(newValue)
        }
    }
}

struct ChatMessage: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var role: String        // "user" | "assistant"
    var content: String
    var date: Date = .now

    var isUser: Bool { role == "user" }
}

// MARK: - Seite

@Model
final class Page {
    var index: Int = 0
    var width: Double = Double(PageGeometry.a4.width)
    var height: Double = Double(PageGeometry.a4.height)
    var templateRaw: String = PageTemplate.lines.rawValue

    /// Index into the note's PDF (0-based), if this page mirrors a PDF page.
    var pdfPageIndex: Int?
    var pdfText: String = ""
    var ocrText: String = ""

    /// Cheap fingerprint of the ink (per-layer byte counts), so background OCR
    /// skips pages that haven't changed. Needs a default for CloudKit.
    var ocrSourceHash: String = ""

    /// Typed text as RTFD, so formatting and images survive in one blob.
    @Attribute(.externalStorage) var textRTF: Data?

    /// Denormalised plain text, kept in sync with `textRTF` via `setRTF`.
    /// Lets search, previews and titles avoid decoding RTFD on every access.
    var textPlain: String = ""

    /// Quick-marker lines (see Annotations.swift), stored as JSON.
    var annotationsData: Data?

    var activeLayerIndex: Int = 0
    var note: Note?

    @Relationship(deleteRule: .cascade, inverse: \InkLayer.page)
    var layers: [InkLayer]?

    init(index: Int = 0,
         template: PageTemplate = .lines,
         size: CGSize = PageGeometry.a4,
         pdfPageIndex: Int? = nil) {
        self.index = index
        self.templateRaw = template.rawValue
        self.width = Double(size.width)
        self.height = Double(size.height)
        self.pdfPageIndex = pdfPageIndex
        self.layers = [InkLayer(name: "Ebene 1", index: 0)]
    }

    var template: PageTemplate {
        get { PageTemplate(rawValue: templateRaw) ?? .blank }
        set { templateRaw = newValue.rawValue }
    }

    var size: CGSize { CGSize(width: width, height: height) }

    var orderedLayers: [InkLayer] {
        (layers ?? []).sorted { $0.index < $1.index }
    }

    var activeLayer: InkLayer? {
        let list = orderedLayers
        guard !list.isEmpty else { return nil }
        return list[min(max(activeLayerIndex, 0), list.count - 1)]
    }

    var annotations: [LineAnnotation] {
        get { AnnotationStore.load(annotationsData) }
        set { annotationsData = AnnotationStore.save(newValue) }
    }

    var plainText: String {
        // Fast path: the denormalised copy, refreshed on every write.
        if !textPlain.isEmpty { return textPlain }
        // Fallback for pages written before `textPlain` existed.
        guard let textRTF, !textRTF.isEmpty else { return "" }
        return RichText.attributed(textRTF)?.string ?? ""
    }

    /// Stores the typed text and refreshes the denormalised plain text so the
    /// expensive RTFD decode happens once per write, not on every read.
    func setRTF(_ data: Data?) {
        textRTF = data
        textPlain = RichText.attributed(data)?.string ?? ""
    }

    /// Adds `points` of extra height — the native "Seite erweitern".
    func extend(by points: Double = 400) {
        height += points
    }

    func addLayer() {
        let next = (orderedLayers.last?.index ?? -1) + 1
        let layer = InkLayer(name: "Ebene \(next + 1)", index: next)
        layers = (layers ?? []) + [layer]
        activeLayerIndex = next
    }
}

// MARK: - Ebene

@Model
final class InkLayer {
    var name: String = "Ebene"
    var index: Int = 0
    var isVisible: Bool = true
    var isLocked: Bool = false

    /// A serialised PKDrawing.
    @Attribute(.externalStorage) var drawingData: Data?

    var page: Page?

    init(name: String = "Ebene", index: Int = 0) {
        self.name = name
        self.index = index
    }
}

// MARK: - Aufnahme

@Model
final class Recording {
    var createdAt: Date = Date.now
    var duration: Double = 0
    var transcript: String = ""
    var fileName: String = ""
    var note: Note?

    init(fileName: String, duration: Double, transcript: String = "") {
        self.fileName = fileName
        self.duration = duration
        self.transcript = transcript
        self.createdAt = .now
    }

    /// Recordings live as files in Application Support, not in the database.
    var fileURL: URL {
        AudioStorage.directory.appendingPathComponent(fileName)
    }
}

// MARK: - Version

@Model
final class NoteVersion {
    var createdAt: Date = Date.now
    var label: String = ""
    /// A JSON snapshot of the note's pages (see VersionSnapshot).
    @Attribute(.externalStorage) var snapshot: Data?
    var note: Note?

    init(label: String, snapshot: Data?) {
        self.label = label
        self.snapshot = snapshot
        self.createdAt = .now
    }
}

// MARK: - Momentaufnahmen für den Verlauf

struct VersionSnapshot: Codable {
    struct LayerData: Codable {
        var name: String
        var index: Int
        var isVisible: Bool
        var isLocked: Bool
        var drawing: Data?
    }

    struct PageData: Codable {
        var index: Int
        var width: Double
        var height: Double
        var template: String
        var pdfPageIndex: Int?
        var pdfText: String
        var ocrText: String
        var textRTF: Data?
        var annotations: Data?
        var layers: [LayerData]
    }

    var pages: [PageData]

    init(note: Note) {
        pages = note.orderedPages.map { page in
            PageData(
                index: page.index,
                width: page.width,
                height: page.height,
                template: page.templateRaw,
                pdfPageIndex: page.pdfPageIndex,
                pdfText: page.pdfText,
                ocrText: page.ocrText,
                textRTF: page.textRTF,
                annotations: page.annotationsData,
                layers: page.orderedLayers.map {
                    LayerData(name: $0.name,
                              index: $0.index,
                              isVisible: $0.isVisible,
                              isLocked: $0.isLocked,
                              drawing: $0.drawingData)
                }
            )
        }
    }

    /// Replaces the note's pages with the stored ones.
    func restore(into note: Note, context: ModelContext) {
        for page in note.orderedPages {
            context.delete(page)
        }
        note.pages = pages.map { data in
            let page = Page(index: data.index,
                            template: PageTemplate(rawValue: data.template) ?? .blank,
                            size: CGSize(width: data.width, height: data.height),
                            pdfPageIndex: data.pdfPageIndex)
            page.pdfText = data.pdfText
            page.ocrText = data.ocrText
            page.setRTF(data.textRTF)
            page.annotationsData = data.annotations
            page.layers = data.layers.map { layerData in
                let layer = InkLayer(name: layerData.name, index: layerData.index)
                layer.isVisible = layerData.isVisible
                layer.isLocked = layerData.isLocked
                layer.drawingData = layerData.drawing
                return layer
            }
            return page
        }
        note.touch()
    }
}

// MARK: - Seitenmaße

enum PageGeometry {
    /// A4 in points (72 dpi), the unit PencilKit and PDFKit both work in.
    static let a4 = CGSize(width: 595, height: 842)
    /// Whiteboard: eine sehr große Fläche statt wirklich endlosem Papier.
    static let board = CGSize(width: 4000, height: 3000)
}

// MARK: - Ablageorte

enum AudioStorage {
    static var directory: URL {
        let base = URL.applicationSupportDirectory.appendingPathComponent("Recordings", isDirectory: true)
        if !FileManager.default.fileExists(atPath: base.path) {
            try? FileManager.default.createDirectory(at: base, withIntermediateDirectories: true)
        }
        return base
    }
}
