import SwiftUI

struct HomeTasksListSection: View {
    let tasks: [WeeklyTaskDTO]
    let sortedTasks: [WeeklyTaskDTO]
    let completedCount: Int
    let onToggle: (WeeklyTaskDTO) -> Void
    let onOpen: (String) -> Void

    var body: some View {
        VStack(spacing: 16) {
            HStack {
                AppText("home.tasks", table: "Home", style: .headline)
                Spacer()
                AppText(
                    verbatim: "\(completedCount)/\(tasks.count)",
                    style: .subheadline
                )
                .color(Color("TintPrimary"))
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)

            if tasks.isEmpty {
                AppText("home.tasks.empty", table: "Home", style: .subheadline)
                    .color(Color("TextSecondary"))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
            } else {
                VStack(spacing: 4) {
                    ForEach(sortedTasks) { task in
                        ObjectiveRowView(
                            task: task,
                            onToggle: {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    onToggle(task)
                                }
                            },
                            onOpen: {
                                onOpen(task.id)
                            }
                        )
                        .padding(.horizontal, 24)
                        .padding(.vertical, 12)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: tasks.map(\.isCompleted))
            }
        }
    }
}
