//
//  ContentView.swift
//  MNotes
//

import SwiftUI
import SwiftData
import UIKit

enum SidebarSelection: Hashable {
    case all
    case starred
    case folder(PersistentIdentifier)
    case tag(String)
    case trash
}

struct ContentView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Note.updatedAt, order: .reverse) private var notes: [Note]
    @Query(sort: \Folder.sortIndex) private var folders: [Folder]

    @State private var sidebar: SidebarSelection = .all
    @State private var selectedNote: Note?
    @State private var search = ""
    @State private var columnVisibility: NavigationSplitViewVisibility = .all
    @State private var tools = ToolState()
    @State private var showSettings = false
    @AppStorage("didSeeWelcome") private var didSeeWelcome = false

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            SidebarView(selection: sidebarSelection,
                        folders: folders,
                        notes: notes,
                        showSettings: $showSettings)
        } content: {
            NoteListView(notes: filteredNotes,
                         selection: $selectedNote,
                         search: $search,
                         title: sidebarTitle,
                         isTrash: sidebar == .trash,
                         onNew: newNote,
                         onNewWhiteboard: newWhiteboard,
                         onEmptyTrash: emptyTrash)
        } detail: {
            if let note = selectedNote, note.isTrashed {
                TrashedNoteView(note: note) {
                    note.restoreFromTrash()
                    sidebar = .all
                }
            } else if let note = selectedNote {
                NoteEditorView(note: note, tools: tools)
                    .id(note.persistentModelID)
            } else {
                ContentUnavailableView(
                    "Keine Notiz gewählt",
                    systemImage: "square.and.pencil",
                    description: Text("Links eine Notiz auswählen oder oben eine neue anlegen.")
                )
            }
        }
        .sheet(isPresented: $showSettings) {
            SettingsView()
        }
        .sheet(isPresented: Binding(get: { !didSeeWelcome },
                                    set: { if !$0 { didSeeWelcome = true } })) {
            WelcomeView()
        }
        .task {
            purgeOldTrash()
            if liveNotes.isEmpty { createWelcomeNote() }
            if selectedNote == nil { selectedNote = filteredNotes.first }
        }
        .onChange(of: sidebar) { _, _ in
            // Eine Notiz aus dem Papierkorb darf nicht offen bleiben, wenn man
            // ihn verlässt, und umgekehrt.
            if let note = selectedNote, note.isTrashed != (sidebar == .trash) {
                selectedNote = nil
            }
        }
    }

    // MARK: Papierkorb

    private func emptyTrash() {
        for note in notes where note.isTrashed {
            if selectedNote == note { selectedNote = nil }
            context.delete(note)
        }
    }

    /// Räumt beim Start auf, was lange genug im Papierkorb lag.
    private func purgeOldTrash() {
        let deadline = Date.now.addingTimeInterval(-Note.trashRetention)
        for note in notes {
            guard let trashedAt = note.trashedAt, trashedAt < deadline else { continue }
            if selectedNote == note { selectedNote = nil }
            context.delete(note)
        }
    }

    // MARK: Auswahl

    /// Alles außer dem Papierkorb sieht nur die nicht gelöschten Notizen.
    private var liveNotes: [Note] { notes.filter { !$0.isTrashed } }

    private var filteredNotes: [Note] {
        var list = liveNotes
        switch sidebar {
        case .all:
            break
        case .starred:
            list = list.filter(\.isStarred)
        case .folder(let id):
            list = list.filter { $0.folder?.persistentModelID == id }
        case .tag(let tag):
            list = list.filter { $0.tags.contains(tag) }
        case .trash:
            list = notes.filter(\.isTrashed).sorted {
                ($0.trashedAt ?? .distantPast) > ($1.trashedAt ?? .distantPast)
            }
            return search.isEmpty ? list : list.filter {
                $0.displayTitle.lowercased().contains(search.lowercased())
            }
        }
        let query = search.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !query.isEmpty {
            list = list.filter { note in
                note.displayTitle.lowercased().contains(query)
                    || note.tags.contains { $0.lowercased().contains(query) }
                    || note.plainText.lowercased().contains(query)
            }
        }
        return list.sorted {
            if $0.isStarred != $1.isStarred { return $0.isStarred }
            return $0.updatedAt > $1.updatedAt
        }
    }

    private var sidebarTitle: String {
        switch sidebar {
        case .all: return "Alle Notizen"
        case .starred: return "Favoriten"
        case .folder(let id): return folders.first { $0.persistentModelID == id }?.name ?? "Ordner"
        case .tag(let tag): return "#\(tag)"
        case .trash: return "Papierkorb"
        }
    }

    /// `List(selection:)` on iOS takes an optional binding; `sidebar` stays
    /// non-optional as the source of truth, bridged here.
    private var sidebarSelection: Binding<SidebarSelection?> {
        Binding(
            get: { sidebar },
            set: { if let value = $0 { sidebar = value } }
        )
    }

    // MARK: Anlegen

    /// Der in der Seitenleiste gewählte Ordner, sonst `nil`.
    private var currentFolder: Folder? {
        if case .folder(let id) = sidebar { return folders.first { $0.persistentModelID == id } }
        return nil
    }

    private func newNote() {
        let note = Note(folder: currentFolder)
        context.insert(note)
        selectedNote = note
    }

    private func newWhiteboard() {
        let note = Note(kind: .whiteboard, folder: currentFolder)
        if let page = note.pages?.first {
            page.width = Double(PageGeometry.board.width)
            page.height = Double(PageGeometry.board.height)
            page.template = .dots
        }
        context.insert(note)
        selectedNote = note
    }

    private func createWelcomeNote() {
        let note = Note(title: "Willkommen", icon: "⭐")
        note.isStarred = true
        if let page = note.pages?.first {
            page.template = .lines
            let text = NSMutableAttributedString(
                string: "Hallo!\n\n",
                attributes: [.font: UIFont.systemFont(ofSize: 26, weight: .bold),
                             .foregroundColor: UIColor.black]
            )
            let body = """
            Oben rechts steht das Stiftregal: Füller, Kugelschreiber, Fineliner, \
            Bleistift, Pinsel, Textmarker, Wachsmaler, Wasserfarbe und Neon. \
            Jeder Stift merkt sich seine eigene Farbe, Dicke und Deckkraft, und \
            am Apple Pencil zählen Druck und Neigung.

            Ebenen liegen im rechten Panel — Skizze unten, saubere Linien oben.
            Vorlagen gibt es im Menü: kariert, Schreiblinien, Notenlinien, \
            Cornell, Wochenplan, Storyboard.
            Über das Menü lassen sich außerdem PDFs öffnen, Seiten verlängern, \
            Aufnahmen mitschreiben und Notizen als PDF teilen.

            Alles bleibt auf diesem Gerät.
            """
            text.append(NSAttributedString(
                string: body,
                attributes: [.font: UIFont.systemFont(ofSize: 15),
                             .foregroundColor: UIColor.black]
            ))
            page.setRTF(try? text.data(
                from: NSRange(location: 0, length: text.length),
                documentAttributes: [.documentType: RichText.type]
            ))
        }
        context.insert(note)
        selectedNote = note
    }
}

