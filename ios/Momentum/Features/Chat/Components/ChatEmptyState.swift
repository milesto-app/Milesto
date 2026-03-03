import SwiftUI

struct ChatEmptyState: View {
    var onSelectPrompt: (String) -> Void
    var onVoiceChatTap: (() -> Void)?

    @State private var appeared = false

    private var prompts: [(icon: TablerIconOutline, key: String)] {
        [
            (.targetArrow, "chat.prompt.progress"),
            (.bulb, "chat.prompt.motivation"),
            (.calendarEvent, "chat.prompt.today"),
            (.trendingUp, "chat.prompt.improve"),
        ]
    }

    var body: some View {
        VStack(spacing: AppTheme.Spacing.xl) {
            VStack(spacing: AppTheme.Spacing.sm) {
                TablerIcon(.messageChatbot, size: 40, color: AppTheme.Colors.textSecondary)
                    .opacity(0.6)

                AppText("chat.empty", table: "Chat", style: .headline)
                    .color(AppTheme.Colors.textPrimary)

                AppText("chat.empty.subtitle", table: "Chat", style: .subheadline)
                    .color(AppTheme.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            VStack(spacing: AppTheme.Spacing.sm) {
                ForEach(Array(prompts.enumerated()), id: \.offset) { index, prompt in
                    Button {
                        onSelectPrompt(String(localized: String.LocalizationValue(prompt.key), table: "Chat"))
                    } label: {
                        HStack(spacing: AppTheme.Spacing.sm) {
                            TablerIcon(prompt.icon, size: 20, color: AppTheme.Colors.accent)
                            AppText(LocalizedStringKey(prompt.key), table: "Chat", style: .subheadline)
                                .color(AppTheme.Colors.textPrimary)
                            Spacer()
                        }
                        .padding(.horizontal, AppTheme.Spacing.md)
                        .padding(.vertical, AppTheme.Spacing.sm)
                        .glassEffect(.regular.interactive(), in: .capsule)
                    }
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 12)
                    .animation(.easeOut(duration: 0.35).delay(Double(index) * 0.08), value: appeared)
                }
            }

            if let onVoiceChatTap {
                Button(action: onVoiceChatTap) {
                    HStack(spacing: AppTheme.Spacing.sm) {
                        TablerIcon(.headphones, size: 20, color: AppTheme.Colors.textOnAccent)
                        AppText("chat.voice.start", table: "Chat", style: .subheadline)
                            .color(AppTheme.Colors.textOnAccent)
                    }
                    .padding(.horizontal, AppTheme.Spacing.lg)
                    .padding(.vertical, AppTheme.Spacing.sm)
                    .background(AppTheme.Colors.accent, in: .capsule)
                }
                .opacity(appeared ? 1 : 0)
                .offset(y: appeared ? 0 : 12)
                .animation(.easeOut(duration: 0.35).delay(Double(prompts.count) * 0.08), value: appeared)
            }
        }
        .padding(.horizontal, AppTheme.Spacing.lg)
        .onAppear {
            withAnimation {
                appeared = true
            }
        }
    }
}
