import Foundation
import SwiftData

@MainActor
final class SyncingIntakeFlowRepository: IntakeFlowRepository {
    private let goals: any GoalRepository
    private let container: ModelContainer

    init(goals: any GoalRepository, container: ModelContainer) {
        self.goals = goals
        self.container = container
    }

    private var context: ModelContext {
        container.mainContext
    }

    func createGoal(description: String) async throws -> Goal {
        let goal = try await goals.createGoal(description: description)
        context.insert(Goal(
            id: goal.id,
            userId: goal.userId,
            title: goal.title,
            goalDescription: goal.goalDescription,
            status: goal.status,
            createdAt: Date()
        ))
        try? context.save()
        return goal
    }

    func saveMotivation(goalId: String, quote: String) async throws {
        try await goals.updateGoal(goalId: goalId, motivationQuote: quote)
    }

    func markIntakeCompleted(goalId: String) {
        let descriptor = FetchDescriptor<Goal>(
            predicate: #Predicate { $0.id == goalId }
        )
        if let goal = try? context.fetch(descriptor).first {
            goal.status = ProfileStatus.intakeCompleted.rawValue
            try? context.save()
        }
    }
}
