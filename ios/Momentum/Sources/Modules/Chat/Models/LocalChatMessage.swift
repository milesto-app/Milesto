import Foundation
import SwiftData

@Model
final class LocalChatMessage {
    @Attribute(.unique) var id: String
    var conversationId: String
    var role: String
    var content: String
    var createdAt: Date
    var conversation: LocalConversation?

    init(id: String, conversationId: String, role: String, content: String, createdAt: Date) {
        self.id = id
        self.conversationId = conversationId
        self.role = role
        self.content = content
        self.createdAt = createdAt
    }
}
