import SwiftUI

struct WeeklyFocusData {
    let focus: String
    let weekNumber: Int
    let objectivesCount: Int
    let completedCount: Int
}

struct WeeklyFocusCard: View {
    let weeklyPlan: WeeklyFocusData
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 8) {
                    TablerIcons(.target, size: 20, color: Colors.accent)
                    AppText("home.weeklyFocus.title", table: "Home", style: .headline)
                }

                AppText(verbatim: weeklyPlan.focus, style: .body)
                    .lineLimit(2)

                HStack(spacing: 4) {
                    AppText(
                        verbatim: String(
                            format: String(localized: "home.weeklyFocus.week", table: "Home"),
                            weeklyPlan.weekNumber
                        ),
                        style: .caption
                    )
                    .color(Colors.textSecondary)

                    AppText(verbatim: "·", style: .caption)
                        .color(Colors.textSecondary)

                    AppText(
                        verbatim: String(
                            format: String(localized: "home.weeklyFocus.objectives", table: "Home"),
                            weeklyPlan.completedCount,
                            weeklyPlan.objectivesCount
                        ),
                        style: .caption
                    )
                    .color(Colors.textSecondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(24)
            .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 24))
        }
        .buttonStyle(.plain)
    }
}
