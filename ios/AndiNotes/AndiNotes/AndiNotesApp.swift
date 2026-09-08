//
//  AndiNotesApp.swift
//  Andi Notes
//

import SwiftUI
import SwiftData

@main
struct AndiNotesApp: App {
    /// One container for the whole app. Everything is stored locally; see the
    /// README for how to turn on iCloud sync.
    private let container: ModelContainer = {
        let schema = Schema([
            Folder.self,
            Note.self,
            Page.self,
            InkLayer.self,
            Recording.self,
            NoteVersion.self
        ])
        let configuration = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            // A broken store must not lock the app out of starting; fall back
            // to memory so the user can at least export or start over.
            let fallback = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            return try! ModelContainer(for: schema, configurations: [fallback])
        }
    }()

    @State private var settings = AppSettings.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(settings.appearance.colorScheme)
                .task { await Store.shared.load() }
        }
        .modelContainer(container)
    }
}
