//
//  PenRail.swift
//  MNotes
//
//  Die senkrechte Werkzeugleiste am linken Seitenrand. Die Stifte werden
//  selbst gezeichnet (kein Symbol aus einer fremden Vorlage), der aktive
//  Stift schiebt sich seitlich heraus.
//

import SwiftUI
import PencilKit

// MARK: - Stiftform

/// Zeichnet einen einzelnen Stift liegend, nach rechts zeigend. Die Form
/// hängt von der Tinte ab, damit die neun Stifte erkennbar bleiben.
struct PenShape: View {
    let preset: PenPreset
    let color: Color
    let compact: Bool

    private var length: CGFloat { compact ? 34 : 48 }
    private var height: CGFloat { compact ? 18 : 22 }

    var body: some View {
        Canvas { context, size in
            let w = size.width
            let h = size.height
            switch preset.inkRaw {
            case "fountainPen": drawFountain(&context, w: w, h: h)
            case "pen": drawBallpoint(&context, w: w, h: h)
            case "monoline": drawMonoline(&context, w: w, h: h)
            case "pencil": drawPencil(&context, w: w, h: h)
            case "marker": drawMarker(&context, w: w, h: h)
            case "crayon": drawCrayon(&context, w: w, h: h)
            case "watercolor": drawWatercolor(&context, w: w, h: h)
            default: drawBallpoint(&context, w: w, h: h)
            }
        }
        .frame(width: length, height: height)
        .accessibilityLabel(preset.name)
    }

    // MARK: Zeichnung

    private func drawFountain(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let midY = h / 2
        let shaft = CGRect(x: 0, y: h * 0.12, width: w * 0.58, height: h * 0.76)
        c.fill(Path(roundedRect: shaft, cornerRadius: shaft.height / 2), with: .color(color))
        gloss(&c, rect: shaft)
        // lange, schmale Feder
        let nib = Path { p in
            p.move(to: CGPoint(x: w * 0.56, y: h * 0.30))
            p.addLine(to: CGPoint(x: w * 0.96, y: midY))
            p.addLine(to: CGPoint(x: w * 0.56, y: h * 0.70))
            p.closeSubpath()
        }
        c.fill(nib, with: .color(color))
        // Schlitz in der Mitte
        var slit = Path()
        slit.move(to: CGPoint(x: w * 0.60, y: midY))
        slit.addLine(to: CGPoint(x: w * 0.86, y: midY))
        c.stroke(slit, with: .color(Color.black.opacity(0.30)), lineWidth: 1)
    }

    private func drawBallpoint(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let midY = h / 2
        let shaft = CGRect(x: 0, y: h * 0.15, width: w * 0.66, height: h * 0.70)
        c.fill(Path(roundedRect: shaft, cornerRadius: shaft.height / 2), with: .color(color))
        gloss(&c, rect: shaft)
        // kurzer, stumpfer Konus
        let cone = Path { p in
            p.move(to: CGPoint(x: w * 0.64, y: h * 0.22))
            p.addLine(to: CGPoint(x: w * 0.86, y: midY))
            p.addLine(to: CGPoint(x: w * 0.64, y: h * 0.78))
            p.closeSubpath()
        }
        c.fill(cone, with: .color(color))
        // kleine Kugel vorn
        let ball = CGRect(x: w * 0.84, y: midY - h * 0.10, width: h * 0.20, height: h * 0.20)
        c.fill(Path(ellipseIn: ball), with: .color(color))
    }

    private func drawMonoline(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let midY = h / 2
        let shaft = CGRect(x: 0, y: midY - h * 0.19, width: w * 0.56, height: h * 0.38)
        c.fill(Path(roundedRect: shaft, cornerRadius: shaft.height / 2), with: .color(color))
        gloss(&c, rect: shaft)
        // sehr spitze Spitze
        let tip = Path { p in
            p.move(to: CGPoint(x: w * 0.54, y: midY - h * 0.16))
            p.addLine(to: CGPoint(x: w, y: midY))
            p.addLine(to: CGPoint(x: w * 0.54, y: midY + h * 0.16))
            p.closeSubpath()
        }
        c.fill(tip, with: .color(color))
    }

