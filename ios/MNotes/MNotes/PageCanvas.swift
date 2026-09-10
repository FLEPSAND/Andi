//
//  PageCanvas.swift
//  MNotes
//
//  One page = one PKCanvasView plus two image views.
//
//  PencilKit has no layers, so the page is composed by hand: everything below
//  the active layer is flattened into a background image, everything above it
//  into an overlay, and only the active layer sits in the canvas where the
//  Apple Pencil can reach it. Because PKCanvasView is a scroll view, zooming
//  and panning come from PencilKit itself — the two image views and the text
//  view are kept in step in `syncOverlays()`, which is what keeps the ink
//  crisp at every zoom level.
//

import SwiftUI
import SwiftData
import PencilKit
import UIKit

struct PageCanvas: UIViewControllerRepresentable {
    let page: Page
    let tools: ToolState
    /// Rendered PDF page, if the note came from a PDF.
    var pdfImage: UIImage?
    /// True while the assistant is waiting for a rectangle to be drawn.
    var isSelectingRegion: Bool = false
    /// Called after the pen leaves the page, so the caller can save.
    var onChange: () -> Void
    /// Handed a controller reference so the editor can trigger exports.
    var onController: ((PageCanvasController) -> Void)?
    /// The chosen area, in page coordinates.
    var onRegionSelected: ((CGRect) -> Void)?

    func makeUIViewController(context: Context) -> PageCanvasController {
        let controller = PageCanvasController()
        controller.page = page
        controller.tools = tools
        controller.pdfImage = pdfImage
        controller.onChange = onChange
        controller.onRegionSelected = onRegionSelected
        controller.isSelectingRegion = isSelectingRegion
        onController?(controller)
        return controller
    }

    func updateUIViewController(_ controller: PageCanvasController, context: Context) {
        controller.page = page
        controller.tools = tools
        controller.pdfImage = pdfImage
        controller.onChange = onChange
        controller.onRegionSelected = onRegionSelected
        if controller.isSelectingRegion != isSelectingRegion {
            controller.isSelectingRegion = isSelectingRegion
        }
        controller.apply()
    }
}

final class PageCanvasController: UIViewController, PKCanvasViewDelegate, UITextViewDelegate {

    // MARK: Zustand

    var page: Page!
    var tools: ToolState!
    var pdfImage: UIImage?
    var onChange: (() -> Void)?

    private let canvasView = PKCanvasView()
    private let backgroundView = UIImageView()
    private let overlayView = UIImageView()
    private let textView = UITextView()
    private let shadowView = UIView()

    private var loadedLayerID: PersistentIdentifier?
    private var loadedPageID: PersistentIdentifier?
    private var lastTemplate: PageTemplate?
    private var lastSize: CGSize = .zero
    private var isApplyingDrawing = false
    private var hasSetInitialZoom = false

    private let selectionOverlay = RegionSelectionView()
    private let markOverlay = QuickMarkView()
    private let shapeOverlay = ShapeDrawView()
    /// Handed the chosen rectangle in page coordinates.
    var onRegionSelected: ((CGRect) -> Void)?
    var isSelectingRegion = false {
        didSet {
            guard isViewLoaded else { return }
            selectionOverlay.isHidden = !isSelectingRegion
            selectionOverlay.reset()
            canvasView.isScrollEnabled = !isSelectingRegion
        }
    }

    private var pageSize: CGSize { page.size }

    // MARK: Aufbau

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor.secondarySystemBackground
        view.clipsToBounds = true

        shadowView.backgroundColor = .white
        shadowView.layer.shadowColor = UIColor.black.cgColor
        shadowView.layer.shadowOpacity = 0.18
        shadowView.layer.shadowRadius = 12
        shadowView.layer.shadowOffset = CGSize(width: 0, height: 4)
        shadowView.isUserInteractionEnabled = false
        view.addSubview(shadowView)

        backgroundView.contentMode = .scaleToFill
        backgroundView.isUserInteractionEnabled = false
        backgroundView.backgroundColor = .white
        view.addSubview(backgroundView)

        canvasView.backgroundColor = .clear
        canvasView.isOpaque = false
        canvasView.delegate = self
        canvasView.alwaysBounceVertical = true
        canvasView.minimumZoomScale = 0.25
        canvasView.maximumZoomScale = 5
        canvasView.showsVerticalScrollIndicator = false
        canvasView.showsHorizontalScrollIndicator = false
        view.addSubview(canvasView)

