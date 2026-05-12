import SwiftUI

struct StatsHeroSection: View {
    let completed: Int
    let total: Int

    @State private var animatedRate: Double = 0

    private var rate: Double {
        total > 0 ? Double(completed) / Double(total) : 0
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 24, style: .continuous)

        return HStack(alignment: .center, spacing: 20) {
            VStack(alignment: .leading, spacing: 6) {
                AppText("stats.hero.overallProgress", table: "Stats", style: .headline)

                AppText(verbatim: "\(completed)/\(total)", style: .subheadline)
                    .color(Color("TextSecondary"))
            }

            Spacer(minLength: 0)

            ring
        }
        .padding(22)
        .frame(maxWidth: .infinity)
        .background(Color("BackgroundSecondary"), in: shape)
        .onAppear {
            withAnimation(.spring(duration: 1.0, bounce: 0.15)) {
                animatedRate = rate
            }
        }
    }

    private var ring: some View {
        ZStack {
            Circle()
                .stroke(Color("TextSecondary").opacity(0.15), lineWidth: 9)
            Circle()
                .trim(from: 0, to: animatedRate)
                .stroke(Color("Brand"), style: StrokeStyle(lineWidth: 9, lineCap: .round))
                .rotationEffect(.degrees(-90))

            AppText(verbatim: "\(Int(animatedRate * 100))%", style: .title)
                .weight(.semibold)
                .color(Color("Brand"))
                .contentTransition(.numericText())
        }
        .frame(width: 104, height: 104)
    }
}
