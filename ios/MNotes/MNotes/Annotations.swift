//
//  Annotations.swift
//  MNotes
//
//  Schnellmarker: ein Strich entlang einer Zeile wird zu einer sauberen
//  Markierung — durchgezogen, gestrichelt, gewellt, im Zickzack, doppelt oder
//  als Balken hinter dem Text.
//
//  PencilKit kennt keine Linienstile, deshalb liegen diese Anmerkungen als
//  eigene, sehr kleine Datenstruktur an der Seite und werden mit Core Graphics
//  gezeichnet — über der Handschrift, damit sie das Markierte nicht verdeckt.
//

import SwiftUI
import UIKit

// MARK: - Datenmodell

enum MarkStyle: String, CaseIterable, Identifiable, Codable {
    case solid, dashed, wavy, zigzag, double, block

    var id: String { rawValue }

    var title: String {
        switch self {
        case .solid: return "Durchgezogen"
        case .dashed: return "Gestrichelt"
        case .wavy: return "Wellenlinie"
        case .zigzag: return "Zickzack"
        case .double: return "Doppellinie"
        case .block: return "Balken"
        }
    }

    var symbol: String {
        switch self {
        case .solid: return "minus"
        case .dashed: return "line.horizontal.3"
        case .wavy: return "wave.3.right"
        case .zigzag: return "chevron.up.chevron.down"
        case .double: return "equal"
        case .block: return "rectangle.fill"
        }
    }
}

struct LineAnnotation: Codable, Identifiable, Hashable {
    var id: UUID = UUID()
    var style: MarkStyle = .solid
    var colorHex: String = "E5484D"
    var width: Double = 3
    var opacity: Double = 1
    var start: CGPoint = .zero
    var end: CGPoint = .zero

    var color: UIColor { UIColor(Color(hex: colorHex)) }

    /// Distance from a point to the line, for tap-to-remove.
    func distance(to point: CGPoint) -> CGFloat {
        let dx = end.x - start.x
        let dy = end.y - start.y
        let lengthSquared = dx * dx + dy * dy
        guard lengthSquared > 0 else { return hypot(point.x - start.x, point.y - start.y) }
        var t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared
        t = max(0, min(1, t))
        return hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy))
    }
}

enum AnnotationStore {
    static func load(_ data: Data?) -> [LineAnnotation] {
        guard let data, !data.isEmpty else { return [] }
        return (try? JSONDecoder().decode([LineAnnotation].self, from: data)) ?? []
    }

    static func save(_ annotations: [LineAnnotation]) -> Data? {
        annotations.isEmpty ? nil : try? JSONEncoder().encode(annotations)
    }
}

// MARK: - Zeichnen

enum AnnotationRenderer {
    static func draw(_ annotations: [LineAnnotation], in ctx: CGContext) {
        for mark in annotations {
            ctx.saveGState()
            ctx.setAlpha(mark.opacity)
            ctx.setLineCap(mark.style == .block ? .butt : .round)
            ctx.setLineJoin(.round)
            ctx.setStrokeColor(mark.color.cgColor)
            ctx.setFillColor(mark.color.cgColor)
            ctx.setLineWidth(mark.width)

            // Marks snap to the horizontal: a hand-drawn underline should end
            // up straight, which is the point of the tool.
            let y = (mark.start.y + mark.end.y) / 2
            let left = CGPoint(x: min(mark.start.x, mark.end.x), y: y)
            let right = CGPoint(x: max(mark.start.x, mark.end.x), y: y)

            switch mark.style {
            case .solid:
                line(ctx, left, right)
            case .dashed:
                ctx.setLineDash(phase: 0, lengths: [mark.width * 2.6, mark.width * 2])
                line(ctx, left, right)
                ctx.setLineDash(phase: 0, lengths: [])
            case .wavy:
                wave(ctx, left, right, amplitude: mark.width * 1.2, wavelength: mark.width * 5, sharp: false)
            case .zigzag:
                wave(ctx, left, right, amplitude: mark.width * 1.2, wavelength: mark.width * 4, sharp: true)
            case .double:
                let gap = mark.width * 1.6
                line(ctx, CGPoint(x: left.x, y: y - gap / 2), CGPoint(x: right.x, y: y - gap / 2))
                line(ctx, CGPoint(x: left.x, y: y + gap / 2), CGPoint(x: right.x, y: y + gap / 2))
            case .block:
                let height = max(mark.width * 4, 14)
                ctx.setAlpha(mark.opacity * 0.35)
                ctx.fill(CGRect(x: left.x, y: y - height / 2, width: right.x - left.x, height: height))
            }
            ctx.restoreGState()
        }
    }