        overlayView.contentMode = .scaleToFill
        overlayView.isUserInteractionEnabled = false
        view.addSubview(overlayView)

        textView.backgroundColor = .clear
        textView.delegate = self
        textView.isHidden = true
        textView.allowsEditingTextAttributes = true
        textView.textContainerInset = UIEdgeInsets(top: 36, left: 34, bottom: 36, right: 34)
        textView.font = UIFont.preferredFont(forTextStyle: .body)
        textView.textColor = .black
        textView.isScrollEnabled = false
        view.addSubview(textView)

        markOverlay.isHidden = true
        markOverlay.onMark = { [weak self] from, to in
            guard let self else { return }
            self.addMark(from: self.toPage(from), to: self.toPage(to))
        }
        markOverlay.onTap = { [weak self] point in
            guard let self else { return }
            self.removeMark(near: self.toPage(point))
        }

        shapeOverlay.isHidden = true
        shapeOverlay.onShape = { [weak self] from, to, constrained in
            guard let self else { return }
            self.addShape(from: self.toPage(from),
                          to: self.toPage(to),
                          constrained: constrained)
        }

        selectionOverlay.isHidden = true
        selectionOverlay.onFinish = { [weak self] rect in
            guard let self else { return }
            self.isSelectingRegion = false
            let zoom = self.canvasView.zoomScale
            let origin = CGPoint(x: -self.canvasView.contentOffset.x,
                                 y: -self.canvasView.contentOffset.y)
            // Screen rectangle back into page coordinates.
            let inPage = CGRect(x: (rect.minX - origin.x) / zoom,
                                y: (rect.minY - origin.y) / zoom,
                                width: rect.width / zoom,
                                height: rect.height / zoom)
                .intersection(CGRect(origin: .zero, size: self.pageSize))
            guard inPage.width > 12, inPage.height > 12 else { return }
            self.onRegionSelected?(inPage)
        }
        view.addSubview(selectionOverlay)
        view.addSubview(markOverlay)
        view.addSubview(shapeOverlay)

