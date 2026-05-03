import SwiftUI

struct StatsEmptyState: View {
    var body: some View {
        VStack(spacing: 24) {
            TablerIcons(.chartBar, size: 48, color: Color("TextSecondary"))

            AppText("stats.empty.title", table: "Stats", style: .title)
                .alignment(.center)

            AppText("stats.empty.message", table: "Stats", style: .body)
                .color(Color("TextSecondary"))
                .alignment(.center)
        }
        .padding(32)
    }
}
