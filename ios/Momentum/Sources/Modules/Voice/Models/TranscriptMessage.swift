import Foundation

enum TranscriptRole {
    case user
    case agent
}

struct TranscriptMessage: Identifiable {
    let id: String
    let role: TranscriptRole
    var content: String
    let timestamp: Date
}
