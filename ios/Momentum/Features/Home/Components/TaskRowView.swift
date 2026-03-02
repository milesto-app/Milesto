import SwiftUI

struct TaskRowView: View {
    let task: MockTask
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: AppTheme.Spacing.sm) {
                TablerIcon(task.isCompleted ? .circleCheck : .circle, size: 22, color: task.isCompleted ? AppTheme.Colors.accent : AppTheme.Colors.iconDefault)

                AppText(verbatim: task.title, style: .body)
                    .color(
                        task.isCompleted ? AppTheme.Colors.textSecondary : AppTheme.Colors.textPrimary
                    )

                Spacer()
            }
        }
        .buttonStyle(.plain)
    }
}
