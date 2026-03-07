import SwiftUI

struct StatsProgressRing: View {
    let rate: Double
    let completed: Int
    let total: Int

    @State private var animatedRate: Double = 0

    private let lineWidth: CGFloat = 14

    var body: some View {
        HStack(spacing: 24) {
            ZStack {
                Circle()
                    .stroke(Colors.textSecondary.opacity(0.12), lineWidth: lineWidth)

                Circle()
                    .trim(from: 0, to: animatedRate)
                    .stroke(Colors.accent, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))

                AppText(verbatim: "\(Int(animatedRate * 100))%", style: .title)
                    .weight(.bold)
            }
            .frame(width: 110, height: 110)

            VStack(alignment: .leading, spacing: 12) {
                AppText("stats.weeklyChart.title", table: "Stats", style: .headline)

                VStack(alignment: .leading, spacing: 8) {
                    legendRow(
                        color: Colors.accent,
                        label: "stats.ring.completed",
                        count: completed
                    )
                    legendRow(
                        color: Colors.textSecondary.opacity(0.3),
                        label: "stats.ring.remaining",
                        count: max(0, total - completed)
                    )
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(20)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .onAppear {
            withAnimation(.spring(duration: 1.0, bounce: 0.15)) {
                animatedRate = rate
            }
        }
    }

    private func legendRow(color: Color, label: LocalizedStringKey, count: Int) -> some View {
        HStack(spacing: 8) {
            Capsule()
                .fill(color)
                .frame(width: 12, height: 6)

            AppText(label, table: "Stats", style: .subheadline)
                .color(color == Colors.accent ? Colors.accent : Colors.textSecondary)

            Spacer()

            AppText(verbatim: "\(count)", style: .subheadline)
                .weight(.semibold)
                .color(Colors.textSecondary)
        }
    }
}

#Preview {
    StatsProgressRing(rate: 0.85, completed: 17, total: 20)
        .padding(16)
}
