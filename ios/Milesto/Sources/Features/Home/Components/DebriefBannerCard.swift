import SwiftUI

struct DebriefBannerCard: View {
    let goalId: String

    @Environment(AppEnv.self) private var env
    @State private var model: DebriefBannerViewModel?
    @State private var showDebriefSheet = false
    @State private var showWeeklyPlanGeneration = false

    var body: some View {
        VStack(spacing: 0) {
            if let model, model.shouldDisplay {
                DebriefPromptCard {
                    showDebriefSheet = true
                }
                .padding(.horizontal, 16)
            }
        }
        .onAppear {
            NSLog("[DebriefBanner] onAppear goalId='\(goalId)' empty=\(goalId.isEmpty)")
        }
        .task(id: goalId) {
            NSLog("[DebriefBanner] task fired goalId='\(goalId)'")
            if model == nil {
                let vm = DebriefBannerViewModel(env: env)
                vm.configure(goalId: goalId)
                model = vm
            }
            await model?.refresh()
        }
        .onReceive(NotificationCenter.default.publisher(for: .weeklyTasksDidChange)) { _ in
            NSLog("[DebriefBanner] received tasksDidChange goalId='\(goalId)' modelNil=\(model == nil)")
            if model == nil {
                let vm = DebriefBannerViewModel(env: env)
                vm.configure(goalId: goalId)
                model = vm
            }
            Task { await model?.refresh() }
        }
        .sheet(isPresented: $showDebriefSheet) {
            if let model, let weeklyPlanId = model.weeklyPlanId {
                DebriefSheetView(
                    goalId: goalId,
                    weeklyPlanId: weeklyPlanId,
                    onDebriefComplete: {
                        Task {
                            await model.refresh()
                            if model.weekState == .noPlan {
                                showWeeklyPlanGeneration = true
                            }
                        }
                    }
                )
                .appPresentationBackground()
            }
        }
        .fullScreenCover(isPresented: $showWeeklyPlanGeneration, onDismiss: {
            Task { await model?.refresh() }
        }) {
            WeeklyPlanGenerationView(goalId: goalId) {
                showWeeklyPlanGeneration = false
            }
            .appPresentationBackground()
        }
    }
}
