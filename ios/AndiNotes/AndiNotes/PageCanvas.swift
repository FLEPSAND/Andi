//
//  PageCanvas.swift
//  Andi Notes
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
    /// Called after the pen leaves the page, so the caller can save.
    var onChange: () -> Void
    /// Handed a controller reference so the editor can trigger exports.
    var onController: ((PageCanvasController) -> Void)?

    func makeUIViewController(context: Context) -> PageCanvasController {
        let controller = PageCanvasController()
        controller.page = page
        controller.tools = tools
        controller.pdfImage = pdfImage
        controller.onChange = onChange
        onController?(controller)
        return controller
    }

    func updateUIViewController(_ controller: PageCanvasController, context: Context) {
        controller.page = page
        controller.tools = tools
        controller.pdfImage = pdfImage
        controller.onChange = onChange
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

        apply()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        canvasView.frame = view.bounds
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

        let scale = min(UIScreen.main.scale, 2)
        let layers = page.orderedLayers
        let activeIndex = min(max(page.activeLayerIndex, 0), max(layers.count - 1, 0))

        let format = UIGraphicsImageRendererFormat.default()
        format.scale = scale
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
                    .image(from: CGRect(origin: .zero, size: size), scale: scale)
                    .draw(in: CGRect(origin: .zero, size: size))
            }
        }

        let above = layers.enumerated().filter { $0.offset > activeIndex && $0.element.isVisible }
        overlayView.image = above.isEmpty ? nil : renderer.image { _ in
            for (_, layer) in above {
                drawing(of: layer)
                    .image(from: CGRect(origin: .zero, size: size), scale: scale)
                    .draw(in: CGRect(origin: .zero, size: size))
            }
        }
    }

    private func drawText(in size: CGSize) {
        guard let data = page.textRTF, !data.isEmpty,
              let attributed = try? NSAttributedString(
                data: data,
                options: [.documentType: NSAttributedString.DocumentType.rtf],
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
            options: [.documentType: NSAttributedString.DocumentType.rtf],
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
        page.textRTF = try? attributed.data(
            from: NSRange(location: 0, length: attributed.length),
            documentAttributes: [.documentType: NSAttributedString.DocumentType.rtf]
        )
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
