import SwiftUI

struct ChatMessageList: View {
    let messages: [ChatMessage]
    let isStreaming: Bool
    let isWaitingForResponse: Bool
    let showThinking: Bool

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
            .contentMargins(.bottom, 140)
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
    }
}
