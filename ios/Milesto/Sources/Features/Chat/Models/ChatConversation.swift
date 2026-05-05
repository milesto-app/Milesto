import Foundation
import SwiftData

@Model
final class ChatConversation {
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

    var relativeDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: updatedAt, relativeTo: Date())
    }
}
