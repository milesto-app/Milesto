import SwiftUI

struct HomeTasksCard: View {
    let goalId: String

    @Environment(AppEnv.self) private var env
    @State private var model: TasksViewModel?

    var body: some View {
        Group {
            if let model {
                TasksCard(
                    title: "home.tasks",
                    titleTable: "Home",
                    emptyText: "home.tasks.empty",
                    emptyTextTable: "Home",
                    tasks: model.sortedTasks,
                    isLoading: model.isLoading,
                    onToggle: { task in model.toggle(task) }
                )
            } else {
                AppLoader()
                    .padding(.top, 40)
            }
        }
        .task(id: goalId) {
            if model == nil {
                let vm = TasksViewModel(env: env)
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.refresh()
        }
    }
}
