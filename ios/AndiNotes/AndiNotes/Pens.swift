//
//  Pens.swift
//  Andi Notes
//
//  The pen rack. Every preset maps onto a real PencilKit ink, so pressure,
//  tilt and the Apple Pencil's own feel come for free — this is the part that
//  a web app cannot match.
//

import SwiftUI
import UIKit
import PencilKit

struct PenPreset: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var symbol: String
    var hint: String
    var inkRaw: String
    var width: CGFloat
    var colorHex: String
    var opacity: Double

    var ink: PKInkingTool.InkType {
        PenPreset.inkType(from: inkRaw)
    }

    static func inkType(from raw: String) -> PKInkingTool.InkType {
        switch raw {
        case "pen": return .pen
        case "pencil": return .pencil
        case "marker": return .marker
        case "monoline": return .monoline
        case "fountainPen": return .fountainPen
        case "watercolor": return .watercolor
        case "crayon": return .crayon
        default: return .pen
        }
    }

    var color: Color { Color(hex: colorHex) }

    func tool(color overrideColor: Color? = nil, width overrideWidth: CGFloat? = nil) -> PKInkingTool {
        let base = UIColor(overrideColor ?? color).withAlphaComponent(opacity)
        return PKInkingTool(ink, color: base, width: overrideWidth ?? width)
    }

    /// The presets the app ships with. Widths are in points and stay inside
    /// the range PencilKit accepts for each ink.
    static let all: [PenPreset] = [
        PenPreset(id: "fountain", name: "Füller", symbol: "pencil.and.scribble",
                  hint: "Strichstärke folgt dem Druck — für Handschrift",
                  inkRaw: "fountainPen", width: 5, colorHex: "1B2440", opacity: 1),
        PenPreset(id: "ballpoint", name: "Kugelschreiber", symbol: "pencil",
                  hint: "Gleichmäßig, leicht druckempfindlich",
                  inkRaw: "pen", width: 4, colorHex: "20304F", opacity: 1),
        PenPreset(id: "fineliner", name: "Fineliner", symbol: "line.diagonal",
                  hint: "Immer gleich dick, sehr sauber",
                  inkRaw: "monoline", width: 3, colorHex: "111318", opacity: 1),
        PenPreset(id: "pencil", name: "Bleistift", symbol: "pencil.tip",
                  hint: "Körnig wie Graphit, reagiert auf Neigung",
                  inkRaw: "pencil", width: 6, colorHex: "4A4F5C", opacity: 1),
        PenPreset(id: "brush", name: "Pinsel", symbol: "paintbrush.pointed",
                  hint: "Läuft an den Enden spitz zu",
                  inkRaw: "fountainPen", width: 14, colorHex: "1B1D24", opacity: 1),
        PenPreset(id: "marker", name: "Textmarker", symbol: "highlighter",
                  hint: "Transparent, überdeckt Text nicht",
                  inkRaw: "marker", width: 24, colorHex: "FFD23F", opacity: 0.45),
        PenPreset(id: "crayon", name: "Wachsmaler", symbol: "scribble",
                  hint: "Breit und rau",
                  inkRaw: "crayon", width: 18, colorHex: "F2762E", opacity: 1),
        PenPreset(id: "watercolor", name: "Wasserfarbe", symbol: "drop",
                  hint: "Weiche Kanten, Farben überlagern sich",
                  inkRaw: "watercolor", width: 26, colorHex: "4BA3FF", opacity: 0.8),
        PenPreset(id: "neon", name: "Neon", symbol: "sparkles",
                  hint: "Kräftig und leuchtend auf dunklem Grund",
                  inkRaw: "marker", width: 10, colorHex: "4BE1FF", opacity: 0.95)
    ]

    static func preset(id: String) -> PenPreset {
        all.first { $0.id == id } ?? all[0]
    }
}

// MARK: - Paletten

enum Palettes {
    static let all: [String: [String]] = [
        "Klassisch": ["111318", "20304F", "E5484D", "12A150", "F5A524", "8B5CF6", "8A6B4F", "FFFFFF"],
        "Pastell": ["FFB5C2", "FFD6A5", "FDFFB6", "CAFFBF", "9BF6FF", "BDB2FF", "FFC6FF", "E9EDF5"],
        "Neon": ["FF2E88", "FF9F1C", "FFE100", "3DDC84", "4BE1FF", "8B5CF6", "FF5F1F", "FFFFFF"],
        "Marker": ["FFD23F", "7EF29D", "8ECBFF", "FFA8D2", "C7B3FF", "FFB08A", "B9F6CA", "E0E0E0"],
        "Erde": ["4A3F35", "8A6B4F", "B08968", "DDB892", "7F9172", "556B2F", "2F3E46", "F0EAD2"]
    ]

