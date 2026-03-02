import SwiftUI

struct ChatView: View {
    let goalId: String

    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isStreaming = false
    @State private var conversationId: String?
    @State private var activeToolName: String?
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        ZStack {
            AnimatedBackground()

            VStack(spacing: 0) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: AppTheme.Spacing.xl) {
                            if messages.isEmpty {
                                AppText("chat.empty", table: "Chat", style: .subheadline)
                                    .color(AppTheme.Colors.textSecondary)
                                    .padding(.top, AppTheme.Spacing.xxl)
                            }

                            ForEach(messages) { message in
                                ChatBubble(message: message)
                                    .id(message.id)
                            }
                        }
                        .padding(.vertical, AppTheme.Spacing.md)
                    }
                    .onChange(of: messages.count) {
                        if let lastId = messages.last?.id {
                            withAnimation(.easeOut(duration: 0.2)) {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }

                if let toolName = activeToolName {
                    ToolStatusIndicator(toolName: toolName)
                }

                ChatInputBar(text: $inputText, isDisabled: isStreaming) {
                    sendMessage()
                }
            }
        }
        .alert(String(localized: "chat.error.generic", table: "Chat"), isPresented: $showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {}
        }
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
                        let assistantMessage = ChatMessage(
                            id: UUID().uuidString,
                            role: .assistant,
                            content: "",
                            createdAt: Date()
                        )
                        messages.append(assistantMessage)

                    case .textDelta(let delta):
                        if var last = messages.last, last.role == .assistant {
                            last.content += delta
                            messages[messages.count - 1] = last
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
            activeToolName = nil
        }
    }
}
