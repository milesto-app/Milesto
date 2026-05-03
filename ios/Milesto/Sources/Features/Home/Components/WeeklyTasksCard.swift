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
                GlassEffectContainer(spacing: 14) {
                    VStack(spacing: 8) {
                        ForEach(model.sortedTasks) { task in
                            taskSurface {
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
                            }
                            .padding(.horizontal, 16)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                        }
                    }
                }
                .animation(.easeInOut(duration: 0.3), value: model.tasks.map(\.isCompleted))
            }
        }
        .popover(
            isPresented: Binding(
                get: { selectedTaskId != nil },
                set: { if !$0 { selectedTaskId = nil } }
            )
        ) {
            if let taskId = selectedTaskId,
               let task = model.sortedTasks.first(where: { $0.id == taskId })
            {
                WeeklyTaskDetailView(
                    task: task,
                    weekNumber: model.weekNumber,
                    onToggle: { task in model.toggle(task) }
                )
            }
        }
        .onChange(of: model.tasks.map(\.id)) { _, ids in
            if let id = selectedTaskId, !ids.contains(id) {
                selectedTaskId = nil
            }
        }
    }

    @ViewBuilder
    private func taskSurface<Content: View>(@ViewBuilder content: () -> Content) -> some View {
        let shape = RoundedRectangle(cornerRadius: 16, style: .continuous)

        content()
            .padding(.horizontal, 16)
            .padding(.vertical, 14)
            .glassEffect(
                .regular
                    .interactive()
                    .tint(Color("BackgroundBase").opacity(0.35)),
                in: shape
            )
            .contentShape(shape)
    }
}
