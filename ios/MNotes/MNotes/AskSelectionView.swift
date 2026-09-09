//
//  AskSelectionView.swift
//  MNotes
//
//  Pick a part of the page — a formula, a paragraph, a sketch with labels —
//  and ask about exactly that. The picked area is read with Vision on the
//  device, and only the recognised text goes to the assistant.
//

import SwiftUI

enum AskAction: String, CaseIterable, Identifiable {
    case explain, summarize, solve, translate, quiz

    var id: String { rawValue }

    var title: String {
        switch self {
        case .explain: return "Erklären"
        case .summarize: return "Kurzfassung"
        case .solve: return "Lösungsweg"
        case .translate: return "Übersetzen"
        case .quiz: return "Abfragen"
        }
    }

    var symbol: String {
        switch self {
        case .explain: return "lightbulb"
        case .summarize: return "text.line.first.and.arrowtriangle.forward"
        case .solve: return "function"
        case .translate: return "character.book.closed"
        case .quiz: return "checkmark.circle"
        }
    }

    var instruction: String {
        switch self {
        case .explain:
            return "Erkläre den folgenden Ausschnitt aus einer Notiz so, dass eine Schülerin ihn versteht. Nenne zuerst in einem Satz, worum es geht, dann die Schritte oder Begriffe einzeln."
        case .summarize:
            return "Fasse den Ausschnitt in höchstens drei Sätzen zusammen."
        case .solve:
            return "Zeige den Rechen- oder Lösungsweg zu diesem Ausschnitt Schritt für Schritt. Schreibe Formeln in normaler Schreibweise, nicht in LaTeX."
        case .translate:
            return "Übersetze den Ausschnitt ins Englische und behalte Fachbegriffe bei."
        case .quiz:
            return "Stelle drei Verständnisfragen zu diesem Ausschnitt, jeweils mit kurzer Antwort."
        }
    }
}

struct AskSelectionView: View {
    @Environment(\.dismiss) private var dismiss

    let image: UIImage
    let page: Page?
    let onInsert: (String) -> Void

    @State private var recognized = ""
    @State private var answer = ""
    @State private var isReading = true
    @State private var isThinking = false
    @State private var failure: String?
    @State private var chosen: AskAction?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 200)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10)
                                .strokeBorder(Color.secondary.opacity(0.3))
                        )

                    if isReading {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("Ausschnitt wird gelesen…").foregroundStyle(.secondary)
                        }
                    } else if recognized.isEmpty {
                        Label("In dem Ausschnitt war kein lesbarer Text. Ein Foto einer Skizze allein kann die Auswertung nicht deuten.",
                              systemImage: "exclamationmark.triangle")
                            .font(.callout)
                            .foregroundStyle(.secondary)
                    } else {
                        DisclosureGroup("Erkannter Text") {
                            Text(recognized)
                                .font(.callout)
                                .textSelection(.enabled)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }

                    if !recognized.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(AskAction.allCases) { action in
                                    Button {
                                        ask(action)
                                    } label: {
                                        Label(action.title, systemImage: action.symbol)
                                            .font(.callout)
                                    }
                                    .buttonStyle(.bordered)
                                    .tint(chosen == action ? .accentColor : .secondary)
                                    .disabled(isThinking)
                                }
                            }
                        }
                    }

                    if isThinking {
                        HStack(spacing: 8) {
                            ProgressView()
                            Text("wird beantwortet…").foregroundStyle(.secondary)
                        }
                    }

                    if let failure {
                        Text(failure)
                            .font(.callout)
                            .foregroundStyle(.red)
                    }

                    if !answer.isEmpty {
                        Text(answer)
                            .font(.callout)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(12)
                            .background(Color.secondary.opacity(0.1),
                                        in: RoundedRectangle(cornerRadius: 12))

                        Button {
                            onInsert(answer)
                            dismiss()
                        } label: {
                            Label("In die Notiz übernehmen", systemImage: "text.insert")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding(16)
            }
            .navigationTitle("Auswahl fragen")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Fertig") { dismiss() }
                }
            }
            .task { await read() }
        }
    }

    private func read() async {
        isReading = true
        do {
            let text = try await OCRService.recognize(image: image, languages: ["de-DE", "en-US"])
            recognized = text
            if !text.isEmpty, let page {
                // Feed it back into the note so search and analysis see it too.
                page.ocrText = (page.ocrText + "\n" + text)
                    .trimmingCharacters(in: .whitespacesAndNewlines)
            }
        } catch {
            failure = error.localizedDescription
        }
        isReading = false
    }

    private func ask(_ action: AskAction) {
        chosen = action
        answer = ""
        failure = nil
        isThinking = true

        let provider = AIProviderFactory.make()
        let context = recognized
        Task {
            do {
                let result = try await provider.chat(question: action.instruction,
                                                     context: context,
                                                     history: [])
                await MainActor.run {
                    answer = result
                    isThinking = false
                }
            } catch {
                await MainActor.run {
                    failure = error.localizedDescription
                    isThinking = false
                }
            }
        }
    }
}
