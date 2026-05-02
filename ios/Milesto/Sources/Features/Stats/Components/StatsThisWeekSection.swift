import SwiftUI

struct StatsThisWeekSection: View {
    let completed: Int
    let total: Int
    let rate: Double

    @State private var animatedRate: Double = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                AppText("stats.thisWeek.title", table: "Stats", style: .headline)
                Spacer()
                AppText(
                    verbatim: "\(completed)/\(total) · \(Int(animatedRate * 100))%",
                    style: .subheadline
                )
                .color(Color("TextSecondary"))
            }

            StatsProgressBar(progress: animatedRate)
        }
        .onAppear {
            withAnimation(.spring(duration: 1.0, bounce: 0.15)) {
                animatedRate = rate
            }
        }
    }
}
