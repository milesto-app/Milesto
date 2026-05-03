import SwiftUI

struct StatsMilestonesSection: View {
    let completed: Int
    let total: Int

    @State private var isAnimated = false

    private var rate: Double {
        total > 0 ? Double(completed) / Double(total) : 0
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                AppText("stats.milestones.title", table: "Stats", style: .headline)
                Spacer()
                AppText(
                    verbatim: "\(completed)/\(total) · \(Int(rate * 100))%",
                    style: .subheadline
                )
                .color(Color("TextSecondary"))
            }

            StatsProgressBar(progress: isAnimated ? rate : 0)
                .animation(.spring(duration: 0.8, bounce: 0.15), value: isAnimated)
        }
        .onAppear {
            isAnimated = true
        }
    }
}
