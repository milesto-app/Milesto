import SwiftUI

struct WeeklyTaskDetailView: View {
    let task: WeeklyTask
    let indexInWeek: Int
    let totalInWeek: Int
    let weekNumber: Int?
    let onToggle: ((WeeklyTask) -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var appeared = false

    init(
        task: WeeklyTask,
        indexInWeek: Int,
        totalInWeek: Int,
        weekNumber: Int? = nil,
        onToggle: ((WeeklyTask) -> Void)? = nil
    ) {
        self.task = task
        self.indexInWeek = indexInWeek
        self.totalInWeek = totalInWeek
        self.weekNumber = weekNumber
        self.onToggle = onToggle
    }

    var body: some View {
        WeeklyTaskDetailPage(
            task: task,
            weekNumber: weekNumber,
            indexInWeek: indexInWeek,
            totalInWeek: totalInWeek,
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
