//
//  Services.swift
//  Andi Notes
//
//  PDF import, page flattening, export, text recognition and the keychain.
//

import Foundation
import SwiftUI
import UIKit
import PDFKit
import PencilKit
import Vision
import Security

// MARK: - PDF

enum PDFImporter {
    struct PageInfo {
        let size: CGSize
        let text: String
    }

    static func pages(from data: Data) -> [PageInfo]? {
        guard let document = PDFDocument(data: data), document.pageCount > 0 else { return nil }
        return (0..<document.pageCount).map { index in
            guard let page = document.page(at: index) else {
                return PageInfo(size: PageGeometry.a4, text: "")
            }
            let bounds = page.bounds(for: .mediaBox)
            return PageInfo(size: CGSize(width: bounds.width, height: bounds.height),
                            text: page.string ?? "")
        }
    }

    static func renderPage(data: Data, index: Int, size: CGSize) -> UIImage? {
        guard let document = PDFDocument(data: data),
              let page = document.page(at: index) else { return nil }
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 2
        format.opaque = true
        return UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))
            context.cgContext.saveGState()
            // PDF pages are drawn bottom-up; flip into UIKit coordinates.
            context.cgContext.translateBy(x: 0, y: size.height)
            context.cgContext.scaleBy(x: 1, y: -1)
            let bounds = page.bounds(for: .mediaBox)
            if bounds.width > 0, bounds.height > 0 {
                context.cgContext.scaleBy(x: size.width / bounds.width,
                                          y: size.height / bounds.height)
            }
            page.draw(with: .mediaBox, to: context.cgContext)
            context.cgContext.restoreGState()
        }
    }
}

// MARK: - Seite flach rendern

enum PageRenderer {
    /// Everything that belongs on the page, in one image: template or PDF,
    /// typed text, and every visible ink layer.
    static func flatten(page: Page,
                        pdfData: Data?,
                        scale: CGFloat = 2,
                        includeTemplate: Bool = true,
                        includeText: Bool = true) -> UIImage {
        let size = page.size
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = scale
        format.opaque = true

        return UIGraphicsImageRenderer(size: size, format: format).image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))

            if let pdfIndex = page.pdfPageIndex, let pdfData,
               let image = PDFImporter.renderPage(data: pdfData, index: pdfIndex, size: size) {
                image.draw(in: CGRect(origin: .zero, size: size))
            } else if includeTemplate {
                TemplateRenderer.draw(page.template, in: context.cgContext, size: size)
            }

            if includeText, let data = page.textRTF, !data.isEmpty,
               let attributed = try? NSAttributedString(
                data: data,
                options: [.documentType: RichText.type],
                documentAttributes: nil
               ) {
                let rect = CGRect(x: 34, y: 36, width: size.width - 68, height: size.height - 72)
                attributed.draw(with: rect, options: [.usesLineFragmentOrigin], context: nil)
            }

            for layer in page.orderedLayers where layer.isVisible {
                guard let data = layer.drawingData, !data.isEmpty,
                      let drawing = try? PKDrawing(data: data) else { continue }
                drawing
                    .image(from: CGRect(origin: .zero, size: size), scale: scale)
                    .draw(in: CGRect(origin: .zero, size: size))
            }

            AnnotationRenderer.draw(page.annotations, in: context.cgContext)
        }
    }
}

// MARK: - Export

