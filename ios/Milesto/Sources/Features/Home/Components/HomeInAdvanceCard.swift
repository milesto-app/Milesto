import SwiftUI

struct HomeInAdvanceCard: View {
    let nextWeekStartsAt: Date?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TablerIcons(.confetti, size: 28, color: Color("Brand"))

            AppText("home.inAdvance.title", table: "Home", style: .headline)

            if let countdown = countdownText {
                AppText(verbatim: countdown, style: .subheadline)
                    .color(Color("TextSecondary"))
            } else {
                AppText("home.inAdvance.subtitle", table: "Home", style: .subheadline)
                    .color(Color("TextSecondary"))
            }
        }
        .padding(24)
        .glassEffect(.regular, in: RoundedRectangle(cornerRadius: 24))
        .padding(.horizontal, 16)
    }

    private var countdownText: String? {
        guard let nextWeekStartsAt else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        let formatted = formatter.string(from: nextWeekStartsAt)
        return String(
            format: String(localized: "home.inAdvance.subtitle.countdown", table: "Home"),
            formatted
        )
    }
}