    static let names = ["Klassisch", "Pastell", "Neon", "Marker", "Erde"]
}

// MARK: - Werkzeugzustand

enum ToolMode: String {
    case draw
    case erase
    case lasso
    case text
    /// One drag along a line of text makes a styled mark.
    case quickMark
}

/// What the toolbar and the canvas agree on. Held by the editor and passed
/// down, so switching a pen updates every visible page at once.
@Observable
final class ToolState {
    var mode: ToolMode = .draw
    var penID: String = "fountain" {
        didSet { loadPreferences(for: penID) }
    }
    var color: Color = Color(hex: "1B2440")
    var width: CGFloat = 5
    var opacity: Double = 1
    var paletteName: String = "Klassisch"
    var eraserWidth: CGFloat = 24
    var eraseWholeStrokes: Bool = false
    var fingerDrawingAllowed: Bool = false
    var isRulerActive: Bool = false
    var markStyle: MarkStyle = .solid

    /// Per-pen settings, so every pen keeps its own colour and thickness.
    private var preferences: [String: PenSettings] = [:]

    struct PenSettings: Codable {
        var colorHex: String
        var width: Double
        var opacity: Double
    }

    init() {
        loadFromDefaults()
        loadPreferences(for: penID)
    }

    var preset: PenPreset { PenPreset.preset(id: penID) }

    var tool: PKTool {
        switch mode {
        case .erase:
            return PKEraserTool(eraseWholeStrokes ? .vector : .bitmap, width: eraserWidth)
        case .lasso:
            return PKLassoTool()
        case .draw, .text, .quickMark:
            return PKInkingTool(preset.ink,
                                color: UIColor(color).withAlphaComponent(opacity),
                                width: width)
        }
    }

    func loadPreferences(for id: String) {
        let preset = PenPreset.preset(id: id)
        let stored = preferences[id]
        color = Color(hex: stored?.colorHex ?? preset.colorHex)
        width = CGFloat(stored?.width ?? Double(preset.width))
        opacity = stored?.opacity ?? preset.opacity
    }

    func rememberCurrentPen() {
        preferences[penID] = PenSettings(colorHex: color.hexString,
                                         width: Double(width),
                                         opacity: opacity)
        saveToDefaults()
    }

    // MARK: Persistenz

    private static let defaultsKey = "toolState"

    private struct Stored: Codable {
        var penID: String
        var palette: String
        var eraserWidth: Double
        var eraseWholeStrokes: Bool
        var fingerDrawingAllowed: Bool
        var preferences: [String: PenSettings]
    }

    func saveToDefaults() {
        let stored = Stored(penID: penID,
                            palette: paletteName,
                            eraserWidth: Double(eraserWidth),
                            eraseWholeStrokes: eraseWholeStrokes,
                            fingerDrawingAllowed: fingerDrawingAllowed,
                            preferences: preferences)
        if let data = try? JSONEncoder().encode(stored) {
            UserDefaults.standard.set(data, forKey: Self.defaultsKey)
        }
    }

    private func loadFromDefaults() {
        guard let data = UserDefaults.standard.data(forKey: Self.defaultsKey),
              let stored = try? JSONDecoder().decode(Stored.self, from: data) else { return }
        preferences = stored.preferences
        paletteName = stored.palette
        eraserWidth = CGFloat(stored.eraserWidth)
        eraseWholeStrokes = stored.eraseWholeStrokes
        fingerDrawingAllowed = stored.fingerDrawingAllowed
        penID = stored.penID
    }
}

// MARK: - Farbhilfen

extension Color {
    init(hex: String) {
        var value: UInt64 = 0
        Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&value)
        let r = Double((value & 0xFF0000) >> 16) / 255
        let g = Double((value & 0x00FF00) >> 8) / 255
        let b = Double(value & 0x0000FF) / 255
        self.init(.sRGB, red: r, green: g, blue: b, opacity: 1)
    }

    var hexString: String {
        let ui = UIColor(self)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        ui.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "%02X%02X%02X",
                      Int(round(r * 255)), Int(round(g * 255)), Int(round(b * 255)))
    }
}
