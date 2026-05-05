import Foundation

@MainActor
@Observable
final class ChatViewModel {
    @ObservationIgnored private let repository: ChatRepository

    private(set) var messages: [ChatMessage] = []
    var inputText = ""
    private(set) var isStreaming = false
    private(set) var conversationId: String?
    private(set) var isToolRunning = false
    var showError = false
    private(set) var errorMessage = ""
    private(set) var showThinking = false
    private(set) var conversations: [ConversationSummary] = []
    private(set) var isLoadingHistory = false
    var isLimitReached = false

    private(set) var goalId: String = ""

    init(repository: ChatRepository) {
        self.repository = repository
    }

    var isWaitingForResponse: Bool {
        guard isStreaming else { return false }
        if isToolRunning { return true }
        guard let last = messages.last, last.role == .assistant else { return true }
        return last.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    func configure(goalId: String) {
        self.goalId = goalId
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
        messages.append(userMessage)
        inputText = ""
        isStreaming = true
        showThinking = false

        Task {
            try? await Task.sleep(for: .milliseconds(800))
            if isStreaming {
                showThinking = true
            }
        }

        Task {
            do {
                let stream = repository.sendMessage(
                    conversationId: conversationId,
                    goalId: goalId,
                    content: content
                )
                for try await event in stream {
                    handle(event: event)
                }
            } catch let error as ApiError {
                if case .generationLimitReached = error {
                    isLimitReached = true
                    errorMessage = String(localized: "usage.limit.reached.message", table: "Paywall")
                } else {
                    isLimitReached = false
                    errorMessage = String(localized: "chat.error.generic", table: "Chat")
                }
                showError = true
            } catch {
                isLimitReached = false
                errorMessage = String(localized: "chat.error.generic", table: "Chat")
                showError = true
            }

            isStreaming = false
            isToolRunning = false
            showThinking = false
            if let conversationId {
                repository.saveStreamedMessages(messages, conversationId: conversationId, goalId: goalId)
            }
        }
    }

    func fetchConversations() {
        guard !isLoadingHistory else { return }
        isLoadingHistory = true

        let localConversations = repository.loadConversations(goalId: goalId)
        if !localConversations.isEmpty {
            conversations = localConversations
        }

        Task {
            if let fetched = try? await repository.refreshConversations(goalId: goalId) {
                conversations = fetched
            }
            isLoadingHistory = false
        }
    }

    func deleteConversation(_ id: String) {
        Task {
            do {
                try await repository.deleteConversation(conversationId: id)
                conversations.removeAll { $0.id == id }
                if conversationId == id {
                    messages = []
                    conversationId = nil
                    inputText = ""
                }
            } catch {
                errorMessage = String(localized: "chat.error.generic", table: "Chat")
                showError = true
            }
        }
    }

    func loadConversation(_ id: String) {
        guard id != conversationId else { return }

        let localMessages = repository.loadMessages(conversationId: id)
        if !localMessages.isEmpty {
            conversationId = id
            messages = localMessages
        }

        Task {
            do {
                let loaded = try await repository.refreshMessages(conversationId: id)
                conversationId = id
                messages = loaded
            } catch {
                if messages.isEmpty || conversationId != id {
                    errorMessage = String(localized: "chat.error.generic", table: "Chat")
                    showError = true
                }
            }
        }
    }

    private func handle(event: ChatStreamEvent) {
        switch event {
        case let .messageStart(id):
            conversationId = id
        case let .textDelta(delta):
            if let last = messages.last, last.role == .assistant {
                last.content += delta
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
}
