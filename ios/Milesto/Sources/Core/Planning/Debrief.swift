import Foundation

struct TaskRating: Codable {
    let taskId: String
    let rating: DifficultyRating

    enum CodingKeys: String, CodingKey {
        case rating
        case taskId = "task_id"
    }
}

struct Debrief: Codable, Identifiable {
    let id: String
    let goalId: String
    let userId: String
    let weeklyPlanId: String?
    let date: String
    let note: String
    let taskRatings: [TaskRating]
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, date, note
        case goalId = "goal_id"
        case userId = "user_id"
        case weeklyPlanId = "weekly_plan_id"
        case taskRatings = "task_ratings"
        case createdAt = "created_at"
    }
}
