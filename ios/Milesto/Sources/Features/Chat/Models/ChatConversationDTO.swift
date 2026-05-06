import Foundation

struct ChatConversationDTO: Decodable, Identifiable, Hashable {
    let id: String
    let preview: String?
    let updatedAt: Date

    private enum CodingKeys: String, CodingKey {
        case id, preview
        case updatedAt = "updated_at"
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        preview = try container.decodeIfPresent(String.self, forKey: .preview)
        let updatedAtString = try container.decode(String.self, forKey: .updatedAt)
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        updatedAt = formatter.date(from: updatedAtString) ?? Date()
    }
}
