import SwiftUI

struct MockStreak {
    let currentStreak: Int
    let bestStreak: Int
    let weekActivity: [Bool]
}

enum StreakPreviewData {
    static let streak = MockStreak(
        currentStreak: 12,
        bestStreak: 21,
        weekActivity: [true, true, true, true, true, false, true]
    )

    static let weekdayLabels = ["L", "M", "M", "J", "V", "S", "D"]
}

struct StreakCounterView: View {
    let streak: MockStreak

    var body: some View {
        VStack(alignment: .leading, spacing: AppTheme.Spacing.md) {
            HStack {
                AppText("home.streak.title", table: "Home", style: .headline)
                Spacer()
                HStack(spacing: AppTheme.Spacing.xxs) {
                    TablerIcon(.flame, size: 16, color: AppTheme.Colors.accent)
                    AppText(verbatim: "\(streak.currentStreak)", style: .headline)
                        .weight(.regular)
                        .color(AppTheme.Colors.accent)
                }
            }

            HStack(spacing: AppTheme.Spacing.xs) {
                ForEach(Array(zip(StreakPreviewData.weekdayLabels.indices, StreakPreviewData.weekdayLabels)), id: \.0) { index, label in
                    let isActive = streak.weekActivity[index]
                    let isToday = index == streak.weekActivity.count - 1

                    VStack(spacing: AppTheme.Spacing.xxs) {
                        AppText(verbatim: label, style: .caption)
                            .color(AppTheme.Colors.textSecondary)

                        ZStack {
                            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                                .fill(isActive ? AppTheme.Colors.accent.opacity(0.15) : AppTheme.Colors.textSecondary.opacity(0.1))
                                .frame(height: 40)

                            if isActive {
                                TablerIcon(.check, size: 16, color: AppTheme.Colors.accent)
                            }
                        }
                        .overlay(
                            RoundedRectangle(cornerRadius: AppTheme.CornerRadius.sm)
                                .strokeBorder(
                                    isToday ? AppTheme.Colors.accent : Color.clear,
                                    lineWidth: 1.5
                                )
                        )
                    }
                    .frame(maxWidth: .infinity)
                }
            }

            HStack(spacing: AppTheme.Spacing.lg) {
                HStack(spacing: AppTheme.Spacing.xxs) {
                    Circle()
                        .fill(AppTheme.Colors.accent.opacity(0.15))
                        .frame(width: 8, height: 8)
                    AppText("home.streak.completed", table: "Home", style: .caption)
                        .color(AppTheme.Colors.textSecondary)
                }
                HStack(spacing: AppTheme.Spacing.xxs) {
                    Circle()
                        .fill(AppTheme.Colors.textSecondary.opacity(0.1))
                        .frame(width: 8, height: 8)
                    AppText("home.streak.missed", table: "Home", style: .caption)
                        .color(AppTheme.Colors.textSecondary)
                }
            }
        }
        .padding(.horizontal, AppTheme.Spacing.lg)
    }
}

#Preview {
    StreakCounterView(streak: StreakPreviewData.streak)
}
