import Foundation

@MainActor
protocol ChatRepository: AnyObject {
    func listConversations(goalId: String) async throws -> [ConversationSummary]
    func getConversationMessages(conversationId: String) async throws -> [ChatMessage]
    func deleteConversation(conversationId: String) async throws
    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error>
}
