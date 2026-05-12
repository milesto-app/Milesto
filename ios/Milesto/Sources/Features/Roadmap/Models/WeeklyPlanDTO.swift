import Foundation

enum WeeklyPlanStatus: String, Codable {
    case active
    case completed
}

enum WeekState: String, Codable {
    case noPlan = "no_plan"
    case active
    case readyToDebrief = "ready_to_debrief"
    case inAdvance = "in_advance"
    case late
}

struct WeeklyPlanResponseDTO: Codable {
    let plan: WeeklyPlanDTO?
    let weekState: WeekState
    let nextWeekStartsAt: String?
    let allTasksCompleted: Bool
    let hasDebrief: Bool

    enum CodingKeys: String, CodingKey {
        case plan
        case weekState = "week_state"
        case nextWeekStartsAt = "next_week_starts_at"
        case allTasksCompleted = "all_tasks_completed"
        case hasDebrief = "has_debrief"
    }
}

struct WeeklyPlanDTO: Codable {
    let id: String
    let milestoneId: String
    let goalId: String
    let userId: String
    let weekNumber: Int
    let weekStartDate: String
    let objectives: [String]
    let summary: WeeklySummaryDTO?
    let status: WeeklyPlanStatus
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, objectives, summary, status
        case milestoneId = "milestone_id"
        case goalId = "goal_id"
        case userId = "user_id"
        case weekNumber = "week_number"
        case weekStartDate = "week_start_date"
        case createdAt = "created_at"
    }
}

struct WeeklySummaryDTO: Codable {
    let completionRate: Double
    let tasksCompleted: Int
    let tasksTotal: Int
    let debriefCount: Int?
    let narrative: String?

    enum CodingKeys: String, CodingKey {
        case narrative
        case completionRate = "completion_rate"
        case tasksCompleted = "tasks_completed"
        case tasksTotal = "tasks_total"
        case debriefCount = "debrief_count"
    }
}
