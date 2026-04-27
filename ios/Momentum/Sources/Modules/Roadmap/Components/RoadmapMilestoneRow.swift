import SwiftUI

struct RoadmapMilestoneRow: View {
    let milestone: DisplayMilestone
    let position: Int
    let totalInSection: Int

    private var isCurrent: Bool {
        milestone.status == .current
    }

    private var usesUpcomingStyle: Bool {
        milestone.status == .upcoming || isCurrent
    }

    var body: some View {
        glassSurface {
            HStack(alignment: .top, spacing: 14) {
                milestoneMarker

                VStack(alignment: .leading, spacing: 10) {
                    titleBlock

                    AppText(verbatim: milestone.expectedOutcome, style: .subheadline)
                        .color(usesUpcomingStyle ? Color("TextSecondary").opacity(0.78) : Color("TextSecondary"))
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                TablerIcons(.chevronRight, size: 17, color: Color("TextSecondary").opacity(0.45))
                    .padding(.top, 4)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 15)
            .contentShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        }
    }

    private var titleBlock: some View {
        VStack(alignment: .leading, spacing: 7) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                AppText(verbatim: milestone.title, style: .body)
                    .weight(.medium)
                    .color(usesUpcomingStyle ? Color("TextPrimary").opacity(0.82) : Color("TextPrimary"))
                    .lineLimit(2)
                    .fixedSize(horizontal: false, vertical: true)

                Spacer(minLength: 4)
            }

            HStack(spacing: 8) {
                milestoneTypeBadge
                weekBadge
            }
        }
    }

    private var milestoneMarker: some View {
        ZStack {
            Circle()
                .fill(markerFill)
                .frame(width: markerSize, height: markerSize)

            Circle()
                .stroke(markerStroke, lineWidth: 1)
                .frame(width: markerSize, height: markerSize)

            if isCurrent {
                Circle()
                    .trim(from: 0, to: currentProgressRing)
                    .stroke(Color("TintPrimary"), style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: markerSize, height: markerSize)
            }

            if !isCurrent {
                TablerIcons(markerIcon, size: markerIconSize, color: markerIconColor)
            }
        }
        .padding(.top, 2)
        .accessibilityHidden(true)
    }

    private var milestoneTypeBadge: some View {
        HStack(spacing: 4) {
            TablerIcons(typeIcon, size: 13, color: typeColor)
            AppText(verbatim: typeLabel, style: .caption)
                .weight(.semibold)
                .color(typeColor)
                .lineLimit(1)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(
            Capsule()
                .fill(typeColor.opacity(0.08))
        )
    }

    private var weekBadge: some View {
        AppText(
            verbatim: milestone.targetWeek > 0
                ? String(format: String(localized: "roadmap.phase.week", table: "Roadmap"), milestone.targetWeek)
                : String(format: String(localized: "roadmap.phase.month", table: "Roadmap"), milestone.targetMonth),
            style: .caption
        )
        .color(Color("TextSecondary"))
        .lineLimit(1)
    }

    @ViewBuilder
    private func glassSurface<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        content()
            .glassEffect(.regular.interactive(), in: shape)
    }

    private var markerIcon: TablerIconOutline {
        if milestone.status == .completed { return .check }
        return .circle
    }

    private var markerFill: Color {
        switch milestone.status {
        case .completed:
            Color("TintPrimary")
        case .current, .upcoming:
            Color("TextSecondary").opacity(0.08)
        }
    }

    private var markerStroke: Color {
        switch milestone.status {
        case .completed:
            Color("TintPrimary")
        case .current, .upcoming:
            Color("TextSecondary").opacity(0.18)
        }
    }

    private var markerIconColor: Color {
        milestone.status == .completed ? Color("TextOnAccent") : typeColor
    }

    private var typeIcon: TablerIconOutline {
        return .route
    }

    private var typeLabel: String {
        return String(format: String(localized: "roadmap.phase.step", table: "Roadmap"), position, totalInSection)
    }

    private var typeColor: Color {
        return Color("TextSecondary")
    }

    private var markerSize: CGFloat {
        30
    }

    private var markerIconSize: CGFloat {
        15
    }

    private var currentProgressRing: Double {
        min(max(milestone.progress, 0.01), 1)
    }

    private var cornerRadius: CGFloat {
        20
    }
}

#Preview {
    VStack(spacing: 12) {
        RoadmapMilestoneRow(
            milestone: DisplayMilestone(
                id: "1",
                title: "Build a weekly baseline",
                description: "Create a repeatable rhythm.",
                targetMonth: 1,
                targetWeek: 1,
                isMonthlyCheckpoint: false,
                orderIndex: 0,
                expectedOutcome: "A stable routine that can survive busy days.",
                status: .completed,
                progress: 1
            ),
            position: 1,
            totalInSection: 3
        )

        RoadmapMilestoneRow(
            milestone: DisplayMilestone(
                id: "2",
                title: "Practice the weekly review loop",
                description: "Review progress.",
                targetMonth: 1,
                targetWeek: 4,
                isMonthlyCheckpoint: true,
                orderIndex: 1,
                expectedOutcome: "A clear read on what is working and what needs adjusting.",
                status: .current,
                progress: 0.45
            ),
            position: 2,
            totalInSection: 3
        )
    }
    .padding()
}
