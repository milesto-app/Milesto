import Foundation

@MainActor
protocol RemoteChatRepository: AnyObject {
    func listConversations(goalId: String) async throws -> [ConversationSummary]
    func getConversationMessages(conversationId: String) async throws -> [ChatMessage]
    func deleteConversation(conversationId: String) async throws
    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error>
}

@MainActor
protocol ChatRepository: AnyObject {
    func loadCachedConversations(goalId: String) -> [ConversationSummary]
    func refreshConversations(goalId: String) async throws -> [ConversationSummary]
    func loadCachedMessages(conversationId: String) -> [ChatMessage]
    func refreshMessages(conversationId: String) async throws -> [ChatMessage]
    func deleteConversation(conversationId: String) async throws
    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error>
    func saveStreamedMessages(_ messages: [ChatMessage], conversationId: String, goalId: String)
}
