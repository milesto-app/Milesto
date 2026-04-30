import Foundation

@MainActor
protocol TranscriptionRepository: AnyObject {
    func requestPermission() async -> Bool
    func startRecording() throws
    func stopAndTranscribe() async throws -> String
}
