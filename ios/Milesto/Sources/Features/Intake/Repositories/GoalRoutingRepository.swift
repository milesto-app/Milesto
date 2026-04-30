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
    func syncFromRemote(userId: String) async throws
    func resolveActiveGoal(userId: String) -> ActiveGoalDescriptor?
    func resolveGoal(userId: String, goalId: String) -> ActiveGoalDescriptor?
    func activateGeneratedRoadmap(goalId: String) throws
}
