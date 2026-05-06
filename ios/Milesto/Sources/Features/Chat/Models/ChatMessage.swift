import Foundation

struct ChatMessage: Identifiable, Hashable {
    let id: String
    let role: Role
    var content: String

    enum Role: String, Codable {
        case user
        case assistant
    }
}
