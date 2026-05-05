import SwiftUI

struct HomeWeeklyTasksCard: View {
    let goalId: String

    @Environment(AppEnv.self) private var env
    @State private var model: WeeklyTasksViewModel?

    var body: some View {
        Group {
            if let model {
                WeeklyTasksCard(
                    title: "home.tasks",
                    titleTable: "Home",
                    emptyText: "home.tasks.empty",
                    emptyTextTable: "Home",
                    tasks: model.sortedTasks,
                    isLoading: model.isLoading,
                    weekNumber: model.weekNumber,
                    onToggle: { task in model.toggle(task) }
                )
            } else {
                ProgressView()
                    .padding(.top, 40)
            }
        }
        .task(id: goalId) {
            if model == nil {
                let vm = WeeklyTasksViewModel(repository: env.roadmap)
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.refresh()
        }
    }
}
