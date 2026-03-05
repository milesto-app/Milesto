import Foundation

struct TranscriptionResult: Codable {
    let text: String
    let confidence: Double
    let durationSeconds: Double
    let language: String

    enum CodingKeys: String, CodingKey {
        case text, confidence, language
        case durationSeconds = "duration_seconds"
    }
}
