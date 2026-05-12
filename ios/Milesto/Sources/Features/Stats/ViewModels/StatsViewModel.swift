import Foundation

@MainActor
@Observable
final class StatsViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var stats: StatsDTO?
    private(set) var targetDate: Date?
    private(set) var isLoading = true
    private(set) var hasAppeared = false
    private(set) var loadError: Error?

    init(env: AppEnv) {
        self.env = env
    }

    func load(goalId: String) async {
        loadError = nil
        do {
            async let statsTask = env.stats.fetchStats(goalId: goalId)
            async let goalTask = env.goals.fetchGoal(goalId: goalId)
            stats = try await statsTask
            targetDate = (try? await goalTask).flatMap { $0?.targetDate }
            isLoading = false
            hasAppeared = true
        } catch {
            if stats == nil {
                loadError = error
            }
            isLoading = false
        }
    }
}
