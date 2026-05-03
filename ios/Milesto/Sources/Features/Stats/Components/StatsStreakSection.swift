import SwiftUI

struct StatsStreakSection: View {
    let current: Int
    let best: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            AppText("stats.streak.title", table: "Stats", style: .headline)

            HStack(spacing: 16) {
                streakItem(icon: .flame, value: current, label: "stats.streak.current")
                    .frame(maxWidth: .infinity, alignment: .leading)
                streakItem(icon: .trophy, value: best, label: "stats.streak.best")
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    private func streakItem(
        icon: TablerIconOutline,
        value: Int,
        label: LocalizedStringKey
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                TablerIcons(icon, size: 18, color: Color("Brand"))
                AppText(verbatim: "\(value)", style: .title)
                    .weight(.semibold)
            }

            AppText(label, table: "Stats", style: .caption)
                .color(Color("TextSecondary"))
        }
    }
}
