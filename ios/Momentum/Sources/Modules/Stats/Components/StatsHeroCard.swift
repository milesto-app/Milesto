import SwiftUI

struct StatsHeroCard: View {
    let completedCount: Int
    let totalCount: Int
    let rate: Double

    @State private var animatedRate: Double = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    AppText("stats.hero.overallProgress", table: "Stats", style: .headline)
                    AppText(verbatim: "\(completedCount)/\(totalCount)", style: .caption)
                        .color(Colors.textSecondary)
                }

                Spacer()

                AppText(verbatim: "\(Int(animatedRate * 100))%", style: .title)
                    .weight(.bold)
                    .color(Colors.accent)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(Colors.textSecondary.opacity(0.12))

                    Capsule()
                        .fill(Colors.accent)
                        .frame(width: geometry.size.width * animatedRate)
                }
            }
            .frame(height: 10)
        }
        .padding(.horizontal, 4)
        .onAppear {
            withAnimation(.spring(duration: 1.0, bounce: 0.15)) {
                animatedRate = rate
            }
        }
    }
}

#Preview {
    StatsHeroCard(completedCount: 86, totalCount: 120, rate: 0.72)
        .padding(16)
}
