import Foundation
import SwiftData

@Model
final class ChatMessage {
    @Attribute(.unique) var id: String
    var role: Role
    var content: String
    var createdAt: Date
    var conversationId: String
    var conversation: ChatConversation?

    init(id: String, role: Role, content: String, createdAt: Date, conversationId: String = "") {
        self.id = id
        self.role = role
        self.content = content
        self.createdAt = createdAt
        self.conversationId = conversationId
    }

    enum Role: String, Codable {
        case user
        case assistant
    }
}
