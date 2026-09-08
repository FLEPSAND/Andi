//
//  Templates.swift
//  Andi Notes
//
//  Page backgrounds. They are drawn with Core Graphics rather than shipped as
//  images, so they stay sharp at every zoom level and adapt to the page size.
//

import SwiftUI
import UIKit

enum PageTemplate: String, CaseIterable, Identifiable {
    case blank, lines, linesWide, grid, gridSmall, dots
    case handwriting, music, cornell
    case todo, week
    case storyboard, isometric

    var id: String { rawValue }

    var name: String {
        switch self {
        case .blank: return "Leer"
        case .lines: return "Liniert"
        case .linesWide: return "Weit liniert"
        case .grid: return "Kariert"
        case .gridSmall: return "Rechenkästchen"
        case .dots: return "Punktraster"
        case .handwriting: return "Schreiblinien"
        case .music: return "Notenlinien"
        case .cornell: return "Cornell"
        case .todo: return "Aufgabenliste"
        case .week: return "Wochenplan"
        case .storyboard: return "Storyboard"
        case .isometric: return "Isometrisch"
        }
    }

    var group: String {
        switch self {
        case .blank, .lines, .linesWide, .grid, .gridSmall, .dots: return "Basis"
        case .handwriting, .music, .cornell: return "Schule"
        case .todo, .week: return "Planen"
        case .storyboard, .isometric: return "Kreativ"
        }
    }

    static let groups = ["Basis", "Schule", "Planen", "Kreativ"]
}

enum TemplateRenderer {
    static let lineColor = UIColor(red: 0.79, green: 0.82, blue: 0.89, alpha: 1)
    static let softColor = UIColor(red: 0.87, green: 0.90, blue: 0.94, alpha: 1)
    static let accentColor = UIColor(red: 0.62, green: 0.70, blue: 0.91, alpha: 1)
    static let labelColor = UIColor(red: 0.58, green: 0.63, blue: 0.74, alpha: 1)

    /// Renders a template into an image of the given size.
    static func image(for template: PageTemplate, size: CGSize, scale: CGFloat = 0) -> UIImage {
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = scale > 0 ? scale : UIScreen.main.scale
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(size: size, format: format)
        return renderer.image { context in
            draw(template, in: context.cgContext, size: size)
        }
    }

    static func draw(_ template: PageTemplate, in ctx: CGContext, size: CGSize) {
        ctx.setLineCap(.butt)
        switch template {
        case .blank:
            break
        case .lines:
            horizontalLines(ctx, size: size, spacing: 26)
        case .linesWide:
            horizontalLines(ctx, size: size, spacing: 34)
        case .grid:
            squares(ctx, size: size, spacing: 20, color: softColor)
        case .gridSmall:
            squares(ctx, size: size, spacing: 12, color: softColor)
        case .dots:
            dots(ctx, size: size, spacing: 18)
        case .handwriting:
            handwriting(ctx, size: size, spacing: 34)
        case .music:
            music(ctx, size: size)
        case .cornell:
            cornell(ctx, size: size)
        case .todo:
            todo(ctx, size: size)
        case .week:
            week(ctx, size: size)
        case .storyboard:
            storyboard(ctx, size: size)
        case .isometric:
            isometric(ctx, size: size, spacing: 22)
        }
    }

    // MARK: Bausteine

    private static func horizontalLines(_ ctx: CGContext, size: CGSize, spacing: CGFloat) {
        ctx.setStrokeColor(lineColor.cgColor)
        ctx.setLineWidth(0.8)
        var y = spacing * 2
        while y < size.height - spacing {
            ctx.move(to: CGPoint(x: 34, y: y))
            ctx.addLine(to: CGPoint(x: size.width - 34, y: y))
            y += spacing
        }
        ctx.strokePath()
    }

