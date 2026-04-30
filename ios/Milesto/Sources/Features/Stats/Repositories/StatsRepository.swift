import Foundation

@MainActor
protocol RemoteStatsRepository: AnyObject {
    func getStats(goalId: String) async throws -> StatsDTO
}

@MainActor
protocol StatsRepository: AnyObject {
    func loadCachedStats(goalId: String) -> StatsDTO?
    func refreshStats(goalId: String) async throws -> StatsDTO
}