        apply()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        canvasView.frame = view.bounds
        selectionOverlay.frame = view.bounds
        markOverlay.frame = view.bounds
        shapeOverlay.frame = view.bounds
        canvasView.contentSize = pageSize
        if !hasSetInitialZoom, view.bounds.width > 0 {
            hasSetInitialZoom = true
            zoomToFit()
        }
        centerContent()
        syncOverlays()
    }

    // MARK: Anwenden

    /// Brings the canvas in line with the model and the current tool. Cheap
    /// enough to call from `updateUIViewController` on every SwiftUI update.
    func apply() {
        guard isViewLoaded, let page, let tools else { return }

        if loadedPageID != page.persistentModelID {
            loadedPageID = page.persistentModelID
            loadedLayerID = nil
            hasSetInitialZoom = false
            lastTemplate = nil
        }

        // Active layer into the canvas
        let active = page.activeLayer
        if active?.persistentModelID != loadedLayerID {
            loadedLayerID = active?.persistentModelID
            isApplyingDrawing = true
            canvasView.drawing = drawing(of: active)
            isApplyingDrawing = false
            renderComposites()
        }

        if lastTemplate != page.template || lastSize != pageSize {
            lastTemplate = page.template
            lastSize = pageSize
            renderComposites()
            view.setNeedsLayout()
        }

        canvasView.tool = tools.tool
        canvasView.drawingPolicy = tools.fingerDrawingAllowed ? .anyInput : .pencilOnly
        canvasView.isRulerActive = tools.isRulerActive
        canvasView.isUserInteractionEnabled = true

        let marking = tools.mode == .quickMark
        markOverlay.isHidden = !marking
        markOverlay.previewColor = UIColor(tools.color)
        markOverlay.previewWidth = tools.width
        if marking { markOverlay.reset() }

        let shaping = tools.mode == .shape
        shapeOverlay.isHidden = !shaping
        shapeOverlay.kind = tools.shapeKind
        shapeOverlay.previewColor = UIColor(tools.color)
        shapeOverlay.previewWidth = tools.width
        if shaping { shapeOverlay.reset() }

        let editingText = tools.mode == .text
        textView.isHidden = !editingText
        canvasView.isScrollEnabled = true
        if editingText {
            loadText()
        } else if textView.isFirstResponder {
            saveText()
            textView.resignFirstResponder()
        }

        // A locked layer may be looked at but not drawn on.
        if active?.isLocked == true, tools.mode != .lasso {
            canvasView.tool = PKLassoTool()
            shapeOverlay.isHidden = true
        }
    }

    private func drawing(of layer: InkLayer?) -> PKDrawing {
        guard let data = layer?.drawingData, !data.isEmpty else { return PKDrawing() }
        return (try? PKDrawing(data: data)) ?? PKDrawing()
    }

    // MARK: Zusammensetzen

    /// Flattens the template, the PDF page, the typed text and the inactive
    /// layers into the two image views around the canvas.
    func renderComposites() {
        guard let page else { return }
        let size = pageSize
        guard size.width > 0, size.height > 0 else { return }

        // Cap the bitmap edge for a whiteboard (4000 × 3000); A4 is unaffected.
        let maxEdge: CGFloat = 4000
        let safeScale = min(min(UIScreen.main.scale, 2), maxEdge / max(size.width, size.height))
        let layers = page.orderedLayers
        let activeIndex = min(max(page.activeLayerIndex, 0), max(layers.count - 1, 0))

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = safeScale
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(size: size, format: format)

        backgroundView.image = renderer.image { context in
            UIColor.white.setFill()
            context.fill(CGRect(origin: .zero, size: size))

            if let pdfImage {
                pdfImage.draw(in: CGRect(origin: .zero, size: size))
            } else {
                TemplateRenderer.draw(page.template, in: context.cgContext, size: size)
            }

            drawText(in: size)

            for (index, layer) in layers.enumerated() where index < activeIndex && layer.isVisible {
                drawing(of: layer)
                    .image(from: CGRect(origin: .zero, size: size), scale: safeScale)
                    .draw(in: CGRect(origin: .zero, size: size))
            }
        }

        let above = layers.enumerated().filter { $0.offset > activeIndex && $0.element.isVisible }
        let marks = page.annotations
        overlayView.image = (above.isEmpty && marks.isEmpty) ? nil : renderer.image { context in
            for (_, layer) in above {
                drawing(of: layer)
                    .image(from: CGRect(origin: .zero, size: size), scale: safeScale)
                    .draw(in: CGRect(origin: .zero, size: size))
            }
            // Marks go on top: they highlight, they must not be buried.
            AnnotationRenderer.draw(marks, in: context.cgContext)
        }
    }

    private func drawText(in size: CGSize) {
        guard let data = page.textRTF, !data.isEmpty,
              let attributed = try? NSAttributedString(
                data: data,
                options: [.documentType: RichText.type],
                documentAttributes: nil
              ), attributed.length > 0 else { return }
        let inset = textView.textContainerInset
        let rect = CGRect(x: inset.left,
                          y: inset.top,
                          width: size.width - inset.left - inset.right,
                          height: size.height - inset.top - inset.bottom)
        attributed.draw(with: rect, options: [.usesLineFragmentOrigin], context: nil)
    }

    // MARK: Zoom und Ausrichtung

    private func zoomToFit() {
        let available = view.bounds.inset(by: UIEdgeInsets(top: 20, left: 20, bottom: 20, right: 20))
        guard available.width > 0, pageSize.width > 0 else { return }

        // Ein Whiteboard nicht auf die ganze Fläche verkleinern, sondern oben
        // links in etwa Originalgröße öffnen.
        if page.note?.kind == .whiteboard {
            canvasView.minimumZoomScale = 0.25
            canvasView.maximumZoomScale = 5
            canvasView.zoomScale = 1.0
            canvasView.contentOffset = .zero
            return
        }

        let scale = min(available.width / pageSize.width, available.height / pageSize.height)
        canvasView.minimumZoomScale = max(0.1, scale * 0.5)
        canvasView.maximumZoomScale = max(scale * 6, 5)
        canvasView.zoomScale = scale
    }

    func zoom(by factor: CGFloat) {
        let target = min(max(canvasView.zoomScale * factor, canvasView.minimumZoomScale),
                         canvasView.maximumZoomScale)
        canvasView.setZoomScale(target, animated: true)
    }

    func zoomToFitAnimated() {
        hasSetInitialZoom = false
        view.setNeedsLayout()
    }

    private func centerContent() {
        let scaled = CGSize(width: pageSize.width * canvasView.zoomScale,
                            height: pageSize.height * canvasView.zoomScale)
        let insetX = max(0, (canvasView.bounds.width - scaled.width) / 2)
        let insetY = max(0, (canvasView.bounds.height - scaled.height) / 2)
        canvasView.contentInset = UIEdgeInsets(top: insetY, left: insetX, bottom: insetY, right: insetX)
    }

    /// The image views and the text view are not inside the scroll view, so
    /// they have to follow its offset and zoom by hand.
    private func syncOverlays() {
        let zoom = canvasView.zoomScale
        let frame = CGRect(x: -canvasView.contentOffset.x,
                           y: -canvasView.contentOffset.y,
                           width: pageSize.width * zoom,
                           height: pageSize.height * zoom)
        backgroundView.frame = frame
        overlayView.frame = frame
        shadowView.frame = frame

        textView.bounds = CGRect(origin: .zero, size: pageSize)
        textView.transform = CGAffineTransform(scaleX: zoom, y: zoom)
        textView.center = CGPoint(x: frame.midX, y: frame.midY)
    }

    // MARK: Schnellmarker

    /// Screen point into page coordinates.
    private func toPage(_ point: CGPoint) -> CGPoint {
        let zoom = canvasView.zoomScale
        return CGPoint(x: (point.x + canvasView.contentOffset.x) / zoom,
                       y: (point.y + canvasView.contentOffset.y) / zoom)
    }

    private func addMark(from: CGPoint, to: CGPoint) {
        var marks = page.annotations
        marks.append(LineAnnotation(style: tools.markStyle,
                                    colorHex: tools.color.hexString,
                                    width: Double(max(2, tools.width)),
                                    opacity: tools.opacity,
                                    start: from,
                                    end: to))
        page.annotations = marks
        renderComposites()
        onChange?()
    }

    // MARK: Formen

    /// Legt die aufgespannte Form als echten Strich in die aktive Ebene. Damit
    /// gilt für sie alles, was für Handschrift gilt: Radierer, Lasso,
    /// Rückgängig. Der Umweg über den `undoManager` der Leinwand sorgt dafür,
    /// dass ein Rückgängig die Form wieder entfernt.
    private func addShape(from: CGPoint, to: CGPoint, constrained: Bool) {
        guard page.activeLayer?.isLocked == false else { return }

        let stroke = ShapeBuilder.stroke(for: tools.shapeKind,
                                         from: from,
                                         to: to,
                                         constrained: constrained,
                                         ink: tools.inkingTool.ink,
                                         width: tools.width)

        replaceDrawing(with: PKDrawing(strokes: canvasView.drawing.strokes + [stroke]))
    }

    /// Tauscht die Zeichnung der aktiven Ebene und merkt den Stand davor fürs
    /// Rückgängig. Das Zurückschreiben in die Ebene übernimmt der Delegat, der
    /// auch bei einer gesetzten Zeichnung anspringt.
    private func replaceDrawing(with drawing: PKDrawing) {
        let previous = canvasView.drawing
        canvasView.undoManager?.registerUndo(withTarget: self) { controller in
            controller.replaceDrawing(with: previous)
        }
        canvasView.drawing = drawing
    }

    private func removeMark(near point: CGPoint) {
        let marks = page.annotations
        guard let hit = marks
            .filter({ $0.distance(to: point) < max(14, $0.width * 3) })
            .min(by: { $0.distance(to: point) < $1.distance(to: point) }) else { return }
        page.annotations = marks.filter { $0.id != hit.id }
        renderComposites()
        onChange?()
    }

    func removeLastMark() {
        var marks = page.annotations
        guard !marks.isEmpty else { return }
        marks.removeLast()
        page.annotations = marks
        renderComposites()
        onChange?()
    }

    // MARK: PKCanvasViewDelegate

    func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
        guard !isApplyingDrawing, let layer = page.activeLayer else { return }
        layer.drawingData = canvasView.drawing.dataRepresentation()
        onChange?()
    }

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        syncOverlays()
    }

    func scrollViewDidZoom(_ scrollView: UIScrollView) {
        centerContent()
        syncOverlays()
    }

    // MARK: Text

    private func loadText() {
        guard !textView.isFirstResponder else { return }
        if let data = page.textRTF, !data.isEmpty,
           let attributed = try? NSAttributedString(
            data: data,
            options: [.documentType: RichText.type],
            documentAttributes: nil
           ) {
            textView.attributedText = attributed
        } else {
            textView.text = ""
            textView.font = UIFont.preferredFont(forTextStyle: .body)
            textView.textColor = .black
        }
    }

    func saveText() {
        let attributed = textView.attributedText ?? NSAttributedString()
        page.setRTF(try? attributed.data(
            from: NSRange(location: 0, length: attributed.length),
            documentAttributes: [.documentType: RichText.type]
        ))
        onChange?()
        renderComposites()
    }

    func textViewDidEndEditing(_ textView: UITextView) {
        saveText()
    }

    func textViewDidChange(_ textView: UITextView) {
        // Grow the sheet instead of clipping what was just written.
        let fitting = textView.sizeThatFits(CGSize(width: pageSize.width,
                                                   height: .greatestFiniteMagnitude))
        if fitting.height > pageSize.height {
            page.height = Double(fitting.height + 60)
            lastSize = pageSize
            renderComposites()
            view.setNeedsLayout()
            onChange?()
        }
    }

    // MARK: Export

    /// The whole page as one image — used for PDF export, PNG export and OCR.
    func flatten(scale: CGFloat = 2) -> UIImage {
        PageRenderer.flatten(page: page, pdfData: page.note?.pdfData, scale: scale)
    }

    /// Ink only, on white — Vision recognises handwriting better without the
    /// ruled background competing with it.
    func inkOnly(scale: CGFloat = 2) -> UIImage {
        PageRenderer.flatten(page: page,
                             pdfData: page.note?.pdfData,
                             scale: scale,
                             includeTemplate: false,
                             includeText: false)
    }

    /// The chosen part of the page as its own image — for OCR and the
    /// assistant, which should only see what was picked.
    func image(of pageRect: CGRect, scale: CGFloat = 3) -> UIImage? {
        let full = PageRenderer.flatten(page: page,
                                        pdfData: page.note?.pdfData,
                                        scale: scale,
                                        includeTemplate: false)
        guard let cgImage = full.cgImage else { return nil }
        let crop = CGRect(x: pageRect.minX * scale,
                          y: pageRect.minY * scale,
                          width: pageRect.width * scale,
                          height: pageRect.height * scale)
        guard let cropped = cgImage.cropping(to: crop) else { return nil }
        return UIImage(cgImage: cropped, scale: scale, orientation: .up)
    }

    func clearActiveLayer() {
        isApplyingDrawing = true
        canvasView.drawing = PKDrawing()
        isApplyingDrawing = false
        page.activeLayer?.drawingData = PKDrawing().dataRepresentation()
        onChange?()
    }

    func undo() { canvasView.undoManager?.undo() }
    func redo() { canvasView.undoManager?.redo() }
}

