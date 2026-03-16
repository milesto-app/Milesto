import AVFAudio
import ElevenLabs
import Foundation
import Network
import Observation
import Supabase

@MainActor
@Observable
final class ElevenLabsConversationService {
    private(set) var isConnected = false
    private(set) var isSessionActive = false
    private(set) var conversationId: String?
    private(set) var agentState: ElevenLabs.AgentState = .listening
    private(set) var messages: [TranscriptMessage] = []
    private(set) var isToolRunning = false
    private(set) var currentUserTranscript: String?
    private(set) var connectionError: ConnectionError?

    private var sessionId: String?
    private var conversation: Conversation?
    private var agentEventIdToIndex: [Int: Int] = [:]
    private var interruptionObserver: (any NSObjectProtocol)?
    private var networkMonitor: NWPathMonitor?
    private var currentSessionMessageStartIndex = 0

    var isSpeaking: Bool {
        agentState == .speaking
    }

    var canReconnect: Bool {
        connectionError != nil && !isConnected
    }

    func connect(goalId: String, conversationId: String? = nil) async throws {
        connectionError = nil
        startObservingInterruptions()
        startMonitoringNetwork()
        let response: SessionResponse = try await BackendClient.shared.request(
            method: "POST",
            path: "voice-chat/session",
            body: CreateSessionBody(goalId: goalId, conversationId: conversationId)
        )

        self.conversationId = response.conversationId
        sessionId = response.sessionId

        let overrides = response.overrides

        let config = ConversationConfig(
            agentOverrides: AgentOverrides(
                prompt: overrides.prompt,
                language: .init(rawValue: overrides.language)
            ),
            ttsOverrides: TTSOverrides(voiceId: overrides.voiceId),
            onAgentReady: { [weak self] in
                Task { @MainActor [weak self] in
                    self?.isConnected = true
                    self?.isSessionActive = true
                }
            },
            onDisconnect: { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.isConnected = false
                    self?.isSessionActive = false
                    if self?.connectionError == nil {
                        self?.connectionError = .disconnected
                    }
                }
            },
            onError: { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.isConnected = false
                    self?.isSessionActive = false
                    self?.connectionError = .sdkError
                }
            },
            onAgentResponse: { [weak self] text, eventId in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    if let index = self.agentEventIdToIndex[eventId] {
                        self.messages[index].content = text
                    } else {
                        let message = TranscriptMessage(
                            id: "agent-\(eventId)",
                            role: .agent,
                            content: text,
                            timestamp: Date()
                        )
                        self.agentEventIdToIndex[eventId] = self.messages.count
                        self.messages.append(message)
                    }
                }
            },
            onAgentResponseCorrection: { [weak self] _, corrected, eventId in
                Task { @MainActor [weak self] in
                    guard let self,
                          let index = self.agentEventIdToIndex[eventId] else { return }
                    self.messages[index].content = corrected
                }
            },
            onUserTranscript: { [weak self] text, _ in
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    self.currentUserTranscript = nil
                    let message = TranscriptMessage(
                        id: UUID().uuidString,
                        role: .user,
                        content: text,
                        timestamp: Date()
                    )
                    self.messages.append(message)
                }
            },
            onConversationMetadata: { [weak self] metadata in
                Task { @MainActor [weak self] in
                    guard let self, let sessionId = self.sessionId else { return }
                    let elConvId = metadata.conversationId
                    try? await BackendClient.shared.requestVoid(
                        method: "PATCH",
                        path: "voice-chat/session/\(sessionId)/elevenlabs-conversation",
                        body: ElevenLabsConversationBody(elevenLabsConversationId: elConvId)
                    )
                }
            },
            onAgentToolResponse: { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.isToolRunning = false
                }
            },
            onAgentToolRequest: { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.isToolRunning = true
                }
            },
            onAgentStateChange: { [weak self] state in
                Task { @MainActor [weak self] in
                    self?.agentState = state
                }
            }
        )

        let conv = try await ElevenLabs.startConversation(
            conversationToken: response.signedUrl,
            config: config
        )
        conversation = conv
    }

    func disconnect() {
        stopObservingInterruptions()
        stopMonitoringNetwork()

        let capturedMessages = Array(messages[currentSessionMessageStartIndex...])
        let capturedSessionId = sessionId

        Task {
            await conversation?.endConversation()
        }
        conversation = nil

        if let capturedSessionId {
            Task {
                if !capturedMessages.isEmpty {
                    try? await Self.postTranscript(
                        sessionId: capturedSessionId,
                        messages: capturedMessages
                    )
                }
                try? await BackendClient.shared.requestVoid(
                    method: "DELETE",
                    path: "voice-chat/session/\(capturedSessionId)"
                )
            }
        }

        isConnected = false
        isSessionActive = false
        conversationId = nil
        sessionId = nil
        agentState = .listening
        messages = []
        isToolRunning = false
        currentUserTranscript = nil
        connectionError = nil
        agentEventIdToIndex = [:]
        currentSessionMessageStartIndex = 0
    }

    func reconnect(goalId: String, conversationId: String) async throws {
        stopObservingInterruptions()
        stopMonitoringNetwork()

        let oldSessionMessages = Array(messages[currentSessionMessageStartIndex...])
        let preservedMessages = messages

        let oldSessionId = sessionId
        let oldConversation = conversation
        conversation = nil
        sessionId = nil
        isConnected = false
        isSessionActive = false
        agentState = .listening
        isToolRunning = false
        currentUserTranscript = nil
        connectionError = nil
        agentEventIdToIndex = [:]

        Task {
            await oldConversation?.endConversation()
        }

        if let oldSessionId {
            Task {
                if !oldSessionMessages.isEmpty {
                    try? await Self.postTranscript(
                        sessionId: oldSessionId,
                        messages: oldSessionMessages
                    )
                }
                try? await BackendClient.shared.requestVoid(
                    method: "DELETE",
                    path: "voice-chat/session/\(oldSessionId)"
                )
            }
        }

        messages = preservedMessages
        currentSessionMessageStartIndex = preservedMessages.count

        try await connect(goalId: goalId, conversationId: conversationId)

        let newMessages = messages.filter { msg in
            !preservedMessages.contains { $0.id == msg.id }
        }
        messages = preservedMessages + newMessages
        currentSessionMessageStartIndex = preservedMessages.count
    }

    func setMuted(_ muted: Bool) {
        Task {
            try? await conversation?.setMuted(muted)
        }
    }

    private func startObservingInterruptions() {
        interruptionObserver = NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: nil
        ) { [weak self] notification in
            guard let info = notification.userInfo,
                  let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: typeValue),
                  type == .began else { return }

            Task { @MainActor [weak self] in
                guard let self, self.isConnected else { return }
                let capturedMessages = self.messages
                let capturedSessionId = self.sessionId

                self.connectionError = .audioInterruption
                self.isConnected = false
                self.isSessionActive = false

                Task {
                    await self.conversation?.endConversation()
                }
                self.conversation = nil

                if let capturedSessionId, !capturedMessages.isEmpty {
                    Task {
                        try? await Self.postTranscript(
                            sessionId: capturedSessionId,
                            messages: capturedMessages
                        )
                    }
                }
            }
        }
    }

    private func stopObservingInterruptions() {
        if let observer = interruptionObserver {
            NotificationCenter.default.removeObserver(observer)
            interruptionObserver = nil
        }
    }

    private func startMonitoringNetwork() {
        let monitor = NWPathMonitor()
        networkMonitor = monitor
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self, self.isConnected else { return }
                if path.status != .satisfied {
                    self.connectionError = .networkLost
                    self.isConnected = false
                    self.isSessionActive = false
                }
            }
        }
        monitor.start(queue: DispatchQueue(label: "voice-chat-network-monitor"))
    }

    private func stopMonitoringNetwork() {
        networkMonitor?.cancel()
        networkMonitor = nil
    }

    private static func postTranscript(
        sessionId: String,
        messages: [TranscriptMessage]
    ) async throws {
        let turns = messages.enumerated().map { index, msg in
            ClientTranscriptTurn(
                role: msg.role == .user ? "user" : "agent",
                content: msg.content,
                timestamp: ISO8601DateFormatter().string(from: msg.timestamp),
                turnIndex: index
            )
        }
        try await BackendClient.shared.requestVoid(
            method: "POST",
            path: "voice-chat/session/\(sessionId)/client-transcript",
            body: ClientTranscriptBody(turns: turns)
        )
    }
}

enum ConnectionError {
    case networkLost
    case audioInterruption
    case sdkError
    case disconnected
}

private struct ClientTranscriptBody: Encodable {
    let turns: [ClientTranscriptTurn]
}

private struct ClientTranscriptTurn: Encodable {
    let role: String
    let content: String
    let timestamp: String
    let turnIndex: Int
}

private struct CreateSessionBody: Encodable {
    let goalId: String
    let conversationId: String?
}

private struct SessionResponse: Decodable {
    let signedUrl: String
    let conversationId: String
    let sessionId: String
    let sessionSecret: String
    let overrides: SessionOverrides
}

private struct SessionOverrides: Decodable {
    let prompt: String
    let language: String
    let voiceId: String
}

private struct ElevenLabsConversationBody: Encodable {
    let elevenLabsConversationId: String
}
