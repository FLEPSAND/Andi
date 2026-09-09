//
//  AIService.swift
//  MNotes
//
//  Two ways to make sense of a note:
//
//  `LocalProvider` works on the device without a network or a key. It is not a
//  language model — it weighs and picks sentences that are already in the
//  note, pulls out task lines, and finds passages matching a question.
//
//  `AnthropicProvider` calls the Claude API with a key the user supplies.
//

import Foundation

enum AITask: String, CaseIterable, Identifiable {
    case summary, keypoints, actions, quiz

    var id: String { rawValue }

    var title: String {
        switch self {
        case .summary: return "Zusammenfassung"
        case .keypoints: return "Kernpunkte"
        case .actions: return "Aufgaben"
        case .quiz: return "Lernfragen"
        }
    }

    var instruction: String {
        switch self {
        case .summary:
            return "Fasse die Notiz in 4–6 Sätzen zusammen. Schreibe sachlich und ohne Einleitungsfloskel."
        case .keypoints:
            return "Nenne die wichtigsten Punkte der Notiz als kurze Liste mit höchstens 8 Einträgen, ein Punkt pro Zeile, beginnend mit \"- \"."
        case .actions:
            return "Liste alle Aufgaben, Zusagen und Termine aus der Notiz als \"- [ ] …\" auf. Wenn keine enthalten sind, antworte genau: Keine Aufgaben gefunden."
        case .quiz:
            return "Erstelle 5 Verständnisfragen zum Inhalt, jeweils mit kurzer Antwort. Format: \"F: …\" gefolgt von \"A: …\"."
        }
    }
}

protocol AIProvider {
    var label: String { get }
    var isRemote: Bool { get }
    func analyze(_ task: AITask, text: String) async throws -> String
    func chat(question: String, context: String, history: [ChatMessage]) async throws -> String
}

enum AIError: LocalizedError {
    case missingKey
    case http(Int, String)
    case empty

    var errorDescription: String? {
        switch self {
        case .missingKey: return "Kein API-Schlüssel hinterlegt. In den Einstellungen eintragen."
        case .http(let code, let detail): return "Anfrage fehlgeschlagen (\(code)): \(detail)"
        case .empty: return "Die Antwort war leer."
        }
    }
}

// MARK: - Auswahl

enum AIProviderFactory {
    static func make() -> AIProvider {
        let settings = AppSettings.shared
        switch settings.provider {
        case .anthropic:
            let key = KeychainStore.get(account: "anthropic")
            return key.isEmpty ? LocalProvider() : AnthropicProvider(apiKey: key, model: settings.model)
        case .local:
            return LocalProvider()
        }
    }
}

// MARK: - Lokal

struct LocalProvider: AIProvider {
    let label = "lokal"
    let isRemote = false

    func analyze(_ task: AITask, text: String) async throws -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 60 else {
            return "Die Notiz enthält noch zu wenig Text für eine Auswertung."
        }

