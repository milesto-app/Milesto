import Foundation

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
