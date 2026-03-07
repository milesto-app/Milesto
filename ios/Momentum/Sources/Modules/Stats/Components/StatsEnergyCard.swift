import SwiftUI

struct StatsEnergyCard: View {
    let distribution: EnergyDistributionDTO

    private var total: Int {
        distribution.high + distribution.good + distribution.low + distribution.veryLow
    }

    private var segments: [(label: LocalizedStringKey, count: Int, color: Color)] {
        [
            ("stats.energy.high", distribution.high, Colors.accent),
            ("stats.energy.good", distribution.good, Colors.warning),
            ("stats.energy.low", distribution.low, Colors.error.opacity(0.7)),
            ("stats.energy.veryLow", distribution.veryLow, Colors.error.opacity(0.4)),
        ]
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                TablerIcons(.bolt, size: 20, color: Colors.accent)
                AppText("stats.energy.title", table: "Stats", style: .headline)
            }

            GeometryReader { geometry in
                HStack(spacing: 2) {
                    ForEach(segments.indices, id: \.self) { index in
                        let segment = segments[index]
                        let fraction = total > 0 ? CGFloat(segment.count) / CGFloat(total) : 0
                        if fraction > 0 {
                            RoundedRectangle(cornerRadius: 4)
                                .fill(segment.color)
                                .frame(width: max(4, geometry.size.width * fraction - 2))
                        }
                    }
                }
                .clipShape(Capsule())
            }
            .frame(height: 12)

            HStack(spacing: 16) {
                ForEach(segments.indices, id: \.self) { index in
                    let segment = segments[index]
                    if segment.count > 0 {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(segment.color)
                                .frame(width: 6, height: 6)
                            AppText(verbatim: "\(segment.count)", style: .caption)
                                .color(Colors.textSecondary)
                        }
                    }
                }
            }
        }
        .padding(20)
        .glassEffect(.clear.interactive(), in: RoundedRectangle(cornerRadius: 20))
    }
}

#Preview {
    ZStack {
        AnimatedBackground()
        StatsEnergyCard(distribution: StatsPreviewData.stats.energy.distribution)
            .padding(16)
    }
}
