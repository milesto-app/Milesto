import SwiftUI

struct StatsStreakSection: View {
    let current: Int
    let best: Int

    var body: some View {
        HStack(spacing: 12) {
            tile(icon: .flame, value: current, label: "stats.streak.current")
            tile(icon: .trophy, value: best, label: "stats.streak.best")
        }
    }

    private func tile(
        icon: TablerIcon,
        value: Int,
        label: LocalizedStringKey
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color("Brand").opacity(0.12))
                    .frame(width: 36, height: 36)
                TablerIcons(icon, size: 18, color: Color("Brand"))
            }

            VStack(alignment: .leading, spacing: 2) {
                AppText(verbatim: "\(value)", style: .title)
                    .weight(.semibold)

                AppText(label, table: "Stats", style: .caption)
                    .color(Color("TextSecondary"))
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color("BackgroundSecondary"), in: shape)
    }
}
