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
