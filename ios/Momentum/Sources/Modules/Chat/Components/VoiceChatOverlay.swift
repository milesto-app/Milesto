import ElevenLabs
import SwiftUI

struct VoiceChatOverlay: View {
    let goalId: String
    @Binding var conversationId: String?
    let coachName: String
    let coachIcon: TablerIconOutline
    var onClose: () -> Void

    @State private var conversationService = ElevenLabsConversationService()
    @State private var isMuted = false
    @State private var sessionTimeRemaining: TimeInterval = 840
    @State private var isConnecting = true
    @State private var errorMessage: String?
    @State private var voiceState: VoiceState = .idle
    @State private var pulseScale: CGFloat = 1.0
    @State private var timer: Timer?

    private var isSessionExpiring: Bool {
        sessionTimeRemaining <= 60 && sessionTimeRemaining > 0
    }

    private var timerText: String {
        let minutes = Int(sessionTimeRemaining) / 60
        let seconds = Int(sessionTimeRemaining) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    var body: some View {
        ZStack {
            Color("TextPrimary").opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                    .padding(.top, 32)

                Spacer()

                centerContent

                Spacer()

                bottomControls
                    .padding(.bottom, 40)
            }
            .padding(.horizontal, 24)
        }
        .ignoresSafeArea()
        .task { await startSession() }
        .onDisappear { cleanup() }
        .onChange(of: conversationService.agentState) { _, newState in
            switch newState {
            case .speaking:
                voiceState = .liveResponding
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                    pulseScale = 1.15
                }
            case .listening:
                voiceState = .liveListening
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    pulseScale = 1.08
                }
            case .thinking:
                voiceState = .liveToolRunning
                withAnimation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
                    pulseScale = 1.05
                }
            }
        }
        .onChange(of: conversationService.isSessionActive) { _, isActive in
            if !isActive && !isConnecting {
                voiceState = .idle
                errorMessage = String(localized: "chat.voice.sessionExpired", table: "Chat")
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in
            cleanup()
            onClose()
        }
    }

    private var topBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    TablerIcons(coachIcon, size: 20, color: Color("TintPrimary"))
                    AppText(verbatim: coachName, style: .headline)
                        .color(Color("TextOnAccent"))
                }

                if isConnecting {
                    AppText("chat.voice.connecting", table: "Chat", style: .caption)
                        .color(Color("TextOnAccent").opacity(0.6))
                } else {
                    AppText(verbatim: timerText, style: .caption)
                        .color(isSessionExpiring ? Color("AccentAmber") : Color("TextOnAccent").opacity(0.6))
                }
            }

            Spacer()

            Button(action: dismissOverlay) {
                TablerIcons(.x, size: 24, color: Color("TextOnAccent"))
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
        }
    }

    private var centerContent: some View {
        VStack(spacing: 24) {
            ZStack {
                Circle()
                    .fill(Color("TintPrimary").opacity(0.15))
                    .frame(width: 180, height: 180)
                    .scaleEffect(pulseScale)

                Circle()
                    .fill(Color("TintPrimary").opacity(0.25))
                    .frame(width: 120, height: 120)
                    .scaleEffect(pulseScale * 0.95)

                Circle()
                    .fill(Color("TintPrimary").opacity(0.5))
                    .frame(width: 80, height: 80)

                TablerIcons(coachIcon, size: 36, color: Color("TextOnAccent"))
            }

            if let errorMessage {
                AppText(verbatim: errorMessage, style: .subheadline)
                    .color(Color("StatusError"))
                    .multilineTextAlignment(.center)
            } else if isConnecting {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(Color("TextOnAccent"))
                    AppText("chat.voice.connecting", table: "Chat", style: .subheadline)
                        .color(Color("TextOnAccent").opacity(0.8))
                }
            } else if isSessionExpiring {
                AppText("chat.voice.sessionExpiring", table: "Chat", style: .subheadline)
                    .color(Color("AccentAmber"))
            } else {
                stateLabel
            }
        }
    }

    @ViewBuilder
    private var stateLabel: some View {
        switch voiceState {
        case .liveListening:
            AppText("chat.voice.listening", table: "Chat", style: .subheadline)
                .color(Color("TextOnAccent").opacity(0.8))
        case .liveResponding:
            AppText("chat.voice.speaking", table: "Chat", style: .subheadline)
                .color(Color("TextOnAccent").opacity(0.8))
        default:
            AppText("chat.voice.listening", table: "Chat", style: .subheadline)
                .color(Color("TextOnAccent").opacity(0.8))
        }
    }

    private var bottomControls: some View {
        HStack(spacing: 40) {
            Button(action: toggleMute) {
                VStack(spacing: 8) {
                    TablerIcons(
                        isMuted ? .microphoneOff : .microphone,
                        size: 24,
                        color: Color("TextOnAccent")
                    )
                    .frame(width: 56, height: 56)
                    .background(
                        Circle()
                            .fill(isMuted ? Color("StatusError").opacity(0.8) : Color("TextOnAccent").opacity(0.15))
                    )

                    AppText(
                        isMuted ? "chat.voice.unmute" : "chat.voice.mute",
                        table: "Chat",
                        style: .caption
                    )
                    .color(Color("TextOnAccent").opacity(0.7))
                }
            }
            .disabled(isConnecting)

            Button(action: dismissOverlay) {
                VStack(spacing: 8) {
                    TablerIcons(.phoneOff, size: 24, color: Color("TextOnAccent"))
                        .frame(width: 56, height: 56)
                        .background(
                            Circle()
                                .fill(Color("StatusError"))
                        )

                    AppText("chat.voice.close", table: "Chat", style: .caption)
                        .color(Color("TextOnAccent").opacity(0.7))
                }
            }
        }
    }

    private func startSession() async {
        do {
            try await conversationService.connect(goalId: goalId, conversationId: conversationId)
            conversationId = conversationService.conversationId
            isConnecting = false
            voiceState = .liveListening

            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                pulseScale = 1.08
            }

            startTimer()
        } catch {
            errorMessage = String(localized: "chat.voice.error", table: "Chat")
            isConnecting = false
        }
    }

    private func toggleMute() {
        isMuted.toggle()
        conversationService.setMuted(isMuted)
    }

    private func dismissOverlay() {
        cleanup()
        onClose()
    }

    private func cleanup() {
        timer?.invalidate()
        timer = nil
        conversationService.disconnect()
        conversationId = conversationService.conversationId
    }

    private func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in
                if sessionTimeRemaining > 0 {
                    sessionTimeRemaining -= 1
                }
            }
        }
    }
}
