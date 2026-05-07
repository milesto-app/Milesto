import SwiftUI

struct ChatHistoryRow: View {
    let conversation: ChatConversationDTO
    let isActive: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            AppText(
                verbatim: conversation.preview ?? String(localized: "chat.history.empty", table: "Chat"),
                style: .body
            )
            .lineLimit(2)

            AppText(verbatim: Self.relativeDate(conversation.updatedAt), style: .caption)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(
            isActive
                ? Color("TextPrimary").opacity(0.08)
                : Color.clear
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal, 8)
    }

    private static func relativeDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
