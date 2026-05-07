import Foundation

@MainActor
@Observable
final class StatsViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var stats: StatsDTO?
    private(set) var isLoading = true
    private(set) var hasAppeared = false
    private(set) var loadError: Error?

    init(env: AppEnv) {
        self.env = env
    }

    func load(goalId: String) async {
        loadError = nil
        do {
            stats = try await env.stats.fetchStats(goalId: goalId)
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
