//
//  Shapes.swift
//  MNotes
//
//  Formen: Linie, Pfeil, Rechteck, Ellipse, Dreieck.
//
//  PencilKit kennt kein Formenwerkzeug, aber es lässt sich ein Strich von Hand
//  bauen. Genau das passiert hier: die Form wird zu Punkten abgetastet und als
//  echter `PKStroke` in die aktive Ebene gelegt. Der Vorteil gegenüber einer
//  eigenen Zeichenebene wie beim Schnellmarker ist, dass eine Form sich danach
//  wie jeder andere Strich verhält — radieren, Lasso, Rückgängig, alles gilt.
//

import UIKit
import PencilKit

enum ShapeKind: String, CaseIterable, Identifiable {
    case line, arrow, rectangle, ellipse, triangle

    var id: String { rawValue }

    var title: String {
        switch self {
        case .line: return "Linie"
        case .arrow: return "Pfeil"
        case .rectangle: return "Rechteck"
        case .ellipse: return "Ellipse"
        case .triangle: return "Dreieck"
        }
    }

    var symbol: String {
        switch self {
        case .line: return "line.diagonal"
        case .arrow: return "arrow.up.right"
        case .rectangle: return "rectangle"
        case .ellipse: return "circle"
        case .triangle: return "triangle"
        }
    }
}

enum ShapeBuilder {

    /// Wie oft eine Ecke wiederholt wird. `PKStrokePath` glättet zwischen den
    /// Kontrollpunkten; ein dreifach gesetzter Punkt bleibt deshalb eine Ecke
    /// statt zu einer Rundung zu verlaufen.
    private static let cornerRepeat = 3

    /// Ob die Form von selbst einrasten soll. Wer ungefähr ein Quadrat zieht,
    /// meint ein Quadrat; wer ungefähr waagerecht zieht, meint waagerecht.
    /// Das erspart eine Zusatztaste, die auf einem iPad ohnehin niemand
    /// findet, und kollidiert nicht mit dem Zoomen.
    static func shouldSnap(kind: ShapeKind, from start: CGPoint, to end: CGPoint) -> Bool {
        let dx = end.x - start.x
        let dy = end.y - start.y

        switch kind {
        case .line, .arrow:
            guard hypot(dx, dy) > 0 else { return false }
            let step = CGFloat.pi / 4
            let angle = atan2(dy, dx)
            let offset = abs(angle - (angle / step).rounded() * step)
            return offset < CGFloat.pi * 7 / 180

        case .rectangle, .ellipse, .triangle:
            let longer = max(abs(dx), abs(dy))
            guard longer > 0 else { return false }
            return abs(abs(dx) - abs(dy)) / longer < 0.08
        }
    }

    /// Punkte entlang der Form, von `start` nach `end` aufgespannt.
    /// Mit `constrained` wird das Rechteck zum Quadrat, die Ellipse zum Kreis
    /// und die Linie auf 45-Grad-Schritte gerade gezogen.
    static func points(for kind: ShapeKind,
                       from start: CGPoint,
                       to end: CGPoint,
                       constrained: Bool = false) -> [CGPoint] {
        let box = rect(from: start, to: end, constrained: constrained)

        switch kind {
        case .line:
            return interpolate([start, constrainedEnd(from: start, to: end, on: constrained)])

        case .arrow:
            let tip = constrainedEnd(from: start, to: end, on: constrained)
            return interpolate([start, tip]) + arrowHead(from: start, to: tip)

        case .rectangle:
            let corners = [
                CGPoint(x: box.minX, y: box.minY),
                CGPoint(x: box.maxX, y: box.minY),
                CGPoint(x: box.maxX, y: box.maxY),
                CGPoint(x: box.minX, y: box.maxY),
                CGPoint(x: box.minX, y: box.minY)
            ]
            return closedPolygon(corners)

        case .triangle:
            let corners = [
                CGPoint(x: box.midX, y: box.minY),
                CGPoint(x: box.maxX, y: box.maxY),
                CGPoint(x: box.minX, y: box.maxY),
                CGPoint(x: box.midX, y: box.minY)
            ]
            return closedPolygon(corners)

        case .ellipse:
            let steps = 72
            let rx = box.width / 2
            let ry = box.height / 2
            return (0...steps).map { step in
                let angle = CGFloat(step) / CGFloat(steps) * 2 * CGFloat.pi
                return CGPoint(x: box.midX + rx * cos(angle),
                               y: box.midY + ry * sin(angle))
            }
        }
    }

    /// Fertiger Strich in der Farbe und Breite des aktiven Stifts.
    static func stroke(for kind: ShapeKind,
                       from start: CGPoint,
                       to end: CGPoint,
                       constrained: Bool = false,
                       ink: PKInk,
                       width: CGFloat) -> PKStroke {
        let path = PKStrokePath(
            controlPoints: points(for: kind, from: start, to: end, constrained: constrained)
                .enumerated()
                .map { index, location in
                    PKStrokePoint(location: location,
                                  timeOffset: Double(index) * 0.005,
                                  size: CGSize(width: width, height: width),
                                  opacity: 1,
                                  force: 1,
                                  azimuth: 0,
                                  altitude: .pi / 2)
                },
            creationDate: Date()
        )
        return PKStroke(ink: ink, path: path)
    }

    // MARK: Hilfsmittel

    private static func rect(from start: CGPoint,
                             to end: CGPoint,
                             constrained: Bool) -> CGRect {
        var width = end.x - start.x
        var height = end.y - start.y
        if constrained {
            let side = max(abs(width), abs(height))
            width = width < 0 ? -side : side
            height = height < 0 ? -side : side
        }
        return CGRect(x: min(start.x, start.x + width),
                      y: min(start.y, start.y + height),
                      width: abs(width),
                      height: abs(height))
    }

