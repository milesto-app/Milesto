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
                .stroke(markerStroke, lineWidth: markerStrokeWidth)
                .frame(width: markerSize, height: markerSize)

            if isCurrent {
                Circle()
                    .trim(from: 0, to: currentProgressRing)
                    .stroke(Color("Brand"), style: StrokeStyle(lineWidth: markerStrokeWidth, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .frame(width: markerSize, height: markerSize)
            }

            if let markerIcon {
                TablerIcons(markerIcon, size: markerIconSize, color: markerIconColor)
            }
        }
        .padding(.top, 2)
        .accessibilityHidden(true)
    }

    private var milestoneTypeBadge: some View {
        AppPill(verbatim: typeLabel, tint: typeColor, icon: typeIcon)
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
            .background(Color("BackgroundSecondary"), in: shape)
    }

    private var markerIcon: TablerIcon? {
        if milestone.status == .completed { return .check }
        return nil
    }

    private var markerFill: Color {
        switch milestone.status {
        case .completed, .current, .upcoming:
            .clear
        }
    }

    private var markerStroke: Color {
        switch milestone.status {
        case .completed:
            Color("Brand")
        case .current, .upcoming:
            Color("TextSecondary").opacity(0.28)
        }
    }

    private var markerIconColor: Color {
        milestone.status == .completed ? Color("Brand") : typeColor
    }

    private var typeIcon: TablerIcon {
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

    private var markerStrokeWidth: CGFloat {
        3
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