// MARK: - Seitenleiste

struct SidebarView: View {
    @Environment(\.modelContext) private var context
    @Binding var selection: SidebarSelection?
    let folders: [Folder]
    let notes: [Note]
    @Binding var showSettings: Bool

    @State private var renaming: Folder?
    @State private var newName = ""

    var body: some View {
        List(selection: $selection) {
            quickAccessSection
            folderSection
            if !allTags.isEmpty {
                tagsSection
            }
        }
        .navigationTitle("MNotes")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showSettings = true
                } label: {
                    Image(systemName: "gearshape")
                }
            }
        }
        .alert("Ordnername", isPresented: isRenaming) {
            TextField("Name", text: $newName)
            Button("Sichern") {
                renaming?.name = newName
                renaming = nil
            }
            Button("Abbrechen", role: .cancel) { renaming = nil }
        }
    }

    private var isRenaming: Binding<Bool> {
        Binding(
            get: { renaming != nil },
            set: { if !$0 { renaming = nil } }
        )
    }

    /// Zählungen und Schlagwörter sollen nur zeigen, was nicht im Papierkorb
    /// liegt. Sonst sucht man nach einem Schlagwort, das es nicht mehr gibt.
    private var liveNotes: [Note] { notes.filter { !$0.isTrashed } }

    private var quickAccessSection: some View {
        Section {
            Label("Alle Notizen", systemImage: "tray.full")
                .badge(liveNotes.count)
                .tag(SidebarSelection.all)
            Label("Favoriten", systemImage: "star")
                .badge(liveNotes.filter(\.isStarred).count)
                .tag(SidebarSelection.starred)
            Label("Papierkorb", systemImage: "trash")
                .badge(notes.count - liveNotes.count)
                .tag(SidebarSelection.trash)
        }
    }

    private var folderSection: some View {
        Section("Ordner") {
            ForEach(folders) { folder in
                Label(folder.name, systemImage: "folder")
                    .badge(liveNotes.filter {
                        $0.folder?.persistentModelID == folder.persistentModelID
                    }.count)
                    .tag(SidebarSelection.folder(folder.persistentModelID))
                    .contextMenu {
                        Button("Umbenennen") {
                            newName = folder.name
                            renaming = folder
                        }
                        Button("Löschen", role: .destructive) {
                            context.delete(folder)
                        }
                    }
            }
            Button {
                let folder = Folder(name: "Neuer Ordner", sortIndex: folders.count)
                context.insert(folder)
                newName = folder.name
                renaming = folder
            } label: {
                Label("Ordner anlegen", systemImage: "plus")
            }
        }
    }

    private var tagsSection: some View {
        Section("Schlagwörter") {
            ForEach(allTags, id: \.self) { tag in
                Label("#\(tag)", systemImage: "number")
                    .tag(SidebarSelection.tag(tag))
            }
        }
    }

    private var allTags: [String] {
        Array(Set(liveNotes.flatMap(\.tags))).sorted()
    }
}

