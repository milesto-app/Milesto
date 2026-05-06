import SwiftUI

struct ObjectiveRowView: View {
    let task: WeeklyTaskDTO
    let onToggle: () -> Void
    var onOpen: (() -> Void)?

    private var durationLabel: String? {
        formatDuration(task.estimatedMinutes)
    }

    private var checkbox: some View {
        TablerIcons(
            task.isCompleted ? .circleCheck : .circle,
            size: 28,
            color: task.isCompleted ? Color("Brand") : Color("TextSecondary")
        )
    }

    private var rowBody: some View {
        HStack(spacing: 2) {
            VStack(alignment: .leading, spacing: 4) {
                AppText(verbatim: task.title, style: .body)
                    .color(task.isCompleted ? Color("TextSecondary") : Color("TextPrimary"))
                    .lineLimit(1)
                    .truncationMode(.tail)

                AppText(verbatim: task.description, style: .caption)
                    .color(Color("TextSecondary"))
                    .lineLimit(1)
            }

            Spacer()

            if let durationLabel {
                AppPill(verbatim: durationLabel, tint: Color("TextSecondary"))
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
