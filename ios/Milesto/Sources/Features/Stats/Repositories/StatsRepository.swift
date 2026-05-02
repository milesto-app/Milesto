import Foundation

@MainActor
protocol RemoteStatsRepository: AnyObject {
    func getStats(goalId: String) async throws -> StatsDTO
}

@MainActor
protocol StatsRepository: AnyObject {
    func loadStats(goalId: String) -> StatsSnapshot?
    func refreshStats(goalId: String) async throws -> StatsSnapshot
}
