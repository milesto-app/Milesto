import SwiftUI

struct RoadmapMilestoneRow: View {
    let milestone: DisplayMilestone
    let index: Int
    let total: Int
    let previousStatus: MilestoneStatus?
    let nextStatus: MilestoneStatus?

    var body: some View {
        let isFirst = index == 0
        let isLast = index == total - 1
        let verticalPad: CGFloat = 20

        HStack(alignment: .center, spacing: 14) {
            VStack(spacing: 0) {
                if isFirst {
                    Spacer().frame(height: 14)
                } else if let previousStatus {
                    Rectangle()
                        .fill(connectorColor(from: previousStatus, to: milestone.status))
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }

                Spacer().frame(height: 4)
                timelineDot
                Spacer().frame(height: 4)

                if isLast {
                    Spacer().frame(minHeight: 0)
                } else if let nextStatus {
                    Rectangle()
                        .fill(connectorColor(from: milestone.status, to: nextStatus))
                        .frame(width: 2)
                        .frame(maxHeight: .infinity)
                }
            }
            .frame(width: 32)

            VStack(alignment: .leading, spacing: 4) {
                AppText(
                    verbatim: milestone.title,
                    style: milestone.isKeyMilestone ? .headline : .body
                )
                .weight((milestone.isKeyMilestone || milestone.isMonthlyCheckpoint) ? .medium : .regular)
                .color(milestone.status == .upcoming ? Color("TextSecondary") : Color("TextPrimary"))
                .lineLimit(1)
            }
            .padding(.vertical, verticalPad)
            .frame(maxWidth: .infinity, alignment: .leading)

            VStack {
                Spacer()
                TablerIcons(.chevronRight, size: 16, color: Color("TextSecondary").opacity(0.3))
                Spacer()
            }
        }
    }

    private var timelineDot: some View {
        let isSpecial = milestone.isKeyMilestone || milestone.isMonthlyCheckpoint
        let size: CGFloat = isSpecial ? 28 : 16

        return ZStack {
            switch milestone.status {
            case .completed:
                Circle()
                    .fill(Color("AccentColor"))
                    .frame(width: size, height: size)
            case .current:
                Circle()
                    .stroke(Color("AccentColor"), lineWidth: 2)
                    .frame(width: size, height: size)
            case .upcoming:
                Circle()
                    .stroke(Color("BgSurface"), lineWidth: 2)
                    .frame(width: size, height: size)
            }

            dotIcon
        }
    }

    private var dotIcon: some View {
        let accentColor = Color("TextOnAccent")
        let mutedColor = Color("TextSecondary")

        return Group {
            if milestone.isKeyMilestone {
                TablerIcons(.trophy, size: 14, color: milestone.status == .upcoming ? mutedColor : accentColor)
            } else if milestone.isMonthlyCheckpoint {
                TablerIcons(.targetArrow, size: 14, color: milestone.status == .upcoming ? mutedColor : accentColor)
            } else {
                switch milestone.status {
                case .completed:
                    TablerIcons(.check, size: 10, color: accentColor)
                case .current, .upcoming:
                    EmptyView()
                }
            }
        }
    }

    private func connectorColor(from: MilestoneStatus, to: MilestoneStatus) -> Color {
        switch (from, to) {
        case (.completed, .completed), (.completed, .current):
            Color("AccentColor").opacity(0.4)
        default:
            Color("TextSecondary").opacity(0.15)
        }
    }
}
