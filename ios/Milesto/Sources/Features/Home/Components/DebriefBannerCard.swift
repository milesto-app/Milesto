import SwiftUI

struct DebriefBannerCard: View {
    let goalId: String
    let refreshToken: Int

    @Environment(AppDependencies.self) private var dependencies
    @State private var model: DebriefBannerViewModel?
    @State private var showDebriefSheet = false
    @State private var showWeeklyPlanGeneration = false

    var body: some View {
        Group {
            if let model, model.shouldDisplay {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }
        }
        .task {
            if model == nil {
                let vm = DebriefBannerViewModel(repository: dependencies.roadmap)
                vm.configure(goalId: goalId)
                model = vm
            }
        }
        .task(id: "\(goalId)-\(refreshToken)") {
            await model?.refresh()
        }
        .onReceive(NotificationCenter.default.publisher(for: .weeklyTaskCompletionDidChange)) { _ in
            model?.reactToTaskChange()
        }
        .sheet(isPresented: $showDebriefSheet) {
            if let model, let weeklyPlanId = model.weeklyPlanId {
                DebriefSheetView(
                    goalId: goalId,
                    weeklyPlanId: weeklyPlanId,
                    completedTasks: model.completedTasks,
                    onDebriefComplete: {
                        showWeeklyPlanGeneration = true
                    }
                )
            }
        }
        .fullScreenCover(isPresented: $showWeeklyPlanGeneration, onDismiss: {
            Task { await model?.refresh() }
        }) {
            WeeklyPlanGenerationView(goalId: goalId) {
                showWeeklyPlanGeneration = false
            }
        }
    }
}
