import Foundation

enum VoiceState: Equatable {
    case idle
    case recording
    case transcribing
    case playing
    case synthesizing
    case error(String)
}
