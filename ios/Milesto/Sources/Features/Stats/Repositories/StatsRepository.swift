import Foundation
import SwiftData

@MainActor
final class StatsRepository {
    private let sync: StatsReadThroughSync

    init(modelContext: ModelContext) {
        sync = StatsReadThroughSync(modelContext: modelContext, remote: StatsRemote())
    }

    func loadStats(goalId: String) -> StatsSnapshot? {
        sync.loadDTO(goalId: goalId)?.snapshot
    }

    func refreshStats(goalId: String) async throws -> StatsSnapshot {
        try await syncReadThroughStats(goalId: goalId).snapshot
    }

    private func syncReadThroughStats(goalId: String) async throws -> StatsDTO {
        try await sync.refreshDTO(goalId: goalId)
    }
}

@MainActor
private final class StatsReadThroughSync {
    private let context: ModelContext
    private let remote: StatsRemote

    init(modelContext: ModelContext, remote: StatsRemote) {
        context = modelContext
        self.remote = remote
    }

    func loadDTO(goalId: String) -> StatsDTO? {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        return try? context.fetch(descriptor).first?.stats
    }

    func refreshDTO(goalId: String) async throws -> StatsDTO {
        let remoteDTO = try await remote.fetchStats(goalId: goalId)
        upsert(remoteDTO)
        try? context.save()
        return remoteDTO
    }

    private func upsert(_ remoteDTO: StatsDTO) {
        let dtoId = remoteDTO.id
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == dtoId }
        )
        if let existing = try? context.fetch(descriptor).first {
            existing.update(from: remoteDTO)
        } else {
            context.insert(LocalStats.make(from: remoteDTO))
        }
    }
}
