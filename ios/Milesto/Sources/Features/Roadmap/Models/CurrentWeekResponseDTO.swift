import Foundation

enum WeekState: String, Codable {
    case noMilestone = "no_milestone"
    case active
    case readyToDebrief = "ready_to_debrief"
    case inAdvance = "in_advance"
    case late
}

struct CurrentWeekResponseDTO: Codable {
    let milestone: MilestoneDTO?
    let weekState: WeekState
    let nextWeekStartsAt: String?
    let allTasksCompleted: Bool
    let hasDebrief: Bool

    enum CodingKeys: String, CodingKey {
        case milestone
        case weekState = "week_state"
        case nextWeekStartsAt = "next_week_starts_at"
        case allTasksCompleted = "all_tasks_completed"
        case hasDebrief = "has_debrief"
    }
}
