import SwiftUI

struct WeeklyTasksCard: View {
    let goalId: String

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: WeeklyTasksViewModel?
    @State private var selectedTaskId: String?

    var body: some View {
        Group {
            if let model {
                content(model: model)
            } else {
                ProgressView()
                    .padding(.top, 40)
            }
        }
        .task(id: goalId) {
            if model == nil {
                let vm = WeeklyTasksViewModel(
                    repository: dependencies.weeklyTasks,
                    planRepository: dependencies.weeklyPlans
                )
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.refresh()
        }
    }

    private func content(model: WeeklyTasksViewModel) -> some View {
        VStack(spacing: 16) {
            HStack {
                AppText("home.tasks", table: "Home", style: .headline)
                Spacer()
                AppText(
                    verbatim: "\(model.completedCount)/\(model.tasks.count)",
                    style: .subheadline
                )
            }
            .padding(.horizontal, 24)
            .padding(.top, 12)

            if model.isLoading && model.tasks.isEmpty {
                ProgressView().padding(.top, 24)
            } else if model.tasks.isEmpty {
                AppText("home.tasks.empty", table: "Home", style: .subheadline)
                    .color(Color("TextSecondary"))
                    .padding(.horizontal, 24)
                    .padding(.vertical, 16)
            } else {
                VStack(spacing: 8) {
                    ForEach(model.sortedTasks) { task in
                        ObjectiveRowView(
                            task: task,
                            onToggle: {
                                withAnimation(.easeInOut(duration: 0.3)) {
                                    model.toggle(task)
                                }
                            },
                            onOpen: {
                                selectedTaskId = task.id
                            }
                        )
                        .padding(.horizontal, 16)
                        .padding(.vertical, 14)
                        .glassEffect(.regular.interactive(), in: RoundedRectangle(cornerRadius: 16))
                        .padding(.horizontal, 16)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: model.tasks.map(\.isCompleted))
            }
        }
        .navigationDestination(item: $selectedTaskId) { taskId in
            let ordered = model.sortedTasks.map(\.id)
            if let start = ordered.firstIndex(of: taskId) {
                WeeklyTaskDetailView(
                    tasks: model.tasks,
                    orderedIds: ordered,
                    startIndex: start,
                    weekNumber: model.weekNumber,
                    onToggle: { task in model.toggle(task) }
                )
            }
        }
    }
}
