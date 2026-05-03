import SwiftUI

private struct TranscriptionRepositoryKey: EnvironmentKey {
    static let defaultValue: (any TranscriptionRepository)? = nil
}

extension EnvironmentValues {
    var transcriptionRepository: (any TranscriptionRepository)? {
        get { self[TranscriptionRepositoryKey.self] }
        set { self[TranscriptionRepositoryKey.self] = newValue }
    }
}
