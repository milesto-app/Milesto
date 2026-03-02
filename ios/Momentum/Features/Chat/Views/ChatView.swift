import SwiftUI

struct ChatView: View {
    let goalId: String
    var onClose: (() -> Void)? = nil

    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isStreaming = false
    @State private var conversationId: String?
    @State private var activeToolName: String?
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var showThinking = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        ZStack {
            AnimatedBackground()
                .ignoresSafeArea(.keyboard)

            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        if messages.isEmpty {
                            ChatEmptyState { prompt in
                                inputText = prompt
                            }
                            .frame(maxHeight: .infinity)
                            .padding(.top, AppTheme.Spacing.xxl)
                        } else {
                            LazyVStack(spacing: AppTheme.Spacing.xl) {
                                ForEach(messages) { message in
                                    ChatBubble(message: message)
                                        .id(message.id)
                                }

                                if isWaitingForResponse && showThinking {
                                    ThinkingIndicator()
                                        .id("thinking")
                                        .transition(.opacity)
                                } else if let toolName = activeToolName {
                                    ToolStatusIndicator(toolName: toolName)
                                        .id("tool")
                                        .transition(.opacity)
                                }
                            }
                            .padding(.vertical, AppTheme.Spacing.md)
                        }
                    }
                    .scrollDismissesKeyboard(.interactively)
                    .contentMargins(.top, 56)
                    .contentMargins(.bottom, 80)
                    .onChange(of: messages.count) {
                        if let lastId = messages.last?.id {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }
            }
            .overlay(alignment: .bottom) {
                ChatInputBar(text: $inputText, isDisabled: isStreaming, isFocused: $isInputFocused) {
                    sendMessage()
                }
            }
        }
        .overlay(alignment: .top) {
            HStack {
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
        .onAppear {
            isInputFocused = true
        }
        .toolbar(.hidden, for: .tabBar)
        .alert(String(localized: "chat.error.generic", table: "Chat"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        }
    }

    private var isWaitingForResponse: Bool {
        guard isStreaming, activeToolName == nil else { return false }
        return messages.last?.role != .assistant
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
        messages.append(userMessage)
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
                        } else {
                            let assistantMessage = ChatMessage(
                                id: UUID().uuidString,
                                role: .assistant,
                                content: delta,
                                createdAt: Date()
                            )
                            messages.append(assistantMessage)
                        }

                    case .toolStart(let toolName):
                        activeToolName = toolName

                    case .toolEnd:
                        activeToolName = nil

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
            showThinking = false
            activeToolName = nil
        }
    }
}
