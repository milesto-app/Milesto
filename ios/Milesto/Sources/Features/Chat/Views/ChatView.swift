import SwiftUI

struct ChatView: View {
    let goalId: String
    var onClose: (() -> Void)?

    @Environment(AppEnv.self) private var env
    @State private var model: ChatViewModel?
    @FocusState private var isInputFocused: Bool
    @State private var isSidebarOpen = false

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                Color("BackgroundPrimary").ignoresSafeArea()
            }
        }
        .task {
            if model == nil {
                let vm = ChatViewModel(env: env)
                vm.configure(goalId: goalId)
                model = vm
            }
            isInputFocused = true
        }
    }

    @ViewBuilder
    private func content(model: ChatViewModel) -> some View {
        @Bindable var bindable = model
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

                ChatInputBar(text: $bindable.inputText, isDisabled: model.isStreaming, isFocused: $isInputFocused) {
                    model.sendMessage()
                }
            }
        }
        .appBackground()
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
                onSelectConversation: { id in model.loadConversation(id) },
                onDeleteConversation: { id in model.deleteConversation(id) }
            )
            .ignoresSafeArea()
        }
        .onChange(of: isSidebarOpen) { _, isOpen in
            if isOpen {
                model.fetchConversations()
            }
        }
        .alert(chatErrorTitle(model: model), isPresented: $bindable.showError) {
            Button(String(localized: "common.ok", table: "Common"), role: .cancel) {
                model.isLimitReached = false
            }
        } message: {
            if model.isLimitReached {
                AppText(verbatim: model.errorMessage, style: .body)
            }
        }
    }

    private func chatErrorTitle(model: ChatViewModel) -> String {
        if model.isLimitReached {
            return String(localized: "usage.limit.reached.title", table: "Paywall")
        }
        return String(localized: "chat.error.generic", table: "Chat")
    }
}
