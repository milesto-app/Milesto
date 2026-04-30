import Foundation

enum DifficultyRating: String, Codable {
    case easy
    case moderate
    case hard

    var priority: Int {
        switch self {
        case .hard: return 0
        case .moderate: return 1
        case .easy: return 2
        }
    }
}

extension Optional where Wrapped == DifficultyRating {
    var priority: Int {
        self?.priority ?? 3
    }
}

struct WeeklyTask: Codable, Identifiable {
    let id: String
    let weeklyPlanId: String
    let goalId: String
    let userId: String
    let title: String
    let description: String
    let difficultyRating: DifficultyRating?
    let orderIndex: Int
    let isCompleted: Bool
    let isFallback: Bool
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, title, description
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

struct UpdateTaskRequest: Encodable {
    let isCompleted: Bool

    enum CodingKeys: String, CodingKey {
        case isCompleted = "is_completed"
    }
}
