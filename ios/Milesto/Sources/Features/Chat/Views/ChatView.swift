import SwiftData
import SwiftUI

struct ChatView: View {
    let goalId: String
    var onClose: (() -> Void)?

    @Environment(\.modelContext) private var modelContext
    @State private var model = ChatViewModel()
    @FocusState private var isInputFocused: Bool
    @State private var isSidebarOpen = false

    var body: some View {
        ChatMessageList(
            messages: model.messages,
            isStreaming: model.isStreaming,
            isWaitingForResponse: model.isWaitingForResponse,
            showThinking: model.showThinking
        )
        .overlay(alignment: .bottom) {
            VStack(spacing: 16) {
                if model.messages.isEmpty {
                    ChatEmptyState(
                        isVisible: model.inputText.isEmpty,
                        onSelectPrompt: { prompt in
                            model.inputText = prompt
                            isInputFocused = true
                        }
                    )
                }

                ChatInputBar(text: $model.inputText, isDisabled: model.isStreaming, isFocused: $isInputFocused) {
                    model.sendMessage()
                }
            }
        }
        .overlay(alignment: .top) {
            ProgressiveBlur()
                .allowsHitTesting(false)
        }
        .overlay(alignment: .top) {
            ChatTopBar(
                showEditButton: !model.messages.isEmpty,
                onOpenSidebar: {
                    isInputFocused = false
                    isSidebarOpen = true
                },
                onNewConversation: {
                    model.startNewConversation()
                },
                onClose: onClose
            )
        }
        .overlay {
            ChatHistorySidebar(
                isOpen: $isSidebarOpen,
                conversations: model.conversations,
                activeConversationId: model.conversationId,
                onSelectConversation: { id in
                    model.loadConversation(id)
                },
                onNewConversation: {
                    withAnimation {
                        model.startNewConversation()
                    }
                },
                onDeleteConversation: { id in
                    model.deleteConversation(id)
                }
            )
            .ignoresSafeArea()
        }
        .onChange(of: isSidebarOpen) { _, isOpen in
            if isOpen {
                model.fetchConversations()
            }
        }
        .onAppear {
            model.configure(goalId: goalId, modelContext: modelContext)
            isInputFocused = true
        }
        .alert(chatErrorTitle,
               isPresented: $model.showError)
        {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {
                model.isLimitReached = false
            }
        } message: {
            if model.isLimitReached {
                Text(model.errorMessage)
            }
        }
    }

    private var chatErrorTitle: String {
        if model.isLimitReached {
            return String(localized: "usage.limit.reached.title", table: "Paywall")
        }
        return String(localized: "chat.error.generic", table: "Chat")
    }
}
