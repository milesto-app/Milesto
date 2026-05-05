import Foundation
import SwiftData

@MainActor
final class SyncingStatsRepository: StatsRepository {
    private let remote: any RemoteStatsRepository
    private let context: ModelContext

    init(modelContext: ModelContext, remote: any RemoteStatsRepository = SupabaseStatsRepository()) {
        self.remote = remote
        context = modelContext
    }

    func loadStats(goalId: String) -> StatsSnapshot? {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        return try? context.fetch(descriptor).first?.stats?.snapshot
    }

    func refreshStats(goalId: String) async throws -> StatsSnapshot {
        let remote = try await remote.getStats(goalId: goalId)
        saveStats(remote, goalId: goalId)
        try? context.save()
        return remote.snapshot
    }

    private func saveStats(_ remote: RemoteStats, goalId: String) {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )

        if let existing = try? context.fetch(descriptor).first {
            existing.update(with: remote)
        } else {
            context.insert(LocalStats(goalId: goalId, stats: remote))
        }
    }
}
