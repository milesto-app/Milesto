import SwiftUI

struct ChatBubble: View {
    let message: ChatMessage
    var isStreamingResponse = false

    @State private var appeared = false

    private var isUser: Bool {
        message.role == .user
    }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 0) }

            if isUser {
                AppText(verbatim: message.content, style: .body)
                    .color(Color("TextOnBrand"))
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color("BrandDeep"))
                    )
            } else {
                ChatStreamingText(content: message.content, isStreaming: isStreamingResponse)
            }

            if !isUser { Spacer(minLength: 0) }
        }
        .padding(.horizontal, 16)
        .padding(isUser ? .leading : .trailing, 40)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 12)
        .onAppear {
            withAnimation(.easeOut(duration: 0.3)) {
                appeared = true
            }
        }
    }
}
