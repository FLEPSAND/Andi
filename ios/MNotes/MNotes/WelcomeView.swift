//
//  WelcomeView.swift
//  MNotes
//
//  Shown once on the first start. Three pages, no account, no code to enter,
//  no offer — just what the app can do and where to find it.
//

import SwiftUI

struct WelcomeView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var page = 0

    private let pages = WelcomePage.all

    var body: some View {
        VStack(spacing: 0) {
            TabView(selection: $page) {
                ForEach(Array(pages.enumerated()), id: \.offset) { index, item in
                    WelcomePageView(page: item)
                        .tag(index)
                }
            }
            .tabViewStyle(.page(indexDisplayMode: .always))

            Button {
                if page < pages.count - 1 {
                    withAnimation { page += 1 }
                } else {
                    dismiss()
                }
            } label: {
                Text(page < pages.count - 1 ? "Weiter" : "Los geht's")
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 6)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal, 30)
            .padding(.bottom, 26)

            Button("Überspringen") { dismiss() }
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.bottom, 18)
                .opacity(page < pages.count - 1 ? 1 : 0)
        }
        .interactiveDismissDisabled()
    }
}

struct WelcomePage {
    let symbol: String
    let title: String
    let body: String
    let bullets: [String]
    let tint: Color

    static let all: [WelcomePage] = [
        WelcomePage(
            symbol: "pencil.and.scribble",
            title: "Neun Stifte, alle mit eigenem Charakter",
            body: "Füller, Kugelschreiber, Fineliner, Bleistift, Pinsel, Textmarker, Wachsmaler, Wasserfarbe und Neon.",
            bullets: [
                "Druck und Neigung des Apple Pencil zählen mit",
                "Jeder Stift merkt sich Farbe, Dicke und Deckkraft",
                "Ebenen: Skizze unten, saubere Linien oben",
                "Radierer strich- oder pixelweise, Lasso, Lineal"
            ],
            tint: .blue
        ),
        WelcomePage(
            symbol: "folder",
            title: "Ordnung, die mitwächst",
            body: "Ordner, Schlagwörter und Favoriten links, Suche über alles — auch über erkannte Handschrift und PDF-Inhalte.",
            bullets: [
                "Dreizehn Vorlagen: kariert, Schreiblinien, Notenlinien, Cornell",
                "Seiten anhängen, verlängern, duplizieren",
                "Versionsverlauf mit Zurückholen",
                "PDF öffnen und direkt darauf schreiben"
            ],
            tint: .orange
        ),
        WelcomePage(
            symbol: "sparkles.rectangle.stack",
            title: "Frag nach dem, was auf der Seite steht",
            body: "Mit „Fragen\" einen Bereich aufziehen — eine Formel, einen Absatz — und dazu eine Erklärung, den Lösungsweg oder Übungsfragen bekommen.",
            bullets: [
                "Gelesen wird auf dem Gerät mit der Texterkennung von iOS",
                "Aufnahme mit Live-Mitschrift für den Unterricht",
                "Zusammenfassung, Kernpunkte und Aufgaben aus der Notiz",
                "Ohne Schlüssel läuft alles lokal; mit Schlüssel antwortet Claude"
            ],
            tint: .purple
        )
    ]
}

struct WelcomePageView: View {
    let page: WelcomePage

    var body: some View {
        VStack(spacing: 22) {
            Spacer(minLength: 20)

            Image(systemName: page.symbol)
                .font(.system(size: 54, weight: .light))
                .foregroundStyle(page.tint)
                .frame(width: 118, height: 118)
                .background(page.tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 28))

            VStack(spacing: 10) {
                Text(page.title)
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                Text(page.body)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal, 28)

            VStack(alignment: .leading, spacing: 10) {
                ForEach(page.bullets, id: \.self) { bullet in
                    HStack(alignment: .top, spacing: 10) {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(page.tint)
                        Text(bullet)
                            .font(.callout)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            .padding(.horizontal, 34)

            Spacer(minLength: 30)
        }
    }
}
