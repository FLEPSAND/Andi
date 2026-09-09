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
                         onNew: newNote)
        } detail: {
            if let note = selectedNote {
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
            if notes.isEmpty { createWelcomeNote() }
            if selectedNote == nil { selectedNote = filteredNotes.first }
        }
    }

    // MARK: Auswahl

    private var filteredNotes: [Note] {
        var list = notes
        switch sidebar {
        case .all:
            break
        case .starred:
            list = list.filter(\.isStarred)
        case .folder(let id):
            list = list.filter { $0.folder?.persistentModelID == id }
        case .tag(let tag):
            list = list.filter { $0.tags.contains(tag) }
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

    private func newNote() {
        let folder: Folder? = {
            if case .folder(let id) = sidebar { return folders.first { $0.persistentModelID == id } }
            return nil
        }()
        let note = Note(folder: folder)
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

    private var quickAccessSection: some View {
        Section {
            Label("Alle Notizen", systemImage: "tray.full")
                .badge(notes.count)
                .tag(SidebarSelection.all)
            Label("Favoriten", systemImage: "star")
                .badge(notes.filter(\.isStarred).count)
                .tag(SidebarSelection.starred)
        }
    }

    private var folderSection: some View {
        Section("Ordner") {
            ForEach(folders) { folder in
                Label(folder.name, systemImage: "folder")
                    .badge(folder.noteCount)
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
        Array(Set(notes.flatMap(\.tags))).sorted()
    }
}

// MARK: - Notizliste

struct NoteListView: View {
    @Environment(\.modelContext) private var context
    let notes: [Note]
    @Binding var selection: Note?
    @Binding var search: String
    let title: String
    let onNew: () -> Void

    var body: some View {
        List(selection: $selection) {
            ForEach(notes) { note in
                NoteRow(note: note)
                    .tag(note)
                    .swipeActions(edge: .leading) {
                        Button {
                            note.isStarred.toggle()
                            note.touch()
                        } label: {
                            Label("Favorit", systemImage: note.isStarred ? "star.slash" : "star")
                        }
                        .tint(.yellow)
                    }
                    .swipeActions(edge: .trailing) {
                        Button(role: .destructive) {
                            if selection == note { selection = nil }
                            context.delete(note)
                        } label: {
                            Label("Löschen", systemImage: "trash")
                        }
                    }
            }
        }
        .searchable(text: $search, prompt: "Suchen")
        .navigationTitle(title)
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if notes.isEmpty {
                ContentUnavailableView(
                    search.isEmpty ? "Noch keine Notiz" : "Nichts gefunden",
                    systemImage: search.isEmpty ? "note.text" : "magnifyingglass"
                )
            }
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: onNew) {
                    Image(systemName: "square.and.pencil")
                }
            }
        }
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
        var parts = [note.updatedAt.formatted(.relative(presentation: .named))]
        parts.append("\(note.orderedPages.count) S.")
        if !note.tags.isEmpty { parts.append(note.tags.map { "#\($0)" }.joined(separator: " ")) }
        return parts.joined(separator: " · ")
    }
}
