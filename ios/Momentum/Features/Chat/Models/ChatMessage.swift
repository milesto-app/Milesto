import Foundation

struct ChatMessage: Identifiable {
    let id: String
    let role: Role
    var content: String
    let createdAt: Date

    enum Role {
        case user
        case assistant
    }
}
