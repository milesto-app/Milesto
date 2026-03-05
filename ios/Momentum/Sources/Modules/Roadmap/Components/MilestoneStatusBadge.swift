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

    private var label: String {
        switch status {
        case .completed: return String(localized: "roadmap.milestone.status.completed", table: "Roadmap")
        case .current: return String(localized: "roadmap.milestone.status.current", table: "Roadmap")
        case .upcoming: return String(localized: "roadmap.milestone.status.upcoming", table: "Roadmap")
        }
    }

    private var isAccented: Bool {
        status == .completed || status == .current
    }

    var body: some View {
        HStack(spacing: 4) {
            if let icon {
                TablerIcons(icon, size: 14, color: isAccented ? Colors.textOnAccent : Colors.textSecondary)
            }

            AppText(verbatim: label, style: .caption)
                .weight(.semibold)
                .color(isAccented ? Colors.textOnAccent : Colors.textSecondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 4)
        .background {
            if isAccented {
                Capsule().fill(Colors.accent)
            } else {
                Capsule().stroke(Colors.textSecondary, lineWidth: 1)
            }
        }
    }
}

#Preview {
    VStack(spacing: 16) {
        MilestoneStatusBadge(status: .completed)
        MilestoneStatusBadge(status: .current)
        MilestoneStatusBadge(status: .upcoming)
    }
    .padding()
}
