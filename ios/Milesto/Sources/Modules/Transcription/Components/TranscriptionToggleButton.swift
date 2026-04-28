import SwiftUI

struct TranscriptionToggleButton: View {
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
    var size: Size = .regular

    @State private var state: TranscriptionState = .idle
    @State private var recorder = AudioRecorderService()
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
            .padding(6)
            .contentShape(Circle())
        }
        .buttonStyle(.plain)
        .padding(-6)
        .offset(x: -1)
        .onChange(of: state) { _, newState in
            withAnimation(pulseAnimation(for: newState)) {
                pulseScale = newState.isRecording ? 1.12 : 1.0
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch state {
        case .idle:
            TablerIcons(.microphone, size: size.iconSize, color: iconColor)
        case .recording:
            TablerIcons(.playerStop, size: size.iconSize, color: Color("TextOnBrand"))
        case .transcribing:
            ProgressView()
                .tint(Color("TextOnBrand"))
        case .error:
            TablerIcons(.alertCircle, size: size.iconSize, color: Color("TextOnBrand"))
        }
    }

    private var iconColor: Color {
        state == .idle ? Color("TextSecondary") : Color("TextOnBrand")
    }

    private var backgroundFill: Color {
        switch state {
        case .recording:
            return Color("Error")
        case .error:
            return Color("Warning")
        default:
            return .clear
        }
    }

    private func pulseAnimation(for state: TranscriptionState) -> Animation? {
        if state.isRecording {
            return .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
        }
        return .easeOut(duration: 0.2)
    }

    private func handleTap() {
        switch state {
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
                withAnimation(.spring(duration: 0.35, bounce: 0.3)) {
                    state = .recording
                }
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
        state = .transcribing
        Task {
            do {
                let result = try await TranscriptionAPIService.shared.transcribe(audioData: audioData)
                transcribedText = result.text
                state = .idle
            } catch {
                showError()
            }
        }
    }

    private func showError() {
        state = .error("")
        Task {
            try? await Task.sleep(for: .seconds(2))
            state = .idle
        }
    }
}

private extension TranscriptionState {
    var isRecording: Bool {
        if case .recording = self { return true }
        return false
    }
}