// MARK: - Notizliste

struct NoteListView: View {
    @Environment(\.modelContext) private var context
    let notes: [Note]
    @Binding var selection: Note?
    @Binding var search: String
    let title: String
    let isTrash: Bool
    let onNew: () -> Void
    let onNewWhiteboard: () -> Void
    let onEmptyTrash: () -> Void

    @State private var settings = AppSettings.shared
    @State private var confirmEmpty = false

    var body: some View {
        Group {
            if settings.libraryLayout == .grid {
                noteGrid
            } else {
                noteList
            }
        }
        .searchable(text: $search, prompt: "Suchen")
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if notes.isEmpty {
                ContentUnavailableView(
                    emptyTitle,
                    systemImage: emptySymbol,
                    description: isTrash && search.isEmpty
                        ? Text("Gelöschte Notizen liegen hier 30 Tage lang.")
                        : nil
                )
            }
        }
        .toolbar {
            ToolbarItemGroup(placement: .topBarTrailing) {
                layoutToggle
                if isTrash {
                    Button("Leeren", role: .destructive) { confirmEmpty = true }
                        .disabled(notes.isEmpty)
                } else {
                    Button(action: onNew) {
                        Image(systemName: "square.and.pencil")
                    }
                    Button(action: onNewWhiteboard) {
                        Image(systemName: "square.grid.3x3")
                    }
                    .help("Whiteboard")
                }
            }
        }
        .confirmationDialog("Papierkorb leeren?",
                            isPresented: $confirmEmpty,
                            titleVisibility: .visible) {
            Button("Endgültig löschen", role: .destructive, action: onEmptyTrash)
            Button("Abbrechen", role: .cancel) {}
        } message: {
            Text("Danach lassen sich diese Notizen nicht mehr zurückholen.")
        }
    }

    private var noteList: some View {
        List(selection: $selection) {
            ForEach(notes) { note in
                NoteRow(note: note)
                    .tag(note)
                    .swipeActions(edge: .leading) {
                        if isTrash {
                            Button { note.restoreFromTrash() } label: {
                                Label("Zurückholen", systemImage: "arrow.uturn.backward")
                            }
                            .tint(.blue)
                        } else {
                            Button {
                                note.isStarred.toggle()
                                note.touch()
                            } label: {
                                Label("Favorit", systemImage: note.isStarred ? "star.slash" : "star")
                            }
                            .tint(.yellow)
                        }
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            if selection == note { selection = nil }
                            // Ein Wisch legt in den Papierkorb, er löscht nicht.
                            // Endgültig wird erst im Papierkorb selbst.
                            if isTrash { context.delete(note) } else { note.moveToTrash() }
                        } label: {
                            Label(isTrash ? "Endgültig" : "Löschen", systemImage: "trash")
                        }
                    }
            }
        }
    }

    private var noteGrid: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 150), spacing: 14)], spacing: 14) {
                ForEach(notes) { note in
                    NoteTile(note: note, isSelected: selection == note)
                        .onTapGesture { selection = note }
                        .contextMenu { tileContextMenu(for: note) }
                }
            }
            .padding(14)
        }
    }

    private var layoutToggle: some View {
        Button {
            settings.libraryLayout = settings.libraryLayout == .grid ? .list : .grid
        } label: {
            Image(systemName: settings.libraryLayout == .grid ? "list.bullet" : "square.grid.2x2")
        }
        .help(settings.libraryLayout == .grid ? "Als Liste anzeigen" : "Als Raster anzeigen")
    }

    @ViewBuilder
    private func tileContextMenu(for note: Note) -> some View {
        if isTrash {
            Button {
                note.restoreFromTrash()
            } label: {
                Label("Zurückholen", systemImage: "arrow.uturn.backward")
            }
            Button(role: .destructive) {
                if selection == note { selection = nil }
                context.delete(note)
            } label: {
                Label("Endgültig löschen", systemImage: "trash")
            }
        } else {
            Button {
                note.isStarred.toggle()
                note.touch()
            } label: {
                Label(note.isStarred ? "Favorit entfernen" : "Favorit",
                      systemImage: note.isStarred ? "star.slash" : "star")
            }
            Button(role: .destructive) {
                if selection == note { selection = nil }
                note.moveToTrash()
            } label: {
                Label("Löschen", systemImage: "trash")
            }
        }
    }

    private var emptyTitle: String {
        if !search.isEmpty { return "Nichts gefunden" }
        return isTrash ? "Papierkorb ist leer" : "Noch keine Notiz"
    }

    private var emptySymbol: String {
        if !search.isEmpty { return "magnifyingglass" }
        return isTrash ? "trash" : "note.text"
    }
}

