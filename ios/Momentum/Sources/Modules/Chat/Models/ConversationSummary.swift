import Foundation

struct ConversationSummary: Identifiable, Decodable {
    let id: String
    let goalId: String
    let preview: String?
    let updatedAt: String
    let createdAt: String

    private enum CodingKeys: String, CodingKey {
        case id
        case goalId = "goal_id"
        case preview
        case updatedAt = "updated_at"
        case createdAt = "created_at"
    }

    var date: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: updatedAt) ?? Date()
    }

    var relativeDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}
