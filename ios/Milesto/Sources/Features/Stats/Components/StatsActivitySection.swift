import SwiftUI

struct StatsActivitySection: View {
    let days: [DayActivityDTO]

    @State private var selectedDate: String?
    @State private var hasAnimated = false

    private static let dayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter
    }()

    private static let shortDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter
    }()

    private static let longDayFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE d MMM"
        return formatter
    }()

    private let barHeight: CGFloat = 130

    private var weekTotalCompleted: Int {
        days.reduce(0) { $0 + $1.objectivesCompleted }
    }

    private var focusedDay: DayActivityDTO? {
        if let selectedDate {
            return days.first { $0.date == selectedDate }
        }
        return days.last
    }

    private var isSelectionActive: Bool {
        selectedDate != nil
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 18) {
            header

            chart
        }
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color("BackgroundSecondary"), in: shape)
        .onAppear {
            hasAnimated = true
        }
        .onChange(of: selectedDate) { _, newValue in
            if newValue != nil {
                Haptics.selection()
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                AppText("stats.activity.title", table: "Stats", style: .headline)

                Spacer()

                AppText("\(weekTotalCompleted) tasks done", table: "Stats", style: .subheadline)
                    .color(Color("TextSecondary"))
            }

            detailRow
        }
    }

    @ViewBuilder
    private var detailRow: some View {
        if let day = focusedDay {
            HStack(spacing: 8) {
                AppText(verbatim: longDayName(from: day.date), style: .subheadline)
                    .color(isSelectionActive ? Color("TextPrimary") : Color("TextSecondary"))
                    .weight(isSelectionActive ? .medium : .regular)

                Spacer(minLength: 0)

                AppText("\(day.objectivesCompleted) tasks done", table: "Stats", style: .subheadline)
                    .weight(.semibold)
                    .color(Color("Brand"))
            }
            .animation(.easeInOut(duration: 0.18), value: focusedDay?.date)
        }
    }

    private var chart: some View {
        HStack(alignment: .bottom, spacing: 10) {
            ForEach(Array(days.enumerated()), id: \.element.date) { index, day in
                dayBar(day: day, index: index)
            }
        }
    }

    private func dayBar(day: DayActivityDTO, index: Int) -> some View {
        let ratio = day.objectivesTotal > 0
            ? Double(day.objectivesCompleted) / Double(day.objectivesTotal)
            : 0
        let isFocused = focusedDay?.date == day.date
        let dimmed = isSelectionActive && selectedDate != day.date

        return VStack(spacing: 10) {
            ZStack(alignment: .bottom) {
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(trackFill(dimmed: dimmed))
                    .frame(height: barHeight)

                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(barFill(dimmed: dimmed))
                    .frame(height: hasAnimated ? barHeight * ratio : 0)
                    .animation(
                        .spring(duration: 0.6, bounce: 0.2).delay(Double(index) * 0.04),
                        value: hasAnimated
                    )
            }
            .frame(maxWidth: .infinity)
            .contentShape(Rectangle())
            .onTapGesture {
                withAnimation(.easeInOut(duration: 0.18)) {
                    selectedDate = selectedDate == day.date ? nil : day.date
                }
            }

            AppText(verbatim: shortDayName(from: day.date), style: .caption)
                .color(isFocused ? Color("Brand") : Color("TextSecondary"))
                .weight(isFocused ? .semibold : .regular)
        }
    }

    private func trackFill(dimmed: Bool) -> Color {
        dimmed
            ? Color("BackgroundTertiary").opacity(0.5)
            : Color("BackgroundTertiary")
    }

    private func barFill(dimmed: Bool) -> Color {
        dimmed ? Color("Brand").opacity(0.3) : Color("Brand")
    }

    private func shortDayName(from dateString: String) -> String {
        guard let date = Self.dayFormatter.date(from: dateString) else { return "" }
        return Self.shortDayFormatter.string(from: date).uppercased()
    }

    private func longDayName(from dateString: String) -> String {
        guard let date = Self.dayFormatter.date(from: dateString) else { return "" }
        return Self.longDayFormatter.string(from: date).capitalized
    }
}
