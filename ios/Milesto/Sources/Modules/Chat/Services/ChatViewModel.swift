import SwiftData
import SwiftUI

@Observable
final class ChatViewModel {
    var messages: [ChatMessage] = []
    var inputText = ""
    var isStreaming = false
    var conversationId: String?
    var isToolRunning = false
    var showError = false
    var errorMessage = ""
    var showThinking = false
    var conversations: [ConversationSummary] = []
    var isLoadingHistory = false
    var isLimitReached = false
    var isSubscriptionRequired = false

    var goalId: String = ""
    var modelContext: ModelContext?

    var isWaitingForResponse: Bool {
        guard isStreaming else { return false }
        if isToolRunning { return true }
        guard let last = messages.last, last.role == .assistant else { return true }
        return last.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func configure(goalId: String, modelContext: ModelContext) {
        self.goalId = goalId
        self.modelContext = modelContext
    }

    func startNewConversation() {
        messages = []
        conversationId = nil
        inputText = ""
    }

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
        guard let modelContext, !isLoadingHistory else { return }
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

    func deleteConversation(_ id: String) {
        guard let modelContext else { return }
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
        guard let modelContext, id != conversationId else { return }

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
}
