import SwiftUI

struct ChatEmptyState: View {
    var onSelectPrompt: (String) -> Void

    @State private var appeared = false

    private let prompts: [(icon: TablerIconOutline, key: String)] = [
        (.targetArrow, "chat.prompt.progress"),
        (.bulb, "chat.prompt.motivation"),
        (.calendarEvent, "chat.prompt.today"),
        (.trendingUp, "chat.prompt.improve"),
    ]

    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(Array(prompts.enumerated()), id: \.offset) { index, prompt in
                Button {
                    onSelectPrompt(String(localized: String.LocalizationValue(prompt.key), table: "Chat"))
                } label: {
                    VStack(alignment: .leading, spacing: 12) {
                        TablerIcon(prompt.icon, size: 24, color: AppTheme.Colors.accent)
                            .frame(width: 40, height: 40)
                            .background(AppTheme.Colors.accent.opacity(0.1), in: .circle)

                        AppText(LocalizedStringKey(prompt.key), table: "Chat", style: .subheadline)
                            .color(AppTheme.Colors.textPrimary)
                            .multilineTextAlignment(.leading)
                            .lineLimit(2)

                        Spacer(minLength: 0)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(16)
                    .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: AppTheme.CornerRadius.lg))
                }
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 20)
                .animation(.easeOut(duration: 0.5).delay(Double(index) * 0.1), value: appeared)
            }
        }
        .padding(.horizontal, 16)
        .onAppear {
            appeared = true
        }
    }
}
