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
        guard let state = try? await repository.fetchDebriefPromptState(goalId: goalId) else { return }
        weeklyPlanId = state.weeklyPlanId
        shouldDisplay = state.shouldDisplay
    }
}
