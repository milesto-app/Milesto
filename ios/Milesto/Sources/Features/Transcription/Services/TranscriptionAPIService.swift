import Foundation

final class TranscriptionAPIService {
    static let shared = TranscriptionAPIService()

    private init() {}

    func transcribe(audioData: Data) async throws -> TranscriptionResult {
        try await BackendClient.shared.uploadAudio(
            path: "transcription",
            audioData: audioData,
            filename: "recording.wav"
        )
    }
}
