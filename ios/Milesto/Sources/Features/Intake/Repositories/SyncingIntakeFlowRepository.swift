import Foundation
import SwiftData

@MainActor
final class SyncingIntakeFlowRepository: IntakeFlowRepository {
    private let goals: any GoalRepository

    init(modelContext: ModelContext) {
        goals = SyncingGoalRepository(modelContext: modelContext)
    }

    func createGoal(description: String) async throws -> GoalSnapshot {
        try await goals.createGoal(description: description)
    }

    func saveMotivation(goalId: String, quote: String) async throws {
        try await goals.updateGoal(goalId: goalId, motivationQuote: quote)
    }

    func markIntakeCompleted(goalId: String) {
        goals.markIntakeCompleted(goalId: goalId)
    }
}
