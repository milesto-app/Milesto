import Foundation

@MainActor
@Observable
final class WeeklyPlanGenerationViewModel {
    @ObservationIgnored private let repository: any WeeklyPlanRepository

    private(set) var isGenerating = false
    private(set) var hasFailed = false

    init(repository: any WeeklyPlanRepository) {
        self.repository = repository
    }

    func generate(goalId: String) async -> Bool {
        hasFailed = false
        isGenerating = true
        defer { isGenerating = false }

        do {
            try await repository.generateWeeklyPlan(goalId: goalId)
        } catch {
            hasFailed = true
            return false
        }

        let succeeded = await repository.waitForGeneratedTasks(goalId: goalId)
        if !succeeded {
            hasFailed = true
        }
        return succeeded
    }
}
