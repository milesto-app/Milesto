import Foundation

@MainActor
@Observable
final class DebriefBannerViewModel {
    @ObservationIgnored private let repository: any RoadmapFeatureRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var weeklyPlanId: String?
    private(set) var completedTasks: [WeeklyTask] = []
    private(set) var shouldDisplay = false

    init(repository: any RoadmapFeatureRepository) {
        self.repository = repository
    }

    func configure(goalId: String) {
        self.goalId = goalId
        recomputeFromLocalState()
    }

    func refresh() async {
        async let tasks = repository.refreshWeeklyTasks(goalId: goalId)
        async let plan = repository.refreshWeeklyPlan(goalId: goalId)
        async let debrief = repository.refreshLatestDebrief(goalId: goalId)
        _ = try? await tasks
        _ = await plan
        _ = await debrief
        recomputeFromLocalState()
    }

    func reactToTaskChange() {
        recomputeFromLocalState()
    }

    private func recomputeFromLocalState() {
        let tasks = repository.loadWeeklyTasks(goalId: goalId)
        let plan = repository.loadWeeklyPlan(goalId: goalId)
        let latest = repository.loadLatestDebrief(goalId: goalId)

        weeklyPlanId = plan?.id
        completedTasks = tasks.filter(\.isCompleted)

        let allComplete = !tasks.isEmpty && tasks.allSatisfy(\.isCompleted)
        let debriefMissingForCurrentPlan = latest?.weeklyPlanId != plan?.id
        shouldDisplay = allComplete && debriefMissingForCurrentPlan && plan != nil
    }
}
