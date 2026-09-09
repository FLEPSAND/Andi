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

    /// Puts a still frame with its timestamp at the end of the page.
    static func appending(image: UIImage, caption: String, width: CGFloat, to data: Data?) -> Data? {
        let result = NSMutableAttributedString(attributedString: attributed(data) ?? NSAttributedString())
        if result.length > 0 { result.append(NSAttributedString(string: "\n")) }

        let attachment = NSTextAttachment()
        attachment.image = image
        let ratio = image.size.height / max(image.size.width, 1)
        attachment.bounds = CGRect(x: 0, y: 0, width: width, height: width * ratio)

        result.append(NSAttributedString(attachment: attachment))
        result.append(NSAttributedString(
            string: "\n" + caption + "\n",
            attributes: [.font: UIFont.systemFont(ofSize: 12),
                         .foregroundColor: UIColor.darkGray]
        ))
        return self.data(result)
    }
}
