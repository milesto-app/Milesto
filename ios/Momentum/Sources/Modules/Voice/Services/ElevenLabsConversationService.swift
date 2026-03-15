import ElevenLabs
import Foundation
import Observation
import Supabase

@MainActor
@Observable
final class ElevenLabsConversationService {
    private(set) var isConnected = false
    private(set) var isSessionActive = false
    private(set) var conversationId: String?
    private(set) var agentState: ElevenLabs.AgentState = .listening

    private var sessionId: String?
    private var conversation: Conversation?

    var isSpeaking: Bool {
        agentState == .speaking
    }

    func connect(goalId: String, conversationId: String? = nil) async throws {
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
                Task { @MainActor in
                    self?.isConnected = true
                    self?.isSessionActive = true
                }
            },
            onDisconnect: { [weak self] _ in
                Task { @MainActor in
                    self?.isConnected = false
                    self?.isSessionActive = false
                }
            },
            onError: { [weak self] _ in
                Task { @MainActor in
                    self?.isConnected = false
                    self?.isSessionActive = false
                }
            },
            onConversationMetadata: { [weak self] metadata in
                Task { @MainActor in
                    guard let self, let sessionId = self.sessionId else { return }
                    let elConvId = metadata.conversationId
                    try? await BackendClient.shared.requestVoid(
                        method: "PATCH",
                        path: "voice-chat/session/\(sessionId)/elevenlabs-conversation",
                        body: ElevenLabsConversationBody(elevenLabsConversationId: elConvId)
                    )
                }
            },
            onAgentStateChange: { [weak self] state in
                Task { @MainActor in
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
        Task {
            await conversation?.endConversation()
        }
        conversation = nil

        if let sessionId {
            Task {
                try? await BackendClient.shared.requestVoid(
                    method: "DELETE",
                    path: "voice-chat/session/\(sessionId)"
                )
            }
        }

        isConnected = false
        isSessionActive = false
        conversationId = nil
        sessionId = nil
        agentState = .listening
    }

    func setMuted(_ muted: Bool) {
        Task {
            try? await conversation?.setMuted(muted)
        }
    }
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
