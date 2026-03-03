import SwiftUI

struct VoiceChatOverlay: View {
    let goalId: String
    @Binding var conversationId: String?
    let coachName: String
    let coachIcon: TablerIconOutline
    var onClose: () -> Void

    @State private var voiceChatService = VoiceChatService()
    @State private var audioStream = AudioStreamService()
    @State private var pcmPlayer = PCMAudioPlayerService()
    @State private var isMuted = false
    @State private var activeToolName: String?
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
            AnimatedBackground()
                .overlay(Color.black.opacity(0.3))

            VStack(spacing: 0) {
                topBar
                    .padding(.top, AppTheme.Spacing.xl)

                Spacer()

                centerContent

                Spacer()

                if let toolName = activeToolName {
                    ToolStatusIndicator(toolName: toolName)
                        .padding(.bottom, AppTheme.Spacing.md)
                }

                bottomControls
                    .padding(.bottom, AppTheme.Spacing.xxl)
            }
            .padding(.horizontal, AppTheme.Spacing.lg)
        }
        .ignoresSafeArea()
        .task { await startSession() }
        .onDisappear { cleanup() }
    }

    private var topBar: some View {
        HStack {
            VStack(alignment: .leading, spacing: AppTheme.Spacing.xxs) {
                HStack(spacing: AppTheme.Spacing.xs) {
                    TablerIcon(coachIcon, size: 20, color: AppTheme.Colors.accent)
                    AppText(verbatim: coachName, style: .headline)
                        .color(.white)
                }

                if isConnecting {
                    AppText("chat.voice.connecting", table: "Chat", style: .caption)
                        .color(.white.opacity(0.6))
                } else {
                    AppText(verbatim: timerText, style: .caption)
                        .color(isSessionExpiring ? AppTheme.Colors.warning : .white.opacity(0.6))
                }
            }

            Spacer()

            Button(action: dismissOverlay) {
                TablerIcon(.x, size: 24, color: .white)
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
        }
    }

    @ViewBuilder
    private var centerContent: some View {
        VStack(spacing: AppTheme.Spacing.lg) {
            ZStack {
                Circle()
                    .fill(AppTheme.Colors.accent.opacity(0.15))
                    .frame(width: 180, height: 180)
                    .scaleEffect(pulseScale)

                Circle()
                    .fill(AppTheme.Colors.accent.opacity(0.25))
                    .frame(width: 120, height: 120)
                    .scaleEffect(pulseScale * 0.95)

                Circle()
                    .fill(AppTheme.Colors.accent.opacity(0.5))
                    .frame(width: 80, height: 80)

                TablerIcon(coachIcon, size: 36, color: .white)
            }

            if let errorMessage {
                AppText(verbatim: errorMessage, style: .subheadline)
                    .color(AppTheme.Colors.error)
                    .multilineTextAlignment(.center)
            } else if isConnecting {
                HStack(spacing: AppTheme.Spacing.xs) {
                    ProgressView()
                        .tint(.white)
                    AppText("chat.voice.connecting", table: "Chat", style: .subheadline)
                        .color(.white.opacity(0.8))
                }
            } else if isSessionExpiring {
                AppText("chat.voice.sessionExpiring", table: "Chat", style: .subheadline)
                    .color(AppTheme.Colors.warning)
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
                .color(.white.opacity(0.8))
        case .liveResponding:
            AppText("chat.voice.speaking", table: "Chat", style: .subheadline)
                .color(.white.opacity(0.8))
        case .liveToolRunning:
            AppText("chat.voice.speaking", table: "Chat", style: .subheadline)
                .color(.white.opacity(0.8))
        default:
            AppText("chat.voice.listening", table: "Chat", style: .subheadline)
                .color(.white.opacity(0.8))
        }
    }

    private var bottomControls: some View {
        HStack(spacing: AppTheme.Spacing.xxl) {
            Button(action: toggleMute) {
                VStack(spacing: AppTheme.Spacing.xs) {
                    TablerIcon(
                        isMuted ? .microphoneOff : .microphone,
                        size: 24,
                        color: .white
                    )
                    .frame(width: 56, height: 56)
                    .background(
                        Circle()
                            .fill(isMuted ? AppTheme.Colors.error.opacity(0.8) : .white.opacity(0.15))
                    )

                    AppText(
                        isMuted ? "chat.voice.unmute" : "chat.voice.mute",
                        table: "Chat",
                        style: .caption
                    )
                    .color(.white.opacity(0.7))
                }
            }
            .disabled(isConnecting)

            Button(action: dismissOverlay) {
                VStack(spacing: AppTheme.Spacing.xs) {
                    TablerIcon(.phoneOff, size: 24, color: .white)
                        .frame(width: 56, height: 56)
                        .background(
                            Circle()
                                .fill(AppTheme.Colors.error)
                        )

                    AppText("chat.voice.close", table: "Chat", style: .caption)
                        .color(.white.opacity(0.7))
                }
            }
        }
    }

    private func startSession() async {
        let granted = await audioStream.requestPermission()
        guard granted else {
            errorMessage = String(localized: "chat.voice.error", table: "Chat")
            isConnecting = false
            return
        }

        voiceChatService.onAudioReceived = { (data: Data) in
            pcmPlayer.enqueueChunk(data: data)
            voiceState = .liveResponding
            withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                pulseScale = 1.15
            }
        }

        voiceChatService.onToolStart = { (toolName: String) in
            activeToolName = toolName
            voiceState = .liveToolRunning
        }

        voiceChatService.onToolEnd = { (_: String) in
            activeToolName = nil
        }

        voiceChatService.onTurnComplete = {
            voiceState = .liveListening
            withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                pulseScale = 1.08
            }
        }

        voiceChatService.onInterrupted = {
            pcmPlayer.interrupt()
            voiceState = .liveListening
        }

        voiceChatService.onSessionWarning = { (remainingMs: Int) in
            sessionTimeRemaining = Double(remainingMs) / 1000.0
        }

        voiceChatService.onSessionExpired = {
            voiceState = .idle
            errorMessage = String(localized: "chat.voice.sessionExpired", table: "Chat")
            stopAudio()
        }

        voiceChatService.onError = { (message: String) in
            errorMessage = message
            voiceState = .idle
            stopAudio()
        }

        audioStream.onAudioCaptured = { (data: Data) in
            if !isMuted {
                if voiceState == .liveResponding {
                    pcmPlayer.interrupt()
                    voiceState = .liveListening
                }
                voiceChatService.sendAudio(data: data)
            }
        }

        do {
            try await voiceChatService.connect(goalId: goalId, conversationId: conversationId)
            conversationId = voiceChatService.conversationId
            try pcmPlayer.start()
            try audioStream.startStreaming()
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
    }

    private func dismissOverlay() {
        cleanup()
        onClose()
    }

    private func stopAudio() {
        audioStream.stopStreaming()
        pcmPlayer.stop()
    }

    private func cleanup() {
        timer?.invalidate()
        timer = nil
        stopAudio()
        voiceChatService.disconnect()
        conversationId = voiceChatService.conversationId
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
