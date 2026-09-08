//
//  AudioService.swift
//  Andi Notes
//
//  Recording and live transcription.
//
//  Both run on the device: AVAudioEngine writes the file, SFSpeechRecognizer
//  transcribes with `requiresOnDeviceRecognition` where the language pack is
//  installed. If it is not, iOS falls back to Apple's servers — the settings
//  screen says so, and the switch below can forbid it.
//

import Foundation
import AVFoundation
import Speech
import Observation

@Observable
@MainActor
final class AudioService {
    enum State: Equatable {
        case idle
        case recording
        case denied(String)
    }

    private(set) var state: State = .idle
    private(set) var elapsed: TimeInterval = 0
    private(set) var level: Double = 0
    private(set) var transcript = ""
    private(set) var partial = ""
    var localeIdentifier = "de-DE"
    var transcribeLive = true

    private let engine = AVAudioEngine()
    private var file: AVAudioFile?
    private var fileName = ""
    private var startDate = Date()
    private var timer: Timer?

    private var recognizer: SFSpeechRecognizer?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?

    /// Nothing is touched here that needs the main actor, so the view can
    /// create the service in a `@State` initialiser.
    nonisolated init() {}

    var isRecording: Bool { state == .recording }

    var transcriptionAvailable: Bool {
        SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))?.isAvailable ?? false
    }

    // MARK: Start und Stopp

    func start() async {
        guard state != .recording else { return }
        transcript = ""
        partial = ""

        guard await requestMicrophone() else {
            state = .denied("Ohne Mikrofonzugriff kann nicht aufgenommen werden.")
            return
        }
        if transcribeLive {
            let granted = await requestSpeech()
            if !granted { transcribeLive = false }
        }

        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
            try session.setActive(true, options: .notifyOthersOnDeactivation)

            let input = engine.inputNode
            let format = input.outputFormat(forBus: 0)

            fileName = "\(UUID().uuidString).caf"
            file = try AVAudioFile(forWriting: AudioStorage.directory.appendingPathComponent(fileName),
                                   settings: format.settings)

            if transcribeLive { startRecognition(format: format) }

            // The tap runs on an audio thread: hand it plain references
            // instead of reaching back into main-actor state.
            let audioFile = file
            let recognitionRequest = request
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 2048, format: format) { [weak self] buffer, _ in
                try? audioFile?.write(from: buffer)
                recognitionRequest?.append(buffer)
                let peak = AudioService.peak(of: buffer)
                Task { @MainActor [weak self] in self?.level = peak }
            }

            engine.prepare()
            try engine.start()

            startDate = .now
            elapsed = 0
            state = .recording
            timer = Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { [weak self] _ in
                Task { @MainActor in
                    guard let self, self.state == .recording else { return }
                    self.elapsed = Date.now.timeIntervalSince(self.startDate)
                }
            }
        } catch {
            state = .denied("Aufnahme nicht möglich: \(error.localizedDescription)")
            cleanUp()
        }
    }

    /// Stops and returns what was recorded, ready to be attached to a note.
    func stop() -> (fileName: String, duration: TimeInterval, transcript: String)? {
        guard state == .recording else { return nil }
        let duration = elapsed
        let name = fileName
        let text = (transcript + " " + partial).trimmingCharacters(in: .whitespaces)

        cleanUp()
        state = .idle
        level = 0
        return name.isEmpty ? nil : (name, duration, text)
    }

    private func cleanUp() {
        timer?.invalidate()
        timer = nil
        engine.inputNode.removeTap(onBus: 0)
        if engine.isRunning { engine.stop() }
        file = nil
        request?.endAudio()
        request = nil
        task?.cancel()
        task = nil
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }

    // MARK: Spracherkennung

    private func startRecognition(format: AVAudioFormat) {
        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: localeIdentifier))
        guard let recognizer, recognizer.isAvailable else { return }
        self.recognizer = recognizer

        let request = SFSpeechAudioBufferRecognitionRequest()
        request.shouldReportPartialResults = true
        if recognizer.supportsOnDeviceRecognition, AppSettings.shared.onDeviceSpeechOnly {
            request.requiresOnDeviceRecognition = true
        }
        self.request = request

        task = recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }
            Task { @MainActor in
                if let result {
                    let text = result.bestTranscription.formattedString
                    if result.isFinal {
                        self.transcript = (self.transcript + " " + text).trimmingCharacters(in: .whitespaces)
                        self.partial = ""
                    } else {
                        self.partial = text
                    }
                }
                if error != nil, self.state == .recording {
                    // A recogniser can time out on long recordings; the audio
                    // keeps going, only the live text stops.
                    self.transcript = (self.transcript + " " + self.partial).trimmingCharacters(in: .whitespaces)
                    self.partial = ""
                    self.task = nil
                    self.request = nil
                }
            }
        }
        _ = format
    }

    // MARK: Rechte

    private func requestMicrophone() async -> Bool {
        await withCheckedContinuation { continuation in
            if #available(iOS 17.0, *) {
                AVAudioApplication.requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            } else {
                AVAudioSession.sharedInstance().requestRecordPermission { granted in
                    continuation.resume(returning: granted)
                }
            }
        }
    }

    private func requestSpeech() async -> Bool {
        await withCheckedContinuation { continuation in
            SFSpeechRecognizer.requestAuthorization { status in
                continuation.resume(returning: status == .authorized)
            }
        }
    }

    // MARK: Pegel

    nonisolated private static func peak(of buffer: AVAudioPCMBuffer) -> Double {
        guard let channel = buffer.floatChannelData?[0] else { return 0 }
        let count = Int(buffer.frameLength)
        guard count > 0 else { return 0 }
        var sum: Float = 0
        for index in 0..<count {
            sum += channel[index] * channel[index]
        }
        let rms = (sum / Float(count)).squareRoot()
        return Double(min(1, rms * 12))
    }
}

// MARK: - Wiedergabe

@Observable
@MainActor
final class AudioPlayer {
    private var player: AVAudioPlayer?
    private(set) var playingFile: String?

    nonisolated init() {}

    func toggle(_ recording: Recording) {
        if playingFile == recording.fileName {
            stop()
            return
        }
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
            player = try AVAudioPlayer(contentsOf: recording.fileURL)
            player?.play()
            playingFile = recording.fileName
        } catch {
            playingFile = nil
        }
    }

    func stop() {
        player?.stop()
        player = nil
        playingFile = nil
    }
}

func formatDuration(_ seconds: TimeInterval) -> String {
    let total = Int(max(0, seconds))
    return String(format: "%d:%02d", total / 60, total % 60)
}
