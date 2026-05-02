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

    private var context: ModelContext {
        container.mainContext
    }

    func loadStats(goalId: String) -> StatsSnapshot? {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        return try? context.fetch(descriptor).first?.stats?.snapshot
    }

    func refreshStats(goalId: String) async throws -> StatsSnapshot {
        let dto = try await remote.getStats(goalId: goalId)
        saveStats(dto, goalId: goalId)
        try? context.save()
        return dto.snapshot
    }

    private func saveStats(_ dto: StatsDTO, goalId: String) {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )

        if let existing = try? context.fetch(descriptor).first {
            existing.update(with: dto)
        } else {
            context.insert(LocalStats(goalId: goalId, stats: dto))
        }
    }
}
