import SwiftUI

struct ChatHistoryRow: View {
    let conversation: ConversationSummary
    let isActive: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.xxs) {
            AppText(
                verbatim: conversation.preview ?? String(localized: "chat.history.empty", table: "Chat"),
                style: .body
            )
            .lineLimit(2)

            AppText(verbatim: conversation.relativeDate, style: .caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, AppTheme.Spacing.md)
        .padding(.vertical, AppTheme.Spacing.sm)
        .background(
            isActive
                ? AppTheme.Colors.textPrimary.opacity(0.08)
                : Color.clear
        )
        .clipShape(RoundedRectangle(cornerRadius: AppTheme.CornerRadius.md))
        .padding(.horizontal, AppTheme.Spacing.xs)
    }
}
