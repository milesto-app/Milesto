import Foundation

struct ChatMessageDTO: Decodable {
    let id: String
    let role: String
    let content: String?
    let createdAt: String
}
