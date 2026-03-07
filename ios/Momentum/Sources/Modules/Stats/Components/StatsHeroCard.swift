import SwiftUI

struct StatsHeroCard: View {
    let completedCount: Int
    let totalCount: Int
    let rate: Double

    @State private var animatedRate: Double = 0

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                TablerIcons(.chartBar, size: 22, color: .white.opacity(0.9))
                    .padding(10)
                    .background(.white.opacity(0.15), in: RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 2) {
                    AppText("stats.hero.overallProgress", table: "Stats", style: .headline)
                        .color(.white)
                    AppText(verbatim: "\(completedCount)/\(totalCount)", style: .caption)
                        .color(.white.opacity(0.7))
                }

                Spacer()

                AppText(verbatim: "\(Int(animatedRate * 100))%", style: .title)
                    .weight(.bold)
                    .color(.white)
            }

            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(.white.opacity(0.2))

                    Capsule()
                        .fill(.white.opacity(0.9))
                        .frame(width: geometry.size.width * animatedRate)
                }
            }
            .frame(height: 10)
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Colors.accent, Colors.accent.opacity(0.8)],
                startPoint: .leading,
                endPoint: .trailing
            ),
            in: RoundedRectangle(cornerRadius: 20)
        )
        .onAppear {
            withAnimation(.spring(duration: 1.0, bounce: 0.15)) {
                animatedRate = rate
            }
        }
    }
}

#Preview {
    ZStack {
        AnimatedBackground()
        StatsHeroCard(completedCount: 86, totalCount: 120, rate: 0.72)
            .padding(16)
    }
}
