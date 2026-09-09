//
//  Store.swift
//  Andi Notes
//
//  Käufe über StoreKit 2.
//
//  Alles, was den Funktionsumfang begrenzt, steht in `FeatureGate` — an einer
//  Stelle, damit die Entscheidung „was kostet was" nicht über die App
//  verstreut liegt und sich ohne Suchen ändern lässt.
//

import Foundation
import StoreKit
import Observation

// MARK: - Stufen

enum Tier: Int, Comparable {
    case free = 0
    case plus = 1
    case pro = 2

    static func < (lhs: Tier, rhs: Tier) -> Bool { lhs.rawValue < rhs.rawValue }

    var title: String {
        switch self {
        case .free: return "Kostenlos"
        case .plus: return "Plus"
        case .pro: return "Pro"
        }
    }
}

enum ProductID {
    static let plusYearly = "de.andi.notes.plus.yearly"
    static let plusLifetime = "de.andi.notes.plus.lifetime"
    static let proYearly = "de.andi.notes.pro.yearly"
    static let proMonthly = "de.andi.notes.pro.monthly"

    static let all: [String] = [plusYearly, plusLifetime, proYearly, proMonthly]

    static func tier(for id: String) -> Tier {
        switch id {
        case proYearly, proMonthly: return .pro
        case plusYearly, plusLifetime: return .plus
        default: return .free
        }
    }
}

// MARK: - Was kostet was

enum Feature: String, CaseIterable, Identifiable {
    case pens, layers, templates, pdf, export, localAnalysis
    case recording, transcription, versions, video, ocr
    case assistant

    var id: String { rawValue }

    var title: String {
        switch self {
        case .pens: return "Alle neun Stifte und Schnellmarker"
        case .layers: return "Ebenen"
        case .templates: return "Alle Seitenvorlagen"
        case .pdf: return "PDF öffnen und beschriften"
        case .export: return "Export als PDF, Bild, Markdown"
        case .localAnalysis: return "Auswertung auf dem Gerät"
        case .recording: return "Tonaufnahme ohne Zeitlimit"
        case .transcription: return "Live-Mitschrift"
        case .versions: return "Versionsverlauf"
        case .video: return "Video neben der Notiz"
        case .ocr: return "Handschrift in Text umwandeln"
        case .assistant: return "Assistent: erklären, lösen, abfragen"
        }
    }

    /// Ab welcher Stufe die Funktion offen ist.
    var required: Tier {
        switch self {
        case .pens, .layers, .templates, .pdf, .export, .localAnalysis:
            return .free
        case .recording, .transcription, .versions, .video, .ocr:
            return .plus
        case .assistant:
            return .pro
        }
    }
}

enum FeatureGate {
    /// Keine Obergrenze für Notizen, Seiten oder Ordner. Wer schreibt, soll
    /// schreiben können; bezahlt wird für die Zusatzfunktionen.
    static func allows(_ feature: Feature, tier: Tier) -> Bool {
        tier >= feature.required
    }
}

// MARK: - Laden und Kaufen

@Observable
@MainActor
final class Store {
    static let shared = Store()

    private(set) var products: [Product] = []
    private(set) var purchasedIDs: Set<String> = []
    private(set) var isLoading = false
    private(set) var lastError: String?

    private var updateListener: Task<Void, Never>?

    private init() {
        updateListener = listenForUpdates()
    }

    // Kein `deinit`: Store ist ein Singleton und lebt bis zum Prozessende.
    // (Ein deinit dürfte außerdem nicht auf das @MainActor-isolierte
    // `updateListener` zugreifen — Swift verbietet das aus gutem Grund.)
    var tier: Tier {
        purchasedIDs.map(ProductID.tier(for:)).max() ?? .free
    }

    func allows(_ feature: Feature) -> Bool {
        FeatureGate.allows(feature, tier: tier)
    }

    func product(_ id: String) -> Product? {
        products.first { $0.id == id }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            products = try await Product.products(for: ProductID.all)
            await refreshEntitlements()
        } catch {
            // Ohne Verbindung zum Store bleibt die App voll benutzbar; nur die
            // Preise fehlen.
            lastError = error.localizedDescription
        }
    }

    @discardableResult
    func purchase(_ product: Product) async -> Bool {
        do {
            let result = try await product.purchase()
            switch result {
            case .success(let verification):
                guard let transaction = verified(verification) else {
                    lastError = "Der Kauf ließ sich nicht überprüfen."
                    return false
                }
                await transaction.finish()
                await refreshEntitlements()
                return true
            case .userCancelled:
                return false
            case .pending:
                lastError = "Der Kauf wartet auf eine Freigabe."
                return false
            @unknown default:
                return false
            }
        } catch {
            lastError = error.localizedDescription
            return false
        }
    }

    func restore() async {
        do {
            try await AppStore.sync()
            await refreshEntitlements()
        } catch {
            lastError = error.localizedDescription
        }
    }

    func refreshEntitlements() async {
        var found: Set<String> = []
        for await entitlement in Transaction.currentEntitlements {
            guard let transaction = verified(entitlement) else { continue }
            if transaction.revocationDate == nil {
                found.insert(transaction.productID)
            }
        }
        purchasedIDs = found
    }

    /// Käufe, die außerhalb der App abgeschlossen werden — etwa auf einem
    /// zweiten Gerät oder nach einer offenen Zahlungsfreigabe.
    private func listenForUpdates() -> Task<Void, Never> {
        Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handle(update)
            }
        }
    }

    private func handle(_ update: VerificationResult<Transaction>) async {
        guard let transaction = verified(update) else { return }
        await transaction.finish()
        await refreshEntitlements()
    }

    private nonisolated func verified(_ result: VerificationResult<Transaction>) -> Transaction? {
        // Unverified heißt: die Signatur passt nicht. Solche Käufe werden nicht
        // freigeschaltet, auch nicht „zur Sicherheit".
        guard case .verified(let transaction) = result else { return nil }
        return transaction
    }
}

// MARK: - Preisdarstellung

extension Product {
    /// „7,89 € pro Jahr" statt roher Zahlen.
    var periodText: String {
        guard let period = subscription?.subscriptionPeriod else { return "einmalig" }
        switch period.unit {
        case .day: return period.value == 7 ? "pro Woche" : "pro \(period.value) Tage"
        case .week: return period.value == 1 ? "pro Woche" : "pro \(period.value) Wochen"
        case .month: return period.value == 1 ? "pro Monat" : "pro \(period.value) Monate"
        case .year: return period.value == 1 ? "pro Jahr" : "pro \(period.value) Jahre"
        @unknown default: return ""
        }
    }

    /// Monatspreis eines Jahresabos, damit der Vergleich ehrlich bleibt.
    var monthlyEquivalent: String? {
        guard let period = subscription?.subscriptionPeriod, period.unit == .year else { return nil }
        let months = Decimal(12 * period.value)
        let perMonth = price / months
        return perMonth.formatted(priceFormatStyle) + " im Monat"
    }
}
