import Foundation

enum GoalIntakeStep: Equatable {
    case goalSetup
    case motivation(goalId: String)
    case intake(goalId: String)

    var identifier: String {
        switch self {
        case .goalSetup: return "goalSetup"
        case let .motivation(goalId): return "motivation_\(goalId)"
        case let .intake(goalId): return "intake_\(goalId)"
        }
    }
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
            let goal = try await env.intake.createGoal(
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

        do {
            try await env.intake.saveMotivation(goalId: goalId, quote: trimmed)
            step = .intake(goalId: goalId)
        } catch ApiError.subscriptionRequired {
        } catch {
            errorMessage = error.localizedDescription
            showError = true
        }
    }

    var canRestart: Bool {
        currentGoalId != nil
    }

    func restart() async -> Bool {
        if let goalId = currentGoalId {
            do {
                try await env.goals.deleteGoal(goalId: goalId)
            } catch {
                errorMessage = error.localizedDescription
                showError = true
                return false
            }
        }
        goalDescription = ""
        motivationQuote = ""
        step = .goalSetup
        return true
    }

    private var currentGoalId: String? {
        switch step {
        case .goalSetup:
            return nil
        case let .motivation(goalId), let .intake(goalId):
            return goalId
        }
    }
}
