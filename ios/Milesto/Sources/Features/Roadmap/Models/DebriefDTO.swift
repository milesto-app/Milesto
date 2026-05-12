import Foundation

struct DebriefDTO: Codable, Identifiable {
    let id: String
    let goalId: String
    let userId: String
    let milestoneId: String?
    let date: String
    let note: String
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, date, note
        case goalId = "goal_id"
        case userId = "user_id"
        case milestoneId = "milestone_id"
        case createdAt = "created_at"
    }
}
