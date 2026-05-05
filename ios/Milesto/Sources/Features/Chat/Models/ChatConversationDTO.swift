import Foundation

struct ChatConversationDTO: Decodable {
    let id: String
    let goalId: String
    let updatedAt: String
    let createdAt: String
    let messages: [ChatMessageDTO]

    private enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case updatedAt = "updated_at"
        case createdAt = "created_at"
        case messages
    }

    var preview: String? {
        let firstUserMessage = messages.first { $0.role == "user" && $0.content != nil }
        return firstUserMessage.flatMap { msg -> String? in
            guard let content = msg.content else { return nil }
            return content.count > 100 ? String(content.prefix(100)) : content
        }
    }
}
