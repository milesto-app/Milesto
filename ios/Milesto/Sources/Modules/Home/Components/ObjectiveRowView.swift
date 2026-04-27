import SwiftUI

struct ObjectiveRowView: View {
    let task: WeeklyTaskDTO
    let onToggle: () -> Void
    var onOpen: (() -> Void)?

    private var difficultyColor: Color {
        switch task.difficultyRating {
        case .easy:
            return Color("TintPrimary")
        case .moderate:
            return Color("AccentAmber")
        case .hard:
            return Color("StatusError")
        case nil:
            return Color("TextSecondary")
        }
    }

    private var difficultyLabel: String {
        switch task.difficultyRating {
        case .easy:
            return String(localized: "home.tasks.difficulty.easy", table: "Home")
        case .moderate:
            return String(localized: "home.tasks.difficulty.moderate", table: "Home")
        case .hard:
            return String(localized: "home.tasks.difficulty.hard", table: "Home")
        case nil:
            return ""
        }
    }

    private var checkbox: some View {
        TablerIcons(
            task.isCompleted ? .circleCheck : .circle,
            size: 22,
            color: task.isCompleted ? Color("TintPrimary") : Color("TextSecondary")
        )
    }

    private var rowBody: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                AppText(verbatim: task.title, style: .body)
                    .color(task.isCompleted ? Color("TextSecondary") : Color("TextPrimary"))

                AppText(verbatim: task.description, style: .caption)
                    .color(Color("TextSecondary"))
                    .lineLimit(1)
            }

            Spacer()

            if task.difficultyRating != nil {
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
        .contentShape(Rectangle())
    }

    var body: some View {
        if let onOpen {
            HStack(spacing: 12) {
                Button(action: onToggle) {
                    checkbox
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: onOpen) {
                    rowBody
                }
                .buttonStyle(.plain)
            }
        } else {
            Button(action: onToggle) {
                HStack(spacing: 12) {
                    checkbox
                    rowBody
                }
            }
            .buttonStyle(.plain)
        }
    }
}