    private func drawPencil(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let midY = h / 2
        // sechseckiger Schaft
        let x0: CGFloat = 0
        let x1 = w * 0.66
        let bevel = h * 0.16
        let shaft = Path { p in
            p.move(to: CGPoint(x: x0, y: midY - h * 0.40))
            p.addLine(to: CGPoint(x: x0 + bevel, y: midY - h * 0.5))
            p.addLine(to: CGPoint(x: x1 - bevel, y: midY - h * 0.5))
            p.addLine(to: CGPoint(x: x1, y: midY - h * 0.40))
            p.addLine(to: CGPoint(x: x1, y: midY + h * 0.40))
            p.addLine(to: CGPoint(x: x1 - bevel, y: midY + h * 0.5))
            p.addLine(to: CGPoint(x: x0 + bevel, y: midY + h * 0.5))
            p.addLine(to: CGPoint(x: x0, y: midY + h * 0.40))
            p.closeSubpath()
        }
        c.fill(shaft, with: .color(color))
        gloss(&c, rect: CGRect(x: 0, y: midY - h * 0.5, width: w * 0.66, height: h * 0.42))
        // holzfarbene Spitze
        let wood = Path { p in
            p.move(to: CGPoint(x: w * 0.64, y: midY - h * 0.34))
            p.addLine(to: CGPoint(x: w * 0.93, y: midY))
            p.addLine(to: CGPoint(x: w * 0.64, y: midY + h * 0.34))
            p.closeSubpath()
        }
        c.fill(wood, with: .color(Color(hex: "E6C79C")))
        // dunkle Mine
        let lead = Path { p in
            p.move(to: CGPoint(x: w * 0.90, y: midY - h * 0.10))
            p.addLine(to: CGPoint(x: w, y: midY))
            p.addLine(to: CGPoint(x: w * 0.90, y: midY + h * 0.10))
            p.closeSubpath()
        }
        c.fill(lead, with: .color(Color(hex: "2E2E2E")))
    }

    private func drawMarker(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let shaft = CGRect(x: 0, y: h * 0.08, width: w * 0.70, height: h * 0.84)
        c.fill(Path(roundedRect: shaft, cornerRadius: h * 0.12), with: .color(color))
        gloss(&c, rect: shaft)
        // abgeschrägte (Meißel-)Spitze
        let tip = Path { p in
            p.move(to: CGPoint(x: w * 0.68, y: h * 0.12))
            p.addLine(to: CGPoint(x: w, y: h * 0.12))
            p.addLine(to: CGPoint(x: w * 0.80, y: h * 0.88))
            p.addLine(to: CGPoint(x: w * 0.68, y: h * 0.88))
            p.closeSubpath()
        }
        c.fill(tip, with: .color(color))
    }

    private func drawCrayon(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let shaft = CGRect(x: 0, y: h * 0.10, width: w * 0.58, height: h * 0.80)
        c.fill(Path(roundedRect: shaft, cornerRadius: h * 0.16), with: .color(color))
        gloss(&c, rect: shaft)
        // runde, stumpfe Spitze
        let tip = Path { p in
            p.move(to: CGPoint(x: w * 0.56, y: h * 0.16))
            p.addQuadCurve(to: CGPoint(x: w * 0.92, y: h * 0.5),
                           control: CGPoint(x: w * 0.98, y: h * 0.10))
            p.addQuadCurve(to: CGPoint(x: w * 0.56, y: h * 0.84),
                           control: CGPoint(x: w * 0.98, y: h * 0.90))
            p.closeSubpath()
        }
        c.fill(tip, with: .color(color))
    }

    private func drawWatercolor(_ c: inout GraphicsContext, w: CGFloat, h: CGFloat) {
        let midY = h / 2
        let shaft = CGRect(x: 0, y: h * 0.16, width: w * 0.56, height: h * 0.68)
        c.fill(Path(roundedRect: shaft, cornerRadius: shaft.height / 2), with: .color(color))
        gloss(&c, rect: shaft)
        // Zwinge (Metallband)
        let ferrule = CGRect(x: w * 0.56, y: h * 0.20, width: w * 0.10, height: h * 0.60)
        c.fill(Path(roundedRect: ferrule, cornerRadius: 2), with: .color(Color.gray.opacity(0.55)))
        // Pinselkopf
        let head = Path { p in
            p.move(to: CGPoint(x: w * 0.66, y: h * 0.22))
            p.addLine(to: CGPoint(x: w * 0.96, y: midY))
            p.addLine(to: CGPoint(x: w * 0.66, y: h * 0.78))
            p.closeSubpath()
        }
        c.fill(head, with: .color(color))
        // angedeutete Borsten
        for i in 0..<3 {
            var line = Path()
            let frac = CGFloat(i + 1) / 4
            line.move(to: CGPoint(x: w * 0.66, y: h * 0.22 + (h * 0.56) * frac))
            line.addLine(to: CGPoint(x: w * 0.92, y: midY))
            c.stroke(line, with: .color(Color.black.opacity(0.22)), lineWidth: 0.8)
        }
    }

