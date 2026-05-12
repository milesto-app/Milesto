import SwiftUI

struct StatsThisWeekSection: View {
    let completed: Int
    let total: Int

    @State private var animatedRate: Double = 0

    private var rate: Double {
        total > 0 ? Double(completed) / Double(total) : 0
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 10) {
                TablerIcons(.calendarWeek, size: 18, color: Color("Brand"))

                AppText("stats.thisWeek.title", table: "Stats", style: .headline)

                Spacer()

                AppText(verbatim: "\(completed)/\(total)", style: .subheadline)
                    .color(Color("TextSecondary"))
            }

            StatsProgressBar(progress: animatedRate)
        }
        .padding(20)
        .background(Color("BackgroundSecondary"), in: shape)
        .onAppear {
            withAnimation(.spring(duration: 1.0, bounce: 0.15)) {
                animatedRate = rate
            }
        }
    }
}
