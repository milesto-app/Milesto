import SwiftData
import SwiftUI

struct ChatView: View {
    let goalId: String
    var onClose: (() -> Void)?

    @Environment(\.modelContext) var modelContext
    @State var messages: [ChatMessage] = []
    @State var inputText = ""
    @State var isStreaming = false
    @State var conversationId: String?
    @State var isToolRunning = false
    @State var showError = false
    @State var errorMessage = ""
    @State var showThinking = false
    @FocusState var isInputFocused: Bool
    @State var isSidebarOpen = false
    @State var conversations: [ConversationSummary] = []
    @State var isLoadingHistory = false
    @State var isLimitReached = false

    var body: some View {
        ChatMessageList(
            messages: messages,
            isStreaming: isStreaming,
            isWaitingForResponse: isWaitingForResponse,
            showThinking: showThinking
        )
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
            ChatTopBar(
                showEditButton: !messages.isEmpty,
                onOpenSidebar: {
                    isInputFocused = false
                    isSidebarOpen = true
                },
                onNewConversation: {
                    messages = []
                    conversationId = nil
                    inputText = ""
                },
                onClose: onClose
            )
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
        .alert(isLimitReached
            ? String(localized: "usage.limit.reached.title", table: "Paywall")
            : String(localized: "chat.error.generic", table: "Chat"),
            isPresented: $showError)
        {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {
                isLimitReached = false
            }
        } message: {
            if isLimitReached {
                Text(errorMessage)
            }
        }
    }

    var isWaitingForResponse: Bool {
        guard isStreaming else { return false }
        if isToolRunning { return true }
        guard let last = messages.last, last.role == .assistant else { return true }
        return last.content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
}