// MARK: - Bereichsauswahl

/// A transparent layer that lets someone drag a rectangle over part of the
/// page. Used by the assistant: pick a formula, ask about it.
final class RegionSelectionView: UIView {
    var onFinish: ((CGRect) -> Void)?

    private var start: CGPoint?
    private var current: CGPoint?
    private let shape = CAShapeLayer()
    private let hint = UILabel()

    override init(frame: CGRect) {
        super.init(frame: frame)
        backgroundColor = UIColor.black.withAlphaComponent(0.12)

        shape.fillColor = UIColor.tintColor.withAlphaComponent(0.12).cgColor
        shape.strokeColor = UIColor.tintColor.cgColor
        shape.lineWidth = 2
        shape.lineDashPattern = [6, 4]
        layer.addSublayer(shape)

        hint.text = "Bereich mit dem Finger oder Stift aufziehen"
        hint.textColor = .white
        hint.font = .systemFont(ofSize: 14, weight: .medium)
        hint.textAlignment = .center
        hint.backgroundColor = UIColor.black.withAlphaComponent(0.55)
        hint.layer.cornerRadius = 10
        hint.layer.masksToBounds = true
        addSubview(hint)

        let pan = UIPanGestureRecognizer(target: self, action: #selector(handlePan))
        addGestureRecognizer(pan)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) wird nicht verwendet") }

    override func layoutSubviews() {
        super.layoutSubviews()
        hint.frame = CGRect(x: (bounds.width - 340) / 2, y: 16, width: 340, height: 34)
    }

    func reset() {
        start = nil
        current = nil
        shape.path = nil
        hint.isHidden = false
    }

    private var rect: CGRect {
        guard let start, let current else { return .zero }
        return CGRect(x: min(start.x, current.x),
                      y: min(start.y, current.y),
                      width: abs(current.x - start.x),
                      height: abs(current.y - start.y))
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
            shape.path = UIBezierPath(roundedRect: rect, cornerRadius: 6).cgPath
        case .ended:
            current = point
            let chosen = rect
            shape.path = nil
            start = nil
            current = nil
            onFinish?(chosen)
        default:
            reset()
        }
    }
}
