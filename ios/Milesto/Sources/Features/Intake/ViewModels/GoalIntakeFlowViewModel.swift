import Foundation

enum GoalIntakeStep {
    case goalSetup
    case motivation(goalId: String)
    case intake(goalId: String)
}

@MainActor
@Observable
final class GoalIntakeFlowViewModel {
    @ObservationIgnored private let env: AppEnv

    private(set) var step: GoalIntakeStep = .goalSetup
    var goalDescription = ""
    var motivationQuote = ""
    private(set) var isCreatingGoal = false
    private(set) var isSavingMotivation = false
    var showError = false
    private(set) var errorMessage = ""

    init(env: AppEnv) {
        self.env = env
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
            let goal = try await env.intakeFlow.createGoal(
                description: goalDescription.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            step = .motivation(goalId: goal.id)
        } catch ApiError.subscriptionRequired {
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
            try await env.intakeFlow.saveMotivation(goalId: goalId, quote: trimmed)
            advanceToIntake(goalId: goalId)
        } catch ApiError.subscriptionRequired {
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    func advanceToIntake(goalId: String) {
        step = .intake(goalId: goalId)
    }
}
