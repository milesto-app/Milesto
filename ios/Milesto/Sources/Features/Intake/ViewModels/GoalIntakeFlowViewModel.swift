import Foundation

enum GoalIntakeStep {
    case goalSetup
    case motivation(goalId: String)
    case intake(goalId: String)
}

@MainActor
@Observable
final class GoalIntakeFlowViewModel {
    @ObservationIgnored private let repository: any IntakeFlowRepository

    private(set) var step: GoalIntakeStep = .goalSetup
    var goalDescription = ""
    var motivationQuote = ""
    private(set) var isCreatingGoal = false
    private(set) var isSavingMotivation = false
    var showError = false
    private(set) var errorMessage = ""

    init(repository: any IntakeFlowRepository) {
        self.repository = repository
    }

    func startWithExistingGoalId(_ goalId: String?) {
        if let goalId {
            step = .intake(goalId: goalId)
        }
    }

    func createGoal() async {
        isCreatingGoal = true
        defer { isCreatingGoal = false }

        do {
            let goal = try await repository.createGoal(
                description: goalDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            step = .motivation(goalId: goal.id)
        } catch BackendError.subscriptionRequired {
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
            try await repository.saveMotivation(goalId: goalId, quote: trimmed)
            advanceToIntake(goalId: goalId)
        } catch BackendError.subscriptionRequired {
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    func advanceToIntake(goalId: String) {
        step = .intake(goalId: goalId)
    }

    func markGoalCompleted(goalId: String) {
        repository.markIntakeCompleted(goalId: goalId)
    }
}
