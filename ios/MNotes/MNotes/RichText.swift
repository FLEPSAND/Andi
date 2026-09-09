//
//  RichText.swift
//  MNotes
//
//  Typed text is stored as RTFD rather than RTF: same formatting, but it can
//  also carry images — which is what the video still frames need.
//

import UIKit

enum RichText {
    static let type = NSAttributedString.DocumentType.rtfd

    static func attributed(_ data: Data?) -> NSAttributedString? {
        guard let data, !data.isEmpty else { return nil }
        return try? NSAttributedString(data: data,
                                       options: [.documentType: type],
                                       documentAttributes: nil)
    }

    static func data(_ attributed: NSAttributedString) -> Data? {
        try? attributed.data(from: NSRange(location: 0, length: attributed.length),
                             documentAttributes: [.documentType: type])
    }

    static func body(_ text: String, size: CGFloat = 15) -> NSAttributedString {
        NSAttributedString(string: text,
                           attributes: [.font: UIFont.systemFont(ofSize: size),
                                        .foregroundColor: UIColor.black])
    }

    static func appending(_ text: String, to data: Data?) -> Data? {
        let result = NSMutableAttributedString(attributedString: attributed(data) ?? NSAttributedString())
        if result.length > 0 { result.append(NSAttributedString(string: "\n\n")) }
        result.append(body(text))
        return self.data(result)
    }

    /// Puts an image at the end of the page — a video still frame with its
    /// timestamp, or a photo from the library without a caption.
    static func appending(image: UIImage, caption: String = "", width: CGFloat, to data: Data?) -> Data? {
        let result = NSMutableAttributedString(attributedString: attributed(data) ?? NSAttributedString())
        if result.length > 0 { result.append(NSAttributedString(string: "\n")) }

        let scaled = downscaled(image)
        let attachment = NSTextAttachment()
        attachment.image = scaled
        let ratio = scaled.size.height / max(scaled.size.width, 1)
        attachment.bounds = CGRect(x: 0, y: 0, width: width, height: width * ratio)

        result.append(NSAttributedString(attachment: attachment))
        if caption.isEmpty {
            result.append(NSAttributedString(string: "\n"))
        } else {
            result.append(NSAttributedString(
                string: "\n" + caption + "\n",
                attributes: [.font: UIFont.systemFont(ofSize: 12),
                             .foregroundColor: UIColor.darkGray]
            ))
        }
        return self.data(result)
    }

    /// Ein Foto aus der Mediathek hat leicht 12 Megapixel. Ungerechnet landet
    /// das komplett im RTFD-Blob und bläht Notiz, Versionen und iCloud auf.
    /// Für eine A4-Seite reicht die lange Kante bei 1600 Punkten dicke.
    static func downscaled(_ image: UIImage, maxEdge: CGFloat = 1600) -> UIImage {
        let longest = max(image.size.width, image.size.height)
        guard longest > maxEdge, longest > 0 else { return image }
        let scale = maxEdge / longest
        let size = CGSize(width: image.size.width * scale, height: image.size.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        return UIGraphicsImageRenderer(size: size, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: size))
        }
    }
}
