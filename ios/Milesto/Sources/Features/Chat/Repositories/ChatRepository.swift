import Foundation
import SwiftData

@MainActor
final class ChatRepository {
    private let remote: ChatRemote
    private let context: ModelContext

    init(modelContext: ModelContext) {
        remote = ChatRemote()
        context = modelContext
    }

    func loadConversations(goalId: String) -> [ConversationSummary] {
        let descriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        guard let localConversations = try? context.fetch(descriptor), !localConversations.isEmpty else { return [] }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return localConversations.map { local in
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
        replaceConversations(summaries, goalId: goalId)
        try? context.save()
        return summaries
    }

    func loadMessages(conversationId: String) -> [ChatMessage] {
        let descriptor = FetchDescriptor<ChatMessage>(
            predicate: #Predicate { $0.conversationId == conversationId },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    func refreshMessages(conversationId: String) async throws -> [ChatMessage] {
        let messages = try await remote.getConversationMessages(conversationId: conversationId)
        replaceMessages(messages, conversationId: conversationId)
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

        replaceMessages(messages, conversationId: conversationId)
        try? context.save()
    }

    private func replaceConversations(_ summaries: [ConversationSummary], goalId: String) {
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

    private func replaceMessages(_ messages: [ChatMessage], conversationId: String) {
        let descriptor = FetchDescriptor<ChatMessage>(
            predicate: #Predicate { $0.conversationId == conversationId }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        let remoteIds = Set(messages.map(\.id))

        for message in messages {
            if let local = existingById[message.id] {
                local.content = message.content
                local.role = message.role
                local.createdAt = message.createdAt
            } else {
                context.insert(ChatMessage(
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    createdAt: message.createdAt,
                    conversationId: conversationId
                ))
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            context.delete(local)
        }
    }
}
