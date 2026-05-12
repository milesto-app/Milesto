import SwiftUI

struct StatsMilestonesSection: View {
    let completed: Int
    let total: Int

    @State private var animatedCompleted: Int = 0

    private var remaining: Int {
        max(total - completed, 0)
    }

    var body: some View {
        let shape = RoundedRectangle(cornerRadius: 20, style: .continuous)

        return VStack(alignment: .leading, spacing: 16) {
            header

            segments
                .frame(height: 14)

            footer
        }
        .padding(20)
        .background(Color("BackgroundSecondary"), in: shape)
        .onAppear {
            withAnimation(.spring(duration: 0.9, bounce: 0.15)) {
                animatedCompleted = completed
            }
        }
    }

    private var header: some View {
        HStack(spacing: 10) {
            AppText("stats.milestones.title", table: "Stats", style: .headline)

            Spacer()

            AppText(verbatim: "\(completed)/\(total)", style: .subheadline)
                .color(Color("TextSecondary"))
        }
    }

    private var segmentGap: CGFloat {
        switch total {
        case ...8: return 6
        case ...16: return 5
        case ...28: return 4
        case ...44: return 3
        default: return 2
        }
    }

    private var segments: some View {
        GeometryReader { proxy in
            let count = max(total, 1)
            let totalGap = segmentGap * CGFloat(max(count - 1, 0))
            let available = max(proxy.size.width - totalGap, 0)
            let segmentWidth = max(available / CGFloat(count), 1)

            HStack(spacing: segmentGap) {
                ForEach(0 ..< count, id: \.self) { index in
                    Capsule(style: .continuous)
                        .fill(fill(for: index))
                        .frame(width: segmentWidth)
                }
            }
        }
    }

    private func fill(for index: Int) -> Color {
        index < animatedCompleted
            ? Color("Brand")
            : Color("TextSecondary").opacity(0.12)
    }

    private var footer: some View {
        AppText(
            verbatim: String(
                format: String(localized: "stats.milestones.remaining", table: "Stats"),
                remaining
            ),
            style: .caption
        )
        .color(Color("TextSecondary"))
    }
}
