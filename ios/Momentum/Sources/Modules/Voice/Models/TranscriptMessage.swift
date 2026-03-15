import Foundation

enum TranscriptRole: Sendable {
    case user
    case agent
}

struct TranscriptMessage: Identifiable, Sendable {
    let id: String
    let role: TranscriptRole
    var content: String
    let timestamp: Date
}
