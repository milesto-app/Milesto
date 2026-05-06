import Foundation

@MainActor
final class ChatRepository {
    private let remote: ChatRemote

    init() {
        remote = ChatRemote()
    }

    func fetchConversations(goalId: String) async throws -> [ChatConversationDTO] {
        try await remote.listConversations(goalId: goalId)
    }

    func fetchMessages(conversationId: String) async throws -> [ChatMessageDTO] {
        try await remote.getConversationMessages(conversationId: conversationId)
    }

    func deleteConversation(conversationId: String) async throws {
        try await remote.deleteConversation(conversationId: conversationId)
    }

    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEventDTO, Error> {
        remote.sendMessage(conversationId: conversationId, goalId: goalId, content: content)
    }
}
