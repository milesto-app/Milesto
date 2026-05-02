import SwiftUI

struct StatsHeroSection: View {
    let completed: Int
    let total: Int
    let rate: Double

    @State private var animatedRate: Double = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            AppText("stats.hero.overallProgress", table: "Stats", style: .headline)

            HStack(alignment: .lastTextBaseline, spacing: 0) {
                AppText(verbatim: "\(Int(animatedRate * 100))%", style: .title)
                    .weight(.semibold)
                    .color(Color("Brand"))

                Spacer()

                AppText(verbatim: "\(completed)/\(total)", style: .subheadline)
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
