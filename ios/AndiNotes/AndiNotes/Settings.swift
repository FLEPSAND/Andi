//
//  Settings.swift
//  Andi Notes
//

import SwiftUI
import Observation

enum AIProviderKind: String, CaseIterable, Identifiable {
    case local
    case anthropic

    var id: String { rawValue }

    var title: String {
        switch self {
        case .local: return "Lokal"
        case .anthropic: return "Anthropic (Claude)"
        }
    }

    var explanation: String {
        switch self {
        case .local:
            return "Auswertung auf dem Gerät, ohne Netz und ohne Schlüssel. Sucht und ordnet, was in der Notiz steht — formulieren kann sie nicht."
        case .anthropic:
            return "Echter Modellaufruf. Der Notiztext wird dafür an Anthropic geschickt; nötig ist ein eigener API-Schlüssel."
        }
    }
}

@Observable
final class AppSettings {
    static let shared = AppSettings()

    var provider: AIProviderKind {
        didSet { defaults.set(provider.rawValue, forKey: "provider") }
    }
    var model: String {
        didSet { defaults.set(model, forKey: "model") }
    }
    var onDeviceSpeechOnly: Bool {
        didSet { defaults.set(onDeviceSpeechOnly, forKey: "onDeviceSpeechOnly") }
    }
    var autoVersions: Bool {
        didSet { defaults.set(autoVersions, forKey: "autoVersions") }
    }

    private let defaults = UserDefaults.standard

    private init() {
        provider = AIProviderKind(rawValue: defaults.string(forKey: "provider") ?? "") ?? .local
        model = defaults.string(forKey: "model") ?? "claude-sonnet-5"
        onDeviceSpeechOnly = defaults.object(forKey: "onDeviceSpeechOnly") as? Bool ?? true
        autoVersions = defaults.object(forKey: "autoVersions") as? Bool ?? true
    }
}

struct SettingsView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var settings = AppSettings.shared
    @State private var apiKey = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Auswertung") {
                    Picker("Anbieter", selection: $settings.provider) {
                        ForEach(AIProviderKind.allCases) { kind in
                            Text(kind.title).tag(kind)
                        }
                    }
                    Text(settings.provider.explanation)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if settings.provider == .anthropic {
                        SecureField("API-Schlüssel", text: $apiKey)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        TextField("Modell", text: $settings.model)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Text("Der Schlüssel liegt im Schlüsselbund des Geräts und geht nur an Anthropic.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Section("Aufnahme") {
                    Toggle("Nur Erkennung auf dem Gerät", isOn: $settings.onDeviceSpeechOnly)
                    Text(settings.onDeviceSpeechOnly
                         ? "Die Mitschrift verlässt das Gerät nicht. Dafür muss das Sprachpaket geladen sein — sonst bleibt die Mitschrift leer, die Aufnahme läuft trotzdem."
                         : "Ist kein Sprachpaket auf dem Gerät, schickt iOS den Ton zur Erkennung an Apple.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section("Notizen") {
                    Toggle("Automatisch Versionen sichern", isOn: $settings.autoVersions)
                }

                Section("Daten") {
                    Text("Notizen, Zeichnungen, PDFs und Aufnahmen liegen ausschließlich auf diesem Gerät. Kein Konto, keine Übertragung, keine Auswertung im Hintergrund.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Section {
                    LabeledContent("Version", value: appVersion)
                }
            }
            .navigationTitle("Einstellungen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Fertig") {
                        KeychainStore.set(apiKey, account: "anthropic")
                        dismiss()
                    }
                }
            }
            .onAppear {
                apiKey = KeychainStore.get(account: "anthropic")
            }
        }
    }

    private var appVersion: String {
        let bundle = Bundle.main.infoDictionary
        let version = bundle?["CFBundleShortVersionString"] as? String ?? "1.0"
        let build = bundle?["CFBundleVersion"] as? String ?? "1"
        return "\(version) (\(build))"
    }
}
