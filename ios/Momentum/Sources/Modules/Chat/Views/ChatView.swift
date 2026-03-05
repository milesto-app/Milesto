import SwiftData
import SwiftUI

struct ChatView: View {
    let goalId: String
    var onClose: (() -> Void)?

    @Query private var localProfiles: [LocalProfile]
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isStreaming = false
    @State private var conversationId: String?
    @State private var isToolRunning = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showThinking = false
    @FocusState private var isInputFocused: Bool
    @State private var isVoiceChatActive = false
    @State private var isSidebarOpen = false
    @State private var conversations: [ConversationSummary] = []
    @State private var isLoadingHistory = false

    private var coach: CoachPersonality? {
        guard let coachId = localProfiles.first?.coachId else { return nil }
        return CoachPersonality.from(databaseId: coachId)
    }

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 32) {
                    ForEach(messages) { message in
                        ChatBubble(
                            message: message,
                            isStreamingResponse: isStreaming && message.id == messages.last?.id && message.role == .assistant
                        )
                        .id(message.id)
                    }

                    if isWaitingForResponse && showThinking {
                        ThinkingIndicator()
                            .id("thinking")
                            .transition(.opacity)
                    }
                }
                .padding(.vertical, 16)
            }
            .scrollDismissesKeyboard(.interactively)
            .contentMargins(.top, 56)
            .contentMargins(.bottom, 72)
            .onChange(of: messages.count) {
                if let lastId = messages.last?.id {
                    withAnimation(.easeOut(duration: 0.2)) {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
            .onChange(of: messages.last?.content) {
                if isStreaming, let lastId = messages.last?.id {
                    withAnimation(.easeOut(duration: 0.2)) {
                        proxy.scrollTo(lastId, anchor: .bottom)
                    }
                }
            }
        }
        .overlay(alignment: .bottom) {
            VStack(spacing: 16) {
                if messages.isEmpty {
                    ChatEmptyState(
                        isVisible: inputText.isEmpty,
                        onSelectPrompt: { prompt in
                            inputText = prompt
                            isInputFocused = true
                        }
                    )
                }

                ChatInputBar(text: $inputText, isDisabled: isStreaming, isFocused: $isInputFocused) {
                    sendMessage()
                }
            }
        }
        .overlay(alignment: .top) {
            ProgressiveBlur()
                .allowsHitTesting(false)
        }
        .overlay(alignment: .top) {
            HStack {
                Button {
                    isInputFocused = false
                    isSidebarOpen = true
                } label: {
                    TablerIcons(.menu2, size: 24, color: Colors.textPrimary)
                        .frame(width: 44, height: 44)
                        .glassEffect(.regular.interactive(), in: .circle)
                }

                if !messages.isEmpty {
                    Button {
                        withAnimation {
                            messages = []
                            conversationId = nil
                            inputText = ""
                        }
                    } label: {
                        TablerIcons(.edit, size: 24, color: Colors.textPrimary)
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .transition(.opacity)
                }

                Spacer()

                if let onClose {
                    Button(action: onClose) {
                        TablerIcons(.x, size: 24, color: Colors.textPrimary)
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .overlay {
            ChatHistorySidebar(
                isOpen: $isSidebarOpen,
                conversations: conversations,
                activeConversationId: conversationId,
                onSelectConversation: { id in
                    loadConversation(id)
                },
                onNewConversation: {
                    withAnimation {
                        messages = []
                        conversationId = nil
                        inputText = ""
                    }
                },
                onDeleteConversation: { id in
                    deleteConversation(id)
                }
            )
            .ignoresSafeArea()
        }
        .onChange(of: isSidebarOpen) { _, isOpen in
            if isOpen {
                fetchConversations()
            }
        }
        .onAppear {
            isInputFocused = true
        }
        .alert(String(localized: "chat.error.generic", table: "Chat"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        }
        .fullScreenCover(isPresented: $isVoiceChatActive) {
            VoiceChatOverlay(
                goalId: goalId,
                conversationId: $conversationId,
                coachName: coach?.title ?? "",
                coachIcon: coach?.icon ?? .flame,
                onClose: {
                    isVoiceChatActive = false
                }
            )
        }
    }

    private var isWaitingForResponse: Bool {
        guard isStreaming else { return false }
        if isToolRunning { return true }
        guard let last = messages.last, last.role == .assistant else { return true }
        return last.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    private func sendMessage() {
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
            } catch {
                errorMessage = String(localized: "chat.error.generic", table: "Chat")
                showError = true
            }

            isStreaming = false
            isToolRunning = false
            showThinking = false
        }
    }

    private func fetchConversations() {
        guard !isLoadingHistory else { return }
        isLoadingHistory = true
        Task {
            do {
                conversations = try await ChatAPIService.shared.listConversations(goalId: goalId)
            } catch {}
            isLoadingHistory = false
        }
    }

    private func deleteConversation(_ id: String) {
        Task {
            do {
                try await ChatAPIService.shared.deleteConversation(conversationId: id)
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

    private func loadConversation(_ id: String) {
        guard id != conversationId else { return }
        Task {
            do {
                let loadedMessages = try await ChatAPIService.shared.getConversationMessages(conversationId: id)
                withAnimation {
                    conversationId = id
                    messages = loadedMessages
                }
            } catch {
                errorMessage = String(localized: "chat.error.generic", table: "Chat")
                showError = true
            }
        }
    }
}
