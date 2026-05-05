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
        apply(repository.loadDebriefPromptState(goalId: goalId))
    }

    func refresh() async {
        apply(await repository.refreshDebriefPromptState(goalId: goalId))
    }

    func reactToTaskChange() {
        apply(repository.loadDebriefPromptState(goalId: goalId))
    }

    private func apply(_ state: DebriefPromptState) {
        weeklyPlanId = state.weeklyPlanId
        shouldDisplay = state.shouldDisplay
    }
}
