import SwiftUI

struct StatsEmptyState: View {
    var body: some View {
        VStack(spacing: 24) {
            TablerIcons(.chartBar, size: 48, color: Colors.textSecondary)

            AppText("stats.empty.title", table: "Stats", style: .title)
                .alignment(.center)

            AppText("stats.empty.message", table: "Stats", style: .body)
                .color(Colors.textSecondary)
                .alignment(.center)
        }
        .padding(32)
    }
}

#Preview {
    StatsEmptyState()
}
