import Foundation

final class VoiceAPIService {
    static let shared = VoiceAPIService()

    private init() {}

    func transcribe(audioData: Data) async throws -> TranscriptionResult {
        try await BackendClient.shared.uploadAudio(
            path: "voice/transcribe",
            audioData: audioData,
            filename: "recording.wav"
        )
    }

    func synthesize(text: String, coachId: Int) async throws -> Data {
        try await BackendClient.shared.requestAudioData(
            path: "voice/synthesize",
            body: SynthesizeRequest(text: text, coachId: coachId)
        )
    }
}

private struct SynthesizeRequest: Encodable {
    let text: String
    let coachId: Int

    enum CodingKeys: String, CodingKey {
        case text
        case coachId = "coach_id"
    }
}
