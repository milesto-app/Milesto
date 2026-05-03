import SwiftUI

struct MilestoneStatusBadge: View {
    let status: MilestoneStatus

    private var icon: TablerIconOutline? {
        switch status {
        case .completed: return .check
        case .current: return .mapPin
        case .upcoming: return nil
        }
    }

    private var labelKey: LocalizedStringKey {
        switch status {
        case .completed: return "roadmap.milestone.status.completed"
        case .current: return "roadmap.milestone.status.current"
        case .upcoming: return "roadmap.milestone.status.upcoming"
        }
    }

    private var tint: Color {
        switch status {
        case .completed, .current:
            Color("Brand")
        case .upcoming:
            Color("TextSecondary")
        }
    }

    var body: some View {
        AppPill(
            labelKey,
            table: "Roadmap",
            tint: tint,
            icon: icon
        )
    }
}
