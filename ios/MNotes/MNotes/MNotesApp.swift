//
//  MNotesApp.swift
//  MNotes
//

import SwiftUI
import SwiftData

@main
struct MNotesApp: App {
    /// CloudKit container for iCloud sync. It must match the app's bundle ID
    /// and the container created in the Apple Developer portal. Before
    /// shipping, change the bundle ID to something unique and create the
    /// matching `iCloud.<bundle-id>` container (see README).
    private static let cloudContainerID = "iCloud.de.mnotes.app"

    /// One container for the whole app. Notes sync over CloudKit when the
    /// container and entitlements are set up; otherwise the app falls back to
    /// a plain local store so data is never lost.
    private let container: ModelContainer = {
        let schema = Schema([
            Folder.self,
            Note.self,
            Page.self,
            InkLayer.self,
            Recording.self,
            NoteVersion.self
        ])

        let cloud = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .private(cloudContainerID)
        )
        do {
            return try ModelContainer(for: schema, configurations: [cloud])
        } catch {
            // CloudKit not available (no container, no entitlement, or not
            // signed into iCloud): fall back to a local store so notes still
            // persist. Recordings stay on device either way.
            let local = ModelConfiguration(schema: schema, isStoredInMemoryOnly: false)
            if let store = try? ModelContainer(for: schema, configurations: [local]) {
                return store
            }
            // Last resort: memory, so the app can at least open.
            let memory = ModelConfiguration(schema: schema, isStoredInMemoryOnly: true)
            return try! ModelContainer(for: schema, configurations: [memory])
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
