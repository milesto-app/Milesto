import ElevenLabs
import LiveKit
import SwiftUI
import UIKit

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
    @State private var isReconnecting = false

    private let connectHaptic = UINotificationFeedbackGenerator()
    private let disconnectHaptic = UIImpactFeedbackGenerator(style: .medium)
    private let toolHaptic = UIImpactFeedbackGenerator(style: .light)

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

                centerContent
                    .padding(.top, 16)

                transcriptView
                    .frame(maxHeight: .infinity)

                bottomControls
                    .padding(.bottom, 40)
            }
            .padding(.horizontal, 24)
        }
        .ignoresSafeArea()
        .task { await startSession() }
        .onDisappear { cleanup() }
        .onChange(of: conversationService.agentState) { _, newState in
            if conversationService.isToolRunning { return }
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
                voiceState = .liveResponding
                withAnimation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
                    pulseScale = 1.05
                }
            }
        }
        .onChange(of: conversationService.isToolRunning) { _, isRunning in
            if isRunning {
                voiceState = .liveToolRunning
                withAnimation(.easeInOut(duration: 0.4).repeatForever(autoreverses: true)) {
                    pulseScale = 1.03
                }
            } else {
                toolHaptic.impactOccurred()
                voiceState = .liveResponding
                withAnimation(.easeInOut(duration: 0.6).repeatForever(autoreverses: true)) {
                    pulseScale = 1.15
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
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color("TintPrimary").opacity(0.15))
                    .frame(width: 120, height: 120)
                    .scaleEffect(pulseScale)

                Circle()
                    .fill(Color("TintPrimary").opacity(0.25))
                    .frame(width: 80, height: 80)
                    .scaleEffect(pulseScale * 0.95)

                Circle()
                    .fill(Color("TintPrimary").opacity(0.5))
                    .frame(width: 56, height: 56)

                TablerIcons(coachIcon, size: 28, color: Color("TextOnAccent"))
            }

            if let errorMessage {
                VStack(spacing: 12) {
                    AppText(verbatim: errorMessage, style: .caption)
                        .color(Color("StatusError"))
                        .multilineTextAlignment(.center)

                    if isReconnecting {
                        HStack(spacing: 6) {
                            ProgressView()
                                .tint(Color("TextOnAccent"))
                                .scaleEffect(0.7)
                            AppText("chat.voice.connecting", table: "Chat", style: .caption)
                                .color(Color("TextOnAccent").opacity(0.8))
                        }
                    } else {
                        Button(action: reconnect) {
                            HStack(spacing: 6) {
                                TablerIcons(.refresh, size: 16, color: Color("TextOnAccent"))
                                AppText("chat.voice.reconnect", table: "Chat", style: .caption)
                                    .color(Color("TextOnAccent"))
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(
                                Capsule()
                                    .fill(Color("TextOnAccent").opacity(0.15))
                            )
                        }
                    }
                }
            } else if isConnecting {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(Color("TextOnAccent"))
                    AppText("chat.voice.connecting", table: "Chat", style: .caption)
                        .color(Color("TextOnAccent").opacity(0.8))
                }
            } else if isSessionExpiring {
                AppText("chat.voice.sessionExpiring", table: "Chat", style: .caption)
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
            AppText("chat.voice.listening", table: "Chat", style: .caption)
                .color(Color("TextOnAccent").opacity(0.8))
        case .liveResponding:
            AppText("chat.voice.speaking", table: "Chat", style: .caption)
                .color(Color("TextOnAccent").opacity(0.8))
        case .liveToolRunning:
            HStack(spacing: 6) {
                ProgressView()
                    .tint(Color("TextOnAccent"))
                    .scaleEffect(0.7)
                AppText("chat.voice.toolRunning", table: "Chat", style: .caption)
                    .color(Color("TextOnAccent").opacity(0.8))
            }
        default:
            AppText("chat.voice.listening", table: "Chat", style: .caption)
                .color(Color("TextOnAccent").opacity(0.8))
        }
    }

    private var transcriptView: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(conversationService.messages) { message in
                        transcriptBubble(for: message)
                            .id(message.id)
                    }

                    if let partial = conversationService.currentUserTranscript, !partial.isEmpty {
                        HStack {
                            Spacer(minLength: 0)
                            AppText(verbatim: partial, style: .body)
                                .color(Color("TextOnAccent").opacity(0.4))
                                .padding(12)
                                .background(
                                    RoundedRectangle(cornerRadius: 16)
                                        .fill(Color("TintPrimary").opacity(0.3))
                                )
                        }
                        .padding(.leading, 40)
                        .id("partial")
                    }
                }
                .padding(.vertical, 8)
            }
            .scrollIndicators(.hidden)
            .onChange(of: conversationService.messages.count) {
                if let lastId = conversationService.messages.last?.id {
                    withAnimation(.easeOut(duration: 0.2)) {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
            .onChange(of: conversationService.currentUserTranscript) {
                if conversationService.currentUserTranscript != nil {
                    withAnimation(.easeOut(duration: 0.2)) {
                        proxy.scrollTo("partial", anchor: .bottom)
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func transcriptBubble(for message: TranscriptMessage) -> some View {
        let isUser = message.role == .user
        HStack {
            if isUser { Spacer(minLength: 0) }

            AppText(verbatim: message.content, style: .body)
                .color(Color("TextOnAccent"))
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(isUser ? Color("TintPrimary") : Color("TextOnAccent").opacity(0.15))
                )

            if !isUser { Spacer(minLength: 0) }
        }
        .padding(isUser ? .leading : .trailing, 40)
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
            connectHaptic.notificationOccurred(.success)

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

    private func reconnect() {
        guard let conversationId else { return }
        isReconnecting = true

        Task {
            do {
                try await conversationService.reconnect(goalId: goalId, conversationId: conversationId)
                isReconnecting = false
                errorMessage = nil
                voiceState = .liveListening
                connectHaptic.notificationOccurred(.success)
                withAnimation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true)) {
                    pulseScale = 1.08
                }
            } catch {
                isReconnecting = false
                errorMessage = String(localized: "chat.voice.error", table: "Chat")
            }
        }
    }

    private func dismissOverlay() {
        disconnectHaptic.impactOccurred()
        cleanup()
        onClose()
    }

    private func cleanup() {
        timer?.invalidate()
        timer = nil
        let savedConversationId = conversationService.conversationId
        conversationService.disconnect()
        if let savedConversationId {
            conversationId = savedConversationId
        }
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
