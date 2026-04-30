import Foundation
import SwiftData

@MainActor
@Observable
final class StatsViewModel {
    @ObservationIgnored private let stats: any StatsRepository

    var statsDTO: StatsDTO?
    var isLoading = true
    var hasAppeared = false
    var loadError: Error?

    init(stats: any StatsRepository = SupabaseStatsRepository.shared) {
        self.stats = stats
    }

    func load(goalId: String, in modelContext: ModelContext) async {
        loadError = nil

        if statsDTO == nil, let cached = fetchCachedStats(goalId: goalId, in: modelContext) {
            statsDTO = cached
            isLoading = false
            hasAppeared = true
        }

        do {
            let result = try await stats.getStats(goalId: goalId)
            statsDTO = result
            syncStatsToCache(result, goalId: goalId, in: modelContext)
            isLoading = false
            hasAppeared = true
        } catch {
            if statsDTO == nil {
                loadError = error
            }
            isLoading = false
        }
    }

    private func fetchCachedStats(goalId: String, in modelContext: ModelContext) -> StatsDTO? {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        guard let local = try? modelContext.fetch(descriptor).first,
              let data = local.statsJSON else { return nil }
        return try? JSONDecoder().decode(StatsDTO.self, from: data)
    }

    private func syncStatsToCache(_ dto: StatsDTO, goalId: String, in modelContext: ModelContext) {
        let descriptor = FetchDescriptor<LocalStats>(
            predicate: #Predicate { $0.goalId == goalId }
        )
        let data = try? JSONEncoder().encode(dto)

        if let existing = try? modelContext.fetch(descriptor).first {
            existing.statsJSON = data
            existing.updatedAt = Date()
        } else {
            modelContext.insert(LocalStats(goalId: goalId, statsJSON: data))
        }
    }
}
