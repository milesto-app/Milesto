import Combine
import SwiftUI

struct StatsCountdownCard: View {
    let targetDate: Date

    @State private var now: Date = .init()

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    private var remaining: DateComponents {
        Calendar.current.dateComponents(
            [.day, .hour, .minute, .second],
            from: now,
            to: targetDate
        )
    }

    private var isOverdue: Bool {
        targetDate <= now
    }

    var body: some View {
        Group {
            if !isOverdue {
                HStack(spacing: 10) {
                    unitTile(value: max(remaining.day ?? 0, 0), label: "stats.countdown.days")
                    unitTile(value: max(remaining.hour ?? 0, 0), label: "stats.countdown.hours")
                    unitTile(value: max(remaining.minute ?? 0, 0), label: "stats.countdown.minutes")
                    unitTile(value: max(remaining.second ?? 0, 0), label: "stats.countdown.seconds")
                }
            }
        }
        .onReceive(timer) { tick in
            now = tick
        }
    }

    private func unitTile(value: Int, label: LocalizedStringKey) -> some View {
        let shape = RoundedRectangle(cornerRadius: 14, style: .continuous)

        return VStack(spacing: 4) {
            AppText(verbatim: String(format: "%02d", value), style: .title)
                .weight(.semibold)
                .color(Color("TextPrimary"))
                .monospacedDigit()
                .contentTransition(.numericText())

            AppText(label, table: "Stats", style: .caption)
                .color(Color("TextSecondary"))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .background(Color("BackgroundSecondary"), in: shape)
    }
}
