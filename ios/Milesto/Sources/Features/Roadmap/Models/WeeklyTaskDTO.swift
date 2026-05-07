import Foundation

struct WeeklyTaskDTO: Codable, Identifiable {
    let id: String
    let weeklyPlanId: String
    let goalId: String
    let userId: String
    let title: String
    let description: String
    let estimatedMinutes: Int?
    let orderIndex: Int
    let isCompleted: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case weeklyPlanId = "weekly_plan_id"
        case goalId = "goal_id"
        case userId = "user_id"
        case estimatedMinutes = "estimated_minutes"
        case orderIndex = "order_index"
        case isCompleted = "is_completed"
        case createdAt = "created_at"
    }
}

func formatDuration(_ minutes: Int?) -> String? {
    guard let minutes, minutes > 0 else { return nil }
    if minutes < 60 {
        return String(format: String(localized: "home.tasks.duration.minutes", table: "Home"), minutes)
    }
    let hours = minutes / 60
    let remainder = minutes % 60
    if remainder == 0 {
        return String(format: String(localized: "home.tasks.duration.hours", table: "Home"), hours)
    }
    return String(format: String(localized: "home.tasks.duration.hoursMinutes", table: "Home"), hours, remainder)
}
