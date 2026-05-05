import Foundation

struct ChatMessageDTO: Decodable {
    let id: String
    let role: String
    let content: String?
    let createdAt: String

    private enum CodingKeys: String, CodingKey {
        case id
        case role
        case content
        case createdAt = "created_at"
    }
}
