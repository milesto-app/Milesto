import SwiftUI

struct TaskDetailView: View {
    let task: TaskDTO
    let weekNumber: Int?
    let onToggle: ((TaskDTO) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var appeared = false

    init(
        task: TaskDTO,
        weekNumber: Int? = nil,
        onToggle: ((TaskDTO) -> Void)? = nil
    ) {
        self.task = task
        self.weekNumber = weekNumber
        self.onToggle = onToggle
    }

    var body: some View {
        TaskDetailPage(
            task: task,
            weekNumber: weekNumber,
            appeared: appeared,
            onToggle: onToggle
        )
        .appBackground()
        .overlay(alignment: .top) {
            ProgressiveBlur()
                .allowsHitTesting(false)
        }
        .overlay(alignment: .topLeading) {
            Button {
                Haptics.light()
                dismiss()
            } label: {
                TablerIcons(.x, size: 24, color: Color("TextPrimary"))
                    .frame(width: 44, height: 44)
                    .glassEffect(.regular.interactive(), in: .circle)
            }
            .padding(.horizontal, 16)
            .padding(.top, 8)
        }
        .animation(.easeOut(duration: 0.45), value: appeared)
        .onAppear { appeared = true }
    }
}
