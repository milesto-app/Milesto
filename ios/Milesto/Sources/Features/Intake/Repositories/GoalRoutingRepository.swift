import Foundation

struct ActiveGoalDescriptor {
    enum Phase {
        case active
        case intakeCompleted
        case intakeInProgress
        case profileGenerating
        case generationFailed
        case other
    }

    let goalId: String
    let phase: Phase
}

@MainActor
protocol GoalRoutingRepository: AnyObject {
    func localGoals(userId: String) -> [Goal]
    func syncFromRemote(userId: String) async throws
    func resolveActiveGoal(userId: String) -> ActiveGoalDescriptor?
    func markActive(goalId: String) throws
}