        switch task {
        case .summary:
            let count = min(6, max(3, Int(Double(TextAnalysis.sentences(trimmed).count) * 0.2)))
            let picked = TextAnalysis.rank(trimmed, count: count)
            return picked.isEmpty ? "Kein zusammenhängender Text gefunden." : picked.joined(separator: " ")

        case .keypoints:
            let picked = TextAnalysis.rank(trimmed, count: 8).map { "- \($0)" }
            let topics = TextAnalysis.frequencies(trimmed)
                .sorted { $0.value > $1.value }
                .prefix(6)
                .map(\.key)
            var out = picked.joined(separator: "\n")
            if !topics.isEmpty {
                out += "\n\nHäufige Begriffe: " + topics.joined(separator: ", ")
            }
            return out

        case .actions:
            let hits = TextAnalysis.actionItems(trimmed)
            return hits.isEmpty
                ? "Keine Aufgaben gefunden."
                : hits.map { "- [ ] \($0)" }.joined(separator: "\n")

        case .quiz:
            let picked = TextAnalysis.rank(trimmed, count: 5)
            guard !picked.isEmpty else { return "Zu wenig Text für Lernfragen." }
            let frequencies = TextAnalysis.frequencies(trimmed)
            return picked.enumerated().map { index, sentence in
                let words = TextAnalysis.words(sentence)
                guard let term = words.max(by: { (frequencies[$0] ?? 0) < (frequencies[$1] ?? 0) }) else {
                    return "\(index + 1). \(sentence)"
                }
                let gapped = sentence.replacingOccurrences(of: term,
                                                           with: "_____",
                                                           options: [.caseInsensitive])
                return "\(index + 1). Lückentext: \(gapped)\n   Antwort: \(term)"
            }.joined(separator: "\n\n")
        }
    }

    func chat(question: String, context: String, history: [ChatMessage]) async throws -> String {
        let query = question.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !query.isEmpty else { return "" }
        guard context.trimmingCharacters(in: .whitespacesAndNewlines).count >= 30 else {
            return "Die Notiz ist noch leer — ohne Inhalt kann die lokale Auswertung nichts nachschlagen."
        }

        let queryWords = Set(TextAnalysis.words(query))
        let matches = TextAnalysis.sentences(context)
            .enumerated()
            .map { (index: $0.offset, sentence: $0.element,
                    score: TextAnalysis.words($0.element).filter { queryWords.contains($0) }.count) }
            .filter { $0.score > 0 }
            .sorted { $0.score > $1.score }
            .prefix(3)
            .sorted { $0.index < $1.index }

        guard !matches.isEmpty else {
            return "Dazu steht nichts in der Notiz. (Die lokale Suche vergleicht nur Wörter — für echte Antworten in den Einstellungen einen Schlüssel hinterlegen.)"
        }
        return "Passende Stellen aus der Notiz:\n\n"
            + matches.map { "> \($0.sentence)" }.joined(separator: "\n\n")
    }
}

// MARK: - Anthropic

struct AnthropicProvider: AIProvider {
    let apiKey: String
    let model: String

    var label: String { "Claude" }
    var isRemote: Bool { true }

    private static let systemPrompt = """
    Du bist ein Assistent in einer Notiz-App und arbeitest ausschließlich mit dem gelieferten Notiztext. \
    Antworte auf Deutsch, sachlich und knapp, ohne Höflichkeitsfloskeln und ohne die Frage zu wiederholen. \
    Wenn die Notiz die Frage nicht beantwortet, sag genau das, statt zu raten.
    """

    private static let maxContext = 24_000

    func analyze(_ task: AITask, text: String) async throws -> String {
        try await send(messages: [[
            "role": "user",
            "content": "\(task.instruction)\n\n<notiz>\n\(Self.clip(text))\n</notiz>"
        ]])
    }

    func chat(question: String, context: String, history: [ChatMessage]) async throws -> String {
        var messages: [[String: String]] = history.suffix(8).map {
            ["role": $0.role, "content": $0.content]
        }
        messages.append([
            "role": "user",
            "content": "<notiz>\n\(Self.clip(context))\n</notiz>\n\nFrage: \(question)"
        ])
        return try await send(messages: messages)
    }

