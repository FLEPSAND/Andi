//
//  ThumbnailCache.swift
//  MNotes
//
//  In-memory cache for library thumbnails. Keys include the note's identity
//  and `updatedAt`, so an edited note gets a fresh image and the old one is
//  dropped from the cache automatically.
//

import Foundation
import UIKit

final class ThumbnailCache {
    static let shared = ThumbnailCache()

    private let cache = NSCache<NSString, UIImage>()

    private init() {
        cache.countLimit = 120
    }

    func image(for key: String) -> UIImage? {
        cache.object(forKey: key as NSString)
    }

    func set(_ image: UIImage, for key: String) {
        cache.setObject(image, forKey: key as NSString)
    }
}
