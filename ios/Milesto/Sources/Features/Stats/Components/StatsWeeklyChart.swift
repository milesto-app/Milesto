import SwiftUI

struct StatsWeeklyChart: View {
    let days: [DayActivityDTO]
    @State private var isAnimated = false

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let dayNameFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter
    }()

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .bottom, spacing: 12) {
                ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                    let ratio = day.objectivesTotal > 0
                        ? Double(day.objectivesCompleted) / Double(day.objectivesTotal)
                        : 0
                    let hasActivity = day.objectivesCompleted > 0 || day.objectivesTotal > 0
                    let barColor = colorForRatio(ratio, hasActivity: hasActivity)
                    let isToday = index == days.count - 1

                    VStack(spacing: 8) {
                        ZStack(alignment: .bottom) {
                            RoundedRectangle(cornerRadius: 6)
                                .fill(Color("TextSecondary").opacity(0.12))
                                .frame(height: 100)

                            RoundedRectangle(cornerRadius: 6)
                                .fill(barColor)
                                .frame(height: isAnimated ? max(4, 100 * ratio) : 4)
                                .animation(
                                    .spring(duration: 0.6, bounce: 0.2).delay(Double(index) * 0.06),
                                    value: isAnimated
                                )
                        }
                        .frame(maxWidth: .infinity)

                        VStack(spacing: 2) {
                            AppText(verbatim: dayNumber(from: day.date), style: .subheadline)
                                .weight(.semibold)
                                .color(isToday ? Color("Brand") : Color("TextPrimary"))

                            AppText(verbatim: dayName(from: day.date), style: .caption)
                                .color(Color("TextSecondary"))
                        }
                    }
                }
            }
        }
        .padding(20)
        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 20))
        .onAppear {
            isAnimated = true
        }
    }

    private func colorForRatio(_ ratio: Double, hasActivity: Bool) -> Color {
        if !hasActivity && ratio == 0 {
            return Color("TextSecondary").opacity(0.3)
        }
        if ratio >= 0.7 { return Color("Brand") }
        if ratio >= 0.3 { return Color("Warning") }
        return Color("Error").opacity(0.7)
    }

    private func dayNumber(from dateString: String) -> String {
        guard let date = Self.dayFormatter.date(from: dateString) else { return "" }
        return "\(Calendar.current.component(.day, from: date))"
    }

    private func dayName(from dateString: String) -> String {
        guard let date = Self.dayFormatter.date(from: dateString) else { return "" }
        return Self.dayNameFormatter.string(from: date).uppercased()
    }
}

#Preview {
    StatsWeeklyChart(days: StatsPreviewData.stats.streak.last7Days)
        .padding(16)
}
