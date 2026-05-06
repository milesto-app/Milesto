import Foundation

@MainActor
@Observable
final class DebriefBannerViewModel {
    @ObservationIgnored private let repository: RoadmapRepository
    @ObservationIgnored private var goalId: String = ""

    private(set) var weeklyPlanId: String?
    private(set) var shouldDisplay = false

    init(repository: RoadmapRepository) {
        self.repository = repository
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }

        async let tasksAsync = repository.fetchWeeklyTasks(goalId: goalId)
        async let planAsync = repository.fetchWeeklyPlan(goalId: goalId)
        async let debriefAsync = repository.fetchLatestDebrief(goalId: goalId)
        let tasks = (try? await tasksAsync) ?? []
        let plan: WeeklyPlanDTO? = (try? await planAsync) ?? nil
        let latest: DebriefDTO? = (try? await debriefAsync) ?? nil

        let allComplete = !tasks.isEmpty && tasks.allSatisfy(\.isCompleted)
        let debriefMissingForCurrentPlan = latest?.weeklyPlanId != plan?.id
        weeklyPlanId = plan?.id
        shouldDisplay = allComplete && debriefMissingForCurrentPlan && plan != nil
    }
}
