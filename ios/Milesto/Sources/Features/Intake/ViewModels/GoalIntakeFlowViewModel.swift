import Foundation
import SwiftData

enum GoalIntakeStep {
    case goalSetup
    case motivation(goalId: String)
    case intake(goalId: String)
}

@MainActor
@Observable
final class GoalIntakeFlowViewModel {
    @ObservationIgnored private let goals: any GoalRepository

    var step: GoalIntakeStep = .goalSetup
    var goalDescription = ""
    var motivationQuote = ""
    var isCreatingGoal = false
    var isSavingMotivation = false
    var showError = false
    var errorMessage = ""

    init(goals: any GoalRepository = SupabaseGoalRepository.shared) {
        self.goals = goals
    }

    func startWithExistingGoalId(_ goalId: String?) {
        if let goalId {
            step = .intake(goalId: goalId)
        }
    }

    func createGoal(in modelContext: ModelContext) async {
        isCreatingGoal = true
        defer { isCreatingGoal = false }

        do {
            let goal = try await goals.createGoal(
                description: goalDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            )

            let localGoal = Goal(
                id: goal.id,
                userId: goal.userId,
                title: goal.title,
                goalDescription: goal.goalDescription,
                status: goal.status,
                createdAt: Date()
            )
            modelContext.insert(localGoal)

            step = .motivation(goalId: goal.id)
        } catch BackendError.subscriptionRequired {
            // PaywallGateView routes the user to the paywall.
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    func saveMotivation(goalId: String) async {
        isSavingMotivation = true
        defer { isSavingMotivation = false }

        let trimmed = motivationQuote.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            advanceToIntake(goalId: goalId)
            return
        }

        do {
            try await goals.updateGoal(goalId: goalId, motivationQuote: trimmed)
            advanceToIntake(goalId: goalId)
        } catch BackendError.subscriptionRequired {
            // PaywallGateView routes the user to the paywall.
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    func advanceToIntake(goalId: String) {
        step = .intake(goalId: goalId)
    }

    func markGoalCompleted(goalId: String, in modelContext: ModelContext) {
        let descriptor = FetchDescriptor<Goal>(predicate: #Predicate { goal in
            goal.id == goalId
        })
        if let goal = try? modelContext.fetch(descriptor).first {
            goal.status = ProfileStatus.intakeCompleted.rawValue
        }
    }
}
