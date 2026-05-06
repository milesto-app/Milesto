import Foundation

@MainActor
@Observable
final class WeeklyPlanGenerationViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var isGenerating = false
    private(set) var hasFailed = false

    init(env: AppEnv) {
        self.env = env
    }

    func generate(goalId: String) async -> Bool {
        hasFailed = false
        isGenerating = true
        defer { isGenerating = false }

        do {
            try await env.roadmap.generateWeeklyPlan(goalId: goalId)
        } catch {
            hasFailed = true
            return false
        }

        let succeeded = await env.roadmap.waitForGeneratedTasks(goalId: goalId)
        if !succeeded {
            hasFailed = true
        }
        return succeeded
    }
}
