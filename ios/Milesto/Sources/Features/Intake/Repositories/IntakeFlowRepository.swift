import Foundation
import SwiftData

@MainActor
final class IntakeFlowRepository {
    private let goals: GoalRepository

    init(modelContext: ModelContext) {
        goals = GoalRepository(modelContext: modelContext)
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
