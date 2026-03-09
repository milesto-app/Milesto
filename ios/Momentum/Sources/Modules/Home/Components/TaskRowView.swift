import SwiftUI

struct TaskRowView: View {
    let task: MockTask
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                TablerIcons(task.isCompleted ? .circleCheck : .circle, size: 22, color: task.isCompleted ? Color("TintPrimary") : Color("TextSecondary"))

                AppText(verbatim: task.title, style: .body)
                    .color(
                        task.isCompleted ? Color("TextSecondary") : Color("TextPrimary")
                    )

                Spacer()
            }
        }
        .buttonStyle(.plain)
    }
}
