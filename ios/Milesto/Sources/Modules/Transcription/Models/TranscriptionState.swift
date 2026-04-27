import Foundation

enum TranscriptionState: Equatable {
    case idle
    case recording
    case transcribing
    case error(String)
}