    /// Bei gehaltener Einschränkung rastet eine Linie auf 45-Grad-Schritte ein.
    private static func constrainedEnd(from start: CGPoint,
                                       to end: CGPoint,
                                       on constrained: Bool) -> CGPoint {
        guard constrained else { return end }
        let dx = end.x - start.x
        let dy = end.y - start.y
        let length = hypot(dx, dy)
        guard length > 0 else { return end }
        let step = CGFloat.pi / 4
        let angle = (atan2(dy, dx) / step).rounded() * step
        return CGPoint(x: start.x + cos(angle) * length,
                       y: start.y + sin(angle) * length)
    }

    /// Ecken verdoppeln, damit sie scharf bleiben, dann die Kanten abtasten.
    private static func closedPolygon(_ corners: [CGPoint]) -> [CGPoint] {
        guard let first = corners.first else { return [] }
        var result: [CGPoint] = [first]
        for index in 1..<corners.count {
            let corner = corners[index]
            result += Array(interpolate([corners[index - 1], corner]).dropFirst())
            // Zwischenecken doppeln, die letzte nicht: sie schließt die Form.
            if index < corners.count - 1 {
                result += Array(repeating: corner, count: cornerRepeat - 1)
            }
        }
        return result
    }

    /// Zwischenpunkte auf einer Strecke, etwa alle vier Punkte einer.
    private static func interpolate(_ segment: [CGPoint], spacing: CGFloat = 4) -> [CGPoint] {
        guard segment.count == 2 else { return segment }
        let from = segment[0]
        let to = segment[1]
        let distance = hypot(to.x - from.x, to.y - from.y)
        let steps = max(2, Int(distance / spacing))
        return (0...steps).map { step in
            let t = CGFloat(step) / CGFloat(steps)
            return CGPoint(x: from.x + (to.x - from.x) * t,
                           y: from.y + (to.y - from.y) * t)
        }
    }

    /// Zwei kurze Striche an der Spitze, im Winkel zur Linie.
    private static func arrowHead(from start: CGPoint, to tip: CGPoint) -> [CGPoint] {
        let dx = tip.x - start.x
        let dy = tip.y - start.y
        let length = hypot(dx, dy)
        guard length > 1 else { return [] }
        let angle = atan2(dy, dx)
        let size = min(28, max(10, length * 0.22))
        let spread = CGFloat.pi / 7

        let left = CGPoint(x: tip.x - cos(angle - spread) * size,
                           y: tip.y - sin(angle - spread) * size)
        let right = CGPoint(x: tip.x - cos(angle + spread) * size,
                            y: tip.y - sin(angle + spread) * size)

        // Von der Spitze zur einen Seite, zurück zur Spitze, dann zur anderen.
        // So bleibt es ein einziger, zusammenhängender Strich.
        return Array(interpolate([tip, left]).dropFirst())
            + Array(interpolate([left, tip]).dropFirst())
            + Array(interpolate([tip, right]).dropFirst())
    }
}

// MARK: - Eingabe

/// Liegt über der Leinwand, solange das Formenwerkzeug aktiv ist. Ein Ziehen
/// spannt die Form auf; wer nah genug an einem Quadrat oder einer geraden
/// Linie landet, bekommt sie sauber.
final class ShapeDrawView: UIView {
    var onShape: ((CGPoint, CGPoint, Bool) -> Void)?
    var kind: ShapeKind = .rectangle
    var previewColor: UIColor = .label
    var previewWidth: CGFloat = 4

    private var start: CGPoint?
    private var current: CGPoint?
    private var isConstrained = false
    private let shape = CAShapeLayer()
    private let hint = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        shape.fillColor = nil
        shape.lineCap = .round
        shape.lineJoin = .round
        layer.addSublayer(shape)

        hint.text = "Ziehen spannt die Form auf, fast gerade wird gerade"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 13, weight: .medium)
        hint.textAlignment = .center
        hint.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        hint.layer.cornerRadius = 10
        hint.layer.masksToBounds = true
        addSubview(hint)

        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan))
        pan.maximumNumberOfTouches = 1
        addGestureRecognizer(pan)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) wird nicht verwendet") }

    override func layoutSubviews() {
        super.layoutSubviews()
        hint.frame = CGRect(x: (bounds.width - 420) / 2, y: 16, width: 420, height: 32)
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let point = gesture.location(in: self)
        if let start {
            isConstrained = ShapeBuilder.shouldSnap(kind: kind, from: start, to: point)
        }

        switch gesture.state {
        case .began:
            start = point
            current = point
            isConstrained = false
            hint.isHidden = true
        case .changed:
            current = point
            updatePreview()
        case .ended:
            defer { reset(keepHintHidden: true) }
            guard let from = start else { return }
            guard hypot(point.x - from.x, point.y - from.y) > 6 else { return }
            onShape?(from, point, isConstrained)
        default:
            reset(keepHintHidden: true)
        }
    }

    private func updatePreview() {
        guard let start, let current else { return }
        let points = ShapeBuilder.points(for: kind,
                                         from: start,
                                         to: current,
                                         constrained: isConstrained)
        guard let first = points.first else { return }
        let path = UIBezierPath()
        path.move(to: first)
        for point in points.dropFirst() { path.addLine(to: point) }
        shape.path = path.cgPath
        shape.strokeColor = previewColor.withAlphaComponent(0.6).cgColor
        shape.lineWidth = previewWidth
    }

    func reset(keepHintHidden: Bool = false) {
        start = nil
        current = nil
        shape.path = nil
        if !keepHintHidden { hint.isHidden = false }
    }
}
