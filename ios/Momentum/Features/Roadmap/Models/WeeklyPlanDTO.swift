import Foundation

enum WeeklyPlanStatus: String, Codable {
    case active
    case completed
}

struct WeeklyPlanDTO: Codable {
    let id: String
    let roadmapId: String
    let milestoneId: String
    let goalId: String
    let userId: String
    let weekNumber: Int
    let weekStartDate: String
    let focus: String
    let objectives: [String]
    let summary: WeeklySummaryDTO?
    let status: WeeklyPlanStatus
    let isFallback: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, focus, objectives, summary, status
        case roadmapId = "roadmap_id"
        case milestoneId = "milestone_id"
        case goalId = "goal_id"
        case userId = "user_id"
        case weekNumber = "week_number"
        case weekStartDate = "week_start_date"
        case isFallback = "is_fallback"
        case createdAt = "created_at"
    }
}

struct WeeklySummaryDTO: Codable {
    let completionRate: Double
    let objectivesCompleted: Int
    let objectivesTotal: Int
    let debriefCount: Int?
    let energyDistribution: [String: Int]?
    let narrative: String?

    enum CodingKeys: String, CodingKey {
        case narrative
        case completionRate = "completion_rate"
        case objectivesCompleted = "objectives_completed"
        case objectivesTotal = "objectives_total"
        case debriefCount = "debrief_count"
        case energyDistribution = "energy_distribution"
    }
}
