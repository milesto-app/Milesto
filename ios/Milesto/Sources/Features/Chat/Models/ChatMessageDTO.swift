import Foundation

struct ChatMessageDTO: Decodable, Identifiable, Hashable {
    let id: String
    let role: String
    var content: String?

    private enum CodingKeys: String, CodingKey {
        case id, role, content
    }

    init(id: String, role: String, content: String?) {
        self.id = id
        self.role = role
        self.content = content
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        role = try container.decode(String.self, forKey: .role)
        content = try container.decodeIfPresent(String.self, forKey: .content)
    }
}

extension ChatMessageDTO {
    var isUser: Bool {
        role == "user"
    }

    var isAssistant: Bool {
        role == "assistant"
    }
}
