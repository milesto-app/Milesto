import Foundation

@MainActor
final class SupabaseTranscriptionRepository: TranscriptionRepository {
    private let recorder: AudioRecorderRepository

    init(recorder: AudioRecorderRepository = AudioRecorderRepository()) {
        self.recorder = recorder
    }

    func requestPermission() async -> Bool {
        await recorder.requestPermission()
    }

    func startRecording() throws {
        try recorder.startRecording()
    }

    func stopAndTranscribe() async throws -> String {
        guard let audioData = recorder.stopRecording() else {
            throw TranscriptionError.noAudioData
        }
        let result: TranscriptionResult = try await BackendClient.shared.uploadAudio(
            path: "transcription",
            audioData: audioData,
            filename: "recording.wav"
        )
        return result.text
    }
}

enum TranscriptionError: LocalizedError {
    case noAudioData

    var errorDescription: String? {
        switch self {
        case .noAudioData:
            "Recording produced no audio data."
        }
    }
}