// MARK: - Eine Notiz im Papierkorb

/// Statt des Editors: gelöschte Notizen lassen sich ansehen, aber nicht
/// bearbeiten. Wer weiterschreiben will, holt sie erst zurück.
struct TrashedNoteView: View {
    let note: Note
    let onRestore: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "trash")
                .font(.system(size: 34))
                .foregroundStyle(.secondary)
            Text(note.displayTitle)
                .font(.headline)
            Text(note.daysLeftInTrash == 0
                 ? "Wird beim nächsten Start endgültig gelöscht."
                 : "Wird in \(note.daysLeftInTrash) Tagen endgültig gelöscht.")
                .font(.callout)
                .foregroundStyle(.secondary)
            Button("Zurückholen", action: onRestore)
                .buttonStyle(.borderedProminent)

            if !preview.isEmpty {
                ScrollView {
                    Text(preview)
                        .font(.callout)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: 520, alignment: .leading)
                }
                .padding(.top, 8)
            }
        }
        .padding(24)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var preview: String {
        note.plainText.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

struct NoteRow: View {
    let note: Note

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text(note.displayIcon)
                .font(.title3)
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    if note.isStarred {
                        Image(systemName: "star.fill")
                            .font(.caption2)
                            .foregroundStyle(.yellow)
                    }
                    Text(note.displayTitle)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                }
                let preview = note.plainText
                    .replacingOccurrences(of: "\n", with: " ")
                    .trimmingCharacters(in: .whitespaces)
                if !preview.isEmpty {
                    Text(preview)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                Text(subtitle)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 2)
    }

    private var subtitle: String {
        if note.isTrashed {
            let days = note.daysLeftInTrash
            return days == 0 ? "wird bald gelöscht" : "noch \(days) Tage"
        }
        var parts = [note.updatedAt.formatted(.relative(presentation: .named))]
        parts.append("\(note.orderedPages.count) S.")
        if !note.tags.isEmpty { parts.append(note.tags.map { "#\($0)" }.joined(separator: " ")) }
        return parts.joined(separator: " · ")
    }
}

