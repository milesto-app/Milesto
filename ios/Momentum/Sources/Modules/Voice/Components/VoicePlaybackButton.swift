import SwiftUI

struct VoicePlaybackButton: View {
    let text: String
    let coachId: Int

    @State private var isLoading = false
    @State private var showError = false
    @State private var player = AudioPlayerService()

    var body: some View {
        Button(action: handleTap) {
            Group {
                if isLoading {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Color("TintPrimary"))
                } else if player.isPlaying {
                    TablerIcons(.playerStop, size: 18, color: Color("TintPrimary"))
                } else {
                    TablerIcons(.volume, size: 18, color: Color("TintPrimary"))
                }
            }
            .frame(width: 32, height: 32)
        }
        .buttonStyle(.plain)
        .disabled(isLoading)
        .alert(
            String(localized: "voice.error.playbackFailed", table: "Voice"),
            isPresented: $showError
        ) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        }
    }

    private func handleTap() {
        if player.isPlaying {
            player.stop()
            return
        }
        isLoading = true
        Task {
            do {
                let audioData = try await VoiceAPIService.shared.synthesize(text: text, coachId: coachId)
                try player.play(data: audioData)
            } catch {
                player.stop()
                showError = true
            }
            isLoading = false
        }
    }
}
