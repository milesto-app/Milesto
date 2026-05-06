import Foundation

struct ChatConversation: Identifiable, Hashable {
    let id: String
    let preview: String?
    let updatedAt: Date
}
