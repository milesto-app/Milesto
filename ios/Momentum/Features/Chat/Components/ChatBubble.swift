import SwiftUI

struct ChatBubble: View {
    let message: ChatMessage

    private var isUser: Bool {
        message.role == .user
    }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 0) }

            if isUser {
                AppText(verbatim: message.content, style: .body)
                    .color(AppTheme.Colors.textOnAccent)
                    .padding(AppTheme.Spacing.sm)
                    .background(
                        RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg)
                            .fill(AppTheme.Colors.accent)
                    )
            } else {
                MarkdownText(content: message.content)
            }

            if !isUser { Spacer(minLength: 0) }
        }
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(isUser ? .leading : .trailing, AppTheme.Spacing.xxl)
    }
}
