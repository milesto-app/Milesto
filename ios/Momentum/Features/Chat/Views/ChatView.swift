import SwiftUI
import SwiftData

struct ChatView: View {
    let goalId: String
    var onClose: (() -> Void)? = nil

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
    @State private var keyboardHeight: CGFloat = 0

    private var coach: CoachPersonality? {
        guard let coachId = localProfiles.first?.coachId else { return nil }
        return CoachPersonality.from(databaseId: coachId)
    }

    var body: some View {
        ZStack {
            AnimatedBackground()
                .ignoresSafeArea()

            VStack(spacing: 0) {
                if messages.isEmpty {
                    ChatEmptyState(onSelectPrompt: { prompt in
                        inputText = prompt
                    }, onVoiceChatTap: {
                        isVoiceChatActive = true
                    })
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .contentMargins(.top, 56)
                    .contentMargins(.bottom, 80 + keyboardHeight)
                    .transition(.opacity.combined(with: .scale(scale: 0.95)).combined(with: .offset(y: -20)))
                } else {
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: AppTheme.Spacing.xl) {
                                ForEach(messages) { message in
                                    ChatBubble(message: message)
                                        .id(message.id)
                                }

                                if isWaitingForResponse && showThinking {
                                    ThinkingIndicator()
                                        .id("thinking")
                                        .transition(.opacity)
                                }
                            }
                            .padding(.vertical, AppTheme.Spacing.md)
                        }
                        .scrollDismissesKeyboard(.interactively)
                        .contentMargins(.top, 56)
                        .contentMargins(.bottom, 80 + keyboardHeight)
                        .onChange(of: messages.count) {
                            if let lastId = messages.last?.id {
                                withAnimation(.easeOut(duration: 0.2)) {
                                    proxy.scrollTo(lastId, anchor: .bottom)
                                }
                            }
                        }
                    }
                }
            }
            .overlay(alignment: .bottom) {
                ChatInputBar(text: $inputText, isDisabled: isStreaming, isFocused: $isInputFocused) {
                    sendMessage()
                }
                .padding(.bottom, keyboardHeight)
            }
        }
        .ignoresSafeArea(.keyboard)
        .overlay(alignment: .top) {
            HStack {
                Button {
                    isInputFocused = false
                    withAnimation(.spring(duration: 0.3)) {
                        isSidebarOpen = true
                    }
                } label: {
                    TablerIcon(.menu2, size: 24, color: AppTheme.Colors.textPrimary)
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
                        TablerIcon(.edit, size: 24, color: AppTheme.Colors.textPrimary)
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                    .transition(.opacity)
                }

                Spacer()

                if let onClose {
                    Button(action: onClose) {
                        TablerIcon(.x, size: 24, color: AppTheme.Colors.textPrimary)
                            .frame(width: 44, height: 44)
                            .glassEffect(.regular.interactive(), in: .circle)
                    }
                }
            }
            .padding(.horizontal, AppTheme.Spacing.md)
            .padding(.top, AppTheme.Spacing.xs)
        }
        .overlay {
            if isSidebarOpen {
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
                    }
                )
            }
        }
        .onChange(of: isSidebarOpen) { _, isOpen in
            if isOpen {
                fetchConversations()
            }
        }
        .onAppear {
            isInputFocused = true
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillShowNotification)) { notification in
            guard let frame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect else { return }
            let bottomSafeArea = UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .first?.windows.first?.safeAreaInsets.bottom ?? 0
            withAnimation(.easeOut(duration: 0.25)) {
                keyboardHeight = frame.height - bottomSafeArea
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: UIResponder.keyboardWillHideNotification)) { _ in
            withAnimation(.easeOut(duration: 0.25)) {
                keyboardHeight = 0
            }
        }
        .toolbar(.hidden, for: .tabBar)
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
                    case .messageStart(let id):
                        conversationId = id

                    case .textDelta(let delta):
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

                    case .error(let message):
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
