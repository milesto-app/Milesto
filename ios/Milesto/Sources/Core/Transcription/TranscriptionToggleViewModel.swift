import Foundation

@MainActor
@Observable
final class TranscriptionToggleViewModel {
    @ObservationIgnored private let repository: any TranscriptionRepository

    private(set) var state: TranscriptionState = .idle

    init(repository: any TranscriptionRepository) {
        self.repository = repository
    }

    func startRecording() async {
        let granted = await repository.requestPermission()
        guard granted else {
            await showError()
            return
        }
        do {
            try repository.startRecording()
            state = .recording
        } catch {
            await showError()
        }
    }

    func stopAndTranscribe() async -> String? {
        state = .transcribing
        do {
            let transcript = try await repository.stopAndTranscribe()
            state = .idle
            return transcript
        } catch {
            await showError()
            return nil
        }
    }

    private func showError() async {
        state = .error("")
        try? await Task.sleep(for: .seconds(2))
        if case .error = state {
            state = .idle
        }
    }
}
