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

    func loadConversations(goalId: String) -> [ChatConversation] {
        let descriptor = FetchDescriptor<ChatConversation>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        return (try? context.fetch(descriptor)) ?? []
    }

    func refreshConversations(goalId: String) async throws -> [ChatConversation] {
        let remotes = try await remote.listConversations(goalId: goalId)
        replaceConversations(remotes, goalId: goalId)
        try? context.save()
        return loadConversations(goalId: goalId)
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
        let descriptor = FetchDescriptor<ChatConversation>(
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
        let convDescriptor = FetchDescriptor<ChatConversation>(
            predicate: #Predicate { $0.id == conversationId }
        )
        let lastPreview = messages.last?.content.prefix(100).description

        if let existing = try? context.fetch(convDescriptor).first {
            existing.preview = lastPreview
            existing.updatedAt = Date()
        } else {
            context.insert(ChatConversation(
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

    private func replaceConversations(_ remotes: [ChatConversationDTO], goalId: String) {
        let descriptor = FetchDescriptor<ChatConversation>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? context.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let remoteIds = Set(remotes.map(\.id))

        for dto in remotes {
            let updatedAt = formatter.date(from: dto.updatedAt) ?? Date()
            let createdAt = formatter.date(from: dto.createdAt) ?? Date()

            if let local = existingById[dto.id] {
                local.preview = dto.preview
                local.updatedAt = updatedAt
                local.createdAt = createdAt
            } else {
                context.insert(ChatConversation(
                    id: dto.id,
                    goalId: dto.goalId,
                    preview: dto.preview,
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
