import SwiftUI

struct VoiceToggleButton: View {
    enum Size {
        case regular, compact

        var circleSize: CGFloat {
            switch self {
            case .regular: 48
            case .compact: 32
            }
        }

        var iconSize: CGFloat {
            switch self {
            case .regular: 22
            case .compact: 18
            }
        }
    }

    @Binding var transcribedText: String
    let coachId: Int?
    var size: Size = .regular

    @State private var voiceState: VoiceState = .idle
    @State private var recorder = AudioRecorderService()
    @State private var player = AudioPlayerService()
    @State private var pulseScale: CGFloat = 1.0

    var body: some View {
        Button(action: handleTap) {
            ZStack {
                Circle()
                    .fill(backgroundFill)
                    .frame(width: size.circleSize, height: size.circleSize)
                    .scaleEffect(pulseScale)

                content
            }
        }
        .buttonStyle(.plain)
        .onChange(of: voiceState) { _, newState in
            withAnimation(pulseAnimation(for: newState)) {
                pulseScale = newState.isRecording ? 1.12 : 1.0
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch voiceState {
        case .idle:
            TablerIcons(.microphone, size: size.iconSize, color: iconColor)
        case .recording:
            TablerIcons(.playerStop, size: size.iconSize, color: Colors.textOnAccent)
        case .transcribing:
            ProgressView()
                .tint(Colors.textOnAccent)
        case .error:
            TablerIcons(.alertCircle, size: size.iconSize, color: Colors.textOnAccent)
        default:
            TablerIcons(.microphone, size: size.iconSize, color: iconColor)
        }
    }

    private var iconColor: Color {
        voiceState == .idle ? Colors.textSecondary : Colors.textOnAccent
    }

    private var backgroundFill: Color {
        switch voiceState {
        case .recording:
            return Colors.error
        case .error:
            return Colors.warning
        default:
            return .clear
        }
    }

    private func pulseAnimation(for state: VoiceState) -> Animation? {
        if state.isRecording {
            return .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
        }
        return .easeOut(duration: 0.2)
    }

    private func handleTap() {
        switch voiceState {
        case .idle:
            startRecording()
        case .recording:
            stopAndTranscribe()
        default:
            break
        }
    }

    private func startRecording() {
        Task {
            let granted = await recorder.requestPermission()
            guard granted else {
                showError()
                return
            }
            do {
                try recorder.startRecording()
                voiceState = .recording
            } catch {
                showError()
            }
        }
    }

    private func stopAndTranscribe() {
        guard let audioData = recorder.stopRecording() else {
            showError()
            return
        }
        voiceState = .transcribing
        Task {
            do {
                let result = try await VoiceAPIService.shared.transcribe(audioData: audioData)
                transcribedText = result.text
                voiceState = .idle
            } catch {
                showError()
            }
        }
    }

    private func showError() {
        voiceState = .error("")
        Task {
            try? await Task.sleep(for: .seconds(2))
            voiceState = .idle
        }
    }
}

private extension VoiceState {
    var isRecording: Bool {
        if case .recording = self { return true }
        return false
    }
}
