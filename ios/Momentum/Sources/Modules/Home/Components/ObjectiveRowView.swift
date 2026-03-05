import SwiftUI

struct ObjectiveRowView: View {
    let objective: DailyObjectiveDTO
    let onToggle: () -> Void

    private var difficultyColor: Color {
        switch objective.difficultyRating {
        case .easy:
            return Colors.accent
        case .moderate:
            return Colors.warning
        case .hard:
            return Colors.error
        case nil:
            return Colors.textSecondary
        }
    }

    private var difficultyLabel: String {
        switch objective.difficultyRating {
        case .easy:
            return String(localized: "home.objectives.difficulty.easy", table: "Home")
        case .moderate:
            return String(localized: "home.objectives.difficulty.moderate", table: "Home")
        case .hard:
            return String(localized: "home.objectives.difficulty.hard", table: "Home")
        case nil:
            return ""
        }
    }

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                TablerIcon(
                    objective.isCompleted ? .circleCheck : .circle,
                    size: 22,
                    color: objective.isCompleted ? Colors.accent : Colors.iconDefault
                )

                VStack(alignment: .leading, spacing: 4) {
                    AppText(verbatim: objective.title, style: .body)
                        .color(objective.isCompleted ? Colors.textSecondary : Colors.textPrimary)

                    AppText(verbatim: objective.description, style: .caption)
                        .color(Colors.textSecondary)
                        .lineLimit(1)
                }

                Spacer()

                if objective.difficultyRating != nil {
                    AppText(verbatim: difficultyLabel, style: .caption)
                        .weight(.medium)
                        .color(difficultyColor)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(
                            Capsule()
                                .fill(difficultyColor.opacity(0.15))
                        )
                }
            }
        }
        .buttonStyle(.plain)
    }
}
