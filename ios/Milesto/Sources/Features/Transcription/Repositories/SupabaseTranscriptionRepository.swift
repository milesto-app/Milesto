import Foundation

final class SupabaseTranscriptionRepository {
    static let shared = SupabaseTranscriptionRepository()

    private init() {}

    func transcribe(audioData: Data) async throws -> TranscriptionResult {
        try await BackendClient.shared.uploadAudio(
            path: "transcription",
            audioData: audioData,
            filename: "recording.wav"
        )
    }
}
