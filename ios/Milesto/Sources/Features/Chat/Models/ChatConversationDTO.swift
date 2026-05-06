import Foundation

struct ChatConversationDTO: Decodable {
    let id: String
    let goalId: String
    let updatedAt: String
    let createdAt: String
    let preview: String?

    private enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case updatedAt = "updated_at"
        case createdAt = "created_at"
        case preview
    }
}
