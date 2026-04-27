import Foundation
import SwiftData

extension ChatViewModel {
    func syncConversationsToCache(_ summaries: [ConversationSummary]) {
        guard let modelContext else { return }
        let goalId = goalId
        let descriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let existing = (try? modelContext.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        let remoteIds = Set(summaries.map(\.id))

        for summary in summaries {
            let updatedAt = dateFormatter.date(from: summary.updatedAt) ?? Date()
            let createdAt = dateFormatter.date(from: summary.createdAt) ?? Date()

            if let local = existingById[summary.id] {
                local.preview = summary.preview
                local.updatedAt = updatedAt
                local.createdAt = createdAt
            } else {
                let local = LocalConversation(
                    id: summary.id,
                    goalId: summary.goalId,
                    preview: summary.preview,
                    updatedAt: updatedAt,
                    createdAt: createdAt
                )
                modelContext.insert(local)
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            modelContext.delete(local)
        }
    }

    func syncMessagesToCache(_ chatMessages: [ChatMessage], conversationId: String) {
        guard let modelContext else { return }
        let descriptor = FetchDescriptor<LocalChatMessage>(
            predicate: #Predicate { $0.conversationId == conversationId }
        )
        let existing = (try? modelContext.fetch(descriptor)) ?? []
        let existingById = Dictionary(uniqueKeysWithValues: existing.map { ($0.id, $0) })

        let remoteIds = Set(chatMessages.map(\.id))

        for message in chatMessages {
            let roleString = message.role == .user ? "user" : "assistant"

            if let local = existingById[message.id] {
                local.content = message.content
                local.role = roleString
            } else {
                let local = LocalChatMessage(
                    id: message.id,
                    conversationId: conversationId,
                    role: roleString,
                    content: message.content,
                    createdAt: message.createdAt
                )
                modelContext.insert(local)
            }
        }

        for local in existing where !remoteIds.contains(local.id) {
            modelContext.delete(local)
        }
    }

    func saveStreamedMessagesToCache() {
        guard let modelContext, let conversationId else { return }

        let convDescriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.id == conversationId }
        )
        let lastPreview = messages.last?.content.prefix(100).description

        if let existing = try? modelContext.fetch(convDescriptor).first {
            existing.preview = lastPreview
            existing.updatedAt = Date()
        } else {
            let conversation = LocalConversation(
                id: conversationId,
                goalId: goalId,
                preview: lastPreview,
                updatedAt: Date(),
                createdAt: Date()
            )
            modelContext.insert(conversation)
        }

        syncMessagesToCache(messages, conversationId: conversationId)
    }
}