enum ExportService {
    private static var exportDirectory: URL {
        let url = URL.temporaryDirectory.appendingPathComponent("Export", isDirectory: true)
        try? FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    static func safeName(_ text: String) -> String {
        let cleaned = text.components(separatedBy: CharacterSet(charactersIn: "/\\:*?\"<>|"))
            .joined(separator: "-")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return cleaned.isEmpty ? "Notiz" : String(cleaned.prefix(60))
    }

    static func pdf(note: Note, pdfData: Data?) -> URL? {
        let pages = note.orderedPages
        guard !pages.isEmpty else { return nil }
        let url = exportDirectory.appendingPathComponent("\(safeName(note.displayTitle)).pdf")

        let firstSize = pages[0].size
        let renderer = UIGraphicsPDFRenderer(bounds: CGRect(origin: .zero, size: firstSize))
        do {
            try renderer.writePDF(to: url) { context in
                for page in pages {
                    context.beginPage(withBounds: CGRect(origin: .zero, size: page.size),
                                      pageInfo: [:])
                    let image = PageRenderer.flatten(page: page, pdfData: pdfData, scale: 2)
                    image.draw(in: CGRect(origin: .zero, size: page.size))
                }
            }
            return url
        } catch {
            return nil
        }
    }

    static func png(image: UIImage, name: String) -> URL? {
        guard let data = image.pngData() else { return nil }
        let url = exportDirectory.appendingPathComponent("\(safeName(name)).png")
        try? data.write(to: url)
        return url
    }

    static func markdown(note: Note) -> URL? {
        var lines = ["# \(note.displayTitle)", ""]
        for (index, page) in note.orderedPages.enumerated() {
            if note.orderedPages.count > 1 {
                lines.append("<!-- Seite \(index + 1) -->")
                lines.append("")
            }
            let text = page.plainText.trimmingCharacters(in: .whitespacesAndNewlines)
            if !text.isEmpty { lines.append(text); lines.append("") }
            if !page.ocrText.isEmpty {
                lines.append("**Erkannter Text:**")
                lines.append("")
                lines.append(page.ocrText)
                lines.append("")
            }
            let strokes = page.orderedLayers.count
            if strokes > 0, page.orderedLayers.contains(where: { ($0.drawingData?.count ?? 0) > 0 }) {
                lines.append("_[Handschrift auf \(strokes) Ebene(n) — im PDF-Export enthalten]_")
                lines.append("")
            }
        }
        let url = exportDirectory.appendingPathComponent("\(safeName(note.displayTitle)).md")
        try? lines.joined(separator: "\n").write(to: url, atomically: true, encoding: .utf8)
        return url
    }
}

// MARK: - Texterkennung

enum OCRService {
    enum OCRError: LocalizedError {
        case noImage
        case failed(String)

        var errorDescription: String? {
            switch self {
            case .noImage: return "Die Seite ließ sich nicht in ein Bild umwandeln."
            case .failed(let message): return message
            }
        }
    }

    /// Vision reads printed text reliably and handwriting reasonably well.
    /// Everything runs on the device.
    static func recognize(image: UIImage, languages: [String] = ["de-DE"]) async throws -> String {
        guard let cgImage = image.cgImage else { throw OCRError.noImage }

        return try await withCheckedThrowingContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                if let error {
                    continuation.resume(throwing: OCRError.failed(error.localizedDescription))
                    return
                }
                let observations = request.results as? [VNRecognizedTextObservation] ?? []
                let text = observations
                    .compactMap { $0.topCandidates(1).first?.string }
                    .joined(separator: "\n")
                continuation.resume(returning: text)
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = languages

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    try handler.perform([request])
                } catch {
                    continuation.resume(throwing: OCRError.failed(error.localizedDescription))
                }
            }
        }
    }

    static var availableLanguages: [(code: String, name: String)] {
        [("de-DE", "Deutsch"), ("en-US", "Englisch"), ("fr-FR", "Französisch"), ("it-IT", "Italienisch")]
    }
}

// MARK: - Schlüsselbund

enum KeychainStore {
    private static let service = "de.andi.notes.apikey"

    static func set(_ value: String, account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
        SecItemDelete(query as CFDictionary)
        guard !value.isEmpty, let data = value.data(using: .utf8) else { return }

        var attributes = query
        attributes[kSecValueData as String] = data
        attributes[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func get(account: String) -> String {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8) else { return "" }
        return value
    }
}
