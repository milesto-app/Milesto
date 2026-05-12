import Foundation

@MainActor
@Observable
final class DebriefBannerViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private var goalId: String = ""

    private(set) var milestoneId: String?
    private(set) var shouldDisplay = false
    private(set) var weekState: WeekState = .active

    init(env: AppEnv) {
        self.env = env
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        guard !goalId.isEmpty else { return }

        guard let state = try? await env.roadmap.fetchCurrentWeekState(goalId: goalId) else {
            shouldDisplay = false
            return
        }
        milestoneId = state.milestone?.id
        weekState = state.weekState
        shouldDisplay = state.weekState == .readyToDebrief
    }
}
