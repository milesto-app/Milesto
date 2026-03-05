import SwiftUI

struct DebriefPromptCard: View {
    let onTap: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            TablerIcon(.moonStars, size: 28, color: Colors.accent)

            AppText("home.debrief.prompt.title", table: "Home", style: .headline)

            AppText("home.debrief.prompt.subtitle", table: "Home", style: .subheadline)
                .color(Colors.textSecondary)

            AppButton("home.debrief.prompt.action", table: "Home", style: .secondary, action: onTap)
                .fullWidth()
        }
        .padding(24)
        .glassEffect(.clear.interactive(), in: RoundedRectangle(cornerRadius: 24))
    }
}
