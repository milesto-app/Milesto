import SwiftUI

struct StatsActivitySection: View {
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

    private let barHeight: CGFloat = 120

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 10) {
                TablerIcons(.chartBar, size: 18, color: Color("Brand"))

                AppText("stats.activity.title", table: "Stats", style: .headline)
            }

            HStack(alignment: .bottom, spacing: 10) {
                ForEach(Array(days.enumerated()), id: \.offset) { index, day in
                    dayBar(day: day, index: index, isToday: index == days.count - 1)
                }
            }
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color("BackgroundSecondary"), in: shape)
        .onAppear {
            isAnimated = true
        }
    }

    private func dayBar(day: DayActivityDTO, index: Int, isToday: Bool) -> some View {
        let ratio = day.objectivesTotal > 0
            ? Double(day.objectivesCompleted) / Double(day.objectivesTotal)
            : 0

        return VStack(spacing: 10) {
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(Color("TextSecondary").opacity(0.08))
                    .frame(height: barHeight)

                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(
                        LinearGradient(
                            colors: [Color("Brand"), Color("Brand").opacity(0.65)],
                            startPoint: .top,
                            endPoint: .bottom
                        )
                    )
                    .frame(height: isAnimated ? barHeight * ratio : 0)
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