    private static func squares(_ ctx: CGContext, size: CGSize, spacing: CGFloat, color: UIColor) {
        ctx.setStrokeColor(color.cgColor)
        ctx.setLineWidth(0.7)
        var x = spacing
        while x < size.width {
            ctx.move(to: CGPoint(x: x, y: 0))
            ctx.addLine(to: CGPoint(x: x, y: size.height))
            x += spacing
        }
        var y = spacing
        while y < size.height {
            ctx.move(to: CGPoint(x: 0, y: y))
            ctx.addLine(to: CGPoint(x: size.width, y: y))
            y += spacing
        }
        ctx.strokePath()
    }

    private static func dots(_ ctx: CGContext, size: CGSize, spacing: CGFloat) {
        ctx.setFillColor(lineColor.cgColor)
        var y = spacing
        while y < size.height {
            var x = spacing
            while x < size.width {
                ctx.fillEllipse(in: CGRect(x: x - 1, y: y - 1, width: 2, height: 2))
                x += spacing
            }
            y += spacing
        }
    }

    private static func handwriting(_ ctx: CGContext, size: CGSize, spacing: CGFloat) {
        var y = spacing * 2
        while y < size.height - spacing {
            ctx.setStrokeColor(lineColor.cgColor)
            ctx.setLineWidth(0.9)
            ctx.move(to: CGPoint(x: 34, y: y))
            ctx.addLine(to: CGPoint(x: size.width - 34, y: y))
            ctx.strokePath()

            ctx.setStrokeColor(accentColor.cgColor)
            ctx.setLineWidth(0.7)
            ctx.setLineDash(phase: 0, lengths: [4, 4])
            ctx.move(to: CGPoint(x: 34, y: y - spacing / 2))
            ctx.addLine(to: CGPoint(x: size.width - 34, y: y - spacing / 2))
            ctx.strokePath()
            ctx.setLineDash(phase: 0, lengths: [])

            y += spacing
        }
    }

    private static func music(_ ctx: CGContext, size: CGSize) {
        ctx.setStrokeColor(lineColor.cgColor)
        ctx.setLineWidth(0.8)
        let staffGap: CGFloat = 8
        let blockGap: CGFloat = 74
        var top: CGFloat = 60
        while top + staffGap * 4 < size.height - 40 {
            for i in 0..<5 {
                let y = top + CGFloat(i) * staffGap
                ctx.move(to: CGPoint(x: 40, y: y))
                ctx.addLine(to: CGPoint(x: size.width - 40, y: y))
            }
            top += blockGap
        }
        ctx.strokePath()
    }

    private static func cornell(_ ctx: CGContext, size: CGSize) {
        let cue = size.width * 0.3
        let summaryY = size.height - 120
        ctx.setStrokeColor(accentColor.cgColor)
        ctx.setLineWidth(1.2)
        ctx.move(to: CGPoint(x: 0, y: 60))
        ctx.addLine(to: CGPoint(x: size.width, y: 60))
        ctx.move(to: CGPoint(x: cue, y: 60))
        ctx.addLine(to: CGPoint(x: cue, y: summaryY))
        ctx.move(to: CGPoint(x: 0, y: summaryY))
        ctx.addLine(to: CGPoint(x: size.width, y: summaryY))
        ctx.strokePath()

        label("Thema / Datum", at: CGPoint(x: 16, y: 24), size: 13, in: ctx)
        label("Fragen", at: CGPoint(x: 16, y: 70), size: 11, in: ctx)
        label("Notizen", at: CGPoint(x: cue + 14, y: 70), size: 11, in: ctx)
        label("Zusammenfassung", at: CGPoint(x: 16, y: summaryY + 10), size: 11, in: ctx)
    }

