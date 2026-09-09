//
//  VideoPane.swift
//  MNotes
//
//  Watch and write at the same time: the video sits beside the page, and a
//  still frame with its timestamp goes straight into the note.
//
//  Bild-in-Bild hält das Video über der App, wenn man den Bereich zuklappt.
//  Streaming-Portale lassen sich nicht einbetten — dafür gibt es die
//  Bild-in-Bild-Funktion des jeweiligen Players.
//

import SwiftUI
import AVKit
import AVFoundation
import UniformTypeIdentifiers

@Observable
@MainActor
final class VideoModel {
    let player = AVPlayer()
    private(set) var hasSource = false
    private(set) var title = ""
    var message: String?

    nonisolated init() {}

    func load(url: URL, title: String) {
        let item = AVPlayerItem(url: url)
        player.replaceCurrentItem(with: item)
        hasSource = true
        self.title = title
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
        try? AVAudioSession.sharedInstance().setActive(true)
        player.play()
    }

    func load(remote text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard let url = URL(string: trimmed), url.scheme?.hasPrefix("http") == true else {
            message = "Das ist keine gültige Adresse."
            return
        }
        if trimmed.contains("youtu") || trimmed.contains("vimeo") {
            message = "Streaming-Portale lassen sich nicht einbetten. Nimm dort die Bild-in-Bild-Funktion des Players und schreibe hier weiter."
            return
        }
        load(url: url, title: url.lastPathComponent)
    }

    var currentTime: CMTime { player.currentTime() }

    var timeStamp: String {
        let seconds = Int(CMTimeGetSeconds(player.currentTime()).rounded())
        guard seconds >= 0 else { return "0:00" }
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let rest = seconds % 60
        return hours > 0
            ? String(format: "%d:%02d:%02d", hours, minutes, rest)
            : String(format: "%d:%02d", minutes, rest)
    }

    /// The frame showing right now, for dropping into the note.
    func snapshot() async -> (image: UIImage, time: String)? {
        guard let asset = (player.currentItem?.asset) else {
            message = "Erst ein Video laden."
            return nil
        }
        let stamp = timeStamp
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.requestedTimeToleranceBefore = .zero
        generator.requestedTimeToleranceAfter = .zero
        let time = player.currentTime()
        do {
            let cgImage = try await generator.image(at: time).image
            return (UIImage(cgImage: cgImage), stamp)
        } catch {
            message = "Von diesem Video lässt sich kein Standbild nehmen."
            return nil
        }
    }

    func skip(_ seconds: Double) {
        let target = CMTimeAdd(player.currentTime(), CMTime(seconds: seconds, preferredTimescale: 600))
        player.seek(to: target, toleranceBefore: .zero, toleranceAfter: .zero)
    }
}

// MARK: - Ansicht

struct VideoPane: View {
    @Bindable var model: VideoModel
    let onSnapshot: (UIImage, String) -> Void
    let onClose: () -> Void

    @State private var showImporter = false
    @State private var urlText = ""

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text(model.hasSource ? model.title : "Video")
                    .font(.subheadline.weight(.semibold))
                    .lineLimit(1)
                Spacer()
                Button {
                    onClose()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }
            .padding(10)

            if model.hasSource {
                PlayerLayerView(player: model.player)
                    .aspectRatio(16.0 / 9.0, contentMode: .fit)
                    .background(Color.black)
            } else {
                VStack(spacing: 10) {
                    Image(systemName: "play.rectangle")
                        .font(.system(size: 34))
                        .foregroundStyle(.secondary)
                    Text("Videodatei öffnen oder eine direkte Adresse einfügen. Portale wie YouTube lassen sich nicht einbetten.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                }
                .frame(maxWidth: .infinity)
                .padding(20)
            }

            if model.hasSource {
                HStack(spacing: 14) {
                    Button { model.skip(-10) } label: { Image(systemName: "gobackward.10") }
                    Button { model.player.rate == 0 ? model.player.play() : model.player.pause() } label: {
                        Image(systemName: "playpause.fill")
                    }
                    Button { model.skip(10) } label: { Image(systemName: "goforward.10") }
                    Spacer()
                    Button {
                        Task {
                            if let shot = await model.snapshot() {
                                onSnapshot(shot.image, shot.time)
                            }
                        }
                    } label: {
                        Label("Standbild", systemImage: "camera")
                            .font(.callout)
                    }
                    .buttonStyle(.borderedProminent)
                }
                .padding(10)
            }

            HStack(spacing: 6) {
                Button("Datei…") { showImporter = true }
                    .buttonStyle(.bordered)
                TextField("https://…/video.mp4", text: $urlText)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onSubmit { model.load(remote: urlText) }
                Button("Laden") { model.load(remote: urlText) }
                    .buttonStyle(.bordered)
            }
            .padding(10)

            if let message = model.message {
                Text(message)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.bottom, 10)
            }

            Spacer(minLength: 0)
        }
        .background(.regularMaterial)
        .fileImporter(isPresented: $showImporter,
                      allowedContentTypes: [.movie, .video, .mpeg4Movie, .quickTimeMovie]) { result in
            guard case .success(let url) = result else { return }
            // The picked file lives outside the sandbox; copy it in so the
            // player keeps working after the security scope ends.
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }
            let target = URL.temporaryDirectory.appendingPathComponent(url.lastPathComponent)
            try? FileManager.default.removeItem(at: target)
            do {
                try FileManager.default.copyItem(at: url, to: target)
                model.load(url: target, title: url.lastPathComponent)
            } catch {
                model.message = "Die Datei ließ sich nicht öffnen."
            }
        }
    }
}

/// AVPlayerLayer rather than SwiftUI's VideoPlayer, because Picture in
/// Picture needs a layer to attach to.
struct PlayerLayerView: UIViewRepresentable {
    let player: AVPlayer

    func makeUIView(context: Context) -> PlayerHostView {
        let view = PlayerHostView()
        view.playerLayer.player = player
        view.playerLayer.videoGravity = .resizeAspect
        view.setUpPictureInPicture()
        return view
    }

    func updateUIView(_ view: PlayerHostView, context: Context) {
        if view.playerLayer.player !== player {
            view.playerLayer.player = player
        }
    }
}

final class PlayerHostView: UIView {
    override static var layerClass: AnyClass { AVPlayerLayer.self }

    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
    private var pipController: AVPictureInPictureController?

    func setUpPictureInPicture() {
        guard AVPictureInPictureController.isPictureInPictureSupported() else { return }
        pipController = AVPictureInPictureController(playerLayer: playerLayer)
        pipController?.canStartPictureInPictureAutomaticallyFromInline = true
    }

    func togglePictureInPicture() {
        guard let pipController else { return }
        pipController.isPictureInPictureActive
            ? pipController.stopPictureInPicture()
            : pipController.startPictureInPicture()
    }
}
