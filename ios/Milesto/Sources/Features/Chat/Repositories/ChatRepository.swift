import Foundation

@MainActor
final class ChatRepository {
    private let remote: ChatRemote

    init() {
        remote = ChatRemote()
    }

    func fetchConversations(goalId: String) async throws -> [ChatConversation] {
        let dtos = try await remote.listConversations(goalId: goalId)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return dtos.map { dto in
            ChatConversation(
                id: dto.id,
                preview: dto.preview,
                updatedAt: formatter.date(from: dto.updatedAt) ?? Date()
            )
        }
    }

    func fetchMessages(conversationId: String) async throws -> [ChatMessage] {
        try await remote.getConversationMessages(conversationId: conversationId)
    }

    func deleteConversation(conversationId: String) async throws {
        try await remote.deleteConversation(conversationId: conversationId)
    }

    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        remote.sendMessage(conversationId: conversationId, goalId: goalId, content: content)
    }
}
