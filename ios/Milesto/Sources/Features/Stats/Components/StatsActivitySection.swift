import SwiftUI

struct StatsActivitySection: View {
    let days: [DayActivitySnapshot]

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
        VStack(alignment: .leading, spacing: 16) {
            AppText("stats.activity.title", table: "Stats", style: .headline)

            HStack(alignment: .bottom, spacing: 10) {
                ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                    dayBar(day: day, index: index, isToday: index == days.count - 1)
                }
            }
        }
        .onAppear {
            isAnimated = true
        }
    }

    private func dayBar(day: DayActivitySnapshot, index: Int, isToday: Bool) -> some View {
        let ratio = day.objectivesTotal > 0
            ? Double(day.objectivesCompleted) / Double(day.objectivesTotal)
            : 0

        return VStack(spacing: 8) {
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 6)
                    .fill(Color("TextSecondary").opacity(0.1))
                    .frame(height: 96)

                RoundedRectangle(cornerRadius: 6)
                    .fill(Color("Brand"))
                    .frame(height: isAnimated ? 96 * ratio : 0)
                    .animation(
                        .spring(duration: 0.6, bounce: 0.2).delay(Double(index) * 0.06),
                        value: isAnimated
                    )
            }
            .frame(maxWidth: .infinity)

            AppText(verbatim: dayName(from: day.date), style: .caption)
                .color(isToday ? Color("Brand") : Color("TextSecondary"))
                .weight(isToday ? .semibold : .regular)
        }
    }

    private func dayName(from dateString: String) -> String {
        guard let date = Self.dayFormatter.date(from: dateString) else { return "" }
        return Self.dayNameFormatter.string(from: date).uppercased()
    }
}
