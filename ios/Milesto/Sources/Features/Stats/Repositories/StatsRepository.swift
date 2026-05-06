import Foundation

@MainActor
final class StatsRepository {
    private let remote: StatsRemote

    init() {
        remote = StatsRemote()
    }

    func fetchStats(goalId: String) async throws -> StatsSnapshot {
        try await remote.fetchStats(goalId: goalId).snapshot
    }
}
