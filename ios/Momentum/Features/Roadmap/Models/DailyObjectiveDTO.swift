import Foundation

enum DifficultyRating: String, Codable {
    case easy
    case moderate
    case hard
}

struct DailyObjectiveDTO: Codable, Identifiable {
    let id: String
    let weeklyPlanId: String
    let goalId: String
    let userId: String
    let date: String
    let title: String
    let description: String
    let difficultyRating: DifficultyRating?
    let orderIndex: Int
    let isCompleted: Bool
    let isFallback: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, date, title, description
        case weeklyPlanId = "weekly_plan_id"
        case goalId = "goal_id"
        case userId = "user_id"
        case difficultyRating = "difficulty_rating"
        case orderIndex = "order_index"
        case isCompleted = "is_completed"
        case isFallback = "is_fallback"
        case createdAt = "created_at"
    }
}

struct UpdateObjectiveRequest: Encodable {
    let isCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case isCompleted = "is_completed"
    }
}
