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
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                AppText("home.streak.title", table: "Home", style: .headline)
                Spacer()
                HStack(spacing: 4) {
                    TablerIcon(.flame, size: 16, color: AppTheme.Colors.accent)
                    AppText(verbatim: "\(streak.currentStreak)", style: .headline)
                        .weight(.regular)
                        .color(AppTheme.Colors.accent)
                }
            }

            HStack(spacing: 8) {
                ForEach(Array(zip(StreakPreviewData.weekdayLabels.indices, StreakPreviewData.weekdayLabels)), id: \.0) { index, label in
                    let isActive = streak.weekActivity[index]
                    let isToday = index == streak.weekActivity.count - 1

                    VStack(spacing: 4) {
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

            HStack(spacing: 24) {
                HStack(spacing: 4) {
                    Circle()
                        .fill(AppTheme.Colors.accent.opacity(0.15))
                        .frame(width: 8, height: 8)
                    AppText("home.streak.completed", table: "Home", style: .caption)
                        .color(AppTheme.Colors.textSecondary)
                }
                HStack(spacing: 4) {
                    Circle()
                        .fill(AppTheme.Colors.textSecondary.opacity(0.1))
                        .frame(width: 8, height: 8)
                    AppText("home.streak.missed", table: "Home", style: .caption)
                        .color(AppTheme.Colors.textSecondary)
                }
            }
        }
        .padding(.horizontal, 24)
    }
}

#Preview {
    StreakCounterView(streak: StreakPreviewData.streak)
}
