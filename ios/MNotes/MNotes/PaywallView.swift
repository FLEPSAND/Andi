//
//  PaywallView.swift
//  MNotes
//
//  Die Kaufseite: zwei Stufen, die Preise kommen von StoreKit statt fest im
//  Code zu stehen, und die Tabelle sagt, was in welcher Stufe drin ist.
//
//  Bewusst weggelassen: erfundene Streichpreise, Countdown, „nur heute". Was
//  hier steht, muss auch stimmen — Apple prüft das, und Käufer merken es.
//

import SwiftUI
import StoreKit

struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var store = Store.shared
    @State private var selectedTier: Tier = .plus
    @State private var selectedProductID: String = ProductID.plusYearly
    @State private var isPurchasing = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 22) {
                    header
                    tierSwitch
                    planCards
                    comparison
                    legal
                }
                .padding(20)
            }
            .safeAreaInset(edge: .bottom) { buyBar }
            .navigationTitle("")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Käufe wiederherstellen") {
                        Task { await store.restore() }
                    }
                    .font(.footnote)
                }
            }
            .task {
                if store.products.isEmpty { await store.load() }
                selectedProductID = defaultProduct(for: selectedTier)
            }
        }
    }

    // MARK: Kopf

    private var header: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Alles beim Schreiben dabei")
                .font(.largeTitle.bold())
            Text("Schreiben, zeichnen, ordnen und exportieren bleibt kostenlos und ohne Obergrenze. Bezahlt wird für Aufnahme, Video, Verlauf und den Assistenten.")
                .font(.callout)
                .foregroundStyle(.secondary)
            if store.tier != .free {
                Label("Aktiv: \(store.tier.title)", systemImage: "checkmark.seal.fill")
                    .font(.callout.weight(.medium))
                    .foregroundStyle(.green)
                    .padding(.top, 4)
            }
        }
    }

    private var tierSwitch: some View {
        Picker("Stufe", selection: $selectedTier) {
            Text("Plus").tag(Tier.plus)
            Text("Pro").tag(Tier.pro)
        }
        .pickerStyle(.segmented)
        .onChange(of: selectedTier) { _, tier in
            selectedProductID = defaultProduct(for: tier)
        }
    }

    // MARK: Angebote

    private var planCards: some View {
        Group {
            if store.products.isEmpty {
                HStack {
                    if store.isLoading {
                        ProgressView()
                        Text("Preise werden geladen…").foregroundStyle(.secondary)
                    } else {
                        Label("Der App Store ist gerade nicht erreichbar. Die App lässt sich trotzdem uneingeschränkt zum Schreiben nutzen.",
                              systemImage: "wifi.exclamationmark")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.vertical, 20)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 12) {
                        ForEach(productsForSelectedTier, id: \.id) { product in
                            PlanCard(product: product,
                                     isSelected: product.id == selectedProductID,
                                     isOwned: store.purchasedIDs.contains(product.id))
                                .onTapGesture { selectedProductID = product.id }
                        }
                    }
                    .padding(.vertical, 2)
                }
            }
        }
    }

    private var productsForSelectedTier: [Product] {
        let ids = selectedTier == .pro
            ? [ProductID.proYearly, ProductID.proMonthly]
            : [ProductID.plusYearly, ProductID.plusLifetime]
        return ids.compactMap { store.product($0) }
    }

    private func defaultProduct(for tier: Tier) -> String {
        tier == .pro ? ProductID.proYearly : ProductID.plusYearly
    }

    // MARK: Vergleich

    private var comparison: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Was ist enthalten")
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity, alignment: .leading)
                ForEach([Tier.free, .plus, .pro], id: \.rawValue) { tier in
                    Text(tier.title)
                        .font(.caption.weight(.semibold))
                        .frame(width: 62)
                }
            }
            .padding(.vertical, 10)

            Divider()

            ForEach(Feature.allCases) { feature in
                HStack {
                    Text(feature.title)
                        .font(.callout)
                        .frame(maxWidth: .infinity, alignment: .leading)
                    ForEach([Tier.free, .plus, .pro], id: \.rawValue) { tier in
                        Image(systemName: FeatureGate.allows(feature, tier: tier)
                              ? "checkmark" : "minus")
                            .font(.callout.weight(.semibold))
                            .foregroundStyle(FeatureGate.allows(feature, tier: tier)
                                             ? Color.accentColor : Color.secondary.opacity(0.4))
                            .frame(width: 62)
                    }
                }
                .padding(.vertical, 9)
                Divider()
            }

            HStack {
                Text("Notizen, Seiten und Ordner")
                    .font(.callout)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text("unbegrenzt")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 9)
        }
        .padding(.horizontal, 14)
        .background(Color.secondary.opacity(0.07), in: RoundedRectangle(cornerRadius: 14))
    }

    // MARK: Pflichtangaben

    private var legal: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(selectedProduct?.subscription == nil
                 ? "Einmalzahlung, keine Verlängerung."
                 : "Das Abo verlängert sich automatisch, solange es nicht mindestens 24 Stunden vor Ablauf in den Einstellungen des Apple-Kontos gekündigt wird. Die Abrechnung läuft über dieses Konto.")
                .font(.caption2)
                .foregroundStyle(.secondary)

            HStack(spacing: 18) {
                Link("Datenschutz", destination: LegalLinks.privacy)
                Link("Nutzungsbedingungen", destination: LegalLinks.terms)
            }
            .font(.caption2)

            if let error = store.lastError {
                Text(error)
                    .font(.caption2)
                    .foregroundStyle(.red)
            }
        }
    }

    // MARK: Kaufen

    private var selectedProduct: Product? {
        store.product(selectedProductID)
    }

    private var buyBar: some View {
        VStack(spacing: 8) {
            Button {
                guard let product = selectedProduct else { return }
                isPurchasing = true
                Task {
                    let bought = await store.purchase(product)
                    isPurchasing = false
                    if bought { dismiss() }
                }
            } label: {
                Group {
                    if isPurchasing {
                        ProgressView()
                    } else if let product = selectedProduct {
                        Text("\(product.displayPrice) — \(product.periodText)")
                    } else {
                        Text("Nicht verfügbar")
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .disabled(selectedProduct == nil || isPurchasing)

            Button("Erst mal weiterschreiben") { dismiss() }
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal, 20)
        .padding(.top, 10)
        .padding(.bottom, 12)
        .background(.bar)
    }
}

// MARK: - Eine Karte

struct PlanCard: View {
    let product: Product
    let isSelected: Bool
    let isOwned: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(product.subscription == nil ? "Einmalig" : product.periodText.capitalized)
                    .font(.subheadline.weight(.semibold))
                if isOwned {
                    Image(systemName: "checkmark.seal.fill")
                        .foregroundStyle(.green)
                }
            }

            Text(product.displayPrice)
                .font(.system(size: 30, weight: .bold, design: .rounded))

            if let monthly = product.monthlyEquivalent {
                Text(monthly)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            } else if product.subscription == nil {
                Text("dauerhaft, ohne Verlängerung")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: 170, alignment: .leading)
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 14)
                .fill(isSelected ? Color.accentColor.opacity(0.14) : Color.secondary.opacity(0.08))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
    }
}

// MARK: - Hinweis bei gesperrter Funktion

struct LockedFeatureHint: View {
    let feature: Feature
    let onOpenPaywall: () -> Void

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: "lock")
                .font(.system(size: 28))
                .foregroundStyle(.secondary)
            Text(feature.title)
                .font(.headline)
            Text("Diese Funktion gehört zu \(feature.required.title).")
                .font(.callout)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Stufen ansehen", action: onOpenPaywall)
                .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(24)
    }
}

/// Ohne diese beiden Adressen nimmt Apple die App nicht an. Vor der ersten
/// Einreichung durch die eigenen ersetzen.
enum LegalLinks {
    static let privacy = URL(string: "https://example.com/datenschutz")!
    static let terms = URL(string: "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")!
}
