import SwiftUI

struct ChatBubble: View {
    let message: ChatMessageDTO
    var isStreamingResponse = false

    @State private var appeared = false

    var body: some View {
        let content = message.content ?? ""
        HStack {
            if message.isUser { Spacer(minLength: 0) }

            if message.isUser {
                AppText(verbatim: content, style: .body)
                    .color(Color("TextOnBrand"))
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 16)
                            .fill(Color("BrandDeep"))
                    )
            } else {
                ChatStreamingText(content: content, isStreaming: isStreamingResponse)
            }

            if !message.isUser { Spacer(minLength: 0) }
        }
        .padding(.horizontal, 16)
        .padding(message.isUser ? .leading : .trailing, 40)
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 12)
        .onAppear {
            withAnimation(.easeOut(duration: 0.3)) {
                appeared = true
            }
        }
    }
}
