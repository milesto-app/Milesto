import Foundation

@MainActor
@Observable
final class DebriefBannerViewModel {
    @ObservationIgnored private let env: AppEnv
    @ObservationIgnored private var goalId: String = ""

    private(set) var weeklyPlanId: String?
    private(set) var shouldDisplay = false
    private(set) var weekState: WeekState = .active

    init(env: AppEnv) {
        self.env = env
    }

    func configure(goalId: String) {
        self.goalId = goalId
    }

    func refresh() async {
        NSLog("[DebriefBanner] refresh() called goalId='\(goalId)'")
        guard !goalId.isEmpty else {
            NSLog("[DebriefBanner] skipped: empty goalId")
            return
        }

        do {
            let state = try await env.roadmap.fetchWeeklyPlanState(goalId: goalId)
            weeklyPlanId = state.plan?.id
            weekState = state.weekState
            shouldDisplay = state.weekState == .readyToDebrief
            NSLog("[DebriefBanner] state=\(state.weekState.rawValue) shouldDisplay=\(shouldDisplay) planId=\(state.plan?.id ?? "nil")")
        } catch {
            NSLog("[DebriefBanner] fetch failed: \(error)")
            shouldDisplay = false
        }
    }
}
