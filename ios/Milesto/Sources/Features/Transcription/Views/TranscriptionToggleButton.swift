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

    @Environment(\.transcriptionRepository) private var repository
    @State private var model: TranscriptionToggleViewModel?
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
        .task {
            if model == nil, let repository {
                model = TranscriptionToggleViewModel(repository: repository)
            }
        }
        .disabled(model == nil)
        .onChange(of: model?.state) { _, newState in
            guard let newState else { return }
            withAnimation(pulseAnimation(for: newState)) {
                pulseScale = newState.isRecording ? 1.12 : 1.0
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model?.state ?? .idle {
        case .idle:
            TablerIcons(.microphone, size: size.iconSize, color: iconColor)
        case .recording:
            TablerIcons(.playerStop, size: size.iconSize, color: Color("TextPrimary"))
        case .transcribing:
            AppLoader(size: size.iconSize, color: Color("TextPrimary"))
        case .error:
            TablerIcons(.alertCircle, size: size.iconSize, color: Color("TextPrimary"))
        }
    }

    private var iconColor: Color {
        (model?.state ?? .idle) == .idle ? Color("TextSecondary") : Color("TextPrimary")
    }

    private var backgroundFill: Color {
        switch model?.state ?? .idle {
        case .recording: Color("Error")
        case .error: Color("Warning")
        default: .clear
        }
    }

    private func pulseAnimation(for state: TranscriptionState) -> Animation? {
        if state.isRecording {
            return .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
        }
        return .easeOut(duration: 0.2)
    }

    private func handleTap() {
        guard let model else { return }
        switch model.state {
        case .idle:
            Haptics.rigid()
            Task { await model.startRecording() }
        case .recording:
            Haptics.heavy()
            Task {
                if let transcript = await model.stopAndTranscribe() {
                    Haptics.success()
                    transcribedText = transcript
                }
            }
        default:
            break
        }
    }
}

private extension TranscriptionState {
    var isRecording: Bool {
        if case .recording = self { return true }
        return false
    }
}
