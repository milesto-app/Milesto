import SwiftUI

struct DebriefBannerCard: View {
    let goalId: String

    @Environment(AppEnv.self) private var env
    @State private var model: DebriefBannerViewModel?
    @State private var showCelebration = false
    @State private var showDebriefSheet = false
    @State private var showMilestoneActivation = false

    var body: some View {
        VStack(spacing: 0) {}
            .task(id: goalId) {
                await ensureModel()
                await model?.refresh()
                presentIfReady()
            }
            .onReceive(NotificationCenter.default.publisher(for: .tasksDidChange)) { _ in
                Task {
                    await ensureModel()
                    await model?.refresh()
                    presentIfReady()
                }
            }
            .fullScreenCover(isPresented: $showCelebration) {
                WeekCompleteCelebrationView(
                    isLastDayOfWeek: Self.isLastDayOfWeek(),
                    onDebrief: {
                        showCelebration = false
                        showDebriefSheet = true
                    },
                    onUndo: {
                        _ = try? await env.roadmap.undoLatestCompletedTask(goalId: goalId)
                        await model?.refresh()
                        NotificationCenter.default.post(name: .tasksDidChange, object: nil)
                        showCelebration = false
                    }
                )
            }
            .sheet(isPresented: $showDebriefSheet) {
                if let model, let milestoneId = model.milestoneId {
                    DebriefSheetView(
                        goalId: goalId,
                        milestoneId: milestoneId,
                        onDebriefComplete: {
                            Task {
                                await model.refresh()
                                if model.weekState == .noMilestone {
                                    showMilestoneActivation = true
                                }
                            }
                        }
                    )
                    .appPresentationBackground()
                }
            }
            .fullScreenCover(isPresented: $showMilestoneActivation, onDismiss: {
                Task { await model?.refresh() }
            }) {
                MilestoneActivationView(goalId: goalId) {
                    showMilestoneActivation = false
                }
                .appPresentationBackground()
            }
    }

    private func ensureModel() async {
        if model == nil {
            let vm = DebriefBannerViewModel(env: env)
            vm.configure(goalId: goalId)
            model = vm
        }
    }

    private func presentIfReady() {
        guard let model else { return }
        if model.weekState == .readyToDebrief, !showCelebration, !showDebriefSheet {
            showCelebration = true
        }
    }

    private static func isLastDayOfWeek() -> Bool {
        Calendar.current.component(.weekday, from: Date()) == 1
    }
}
