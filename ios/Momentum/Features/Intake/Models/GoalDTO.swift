import Foundation

struct GoalDTO: Codable {
    let id: String
    let userId: String
    let title: String
    let description: String
    let status: String
    let profileGenerationAttempts: Int
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case description
        case status
        case profileGenerationAttempts = "profile_generation_attempts"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
