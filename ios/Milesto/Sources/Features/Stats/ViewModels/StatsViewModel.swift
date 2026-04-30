import Foundation

@MainActor
@Observable
final class StatsViewModel {
    @ObservationIgnored private let repository: any StatsRepository

    private(set) var statsDTO: StatsDTO?
    private(set) var isLoading = true
    private(set) var hasAppeared = false
    private(set) var loadError: Error?

    init(repository: any StatsRepository) {
        self.repository = repository
    }

    func load(goalId: String) async {
        loadError = nil

        if statsDTO == nil, let local = repository.loadStats(goalId: goalId) {
            statsDTO = local
            isLoading = false
            hasAppeared = true
        }

        do {
            statsDTO = try await repository.refreshStats(goalId: goalId)
            isLoading = false
            hasAppeared = true
        } catch {
            if statsDTO == nil {
                loadError = error
            }
            isLoading = false
        }
    }
}
