import Foundation

struct TaskRatingDTO: Codable {
    let objectiveId: String
    let rating: DifficultyRating

    enum CodingKeys: String, CodingKey {
        case rating
        case objectiveId = "objective_id"
    }
}

struct DebriefDTO: Codable, Identifiable {
    let id: String
    let goalId: String
    let userId: String
    let date: String
    let note: String
    let taskRatings: [TaskRatingDTO]
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, date, note
        case goalId = "goal_id"
        case userId = "user_id"
        case taskRatings = "task_ratings"
        case createdAt = "created_at"
    }
}

struct SubmitDebriefRequest: Encodable {
    let note: String
    let taskRatings: [TaskRatingDTO]?

    enum CodingKeys: String, CodingKey {
        case note
        case taskRatings = "task_ratings"
    }
}
