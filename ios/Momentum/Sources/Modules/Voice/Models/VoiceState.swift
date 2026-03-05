import Foundation

enum VoiceState: Equatable {
    case idle
    case recording
    case transcribing
    case playing
    case synthesizing
    case liveListening
    case liveResponding
    case liveToolRunning
    case error(String)
}