    private static func line(_ ctx: CGContext, _ from: CGPoint, _ to: CGPoint) {
        ctx.beginPath()
        ctx.move(to: from)
        ctx.addLine(to: to)
        ctx.strokePath()
    }

    private static func wave(_ ctx: CGContext,
                             _ from: CGPoint,
                             _ to: CGPoint,
                             amplitude: CGFloat,
                             wavelength: CGFloat,
                             sharp: Bool) {
        let length = to.x - from.x
        guard length > 1, wavelength > 1 else { return }
        ctx.beginPath()
        ctx.move(to: from)

        if sharp {
            var x = from.x
            var up = true
            while x < to.x {
                let next = min(x + wavelength / 2, to.x)
                ctx.addLine(to: CGPoint(x: next, y: from.y + (up ? -amplitude : amplitude)))
                up.toggle()
                x = next
            }
            ctx.addLine(to: to)
        } else {
            let step: CGFloat = 2
            var x = from.x
            while x < to.x {
                let progress = (x - from.x) / wavelength
                let y = from.y + sin(progress * 2 * .pi) * amplitude
                ctx.addLine(to: CGPoint(x: x, y: y))
                x += step
            }
            ctx.addLine(to: to)
        }
        ctx.strokePath()
    }
}

// MARK: - Eingabe

/// Sits above the canvas while the quick marker is active: one drag makes one
/// mark, a tap on an existing mark removes it.
final class QuickMarkView: UIView {
    var onMark: ((CGPoint, CGPoint) -> Void)?
    var onTap: ((CGPoint) -> Void)?
    var previewColor: UIColor = .systemRed
    var previewWidth: CGFloat = 3

    private var start: CGPoint?
    private var current: CGPoint?
    private let shape = CAShapeLayer()
    private let hint = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = .clear
        shape.fillColor = nil
        shape.lineCap = .round
        layer.addSublayer(shape)

        hint.text = "Entlang der Zeile ziehen — tippen entfernt eine Markierung"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 13, weight: .medium)
        hint.textAlignment = .center
        hint.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        hint.layer.cornerRadius = 10
        hint.layer.masksToBounds = true
        addSubview(hint)

        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan))
        addGestureRecognizer(pan)
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        addGestureRecognizer(tap)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) wird nicht verwendet") }

    override func layoutSubviews() {
        super.layoutSubviews()
        hint.frame = CGRect(x: (bounds.width - 400) / 2, y: 16, width: 400, height: 32)
    }

    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        onTap?(gesture.location(in: self))
    }

    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let point = gesture.location(in: self)
        switch gesture.state {
        case .began:
            start = point
            current = point
            hint.isHidden = true
        case .changed:
            current = point
            updatePreview()
        case .ended:
            defer {
                start = nil
                current = nil
                shape.path = nil
            }
            guard let from = start else { return }
            guard hypot(point.x - from.x, point.y - from.y) > 8 else { return }
            onMark?(from, point)
        default:
            start = nil
            current = nil
            shape.path = nil
        }
    }

    private func updatePreview() {
        guard let start, let current else { return }
        let y = (start.y + current.y) / 2
        let path = UIBezierPath()
        path.move(to: CGPoint(x: start.x, y: y))
        path.addLine(to: CGPoint(x: current.x, y: y))
        shape.path = path.cgPath
        shape.strokeColor = previewColor.withAlphaComponent(0.6).cgColor
        shape.lineWidth = previewWidth
    }

    func reset() {
        start = nil
        current = nil
        shape.path = nil
        hint.isHidden = false
    }
}
