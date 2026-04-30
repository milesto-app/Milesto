import Foundation

@MainActor
protocol StatsRepository: AnyObject {
    func getStats(goalId: String) async throws -> StatsDTO
}
