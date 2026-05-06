import Foundation

@MainActor
@Observable
final class StatsViewModel {
    @ObservationIgnored private let repository: StatsRepository

    private(set) var stats: StatsDTO?
    private(set) var isLoading = true
    private(set) var hasAppeared = false
    private(set) var loadError: Error?

    init(repository: StatsRepository) {
        self.repository = repository
    }

    func load(goalId: String) async {
        loadError = nil
        do {
            stats = try await repository.fetchStats(goalId: goalId)
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
