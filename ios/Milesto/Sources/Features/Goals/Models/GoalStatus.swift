import Foundation

nonisolated enum GoalStatus: String, Codable {
    case active
    case intakeCompleted = "intake_completed"
    case intakeInProgress = "intake_in_progress"
    case profileGenerating = "profile_generating"
    case generationFailed = "profile_generation_failed"

    nonisolated static func from(_ rawValue: String) -> GoalStatus {
        switch rawValue {
        case active.rawValue:
            return .active
        case intakeCompleted.rawValue:
            return .intakeCompleted
        case intakeInProgress.rawValue:
            return .intakeInProgress
        case profileGenerating.rawValue:
            return .profileGenerating
        case generationFailed.rawValue:
            return .generationFailed
        default:
            return .intakeInProgress
        }
    }
}