// MARK: - Kachel (Rasteransicht)

struct NoteTile: View {
    let note: Note
    let isSelected: Bool

    @State private var thumbnail: UIImage?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topTrailing) {
                thumbnailArea
                if note.isStarred {
                    Image(systemName: "star.fill")
                        .font(.caption)
                        .foregroundStyle(.yellow)
                        .padding(6)
                        .background(.thinMaterial, in: Circle())
                        .padding(6)
                }
            }
            Text(note.displayTitle)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(1)
            Text(subtitle)
                .font(.caption2)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .padding(8)
        .background(Color(uiColor: .secondarySystemBackground), in: RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
        .task(id: thumbnailKey) { loadThumbnail() }
    }

    private var thumbnailArea: some View {
        ZStack {
            if let thumbnail {
                Image(uiImage: thumbnail)
                    .resizable()
                    .scaledToFill()
            } else {
                Color(uiColor: .tertiarySystemBackground)
                    .overlay(Text(note.displayIcon).font(.largeTitle))
            }
        }
        .frame(maxWidth: .infinity)
        .aspectRatio(PageGeometry.a4.width / PageGeometry.a4.height, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    /// Identität + `updatedAt`: eine geänderte Notiz bekommt einen neuen
    /// Schlüssel, das alte Bild fällt aus dem Zwischenspeicher.
    private var thumbnailKey: String {
        "\(note.persistentModelID)-\(note.updatedAt.timeIntervalSince1970)"
    }

    private func loadThumbnail() {
        guard let page = note.orderedPages.first else { return }
        let key = thumbnailKey
        if let cached = ThumbnailCache.shared.image(for: key) {
            thumbnail = cached
            return
        }
        // Page ist nicht Sendable, darum bleibt das Zeichnen auf dem MainActor.
        // Der Zwischenspeicher hält die Kosten klein.
        let image = PageRenderer.flatten(page: page, pdfData: note.pdfData, scale: 0.35)
        ThumbnailCache.shared.set(image, for: key)
        thumbnail = image
    }

    private var subtitle: String {
        if note.isTrashed {
            let days = note.daysLeftInTrash
            return days == 0 ? "wird bald gelöscht" : "noch \(days) Tage"
        }
        var parts = [note.updatedAt.formatted(.relative(presentation: .named))]
        parts.append("\(note.orderedPages.count) S.")
        return parts.joined(separator: " · ")
    }
}