    /// Ein heller Streifen oben auf dem Schaft als angedeuteter Glanz.
    private func gloss(_ c: inout GraphicsContext, rect: CGRect) {
        let g = CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: rect.height * 0.45)
        c.fill(
            Path(roundedRect: g, cornerRadius: g.height / 2),
            with: .linearGradient(
                Gradient(colors: [Color.white.opacity(0.30), Color.white.opacity(0)]),
                startPoint: CGPoint(x: g.midX, y: g.minY),
                endPoint: CGPoint(x: g.midX, y: g.maxY)
            )
        )
    }
}

// MARK: - Werkzeugleiste

/// Die senkrechte Stiftleiste am linken Rand der Seite.
struct PenRail: View {
    let tools: ToolState
    let onRemoveLastMark: () -> Void

    @Environment(\.horizontalSizeClass) private var sizeClass
    @State private var adjustingPen = false

    private var compact: Bool { sizeClass == .compact }
    private var slideOut: CGFloat { compact ? 10 : 14 }
    private var buttonSize: CGFloat { compact ? 28 : 34 }
    private var symbolSize: CGFloat { compact ? 14 : 16 }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: compact ? 4 : 6) {
                toolButton("eraser", mode: .erase, active: tools.mode == .erase)
                toolButton("lasso", mode: .lasso, active: tools.mode == .lasso)
                quickMarkMenu
                shapeMenu

                if tools.mode == .erase {
                    wholeStrokesToggle
                }

                Divider()

                ForEach(PenPreset.all) { preset in
                    penButton(preset)
                }

                Divider()

                paletteMenu
            }
            .padding(compact ? 4 : 6)
        }
        .frame(width: compact ? 40 : 56)
    }

    // MARK: Werkzeuge

    private func toolButton(_ systemImage: String, mode: ToolMode, active: Bool) -> some View {
        Button {
            tools.mode = mode
        } label: {
            Image(systemName: systemImage)
                .font(.system(size: symbolSize))
                .frame(width: buttonSize, height: buttonSize)
                .background(Circle().fill(active ? Color.accentColor.opacity(0.20) : Color.clear))
        }
        .buttonStyle(.plain)
        .tint(active ? .accentColor : .secondary)
        .help(modeTitle(mode))
    }

    private func modeTitle(_ mode: ToolMode) -> String {
        switch mode {
        case .erase: return "Radierer"
        case .lasso: return "Lasso"
        case .quickMark: return "Schnellmarker"
        case .shape: return "Formen"
        default: return ""
        }
    }

    private var quickMarkMenu: some View {
        Menu {
            ForEach(MarkStyle.allCases) { style in
                Button {
                    tools.markStyle = style
                    tools.mode = .quickMark
                } label: {
                    Label(style.title, systemImage: style.symbol)
                }
            }
            Divider()
            Button("Letzte Markierung entfernen") { onRemoveLastMark() }
        } label: {
            Image(systemName: tools.markStyle.symbol)
                .font(.system(size: symbolSize))
                .frame(width: buttonSize, height: buttonSize)
        }
        .buttonStyle(.plain)
        .tint(tools.mode == .quickMark ? .accentColor : .secondary)
        .help("Schnellmarker: \(tools.markStyle.title)")
    }

    private var shapeMenu: some View {
        Menu {
            ForEach(ShapeKind.allCases) { kind in
                Button {
                    tools.shapeKind = kind
                    tools.mode = .shape
                } label: {
                    Label(kind.title, systemImage: kind.symbol)
                }
            }
        } label: {
            Image(systemName: tools.shapeKind.symbol)
                .font(.system(size: symbolSize))
                .frame(width: buttonSize, height: buttonSize)
        }
        .buttonStyle(.plain)
        .tint(tools.mode == .shape ? .accentColor : .secondary)
        .help("Form: \(tools.shapeKind.title)")
    }

    private var wholeStrokesToggle: some View {
        Toggle(isOn: Binding(
            get: { tools.eraseWholeStrokes },
            set: { tools.eraseWholeStrokes = $0; tools.saveToDefaults() }
        )) {
            Image(systemName: "scribble.variable")
                .font(.system(size: symbolSize))
        }
        .toggleStyle(.button)
        .frame(width: buttonSize, height: buttonSize)
        .help("Ganze Striche radieren")
    }

    // MARK: Stifte

    private func penButton(_ preset: PenPreset) -> some View {
        let isActive = tools.mode == .draw && tools.penID == preset.id
        return Button {
            if isActive {
                adjustingPen = true
            } else {
                tools.mode = .draw
                tools.penID = preset.id
                tools.saveToDefaults()
            }
        } label: {
            PenShape(preset: preset, color: tools.displayColor(for: preset), compact: compact)
        }
        .buttonStyle(.plain)
        .offset(x: isActive ? slideOut : 0)
        .animation(.spring(response: 0.28, dampingFraction: 0.8), value: tools.penID)
        .popover(isPresented: Binding(
            get: { isActive && adjustingPen },
            set: { if !$0 { adjustingPen = false } }
        )) {
            PenAdjuster(tools: tools)
                .presentationCompactAdaptation(.popover)
        }
        .help(preset.hint)
    }

    // MARK: Farbpalette

    private var paletteMenu: some View {
        Menu {
            ForEach(Palettes.names, id: \.self) { name in
                Button(name) {
                    tools.paletteName = name
                    tools.saveToDefaults()
                }
            }
        } label: {
            Image(systemName: "circle.hexagongrid.fill")
                .font(.system(size: symbolSize))
                .frame(width: buttonSize, height: buttonSize)
        }
        .buttonStyle(.plain)
        .tint(.secondary)
        .help("Farbpalette")
    }
}

