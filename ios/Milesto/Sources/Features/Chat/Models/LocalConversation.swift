import Foundation
import SwiftData

@Model
final class LocalConversation {
    @Attribute(.unique) var id: String
    var goalId: String
    var preview: String?
    var updatedAt: Date
    var createdAt: Date
    @Relationship(deleteRule: .cascade) var messages: [ChatMessage]

    init(id: String, goalId: String, preview: String? = nil, updatedAt: Date, createdAt: Date, messages: [ChatMessage] = []) {
        self.id = id
        self.goalId = goalId
        self.preview = preview
        self.updatedAt = updatedAt
        self.createdAt = createdAt
        self.messages = messages
    }
}
