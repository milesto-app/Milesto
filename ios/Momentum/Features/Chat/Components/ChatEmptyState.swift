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

    private let columns = [
        GridItem(.flexible(), spacing: 16),
        GridItem(.flexible(), spacing: 16)
    ]

    var body: some View {
        VStack(spacing: 40) {
            Spacer(minLength: 0)

            VStack(spacing: 16) {
                    ZStack {
                        Circle()
                            .fill(AppTheme.Colors.accent.opacity(0.1))
                            .frame(width: 80, height: 80)
                            .scaleEffect(appeared ? 1.1 : 0.9)
                            .animation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true), value: appeared)

                        Circle()
                            .fill(AppTheme.Colors.accent.opacity(0.2))
                            .frame(width: 60, height: 60)

                        TablerIcon(.messageChatbot, size: 32, color: AppTheme.Colors.accent)
                    }

                    VStack(spacing: 8) {
                        AppText("chat.empty", table: "Chat", style: .title)
                            .color(AppTheme.Colors.textPrimary)

                        AppText("chat.empty.subtitle", table: "Chat", style: .body)
                            .color(AppTheme.Colors.textSecondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                    }
                }

                // Suggestion Prompts Grid
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

                // Voice Chat Button
                if let onVoiceChatTap {
                    Button(action: onVoiceChatTap) {
                        HStack(spacing: 4) {
                            TablerIcon(.headset, size: 16, color: AppTheme.Colors.textSecondary)
                            AppText("chat.voice.start", table: "Chat", style: .caption)
                                .color(AppTheme.Colors.textSecondary)
                        }
                        .padding(.leading, 12)
                        .padding(.trailing, 16)
                        .padding(.vertical, 8)
                        .glassEffect(.regular.interactive(), in: .capsule)
                    }
                    .opacity(appeared ? 1 : 0)
                    .offset(y: appeared ? 0 : 20)
                    .animation(.easeOut(duration: 0.5).delay(Double(prompts.count) * 0.1 + 0.1), value: appeared)
                }

                Spacer(minLength: 0)
                Spacer(minLength: 0)
            }
            .onAppear {
                appeared = true
            }
        }
    }