// MARK: - Stift-Einstellungen (Popover)

/// Der Inhalt des Popovers für einen aktiven Stift: Farbwähler, Strichbreite
/// und Deckkraft.
private struct PenAdjuster: View {
    let tools: ToolState

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Stift anpassen")
                .font(.headline)
            ColorRow(tools: tools)
            StrokeSliders(tools: tools)
        }
        .padding()
        .frame(minWidth: 300)
    }
}

/// Farbauswahl für den aktiven Stift (Palettenwechsel, Farbfelder, Pipette).
struct ColorRow: View {
    let tools: ToolState

    var body: some View {
        HStack(spacing: 6) {
            Menu {
                ForEach(Palettes.names, id: \.self) { name in
                    Button(name) {
                        tools.paletteName = name
                        tools.saveToDefaults()
                    }
                }
            } label: {
                Text(tools.paletteName)
                    .font(.caption)
            }

            ForEach(Palettes.all[tools.paletteName] ?? [], id: \.self) { hex in
                Button {
                    tools.color = Color(hex: hex)
                    tools.rememberCurrentPen()
                } label: {
                    Circle()
                        .fill(Color(hex: hex))
                        .frame(width: 22, height: 22)
                        .overlay(
                            Circle().strokeBorder(
                                tools.color.hexString == hex ? Color.accentColor : Color.gray.opacity(0.35),
                                lineWidth: tools.color.hexString == hex ? 2.5 : 1
                            )
                        )
                }
                .buttonStyle(.plain)
            }

            ColorPicker("", selection: Binding(
                get: { tools.color },
                set: { tools.color = $0; tools.rememberCurrentPen() }
            ))
            .labelsHidden()
            .frame(width: 28)
        }
    }
}

/// Strichbreite und Deckkraft für den aktiven Stift.
struct StrokeSliders: View {
    let tools: ToolState

    var body: some View {
        VStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Dicke").font(.caption2).foregroundStyle(.secondary)
                Slider(value: Binding(
                    get: { Double(tools.mode == .erase ? tools.eraserWidth : tools.width) },
                    set: { value in
                        if tools.mode == .erase { tools.eraserWidth = CGFloat(value) }
                        else { tools.width = CGFloat(value); tools.rememberCurrentPen() }
                    }
                ), in: 1...60)
            }

            if tools.mode != .erase {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Deckkraft").font(.caption2).foregroundStyle(.secondary)
                    Slider(value: Binding(
                        get: { tools.opacity },
                        set: { tools.opacity = $0; tools.rememberCurrentPen() }
                    ), in: 0.1...1)
                }
            }
        }
    }
}