    private static func todo(_ ctx: CGContext, size: CGSize) {
        let rowHeight: CGFloat = 34
        var y: CGFloat = 60
        ctx.setLineWidth(1.1)
        while y < size.height - 30 {
            ctx.setStrokeColor(accentColor.cgColor)
            let box = CGRect(x: 40, y: y, width: 16, height: 16)
            ctx.addPath(UIBezierPath(roundedRect: box, cornerRadius: 4).cgPath)
            ctx.strokePath()

            ctx.setStrokeColor(softColor.cgColor)
            ctx.setLineWidth(0.8)
            ctx.move(to: CGPoint(x: 68, y: y + 20))
            ctx.addLine(to: CGPoint(x: size.width - 40, y: y + 20))
            ctx.strokePath()
            ctx.setLineWidth(1.1)

            y += rowHeight
        }
    }

    private static func week(_ ctx: CGContext, size: CGSize) {
        let days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa / So"]
        let top: CGFloat = 60
        let rowHeight = (size.height - top - 30) / CGFloat(days.count)
        label("Woche", at: CGPoint(x: 30, y: 24), size: 16, in: ctx)

        for (i, day) in days.enumerated() {
            let y = top + CGFloat(i) * rowHeight
            ctx.setStrokeColor(accentColor.cgColor)
            ctx.setLineWidth(1)
            ctx.move(to: CGPoint(x: 30, y: y))
            ctx.addLine(to: CGPoint(x: size.width - 30, y: y))
            ctx.strokePath()
            label(day, at: CGPoint(x: 34, y: y + 6), size: 12, in: ctx)

            ctx.setStrokeColor(softColor.cgColor)
            ctx.setLineWidth(0.7)
            var line = y + 26
            while line < y + rowHeight - 6 {
                ctx.move(to: CGPoint(x: 84, y: line))
                ctx.addLine(to: CGPoint(x: size.width - 30, y: line))
                line += 20
            }
            ctx.strokePath()
        }
    }

    private static func storyboard(_ ctx: CGContext, size: CGSize) {
        let columns = 2
        let rows = 3
        let padding: CGFloat = 24
        let cellWidth = (size.width - padding * CGFloat(columns + 1)) / CGFloat(columns)
        let cellHeight = (size.height - padding * CGFloat(rows + 1)) / CGFloat(rows)

        for row in 0..<rows {
            for column in 0..<columns {
                let x = padding + CGFloat(column) * (cellWidth + padding)
                let y = padding + CGFloat(row) * (cellHeight + padding)
                ctx.setStrokeColor(accentColor.cgColor)
                ctx.setLineWidth(1.2)
                let frame = CGRect(x: x, y: y, width: cellWidth, height: cellHeight * 0.68)
                ctx.addPath(UIBezierPath(roundedRect: frame, cornerRadius: 8).cgPath)
                ctx.strokePath()

                ctx.setStrokeColor(softColor.cgColor)
                ctx.setLineWidth(0.8)
                for line in 1...3 {
                    let ly = y + cellHeight * 0.68 + CGFloat(line) * 15
                    ctx.move(to: CGPoint(x: x, y: ly))
                    ctx.addLine(to: CGPoint(x: x + cellWidth, y: ly))
                }
                ctx.strokePath()
            }
        }
    }

    private static func isometric(_ ctx: CGContext, size: CGSize, spacing: CGFloat) {
        ctx.setStrokeColor(softColor.cgColor)
        ctx.setLineWidth(0.7)
        let slope = tan(CGFloat.pi / 6)   // 30°

        var x = -size.height * slope
        while x < size.width + size.height * slope {
            ctx.move(to: CGPoint(x: x, y: 0))
            ctx.addLine(to: CGPoint(x: x + size.height * slope, y: size.height))
            ctx.move(to: CGPoint(x: x, y: 0))
            ctx.addLine(to: CGPoint(x: x - size.height * slope, y: size.height))
            x += spacing
        }
        ctx.strokePath()
    }

    private static func label(_ text: String, at point: CGPoint, size: CGFloat, in ctx: CGContext) {
        let attributes: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: size, weight: .regular),
            .foregroundColor: labelColor
        ]
        UIGraphicsPushContext(ctx)
        (text as NSString).draw(at: point, withAttributes: attributes)
        UIGraphicsPopContext()
    }
}
