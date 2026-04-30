import Foundation
import SwiftData

@MainActor
final class SyncingChatRepository: ChatRepository {
    private let remote: any RemoteChatRepository
    private let container: ModelContainer

    init(remote: any RemoteChatRepository, container: ModelContainer) {
        self.remote = remote
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
    }

    func loadCachedConversations(goalId: String) -> [ConversationSummary] {
        let descriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        guard let cached = try? context.fetch(descriptor), !cached.isEmpty else { return [] }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return cached.map { local in
            ConversationSummary(
                id: local.id,
                goalId: local.goalId,
                preview: local.preview,
                updatedAt: formatter.string(from: local.updatedAt),
                createdAt: formatter.string(from: local.createdAt)
            )
        }
    }

    func refreshConversations(goalId: String) async throws -> [ConversationSummary] {
        let summaries = try await remote.listConversations(goalId: goalId)
        syncConversationsToCache(summaries, goalId: goalId)
        try? context.save()
        return summaries
    }

    func loadCachedMessages(conversationId: String) -> [ChatMessage] {
        let descriptor = FetchDescriptor<LocalChatMessage>(
            predicate: #Predicate { $0.conversationId == conversationId },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        guard let cached = try? context.fetch(descriptor), !cached.isEmpty else { return [] }
        return cached.compactMap { local in
            guard local.role == "user" || local.role == "assistant" else { return nil }
            return ChatMessage(
                id: local.id,
                role: local.role == "user" ? .user : .assistant,
                content: local.content,
                createdAt: local.createdAt
            )
        }
    }

    func refreshMessages(conversationId: String) async throws -> [ChatMessage] {
        let messages = try await remote.getConversationMessages(conversationId: conversationId)
        syncMessagesToCache(messages, conversationId: conversationId)
        try? context.save()
        return messages
    }

    func deleteConversation(conversationId: String) async throws {
        try await remote.deleteConversation(conversationId: conversationId)
        let descriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.id == conversationId }
        )
        if let local = try? context.fetch(descriptor).first {
            context.delete(local)
            try? context.save()
        }
    }

    func sendMessage(conversationId: String?, goalId: String, content: String) -> AsyncThrowingStream<ChatStreamEvent, Error> {
        remote.sendMessage(conversationId: conversationId, goalId: goalId, content: content)
    }

    func saveStreamedMessages(_ messages: [ChatMessage], conversationId: String, goalId: String) {
        let convDescriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.id == conversationId }
        )
        let lastPreview = messages.last?.content.prefix(100).description

        if let existing = try? context.fetch(convDescriptor).first {
            existing.preview = lastPreview
            existing.updatedAt = Date()
        } else {
            context.insert(LocalConversation(
                id: conversationId,
                goalId: goalId,
                preview: lastPreview,
                updatedAt: Date(),
                createdAt: Date()
            ))
        }

        syncMessagesToCache(messages, conversationId: conversationId)
        try? context.save()
    }

    private func syncConversationsToCache(_ summaries: [ConversationSummary], goalId: String) {
        let descriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let remoteIds = Set(summaries.map(\.id))

        for summary in summaries {
            let updatedAt = formatter.date(from: summary.updatedAt) ?? Date()
            let createdAt = formatter.date(from: summary.createdAt) ?? Date()

            if let local = existingById[summary.id] {
                local.preview = summary.preview
                local.updatedAt = updatedAt
                local.createdAt = createdAt
            } else {
                context.insert(LocalConversation(
                    id: summary.id,
                    goalId: summary.goalId,
                    preview: summary.preview,
                    updatedAt: updatedAt,
                    createdAt: createdAt
                ))
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            context.delete(local)
        }
    }

    private func syncMessagesToCache(_ messages: [ChatMessage], conversationId: String) {
        let descriptor = FetchDescriptor<LocalChatMessage>(
            predicate: #Predicate { $0.conversationId == conversationId }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        let remoteIds = Set(messages.map(\.id))

        for message in messages {
            let roleString = message.role == .user ? "user" : "assistant"
            if let local = existingById[message.id] {
                local.content = message.content
                local.role = roleString
            } else {
                context.insert(LocalChatMessage(
                    id: message.id,
                    conversationId: conversationId,
                    role: roleString,
                    content: message.content,
                    createdAt: message.createdAt
                ))
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            context.delete(local)
        }
    }
}
