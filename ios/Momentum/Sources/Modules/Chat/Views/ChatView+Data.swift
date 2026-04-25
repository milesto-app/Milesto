import SwiftData
import SwiftUI

extension ChatView {
    func sendMessage() {
        let content = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !content.isEmpty else { return }

        let userMessage = ChatMessage(
            id: UUID().uuidString,
            role: .user,
            content: content,
            createdAt: Date()
        )
        withAnimation(.easeOut(duration: 0.35)) {
            messages.append(userMessage)
        }
        inputText = ""
        isStreaming = true
        showThinking = false

        Task {
            try? await Task.sleep(for: .milliseconds(800))
            if isStreaming {
                withAnimation(.easeIn(duration: 0.3)) {
                    showThinking = true
                }
            }
        }

        Task {
            do {
                let stream = ChatAPIService.shared.sendMessage(
                    conversationId: conversationId,
                    goalId: goalId,
                    content: content
                )

                for try await event in stream {
                    switch event {
                    case let .messageStart(id):
                        conversationId = id

                    case let .textDelta(delta):
                        if var last = messages.last, last.role == .assistant {
                            last.content += delta
                            messages[messages.count - 1] = last
                        } else if !delta.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                            let assistantMessage = ChatMessage(
                                id: UUID().uuidString,
                                role: .assistant,
                                content: delta,
                                createdAt: Date()
                            )
                            messages.append(assistantMessage)
                        }

                    case .toolStart:
                        isToolRunning = true

                    case .toolEnd:
                        isToolRunning = false

                    case .messageEnd:
                        break

                    case let .error(message):
                        errorMessage = message
                        showError = true
                    }
                }
            } catch let error as BackendError {
                if case .generationLimitReached = error {
                    isLimitReached = true
                    isSubscriptionRequired = false
                    errorMessage = String(localized: "usage.limit.reached.message", table: "Paywall")
                } else if case .subscriptionRequired = error {
                    isLimitReached = false
                    isSubscriptionRequired = true
                    errorMessage = error.localizedDescription
                } else {
                    isLimitReached = false
                    isSubscriptionRequired = false
                    errorMessage = String(localized: "chat.error.generic", table: "Chat")
                }
                showError = true
            } catch {
                isLimitReached = false
                isSubscriptionRequired = false
                errorMessage = String(localized: "chat.error.generic", table: "Chat")
                showError = true
            }

            isStreaming = false
            isToolRunning = false
            showThinking = false
            saveStreamedMessagesToCache()
        }
    }

    func fetchConversations() {
        guard !isLoadingHistory else { return }
        isLoadingHistory = true

        let goalId = goalId
        let descriptor = FetchDescriptor<LocalConversation>(
            predicate: #Predicate { $0.goalId == goalId },
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        if let cached = try? modelContext.fetch(descriptor), !cached.isEmpty {
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            conversations = cached.map { local in
                ConversationSummary(
                    id: local.id,
                    goalId: local.goalId,
                    preview: local.preview,
                    updatedAt: formatter.string(from: local.updatedAt),
                    createdAt: formatter.string(from: local.createdAt)
                )
            }
        }

        Task {
            do {
                let fetched = try await ChatAPIService.shared.listConversations(goalId: goalId)
                conversations = fetched
                syncConversationsToCache(fetched)
            } catch {}
            isLoadingHistory = false
        }
    }

    func syncConversationsToCache(_ summaries: [ConversationSummary]) {
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

    func deleteConversation(_ id: String) {
        Task {
            do {
                try await ChatAPIService.shared.deleteConversation(conversationId: id)
                let descriptor = FetchDescriptor<LocalConversation>(
                    predicate: #Predicate { $0.id == id }
                )
                if let local = try? modelContext.fetch(descriptor).first {
                    modelContext.delete(local)
                }
                withAnimation {
                    conversations.removeAll { $0.id == id }
                    if conversationId == id {
                        messages = []
                        conversationId = nil
                        inputText = ""
                    }
                }
            } catch {
                errorMessage = String(localized: "chat.error.generic", table: "Chat")
                showError = true
            }
        }
    }

    func loadConversation(_ id: String) {
        guard id != conversationId else { return }

        let descriptor = FetchDescriptor<LocalChatMessage>(
            predicate: #Predicate { $0.conversationId == id },
            sortBy: [SortDescriptor(\.createdAt)]
        )
        if let cached = try? modelContext.fetch(descriptor), !cached.isEmpty {
            let cachedMessages = cached.compactMap { local -> ChatMessage? in
                guard local.role == "user" || local.role == "assistant" else { return nil }
                return ChatMessage(
                    id: local.id,
                    role: local.role == "user" ? .user : .assistant,
                    content: local.content,
                    createdAt: local.createdAt
                )
            }
            conversationId = id
            messages = cachedMessages
        }

        Task {
            do {
                let loadedMessages = try await ChatAPIService.shared.getConversationMessages(conversationId: id)
                withAnimation {
                    conversationId = id
                    messages = loadedMessages
                }
                syncMessagesToCache(loadedMessages, conversationId: id)
            } catch {
                if messages.isEmpty || conversationId != id {
                    errorMessage = String(localized: "chat.error.generic", table: "Chat")
                    showError = true
                }
            }
        }
    }

    func syncMessagesToCache(_ chatMessages: [ChatMessage], conversationId: String) {
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
        guard let conversationId else { return }

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
