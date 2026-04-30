import Foundation

enum WeeklyPlanStatus: String, Codable {
    case active
    case completed
}

struct WeeklyPlan: Codable {
    let id: String
    let milestoneId: String
    let goalId: String
    let userId: String
    let weekNumber: Int
    let weekStartDate: String
    let objectives: [String]
    let summary: WeeklySummary?
    let status: WeeklyPlanStatus
    let isFallback: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, objectives, summary, status
        case milestoneId = "milestone_id"
        case goalId = "goal_id"
        case userId = "user_id"
        case weekNumber = "week_number"
        case weekStartDate = "week_start_date"
        case isFallback = "is_fallback"
        case createdAt = "created_at"
    }
}

struct WeeklySummary: Codable {
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
