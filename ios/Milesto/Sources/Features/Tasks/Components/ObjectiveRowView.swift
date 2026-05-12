import SwiftUI

struct ObjectiveRowView: View {
    let task: TaskDTO
    let onToggle: () -> Void
    var onOpen: (() -> Void)?

    private var durationLabel: String? {
        formatDuration(task.estimatedMinutes)
    }

    private var isCompleted: Bool {
        task.completedAt != nil
    }

    private var checkbox: some View {
        TablerIcons(
            isCompleted ? .circleCheck : .circle,
            size: 28,
            color: isCompleted ? Color("Brand") : Color("TextSecondary")
        )
    }

    private var rowBody: some View {
        HStack(spacing: 2) {
            VStack(alignment: .leading, spacing: 4) {
                AppText(verbatim: task.title, style: .body)
                    .color(isCompleted ? Color("TextSecondary") : Color("TextPrimary"))
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

    private func handleToggle() {
        if isCompleted {
            Haptics.light()
        } else {
            Haptics.success()
        }
        onToggle()
    }

    private func handleOpen() {
        Haptics.soft(intensity: 0.7)
        onOpen?()
    }

    var body: some View {
        if onOpen != nil {
            HStack(spacing: 12) {
                Button(action: handleToggle) {
                    checkbox
                        .frame(width: 28, height: 28)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)

                Button(action: handleOpen) {
                    rowBody
                }
                .buttonStyle(.plain)
            }
        } else {
            Button(action: handleToggle) {
                HStack(spacing: 12) {
                    checkbox
                    rowBody
                }
            }
            .buttonStyle(.plain)
        }
    }
}
