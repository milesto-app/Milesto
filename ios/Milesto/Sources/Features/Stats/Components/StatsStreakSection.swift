import SwiftUI

struct StatsStreakSection: View {
    let current: Int
    let best: Int

    var body: some View {
        HStack(spacing: 12) {
            tile(value: current, label: "stats.streak.current")
            tile(value: best, label: "stats.streak.best")
        }
    }

    private func tile(
        value: Int,
        label: LocalizedStringKey
    ) -> some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 10) {
            AppText(label, table: "Stats", style: .headline)

            AppText(verbatim: "\(value)", style: .title)
                .weight(.semibold)
                .color(Color("Brand"))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .background(Color("BackgroundSecondary"), in: shape)
    }
}