    private func send(messages: [[String: String]]) async throws -> String {
        guard !apiKey.isEmpty else { throw AIError.missingKey }

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.timeoutInterval = 60

        let body: [String: Any] = [
            "model": model.isEmpty ? "claude-sonnet-5" : model,
            "max_tokens": 1500,
            "system": Self.systemPrompt,
            "messages": messages
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard (200..<300).contains(status) else {
            throw AIError.http(status, Self.errorDetail(from: data))
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let content = json["content"] as? [[String: Any]] else {
            throw AIError.empty
        }
        let text = content
            .filter { ($0["type"] as? String) == "text" }
            .compactMap { $0["text"] as? String }
            .joined(separator: "\n")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { throw AIError.empty }
        return text
    }

    private static func errorDetail(from data: Data) -> String {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let error = json["error"] as? [String: Any] else {
            return String(data: data, encoding: .utf8)?.prefix(200).description ?? "unbekannt"
        }
        return (error["message"] as? String) ?? (error["type"] as? String) ?? "unbekannt"
    }

    private static func clip(_ text: String) -> String {
        text.count > maxContext ? String(text.prefix(maxContext)) + "\n[…gekürzt]" : text
    }
}

// MARK: - Textanalyse

enum TextAnalysis {
    static let stopwords: Set<String> = Set("""
    aber alle allem allen aller alles als also am an andere anderen auch auf aus bei beim bin bis bist da damit
    dann das dass dem den denn der des dessen die dies diese diesem diesen dieser dieses doch dort durch ein
    eine einem einen einer eines er es etwas euch euer für gegen gewesen hab habe haben hat hatte hatten hier
    ihr ihre ihrem ihren ihrer ihres im in indem ins ist ja jede jedem jeden jeder jedes jene jetzt kann kein
    keine können könnte man mehr mein meine mit muss musste nach nicht nichts noch nun nur ob oder ohne schon
    sehr sein seine seinem seinen seiner sich sie sind so solche soll sollte sondern sonst über um und uns
    unser unter vom von vor war waren warum was weg weil weiter welche wenn wer werde werden wie wieder will
    wir wird wirst wo wollen wollte würde zu zum zur zwar zwischen
    about after also and any are because been but can could did does for from get had has have how into its
    just like make more most not now only other our out over said say see should since some such than that
    the their them then there these they this those too under use very was way were what when where which
    who will with would you your
    """.split(whereSeparator: \.isWhitespace).map(String.init))

    static let actionPattern = try? NSRegularExpression(
        pattern: "\\b(muss|müssen|sollte|sollen|todo|to-do|aufgabe|deadline|frist|erledigen|klären|prüfen|vorbereiten|nachfragen|abgeben|lernen|üben|termin|nicht vergessen)\\b",
        options: [.caseInsensitive]
    )

    static func sentences(_ text: String) -> [String] {
        var result: [String] = []
        let flat = text.replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
        flat.enumerateSubstrings(in: flat.startIndex..<flat.endIndex,
                                 options: [.bySentences, .localized]) { substring, _, _, _ in
            if let substring {
                let trimmed = substring.trimmingCharacters(in: .whitespacesAndNewlines)
                if trimmed.count > 25 { result.append(trimmed) }
            }
        }
        return result
    }

    static func words(_ text: String) -> [String] {
        text.lowercased()
            .components(separatedBy: CharacterSet.alphanumerics.inverted)
            .filter { $0.count > 3 && !stopwords.contains($0) }
    }

    static func frequencies(_ text: String) -> [String: Int] {
        words(text).reduce(into: [:]) { counts, word in counts[word, default: 0] += 1 }
    }

    /// Picks the sentences that carry the most of the note's frequent words,
    /// keeping them in their original order.
    static func rank(_ text: String, count: Int) -> [String] {
        let list = sentences(text)
        guard !list.isEmpty else { return [] }
        let frequencies = frequencies(text)

        let scored = list.enumerated().map { index, sentence -> (Int, String, Double) in
            let terms = words(sentence)
            guard !terms.isEmpty else { return (index, sentence, 0) }
            let sum = terms.reduce(0) { $0 + (frequencies[$1] ?? 0) }
            // Long sentences have to earn their length.
            let score = Double(sum) / Double(terms.count).squareRoot()
            return (index, sentence, index == 0 ? score * 1.25 : score)
        }

        return scored
            .sorted { $0.2 > $1.2 }
            .prefix(count)
            .sorted { $0.0 < $1.0 }
            .map(\.1)
    }

    static func actionItems(_ text: String) -> [String] {
        var hits: [String] = []
        let lines = text.components(separatedBy: .newlines)
            .flatMap { $0.count > 200 ? sentences($0) : [$0] }

        for raw in lines {
            var line = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !line.isEmpty, line.count < 240 else { continue }

            let checkbox = line.hasPrefix("- [ ]") || line.hasPrefix("[]") || line.hasPrefix("☐")
            let range = NSRange(line.startIndex..., in: line)
            let mentionsTask = actionPattern?.firstMatch(in: line, range: range) != nil

            guard checkbox || mentionsTask else { continue }
            for prefix in ["- [ ]", "- [x]", "☐", "-", "*", "•"] where line.hasPrefix(prefix) {
                line = String(line.dropFirst(prefix.count)).trimmingCharacters(in: .whitespaces)
            }
            if !line.isEmpty, !hits.contains(line) { hits.append(line) }
        }
        return hits
    }
}
