import SwiftUI

struct ChatBubble: View {
    let message: ChatMessage

    private var isUser: Bool {
        message.role == .user
    }

    var body: some View {
        HStack {
            if isUser { Spacer() }

            Group {
                if isUser {
                    AppText(verbatim: message.content, style: .body)
                        .color(AppTheme.Colors.textOnAccent)
                } else {
                    MarkdownText(content: message.content)
                }
            }
            .padding(AppTheme.Spacing.sm)
            .background(
                RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg)
                    .fill(isUser ? AppTheme.Colors.accent : AppTheme.Colors.fieldBackground)
            )
            .containerRelativeFrame(.horizontal) { width, _ in
                width * 0.85
            }

            if !isUser { Spacer() }
        }
        .padding(.horizontal, AppTheme.Spacing.md)
    }
}
