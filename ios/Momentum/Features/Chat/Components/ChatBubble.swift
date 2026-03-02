import SwiftUI

struct ChatBubble: View {
    let message: ChatMessage

    private var isUser: Bool {
        message.role == .user
    }

    var body: some View {
        HStack {
            if isUser { Spacer() }

            AppText(verbatim: message.content, style: .body)
                .color(isUser ? AppTheme.Colors.textOnAccent : AppTheme.Colors.textPrimary)
                .padding(AppTheme.Spacing.sm)
                .background(
                    RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg)
                        .fill(isUser ? AppTheme.Colors.accent : AppTheme.Colors.fieldBackground)
                )

            if !isUser { Spacer() }
        }
        .padding(.horizontal, AppTheme.Spacing.md)
    }
}
