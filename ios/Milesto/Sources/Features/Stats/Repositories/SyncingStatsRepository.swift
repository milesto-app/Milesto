import Foundation
import SwiftData

@MainActor
final class SyncingStatsRepository: StatsRepository {
    private let remote: any RemoteStatsRepository
    private let container: ModelContainer

    init(remote: any RemoteStatsRepository, container: ModelContainer) {
        self.remote = remote
        self.container = container
    }

    private var context: ModelContext { container.mainContext }

    func loadCachedStats(goalId: String) -> StatsDTO? {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let local = try? context.fetch(descriptor).first,
              let data = local.statsJSON
        else { return nil }
        return try? JSONDecoder().decode(StatsDTO.self, from: data)
    }

    func refreshStats(goalId: String) async throws -> StatsDTO {
        let dto = try await remote.getStats(goalId: goalId)
        cacheStats(dto, goalId: goalId)
        try? context.save()
        return dto
    }

    private func cacheStats(_ dto: StatsDTO, goalId: String) {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let data = try? JSONEncoder().encode(dto)

        if let existing = try? context.fetch(descriptor).first {
            existing.statsJSON = data
            existing.updatedAt = Date()
        } else {
            context.insert(LocalStats(goalId: goalId, statsJSON: data))
        }
    }
}
