import Foundation

@MainActor
@Observable
final class StatsViewModel {
    @ObservationIgnored private let repository: StatsRepository

    private(set) var stats: StatsSnapshot?
    private(set) var isLoading = true
    private(set) var hasAppeared = false
    private(set) var loadError: Error?

    init(repository: StatsRepository) {
        self.repository = repository
    }

    func load(goalId: String) async {
        loadError = nil

        if stats == nil, let local = repository.loadStats(goalId: goalId) {
            stats = local
            isLoading = false
            hasAppeared = true
        }

        do {
            stats = try await repository.refreshStats(goalId: goalId)
            isLoading = false
            hasAppeared = true
        } catch {
            if stats == nil {
                loadError = error
            }
            isLoading = false
        }
    }
}
