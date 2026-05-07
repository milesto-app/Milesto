import Foundation

@MainActor
@Observable
final class DebriefBannerViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private var goalId: String = ""

    private(set) var weeklyPlanId: String?
    private(set) var shouldDisplay = false

    init(env: AppEnv) {
        self.env = env
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }

        async let tasksAsync = env.roadmap.fetchWeeklyTasks(goalId: goalId)
        async let planAsync = env.roadmap.fetchWeeklyPlan(goalId: goalId)
        async let debriefAsync = env.roadmap.fetchLatestDebrief(goalId: goalId)
        let tasks = (try? await tasksAsync) ?? []
        let plan: WeeklyPlanDTO? = (try? await planAsync) ?? nil
        let latest: DebriefDTO? = (try? await debriefAsync) ?? nil

        let allComplete = !tasks.isEmpty && tasks.allSatisfy(\.isCompleted)
        let debriefMissingForCurrentPlan = latest?.weeklyPlanId != plan?.id
        weeklyPlanId = plan?.id
        shouldDisplay = allComplete && debriefMissingForCurrentPlan && plan != nil
    }
}
