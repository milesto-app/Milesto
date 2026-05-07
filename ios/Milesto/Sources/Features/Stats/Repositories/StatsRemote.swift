import Foundation

@MainActor
final class StatsRemote {
    init() {}

    func fetchStats(goalId: String) async throws -> StatsDTO {
        try await ApiClient.shared.request(
            method: "GET",
            path: "me/stats?goalId=\(goalId)"
        )
    }
}
