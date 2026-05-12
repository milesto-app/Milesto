import SwiftUI

struct StatsMilestonesSection: View {
    let completed: Int
    let total: Int

    @State private var isAnimated = false

    private var rate: Double {
        total > 0 ? Double(completed) / Double(total) : 0
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                TablerIcons(.flag, size: 18, color: Color("Brand"))

                AppText("stats.milestones.title", table: "Stats", style: .headline)

                Spacer()

                AppText(verbatim: "\(completed)/\(total)", style: .subheadline)
                    .color(Color("TextSecondary"))
            }

            StatsProgressBar(progress: isAnimated ? rate : 0)
                .animation(.spring(duration: 0.8, bounce: 0.15), value: isAnimated)
        }
        .padding(20)
        .background(Color("BackgroundSecondary"), in: shape)
        .onAppear {
            isAnimated = true
        }
    }
}
